import { useMemo, useRef } from 'react';

export const parseChipScan = (text:string) => {
  const seen=new Set<string>(); const validos:string[]=[]; const duplicados:string[]=[]; const errores:string[]=[];
  text.split(/[\r\n,;\t]+/).forEach(raw=>{const value=raw.trim().toUpperCase(); if(!value)return;
    if(value.length>120 || !/^[A-Z0-9._\/-]+$/.test(value)) errores.push(value);
    else if(seen.has(value)) duplicados.push(value); else {seen.add(value);validos.push(value);}
  }); return {validos,duplicados,errores};
};

export function ChipScannerInput({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const ref=useRef<HTMLTextAreaElement>(null); const result=useMemo(()=>parseChipScan(value),[value]);
  return <div className="space-y-2">
    <textarea ref={ref} autoFocus value={value} onChange={e=>onChange(e.target.value)} rows={7}
      placeholder={'Escanee un chip y presione Enter\nCHIP001\nCHIP002'}
      className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
    <div className="flex gap-3 text-xs font-semibold">
      <span className="text-emerald-700">Válidos: {result.validos.length}</span>
      <span className="text-amber-700">Duplicados: {result.duplicados.length}</span>
      <span className="text-red-700">Errores: {result.errores.length}</span>
      <button type="button" onClick={()=>ref.current?.focus()} className="ml-auto text-blue-700">Enfocar scanner</button>
    </div>
  </div>;
}
