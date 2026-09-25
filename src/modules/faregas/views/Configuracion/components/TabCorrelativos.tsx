import { Edit, Lock, History, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../services/faregas-certificados.api';
import { faregasSeriesApi } from '../../../services/faregas-series.api';

const TAMANO_RANGO = 100;

interface CorrelativoHistorial {
  id: number;
  nroInicio: number;
  nroActual: number;
  nroMaximo: number;
  activo: boolean;
  disponibles: number;
  fechaAsignacion: string;
  fechaCierre: string | null;
}

interface CorrelativoOperacion {
  servicioId: number;
  servicioCodigo: string;
  servicioNombre: string;
  plantaKey: string;
  plantaNombre: string;
  tipoCertificadoClave: string;
  modalidad: 'INICIAL' | 'ANUAL' | 'UNICA';
  tipoNumeracionNombre: string;
  prefijo: string;
  rangoId: number | null;
  nroInicio: number | null;
  nroActual: number | null;
  nroMaximo: number | null;
  disponibles: number | null;
  compartido: boolean;
  historial: CorrelativoHistorial[];
  estado: 'ACTIVO' | 'PROXIMO_A_AGOTARSE' | 'AGOTADO' | 'SIN_RANGO' | 'HISTORICO';
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
  
  const [rangos, setRangos] = useState<CorrelativoOperacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [modal, setModal] = useState<boolean>(false);
  const [rangoEditando, setRangoEditando] = useState<CorrelativoOperacion | null>(null);
  const [formRango, setFormRango] = useState({ plantaKey: '', tipoCertificadoClave: '', nroInicio: 1, nroMaximo: 100 });
  const [modalSaving, setModalSaving] = useState(false);
  const [sugerenciaCargando, setSugerenciaCargando] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState<CorrelativoOperacion | null>(null);

  const rangosAgotados = rangos.filter((r) => r.estado === 'AGOTADO');
  const rangosPorAgotarse = rangos.filter((r) => r.estado === 'PROXIMO_A_AGOTARSE');

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

  const rangoUsado = Boolean(
    rangoEditando && rangoEditando.nroActual != null && rangoEditando.nroInicio != null
    && rangoEditando.nroActual >= rangoEditando.nroInicio
  );

  const guardarRango = async () => {
    if (formRango.nroMaximo - formRango.nroInicio + 1 !== TAMANO_RANGO) {
      await Swal.fire('Rango inválido', `El rango debe tener exactamente ${TAMANO_RANGO} números: final = inicial + ${TAMANO_RANGO - 1}.`, 'warning');
      return;
    }
    if (formRango.nroMaximo < formRango.nroInicio) {
      await Swal.fire('Rango inválido', 'El número final no puede ser menor al inicial.', 'warning');
      return;
    }
    if (!formRango.plantaKey || !formRango.tipoCertificadoClave) {
      await Swal.fire('Faltan campos obligatorios', 'La sede y el tipo de certificado son obligatorios.', 'warning');
      return;
    }
    try {
      setModalSaving(true);
      if (rangoEditando && rangoEditando.rangoId) {
        await faregasCertificadosApi.actualizarRangoCorrelativo(rangoEditando.rangoId, {
          nroInicio: formRango.nroInicio,
          nroMaximo: formRango.nroMaximo
        });
      } else {
        await faregasCertificadosApi.crearRangoCorrelativo(formRango);
      }
      setModal(false);
      setRangoEditando(null);
      void cargarCorrelativos();
      await Swal.fire('Rango guardado', 'El rango de 100 números quedó activo.', 'success');
    } catch (err: unknown) {
      await Swal.fire('No se pudo guardar', mensajeError(err, 'Error al guardar rango'), 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const usarSiguienteRangoDisponible = async () => {
    try {
      setSugerenciaCargando(true);
      const sugerencia = await faregasCertificadosApi.sugerirSiguienteRangoCorrelativo({
        tipo: formRango.tipoCertificadoClave.split('_')[0] === 'GLP' || formRango.tipoCertificadoClave.split('_')[0] === 'GNV'
          ? `${formRango.tipoCertificadoClave.split('_')[0]}_ANUAL`
          : formRango.tipoCertificadoClave,
        plantaKey: formRango.plantaKey,
        modalidad: formRango.tipoCertificadoClave.includes('_')
          ? formRango.tipoCertificadoClave.split('_')[1]
          : 'UNICA',
        ignorarRangoId: rangoEditando?.rangoId ?? null
      });
      setFormRango({
        ...formRango,
        nroInicio: sugerencia.nroInicio,
        nroMaximo: sugerencia.nroMaximo
      });
      await Swal.fire(
        'Siguiente rango disponible',
        `${sugerencia.nroInicio} - ${sugerencia.nroMaximo} (${sugerencia.tamano} números libres, sin cruces ni números ya emitidos)`,
        'info'
      );
    } catch (err: unknown) {
      await Swal.fire('No se pudo sugerir un rango', mensajeError(err, 'Error'), 'error');
    } finally {
      setSugerenciaCargando(false);
    }
  };

  const abrirAsignarRango = (op: CorrelativoOperacion) => {
    setRangoEditando(null);
    setFormRango({
      plantaKey: op.plantaKey,
      tipoCertificadoClave: op.tipoCertificadoClave,
      nroInicio: 1,
      nroMaximo: 100
    });
    setModal(true);
  };

  const abrirEditarRango = (op: CorrelativoOperacion) => {
    setRangoEditando(op);
    setFormRango({
      plantaKey: op.plantaKey,
      tipoCertificadoClave: op.tipoCertificadoClave,
      nroInicio: op.nroInicio || 1,
      nroMaximo: op.nroMaximo || 100
    });
    setModal(true);
  };

  const cerrarModal = () => {
    if (modalSaving) return;
    setModal(false);
    setRangoEditando(null);
  };

  const cerrarRango = async (id: number) => {
    const confirmacion = await Swal.fire({
      title: 'Cerrar rango de correlativos',
      text: 'El rango queda como histórico y los números restantes no se reutilizarán. Podrás asignar un rango nuevo de 100 números.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'CERRAR RANGO',
      cancelButtonText: 'CANCELAR',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      focusCancel: true
    });
    if (!confirmacion.isConfirmed) return;
    try {
      await faregasCertificadosApi.cerrarRangoCorrelativo(id);
      void cargarCorrelativos();
      await Swal.fire('Rango cerrado', 'Quedó como histórico y ya no se reutiliza.', 'success');
    } catch (err: unknown) {
      await Swal.fire('No se pudo cerrar', mensajeError(err, 'Error al cerrar rango'), 'error');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Rangos de certificados por sede y operación.</strong> Cada rango se asigna a una combinación exacta, por ejemplo Independencia + GNV Inicial. La previsualización no consume correlativos; el número definitivo se asigna al emitir.
      </div>

      {rangosAgotados.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <strong>Atención: {rangosAgotados.length === 1 ? 'hay una operación con rango agotado' : `hay ${rangosAgotados.length} operaciones con rango agotado`}.</strong>{' '}
          Ya no se podrán emitir nuevos certificados para {rangosAgotados.map((r) => `${r.plantaNombre} / ${r.servicioNombre}`).join(', ')}. Usa <strong>Asignar nuevo rango</strong> para continuar operando.
        </div>
      )}

      {rangosPorAgotarse.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <strong>Correlativos próximos a agotarse:</strong>{' '}
          {rangosPorAgotarse.map((r) => `${r.plantaNombre} / ${r.servicioNombre} (${r.disponibles} disponibles)`).join(', ')}.
        </div>
      )}
      
      <div className="flex flex-col gap-3 md:flex-row md:items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="min-w-64">
          <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Filtrar Sede</label>
          <select value={plantaKey} onChange={(e) => setPlantaKey(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-[#052A79] focus:outline-none">
            <option value="">Todas las Sedes</option>
            {sedes.map((item) => <option key={item.key} value={item.key}>{item.nombre}</option>)}
          </select>
        </div>
        <div className="min-w-64">
          <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Filtrar Tipo Certificado</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-[#052A79] focus:outline-none">
            <option value="">Todos los Tipos</option>
            {tipos.map((item) => <option key={item.clave} value={item.clave}>{item.nombre} — DG-{item.codigo}</option>)}
          </select>
        </div>
        <div className="flex-1"></div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-bold capitalize">Sede</th>
                <th className="p-3 font-bold capitalize">Operación / Certificado</th>
                <th className="p-3 font-bold capitalize text-center">Rango Asignado</th>
                <th className="p-3 font-bold capitalize text-center">N° Actual</th>
                <th className="p-3 font-bold capitalize text-center">Disponibles</th>
                <th className="p-3 font-bold capitalize text-center">Estado</th>
                <th className="p-3 font-bold capitalize text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Cargando correlativos...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="p-8 text-center text-red-500">{error}</td></tr>
              ) : rangos.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No hay operaciones de certificados para los filtros seleccionados.</td></tr>
              ) : (
                rangos.map((r) => (
                  <tr key={`${r.plantaKey}-${r.servicioId}`} className={`border-b border-slate-100 ${r.estado === 'AGOTADO' ? 'bg-red-50' : r.rangoId ? 'bg-white' : 'bg-slate-50 text-slate-400'}`}>
                    <td className="p-3 font-bold">{r.plantaNombre}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-700">{r.servicioNombre}</div>
                        {r.compartido && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700" title="Comparte numeración con otras operaciones">COMPARTIDO</span>}
                      </div>
                      <span className="mt-1 inline-block rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">{r.tipoNumeracionNombre} — {r.prefijo}</span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-[#052A79]">
                      {r.nroInicio ? `${r.nroInicio} - ${r.nroMaximo}` : '-'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">{r.nroActual ?? '-'}</td>
                    <td className={`p-3 text-center font-bold ${r.disponibles != null && r.disponibles <= 0 ? 'text-red-600' : r.disponibles != null && r.disponibles <= 10 ? 'text-amber-600' : ''}`}>{r.disponibles ?? '-'}</td>
                    <td className="p-3 text-center">
                      {r.estado === 'AGOTADO' ? (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700 border border-red-200">AGOTADO</span>
                      ) : r.estado === 'SIN_RANGO' ? (
                        <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600 border border-slate-300">SIN RANGO</span>
                      ) : r.estado === 'HISTORICO' ? (
                        <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600 border border-slate-300">HISTÓRICO</span>
                      ) : (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700 border border-green-200">ACTIVO</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        {r.estado === 'SIN_RANGO' || r.estado === 'AGOTADO' || r.estado === 'HISTORICO' ? (
                          <button onClick={() => abrirAsignarRango(r)} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-[#052A79] hover:bg-blue-100 transition-colors">
                            Asignar rango
                          </button>
                        ) : (
                          <>
                            <button onClick={() => abrirEditarRango(r)} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 transition-colors">
                              <Edit size={18} />
                            </button>
                            {r.rangoId && (
                              <button onClick={() => cerrarRango(r.rangoId!)} title="Cerrar rango" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] hover:bg-red-100 transition-colors">
                                <Lock size={18} />
                              </button>
                            )}
                          </>
                        )}
                        {r.historial && r.historial.length > 0 && (
                          <button onClick={() => setHistorialAbierto(r)} title="Ver Historial" className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 transition-colors">
                            <History size={18} />
                          </button>
                        )}
                      </div>
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
                {rangoEditando && rangoEditando.rangoId && rangoEditando.nroActual != null && rangoEditando.nroInicio != null && rangoEditando.nroActual >= rangoEditando.nroInicio
                  ? 'Si el rango ya asignó correlativos, su número inicial queda protegido. Puedes ampliar o corregir el número final, pero nunca dejarlo por debajo del número actual.'
                  : 'Solo puede existir un rango activo por sede y modalidad. Si ya existe uno, ciérrelo antes. Tampoco se permiten rangos numéricos cruzados con otra sede que use el mismo prefijo.'}
              </div>
              
              {(rangoEditando?.compartido || (!rangoEditando && rangos.find(r => r.plantaKey === formRango.plantaKey && r.tipoCertificadoClave === formRango.tipoCertificadoClave)?.compartido)) && (
                <div className="bg-blue-50 text-blue-800 text-xs font-bold p-3 rounded-lg border border-blue-200 mb-2">
                  Atención: Este rango técnico es compartido por varias operaciones en esta sede.
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Sede</label>
                <select disabled={true} value={formRango.plantaKey} className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500">
                  <option value="">-- SELECCIONE SEDE --</option>
                  {sedes.filter(s => s.activo).map(s => <option key={s.key} value={s.key}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Tipo de Certificado</label>
                <select disabled={true} value={formRango.tipoCertificadoClave} className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500">
                  <option value="">-- SELECCIONE TIPO --</option>
                  {tipos.map(t => <option key={t.clave} value={t.clave}>{t.nombre} — DG-{t.codigo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Correlativo Inicial</label>
                  <input
                    type="number"
                    disabled={rangoUsado}
                    value={formRango.nroInicio}
                    onChange={e => {
                      const nroInicio = parseInt(e.target.value) || 0;
                      setFormRango({ ...formRango, nroInicio, nroMaximo: nroInicio + TAMANO_RANGO - 1 });
                    }}
                    className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold text-center text-lg text-[#052A79] focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Correlativo Final (Máx)</label>
                  <input
                    type="number"
                    disabled={rangoUsado}
                    value={formRango.nroMaximo}
                    onChange={e => setFormRango({ ...formRango, nroMaximo: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold text-center text-lg text-[#052A79] focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500">N° Actual (solo lectura)</label>
                    <p className="text-2xl font-black text-[#052A79]">
                      {rangoEditando?.nroActual ?? formRango.nroInicio - 1}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Total: <b>{formRango.nroMaximo - formRango.nroInicio + 1}</b> números</p>
                    <p className={formRango.nroMaximo - formRango.nroInicio + 1 === TAMANO_RANGO ? 'text-emerald-600' : 'font-bold text-red-600'}>
                      {formRango.nroMaximo - formRango.nroInicio + 1 === TAMANO_RANGO ? 'Tamaño correcto' : `Debe ser ${TAMANO_RANGO}`}
                    </p>
                  </div>
                </div>
              </div>

              {!rangoUsado && (
                <button
                  type="button"
                  disabled={sugerenciaCargando}
                  onClick={usarSiguienteRangoDisponible}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#052A79] bg-white px-4 py-2 text-xs font-bold text-[#052A79] hover:bg-blue-50 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  {sugerenciaCargando ? 'Buscando bloque libre...' : 'USAR SIGUIENTE RANGO DISPONIBLE'}
                </button>
              )}

              {rangoEditando && (
                <p className="text-xs text-slate-500">
                  {rangoEditando.nroActual != null && rangoEditando.nroInicio != null && rangoEditando.nroActual >= rangoEditando.nroInicio
                    ? `Este rango ya llegó al correlativo ${rangoEditando.nroActual}; por trazabilidad, el inicio no puede modificarse.`
                    : 'Este rango todavía no ha asignado correlativos, por lo que puedes modificar tanto el inicio como el final.'}
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

      {historialAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Historial de Rangos: {historialAbierto.servicioNombre}</h2>
              <button onClick={() => setHistorialAbierto(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6">
              <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2 font-bold capitalize">Rango</th>
                      <th className="p-2 font-bold capitalize text-center">N° Actual</th>
                      <th className="p-2 font-bold capitalize text-center">Estado</th>
                      <th className="p-2 font-bold capitalize text-center">Cierre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialAbierto.historial.map((h) => (
                      <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-mono">{h.nroInicio} - {h.nroMaximo}</td>
                        <td className="p-2 text-center font-mono">{h.nroActual}</td>
                        <td className="p-2 text-center">
                          {h.activo ? (
                             <span className="text-xs font-bold text-green-600">Vigente</span>
                          ) : (
                             <span className="text-xs font-bold text-slate-500">Cerrado</span>
                          )}
                        </td>
                        <td className="p-2 text-center text-xs text-slate-500">
                          {h.fechaCierre ? new Date(h.fechaCierre).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
