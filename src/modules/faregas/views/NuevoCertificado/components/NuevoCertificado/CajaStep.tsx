import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { faregasTarifasApi } from '../../../../services/faregas-tarifas.api';
import type { FormCajaState } from '../../NuevoCertificadoView';
import type {
  CatalogoFaregas,
  CategoriaCatalogoFaregas,
  ServicioCatalogoFaregas,
} from '../../../../types/faregas-api';

import type { ConsultaDescuentoResult } from '../../../../services/faregas-descuentos.api';
import { ConsultaDescuento } from './ConsultaDescuento';
import { ReservaChipAdicional } from './ReservaChipAdicional';

interface CajaStepProps {
  plantaSeleccionada: string;
  plantaNombre: string;
  formCaja: FormCajaState;
  setFormCaja: Dispatch<SetStateAction<FormCajaState>>;
  certificadoId?: number;
  consultaRealizada: boolean;
  consultando: boolean;
  onConsultar: () => Promise<void>;
  onInvalidarConsulta: () => void;
  onDescuentoChange: (descuento: ConsultaDescuentoResult | null) => void;
}

const normalizarBusqueda = (valor: string) => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-PE')
  .trim();

const contieneBusqueda = (
  servicio: ServicioCatalogoFaregas,
  categoria: CategoriaCatalogoFaregas,
  busqueda: string,
) => {
  const termino = normalizarBusqueda(busqueda);
  if (!termino) return true;
  return normalizarBusqueda(`${servicio.nombre} ${servicio.codigo} ${categoria.nombre}`).includes(termino);
};

