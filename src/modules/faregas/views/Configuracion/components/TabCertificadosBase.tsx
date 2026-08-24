import { useEffect, useMemo, useState } from 'react';
import {
  faregasConfigApi,
  type ServicioConfiguracionFaregas
} from '../../../services/faregas-config.api';

interface CertificadoBase {
  id: string;
  nombre: string;
  claveTecnica: 'GNV_ANUAL' | 'GLP_ANUAL' | 'CONFORMIDAD';
  modalidad: 'INICIAL' | 'ANUAL' | null;
}

const CERTIFICADOS_BASE: CertificadoBase[] = [
  { id: 'GNV_INICIAL', nombre: 'GNV Inicial', claveTecnica: 'GNV_ANUAL', modalidad: 'INICIAL' },
  { id: 'GNV_ANUAL', nombre: 'GNV Anual', claveTecnica: 'GNV_ANUAL', modalidad: 'ANUAL' },
  { id: 'GLP_INICIAL', nombre: 'GLP Inicial', claveTecnica: 'GLP_ANUAL', modalidad: 'INICIAL' },
  { id: 'GLP_ANUAL', nombre: 'GLP Anual', claveTecnica: 'GLP_ANUAL', modalidad: 'ANUAL' },
  { id: 'CONFORMIDAD', nombre: 'Conformidad', claveTecnica: 'CONFORMIDAD', modalidad: null }
];

export default function TabCertificadosBase() {
  const [servicios, setServicios] = useState<ServicioConfiguracionFaregas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    void faregasConfigApi.getServicios()
      .then((data) => {
        if (!cancelado) setServicios(data);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar certificados base');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => { cancelado = true; };
  }, []);

  const certificados = useMemo(() => CERTIFICADOS_BASE.map((certificado) => ({
    ...certificado,
    servicios: servicios.filter((servicio) =>
      servicio.requiere_certificado
      && servicio.tipo_certificado_clave === certificado.claveTecnica
      && servicio.modalidad === certificado.modalidad
    )
  })), [servicios]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="mb-1 font-semibold">Certificados base estructurales</p>
        <p>
          Estos cinco formatos son de solo lectura. Los servicios asociados se obtienen
          automáticamente de la configuración actual de servicios Faregas.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-500 shadow-sm">
          Cargando certificados base...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-10 text-center text-red-600">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {certificados.map((certificado) => (
            <article key={certificado.id} className="flex min-h-64 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#052A79]">{certificado.nombre}</h3>
                  <p className="mt-1 text-xs text-gray-500">Formato oficial Faregas</p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600">
                  Solo lectura
                </span>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 border-b border-gray-100 py-4 text-sm">
                <dt className="font-semibold text-gray-500">Clave técnica:</dt>
                <dd className="font-mono font-bold text-gray-800">{certificado.claveTecnica}</dd>
                <dt className="font-semibold text-gray-500">Modalidad:</dt>
                <dd className="font-bold text-gray-800">{certificado.modalidad || 'NO APLICA'}</dd>
              </dl>

              <div className="flex-1 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold uppercase text-gray-500">Servicios asociados</h4>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {certificado.servicios.length}
                  </span>
                </div>
                {certificado.servicios.length === 0 ? (
                  <p className="text-sm italic text-gray-400">Sin servicios asociados actualmente.</p>
                ) : (
                  <ul className="space-y-2">
                    {certificado.servicios.map((servicio) => (
                      <li key={servicio.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                        <span className="font-mono text-xs font-bold text-gray-700">{servicio.codigo}</span>
                        {!servicio.activo && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">INACTIVO</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
