const db = require('../farenetBackend/config/database');
const { faregasFormatosService } = require('../farenetBackend/modules/faregas/services/faregas-formatos.service');
const assert = require('assert');

async function runTests() {
  if (process.env.NODE_ENV === 'production') {
      console.error('❌ PELIGRO: No se pueden ejecutar tests destructivos en entorno de producción.');
      process.exit(1);
  }

  let passed = 0;
  let total = 6;
  console.log('--- INICIANDO TESTS DE FORMATOS ESTADO ---');

  const client = await db.connect();
  let testFormatoId = null;
  let testFormatoUsadoId = null;

  try {
    // PREPARACIÓN DE DATOS MOCK
    // No usar BEGIN para que db.query() dentro de los services vea los datos
    
    // 1. Crear formato libre
    const fLibre = await faregasFormatosService.crearFormato('Test Libre', 'TEST_LIBRE_' + Date.now(), 'HTML_DINAMICO');
    testFormatoId = fLibre.id;
    // Agregar una versión para validar regla 6
    const fvRes = await client.query(`
        INSERT INTO fg_certificado_formato_version (formato_id, version, archivo_ruta, configuracion, estado)
        VALUES ($1, 1, 'mock', '{}', 'VIGENTE') RETURNING id`, [testFormatoId]);
    const versionId = fvRes.rows[0].id;

    // 2. Crear formato usado y servicio ficticio
    const fUsado = await faregasFormatosService.crearFormato('Test Usado', 'TEST_USADO_' + Date.now(), 'HTML_DINAMICO');
    testFormatoUsadoId = fUsado.id;
    const sRes = await client.query("SELECT familia, modalidad, tipo_certificado_clave, categoria_id, tipo_flujo FROM fg_servicio WHERE codigo = 'GNV_INICIAL' LIMIT 1");
    // Fallback in case GNV_INICIAL is missing in some test DB
    if (sRes.rowCount === 0) throw new Error("Servicio base GNV_INICIAL no encontrado para crear test");
    const sample = sRes.rows[0];
    await client.query(`
        INSERT INTO fg_servicio (codigo, nombre, activo, formato_id, familia, modalidad, tipo_certificado_clave, categoria_id, tipo_flujo)
        VALUES ($1, 'Test Servicio', true, $2, $3, $4, $5, $6, $7)`, 
        ['TEST_SERV_' + testFormatoUsadoId, testFormatoUsadoId, sample.familia, sample.modalidad, sample.tipo_certificado_clave, sample.categoria_id, sample.tipo_flujo]);

    // OBTENER ID PROTEGIDO EXISTENTE (EJ. GNV_ANUAL)
    const pRes = await client.query("SELECT id FROM fg_certificado_formato WHERE es_protegido = true LIMIT 1");
    const protegidoId = pRes.rows[0].id;


    // --- TEST 1: formato dinámico libre: ACTIVO → INACTIVO ---
    try {
        const res1 = await faregasFormatosService.cambiarEstado(testFormatoId);
        assert.strictEqual(res1.activo, false);
        console.log('✅ TEST 1: Formato dinámico libre (ACTIVO -> INACTIVO) OK');
        passed++;
    } catch (e) { console.error('❌ TEST 1 FAILED:', e.message); }

    // --- TEST 2: formato dinámico inactivo: INACTIVO → ACTIVO ---
    try {
        const res2 = await faregasFormatosService.cambiarEstado(testFormatoId);
        assert.strictEqual(res2.activo, true);
        console.log('✅ TEST 2: Formato dinámico libre (INACTIVO -> ACTIVO) OK');
        passed++;
    } catch (e) { console.error('❌ TEST 2 FAILED:', e.message); }

    // --- TEST 3: formato protegido: desactivar → bloqueado ---
    try {
        await faregasFormatosService.cambiarEstado(protegidoId);
        console.error('❌ TEST 3 FAILED: Debería haber fallado al desactivar protegido');
    } catch (e) {
        assert(e.message.includes('protegidos'));
        console.log('✅ TEST 3: Formato protegido bloqueado OK');
        passed++;
    }

    // --- TEST 4 & 5: formato usado bloqueado, mensaje incluye operación ---
    try {
        await faregasFormatosService.cambiarEstado(testFormatoUsadoId);
        console.error('❌ TEST 4/5 FAILED: Debería haber fallado al desactivar formato usado');
    } catch (e) {
        assert(e.message.includes('TEST_SERV'));
        assert(e.message.includes('Test Servicio'));
        console.log('✅ TEST 4: Formato en uso bloqueado OK');
        passed++;
        console.log('✅ TEST 5: Mensaje incluye operación conflictiva OK');
        passed++;
    }

    // --- TEST 6: desactivar no elimina ni retira versiones ---
    try {
        await faregasFormatosService.cambiarEstado(testFormatoId); // Inactivamos
        const checkV = await client.query('SELECT estado FROM fg_certificado_formato_version WHERE id = $1', [versionId]);
        assert.strictEqual(checkV.rows[0].estado, 'VIGENTE'); // La version sigue VIGENTE
        console.log('✅ TEST 6: Desactivar no elimina ni retira versiones OK');
        passed++;
    } catch (e) { console.error('❌ TEST 6 FAILED:', e.message); }

  } catch (err) {
      console.error("Test setup error", err);
  } finally {
      // Limpieza garantizada, sin importar en qué punto falló el test
      try {
          await client.query("DELETE FROM fg_servicio WHERE codigo LIKE 'TEST_SERV_%'");
          if (testFormatoId || testFormatoUsadoId) {
              await client.query('DELETE FROM fg_certificado_formato_version WHERE formato_id = $1 OR formato_id = $2', [testFormatoId, testFormatoUsadoId]);
              await client.query("DELETE FROM fg_certificado_formato WHERE codigo LIKE 'TEST_%'");
          }
      } catch (cleanErr) {
          console.error("Error durante limpieza:", cleanErr);
      }
      client.release();
      console.log(`--- TESTS FINALIZADOS: ${passed}/${total} PASARON ---`);
      process.exit(passed === total ? 0 : 1);
  }
}

runTests();
