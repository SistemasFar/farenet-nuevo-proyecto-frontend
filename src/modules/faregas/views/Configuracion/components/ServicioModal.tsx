import { useMemo, useState } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio,
  type SedeTarifaAsignada,
  type ServicioConfiguracionFaregas,
  type TipoFlujoServicioFaregas
} from '../../../services/faregas-config.api';
import type { ProductoFacturacion } from '../../../services/faregas-productos.api';
import {
  faregasTarifasAdminApi,
  type TarifaSede
} from '../../../services/faregas-tarifas-admin.api';

type VarianteCertificado = 'GNV_INICIAL' | 'GNV_ANUAL' | 'GLP_INICIAL' | 'GLP_ANUAL' | 'CONFORMIDAD' | 'TALLER_INSPECCION';

interface EstadoSede {
  seleccionada: boolean;
  precio: string;
  productoId: string;
  productoBusqueda: string;
  tarifaId?: number;
  activaOriginalmente: boolean;
}

interface Props {
  mode: 'CREATE' | 'EDIT';
  initialData: Partial<ServicioConfiguracionFaregas>;
  categoria: CategoriaServicio;
  productos: ProductoFacturacion[];
  productoInicialId?: number | null;
  sedesDisponibles: TarifaSede[];
  tarifasAsignadas: SedeTarifaAsignada[];
  onClose: () => void;
  onSaved: () => void;
}

const varianteDesdeServicio = (servicio: Partial<ServicioConfiguracionFaregas>): VarianteCertificado => {
  if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'INICIAL') return 'GNV_INICIAL';
  if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'ANUAL') return 'GNV_ANUAL';
  if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'INICIAL') return 'GLP_INICIAL';
  if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'ANUAL') return 'GLP_ANUAL';
  if (servicio.tipo_certificado_clave === 'CONFORMIDAD') return 'CONFORMIDAD';
  if (servicio.tipo_certificado_clave === 'TALLER_INSPECCION' || servicio.tipo_flujo === 'TALLER_INSPECCION') return 'TALLER_INSPECCION';
  return 'GNV_INICIAL';
};

const configuracionVariante = (variante: VarianteCertificado) => {
  switch (variante) {
    case 'GNV_INICIAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'INICIAL' as const, formato_id: null };
    case 'GNV_ANUAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL' as const, formato_id: null };
    case 'GLP_INICIAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'INICIAL' as const, formato_id: null };
    case 'GLP_ANUAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL' as const, formato_id: null };
    case 'CONFORMIDAD': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'CONFORMIDAD', modalidad: null, formato_id: null };
    case 'TALLER_INSPECCION': return { tipo_flujo: 'TALLER_INSPECCION', tipo_certificado_clave: 'TALLER_INSPECCION', modalidad: null, formato_id: 1 }; // 1 is default for TALLER_INSPECCION, or we query it.
  }
};

const codigoTecnico = (codigo: string) => codigo
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9_]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 30);

