const db = require('../farenetBackend/config/database');
async function check() {
  try {
    const c1 = await db.query("SELECT COUNT(*) FROM fg_certificado_formato WHERE codigo LIKE 'TEST_%'");
    const c2 = await db.query("SELECT COUNT(*) FROM fg_servicio WHERE codigo LIKE 'TEST_SERV_%'");
    console.log('Formatos TEST residuales: ' + c1.rows[0].count);
    console.log('Servicios TEST residuales: ' + c2.rows[0].count);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
