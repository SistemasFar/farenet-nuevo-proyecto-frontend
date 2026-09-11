const fs = require('fs');
const path = require('path');

const base = 'c:\\Users\\Sistemas2\\Desktop\\farenet nuevo proyecto\\farenetBackend';

try {
  // 1. Modificar faregas-formatos.service.js
  const pService = path.join(base, 'modules', 'faregas', 'services', 'faregas-formatos.service.js');
  let cService = fs.readFileSync(pService, 'utf8');

  // Reemplazar listarFormatos
  const originalListar = `listarFormatos: async () => {
    const query = \`
      SELECT f.id, f.codigo, f.nombre, f.motor, f.es_protegido, f.activo,
             (SELECT COUNT(*) FROM fg_certificado_formato_version v WHERE v.formato_id = f.id AND v.estado = 'VIGENTE') > 0 as tiene_version_vigente
      FROM fg_certificado_formato f
      ORDER BY f.id ASC
    \`;
    const res = await db.query(query);
    return res.rows;
  },`;
  const newListar = `listarFormatos: async () => {
    const query = \`
      SELECT f.id, f.codigo, f.nombre, f.motor, f.es_protegido, f.activo, f.formato_padre_id,
             p.nombre as formato_padre_nombre, p.codigo as formato_padre_codigo,
             (SELECT COUNT(*) FROM fg_certificado_formato_version v WHERE v.formato_id = f.id AND v.estado = 'VIGENTE') > 0 as tiene_version_vigente
      FROM fg_certificado_formato f
      LEFT JOIN fg_certificado_formato p ON f.formato_padre_id = p.id
      ORDER BY COALESCE(f.formato_padre_id, f.id) ASC, f.id ASC
    \`;
    const res = await db.query(query);
    return res.rows;
  },`;
  cService = cService.replace(originalListar, newListar);

  // Reemplazar crearFormato
  const originalCrear = `crearFormato: async (nombre, codigo, motor) => {
    const query = \`
      INSERT INTO fg_certificado_formato (nombre, codigo, motor, es_protegido, activo)
      VALUES ($1, $2, $3, false, true)
      RETURNING *
    \`;
    const res = await db.query(query, [nombre, codigo, motor]);
    return res.rows[0];
  },`;
  const newCrear = `crearFormato: async (nombre, codigo, motor, formato_padre_id = null) => {
    if (formato_padre_id) {
        const pRes = await db.query('SELECT es_protegido, motor FROM fg_certificado_formato WHERE id = $1', [formato_padre_id]);
        if (pRes.rowCount === 0) throw new Error('El formato base especificado no existe');
        const padre = pRes.rows[0];
        if (!padre.es_protegido || padre.motor !== 'SISTEMA') {
            throw new Error('El formato base debe ser un formato protegido del sistema');
        }
        motor = 'HTML_DINAMICO'; // Forzar para variantes
    }
    const query = \`
      INSERT INTO fg_certificado_formato (nombre, codigo, motor, es_protegido, activo, formato_padre_id)
      VALUES ($1, $2, $3, false, true, $4)
      RETURNING *
    \`;
    const res = await db.query(query, [nombre, codigo, motor, formato_padre_id]);
    return res.rows[0];
  },
  
  cambiarEstado: async (id) => {
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
      }
      
      const query = \`UPDATE fg_certificado_formato SET activo = NOT activo WHERE id = $1 RETURNING *\`;
      const res = await db.query(query, [id]);
      return res.rows[0];
  },`;
  cService = cService.replace(originalCrear, newCrear);
  fs.writeFileSync(pService, cService, 'utf8');

  // 2. Modificar faregas-formatos.routes.js
  const pRoutes = path.join(base, 'modules', 'faregas', 'routes', 'faregas-formatos.routes.js');
  let cRoutes = fs.readFileSync(pRoutes, 'utf8');

  // Reemplazar POST /
  const originalPost = `// Create new Format
router.post('/', verificarToken, async (req, res) => {
  try {
    const { nombre, codigo, motor } = req.body;
    if (!nombre || !codigo || !motor) return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    const nuevo = await faregasFormatosService.crearFormato(nombre, codigo, motor);
    res.json(nuevo);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear formato', error: error.message });
  }
});`;
  const newPost = `// Create new Format
router.post('/', verificarToken, async (req, res) => {
  try {
    const { nombre, codigo, motor, formato_padre_id } = req.body;
    if (!nombre || !codigo || !motor) return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    const nuevo = await faregasFormatosService.crearFormato(nombre, codigo, motor, formato_padre_id);
    res.json(nuevo);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear formato', error: error.message });
  }
});

// Cambiar estado del formato
router.put('/:id/estado', verificarToken, async (req, res) => {
  try {
    const formato = await faregasFormatosService.cambiarEstado(req.params.id);
    res.json(formato);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al cambiar estado', error: error.message });
  }
});`;
  cRoutes = cRoutes.replace(originalPost, newPost);
  fs.writeFileSync(pRoutes, cRoutes, 'utf8');

  console.log('Backend changes applied successfully');
} catch (e) {
  console.error(e);
}
