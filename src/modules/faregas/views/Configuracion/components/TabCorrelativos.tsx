import { useEffect, useState } from 'react';
import { faregasCertificadosApi } from '../../../services/faregas-certificados.api';
import { faregasSeriesApi } from '../../../services/faregas-series.api';

interface CorrelativoRango {
  id: number;
  plantaKey: string;
  plantaNombre: string;
  tipoClave: string;
  tipoBase: string;
  modalidad: 'INICIAL' | 'ANUAL' | 'UNICA';
  tipoCodigo: string;
  tipoNombre: string;
  nroInicio: number;
  nroActual: number;
  nroMaximo: number;
  activo: boolean;
  disponibles: number;
  agotado: boolean;
  fechaAsignacion: string;
  fechaCierre: string | null;
}

const mensajeError = (error: unknown, alternativo: string) =>
  error instanceof Error && error.message ? error.message : alternativo;

export default function TabCorrelativos() {
  const [sedes, setSedes] = useState<{ key: string; nombre: string; activo: boolean }[]>([]);
  const [tipos, setTipos] = useState<{
    clave: string;
    tipoBase: string;
    modalidad: 'INICIAL' | 'ANUAL' | 'UNICA';
    codigo: string;
    nombre: string;
  }[]>([]);
  
  const [plantaKey, setPlantaKey] = useState('');
  const [tipo, setTipo] = useState('');
  
  const [rangos, setRangos] = useState<CorrelativoRango[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [modal, setModal] = useState<boolean>(false);
  const [rangoEditando, setRangoEditando] = useState<CorrelativoRango | null>(null);
  const [formRango, setFormRango] = useState({ plantaKey: '', tipoCertificadoClave: '', nroInicio: 1, nroMaximo: 100 });
  const [modalSaving, setModalSaving] = useState(false);

  const rangosAgotados = rangos.filter((r) => r.activo && r.disponibles <= 0);
  const rangosPorAgotarse = rangos.filter((r) => r.activo && r.disponibles > 0 && r.disponibles <= 10);

  const cargarCorrelativos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await faregasCertificadosApi.obtenerCorrelativos(plantaKey, tipo);
      setRangos(response.data || response || []);
    } catch (err: unknown) {
      setError(mensajeError(err, 'Error al cargar correlativos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let vigente = true;
    Promise.all([
      faregasSeriesApi.listarSedes(),
      faregasCertificadosApi.obtenerTipos()
    ]).then(([resSedes, resTipos]) => {
      if (!vigente) return;
      setSedes(resSedes || []);
      setTipos(resTipos.data || resTipos || []);
      if (resSedes?.length) setPlantaKey(resSedes[0].key);
    }).catch(() => {
      if (vigente) setError('Error al cargar datos base');
    });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    let vigente = true;
    faregasCertificadosApi.obtenerCorrelativos(plantaKey, tipo).then((response) => {
      if (!vigente) return;
      setRangos(response.data || response || []);
      setError('');
      setLoading(false);
    }).catch((err: unknown) => {
      if (!vigente) return;
      setError(mensajeError(err, 'Error al cargar correlativos'));
      setLoading(false);
    });
    return () => { vigente = false; };
  }, [plantaKey, tipo]);

  const guardarRango = async () => {
    if (formRango.nroMaximo < formRango.nroInicio) {
      alert('El número final no puede ser menor al inicial');
      return;
    }
    if (!formRango.plantaKey || !formRango.tipoCertificadoClave) {
      alert('Faltan campos obligatorios');
      return;
    }
    try {
      setModalSaving(true);
      if (rangoEditando) {
        await faregasCertificadosApi.actualizarRangoCorrelativo(rangoEditando.id, {
          nroInicio: formRango.nroInicio,
          nroMaximo: formRango.nroMaximo
        });
      } else {
        await faregasCertificadosApi.crearRangoCorrelativo(formRango);
      }
      setModal(false);
      setRangoEditando(null);
      void cargarCorrelativos();
    } catch (err: unknown) {
      alert(mensajeError(err, 'Error al guardar rango'));
    } finally {
      setModalSaving(false);
    }
  };

  const abrirNuevoRango = () => {
    setRangoEditando(null);
    setFormRango({
      plantaKey: plantaKey || (sedes[0]?.key || ''),
      tipoCertificadoClave: tipo || (tipos[0]?.clave || ''),
      nroInicio: 1,
      nroMaximo: 100
    });
    setModal(true);
  };

  const abrirEditarRango = (rango: CorrelativoRango) => {
    setRangoEditando(rango);
    setFormRango({
      plantaKey: rango.plantaKey,
      tipoCertificadoClave: rango.tipoClave,
      nroInicio: rango.nroInicio,
      nroMaximo: rango.nroMaximo
    });
    setModal(true);
  };

  const cerrarModal = () => {
    if (modalSaving) return;
    setModal(false);
    setRangoEditando(null);
  };

  const cerrarRango = async (id: number, activo: boolean) => {
    if (!activo) return;
    if (!confirm('¿Deseas cerrar este rango activo de forma manual? Los números restantes se perderán.')) return;
    try {
      await faregasCertificadosApi.cerrarRangoCorrelativo(id);
      void cargarCorrelativos();
    } catch (err: unknown) {
      alert(mensajeError(err, 'Error al cerrar rango'));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Rangos de certificados por sede y modalidad.</strong> Cada rango se asigna a una combinación exacta, por ejemplo Independencia + GNV Inicial. La primera previsualización reserva un correlativo real y la emisión reutiliza ese mismo número.
      </div>

      {rangosAgotados.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <strong>Atención: {rangosAgotados.length === 1 ? 'hay un rango agotado' : `hay ${rangosAgotados.length} rangos agotados`}.</strong>{' '}
          Ya no se podrán reservar nuevos certificados para {rangosAgotados.map((r) => `${r.plantaNombre} / ${r.tipoNombre}`).join(', ')}. Usa <strong>Editar</strong> para ampliar el número final o cierra el rango y asigna uno nuevo.
        </div>
      )}

      {rangosPorAgotarse.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <strong>Correlativos próximos a agotarse:</strong>{' '}
          {rangosPorAgotarse.map((r) => `${r.plantaNombre} / ${r.tipoNombre} (${r.disponibles} disponibles)`).join(', ')}.
        </div>
      )}
      
      <div className="flex flex-col gap-3 md:flex-row md:items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="min-w-64">
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Filtrar Sede</label>
          <select value={plantaKey} onChange={(e) => setPlantaKey(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-[#052A79] focus:outline-none">
            <option value="">Todas las Sedes</option>
            {sedes.map((item) => <option key={item.key} value={item.key}>{item.nombre}</option>)}
          </select>
        </div>
        <div className="min-w-64">
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Filtrar Tipo Certificado</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-[#052A79] focus:outline-none">
            <option value="">Todos los Tipos</option>
            {tipos.map((item) => <option key={item.clave} value={item.clave}>{item.nombre} — DG-{item.codigo}</option>)}
          </select>
        </div>
        <div className="flex-1"></div>
        <button onClick={abrirNuevoRango} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-800">
          + ASIGNAR NUEVO RANGO
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-bold uppercase">Sede</th>
                <th className="p-3 font-bold uppercase">Certificado / prefijo</th>
                <th className="p-3 font-bold uppercase text-center">Rango Asignado</th>
                <th className="p-3 font-bold uppercase text-center">N° Actual</th>
                <th className="p-3 font-bold uppercase text-center">Disponibles</th>
                <th className="p-3 font-bold uppercase text-center">Estado</th>
                <th className="p-3 font-bold uppercase text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Cargando correlativos...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="p-8 text-center text-red-500">{error}</td></tr>
              ) : rangos.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No hay rangos de correlativos registrados para los filtros seleccionados.</td></tr>
              ) : (
                rangos.map((r) => (
                  <tr key={r.id} className={`border-b border-slate-100 ${r.activo && r.agotado ? 'bg-red-50' : r.activo ? 'bg-white' : 'bg-slate-50 text-slate-400'}`}>
                    <td className="p-3 font-bold">{r.plantaNombre}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-700">{r.tipoNombre}</div>
                      <span className="mt-1 inline-block rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">DG-{r.tipoCodigo}</span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-[#052A79]">{r.nroInicio} - {r.nroMaximo}</td>
                    <td className="p-3 text-center font-mono font-bold">{r.nroActual}</td>
                    <td className={`p-3 text-center font-bold ${r.activo && r.disponibles <= 0 ? 'text-red-600' : r.activo && r.disponibles <= 10 ? 'text-amber-600' : ''}`}>{r.disponibles}</td>
                    <td className="p-3 text-center">
                      {r.activo && r.agotado ? (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700 border border-red-200">AGOTADO</span>
                      ) : r.activo ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700 border border-green-200">ACTIVO</span>
                      ) : (
                        <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600 border border-slate-300">CERRADO</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {r.activo && (
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => abrirEditarRango(r)} className="text-xs font-bold text-[#052A79] hover:underline">
                            EDITAR
                          </button>
                          <button onClick={() => cerrarRango(r.id, r.activo)} className="text-xs font-bold text-red-600 hover:underline">
                            CERRAR
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{rangoEditando ? 'Editar Rango' : 'Asignar Nuevo Rango'}</h2>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 text-amber-800 text-xs font-bold p-3 rounded-lg border border-amber-200 mb-2">
                {rangoEditando
                  ? 'Si el rango ya reservó correlativos, su número inicial queda protegido. Puedes ampliar o corregir el número final, pero nunca dejarlo por debajo del número actual.'
                  : 'Solo puede existir un rango activo por sede y modalidad. Si ya existe uno, ciérrelo antes. Tampoco se permiten rangos numéricos cruzados con otra sede que use el mismo prefijo.'}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Sede</label>
                <select disabled={Boolean(rangoEditando)} value={formRango.plantaKey} onChange={e => setFormRango({...formRango, plantaKey: e.target.value})} className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500">
                  <option value="">-- SELECCIONE SEDE --</option>
                  {sedes.filter(s => s.activo).map(s => <option key={s.key} value={s.key}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Tipo de Certificado</label>
                <select disabled={Boolean(rangoEditando)} value={formRango.tipoCertificadoClave} onChange={e => setFormRango({...formRango, tipoCertificadoClave: e.target.value})} className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500">
                  <option value="">-- SELECCIONE TIPO --</option>
                  {tipos.map(t => <option key={t.clave} value={t.clave}>{t.nombre} — DG-{t.codigo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Correlativo Inicial</label>
                  <input
                    type="number"
                    disabled={Boolean(rangoEditando && rangoEditando.nroActual >= rangoEditando.nroInicio)}
                    value={formRango.nroInicio}
                    onChange={e => setFormRango({...formRango, nroInicio: parseInt(e.target.value) || 0})}
                    className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold text-center text-lg text-[#052A79] focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Correlativo Final (Máx)</label>
                  <input type="number" value={formRango.nroMaximo} onChange={e => setFormRango({...formRango, nroMaximo: parseInt(e.target.value) || 0})} className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold text-center text-lg text-[#052A79] focus:border-[#052A79]" />
                </div>
              </div>
              {rangoEditando && (
                <p className="text-xs text-slate-500">
                  {rangoEditando.nroActual >= rangoEditando.nroInicio
                    ? `Este rango ya llegó al correlativo ${rangoEditando.nroActual}; por trazabilidad, el inicio no puede modificarse.`
                    : 'Este rango todavía no ha reservado correlativos, por lo que puedes modificar tanto el inicio como el final.'}
                </p>
              )}
            </div>
            <div className="border-t border-slate-100 p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button onClick={cerrarModal} className="rounded-lg border border-slate-300 bg-white px-5 py-2 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button disabled={modalSaving} onClick={guardarRango} className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                {modalSaving ? 'Guardando...' : rangoEditando ? 'Guardar Cambios' : 'Guardar Rango'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
