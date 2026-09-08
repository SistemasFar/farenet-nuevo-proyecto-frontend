import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { faregasChipsApi, type Chip, type ChipResumen } from '../../services/faregas-chips.api';
import { ChipScannerInput, parseChipScan } from './ChipScannerInput';

const empty:ChipResumen={total:0,disponibles:0,reservados:0,vendidos:0,baja:0,precio:180,stockPermitido:false,ventaHabilitada:false,mappingFiscalCompleto:false};
export function ChipsView(){
  const {plantaNombre,plantasDisponibles}=useOutletContext<MainLayoutContext>();
  const [resumen,setResumen]=useState(empty); const [chips,setChips]=useState<Chip[]>([]); const [scan,setScan]=useState('');
  const [modo,setModo]=useState<'INGRESO'|'TRANSFERENCIA'>('INGRESO'); const [destino,setDestino]=useState(''); const [buscar,setBuscar]=useState('');
  const [mensaje,setMensaje]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  const parsed=useMemo(()=>parseChipScan(scan),[scan]);
  const cargar=useCallback(async()=>{try{const [r,l]=await Promise.all([faregasChipsApi.resumen(),faregasChipsApi.listar({buscar})]);setResumen(r);setChips(l.items);}catch(e:any){setError(e.message);}},[buscar]);
  useEffect(()=>{cargar();},[cargar]);
  const confirmar=async()=>{setError('');setMensaje(''); if(!parsed.validos.length||parsed.duplicados.length||parsed.errores.length){setError('Corrija duplicados o lecturas inválidas antes de confirmar.');return;}
    try{setLoading(true); if(modo==='INGRESO')await faregasChipsApi.ingresar(parsed.validos); else {if(!destino)throw new Error('Seleccione la sede destino.');await faregasChipsApi.transferir(destino,parsed.validos);}
      setMensaje(`${parsed.validos.length} chip(s) procesados correctamente.`);setScan('');await cargar();
    }catch(e:any){setError(e.message);}finally{setLoading(false);}};
  const cards=[['Total',resumen.total],['Disponibles',resumen.disponibles],['Reservados',resumen.reservados],['Vendidos',resumen.vendidos],['Baja',resumen.baja]];
  return <div className="space-y-5">
    <div><h1 className="text-xl font-bold text-slate-900">Inventario de chips</h1><p className="text-sm text-slate-500">Stock serializado de la sede {plantaNombre}.</p></div>
    {!resumen.ventaHabilitada&&<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><b>Venta de Chips no habilitada.</b> Esta sede puede administrar stock, pero no vender hasta contar con autorización comercial y un producto fiscal válido.</div>}
    {!resumen.stockPermitido&&<div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"><b>Stock no habilitado.</b> La sede no puede recibir ni reservar Chips.</div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map(([label,value])=><div key={String(label)} className="rounded-xl border bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-[#052A79]">{value}</div></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-xl border bg-white p-5 shadow-sm"><div className="mb-4 flex gap-2"><button onClick={()=>setModo('INGRESO')} className={`rounded px-3 py-2 text-xs font-bold ${modo==='INGRESO'?'bg-[#052A79] text-white':'bg-slate-100'}`}>Ingresar stock</button><button onClick={()=>setModo('TRANSFERENCIA')} className={`rounded px-3 py-2 text-xs font-bold ${modo==='TRANSFERENCIA'?'bg-[#052A79] text-white':'bg-slate-100'}`}>Transferir</button></div>
        {modo==='TRANSFERENCIA'&&<select value={destino} onChange={e=>setDestino(e.target.value)} className="mb-3 w-full rounded border p-2 text-sm"><option value="">Seleccione sede destino</option>{plantasDisponibles.map(p=><option key={p.key} value={p.key}>{p.nombre}</option>)}</select>}
        <ChipScannerInput value={scan} onChange={setScan}/>{error&&<p className="mt-3 text-sm text-red-700">{error}</p>}{mensaje&&<p className="mt-3 text-sm text-emerald-700">{mensaje}</p>}
        <button disabled={loading || !resumen.stockPermitido} onClick={confirmar} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50">{loading?'Procesando...':'Confirmar'}</button>
      </section>
      <section className="rounded-xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b p-4"><h2 className="font-bold">Chips registrados</h2><input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar número" className="ml-auto rounded border px-3 py-2 text-sm"/></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Número</th><th className="p-3">Estado</th><th className="p-3">Sede</th><th className="p-3">Ingreso</th><th className="p-3">Último movimiento</th></tr></thead><tbody>{chips.map(c=><tr key={c.id} className="border-t"><td className="p-3 font-mono font-bold">{c.numero_chip}</td><td className="p-3">{c.estado}</td><td className="p-3">{c.planta_nombre}</td><td className="p-3">{new Date(c.creado_en).toLocaleString()}</td><td className="p-3">{c.ultimo_movimiento?new Date(c.ultimo_movimiento).toLocaleString():'-'}</td></tr>)}{!chips.length&&<tr><td colSpan={5} className="p-10 text-center text-slate-400">No hay chips registrados.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </div>;
}
