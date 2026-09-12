const fs = require('fs');

const routeFile = '../farenetBackend/modules/faregas/routes/faregas-formatos.routes.js';
let routeContent = fs.readFileSync(routeFile, 'utf8');
if (!routeContent.includes('router.delete')) {
    routeContent += `\n// Eliminar version\nrouter.delete('/:id/versiones/:versionId', verificarToken, async (req, res) => {\n  try {\n    await faregasFormatosService.eliminarVersion(req.params.id, req.params.versionId);\n    res.json({ mensaje: 'Version eliminada' });\n  } catch (error) {\n    res.status(400).json({ mensaje: error.message });\n  }\n});\n`;
    fs.writeFileSync(routeFile, routeContent);
}

const serviceFile = '../farenetBackend/modules/faregas/services/faregas-formatos.service.js';
let serviceContent = fs.readFileSync(serviceFile, 'utf8');
if (!serviceContent.includes('eliminarVersion: async')) {
    serviceContent = serviceContent.replace(/guardarConfiguracion:\s*async\s*\(formatoId,\s*versionId,\s*configuracion\)\s*=>\s*{/, 
`eliminarVersion: async (formatoId, versionId) => {
    const verRes = await db.query('SELECT estado FROM fg_certificado_formato_version WHERE id = $1 AND formato_id = $2', [versionId, formatoId]);
    if (verRes.rowCount === 0) throw new Error('Versión no encontrada');
    if (verRes.rows[0].estado === 'VIGENTE') throw new Error('No se puede eliminar una versión VIGENTE. Desactiva o activa otra versión primero.');
    await db.query('DELETE FROM fg_certificado_formato_version WHERE id = $1', [versionId]);
    return { success: true };
},
guardarConfiguracion: async (formatoId, versionId, configuracion) => {`);
    fs.writeFileSync(serviceFile, serviceContent);
}

console.log('Update backend delete success');
