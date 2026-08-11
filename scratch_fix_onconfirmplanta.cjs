const fs = require('fs');
const file = 'c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /onConfirmPlanta=\{async \(plantaKey\) => \{\s*const token = faregasPreToken \|\| sessionStorage\.getItem\('faregasPreToken'\) \|\| '';\s*const resp = await authFaregasApi\.confirmarPlantaAsync\(plantaKey, token\);\s*setFaregasPreToken\(''\);\s*sessionStorage\.removeItem\('faregasPreToken'\);\s*setFaregasAccessToken\(resp\.accessToken\);\s*sessionStorage\.setItem\('faregasAccessToken', resp\.accessToken\);\s*setFaregasUser\(resp\.user\);\s*sessionStorage\.setItem\('faregasUser', JSON\.stringify\(resp\.user\)\);\s*setFaregasPlanta\(resp\.plantaSeleccionada\);\s*sessionStorage\.setItem\('faregasPlanta', JSON\.stringify\(resp\.plantaSeleccionada\)\);\s*navigate\('\/faregas\/inicio'\);\s*\}\}/;

const newText = `onConfirmPlanta={async (plantaKey) => {
                      const token = faregasPreToken || sessionStorage.getItem('faregasPreToken') || '';
                      const resp = await authFaregasApi.confirmarPlantaAsync(plantaKey, token);
                      
                      setFaregasAccessToken(resp.accessToken);
                      sessionStorage.setItem('faregasAccessToken', resp.accessToken);
                      
                      setFaregasUser(resp.user);
                      sessionStorage.setItem('faregasUser', JSON.stringify(resp.user));
                      
                      setFaregasPlanta(resp.plantaSeleccionada);
                      sessionStorage.setItem('faregasPlanta', JSON.stringify(resp.plantaSeleccionada));
                      
                      navigate('/faregas/inicio');
                      
                      setTimeout(() => {
                        setFaregasPreToken('');
                        sessionStorage.removeItem('faregasPreToken');
                      }, 100);
                    }}`;

if (regex.test(content)) {
    content = content.replace(regex, newText);
    fs.writeFileSync(file, content);
    console.log('Successfully replaced onConfirmPlanta block');
} else {
    console.log('Could not find onConfirmPlanta block with regex');
}
