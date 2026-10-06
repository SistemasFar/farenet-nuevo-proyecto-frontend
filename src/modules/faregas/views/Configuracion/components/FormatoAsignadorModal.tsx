import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { faregasConfigApi, type ServicioConfiguracionFaregas } from '../../../services/faregas-config.api';
import { faregasFormatosApi, type Formato } from '../../../services/faregas-formatos.api';

interface Props {
  servicio: ServicioConfiguracionFaregas;
  onClose: () => void;
  onAsignado: (formato: Formato) => void;
}

const mensajeError = (error: unknown) => {
  const msg = error instanceof Error ? error.message : 'No se pudo completar la operación.';
  if (msg.includes('FORMATO_INCOMPATIBLE_CON_TIPO_CERTIFICADO')) return 'La base seleccionada no corresponde al tipo de certificado de esta operación.';
  return msg;
};

export default function FormatoAsignadorModal({ servicio, onClose, onAsignado }: Props) {
  const [formatos, setFormatos] = useState<Formato[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    let cancelado = false;
    faregasFormatosApi.listarFormatos()
      .then((resultado) => {
        if (!cancelado) setFormatos(resultado.filter((formato) => formato.activo));
      })
      .catch((cause: unknown) => {
        if (!cancelado) setError(mensajeError(cause));
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => { cancelado = true; };
  }, []);

  const formatosVisibles = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    return formatos.filter((formato) => {
      return !texto || `${formato.codigo} ${formato.nombre}`.toLowerCase().includes(texto);
    });
  }, [filtro, formatos]);

  const ejecutar = async (accion: () => Promise<Formato>) => {
    setSaving(true);
    setError('');
    try {
      onAsignado(await accion());
    } catch (cause) {
      setError(mensajeError(cause));
      setSaving(false);
    }
  };

  const cargarFormatos = async () => {
    const resultado = await faregasFormatosApi.listarFormatos();
    setFormatos(resultado.filter((formato) => formato.activo));
  };

  const eliminarFormato = async (formato: Formato) => {
    const confirmado = window.confirm(
      `¿Eliminar el formato "${formato.nombre}"?\n\n`
      + `Código: ${formato.codigo}\n\n`
      + 'Esta acción eliminará el formato si no está siendo utilizado.'
    );
    if (!confirmado) return;
    setSaving(true);
    setError('');
    try {
      await faregasFormatosApi.eliminarFormato(formato.id);
      // Se recarga sólo la lista de formatos: la pantalla no se vuelve a pintar
      // entera y el formato desaparece de inmediato.
      await cargarFormatos();
      setAviso('Formato eliminado correctamente.');
    } catch (cause) {
      // El backend explica por qué no se puede eliminar (protegido, en uso o
      // con variantes), en vez de un error genérico de base de datos.
      setError(mensajeError(cause));
    } finally {
      setSaving(false);
    }
  };

  const asignarExistente = async (formato: Formato) => {
    if (!window.confirm(`¿Asignar el formato ${formato.nombre} a ${servicio.nombre}?`)) return;
    await ejecutar(async () => {
      await faregasConfigApi.asignarFormato(servicio.id, formato.id);
      return formato;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Agregar formato</h2>
            <p className="text-sm text-slate-500">{servicio.codigo} — {servicio.nombre}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="border-b bg-blue-50 px-6 py-3 text-sm font-bold text-blue-800">
          Usar formato existente
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          {aviso && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{aviso}</div>}

          {loading ? (
            <div className="py-12 text-center text-slate-500">Cargando formatos...</div>
          ) : (
            <div className="space-y-4">
              <input aria-label="Buscar formato" placeholder="Buscar por código o nombre..." value={filtro}
                onChange={(event) => setFiltro(event.target.value)} className="w-full rounded-lg border p-2" />
              <div className="grid gap-4 sm:grid-cols-2">
                {formatosVisibles.map((formato) => (
                  <article key={formato.id} className="flex flex-col justify-between rounded-xl border p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-800">{formato.nombre}</h4>
                        {formato.es_protegido && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">PROTEGIDO</span>}
                      </div>
                      <p className="mt-1 font-mono text-xs text-slate-500">{formato.codigo}</p>
                      <p className="mt-1 text-xs text-slate-500">{formato.motor}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="button" disabled={saving}
                        onClick={() => void asignarExistente(formato)}
                        className="flex-1 rounded-lg border border-blue-200 p-2 font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                        Asignar
                      </button>
                      {/* Un formato protegido nunca se elimina, ni se ofrece la
                          opción: el backend también lo rechaza. */}
                      {!formato.es_protegido && (
                        <button type="button" disabled={saving} onClick={() => void eliminarFormato(formato)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                          Eliminar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {formatosVisibles.length === 0 && <div className="py-10 text-center text-slate-500">No hay formatos disponibles para esta opción.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