export function ServicioModal({
  mode,
  initialData,
  categoria,
  productos,
  productoInicialId,
  sedesDisponibles,
  tarifasAsignadas,
  onClose,
  onSaved
}: Props) {
  const productoInicialSolicitado = productos.find((producto) => Number(producto.id) === Number(productoInicialId));
  const productoInicial = productoInicialSolicitado
    && Number(productoInicialSolicitado.categoria_id) === Number(categoria.id)
    ? productoInicialSolicitado
    : productos.find((producto) =>
      Number(producto.categoria_id) === Number(categoria.id)
      && producto.activo
      && producto.es_para_venta
    );
  const [codigo, setCodigo] = useState(initialData.codigo || codigoTecnico(productoInicial?.codigo_sku || categoria.codigo));
  const [nombre, setNombre] = useState(initialData.nombre || productoInicial?.descripcion || categoria.nombre);
  const [generaCertificado, setGeneraCertificado] = useState(Boolean(initialData.requiere_certificado));
  const [variante, setVariante] = useState<VarianteCertificado>(varianteDesdeServicio(initialData));
  const [requiereVehiculo, setRequiereVehiculo] = useState(initialData.requiere_vehiculo ?? Boolean(initialData.requiere_certificado));
  const [orden, setOrden] = useState(initialData.orden ?? 10);
  const productosSeleccionables = useMemo(() => productos.filter((producto) =>
    Number(producto.categoria_id) === Number(categoria.id)
    || tarifasAsignadas.some((tarifa) => Number(tarifa.producto_facturacion_id) === Number(producto.id))
  ), [categoria.id, productos, tarifasAsignadas]);

  const [sedes, setSedes] = useState<Record<string, EstadoSede>>(() => {
    const inicial: Record<string, EstadoSede> = {};
    for (const sede of sedesDisponibles) {
      const tarifasDeSede = tarifasAsignadas.filter((item) => String(item.key) === String(sede.key));
      const tarifa = tarifasDeSede.find((item) => item.activo) || tarifasDeSede[0];
      const productoTarifa = tarifa?.producto_facturacion_id
        ? productos.find((producto) => Number(producto.id) === Number(tarifa.producto_facturacion_id))
        : undefined;
      const productoPredeterminado = mode === 'CREATE' ? productoInicial : undefined;
      const productoSede = productoTarifa || productoPredeterminado;
      inicial[sede.key] = {
        seleccionada: Boolean(tarifa?.activo),
        precio: tarifa ? String(tarifa.precio) : String(productoInicial?.precio_referencia || ''),
        productoId: productoSede ? String(productoSede.id) : '',
        productoBusqueda: productoSede?.codigo_sku || '',
        tarifaId: tarifa?.tarifa_id,
        activaOriginalmente: Boolean(tarifa?.activo)
      };
    }
    return inicial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const actualizarSede = (key: string, cambios: Partial<EstadoSede>) => {
    setSedes((actual) => ({ ...actual, [key]: { ...actual[key], ...cambios } }));
  };

  const escribirProducto = (key: string, value: string) => {
    const sku = value.trim().toUpperCase();
    const producto = productos.find((item) => String(item.codigo_sku).trim().toUpperCase() === sku);
    const estado = sedes[key];
    actualizarSede(key, {
      productoBusqueda: value.toUpperCase(),
      productoId: producto ? String(producto.id) : '',
      precio: !estado?.precio && producto?.precio_referencia != null
        ? String(producto.precio_referencia)
        : estado?.precio || ''
    });
  };

  const problemaProductoFiscal = (productoId: string, productoBusqueda = ''): string | null => {
    const producto = productos.find((item) => String(item.id) === String(productoId));
    if (!producto) {
      const skuEscrito = productoBusqueda.trim().toUpperCase();
      return skuEscrito
        ? `No existe un producto fiscal con el SKU ${skuEscrito}.`
        : 'Falta escribir o seleccionar un producto fiscal.';
    }
    if (Number(producto.categoria_id) !== Number(categoria.id)) return `El SKU ${producto.codigo_sku} no pertenece a esta categoría.`;
    if (!producto.activo || !producto.es_para_venta) return `El SKU ${producto.codigo_sku} debe estar activo y habilitado para venta.`;
    if (!['NIU', 'ZZ'].includes(String(producto.unidad || '').toUpperCase())) return `El SKU ${producto.codigo_sku} debe utilizar unidad NIU o ZZ.`;
    if (generaCertificado && String(producto.tipo_afectacion_igv || '') !== '10') return `El SKU ${producto.codigo_sku} debe tener afectación IGV 10 para una certificación.`;
    return null;
  };

  const hayProductosFiscalesValidos = productosSeleccionables.some((producto) =>
    !problemaProductoFiscal(String(producto.id))
  );
  const haySedesSeleccionadasIncompletas = Object.values(sedes).some((sede) =>
    sede.seleccionada && Boolean(problemaProductoFiscal(sede.productoId, sede.productoBusqueda))
  );

  const validar = () => {
    if (!codigoTecnico(codigo) || !nombre.trim()) throw new Error('El código y el nombre de la operación son obligatorios.');
    for (const [sedeKey, sede] of Object.entries(sedes).filter(([, item]) => item.seleccionada)) {
      const sedeConfigurada = sedesDisponibles.find((item) => item.key === sedeKey);
      const nombreSede = sedeConfigurada?.nombre || sedeKey;
      const precio = Number(sede.precio);
      if (!Number.isFinite(precio) || precio <= 0) throw new Error(`La sede ${nombreSede} debe tener un precio mayor que cero.`);
      const problemaProducto = problemaProductoFiscal(sede.productoId, sede.productoBusqueda);
      if (problemaProducto) throw new Error(`La sede ${nombreSede}: ${problemaProducto}`);
    }
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      validar();
      setSaving(true);
      const certificado = generaCertificado ? configuracionVariante(variante) : null;
      const payload: Partial<ServicioConfiguracionFaregas> = {
        codigo: codigoTecnico(codigo), nombre: nombre.trim(), categoria_id: categoria.id,
        tipo_flujo: (certificado ? certificado.tipo_flujo : 'SERVICIO_COMPLEMENTARIO') as TipoFlujoServicioFaregas,
        requiere_certificado: generaCertificado,
        tipo_certificado_clave: certificado?.tipo_certificado_clave || null,
        modalidad: certificado?.modalidad || null,
        formato_id: certificado?.formato_id || null,
        requiere_vehiculo: requiereVehiculo, orden
      };

      let servicioId = initialData.id;
      if (mode === 'CREATE') servicioId = await faregasConfigApi.crearServicio(payload);
      else if (servicioId) await faregasConfigApi.editarServicio(servicioId, payload);
      else throw new Error('No se pudo identificar la operación.');

      for (const sede of sedesDisponibles) {
        const estado = sedes[sede.key];
        if (!estado) continue;
        if (estado.seleccionada) {
          const datos = { precio: Number(estado.precio), producto_facturacion_id: Number(estado.productoId), activo: true };
          if (estado.tarifaId) await faregasTarifasAdminApi.editar(estado.tarifaId, datos);
          else await faregasTarifasAdminApi.crear({ planta_key: sede.key, servicio_id: servicioId, ...datos });
        } else if (estado.tarifaId && estado.activaOriginalmente) {
          await faregasTarifasAdminApi.cambiarEstado(estado.tarifaId, false);
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{categoria.codigo} · {categoria.nombre}</p><h3 className="mt-1 text-xl font-bold text-[#052A79]">{mode === 'CREATE' ? 'Configurar nueva operación' : 'Configurar operación'}</h3><p className="mt-1 text-sm text-slate-500">Define el comportamiento, el formato y las sedes usando la misma configuración oficial de Tarifas por sede.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 font-bold text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        <form onSubmit={guardar} className="space-y-5">
          <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 font-bold text-slate-800">1. Identidad de la operación</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Código técnico<input required disabled={mode === 'EDIT'} value={codigo} onChange={(event) => setCodigo(event.target.value)} className="mt-1 w-full rounded-lg border p-2 uppercase disabled:bg-slate-100" /></label>
              <label className="text-sm font-semibold text-slate-700">Nombre<input required value={nombre} onChange={(event) => setNombre(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 font-bold text-slate-800">2. Certificado</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-slate-50 p-3 text-sm font-bold text-slate-800"><input type="checkbox" checked={generaCertificado} onChange={(event) => { setGeneraCertificado(event.target.checked); if (event.target.checked) setRequiereVehiculo(true); }} className="h-5 w-5" />Genera certificado</label>
              {generaCertificado && <label className="text-sm font-semibold text-slate-700">Formato protegido<select value={variante} onChange={(event) => setVariante(event.target.value as VarianteCertificado)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="GNV_INICIAL">GNV Inicial</option><option value="GNV_ANUAL">GNV Anual</option><option value="GLP_INICIAL">GLP Inicial</option><option value="GLP_ANUAL">GLP Anual</option><option value="CONFORMIDAD">Conformidad</option><option value="TALLER_INSPECCION">Taller Inspección (Dinámico)</option></select></label>}
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={requiereVehiculo} onChange={(event) => setRequiereVehiculo(event.target.checked)} className="h-4 w-4" />Requiere vehículo en planta</label>
              <label className="text-sm font-semibold text-slate-700">Orden de visualización<input type="number" value={orden} onChange={(event) => setOrden(Number(event.target.value) || 0)} className="mt-1 w-full rounded-lg border p-2" /></label>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3">
              <h4 className="font-bold text-slate-800">3. Sedes, precio y producto fiscal</h4>
              <p className="mt-1 text-xs text-slate-500">Estas selecciones son las tarifas reales de la operación; no se guardan en una tabla duplicada.</p>
            </div>

            {!hayProductosFiscalesValidos && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">Esta categoría no tiene un producto fiscal activo y válido.</p>
                <p className="mt-1 text-xs">Las sedes y precios existentes se muestran abajo. Para guardar una sede seleccionada, primero vincula un producto fiscal a esta categoría.</p>
              </div>
            )}

            <datalist id="faregas-productos-fiscales">
              {productos.map((producto) => (
                <option key={producto.id} value={producto.codigo_sku}>
                  {producto.descripcion} · {producto.categoria_nombre || 'Sin categoría'}
                </option>
              ))}
            </datalist>

            {sedesDisponibles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No hay sedes disponibles.</div>
            ) : (
              <div className="grid max-h-80 gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
                {sedesDisponibles.map((sede) => {
                  const estado = sedes[sede.key];
                  if (!estado) return null;
                  const problemaProducto = estado.seleccionada
                    ? problemaProductoFiscal(estado.productoId, estado.productoBusqueda)
                    : null;
                  const productoSeleccionado = productos.find((producto) =>
                    String(producto.id) === String(estado.productoId)
                  );

                  return (
                    <div
                      key={sede.key}
                      className={`rounded-xl border p-3 ${estado.seleccionada ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <label className="flex cursor-pointer items-center gap-2 font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={estado.seleccionada}
                          onChange={(event) => actualizarSede(sede.key, { seleccionada: event.target.checked })}
                          className="h-4 w-4"
                        />
                        {sede.nombre}
                      </label>

                      {estado.seleccionada && (
                        <div className="mt-3 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                            <input
                              required
                              type="text"
                              list="faregas-productos-fiscales"
                              value={estado.productoBusqueda}
                              onChange={(event) => escribirProducto(sede.key, event.target.value)}
                              placeholder="Escribir o buscar SKU"
                              autoComplete="off"
                              className={`min-w-0 rounded-lg border bg-white p-2 text-xs ${problemaProducto ? 'border-amber-400' : ''}`}
                            />
                            <input
                              required
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={estado.precio}
                              onChange={(event) => actualizarSede(sede.key, { precio: event.target.value })}
                              placeholder="Precio"
                              className="rounded-lg border p-2 text-xs"
                            />
                          </div>
                          {productoSeleccionado && (
                            <p className="text-xs text-slate-600">
                              <b>{productoSeleccionado.descripcion}</b> · {productoSeleccionado.categoria_nombre || 'Sin categoría'}
                            </p>
                          )}
                          {problemaProducto && (
                            <p className="text-xs font-semibold text-amber-700">⚠ {problemaProducto}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-lg px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button
              type="submit"
              disabled={saving || haySedesSeleccionadasIncompletas}
              title={haySedesSeleccionadasIncompletas ? 'Completa el producto fiscal de todas las sedes seleccionadas.' : undefined}
              className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
