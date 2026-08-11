const fs = require('fs');

const path = 'c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Añadir dependencias en estado
content = content.replace(
  `  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);`,
  `  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);\n  const [faregasPreToken, setFaregasPreToken] = useState<string>('');\n  const [faregasAccessToken, setFaregasAccessToken] = useState<string>('');\n  const [faregasPlantasDisponibles, setFaregasPlantasDisponibles] = useState<PlantaAsignada[]>([]);\n  const [faregasUser, setFaregasUser] = useState<UserSession | null>(null);\n  const [faregasPlanta, setFaregasPlanta] = useState<PlantaAsignada | null>(null);`
);

// 2. Modificar useEffect para restaurar estado FAREGAS
content = content.replace(
  `      const token = sessionStorage.getItem('accessToken');`,
  `      const fToken = sessionStorage.getItem('faregasAccessToken');\n      if(fToken) {\n        setFaregasAccessToken(fToken);\n        setFaregasUser(JSON.parse(sessionStorage.getItem('faregasUser') || 'null'));\n        setFaregasPlanta(JSON.parse(sessionStorage.getItem('faregasPlanta') || 'null'));\n      }\n      const token = sessionStorage.getItem('accessToken');`
);

// 3. handleLogout FAREGAS
content = content.replace(
  `  const handleLogout = async () => {`,
  `  const handleLogoutFaregas = () => {\n    sessionStorage.removeItem('faregasAccessToken');\n    sessionStorage.removeItem('faregasUser');\n    sessionStorage.removeItem('faregasPlanta');\n    sessionStorage.removeItem('faregasPreToken');\n    setFaregasAccessToken('');\n    setFaregasUser(null);\n    setFaregasPlanta(null);\n    setFaregasPreToken('');\n    setFaregasPlantasDisponibles([]);\n    navigate('/login');\n  };\n\n  const handleLogout = async () => {`
);

// 4. Modificar onSelect de SeleccionEmpresaView
content = content.replace(
  `                if (esFaregas) {
                  setPendingPassword(''); // Descartar password inmediatamente
                  navigate('/faregas/seleccionar-planta');
                  return;
                }`,
  `                if (esFaregas) {
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
                }`
);

// 5. Update /faregas/* routing
const oldRouteFaregas = `      {/* RUTAS DE FAREGAS */}
      <Route
        path="/faregas/*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : !isFaregas ? (
            <Navigate to="/inicio" replace />
          ) : (
            <Routes>
              <Route 
                path="seleccionar-planta" 
                element={
                  <SelectPlantaView
                    plantas={plantasDisponibles}
                    onConfirmPlanta={handleConfirmPlanta}
                    onCancel={limpiarSesionFrontend}
                  />
                } 
              />
              <Route
                element={
                  !isDashboardReady ? (
                    <Navigate to="/faregas/seleccionar-planta" replace />
                  ) : (
                    <FaregasMainLayout
                      user={user}
                      permisos={permisos}
                      plantaSeleccionada={planta}
                      plantasDisponibles={plantasDisponibles}
                      onCambiarPlanta={handleCambiarPlanta}
                      onLogout={handleLogout}
                    />
                  )
                }
              >
                <Route path="inicio" element={<FaregasInicioView />} />
                <Route path="nuevo-certificado" element={<FaregasNuevoCertificadoView />} />
              </Route>
            </Routes>
          )
        }
      />`;

const newRouteFaregas = `      {/* RUTAS DE FAREGAS */}
      <Route
        path="/faregas/*"
        element={
          <Routes>
            <Route 
              path="seleccionar-planta" 
              element={
                !faregasPreToken && !sessionStorage.getItem('faregasPreToken') ? (
                  <Navigate to="/login" replace />
                ) : (
                  <import('./modules/faregas/views/SeleccionPlanta/SeleccionPlantaView').then(m => m.SeleccionPlantaView)
                    // Haremos esto arriba en import estatico
                    plantas={faregasPlantasDisponibles}
                    onConfirmPlanta={async (plantaKey) => {
                      const token = faregasPreToken || sessionStorage.getItem('faregasPreToken') || '';
                      const resp = await authFaregasApi.confirmarPlantaAsync(plantaKey, token);
                      setFaregasPreToken('');
                      sessionStorage.removeItem('faregasPreToken');
                      setFaregasAccessToken(resp.accessToken);
                      sessionStorage.setItem('faregasAccessToken', resp.accessToken);
                      setFaregasUser(resp.user);
                      sessionStorage.setItem('faregasUser', JSON.stringify(resp.user));
                      setFaregasPlanta(resp.plantaSeleccionada);
                      sessionStorage.setItem('faregasPlanta', JSON.stringify(resp.plantaSeleccionada));
                      navigate('/faregas/inicio');
                    }}
                    onCancel={handleLogoutFaregas}
                  />
                )
              } 
            />
            <Route
              element={
                !faregasAccessToken && !sessionStorage.getItem('faregasAccessToken') ? (
                  <Navigate to="/login" replace />
                ) : (
                  <FaregasMainLayout
                    user={faregasUser || JSON.parse(sessionStorage.getItem('faregasUser') || 'null')}
                    permisos={[]}
                    plantaSeleccionada={faregasPlanta || JSON.parse(sessionStorage.getItem('faregasPlanta') || 'null')}
                    plantasDisponibles={[]}
                    onCambiarPlanta={() => {}}
                    onLogout={handleLogoutFaregas}
                  />
                )
              }
            >
              <Route path="inicio" element={<FaregasInicioView />} />
              <Route path="nuevo-certificado" element={<FaregasNuevoCertificadoView />} />
            </Route>
          </Routes>
        }
      />`;

// Inject import
content = content.replace(
  `import { SelectPlantaView } from './core/views/SelectPlantaView';`,
  `import { SelectPlantaView } from './core/views/SelectPlantaView';\nimport { SeleccionPlantaView as FaregasSeleccionPlantaView } from './modules/faregas/views/SeleccionPlanta/SeleccionPlantaView';`
);

content = content.replace(oldRouteFaregas, newRouteFaregas.replace(`import('./modules/faregas/views/SeleccionPlanta/SeleccionPlantaView').then(m => m.SeleccionPlantaView)`, `FaregasSeleccionPlantaView`));

fs.writeFileSync(path, content);
console.log('App.tsx updated for FAREGAS auth flow');
