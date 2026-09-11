const db = require('../farenetBackend/config/database');

async function run() {
  try {
    console.log('Agregando motor a fg_certificado_formato_version...');
    await db.query(`ALTER TABLE fg_certificado_formato_version ADD COLUMN IF NOT EXISTS motor VARCHAR(50)`);

    console.log('Clasificando versiones existentes...');
    // We assume DOCX_DINAMICO if it has no HTML, HTML_DINAMICO if it does.
    const res = await db.query(`SELECT id, formato_id, archivo_ruta, configuracion::text as config_text FROM fg_certificado_formato_version`);
    
    for (const v of res.rows) {
        let motor = 'DOCX_DINAMICO'; // Default
        
        // If config has html or css, it's HTML_DINAMICO
        if (v.config_text && (v.config_text.includes('"html":') || v.config_text.includes('"css":'))) {
            motor = 'HTML_DINAMICO';
        }
        
        // Explicit overrides based on path
        if (v.archivo_ruta === 'HTML') motor = 'HTML_DINAMICO';
        
        await db.query(`UPDATE fg_certificado_formato_version SET motor = $1 WHERE id = $2`, [motor, v.id]);
    }

    console.log('Auditoria TALLER_INSPECCION:');
    const tRes = await db.query(`
        SELECT fv.version, fv.motor 
        FROM fg_certificado_formato_version fv
        JOIN fg_certificado_formato f ON f.id = fv.formato_id
        WHERE f.codigo = 'TALLER_INSPECCION'
        ORDER BY fv.version ASC
    `);
    console.log(tRes.rows);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
