import { Building2, Edit, Info, ListOrdered, Power, PowerOff, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  faregasSeriesApi,
  type SerieMaestro,
  type SerieSede,
  type TipoComprobanteFaregas
} from '../../../services/faregas-series.api';
import { exportarSeriesMaestro } from '../../../utils/faregas-series-exportacion';

const TIPOS_COMPROBANTE: Array<{ value: TipoComprobanteFaregas; label: string }> = [
  { value: 'FACTURA', label: 'Factura' },
  { value: 'BOLETA', label: 'Boleta' },
  { value: 'NOTA_CREDITO_FACTURA', label: 'Nota de Crédito (Factura)' },
  { value: 'NOTA_CREDITO_BOLETA', label: 'Nota de Crédito (Boleta)' },
  { value: 'NOTA_DEBITO_FACTURA', label: 'Nota de Débito (Factura)' },
  { value: 'NOTA_DEBITO_BOLETA', label: 'Nota de Débito (Boleta)' }
];

const etiquetaTipo = (tipo: string) =>
  TIPOS_COMPROBANTE.find((item) => item.value === tipo)?.label || tipo;

/** Origen de la fila. Clasifica qué acciones tiene sentido ofrecer. */
type OrigenSerie = 'NUBEFACT/DEMO' | 'NUBEFACT/PRODUCCION' | 'DMS/LEGACY' | 'LEGACY/FARENET';

const ESTILO_ORIGEN: Record<OrigenSerie, string> = {
  'NUBEFACT/DEMO': 'bg-green-100 text-green-700',
  'NUBEFACT/PRODUCCION': 'bg-purple-100 text-purple-700',
  'DMS/LEGACY': 'bg-blue-100 text-blue-700',
  'LEGACY/FARENET': 'bg-slate-100 text-slate-600'
};

type EstadoModal =
  | { modo: 'CREAR_NUBEFACT' }
  | { modo: 'EDITAR_NUBEFACT'; serie: SerieMaestro }
  | { modo: 'DETALLE_DMS'; serie: SerieMaestro }
  | null;

const mensajeError = (error: unknown, defecto: string) =>
  (error instanceof Error ? error.message : defecto) || defecto;

/**
 * SERIES — una sola pantalla y una sola tabla.
 *
 * Todas las filas salen de `fg_serie_comprobante` y se muestran con su serie
 * REAL, sin sustituirla por la de `seriedocumentobase`. Eso es lo que evita
 * los duplicados falsos (varias filas LEGACY que se pintaban como FE02, BE02,
 * BC02...). La columna Origen dice de qué conjunto es cada fila:
 *
 *   NUBEFACT/DEMO        las que el motor puede emitir en DEMO
 *   NUBEFACT/PRODUCCION  las que puede emitir en el ambiente productivo
 *   DMS/LEGACY           homologadas contra el Excel maestro DMS
 *   LEGACY/FARENET       internas históricas, sin metadato DMS
 *
 * Las acciones dependen del origen: sólo una fila NUBEFACT puede confirmarse
 * para producción, y sólo una fila DMS tiene metadato que editar. Ninguna fila
 * cambia de proveedor ni de ambiente por pasar por esta pantalla.
 */
