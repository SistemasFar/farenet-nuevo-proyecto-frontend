import React from 'react';

interface KpiInfoPopoverProps {
  titulo: string;
  descripcion: string;
  formula: string;
  fuente: string;
  filtros: string;
}

export const KpiInfoPopover: React.FC<KpiInfoPopoverProps> = ({ titulo, descripcion, formula, fuente, filtros }) => (
  <span className="group relative inline-flex">
    <button
      type="button"
      aria-label={`Explicación de ${titulo}`}
      className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute right-0 top-7 z-30 w-72 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-normal text-slate-600 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 group-hover/kpi:visible group-hover/kpi:opacity-100"
    >
      <strong className="block text-sm text-slate-900">{titulo}</strong>
      <span className="mt-1 block">{descripcion}</span>
      <span className="mt-2 block"><strong>Cómo se calcula:</strong> {formula}</span>
      <span className="mt-1 block"><strong>Fuente:</strong> {fuente}</span>
      <span className="mt-1 block"><strong>Filtros:</strong> {filtros}</span>
    </span>
  </span>
);

