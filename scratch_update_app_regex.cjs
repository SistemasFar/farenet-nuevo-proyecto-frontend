const fs = require('fs');
const path = 'c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const funcionEjecutar = `
  const ejecutarLoginEmpresa = async (empresa: EmpresaAsignada, usernameArg?: string, passwordArg?: string) => {
    const userToUse = usernameArg || usernameContext;
    const passToUse = passwordArg || pendingPassword;
    
    const esFaregas = empresa.nombre.toUpperCase().includes('FAREGAS');
    if (esFaregas) {
      try {
        const resp = await authFaregasApi.loginAsync(userToUse, passToUse);
        
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
    }
    
    // ES FARENET -> Ejecutar Login original!
    try {
      const resp = await authApi.loginAsync(userToUse, passToUse);
      
      setPendingPassword('');
      
      const plantasReales = resp.plantas || [];
      const permisosLocales = resp.permisos || [];
      const empresasLocales = resp.empresas || [];
      
      if (resp.requiereSeleccionarPlanta) {
        handleRequirePlanta(
          userToUse,
          plantasReales,
          resp.user,
          permisosLocales
        );
        return;
      }

      if (resp.accessToken && resp.user) {
        handleLoginSuccess(
          resp.accessToken,
          resp.user,
          permisosLocales,
          resp.plantaSeleccionada,
          plantasReales,
          empresasLocales
        );
        return;
      }
      
      throw new Error('No se recibió una sesión válida desde el servidor.');
    } catch (e: any) {
       setPendingPassword('');
       throw e;
    }
  };
`;

const handleRequireEmpresaRegex = /const handleRequireEmpresa = \([\s\S]*?navigate\('\/seleccionar-empresa'\);\s*\};/;

const handleRequireEmpresaNuevo = `const handleRequireEmpresa = async (
    username: string,
    plantas: PlantaAsignada[],
    empresas: EmpresaAsignada[],
    userData?: UserSession,
    userPermisos: string[] = [],
    password?: string
  ) => {
    setUsernameContext(username);
    setPlantasDisponibles(plantas);
    setPermisos(userPermisos);

    if (password) {
      setPendingPassword(password);
    }

    if (userData) {
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
    }
    sessionStorage.setItem('plantasDisponibles', JSON.stringify(plantas));
    permisosSession.guardar(userPermisos);
    
    establecerEmpresasDisponibles(empresas);
    
    if (empresas.length === 1 && password) {
      await ejecutarLoginEmpresa(empresas[0], username, password);
    } else {
      navigate('/seleccionar-empresa');
    }
  };`;

if(handleRequireEmpresaRegex.test(content)) {
  content = content.replace(handleRequireEmpresaRegex, funcionEjecutar + '\\n  ' + handleRequireEmpresaNuevo);
} else {
  console.log("Could not find handleRequireEmpresa");
  process.exit(1);
}

const onSelectRegex = /onSelect=\{async \(empresa\) => \{[\s\S]*?\}\} \r?\n\s*\/>/;
const onSelectNuevo = `onSelect={async (empresa) => {
                await ejecutarLoginEmpresa(empresa);
              }} 
            />`;

if(onSelectRegex.test(content)) {
  content = content.replace(onSelectRegex, onSelectNuevo);
} else {
  console.log("Could not find onSelect");
  process.exit(1);
}

fs.writeFileSync(path, content, 'utf8');
console.log('App.tsx updated successfully with regex');