export default function TabSeries() {
  const [sedes, setSedes] = useState<SerieSede[]>([]);
  const [series, setSeries] = useState<SerieMaestro[]>([]);
  const [migracionAplicada, setMigracionAplicada] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [buscar, setBuscar] = useState('');
  const [sede, setSede] = useState('');
  const [origen, setOrigen] = useState<'' | 'NUBEFACT' | 'LEGACY'>('');
  const [ambiente, setAmbiente] = useState<'' | 'DEMO' | 'PRODUCCION'>('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [soloPos, setSoloPos] = useState(false);
  const [soloContingencia, setSoloContingencia] = useState(false);
  const [incluirInternas, setIncluirInternas] = useState(false);

  const [modal, setModal] = useState<EstadoModal>(null);
  const [confirmarSerie, setConfirmarSerie] = useState<SerieMaestro | null>(null);

  // Los filtros se resuelven en el backend: la tabla y el Excel leen el mismo
  // conjunto, así que no pueden discrepar.
  const filtros = useMemo(() => ({
    planta_key: sede || undefined,
    proveedor: origen || undefined,
    entorno: ambiente || undefined,
    tipo: (tipo || undefined) as TipoComprobanteFaregas | undefined,
    activo: estado === '' ? undefined : estado === '1',
    buscar: buscar.trim() || undefined,
    // El maestro DMS manda por defecto; las series internas/históricas se
    // piden a propósito, porque no tienen metadato del Excel que exportar.
    solo_dms: !incluirInternas
  }), [sede, origen, ambiente, tipo, estado, buscar, incluirInternas]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const maestro = await faregasSeriesApi.listarMaestro(filtros);
      setSeries(maestro.series);
      setMigracionAplicada(maestro.migracionNubefactAplicada);
    } catch (err) {
      setError(mensajeError(err, 'Error al cargar las series.'));
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    const temporizador = setTimeout(() => { void cargar(); }, 300);
    return () => clearTimeout(temporizador);
  }, [cargar]);

  useEffect(() => {
    void faregasSeriesApi.listarSedes()
      .then(setSedes)
      .catch((err: unknown) => setError(mensajeError(err, 'Error al cargar las sedes.')));
  }, []);

  // POS y contingencia son banderas simples: se filtran sobre el resultado.
  const visibles = useMemo(() => series.filter((item) => {
    if (soloPos && !item.serie_pos) return false;
    if (soloContingencia && !item.contingencia) return false;
    return true;
  }), [series, soloPos, soloContingencia]);

  const resumen = useMemo(() => {
    const porOrigen = new Map<string, number>();
    visibles.forEach((item) => {
      porOrigen.set(item.origen, (porOrigen.get(item.origen) || 0) + 1);
    });
    return {
      total: visibles.length,
      activas: visibles.filter((item) => item.activo).length,
      porOrigen
    };
  }, [visibles]);

  /**
   * Exporta el filtro completo con las 14 columnas del Excel DMS.
   * No depende de ninguna subpestaña: es la misma pantalla.
   */
  const exportar = async () => {
    try {
      setExportando(true);
      setError('');
      const completo = await faregasSeriesApi.listarMaestro(filtros);
      const filtrado = completo.series.filter((item) => {
        if (soloPos && !item.serie_pos) return false;
        if (soloContingencia && !item.contingencia) return false;
        return true;
      });
      exportarSeriesMaestro(filtrado);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo exportar el maestro de series.'));
    } finally {
      setExportando(false);
    }
  };

  const cambiarEstado = async (serie: SerieMaestro) => {
    const mensaje = serie.activo && serie.es_predeterminada
      ? `Esta sede quedará sin serie ${etiquetaTipo(serie.tipo_comprobante).toLowerCase()} predeterminada. ¿Deseas desactivar ${serie.serie}?`
      : `¿Deseas ${serie.activo ? 'desactivar' : 'activar'} la serie ${serie.serie}?`;
    if (!confirm(mensaje)) return;
    try {
      await faregasSeriesApi.cambiarEstado(serie.id, !serie.activo);
      await cargar();
    } catch (err) {
      setError(mensajeError(err, 'Error al cambiar el estado de la serie.'));
    }
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 text-sm ${migracionAplicada ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
        <strong>{migracionAplicada ? 'Series separadas por origen.' : 'Migración tributaria pendiente.'}</strong>{' '}
        {migracionAplicada
          ? 'Sólo las filas NUBEFACT pueden reservar correlativo en Nubefact. Las series DMS y las internas LEGACY son inventario documental: no se emiten ni se convierten.'
          : 'Las filas actuales siguen siendo LEGACY y no serán utilizadas por el motor. No se pueden crear series Nubefact hasta aplicar la migración autorizada.'}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-bold text-slate-600">Buscar serie, nombre DMS o local</label>
          <div className="relative">
            <Search className="absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar serie, nombre DMS o local"
              className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="min-w-52">
          <label className="mb-1 block text-xs font-bold text-slate-600">Origen</label>
          <select
            value={origen}
            onChange={(e) => setOrigen(e.target.value as typeof origen)}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-semibold focus:border-[#052A79] focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="NUBEFACT">Nubefact</option>
            <option value="LEGACY">DMS / Legacy</option>
          </select>
        </div>
        <div className="min-w-48">
          <label className="mb-1 block text-xs font-bold text-slate-600">Sede / Local</label>
          <select
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((item) => (
              <option key={item.key} value={item.key}>
                {item.nombre}{item.activo ? '' : ' (INACTIVA)'}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-44">
          <label className="mb-1 block text-xs font-bold text-slate-600">Ambiente</label>
          <select
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value as typeof ambiente)}
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-bold focus:border-[#052A79] focus:outline-none"
          >
            <option value="">Ambos</option>
            <option value="DEMO">DEMO</option>
            <option value="PRODUCCION">PRODUCCIÓN</option>
          </select>
        </div>
        <div className="min-w-52">
          <label className="mb-1 block text-xs font-bold text-slate-600">Tipo de documento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"
          >
            <option value="">Todos</option>
            {TIPOS_COMPROBANTE.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-32">
          <label className="mb-1 block text-xs font-bold text-slate-600">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="1">Activas</option>
            <option value="0">Inactivas</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-600">
          <input type="checkbox" checked={soloPos} onChange={(e) => setSoloPos(e.target.checked)} />
          Sólo POS
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-600">
          <input type="checkbox" checked={soloContingencia} onChange={(e) => setSoloContingencia(e.target.checked)} />
          Sólo contingencia
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={incluirInternas}
            onChange={(e) => setIncluirInternas(e.target.checked)}
          />
          Incluir series internas no registradas en DMS
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600">
          <span className="flex items-center gap-1">
            <ListOrdered size={16} className="text-[#052A79]" />
            {resumen.total} serie{resumen.total === 1 ? '' : 's'} · {resumen.activas} activas
          </span>
          {resumen.porOrigen.size > 0 && (
            <span className="flex flex-wrap gap-2">
              {[...resumen.porOrigen.entries()].sort().map(([clave, n]) => (
                <span key={clave} className={`rounded-full px-2 py-0.5 text-xs ${ESTILO_ORIGEN[clave as OrigenSerie]}`}>
                  {clave}: {n}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || exportando || visibles.length === 0}
            onClick={() => void exportar()}
            title="Exportar el filtro completo con las 14 columnas del Excel DMS"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? 'Exportando...' : 'EXPORTAR EXCEL DMS'}
          </button>
          <button
            type="button"
            disabled={!migracionAplicada}
            title={migracionAplicada ? 'Crear serie exclusiva de Nubefact' : 'Migración Nubefact pendiente'}
            onClick={() => setModal({ modo: 'CREAR_NUBEFACT' })}
            className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#043a63] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + NUEVA SERIE NUBEFACT
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Cargando series...</div>
        ) : visibles.length === 0 ? (
          <div className="p-12 text-center text-slate-600">No existen series para los filtros seleccionados.</div>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs capitalize text-slate-500">
                <tr>
                  <th className="px-3 py-3">Nombre</th>
                  <th className="px-3 py-3">Serie / Número</th>
                  <th className="px-3 py-3">Documento</th>
                  <th className="px-3 py-3">Sede / Local</th>
                  <th className="px-3 py-3">Origen / Ambiente</th>
                  <th className="px-3 py-3 text-right">Último número</th>
                  <th className="px-3 py-3 text-center">Autogenerada</th>
                  <th className="px-3 py-3 text-center">POS</th>
                  <th className="px-3 py-3 text-center">Contingencia</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((serie) => {
                  const esNubefact = serie.proveedor_emision === 'NUBEFACT';
                  const esDms = serie.origen === 'DMS/LEGACY';
                  // Confirmar producción sólo aplica a NUBEFACT en PRODUCCIÓN.
                  const puedeConfirmar = esNubefact && serie.entorno_emision === 'PRODUCCION';
                  return (
                    <tr key={serie.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono text-sm font-bold text-[#052A79]">
                        {serie.nombre_dms || '—'}
                        {serie.numero_dms && serie.numero_dms !== serie.serie && (
                          <div className="text-xs font-normal text-slate-500">{serie.numero_dms}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm font-bold">
                        {serie.serie}
                        {serie.contingencia && (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">CONTINGENCIA</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold">
                        {etiquetaTipo(serie.tipo_comprobante)}
                        <div className="text-xs font-normal text-slate-400">
                          Tipo doc. {serie.tipo_documento || '—'}
                          {serie.tipo_documento_referencia ? ` · Ref. ${serie.tipo_documento_referencia}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold">
                          <Building2 size={11} className="mr-1 inline" />
                          {serie.sede_nombre}
                        </div>
                        <div className="text-xs text-slate-500">
                          {serie.codigo_local_dms || serie.planta_key}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded px-2 py-1 text-xs font-bold ${ESTILO_ORIGEN[serie.origen as OrigenSerie]}`}>
                          {serie.origen}
                        </span>
                        {esNubefact && (
                          <div className="mt-1 text-xs text-slate-500">
                            {serie.es_predeterminada ? 'Predeterminada' : 'No predeterminada'}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-bold">
                        {Number(serie.ultimo_numero || 0).toLocaleString('es-PE')}
                      </td>
                      <td className="px-3 py-3 text-center text-sm">{serie.autogenerada ? 'Sí' : 'No'}</td>
                      <td className="px-3 py-3 text-center text-sm">{serie.serie_pos ? 'Sí' : 'No'}</td>
                      <td className="px-3 py-3 text-center text-sm">{serie.contingencia ? 'Sí' : 'No'}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                          serie.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {serie.activo ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center gap-2">
                          {esNubefact && (
                            <button
                              type="button"
                              onClick={() => setModal({ modo: 'EDITAR_NUBEFACT', serie })}
                              title="Editar configuración de Nubefact"
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {esDms && (
                            <button
                              type="button"
                              onClick={() => setModal({ modo: 'DETALLE_DMS', serie })}
                              title="Ver y editar los datos del maestro DMS"
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100"
                            >
                              <Info size={16} />
                            </button>
                          )}
                          {puedeConfirmar && (
                            <button
                              type="button"
                              onClick={() => setConfirmarSerie(serie)}
                              className={`text-xs font-bold ${serie.confirmada_produccion ? 'text-amber-700' : 'text-green-700'}`}
                            >
                              {serie.confirmada_produccion ? 'Revocar producción' : 'Confirmar producción'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void cambiarEstado(serie)}
                            title={serie.activo ? 'Desactivar' : 'Activar'}
                            className={serie.activo
                              ? 'rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-700'
                              : 'rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-green-700'}
                          >
                            {serie.activo ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.modo === 'CREAR_NUBEFACT' && (
        <SerieNubefactModal
          sedes={sedes}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await cargar(); }}
        />
      )}
      {modal?.modo === 'EDITAR_NUBEFACT' && (
        <SerieNubefactModal
          serie={modal.serie}
          sedes={sedes}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await cargar(); }}
        />
      )}
      {modal?.modo === 'DETALLE_DMS' && (
        <DetalleDmsModal
          serie={modal.serie}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await cargar(); }}
        />
      )}
      {confirmarSerie && (
        <ConfirmarSerieModal
          serie={confirmarSerie}
          onClose={() => setConfirmarSerie(null)}
          onSaved={async () => { setConfirmarSerie(null); await cargar(); }}
        />
      )}
    </div>
  );
}

/**
 * Alta y edición de series NUBEFACT. El proveedor se fija en 'NUBEFACT' y el
 * ambiente se elige aquí: una serie creada desde esta pantalla nace siendo
 *发射 elegible, y nunca convierte una fila DMS existente.
 */
function SerieNubefactModal({
  serie, sedes, onClose, onSaved
}: { serie?: SerieMaestro; sedes: SerieSede[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const editando = Boolean(serie);
  const plantaKey = serie?.planta_key ?? sedes.find((s) => s.activo)?.key ?? sedes[0]?.key ?? '';
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobanteFaregas>(
    serie?.tipo_comprobante ?? 'FACTURA'
  );
  const [codigo, setCodigo] = useState(serie?.serie ?? '');
  const [ultimoNumero, setUltimoNumero] = useState(String(serie?.ultimo_numero ?? 0));
  const [entornoEmision, setEntornoEmision] = useState<'DEMO' | 'PRODUCCION'>(
    serie?.entorno_emision ?? 'DEMO'
  );
  const [predeterminada, setPredeterminada] = useState(Boolean(serie?.es_predeterminada));
  const [autogenerada, setAutogenerada] = useState(serie?.autogenerada ?? true);
  const [contingencia, setContingencia] = useState(Boolean(serie?.contingencia));
  const [seriePos, setSeriePos] = useState(Boolean(serie?.serie_pos));
  const [activo, setActivo] = useState(serie?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      setSaving(true);
      if (editando && serie) {
        await faregasSeriesApi.editar(serie.id, {
          es_predeterminada: predeterminada,
          autogenerada,
          contingencia,
          serie_pos: seriePos
        });
      } else {
        await faregasSeriesApi.crear({
          planta_key: plantaKey,
          tipo_comprobante: tipoComprobante,
          serie: codigo.trim().toUpperCase(),
          ultimo_numero: Number(ultimoNumero || 0),
          es_predeterminada: predeterminada,
          autogenerada,
          contingencia,
          activo,
          // El listado del maestro no es una serie de Nubefact: se registra como
          // LEGACY para no alterar la selección del motor de emisión.
          proveedor_emision: 'LEGACY',
          entorno_emision: entornoEmision,
          serie_pos: seriePos
        } as never);
      }
      await onSaved();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la serie.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-[#052A79]">
          {editando ? `Editar serie ${serie?.serie}` : 'Nueva Serie Nubefact'}
        </h3>
        <p className="mb-5 mt-1 text-sm text-slate-500">
          Serie exclusiva de Nubefact; nunca se comparte con DMS Fact ni FARENET.
        </p>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Sede</label>
              <input
                readOnly
                value={sedes.find((s) => s.key === plantaKey)?.nombre ?? plantaKey}
                className="w-full rounded-lg border bg-slate-100 p-2.5 text-sm"
              />
            </div>
            {!editando && (
              <div>
                <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Ambiente Nubefact</label>
                <select
                  value={entornoEmision}
                  onChange={(e) => setEntornoEmision(e.target.value as 'DEMO' | 'PRODUCCION')}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-bold"
                >
                  <option value="DEMO">DEMO — pruebas sin valor tributario</option>
                  <option value="PRODUCCION">PRODUCCIÓN — requiere validación y corte formal</option>
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Tipo comprobante</label>
              <select
                disabled={editando}
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value as TipoComprobanteFaregas)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm disabled:bg-slate-100"
              >
                {TIPOS_COMPROBANTE.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Serie</label>
              <input
                required
                maxLength={4}
                disabled={editando}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono font-bold disabled:bg-slate-100"
              />
            </div>
          </div>
          {!editando && (
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Último número</label>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={ultimoNumero}
                onChange={(e) => setUltimoNumero(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono"
              />
              <p className="mt-1 text-xs text-slate-500">
                Debe ser el último correlativo realmente utilizado. El siguiente reservado será {Number(ultimoNumero || 0) + 1}.
              </p>
            </div>
          )}
          <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={predeterminada} onChange={(e) => setPredeterminada(e.target.checked)} />
              Predeterminada
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={autogenerada} onChange={(e) => setAutogenerada(e.target.checked)} />
              Autogenerada
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={contingencia} onChange={(e) => setContingencia(e.target.checked)} />
              Contingencia
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={seriePos} onChange={(e) => setSeriePos(e.target.checked)} />
              Serie para POS
            </label>
            {!editando && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                Activa
              </label>
            )}
          </div>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-lg px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Detalle y edición de los metadatos DMS de una fila homologada.
 *
 * Muestra los 14 campos del Excel maestro. El origen, el tipo de comprobante y
 * la serie interna no se editan aquí: son la identidad de la fila y
 * convertirlos convertiría una serie DMS en otra cosa.
 */
function DetalleDmsModal({
  serie, onClose, onSaved
}: { serie: SerieMaestro; onClose: () => void; onSaved: () => Promise<void> }) {
  const editable = serie.origen === 'DMS/LEGACY';
  const [codigoLocal, setCodigoLocal] = useState(serie.codigo_local_dms ?? '');
  const [nombreLocal, setNombreLocal] = useState(serie.nombre_local_dms ?? '');
  const [telefono, setTelefono] = useState(serie.telefono_local_dms ?? '');
  const [correo, setCorreo] = useState(serie.correo_local_dms ?? '');
  const [direccion, setDireccion] = useState(serie.direccion_comercial_dms ?? '');
  const [tipoRef, setTipoRef] = useState(serie.tipo_documento_referencia ?? '');
  const [autogenerada, setAutogenerada] = useState(Boolean(serie.autogenerada));
  const [seriePos, setSeriePos] = useState(Boolean(serie.serie_pos));
  const [contingencia, setContingencia] = useState(Boolean(serie.contingencia));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      setSaving(true);
      // `null` significa "el origen no trae dato": el backend conserva el valor
      // existente en lugar de borrarlo. `ultimo_numero` se aplica como
      // MAX(actual, recibido), por lo que la numeración nunca retrocede.
      const texto = (v: string) => (v.trim() === '' ? null : v.trim());
      await faregasSeriesApi.editarMaestro(serie.id, {
        ultimo_numero: Number(serie.ultimo_numero || 0),
        tipo_documento_referencia: texto(tipoRef),
        autogenerada,
        serie_pos: seriePos,
        contingencia,
        codigo_local_dms: texto(codigoLocal),
        nombre_local_dms: texto(nombreLocal),
        telefono_local_dms: texto(telefono),
        correo_local_dms: texto(correo),
        direccion_comercial_dms: texto(direccion)
      });
      await onSaved();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la serie.'));
    } finally {
      setSaving(false);
    }
  };

  const soloLectura = (children: React.ReactNode) => (
    <input readOnly value={String(children ?? '')} className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5 font-mono text-sm" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-[#052A79]">Detalle de serie DMS</h3>
        <p className="mb-5 mt-1 text-sm text-slate-500">
          {serie.origen === 'DMS/LEGACY'
            ? 'Datos importados del Excel maestro DMS. Esta serie no se convierte en Nubefact.'
            : 'Serie interna sin metadato DMS: sólo lectura.'}
        </p>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Serie interna</label>
              {soloLectura(serie.serie)}
              <p className="mt-1 text-xs text-slate-500">Identidad de la fila. No editable.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Tipo comprobante</label>
              {soloLectura(etiquetaTipo(serie.tipo_comprobante))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Origen</label>
              {soloLectura(serie.origen)}
              <p className="mt-1 text-xs text-slate-500">No se convierte automáticamente.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Nombre</label>
              <input readOnly value={serie.nombre_dms ?? ''} className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5 font-mono text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Número</label>
              <input readOnly value={serie.numero_dms ?? ''} className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5 font-mono text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Código del local</label>
              <input
                readOnly={!editable}
                value={codigoLocal}
                onChange={(e) => setCodigoLocal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Nombre del local</label>
              <input
                readOnly={!editable}
                value={nombreLocal}
                onChange={(e) => setNombreLocal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Teléfono del local</label>
              <input
                readOnly={!editable}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Correo del local</label>
              <input
                readOnly={!editable}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm disabled:bg-slate-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Dirección comercial</label>
              <input
                readOnly={!editable}
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Tipo de documento de referencia</label>
              <input
                maxLength={2}
                readOnly={!editable}
                placeholder="01 · 03"
                value={tipoRef}
                onChange={(e) => setTipoRef(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold capitalize text-slate-500">Último número generado</label>
              {soloLectura(Number(serie.ultimo_numero || 0).toLocaleString('es-PE'))}
              <p className="mt-1 text-xs text-slate-500">Avanzado sólo por reserva atómica.</p>
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={autogenerada} disabled={!editable} onChange={(e) => setAutogenerada(e.target.checked)} />
              Autogenerada
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={seriePos} disabled={!editable} onChange={(e) => setSeriePos(e.target.checked)} />
              Serie para POS
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={contingencia} disabled={!editable} onChange={(e) => setContingencia(e.target.checked)} />
              Serie de contingencia
            </label>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              Activo: {serie.activo ? 'Sí' : 'No'}
              <span className="text-xs font-normal text-slate-400">(se cambia con activar/desactivar)</span>
            </div>
          </div>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-lg px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">
              Cerrar
            </button>
            {editable && (
              <button type="submit" disabled={saving} className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmarSerieModal({
  serie, onClose, onSaved
}: { serie: SerieMaestro; onClose: () => void; onSaved: () => Promise<void> }) {
  const [numero, setNumero] = useState(String(serie.numero_inicial_confirmado ?? serie.ultimo_numero));
  const [origen, setOrigen] = useState(serie.sistema_origen || 'DMS_FACT');
  const [fechaCorte, setFechaCorte] = useState(serie.fecha_corte ? String(serie.fecha_corte).slice(0, 16) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const revocar = Boolean(serie.confirmada_produccion);
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const numeroConfirmado = Number(numero);
    if (!Number.isSafeInteger(numeroConfirmado) || numeroConfirmado < serie.ultimo_numero) {
      setError(`El número debe ser entero y no menor que ${serie.ultimo_numero}.`);
      return;
    }
    if (!revocar && !fechaCorte) {
      setError('La fecha y hora de corte son obligatorias.');
      return;
    }
    try {
      setSaving(true);
      await faregasSeriesApi.confirmarProduccion(serie.id, {
        confirmada: !revocar,
        numero_inicial_confirmado: numeroConfirmado,
        sistema_origen: origen.trim().toUpperCase(),
        fecha_corte: fechaCorte || null
      });
      await onSaved();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la confirmación.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-black text-[#052a79]">
          {revocar ? 'Revocar confirmación productiva' : 'Confirmar serie para producción'}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{serie.tipo_comprobante} · {serie.serie}</p>
        <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Esta acción no activa Nubefact, pero registra el número de corte. Debe basarse en información verificada de DMS Fact.
        </div>
        <form onSubmit={guardar} className="space-y-4">
          <label className="block text-xs font-bold capitalize text-slate-500">
            Último número confirmado
            <input
              type="number"
              min={serie.ultimo_numero}
              step="1"
              value={numero}
              disabled={revocar}
              onChange={(event) => setNumero(event.target.value)}
              className="mt-1 w-full rounded-lg border p-2.5 disabled:bg-slate-100"
            />
          </label>
          <label className="block text-xs font-bold capitalize text-slate-500">
            Sistema origen
            <input value={origen} disabled={revocar} onChange={(event) => setOrigen(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 disabled:bg-slate-100" />
          </label>
          <label className="block text-xs font-bold capitalize text-slate-500">
            Fecha y hora de corte
            <input type="datetime-local" value={fechaCorte} disabled={revocar} onChange={(event) => setFechaCorte(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 disabled:bg-slate-100" />
          </label>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-bold text-slate-600">Cancelar</button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg px-4 py-2 font-bold text-white disabled:opacity-50 ${
                revocar ? 'bg-amber-700' : 'bg-green-700'
              }`}
            >
              {saving ? 'Guardando...' : revocar ? 'REVOCAR CONFIRMACIÓN' : 'CONFIRMAR SERIE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
