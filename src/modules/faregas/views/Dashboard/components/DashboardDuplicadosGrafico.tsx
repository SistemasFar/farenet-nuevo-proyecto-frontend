import React from 'react';

interface DistribucionItem {
  tipo: string;
  cantidad: number;
  porcentaje: number;
}

interface DashboardDuplicadosGraficoProps {
  distribucionDuplicados: DistribucionItem[];
  tipoDuplicadoSeleccionado?: string;
  onSeleccionarTipoDuplicado: (tipo?: string) => void;
  cargando?: boolean;
}

const COLORES_DUPLICADOS: Record<string, string> = {
  GLP: '#059669',
  GNV: '#2563eb',
  CONFORMIDAD: '#7c3aed',
  COMPLEMENTARIOS: '#d97706'
};

const COLOR_DEFAULT = '#64748b';

export const DashboardDuplicadosGrafico: React.FC<DashboardDuplicadosGraficoProps> = ({
  distribucionDuplicados,
  tipoDuplicadoSeleccionado,
  onSeleccionarTipoDuplicado,
  cargando = false
}) => {
  const totalGeneral = distribucionDuplicados.reduce((sum, item) => sum + item.cantidad, 0);

  const itemSeleccionado = tipoDuplicadoSeleccionado
    ? distribucionDuplicados.find((item) => item.tipo === tipoDuplicadoSeleccionado)
    : undefined;

  const totalMostrado = itemSeleccionado ? itemSeleccionado.cantidad : totalGeneral;

  const categoriasConEmisiones = distribucionDuplicados.filter((item) => item.cantidad > 0);
  const categoriasGraficadas = tipoDuplicadoSeleccionado && itemSeleccionado
    ? [itemSeleccionado]
    : categoriasConEmisiones;

  const totalGraficado = categoriasGraficadas.reduce((sum, item) => sum + item.cantidad, 0);

  const { segmentos } = categoriasGraficadas.reduce<{ acumulado: number; segmentos: string[] }>(
    (acc, item) => {
      const inicio = acc.acumulado;
      const pct = totalGraficado > 0 ? (item.cantidad / totalGraficado) * 100 : 0;
      const fin = inicio + pct;
      const color = COLORES_DUPLICADOS[item.tipo] || COLOR_DEFAULT;
      return {
        acumulado: fin,
        segmentos: [...acc.segmentos, `${color} ${inicio}% ${fin}%`]
      };
    },
    { acumulado: 0, segmentos: [] }
  );

  const fondoDonut = segmentos.length > 0 ? `conic-gradient(${segmentos.join(', ')})` : '#e2e8f0';

  if (cargando) {
    return (
      <div className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white p-4" />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Duplicados por Tipo de Certificado</h3>
          <p className="text-xs text-slate-500">
            Distribución real de duplicados emitidos. Selecciona una categoría para filtrar los indicadores y el historial.
          </p>
        </div>
        {tipoDuplicadoSeleccionado ? (
          <button
            type="button"
            onClick={() => onSeleccionarTipoDuplicado(undefined)}
            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            Ver todos
          </button>
        ) : (
          <span className="text-xs font-semibold text-slate-500">% de duplicados emitidos</span>
        )}
      </div>

      {distribucionDuplicados.length === 0 || totalGeneral === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">
          No hay duplicados emitidos registrados en el período seleccionado.
        </div>
      ) : (
        <div className="flex min-h-32 flex-col items-center gap-4 sm:flex-row">
          {/* Donut Chart */}
          <div
            className="relative h-28 w-28 shrink-0 rounded-full shadow-inner"
            style={{ background: fondoDonut }}
            role="img"
            aria-label={`Distribución de ${totalMostrado} duplicados emitidos`}
          >
            <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
              <strong className="text-lg font-bold text-slate-800">{totalMostrado}</strong>
              <span className="text-xs text-slate-500">{tipoDuplicadoSeleccionado ? 'filtrados' : 'duplicados'}</span>
            </div>
          </div>

          {/* Interactive Legend Grid */}
          <div className="grid max-h-40 w-full grid-cols-1 gap-1 overflow-y-auto pr-1 lg:grid-cols-2">
            {distribucionDuplicados.map((item) => {
              const porcentaje = totalGeneral > 0 ? (item.cantidad / totalGeneral) * 100 : 0;
              const seleccionado = tipoDuplicadoSeleccionado === item.tipo;
              const color = COLORES_DUPLICADOS[item.tipo] || COLOR_DEFAULT;

              return (
                <button
                  type="button"
                  key={item.tipo}
                  data-tipo-duplicado={item.tipo}
                  aria-pressed={seleccionado}
                  onClick={() => onSeleccionarTipoDuplicado(seleccionado ? undefined : item.tipo)}
                  className={`flex items-start justify-between gap-3 rounded-lg border p-2 text-left text-sm transition ${
                    seleccionado
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200 shadow-sm'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                  title={`${item.tipo}: ${item.cantidad} duplicados emitidos (${porcentaje.toFixed(1)}%)`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-700">{item.tipo}</div>
                      <div className="text-xs text-slate-400">
                        {item.cantidad === 1 ? '1 emisión' : `${item.cantidad} emisiones`}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold text-slate-800">
                      {item.cantidad} ({porcentaje.toFixed(1)}%)
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.cantidad === 1 ? 'duplicado' : 'duplicados'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
