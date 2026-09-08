import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { faregasChipsApi, type ChipResumen } from '../../../services/faregas-chips.api';

export default function TabProductosInventariables(){const [data,setData]=useState<ChipResumen|null>(null);const [error,setError]=useState('');
  useEffect(()=>{faregasChipsApi.resumen().then(setData).catch(e=>setError(e.message));},[]);
  return <div className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h3 className="text-lg font-bold text-[#052A79]">Chip y porta chip</h3><p className="text-sm text-slate-500">Producto físico serializado. El dato fiscal vive en Productos / SKU.</p></div><Link to="/faregas/chips" className="rounded bg-[#052A79] px-3 py-2 text-xs font-bold text-white">Abrir inventario</Link></div>
    {error?<p className="mt-4 text-red-700">{error}</p>:data&&<dl className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-5"><div><dt className="text-slate-500">Precio sede</dt><dd className="font-bold">S/ {data.precio.toFixed(2)}</dd></div><div><dt className="text-slate-500">Stock permitido</dt><dd className={`font-bold ${data.stockPermitido?'text-emerald-700':'text-red-700'}`}>{data.stockPermitido?'Sí':'No'}</dd></div><div><dt className="text-slate-500">Venta habilitada</dt><dd className={`font-bold ${data.ventaHabilitada?'text-emerald-700':'text-amber-700'}`}>{data.ventaHabilitada?'Sí':'No'}</dd></div><div><dt className="text-slate-500">Producto fiscal</dt><dd className={`font-bold ${data.mappingFiscalCompleto?'text-emerald-700':'text-amber-700'}`}>{data.mappingFiscalCompleto?'Válido y vinculado':'Pendiente de evidencia'}</dd></div><div><dt className="text-slate-500">Stock total</dt><dd className="font-bold">{data.total}</dd></div></dl>}
  </div>;
}
