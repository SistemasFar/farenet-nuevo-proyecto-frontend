const fs = require('fs');
const file = 'c:/Users/Sistemas2/Desktop/farenet nuevo proyecto/farenetFrontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const start = content.indexOf('{/* RUTAS DE FAREGAS */}');
const end = content.indexOf('{/* RUTAS DE FARENET */}');
const oldRoutes = content.substring(start, end);

const newRoutes = `{/* RUTAS DE FAREGAS */}
      <Route
        path="/faregas/*"
        element={
          <Routes>
            <Route 
              path="seleccionar-planta" 
              element={
                (!faregasPreToken && !sessionStorage.getItem('faregasPreToken')) ? (
                  <Navigate to="/login" replace />
                ) : (
                  <FaregasSeleccionPlantaView
                    plantas={faregasPlantasDisponibles.length > 0 ? faregasPlantasDisponibles : JSON.parse(sessionStorage.getItem('faregasPlantasDisponibles') || '[]')}
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
                (!faregasAccessToken && !sessionStorage.getItem('faregasAccessToken')) ? (
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
              <Route path="certificados/nuevo" element={<FaregasNuevoCertificadoView />} />
              <Route path="*" element={<NotFoundView />} />
            </Route>
          </Routes>
        }
      />

      `;

content = content.replace(oldRoutes, newRoutes);
fs.writeFileSync(file, content);
console.log('Routes updated');
