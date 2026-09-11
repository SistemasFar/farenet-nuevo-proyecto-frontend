const fs = require('fs');

// 1. Update Routes
const routeFile = '../farenetBackend/modules/faregas/routes/faregas-formatos.routes.js';
let routeContent = fs.readFileSync(routeFile, 'utf8');

if (!routeContent.includes('router.put')) {
    routeContent = routeContent.replace(/}\s*catch\s*\(error\)\s*{\s*res\.status\(400\)\.json\({ mensaje: error\.message }\);\s*}\s*}\);\s*\/\/\s*Descargar preview/g, 
`} catch (error) { res.status(400).json({ mensaje: error.message }); } });

// Guardar configuracion generica (usado por HTML_DINAMICO)
router.put('/:id/versiones/:versionId', verificarToken, async (req, res) => {
  try {
    const { configuracion } = req.body;
    await faregasFormatosService.guardarConfiguracion(req.params.id, req.params.versionId, configuracion);
    res.json({ mensaje: 'Configuracion guardada' });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
});

// Descargar preview`);
    fs.writeFileSync(routeFile, routeContent);
}

// 2. Update Service
const serviceFile = '../farenetBackend/modules/faregas/services/faregas-formatos.service.js';
let serviceContent = fs.readFileSync(serviceFile, 'utf8');

if (!serviceContent.includes('guardarConfiguracion:')) {
    serviceContent = serviceContent.replace(/guardarMappings:\s*async\s*\(formatoId,\s*versionId,\s*mappings\)\s*=>\s*{/g, 
`guardarConfiguracion: async (formatoId, versionId, configuracion) => {
    const verRes = await db.query('SELECT archivo_ruta, estado FROM fg_certificado_formato_version WHERE id = $1 AND formato_id = $2', [versionId, formatoId]);
    if (verRes.rowCount === 0) throw new Error('Versión no encontrada');
    if (verRes.rows[0].estado !== 'BORRADOR') throw new Error('Solo se pueden editar una versión en BORRADOR');
    
    // Security sanitization (extra layer)
    if (configuracion.html) {
        configuracion.html = configuracion.html.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, "");
    }
    
    await db.query('UPDATE fg_certificado_formato_version SET configuracion = $1 WHERE id = $2', [JSON.stringify(configuracion), versionId]);
    return { success: true };
},

guardarMappings: async (formatoId, versionId, mappings) => {`);
    fs.writeFileSync(serviceFile, serviceContent);
}

console.log('Update backend routes and service success');
