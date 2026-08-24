import { useState, useEffect } from 'react';
import { faregasConfigApi } from '../../../services/faregas-config.api';

export default function TabCertificadosBase() {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await faregasConfigApi.getServicios();
        setServicios(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar certificados base');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // GNV_ANUAL + INICIAL
  // GNV_ANUAL + ANUAL
  // GLP_ANUAL + INICIAL
  // GLP_ANUAL + ANUAL
  // CONFORMIDAD
  const countCert = (tipo: string, mod: string | null) => {
    return servicios.filter(s => s.tipo_certificado_clave === tipo && s.modalidad === mod).length;
  };

  const certificados = [
    { key: 'GNV_INICIAL', nombre: 'GNV Inicial', cuenta: countCert('GNV_ANUAL', 'INICIAL') },
    { key: 'GNV_ANUAL', nombre: 'GNV Anual', cuenta: countCert('GNV_ANUAL', 'ANUAL') },
    { key: 'GLP_INICIAL', nombre: 'GLP Inicial', cuenta: countCert('GLP_ANUAL', 'INICIAL') },
    { key: 'GLP_ANUAL', nombre: 'GLP Anual', cuenta: countCert('GLP_ANUAL', 'ANUAL') },
    { key: 'CONFORMIDAD', nombre: 'Conformidad', cuenta: countCert('CONFORMIDAD', null) },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 text-sm">
        <p className="font-semibold mb-1">Información sobre Certificados Base</p>
        <p>Los certificados base son estructuras y formatos estándar obligatorios definidos en el sistema. Los servicios comerciales se vinculan a estos certificados para determinar qué formato se imprimirá al final de una inspección. No es posible editar ni eliminar los certificados base desde esta pantalla.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50">
          <span className="font-semibold text-gray-700">Certificados Base Disponibles</span>
        </div>

        {loading ? (
          <div className="text-center py-10">Cargando certificados...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-10">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-white text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nombre del Certificado</th>
                  <th className="px-4 py-3 text-center">Servicios Asociados</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certificados.map((c) => (
                  <tr key={c.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{c.nombre}</td>
                    <td className="px-4 py-3 text-center font-medium">
                      {c.cuenta > 0 ? (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {c.cuenta} servicios
                        </span>
                      ) : (
                        <span className="text-gray-400">0 servicios</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400 italic text-xs">Solo Lectura</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
