const fs = require('fs');
const file = 'c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBranch = `                if (esFaregas) {
                  try {
                    const resp = await authFaregasApi.loginAsync(usernameContext, pendingPassword);
                    setPendingPassword('');
                    setFaregasPreToken(resp.preToken);
                    sessionStorage.setItem('faregasPreToken', resp.preToken);
                    setFaregasPlantasDisponibles(resp.plantas || []);
                    navigate('/faregas/seleccionar-planta');
                    return;
                  } catch (e: any) {
                    setPendingPassword('');
                    throw e;
                  }
                }`;

const newBranch = `                if (esFaregas) {
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

if (content.includes(oldBranch)) {
    content = content.replace(oldBranch, newBranch);
    fs.writeFileSync(file, content);
    console.log('Fixed onSelect branch for FAREGAS');
} else {
    console.log('Error: Could not find oldBranch in App.tsx');
}
