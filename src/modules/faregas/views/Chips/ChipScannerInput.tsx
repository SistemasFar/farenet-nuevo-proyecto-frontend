import { useMemo, useRef } from 'react';
import { parseChipScan } from './chips-ingreso-masivo';

export function ChipScannerInput({value,onChange,rows=7,disabled=false,etiquetaValidos='Válidos',ariaBusy=false,placeholder='Escanee un chip y presione Enter\nCHIP001\nCHIP002'}:{value:string;onChange:(value:string)=>void;rows?:number;disabled?:boolean;etiquetaValidos?:string;ariaBusy?:boolean;placeholder?:string}){
  const ref=useRef<HTMLTextAreaElement>(null); const result=useMemo(()=>parseChipScan(value),[value]);
  return <div className="space-y-2">
    <textarea ref={ref} autoFocus value={value} onChange={e=>onChange(e.target.value)} rows={rows} disabled={disabled} aria-busy={ariaBusy}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100" />
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
      <span className="text-emerald-700">{etiquetaValidos}: {result.validos.length}</span>
      <span className="text-amber-700">Duplicados: {result.duplicados.length}</span>
      <span className="text-red-700">Errores: {result.errores.length}</span>
      <button type="button" onClick={()=>ref.current?.focus()} disabled={disabled} className="ml-auto text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Enfocar scanner</button>
    </div>
  </div>;
}
