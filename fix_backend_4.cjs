const fs = require('fs');
const path = require('path');

const base = 'c:\\Users\\Sistemas2\\Desktop\\farenet nuevo proyecto\\farenetBackend';

try {
  // 1. Modificar faregas-formatos.service.js
  const pService = path.join(base, 'modules', 'faregas', 'services', 'faregas-formatos.service.js');
  let cService = fs.readFileSync(pService, 'utf8');

  // Reemplazar la logica de cambiarEstado
  const originalCambiarEstado = `cambiarEstado: async (id) => {
      const fRes = await db.query('SELECT es_protegido, activo FROM fg_certificado_formato WHERE id = $1', [id]);
      if (fRes.rowCount === 0) throw new Error('Formato no encontrado');
      const formato = fRes.rows[0];
      
      if (formato.es_protegido) throw new Error('No se pueden desactivar formatos protegidos por el sistema');
      
      if (formato.activo) {
          // Intentando desactivar, verificar si hay operaciones (servicios) activas que lo referencien
          const sRes = await db.query("SELECT codigo, nombre FROM fg_servicio WHERE formato_id = $1 AND activo = true", [id]);
          if (sRes.rowCount > 0) {
              const ops = sRes.rows.map(r => r.codigo).join(', ');
              throw new Error(\`No se puede desactivar porque est\u00E1 asociado a las siguientes operaciones activas: \${ops}\`);
          }
      }`;
      
  const newCambiarEstado = `cambiarEstado: async (id) => {
      const fRes = await db.query('SELECT es_protegido, activo FROM fg_certificado_formato WHERE id = $1', [id]);
      if (fRes.rowCount === 0) throw new Error('Formato no encontrado');
      const formato = fRes.rows[0];
      
      if (formato.es_protegido) throw new Error('No se pueden desactivar formatos protegidos por el sistema');
      
      if (formato.activo) {
          // Intentando desactivar, verificar si hay operaciones (servicios) activas que lo referencien
          const sRes = await db.query("SELECT codigo, nombre FROM fg_servicio WHERE formato_id = $1 AND activo = true", [id]);
          if (sRes.rowCount > 0) {
              const ops = sRes.rows.map(r => '- ' + r.codigo + ' — ' + r.nombre).join('\\n');
              throw new Error(\`No se puede desactivar el formato porque está siendo utilizado por las siguientes operaciones activas:\\n\\n\${ops}\\n\\nDesactiva o cambia primero esas operaciones.\`);
          }
      }`;
  
  cService = cService.replace(originalCambiarEstado, newCambiarEstado);
  fs.writeFileSync(pService, cService, 'utf8');

  // 2. Modificar faregas-formatos.routes.js
  const pRoutes = path.join(base, 'modules', 'faregas', 'routes', 'faregas-formatos.routes.js');
  let cRoutes = fs.readFileSync(pRoutes, 'utf8');

  const originalPutEstado = `// Cambiar estado del formato
router.put('/:id/estado', verificarToken, async (req, res) => {
  try {
    const formato = await faregasFormatosService.cambiarEstado(req.params.id);
    res.json(formato);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al cambiar estado', error: error.message });
  }
});`;

  const newPutEstado = `// Cambiar estado del formato
router.put('/:id/estado', verificarToken, async (req, res) => {
  try {
    const formato = await faregasFormatosService.cambiarEstado(req.params.id);
    res.json(formato);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});`;

  cRoutes = cRoutes.replace(originalPutEstado, newPutEstado);
  fs.writeFileSync(pRoutes, cRoutes, 'utf8');

  console.log('Backend changes applied successfully');
} catch (e) {
  console.error(e);
}
