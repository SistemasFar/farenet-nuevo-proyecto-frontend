const path = require('path');
const db = require(path.join('c:\\Users\\Sistemas2\\Desktop\\farenet nuevo proyecto\\farenetBackend', 'config', 'database'));
async function run() {
  try {
    // Create tarifa for TALLER_GLP_ANUAL (servicio id=60) in MOLINA (key=170)
    const existing = await db.query(`SELECT id FROM fg_tarifa WHERE servicio_id = 60 AND planta_key = '170'`);
    if (existing.rows.length > 0) {
      console.log("Tarifa already exists:", existing.rows[0]);
      // Make sure it's active
      await db.query(`UPDATE fg_tarifa SET activo = true WHERE servicio_id = 60 AND planta_key = '170'`);
      console.log("Ensured active");
    } else {
      const ins = await db.query(
        `INSERT INTO fg_tarifa (planta_key, servicio_id, codigo, familia, nombre, tipo_certificado_clave, modalidad, precio, activo, orden, producto_facturacion_id)
         VALUES ('170', 60, 'TALLER_INSPECCION', 'TALLER', 'Inspección Taller GLP Anual', 'TALLER_GLP', null, 80.00, true, 10, null)
         RETURNING id`,
      );
      console.log("Created tarifa:", ins.rows[0]);
    }
    console.log("Done. TALLER_GLP_ANUAL is now active on MOLINA (key=170)");
  } catch(e) { console.error(e.message); } finally { process.exit(0); }
}
run();
