const db = require('../farenetBackend/config/database');

async function check() {
    try {
        const query = `
            SELECT s.codigo, s.nombre, s.id, s.activo, f.codigo as formato_codigo 
            FROM fg_servicio s 
            JOIN fg_certificado_formato f ON s.formato_id = f.id 
            WHERE f.codigo = 'TALLER_INSPECCION'
        `;
        const res = await db.query(query);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
