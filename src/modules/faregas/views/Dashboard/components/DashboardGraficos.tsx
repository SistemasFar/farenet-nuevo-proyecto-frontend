import React from 'react';
import type {
  SerieDiariaItem,
  DistribucionCertificadoItem,
  DistribucionPagoItem,
  ProductoDetalleItem
} from '../../../services/faregas-dashboard.api';

interface DashboardGraficosProps {
  serieDiaria: SerieDiariaItem[];
  distribucionCertificados: DistribucionCertificadoItem[];
  distribucionPagos: DistribucionPagoItem[];
  productos: ProductoDetalleItem[];
  mostrar?: Array<'evolucion' | 'productos' | 'pagos' | 'certificados'>;
  tipoCertificadoSeleccionado?: string;
  onSeleccionarTipoCertificado?: (tipo?: string) => void;
  productoIdSeleccionado?: number;
  onSeleccionarProducto?: (productoId?: number) => void;
}

export const DashboardGraficos: React.FC<DashboardGraficosProps> = ({
  serieDiaria,
  distribucionCertificados,
  distribucionPagos,
  productos,
  mostrar = ['evolucion', 'productos', 'pagos', 'certificados'],
  tipoCertificadoSeleccionado,
  onSeleccionarTipoCertificado,
  productoIdSeleccionado,
  onSeleccionarProducto
}) => {
  // Gráfico de evolución temporal (SVG nativo responsivo)
  const maxVenta = Math.max(...serieDiaria.map(s => s.venta), 100);
  const puntosSvg = serieDiaria.map((s, index) => {
    const x = serieDiaria.length > 1 ? (index / (serieDiaria.length - 1)) * 500 : 250;
    const y = 160 - (s.venta / maxVenta) * 130;
    return `${x},${y}`;
  }).join(' ');

  // Productos con venta en el período
  const productosConVenta = productos.filter((producto) => producto.unidadesVendidas > 0);
  const totalUnidadesGeneral = productosConVenta.reduce((total, producto) => total + producto.unidadesVendidas, 0);
  const productoFiltrado = productoIdSeleccionado
    ? productosConVenta.find((p) => p.id === productoIdSeleccionado)
    : undefined;
  const totalUnidadesMostradas = productoFiltrado
    ? productoFiltrado.unidadesVendidas
    : totalUnidadesGeneral;

  const coloresProductos = ['#1d4ed8', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#65a30d'];

  // Si hay un producto seleccionado, el gráfico circular resalta su proporción o muestra 100% igual que en Certificados
  const productosGraficados = productoIdSeleccionado && productoFiltrado
    ? [productoFiltrado]
    : productosConVenta;
  const totalUnidadesGraficadas = productosGraficados.reduce((total, p) => total + p.unidadesVendidas, 0);

  const { segmentos: segmentosProductos } = productosGraficados.reduce<{ acumulado: number; segmentos: string[] }>((estado, producto) => {
    const inicio = estado.acumulado;
    const porcentaje = totalUnidadesGraficadas > 0 ? (producto.unidadesVendidas / totalUnidadesGraficadas) * 100 : 0;
    const fin = inicio + porcentaje;
    const indiceColor = productosConVenta.findIndex((p) => (p.id ? p.id === producto.id : p.sku === producto.sku));
    const colorFinal = coloresProductos[(indiceColor >= 0 ? indiceColor : 0) % coloresProductos.length];
    return {
      acumulado: fin,
      segmentos: [...estado.segmentos, `${colorFinal} ${inicio}% ${fin}%`]
    };
  }, { acumulado: 0, segmentos: [] });
  const fondoProductos = segmentosProductos.length > 0
    ? `conic-gradient(${segmentosProductos.join(', ')})`
    : '#e2e8f0';

  const certificadosEmitidos = distribucionCertificados.filter((certificado) => certificado.emitidos > 0);
  const certificadosGraficados = tipoCertificadoSeleccionado
    ? certificadosEmitidos.filter((certificado) => certificado.tipo === tipoCertificadoSeleccionado)
    : certificadosEmitidos;
  const totalCertificadosEmitidos = certificadosGraficados.reduce((total, certificado) => total + certificado.emitidos, 0);
  const coloresCertificados = ['#059669', '#2563eb', '#7c3aed', '#d97706', '#0891b2', '#e11d48'];
  const { segmentos: segmentosCertificados } = certificadosGraficados.reduce<{ acumulado: number; segmentos: string[] }>((estado, certificado) => {
    const inicio = estado.acumulado;
    const porcentaje = totalCertificadosEmitidos > 0 ? (certificado.emitidos / totalCertificadosEmitidos) * 100 : 0;
    const fin = inicio + porcentaje;
    const indiceColor = distribucionCertificados.findIndex((item) => item.tipo === certificado.tipo);
    return {
      acumulado: fin,
      segmentos: [...estado.segmentos, `${coloresCertificados[indiceColor % coloresCertificados.length]} ${inicio}% ${fin}%`]
    };
  }, { acumulado: 0, segmentos: [] });
  const fondoCertificados = segmentosCertificados.length > 0
    ? `conic-gradient(${segmentosCertificados.join(', ')})`
    : '#e2e8f0';

  return (
    <div className={`grid grid-cols-1 gap-3 ${mostrar.length === 1 ? '' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
      {mostrar.includes('evolucion') && (
      <div className="md:col-span-2 lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
          <h3 className="text-sm font-bold text-slate-800">Evolución de Ventas por Día</h3>
          <span className="text-xs text-slate-500">Monto total diario (S/.)</span>
        </div>

        {serieDiaria.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
            Sin operaciones registradas en el período
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 500 180" className="w-full h-32 overflow-visible">
              <defs>
                <linearGradient id="gradVenta" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Ejes */}
              <line x1="0" y1="160" x2="500" y2="160" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="0" y1="95" x2="500" y2="95" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

              {/* Área y línea */}
              {serieDiaria.length > 1 && (
                <polygon
                  fill="url(#gradVenta)"
                  points={`0,160 ${puntosSvg} 500,160`}
                />
              )}
              <polyline
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.5"
                points={puntosSvg}
              />

              {/* Nodos interactivos */}
              {serieDiaria.map((s, index) => {
                const x = serieDiaria.length > 1 ? (index / (serieDiaria.length - 1)) * 500 : 250;
                const y = 160 - (s.venta / maxVenta) * 130;
                return (
                  <g key={s.fecha}>
                    <circle cx={x} cy={y} r="3.5" fill="#1d4ed8" className="hover:r-5 transition-all cursor-pointer">
                      <title>{`${s.fecha}: S/ ${s.venta.toFixed(2)} (${s.operaciones} ops)`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
            <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
              <span>{serieDiaria[0]?.fecha}</span>
              <span>{serieDiaria[Math.floor(serieDiaria.length / 2)]?.fecha}</span>
              <span>{serieDiaria[serieDiaria.length - 1]?.fecha}</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Distribución circular de productos vendidos */}
      {mostrar.includes('productos') && (
      <div className="md:col-span-2 lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Productos Vendidos</h3>
            <p className="text-xs text-slate-500">Selecciona un producto para actualizar los indicadores, la evolución, la tabla y las sedes.</p>
          </div>
          {productoIdSeleccionado ? (
            <button
              type="button"
              onClick={() => onSeleccionarProducto?.(undefined)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
              Ver todos
            </button>
          ) : <span className="text-xs text-slate-500">Distribución por unidades</span>}
        </div>

        {productosConVenta.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
            Sin productos facturados en el período
          </div>
        ) : (
          <div className="min-h-32 flex flex-col sm:flex-row items-center gap-4">
            <div
              className="relative h-28 w-28 shrink-0 rounded-full shadow-inner cursor-pointer transition hover:scale-105"
              style={{ background: fondoProductos }}
              role="img"
              aria-label={`Distribución de ${totalUnidadesMostradas} unidades vendidas`}
              onClick={() => {
                if (productoIdSeleccionado) {
                  onSeleccionarProducto?.(undefined);
                } else if (productosConVenta.length > 0) {
                  onSeleccionarProducto?.(productosConVenta[0].id);
                }
              }}
              title={productoIdSeleccionado ? "Haz clic para ver todos los productos" : "Haz clic para seleccionar"}
            >
              <div className="absolute inset-5 rounded-full bg-white shadow-sm flex flex-col items-center justify-center text-center">
                <strong className="text-lg font-bold text-slate-800">{totalUnidadesMostradas}</strong>
                <span className="text-xs text-slate-500">{productoIdSeleccionado ? 'filtradas' : 'unidades'}</span>
              </div>
            </div>

            <div className="grid max-h-40 w-full grid-cols-1 gap-1 overflow-y-auto pr-1">
              {productosConVenta.map((producto, index) => {
                const porcentaje = totalUnidadesGeneral > 0
                  ? (producto.unidadesVendidas / totalUnidadesGeneral) * 100
                  : 0;
                const seleccionado = productoIdSeleccionado === producto.id;
                return (
                  <button
                    type="button"
                    key={producto.id ? `prod-${producto.id}` : `${producto.sku}-${producto.descripcion}`}
                    data-producto-id={producto.id}
                    data-producto-sku={producto.sku}
                    aria-pressed={seleccionado}
                    onClick={() => onSeleccionarProducto?.(seleccionado ? undefined : producto.id)}
                    className={`flex items-start justify-between gap-3 rounded-lg border p-2 text-left text-sm transition ${seleccionado
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                    title={`${producto.descripcion} (${producto.sku}): ${producto.unidadesVendidas} unidades (S/ ${producto.totalSoles.toFixed(2)})`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: coloresProductos[index % coloresProductos.length] }}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-700" title={producto.descripcion}>{producto.descripcion}</div>
                        <div className="text-xs text-slate-400 font-mono">{producto.sku}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-slate-800">{producto.unidadesVendidas} ({porcentaje.toFixed(1)}%)</div>
                      <div className="text-xs text-slate-500">S/ {producto.totalSoles.toFixed(2)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Distribución por Medio de Pago (1 columna) */}
      {mostrar.includes('pagos') && (
      <div className={`${mostrar.length === 1 ? 'col-span-full' : 'md:col-span-1 lg:col-span-2'} bg-white rounded-xl shadow-sm border border-slate-200 p-3`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
          <h3 className="text-sm font-bold text-slate-800">Medios de Pago</h3>
          <span className="text-xs text-slate-500">% Recaudación</span>
        </div>

        {distribucionPagos.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
            Sin pagos en el período
          </div>
        ) : (
          <div className="space-y-2 pt-0.5">
            {distribucionPagos.map((p) => (
              <div key={p.medio} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">{p.medio}</span>
                  <span className="text-slate-500 font-medium">
                    S/ {p.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} ({p.porcentaje}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(p.porcentaje, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Distribución por Tipo de Certificado (1 columna) */}
      {mostrar.includes('certificados') && (
      <div className="md:col-span-1 lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tipos de Certificado Vendidos</h3>
            <p className="text-xs text-slate-500">Selecciona un tipo para actualizar los indicadores, la evolución, la tabla y las sedes.</p>
          </div>
          {tipoCertificadoSeleccionado ? (
            <button
              type="button"
              onClick={() => onSeleccionarTipoCertificado?.(undefined)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
              Ver todos
            </button>
          ) : <span className="text-xs text-slate-500">% de emitidos</span>}
        </div>

        {distribucionCertificados.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Sin tipos de certificado configurados</div>
        ) : (
          <div className="min-h-32 flex flex-col items-center gap-4 sm:flex-row">
            <div
              className="relative h-28 w-28 shrink-0 rounded-full shadow-inner"
              style={{ background: fondoCertificados }}
              role="img"
              aria-label={`Distribución de ${totalCertificadosEmitidos} certificados emitidos`}
            >
              <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                <strong className="text-lg font-bold text-slate-800">{totalCertificadosEmitidos}</strong>
                <span className="text-xs text-slate-500">{tipoCertificadoSeleccionado ? 'filtrados' : 'emitidos'}</span>
              </div>
            </div>

            <div className="grid max-h-40 w-full grid-cols-1 gap-1 overflow-y-auto pr-1 lg:grid-cols-2">
              {distribucionCertificados.map((certificado, index) => {
                const totalGeneral = certificadosEmitidos.reduce((total, item) => total + item.emitidos, 0);
                const porcentaje = totalGeneral > 0
                  ? (certificado.emitidos / totalGeneral) * 100
                  : 0;
                const seleccionado = tipoCertificadoSeleccionado === certificado.tipo;
                return (
                  <button
                    type="button"
                    key={certificado.tipo}
                    data-tipo-certificado={certificado.tipo}
                    aria-pressed={seleccionado}
                    onClick={() => onSeleccionarTipoCertificado?.(certificado.tipo)}
                    className={`flex items-start justify-between gap-3 rounded-lg border p-2 text-left text-sm transition ${seleccionado
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                    title={`${certificado.tipo}: ${certificado.emitidos} certificados emitidos (${porcentaje.toFixed(1)}%)`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: coloresCertificados[index % coloresCertificados.length] }}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-700" title={certificado.tipo}>{certificado.tipo}</div>
                        <div className="text-xs text-slate-400">
                          Borradores: {certificado.pendientes} · Anulados: {certificado.anulados}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-slate-800">{certificado.emitidos} ({porcentaje.toFixed(1)}%)</div>
                      <div className="text-xs text-slate-500">{certificado.emitidos === 1 ? 'certificado' : 'certificados'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
