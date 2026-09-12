const fs = require('fs');
const file = '../farenetBackend/modules/faregas/services/faregas-formatos.variables.js';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('certificado.titulo')) {
    content = content.replace(
        /grupo: 'Certificado',\s*tipo: 'string',\s*demo: 'DG-27-95740'\s*},/,
        `grupo: 'Certificado',
    tipo: 'string',
    demo: 'DG-27-95740'
  },
  {
    key: 'certificado.titulo',
    label: 'Título del Certificado',
    grupo: 'Certificado',
    tipo: 'string',
    demo: 'CERTIFICADO DE INSPECCIÓN DE TALLER'
  },`
    );
    fs.writeFileSync(file, content);
    console.log('Added certificado.titulo');
}
