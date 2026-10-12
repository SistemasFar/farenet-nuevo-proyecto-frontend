import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, RotateCcw, Search } from 'lucide-react';
import {
  agruparServiciosLogicos,
  calcularPrecioFinal,
  claveServicioLogico,
  claveRegla,
  nombreServicioLogico,
  tipoServicio,
  type BeneficioDescuento,
  type ReglaDescuento,
  type ServicioPorPlanta,
  type TipoCalculo,
} from '../descuentos-wizard.utils';

type Planta = { key?: string; nombre: string };
type FiltroTipo = 'TODOS' | 'GLP' | 'GNV' | 'CONFORMIDAD';

type Props = {
  plantas: Planta[];
  serviciosPorPlanta: ServicioPorPlanta[];
  sedesSeleccionadas: string[];
  serviciosSeleccionados: string[];
  reglas: ReglaDescuento[];
  beneficio: BeneficioDescuento;
  excepciones: Set<string>;
  mostrarExcepciones: boolean;
  onCambiarSede: (plantaKey: string, seleccionada: boolean) => void;
  onSeleccionarTodasLasSedes: () => void;
  onLimpiarSedes: () => void;
  onCambiarServicio: (servicioLogico: string, seleccionado: boolean) => void;
  onCambiarBeneficio: (cambio: Partial<BeneficioDescuento>) => void;
  onMostrarExcepciones: (mostrar: boolean) => void;
  onCambiarExcepcion: (plantaKey: string, servicioId: number, cambio: Partial<ReglaDescuento>) => void;
  onRestaurarBeneficio: (plantaKey: string, servicioId: number) => void;
  onGuardar: () => void;
};

const tituloValor = (tipo: TipoCalculo) => tipo === 'FLAT'
  ? 'Precio final (S/)'
  : tipo === 'PORCENTAJE'
    ? 'Descuento (%)'
    : 'Descuento (S/)';

const dinero = (valor: number | null) => valor == null ? '—' : `S/ ${valor.toFixed(2)}`;

