const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/faregas/views/NuevoCertificado/NuevoCertificadoView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove nroInspeccion from useParams and add id
content = content.replace(
  /const { nroInspeccion } = useParams<{ nroInspeccion: string }>\(\);/,
  `const { id } = useParams<{ id?: string }>();`
);
content = content.replace(
  /const inspeccionIdToResume = nroInspeccion \|\| null;/,
  `const [certificadoId, setCertificadoId] = useState<number | undefined>(id ? parseInt(id, 10) : undefined);`
);

// 2. Remove nrodocumentoinspeccion from state
content = content.replace(
  /const \[nrodocumentoinspeccion, setNrodocumentoinspeccion\] = useState<string>\(''\);\r?\n/,
  ``
);

// 3. Replace the entire useEffect of initNroInspeccion
const useEffectStart = content.indexOf('  useEffect(() => {\n    const initNroInspeccion = async () => {');
if (useEffectStart !== -1) {
  const useEffectEndStr = '  }, [plantaSeleccionada, nrodocumentoinspeccion, inspeccionIdToResume]);\n';
  const useEffectEnd = content.indexOf(useEffectEndStr, useEffectStart);
  if (useEffectEnd !== -1) {
    const cleanUseEffect = `  useEffect(() => {
    const cargarBorrador = async () => {
      if (!certificadoId) return;
      try {
        setLoading(true);
        const res = await faregasCertificadosApi.obtenerBorradorCompleto(certificadoId);
        if (res?.data) {
          // Hidratar estado del borrador
          if (res.data.tipoCertificadoClave) setFormCaja(prev => ({...prev, tipoCertificado: res.data.tipoCertificadoClave}));
          
          if (res.data.vehiculo) {
             setFormVehiculo(prev => ({
                ...prev,
                placaNueva: res.data.vehiculo.placa || '',
                marca: res.data.vehiculo.marca || '',
                modelo: res.data.vehiculo.modelo || '',
                carroceria: res.data.vehiculo.carroceria || '',
                color: res.data.vehiculo.color || '',
                clase: res.data.vehiculo.clase || '',
                combustible: res.data.vehiculo.combustible || '',
                nroSerie: res.data.vehiculo.serie || '',
                nroMotor: res.data.vehiculo.motor || '',
                anioFabricacion: res.data.vehiculo.anoFabricacion?.toString() || '',
                nroAsientos: res.data.vehiculo.asientos?.toString() || '',
                nroCilindros: res.data.vehiculo.cilindros?.toString() || '',
                nroEjes: res.data.vehiculo.ejes?.toString() || '',
                nroRuedas: res.data.vehiculo.ruedas?.toString() || '',
                nroPasajeros: res.data.vehiculo.pasajeros?.toString() || '',
                pesoSeco: res.data.vehiculo.pesoSeco?.toString() || '',
                pesoBruto: res.data.vehiculo.pesoBruto?.toString() || '',
                cargaUtil: res.data.vehiculo.cargaUtil?.toString() || '',
                longitud: res.data.vehiculo.longitud?.toString() || '',
                altura: res.data.vehiculo.altura?.toString() || '',
                ancho: res.data.vehiculo.ancho?.toString() || ''
             }));
          }
          if (res.data.titulares) setTitulares(res.data.titulares);
          
          if (res.data.gnv) setFormGnv(res.data.gnv);
          if (res.data.glp) setFormGlp(res.data.glp);
          if (res.data.conformidad) setFormConformidad(res.data.conformidad);

          console.log("[DEBUG] Borrador FAREGAS recuperado con éxito:", res.data.id);
        }
      } catch (error) {
        console.error("Error al cargar borrador FAREGAS:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarBorrador();
  }, [certificadoId]);\n`;
    content = content.substring(0, useEffectStart) + cleanUseEffect + content.substring(useEffectEnd + useEffectEndStr.length);
  }
}

// 4. In handleSiguiente (Paso 1), if we are creating, use faregasCertificadosApi.crearBorrador
// We need to check if handleSiguiente has FARENET logic that was restored. Let's see later if there is.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Cleaned NuevoCertificadoView.tsx');
