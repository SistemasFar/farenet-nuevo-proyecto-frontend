const fs = require('fs');
const file = '../farenetBackend/modules/faregas/services/faregas-formatos.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    'SELECT id, version, configuracion, estado, vigente_desde, creado_en',
    'SELECT id, version, configuracion, estado, vigente_desde, creado_en, motor'
);

fs.writeFileSync(file, content);
console.log('Update backend service select success');