export function CajaStep({
  plantaSeleccionada,
  plantaNombre,
  formCaja,
  setFormCaja,
  certificadoId,
  consultaRealizada,
  consultando,
  onConsultar,
  onInvalidarConsulta,
  onDescuentoChange,
}: CajaStepProps) {
  const [catalogo, setCatalogo] = useState<CatalogoFaregas | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    faregasTarifasApi.obtenerCatalogo()
      .then((respuesta) => {
        if (cancelado) return;
        const nuevoCatalogo = respuesta.catalogo;
        setCatalogo(nuevoCatalogo);
        setError('');

        setFormCaja((actual) => {
          const seleccionSigueDisponible = nuevoCatalogo.categorias.some((categoria) =>
            categoria.servicios.some((servicio) => servicio.tarifa.codigo === actual.tarifaCodigo));
          if (!actual.tarifaCodigo || seleccionSigueDisponible) return actual;
          return {
            ...actual,
            servicioCodigo: '',
            tarifaCodigo: '',
            tipoCertificado: '',
            modalidadCertificado: '',
          };
        });
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setCatalogo(null);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo de servicios.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => { cancelado = true; };
  }, [reintento, setFormCaja]);

  const servicios = useMemo(() => (catalogo?.categorias.flatMap((categoria) =>
    categoria.servicios
      .filter(() => categoriaActiva === 'TODOS' || categoria.codigo === categoriaActiva)
      .filter((servicio) => contieneBusqueda(servicio, categoria, busqueda))
      .map((servicio) => ({ servicio, categoria }))) ?? []), [busqueda, catalogo, categoriaActiva]);

  const seleccion = useMemo(() => catalogo?.categorias
    .flatMap((categoria) => categoria.servicios.map((servicio) => ({ categoria, servicio })))
    .find(({ servicio }) => servicio.tarifa.codigo === formCaja.tarifaCodigo),
  [catalogo, formCaja.tarifaCodigo]);

  const seleccionarServicio = (servicio: ServicioCatalogoFaregas) => {
    onInvalidarConsulta();
    setFormCaja((actual) => ({
      ...actual,
      servicioCodigo: servicio.codigo,
      tarifaCodigo: servicio.tarifa.codigo,
      tipoCertificado: servicio.tipo_certificado_clave,
      modalidadCertificado: servicio.modalidad ?? '',
      tipo_flujo: servicio.tipo_flujo ?? 'VEHICULAR_EXISTENTE',
      requiere_certificado: servicio.requiere_certificado ?? true,
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-4">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">1. Selecciona el Servicio</h4>
          <p className="mt-1 text-xs text-slate-500">Catálogo disponible para {catalogo?.sede.nombre || plantaNombre}.</p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar servicio..."
            aria-label="Buscar servicio"
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0"
          />
        </div>

        {catalogo && catalogo.categorias.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Categorías de servicio">
            <button type="button" onClick={() => setCategoriaActiva('TODOS')} className={`rounded-full border px-4 py-2 text-xs font-black transition ${categoriaActiva === 'TODOS' ? 'border-[#052a79] bg-[#052a79] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#052a79]/40'}`}>TODOS</button>
            {catalogo.categorias.map((categoria) => (
              <button key={categoria.codigo} type="button" onClick={() => setCategoriaActiva(categoria.codigo)} className={`rounded-full border px-4 py-2 text-xs font-black uppercase transition ${categoriaActiva === categoria.codigo ? 'border-[#052a79] bg-[#052a79] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#052a79]/40'}`}>{categoria.nombre}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Cargando servicios disponibles...</div>
        ) : error ? (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /><span className="text-sm font-bold">{error}</span></div>
            <button type="button" onClick={() => { setLoading(true); setReintento((actual) => actual + 1); }} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white">REINTENTAR</button>
          </div>
        ) : !catalogo || catalogo.categorias.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="font-bold text-slate-700">No existen servicios configurados para esta sede.</p>
            <p className="mt-1 text-sm text-slate-500">Solicite al administrador asignar una tarifa activa.</p>
          </div>
        ) : servicios.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-600">No se encontraron servicios con los filtros seleccionados.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {servicios.map(({ servicio, categoria }) => {
              const seleccionado = servicio.tarifa.codigo === formCaja.tarifaCodigo;
              return (
                <button key={servicio.id} type="button" onClick={() => seleccionarServicio(servicio)} aria-pressed={seleccionado} className={`relative min-h-44 rounded-2xl border-2 p-5 text-left transition-all duration-200 ${seleccionado ? 'border-[#052a79] bg-[#052a79]/5 shadow-md' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#052a79]/40 hover:shadow-sm'}`}>
                  {seleccionado && <CheckCircle className="absolute right-4 top-4 h-6 w-6 text-[#052a79]" />}
                  <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#052a79]">{categoria.nombre}</span>
                  <h5 className="mt-5 pr-8 text-base font-black text-slate-800">{servicio.nombre}</h5>
                  <div className="mt-6 flex items-end justify-between gap-3">
                    <span className="text-[11px] font-semibold text-slate-400">{servicio.codigo}</span>
                    <span className="text-xl font-black text-[#052a79]">S/ {servicio.tarifa.precio.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {seleccion?.servicio.requiere_vehiculo && (
        <section className="space-y-4 border-t border-slate-100 pt-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">2. Datos Básicos</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Placa de Rodaje</label>
              <input type="text" className="h-[42px] w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold uppercase text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0" placeholder="EJ: ABC-123" value={formCaja.placa} onChange={(event) => { onInvalidarConsulta(); setFormCaja((actual) => ({ ...actual, placa: event.target.value.trim().toUpperCase() })); }} maxLength={7} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría Vehicular</label>
              <select className="h-[42px] w-full rounded-xl border-2 border-slate-200 bg-white px-4 font-bold text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0" value={formCaja.categoria} onChange={(event) => { onInvalidarConsulta(); setFormCaja((actual) => ({ ...actual, categoria: event.target.value })); }}>
                <option value="">-- Seleccionar --</option>
                {['M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'O1', 'O2', 'O3', 'O4'].map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {seleccion && (
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void onConsultar()}
            disabled={consultando || (seleccion.servicio.requiere_vehiculo && (!formCaja.placa || !formCaja.categoria))}
            className="flex min-w-40 items-center justify-center gap-2 rounded-lg bg-[#052a79] px-6 py-3 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Search className="h-4 w-4" />
            {consultando ? 'CONSULTANDO…' : consultaRealizada ? 'CONSULTAR NUEVAMENTE' : 'CONSULTAR'}
          </button>
        </div>
      )}

      {seleccion && consultaRealizada && (
        <>
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#052a79]">Servicio Seleccionado</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="block text-xs font-semibold text-blue-600">Servicio</span><span className="font-bold text-slate-800">{seleccion.servicio.nombre}</span></div>
              <div><span className="block text-xs font-semibold text-blue-600">Categoría</span><span className="font-bold text-slate-800">{seleccion.categoria.nombre}</span></div>
              <div><span className="block text-xs font-semibold text-blue-600">Sede</span><span className="font-bold text-slate-800">{catalogo?.sede.nombre || plantaNombre}</span></div>
              <div><span className="block text-xs font-semibold text-blue-600">Precio</span><span className="text-lg font-black text-[#052a79]">S/ {seleccion.servicio.tarifa.precio.toFixed(2)}</span></div>
            </div>
          </section>

          <ReservaChipAdicional certificadoId={certificadoId} />
          <ConsultaDescuento
            certificadoId={certificadoId}
            onDescuentoChange={onDescuentoChange}
          />
        </>
      )}
      <span className="sr-only">Sede activa: {plantaSeleccionada}</span>
    </div>
  );
}
