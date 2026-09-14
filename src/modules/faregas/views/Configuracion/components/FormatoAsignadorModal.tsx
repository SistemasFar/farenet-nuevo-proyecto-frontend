import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { faregasConfigApi, type ServicioConfiguracionFaregas } from '../../../services/faregas-config.api';
import { faregasFormatosApi, type Formato } from '../../../services/faregas-formatos.api';

interface Props {
  servicio: ServicioConfiguracionFaregas;
  onClose: () => void;
  onAsignado: (formato: Formato) => void;
}

type ModoAsignacion = 'EXISTENTE' | 'NUEVO' | 'VARIANTE_PROTEGIDO';

const mensajeError = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

export default function FormatoAsignadorModal({ servicio, onClose, onAsignado }: Props) {
  const [formatos, setFormatos] = useState<Formato[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modo, setModo] = useState<ModoAsignacion>('EXISTENTE');
  const [filtro, setFiltro] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCodigo, setNuevoCodigo] = useState('');

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
      const coincide = !texto || `${formato.codigo} ${formato.nombre}`.toLowerCase().includes(texto);
      if (!coincide) return false;
      return modo === 'VARIANTE_PROTEGIDO'
        ? formato.es_protegido && formato.motor === 'SISTEMA'
        : true;
    });
  }, [filtro, formatos, modo]);

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

  const asignarExistente = async (formato: Formato) => {
    if (!window.confirm(`¿Asignar el formato ${formato.nombre} a ${servicio.nombre}?`)) return;
    await ejecutar(async () => {
      await faregasConfigApi.asignarFormato(servicio.id, formato.id);
      return formato;
    });
  };

  const crearNuevo = async (event: FormEvent) => {
    event.preventDefault();
    await ejecutar(async () => {
      const formato = await faregasFormatosApi.crearFormato({
        nombre: nuevoNombre.trim(),
        codigo: nuevoCodigo.trim().toUpperCase().replace(/\s+/g, '_'),
        motor: 'HTML_DINAMICO'
      });
      await faregasConfigApi.asignarFormato(servicio.id, formato.id);
      return formato;
    });
  };

  const crearVariante = async (formatoPadre: Formato) => {
    if (!window.confirm(`¿Crear una variante de ${formatoPadre.nombre} solo para ${servicio.nombre}?`)) return;
    await ejecutar(() => faregasConfigApi.crearVarianteFormato(servicio.id, formatoPadre.id));
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

        <div className="grid grid-cols-1 border-b sm:grid-cols-3">
          {([
            ['EXISTENTE', 'Usar formato existente'],
            ['NUEVO', 'Crear formato dinámico'],
            ['VARIANTE_PROTEGIDO', 'Variante de protegido']
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => { setModo(id); setError(''); }}
              className={`px-3 py-3 text-sm font-bold ${modo === id ? 'bg-blue-50 text-blue-800' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

          {modo === 'NUEVO' ? (
            <form onSubmit={crearNuevo} className="mx-auto max-w-md space-y-4">
              <p className="text-sm text-slate-600">Se creará un formato HTML dinámico vacío y se asignará únicamente a esta operación. Las versiones se administran después desde Editar formato.</p>
              <input aria-label="Código del formato" placeholder="CÓDIGO" value={nuevoCodigo}
                onChange={(event) => setNuevoCodigo(event.target.value)} maxLength={50}
                className="w-full rounded-lg border p-2 uppercase" required />
              <input aria-label="Nombre del formato" placeholder="Nombre" value={nuevoNombre}
                onChange={(event) => setNuevoNombre(event.target.value)} maxLength={150}
                className="w-full rounded-lg border p-2" required />
              <button type="submit" disabled={saving} className="w-full rounded-lg bg-[#052A79] p-2 font-bold text-white disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear y asignar'}
              </button>
            </form>
          ) : loading ? (
            <div className="py-12 text-center text-slate-500">Cargando formatos...</div>
          ) : (
            <div className="space-y-4">
              <input aria-label="Buscar formato" placeholder="Buscar por código o nombre..." value={filtro}
                onChange={(event) => setFiltro(event.target.value)} className="w-full rounded-lg border p-2" />
              {modo === 'VARIANTE_PROTEGIDO' && (
                <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  El formato protegido no se modifica. Se crea una variante dinámica y se asigna solamente a esta operación.
                </p>
              )}
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
                    <button type="button" disabled={saving}
                      onClick={() => void (modo === 'EXISTENTE' ? asignarExistente(formato) : crearVariante(formato))}
                      className="mt-4 rounded-lg border border-blue-200 p-2 font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                      {modo === 'EXISTENTE' ? 'Asignar' : 'Crear variante'}
                    </button>
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
