const fs = require('fs');
let c = fs.readFileSync('c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx', 'utf8');
c = c.replace('\\n  const handleRequireEmpresa', '\\n  const handleRequireEmpresa');
fs.writeFileSync('c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx', c);
console.log('Done!');
