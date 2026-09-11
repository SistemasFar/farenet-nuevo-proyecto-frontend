const db = require('../farenetBackend/config/database');

async function fix() {
  try {
    await db.query(`ALTER TABLE fg_certificado_formato DROP CONSTRAINT IF EXISTS fg_certificado_formato_motor_check`);
    await db.query(`ALTER TABLE fg_certificado_formato ADD CONSTRAINT fg_certificado_formato_motor_check CHECK (motor IN ('SISTEMA', 'DOCX_DINAMICO', 'HTML_DINAMICO'))`);
    console.log('Constraint updated');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
fix();
