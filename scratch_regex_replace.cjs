const fs = require('fs');
const file = 'c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(esFaregas\) \{\s*setPendingPassword\(''\); \/\/ Descartar password inmediatamente\s*navigate\('\/faregas\/seleccionar-planta'\);\s*return;\s*\}/;

const newText = `if (esFaregas) {
                  try {
                    const resp = await authFaregasApi.loginAsync(usernameContext, pendingPassword);
                    
                    setFaregasPreToken(resp.preToken);
                    sessionStorage.setItem('faregasPreToken', resp.preToken);
                    
                    const plantasFaregas = resp.plantas || [];
                    setFaregasPlantasDisponibles(plantasFaregas);
                    sessionStorage.setItem('faregasPlantasDisponibles', JSON.stringify(plantasFaregas));
                    
                    if (resp.user) {
                      setFaregasUser(resp.user);
                      sessionStorage.setItem('faregasUser', JSON.stringify(resp.user));
                    }
                    
                    setPendingPassword('');
                    navigate('/faregas/seleccionar-planta');
                    return;
                  } catch (e: any) {
                    setPendingPassword('');
                    throw e;
                  }
                }`;

if (regex.test(content)) {
    content = content.replace(regex, newText);
    fs.writeFileSync(file, content);
    console.log('Successfully replaced esFaregas block');
} else {
    console.log('Could not find esFaregas block with regex');
}