export function DescuentoAlcanceStep({
  plantas,
  serviciosPorPlanta,
  sedesSeleccionadas,
  serviciosSeleccionados,
  reglas,
  beneficio,
  excepciones,
  mostrarExcepciones,
  onCambiarSede,
  onSeleccionarTodasLasSedes,
  onLimpiarSedes,
  onCambiarServicio,
  onCambiarBeneficio,
  onMostrarExcepciones,
  onCambiarExcepcion,
  onRestaurarBeneficio,
  onGuardar,
}: Props) {
  const [buscarServicio, setBuscarServicio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const sedesSet = useMemo(() => new Set(sedesSeleccionadas), [sedesSeleccionadas]);
  const plantasPorKey = useMemo(
    () => new Map(plantas.map(planta => [String(planta.key), planta.nombre])),
    [plantas],
  );

  const gruposLogicos = useMemo(
    () => agruparServiciosLogicos(serviciosPorPlanta, sedesSeleccionadas),
    [sedesSeleccionadas, serviciosPorPlanta],
  );

  const serviciosConsolidados = useMemo(() => {
    const termino = buscarServicio.trim().toUpperCase();
    return gruposLogicos
      .filter(item => filtroTipo === 'TODOS' || tipoServicio(item.referencia) === filtroTipo)
      .filter(item => !termino || `${item.nombre} ${item.categoria || ''} ${item.referencia.tipo_certificado_clave || ''} ${item.referencia.modalidad || ''}`.toUpperCase().includes(termino));
  }, [buscarServicio, filtroTipo, gruposLogicos]);

  const grupoLogicoPorKey = useMemo(
    () => new Map(gruposLogicos.map(grupo => [grupo.key, grupo])),
    [gruposLogicos],
  );

  const servicioPorId = useMemo(() => {
    const mapa = new Map<number, ServicioPorPlanta>();
    serviciosPorPlanta.forEach(item => mapa.set(Number(item.id), item));
    return mapa;
  }, [serviciosPorPlanta]);

  const cambiarTipoGeneral = (tipoCalculo: TipoCalculo) => onCambiarBeneficio({
    tipoCalculo,
    valor: '',
    valorContado: '',
    valorCredito: '',
  });

  const cambiarTipoExcepcion = (regla: ReglaDescuento, tipoCalculo: TipoCalculo) => onCambiarExcepcion(
    regla.plantaKey,
    regla.servicioId,
    { tipoCalculo, valor: '', valorContado: '', valorCredito: '' },
  );

  return <div className="space-y-4 bg-slate-50 p-4">
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
      Paso 2: selecciona sedes y servicios una sola vez. El sistema crea únicamente las combinaciones disponibles y aplica el beneficio general, salvo las excepciones que personalices.
    </div>

    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><b className="text-xs">SEDES</b><p className="mt-1 text-xs text-slate-500">Elige todas las sedes donde podría aplicar la campaña.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={onSeleccionarTodasLasSedes} className="rounded-md bg-blue-50 px-3 py-2 text-xs font-bold text-[#052a79]">Seleccionar todas</button>
          <button type="button" onClick={onLimpiarSedes} className="rounded-md border px-3 py-2 text-xs font-bold text-slate-600">Limpiar</button>
        </div>
      </div>
      <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto md:grid-cols-3">
        {plantas.map(planta => {
          const key = String(planta.key);
          const disponibles = agruparServiciosLogicos(serviciosPorPlanta, [key]).length;
          const seleccionada = sedesSet.has(key);
          return <label key={key} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${disponibles ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${seleccionada ? 'border-[#052a79] bg-blue-50 text-[#052a79]' : 'border-slate-200'}`}>
            <input type="checkbox" disabled={!disponibles} checked={seleccionada} onChange={event => onCambiarSede(key, event.target.checked)} />
            <MapPin className="h-4 w-4" /><span className="flex-1 font-bold">{planta.nombre}</span><span className="text-slate-400">{disponibles}</span>
          </label>;
        })}
      </div>
    </section>

    {sedesSeleccionadas.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Selecciona una o más sedes para ver los servicios disponibles.</div> : <>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div><b className="text-xs">SERVICIOS</b><p className="mt-1 text-xs text-slate-500">Listado consolidado. La disponibilidad indica en cuántas sedes seleccionadas existe cada servicio.</p></div>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_12rem]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={buscarServicio} onChange={event => setBuscarServicio(event.target.value)} placeholder="Buscar servicio..." className="input pl-9" /></label>
          <select value={filtroTipo} onChange={event => setFiltroTipo(event.target.value as FiltroTipo)} className="input"><option value="TODOS">Todos los tipos</option><option value="GLP">GLP</option><option value="GNV">GNV</option><option value="CONFORMIDAD">Conformidad</option></select>
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border">
          {serviciosConsolidados.length === 0 ? <p className="p-6 text-center text-xs text-slate-500">No hay servicios para este criterio.</p> : serviciosConsolidados.map(item => {
            const seleccionado = serviciosSeleccionados.includes(item.key);
            const minimo = item.precios.length ? Math.min(...item.precios) : null;
            const maximo = item.precios.length ? Math.max(...item.precios) : null;
            const precio = minimo == null ? 'Sin P. venta' : minimo === maximo ? dinero(minimo) : `${dinero(minimo)} – ${dinero(maximo)}`;
            return <label key={item.key} className={`grid cursor-pointer items-center gap-3 border-b px-3 py-3 text-xs last:border-b-0 md:grid-cols-[auto_1fr_auto_auto] ${seleccionado ? 'bg-blue-50/60' : 'bg-white'}`}>
              <input type="checkbox" checked={seleccionado} onChange={event => onCambiarServicio(item.key, event.target.checked)} />
              <span><b>{item.nombre}</b><small className="mt-1 block text-slate-400">{item.categoria || tipoServicio(item.referencia)}</small></span>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">Disponible en {item.sedes.size} de {sedesSeleccionadas.length} sedes</span>
              <span className={`font-bold ${minimo == null ? 'text-red-600' : 'text-[#052a79]'}`}>P. venta: {precio}</span>
            </label>;
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div><b className="text-xs">BENEFICIO GENERAL</b><p className="mt-1 text-xs text-slate-500">Se aplicará a todas las combinaciones válidas que no tengan una excepción.</p></div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-xs font-bold">TIPO<select value={beneficio.tipoCalculo} onChange={event => cambiarTipoGeneral(event.target.value as TipoCalculo)} className="input mt-1"><option value="FLAT">FLAT — precio final</option><option value="MONTO">MONTO — resta soles</option><option value="PORCENTAJE">PORCENTAJE</option></select></label>
          {beneficio.tipoCalculo === 'FLAT' ? <>
            <label className="text-xs font-bold">PRECIO FINAL CONTADO (S/)<input type="number" min="0.01" step="0.01" value={beneficio.valorContado} onChange={event => onCambiarBeneficio({ valorContado: event.target.value })} className="input mt-1" /></label>
            <label className="text-xs font-bold">PRECIO FINAL CRÉDITO (S/)<input type="number" min="0.01" step="0.01" value={beneficio.valorCredito} onChange={event => onCambiarBeneficio({ valorCredito: event.target.value })} className="input mt-1" /></label>
          </> : <label className="text-xs font-bold">{tituloValor(beneficio.tipoCalculo).toUpperCase()}<input type="number" min="0.01" max={beneficio.tipoCalculo === 'PORCENTAJE' ? 100 : undefined} step="0.01" value={beneficio.valor} onChange={event => onCambiarBeneficio({ valor: event.target.value })} className="input mt-1" /></label>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Sedes</span><b className="mt-1 block text-xl text-[#052a79]">{sedesSeleccionadas.length}</b></div>
        <div className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Servicios</span><b className="mt-1 block text-xl text-[#052a79]">{serviciosSeleccionados.length}</b></div>
        <div className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Aplicaciones válidas</span><b className="mt-1 block text-xl text-green-700">{reglas.length}</b></div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button type="button" onClick={() => onMostrarExcepciones(!mostrarExcepciones)} className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold text-[#052a79]">
          <span>Personalizar excepciones {excepciones.size > 0 && `(${excepciones.size})`}</span>{mostrarExcepciones ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {mostrarExcepciones && <div className="overflow-x-auto border-t"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">Sede / servicio</th><th className="px-3 py-3">P. venta</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3">Resultado</th><th className="px-3 py-3">Acción</th></tr></thead><tbody className="divide-y">
          {reglas.map(regla => {
            const servicio = serviciosPorPlanta.find(item => String(item.planta_key) === regla.plantaKey && Number(item.id) === regla.servicioId) || servicioPorId.get(regla.servicioId);
            const nombreLogico = servicio
              ? grupoLogicoPorKey.get(claveServicioLogico(servicio))?.nombre || nombreServicioLogico(servicio)
              : String(regla.servicioId);
            const precio = Number(servicio?.precio);
            const final = calcularPrecioFinal(precio, regla);
            const esExcepcion = excepciones.has(claveRegla(regla.plantaKey, regla.servicioId));
            return <tr key={claveRegla(regla.plantaKey, regla.servicioId)} className={esExcepcion ? 'bg-amber-50' : ''}>
              <td className="px-3 py-3"><b>{plantasPorKey.get(regla.plantaKey) || regla.plantaKey}</b><small className="block text-slate-500">{nombreLogico}</small></td>
              <td className="px-3 py-3 font-bold text-[#052a79]">{Number.isFinite(precio) ? dinero(precio) : 'Sin P. venta'}</td>
              <td className="px-3 py-3"><select value={regla.tipoCalculo} onChange={event => cambiarTipoExcepcion(regla, event.target.value as TipoCalculo)} className="input"><option value="FLAT">FLAT</option><option value="MONTO">MONTO</option><option value="PORCENTAJE">PORCENTAJE</option></select></td>
              <td className="px-3 py-3">{regla.tipoCalculo === 'FLAT' ? <div className="grid grid-cols-2 gap-1"><input type="number" min="0.01" step="0.01" value={regla.valorContado} onChange={event => onCambiarExcepcion(regla.plantaKey, regla.servicioId, { valorContado: event.target.value })} placeholder="Contado" className="input" /><input type="number" min="0.01" step="0.01" value={regla.valorCredito} onChange={event => onCambiarExcepcion(regla.plantaKey, regla.servicioId, { valorCredito: event.target.value })} placeholder="Crédito" className="input" /></div> : <input type="number" min="0.01" max={regla.tipoCalculo === 'PORCENTAJE' ? 100 : undefined} step="0.01" value={regla.valor} onChange={event => onCambiarExcepcion(regla.plantaKey, regla.servicioId, { valor: event.target.value })} className="input" />}</td>
              <td className="px-3 py-3 font-bold text-green-700">{regla.tipoCalculo === 'FLAT' ? `C: ${regla.valorContado || '—'} / Cr: ${regla.valorCredito || '—'}` : dinero(final)}</td>
              <td className="px-3 py-3"><button type="button" onClick={() => onRestaurarBeneficio(regla.plantaKey, regla.servicioId)} className="flex items-center gap-1 rounded-md border px-2 py-2 font-bold text-slate-600" title="Restaurar beneficio general"><RotateCcw className="h-3.5 w-3.5" /> General</button></td>
            </tr>;
          })}
        </tbody></table></div>}
      </section>
    </>}

    <div className="flex justify-end border-t pt-4"><button type="button" onClick={onGuardar} className="h-10 rounded-lg bg-green-600 px-8 text-xs font-black text-white hover:bg-green-700">GUARDAR ALCANCE Y CONTINUAR</button></div>
  </div>;
}
