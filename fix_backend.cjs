const fs = require('fs');
const path = require('path');

const base = 'c:\\Users\\Sistemas2\\Desktop\\farenet nuevo proyecto\\farenetBackend';

try {
  // 1. Fix auth in formatos routes
  const p1 = path.join(base, 'modules', 'faregas', 'routes', 'faregas-formatos.routes.js');
  let c1 = fs.readFileSync(p1, 'utf8');
  c1 = c1.replace(
    "const verificarToken = require('../../../middlewares/auth.middleware');",
    "const { authFaregasMiddleware: verificarToken } = require('../middlewares/faregas-auth.middleware');"
  );
  fs.writeFileSync(p1, c1, 'utf8');
  console.log('Fixed formatos routes auth');

  // 2. Fix filter in tarifas service
  const p2 = path.join(base, 'modules', 'faregas', 'services', 'faregas-tarifas.service.js');
  let c2 = fs.readFileSync(p2, 'utf8');
  c2 = c2.replace(
    "AND s.tipo_flujo = 'CERTIFICACION'",
    "AND s.tipo_flujo IN ('CERTIFICACION', 'TALLER_INSPECCION')"
  );
  fs.writeFileSync(p2, c2, 'utf8');
  console.log('Fixed tarifas service filter');

  // 3. Add snapshot route
  const p3 = path.join(base, 'modules', 'faregas', 'routes', 'faregas-certificados.routes.js');
  let c3 = fs.readFileSync(p3, 'utf8');
  if (!c3.includes('/borradores/:id/snapshot')) {
    c3 = c3.replace(
      "// TALLERES",
      "// TALLER INSPECCION\nrouter.put('/borradores/:id/snapshot', controller.guardarTaller);\n\n// TALLERES"
    );
    fs.writeFileSync(p3, c3, 'utf8');
    console.log('Added snapshot route');
  }
} catch (e) {
  console.error(e);
}
console.log('DONE');
