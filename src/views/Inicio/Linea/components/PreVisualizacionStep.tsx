import  { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { lineaApi } from '../../../../services/api';

interface PreVisualizacionStepProps {
  nroInspeccion: string;
  estadoLinea?: any;
}

export function PreVisualizacionStep({ nroInspeccion }: PreVisualizacionStepProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreVisualizacion = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await lineaApi.obtenerPrevisualizacion(nroInspeccion);
        if (data.ok) {
          setHtmlContent(data.html);
        } else {
          setError(data.message + (data.detail ? ` | Detail: ${data.detail}` : ''));
        }
      } catch (err: any) {
        setError(err.message || 'Error de red');
      } finally {
        setLoading(false);
      }
    };
    fetchPreVisualizacion();
  }, [nroInspeccion]);

  return (
    <div className="flex-1 w-full h-full p-4 relative overflow-hidden flex flex-col items-center bg-slate-100 rounded-xl">
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-500 font-medium">Generando certificado en memoria...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 max-w-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-50">
            <span className="text-red-500 font-bold text-2xl">!</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">No se pudo cargar la vista previa</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      ) : (
        <div className="w-full h-full overflow-auto bg-white">
            <iframe 
              srcDoc={htmlContent} 
              className="border-0 bg-white"
              style={{
                width: '100%',
                minHeight: 'calc(100vh - 260px)',
                height: 'calc(100vh - 260px)'
              }}
              title="Previsualizacion Certificado"
            />
        </div>
      )}
    </div>
  );
}
