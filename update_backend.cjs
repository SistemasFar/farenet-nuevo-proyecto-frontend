const fs = require('fs');
const file = '../farenetBackend/modules/faregas/services/faregas-formatos.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const fRes = await db\.query\('SELECT motor FROM fg_certificado_formato WHERE id = \$1', \[formatoId\]\);\s*if \(fRes\.rowCount === 0\) throw new Error\('Formato no encontrado'\);\s*const motor = fRes\.rows\[0\]\.motor;\s*const verRes = await db\.query\('SELECT archivo_ruta, configuracion FROM fg_certificado_formato_version WHERE id = \$1 AND formato_id = \$2', \[versionId, formatoId\]\);\s*if \(verRes\.rowCount === 0\) throw new Error\('Versión no encontrada'\);/,
  `const verRes = await db.query('SELECT archivo_ruta, configuracion, motor FROM fg_certificado_formato_version WHERE id = $1 AND formato_id = $2', [versionId, formatoId]);
    if (verRes.rowCount === 0) throw new Error('Versión no encontrada');
    const motorVersion = verRes.rows[0].motor || 'DOCX_DINAMICO';`
);

content = content.replace(/if \(motor === 'HTML_DINAMICO'\) \{/, "if (motorVersion === 'HTML_DINAMICO') {");

fs.writeFileSync(file, content);
console.log('Update backend service success');
