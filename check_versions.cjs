const db = require('../farenetBackend/config/database');

async function check() {
  try {
    const res = await db.query(`
      SELECT fv.id, fv.version, fv.estado, fv.archivo_ruta, f.motor, 
             substring(fv.configuracion::text from 1 for 100) as config_preview 
      FROM fg_certificado_formato_version fv 
      JOIN fg_certificado_formato f ON f.id = fv.formato_id 
      WHERE f.codigo = 'TALLER_INSPECCION' 
      ORDER BY fv.version ASC
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
