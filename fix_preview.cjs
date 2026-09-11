const fs = require('fs');
const path = require('path');

const base = 'c:\\Users\\Sistemas2\\Desktop\\farenet nuevo proyecto\\farenetBackend';

try {
  // 1. Modificar faregas-formatos.service.js
  const pService = path.join(base, 'modules', 'faregas', 'services', 'faregas-formatos.service.js');
  let cService = fs.readFileSync(pService, 'utf8');

  // Reemplazar generarPreview
  const originalPreview = `  generarPreview: async (formatoId, versionId) => {
    const verRes = await db.query('SELECT archivo_ruta FROM fg_certificado_formato_version WHERE id = $1 AND formato_id = $2', [versionId, formatoId]);
    if (verRes.rowCount === 0) throw new Error('Versión no encontrada');
    
    const storageKey = verRes.rows[0].archivo_ruta;
    const templatePath = path.join(STORAGE_PATH, storageKey, 'template.docx');
    
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    
    // Build dummy data
    const dummyData = {};
    for (const v of VARIABLES_CATALOG) {
        const parts = v.key.split('.');
        if (parts.length === 2) {
            if (!dummyData[parts[0]]) dummyData[parts[0]] = {};
            dummyData[parts[0]][parts[1]] = v.demo;
        } else {
            dummyData[v.key] = v.demo;
        }
    }
    
    doc.render(dummyData);
    
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  },`;
  const newPreview = `  generarPreview: async (formatoId, versionId) => {
    const fRes = await db.query('SELECT motor FROM fg_certificado_formato WHERE id = $1', [formatoId]);
    if (fRes.rowCount === 0) throw new Error('Formato no encontrado');
    const motor = fRes.rows[0].motor;

    const verRes = await db.query('SELECT archivo_ruta, configuracion FROM fg_certificado_formato_version WHERE id = $1 AND formato_id = $2', [versionId, formatoId]);
    if (verRes.rowCount === 0) throw new Error('Versión no encontrada');
    
    // Build dummy data
    const dummyData = {};
    for (const v of VARIABLES_CATALOG) {
        const parts = v.key.split('.');
        if (parts.length === 2) {
            if (!dummyData[parts[0]]) dummyData[parts[0]] = {};
            dummyData[parts[0]][parts[1]] = v.demo;
        } else {
            dummyData[v.key] = v.demo;
        }
    }

    if (motor === 'HTML_DINAMICO') {
        let config = verRes.rows[0].configuracion;
        if (typeof config === 'string') config = JSON.parse(config);
        
        let html = config?.html || '';
        
        // Simple replacer for {{var.name}}
        html = html.replace(/\\{\\{([^{}]+)\\}\\}/g, (match, key) => {
            const parts = key.trim().split('.');
            if (parts.length === 2) {
                return dummyData[parts[0]]?.[parts[1]] || match;
            }
            return dummyData[key.trim()] || match;
        });
        
        return { tipo: 'HTML_DINAMICO', data: html };
    }

    // Default to DOCX_DINAMICO
    const storageKey = verRes.rows[0].archivo_ruta;
    const templatePath = path.join(STORAGE_PATH, storageKey, 'template.docx');
    
    if (!fs.existsSync(templatePath)) throw new Error('No se encontró archivo docx de la versión');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    
    doc.render(dummyData);
    return { tipo: 'DOCX_DINAMICO', data: doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) };
  },`;
  cService = cService.replace(originalPreview, newPreview);
  fs.writeFileSync(pService, cService, 'utf8');

  // 2. Modificar faregas-formatos.routes.js
  const pRoutes = path.join(base, 'modules', 'faregas', 'routes', 'faregas-formatos.routes.js');
  let cRoutes = fs.readFileSync(pRoutes, 'utf8');

  const originalRoute = `// Descargar preview
router.get('/:id/versiones/:versionId/preview', verificarToken, async (req, res) => {
  try {
    const buffer = await faregasFormatosService.generarPreview(req.params.id, req.params.versionId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=preview_' + req.params.versionId + '.docx');
    res.send(buffer);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
});`;
  const newRoute = `// Descargar preview
router.get('/:id/versiones/:versionId/preview', verificarToken, async (req, res) => {
  try {
    const result = await faregasFormatosService.generarPreview(req.params.id, req.params.versionId);
    if (result.tipo === 'HTML_DINAMICO') {
        res.json({ html: result.data, tipo: 'HTML_DINAMICO' });
    } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=preview_' + req.params.versionId + '.docx');
        res.send(result.data);
    }
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
});`;
  cRoutes = cRoutes.replace(originalRoute, newRoute);
  fs.writeFileSync(pRoutes, cRoutes, 'utf8');

  console.log('Backend changes applied');
} catch (e) {
  console.error(e);
}
