import { Edit, Lock, Plus, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { faregasSeriesApi } from '../../../services/faregas-series.api';
import {
  CANTIDAD_MAXIMA,
  faregasCorrelativosSedeApi,
} from '../../../services/faregas-correlativos-sede.api';
import type {
  EstadoMostrado,
  EstadoRangoSede,
  ProximoNumeroSede,
  RangoSede,
} from '../../../services/faregas-correlativos-sede.api';

/**
 * CONFIGURACIÓN → CORRELATIVOS: INVENTARIO DE RANGOS POR SEDE.
 *
 * Lo que refleja esta pantalla:
 *
 *  - La unidad es (sede, rango físico). NO hay filtro de tipo de certificado, no
 *    hay columna de operación, ni etiquetas de producto o modalidad. El rango
 *    recibido por la sede sirve para cualquier certificado que emita.
 *  - Un rango va de 1 a 50 números: `cantidad = hasta - desde + 1`.
 *  - Una sede tiene UN rango activo. Cuando se agota queda como historial y se
 *    asigna otro con "+ Asignar rango a sede". No hay acción para ampliar,
 *    reiniciar ni recargar un rango agotado.
 */

const ETIQUETA_ESTADO: Record<EstadoMostrado, { texto: string; clases: string }> = {
  ACTIVO: { texto: 'ACTIVO', clases: 'bg-green-100 text-green-700 border-green-200' },
  PENDIENTE: { texto: 'PENDIENTE', clases: 'bg-sky-100 text-sky-700 border-sky-200' },
  AGOTADO: { texto: 'AGOTADO', clases: 'bg-red-100 text-red-700 border-red-200' },
  CERRADO: { texto: 'CERRADO', clases: 'bg-slate-200 text-slate-600 border-slate-300' },
};

const FILTRO_ESTADO: { clave: 'TODOS' | EstadoRangoSede; etiqueta: string }[] = [
  { clave: 'TODOS', etiqueta: 'Todos' },
  { clave: 'ACTIVO', etiqueta: 'Activo' },
  { clave: 'AGOTADO', etiqueta: 'Agotado' },
  { clave: 'CERRADO', etiqueta: 'Cerrado' },
];

const mensajeError = (error: unknown, alternativo: string) =>
  error instanceof Error && error.message ? error.message : alternativo;

const soloFecha = (valor: string | null) => (valor ? String(valor).slice(0, 10) : '');

interface FormRango {
  plantaKey: string;
  desde: number;
  hasta: number;
  fecha: string;
  observacion: string;
}

const FORM_VACIO: FormRango = {
  plantaKey: '',
  desde: 1,
  hasta: CANTIDAD_MAXIMA,
  fecha: soloFecha(new Date().toISOString()),
  observacion: '',
};

/** Texto que exige el backend al bloquear la emisión. */
const SIN_CORRELATIVOS =
  'La sede no tiene correlativos disponibles. Asigne un nuevo rango de hasta 50 números.';

export default function TabCorrelativos() {
  const [sedes, setSedes] = useState<{ key: string; nombre: string; activo: boolean }[]>([]);
  const [plantaKey, setPlantaKey] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | EstadoRangoSede>('TODOS');

  const [rangos, setRangos] = useState<RangoSede[]>([]);
  const [proximo, setProximo] = useState<ProximoNumeroSede | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [rangoEditando, setRangoEditando] = useState<RangoSede | null>(null);
  const [form, setForm] = useState<FormRango>(FORM_VACIO);
  const [modalSaving, setModalSaving] = useState(false);
  const [sugerenciaCargando, setSugerenciaCargando] = useState(false);

  // Un rango que ya entregó certificados tiene el inicio congelado y el final no
  // puede bajar de lo entregado. `usados > 0` es exactamente "ya emitió".
  const rangoConConsumo = Boolean(rangoEditando && rangoEditando.usados > 0);

  const cantidad = form.hasta - form.desde + 1;
  const cantidadValida = Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= CANTIDAD_MAXIMA;

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [lista, resumen] = await Promise.all([
        faregasCorrelativosSedeApi.listar(plantaKey || null, estadoFiltro === 'TODOS' ? null : estadoFiltro),
        plantaKey ? faregasCorrelativosSedeApi.resumen(plantaKey) : Promise.resolve({ data: null }),
      ]);
      setRangos(lista.data || []);
      setProximo(resumen?.data?.siguiente ?? null);
    } catch (err: unknown) {
      setError(mensajeError(err, 'Error al cargar los rangos por sede'));
    } finally {
      setLoading(false);
    }
  }, [plantaKey, estadoFiltro]);

  useEffect(() => {
    let vigente = true;
    faregasSeriesApi.listarSedes().then((res) => {
      if (!vigente) return;
      setSedes(res || []);
      if (res?.length) setPlantaKey(res[0].key);
    }).catch(() => {
      if (vigente) setError('Error al cargar las sedes');
    });
    return () => { vigente = false; };
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const abrirAsignar = async (sedeKey?: string) => {
    const destino = sedeKey || plantaKey || FORM_VACIO.plantaKey;
    setRangoEditando(null);
    try {
      setSugerenciaCargando(true);
      const sugerencia = await faregasCorrelativosSedeApi.sugerir(destino || null);
      setForm({
        ...FORM_VACIO,
        plantaKey: destino,
        desde: sugerencia.data.rango_inicio,
        hasta: sugerencia.data.rango_fin,
        fecha: soloFecha(new Date().toISOString())
      });
      setModal(true);
    } catch (err: unknown) {
      await Swal.fire('No se pudo buscar un rango libre', mensajeError(err, 'Error'), 'error');
    } finally {
      setSugerenciaCargando(false);
    }
  };

  const abrirEditar = (rango: RangoSede) => {
    setRangoEditando(rango);
    setForm({
      plantaKey: rango.planta_key,
      desde: rango.rango_inicio,
      hasta: rango.rango_fin,
      fecha: soloFecha(rango.fecha_asignacion),
      observacion: rango.observacion || ''
    });
    setModal(true);
  };

  const cerrarModal = () => {
    if (modalSaving) return;
    setModal(false);
    setRangoEditando(null);
  };

  const usarRangoSugerido = async () => {
    try {
      setSugerenciaCargando(true);
      const sugerencia = await faregasCorrelativosSedeApi.sugerir(form.plantaKey || null);
      setForm((actual) => ({
        ...actual,
        desde: sugerencia.data.rango_inicio,
        hasta: sugerencia.data.rango_fin
      }));
      await Swal.fire(
        'Rango libre sugerido',
        `${sugerencia.data.rango_inicio} - ${sugerencia.data.rango_fin} `
          + `(${sugerencia.data.cantidad} números). Es una sugerencia: vale el que escribas, siempre que no se solape.`,
        'info'
      );
    } catch (err: unknown) {
      await Swal.fire('No se pudo sugerir un rango', mensajeError(err, 'Error'), 'error');
    } finally {
      setSugerenciaCargando(false);
    }
  };

  const guardar = async () => {
    if (!form.plantaKey) {
      await Swal.fire('Falta la sede', 'La sede es obligatoria.', 'warning');
      return;
    }
    if (!Number.isInteger(form.desde) || form.desde < 1) {
      await Swal.fire('Rango inválido', 'El número inicial (desde) debe ser un entero mayor que cero.', 'warning');
      return;
    }
    if (form.hasta < form.desde) {
      await Swal.fire('Rango inválido', 'El número final (hasta) no puede ser menor al inicial.', 'warning');
      return;
    }
    if (!cantidadValida) {
      await Swal.fire(
        'Rango inválido',
        `El rango debe tener entre 1 y ${CANTIDAD_MAXIMA} números (hasta - desde + 1). `
          + `Este tiene ${cantidad}.`,
        'warning'
      );
      return;
    }
    try {
      setModalSaving(true);
      const cuerpo = {
        rangoInicio: form.desde,
        rangoFin: form.hasta,
        fechaAsignacion: form.fecha || null,
        observacion: form.observacion || null
      };
      if (rangoEditando) {
        await faregasCorrelativosSedeApi.editar(rangoEditando.id, cuerpo);
      } else {
        await faregasCorrelativosSedeApi.agregar({ ...cuerpo, plantaKey: form.plantaKey });
      }
      setModal(false);
      setRangoEditando(null);
      void cargar();
      await Swal.fire(
        'Rango asignado',
        `${form.desde} - ${form.hasta} (${cantidad} números). `
          + 'Toda la sede consumirá de este rango.',
        'success'
      );
    } catch (err: unknown) {
      await Swal.fire('No se pudo guardar', mensajeError(err, 'Error al guardar el rango'), 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const cerrarRango = async (rango: RangoSede) => {
    const confirmacion = await Swal.fire({
      title: 'Cerrar rango de la sede',
      text: `El rango ${rango.rango_inicio} - ${rango.rango_fin} queda como historial y sus `
        + `${rango.disponibles} números restantes no se reutilizarán. `
        + 'Para seguir operando, asigna un rango nuevo a la sede.',
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
      await faregasCorrelativosSedeApi.cerrar(rango.id);
      void cargar();
      await Swal.fire('Rango cerrado', 'Quedó como historial y ya no se reutiliza.', 'success');
    } catch (err: unknown) {
      await Swal.fire('No se pudo cerrar', mensajeError(err, 'Error al cerrar el rango'), 'error');
    }
  };

  const sinInventario = Boolean(plantaKey) && proximo !== null && proximo.disponible === false;
  const agotados = rangos.filter((r) => r.estado === 'AGOTADO');
  const porAgotarse = rangos.filter((r) => r.estado === 'ACTIVO' && r.vigente && r.disponibles <= 5);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Inventario de rangos por sede.</strong> Cada rango que recibe la sede sirve para
        cualquier certificado que emita, sin importar el producto, la operación, el tipo ni la
        modalidad. Un rango va de 1 a {CANTIDAD_MAXIMA} números y la sede tiene uno solo activo:
        cuando se agota queda como historial y se le asigna otro. La previsualización no consume
        correlativos; el número definitivo se asigna al emitir.
      </div>

      {sinInventario && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {proximo?.motivo || SIN_CORRELATIVOS}
        </div>
      )}

      {agotados.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>{agotados.length === 1 ? 'Hay un rango agotado' : `Hay ${agotados.length} rangos agotados`}:</strong>{' '}
          {agotados.map((r) => `${r.planta_nombre || r.planta_key} (${r.rango_inicio} - ${r.rango_fin})`).join(', ')}.
          Un agotado no se amplía ni se reinicia: asigna un rango nuevo a la sede.
        </div>
      )}

      {porAgotarse.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Rangos próximos a agotarse:</strong>{' '}
          {porAgotarse.map((r) => `${r.planta_nombre || r.planta_key} (${r.disponibles} disponibles)`).join(', ')}.
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="min-w-64">
          <label className="mb-1 block text-xs font-bold text-slate-500">Sede</label>
          <select
            value={plantaKey}
            onChange={(e) => setPlantaKey(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-[#052A79] focus:outline-none"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((item) => <option key={item.key} value={item.key}>{item.nombre}</option>)}
          </select>
        </div>
        <div className="min-w-48">
          <label className="mb-1 block text-xs font-bold text-slate-500">Estado</label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as 'TODOS' | EstadoRangoSede)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-[#052A79] focus:outline-none"
          >
            {FILTRO_ESTADO.map((item) => (
              <option key={item.clave} value={item.clave}>{item.etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => { void abrirAsignar(); }}
          disabled={sugerenciaCargando}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          <Plus size={16} /> {sugerenciaCargando ? 'Buscando rango libre...' : 'Asignar rango a sede'}
        </button>
      </div>

      {proximo?.disponible && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          Próxima emisión de la sede seleccionada: <strong className="font-mono">{proximo.nro}</strong>
          {' '}tomado del rango {proximo.rango_inicio} - {proximo.rango_fin}.
          Esta vista no reserva el número.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3 font-bold">Sede</th>
                <th className="p-3 font-bold">Fecha</th>
                <th className="p-3 text-center font-bold">Desde - Hasta</th>
                <th className="p-3 text-center font-bold">Número actual</th>
                <th className="p-3 text-center font-bold">Cantidad</th>
                <th className="p-3 text-center font-bold">Disponibles</th>
                <th className="p-3 text-center font-bold">Estado</th>
                <th className="p-3 font-bold">Observación</th>
                <th className="p-3 text-center font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-500">Cargando rangos...</td></tr>
              ) : error ? (
                <tr><td colSpan={9} className="p-8 text-center text-red-500">{error}</td></tr>
              ) : rangos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Esta sede todavía no tiene rangos asignados. Usa “+ Asignar rango a sede”.
                  </td>
                </tr>
              ) : (
                rangos.map((r) => {
                  const etiqueta = ETIQUETA_ESTADO[r.estadoMostrado];
                  const fondo = r.estado === 'AGOTADO' ? 'bg-red-50'
                    : r.estado === 'CERRADO' ? 'bg-slate-50 text-slate-500'
                      : r.estadoMostrado === 'PENDIENTE' ? 'bg-sky-50' : 'bg-white';
                  return (
                    <tr key={r.id} className={`border-b border-slate-100 ${fondo}`}>
                      <td className="p-3 font-bold">{r.planta_nombre || r.planta_key}</td>
                      <td className="p-3 text-xs text-slate-600">
                        {soloFecha(r.fecha_asignacion)}
                        {r.fecha_cierre && (
                          <span className="block text-slate-400">cerrado {soloFecha(r.fecha_cierre)}</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#052A79]">
                        {r.rango_inicio} - {r.rango_fin}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">{r.numero_actual}</td>
                      <td className="p-3 text-center">{r.cantidad}</td>
                      <td className={`p-3 text-center font-bold ${r.disponibles <= 0 ? 'text-red-600'
                        : r.disponibles <= 5 ? 'text-amber-600' : ''}`}>
                        {r.disponibles}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`rounded border px-2 py-1 text-xs font-bold ${etiqueta.clases}`}>
                          {etiqueta.texto}
                        </span>
                      </td>
                      <td className="max-w-56 p-3 text-xs text-slate-600">{r.observacion || '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          {r.estado !== 'CERRADO' && (
                            <button
                              onClick={() => abrirEditar(r)}
                              title="Editar rango"
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-blue-100"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {r.estado === 'ACTIVO' && (
                            <button
                              onClick={() => cerrarRango(r)}
                              title="Cerrar rango"
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-red-100"
                            >
                              <Lock size={18} />
                            </button>
                          )}
                          {r.estado === 'AGOTADO' && (
                            <button
                              onClick={() => { void abrirAsignar(r.planta_key); }}
                              title="Asignar rango nuevo a la sede"
                              className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-[#052A79] transition-colors hover:bg-blue-100"
                            >
                              <Plus size={14} /> Asignar rango
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-800">
                {rangoEditando ? 'Editar rango de la sede' : 'Asignar rango a sede'}
              </h2>
              <button onClick={cerrarModal} className="text-xl font-bold text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="space-y-4 p-6">
              <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
                {rangoConConsumo
                  ? `Este rango ya entregó ${rangoEditando?.usados} certificado(s): el inicio no puede cambiar `
                    + `y el final no puede quedar por debajo de ${rangoEditando?.numero_actual}.`
                  : `El rango se registra sólo en la sede y vale de 1 a ${CANTIDAD_MAXIMA} números. `
                    + 'Sirve para cualquier certificado que la sede emita y no puede solaparse con otro rango '
                    + 'de cualquier sede.'}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Sede</label>
                <select
                  disabled={Boolean(rangoEditando)}
                  value={form.plantaKey}
                  onChange={(e) => setForm({ ...form, plantaKey: e.target.value })}
                  className="w-full rounded-lg border-2 border-slate-200 p-2 font-bold focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">-- SELECCIONE SEDE --</option>
                  {sedes.filter((s) => s.activo).map((s) => (
                    <option key={s.key} value={s.key}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Desde</label>
                  <input
                    type="number"
                    disabled={rangoConConsumo}
                    value={form.desde}
                    onChange={(e) => setForm({ ...form, desde: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-lg border-2 border-slate-200 p-2 text-center text-lg font-bold text-[#052A79] focus:border-[#052A79] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Hasta</label>
                  <input
                    type="number"
                    min={form.desde}
                    max={form.desde + CANTIDAD_MAXIMA - 1}
                    value={form.hasta}
                    onChange={(e) => setForm({ ...form, hasta: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-lg border-2 border-slate-200 p-2 text-center text-lg font-bold text-[#052A79] focus:border-[#052A79]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full rounded-lg border-2 border-slate-200 p-2 text-sm focus:border-[#052A79]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Una fecha futura deja el rango pendiente: existe en el inventario pero no se consume.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Observación</label>
                <textarea
                  rows={2}
                  value={form.observacion}
                  onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  placeholder="Ej. Bloque entregado por el proveedor, documento de entrega..."
                  className="w-full rounded-lg border-2 border-slate-200 p-2 text-sm focus:border-[#052A79]"
                />
              </div>

              <div className={`rounded-lg border p-3 ${cantidadValida ? 'border-slate-200 bg-slate-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500">
                      {rangoEditando ? 'Número actual (consumo real)' : 'Número actual (se arma al emitir)'}
                    </label>
                    <p className="text-2xl font-black text-[#052A79]">
                      {rangoEditando ? rangoEditando.numero_actual : form.desde - 1}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Cantidad: <b>{cantidad}</b> números</p>
                    <p className={cantidadValida ? 'text-emerald-600' : 'font-bold text-red-600'}>
                      {cantidadValida ? `Máximo ${CANTIDAD_MAXIMA}` : `Debe ser entre 1 y ${CANTIDAD_MAXIMA}`}
                    </p>
                    <p className="text-slate-400">cantidad = hasta - desde + 1</p>
                  </div>
                </div>
              </div>

              {!rangoConConsumo && (
                <button
                  type="button"
                  disabled={sugerenciaCargando}
                  onClick={usarRangoSugerido}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#052A79] bg-white px-4 py-2 text-xs font-bold text-[#052A79] hover:bg-blue-50 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  {sugerenciaCargando ? 'Buscando bloque libre...' : 'USAR RANGO LIBRE SUGERIDO'}
                </button>
              )}
            </div>
            <div className="flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 p-6">
              <button onClick={cerrarModal} className="rounded-lg border border-slate-300 bg-white px-5 py-2 font-bold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                disabled={modalSaving || !cantidadValida}
                onClick={guardar}
                className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {modalSaving ? 'Guardando...' : rangoEditando ? 'Guardar cambios' : 'Asignar rango'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
