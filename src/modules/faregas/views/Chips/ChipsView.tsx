import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Boxes, Cpu } from 'lucide-react';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { faregasChipsApi, type Chip, type ChipResumen } from '../../services/faregas-chips.api';
import { ChipScannerInput, parseChipScan } from './ChipScannerInput';

const empty:ChipResumen={total:0,disponibles:0,reservados:0,vendidos:0,baja:0,precio:180,stockPermitido:false,ventaHabilitada:false,mappingFiscalCompleto:false};
export function ChipsView(){
  const {plantaNombre,plantasDisponibles}=useOutletContext<MainLayoutContext>();
  const [activeTab,setActiveTab]=useState<'INVENTARIO'|'PRODUCTOS'>('INVENTARIO');
  const [resumen,setResumen]=useState(empty); const [chips,setChips]=useState<Chip[]>([]); const [scan,setScan]=useState('');
  const [modo,setModo]=useState<'INGRESO'|'TRANSFERENCIA'>('INGRESO'); const [destino,setDestino]=useState(''); const [buscar,setBuscar]=useState('');
  const [mensaje,setMensaje]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProductSedes, setNewProductSedes] = useState<string[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [newProductTipo, setNewProductTipo] = useState('Accesorio de Chip (Porta chip, etiquetas)');
  const [extraProductos, setExtraProductos] = useState<{nombre: string, sedes: string[], tipo: string}[]>([]);
  const [selectedProductToEnter, setSelectedProductToEnter] = useState('CHIP');
  const [localChipProducts, setLocalChipProducts] = useState<Record<string, string>>(() => JSON.parse(sessionStorage.getItem('fakeChipProducts') || '{}'));
  const parsed=useMemo(()=>parseChipScan(scan),[scan]);
  const cargar=useCallback(async()=>{try{const [r,l]=await Promise.all([faregasChipsApi.resumen(),faregasChipsApi.listar({buscar})]);setResumen(r);setChips(l.items);}catch(e:any){setError(e.message);}},[buscar]);
  useEffect(()=>{cargar();},[cargar]);
  const confirmar=async()=>{setError('');setMensaje(''); if(!parsed.validos.length||parsed.duplicados.length||parsed.errores.length){setError('Corrija duplicados o lecturas inválidas antes de confirmar.');return;}
    try{setLoading(true); if(modo==='INGRESO') { await faregasChipsApi.ingresar(parsed.validos); if (selectedProductToEnter !== 'CHIP') { const newMappings = { ...localChipProducts }; parsed.validos.forEach(num => { newMappings[num] = selectedProductToEnter; }); setLocalChipProducts(newMappings); sessionStorage.setItem('fakeChipProducts', JSON.stringify(newMappings)); } } else {if(!destino)throw new Error('Seleccione la sede destino.');await faregasChipsApi.transferir(destino,parsed.validos);}
      setMensaje(`${parsed.validos.length} chip(s) procesados correctamente.`);setScan('');await cargar();
    }catch(e:any){setError(e.message);}finally{setLoading(false);}};
  const cards=[['Total',resumen.total],['Disponibles',resumen.disponibles],['Reservados',resumen.reservados],['Vendidos',resumen.vendidos],['Baja',resumen.baja]];
  return <div className="space-y-5">
    <div><h1 className="text-xl font-bold text-slate-900">Chips</h1><p className="text-sm text-slate-500">Inventario y configuración del producto físico para la sede {plantaNombre}.</p></div>

    <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-200 p-1 sm:grid-cols-2">
      <button type="button" onClick={()=>setActiveTab('INVENTARIO')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab==='INVENTARIO'?'bg-[#052A79] text-white shadow':'text-slate-600 hover:bg-white'}`}><Cpu size={17}/> INVENTARIO DE CHIPS</button>
      <button type="button" onClick={()=>setActiveTab('PRODUCTOS')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab==='PRODUCTOS'?'bg-[#052A79] text-white shadow':'text-slate-600 hover:bg-white'}`}><Boxes size={17}/> PRODUCTOS INVENTARIABLES</button>
    </div>

    {activeTab==='PRODUCTOS'&&<div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <div>
          <p className="font-bold">Productos físicos con control de stock</p>
          <p className="mt-1">Aquí se consulta la configuración comercial, fiscal y de inventario correspondiente a la sede seleccionada.</p>
        </div>
        <button 
          onClick={() => setShowProductModal(true)} 
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow hover:bg-blue-700 transition"
        >
          AGREGAR NUEVO PRODUCTO
        </button>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-bold text-[#052A79]">Chip y porta chip</h2><p className="text-sm text-slate-500">Producto físico serializado. El dato tributario se administra en Productos fiscales.</p></div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
          <div><dt className="text-slate-500">Precio sede</dt><dd className="font-bold">S/ {resumen.precio.toFixed(2)}</dd></div>
          <div><dt className="text-slate-500">Stock permitido</dt><dd className={`font-bold ${resumen.stockPermitido?'text-emerald-700':'text-red-700'}`}>{resumen.stockPermitido?'Sí':'No'}</dd></div>
          <div><dt className="text-slate-500">Venta habilitada</dt><dd className={`font-bold ${resumen.ventaHabilitada?'text-emerald-700':'text-amber-700'}`}>{resumen.ventaHabilitada?'Sí':'No'}</dd></div>
          <div><dt className="text-slate-500">Producto fiscal</dt><dd className={`font-bold ${resumen.mappingFiscalCompleto?'text-emerald-700':'text-amber-700'}`}>{resumen.mappingFiscalCompleto?'Válido y vinculado':'Pendiente de evidencia'}</dd></div>
          <div><dt className="text-slate-500">Stock total</dt><dd className="font-bold">{resumen.total}</dd></div>
        </dl>
      </section>

      {extraProductos.map((prod, index) => (
        <section key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#052A79] uppercase">{prod.nombre}</h2>
            <p className="text-sm text-slate-500">Tipo: <b>{prod.tipo}</b> (Datos locales provisionales)</p>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
            <div><dt className="text-slate-500">Precio sede</dt><dd className="font-bold">S/ 0.00</dd></div>
            <div><dt className="text-slate-500">Stock permitido</dt><dd className="font-bold text-emerald-700">Sí</dd></div>
            <div><dt className="text-slate-500">Venta habilitada</dt><dd className="font-bold text-emerald-700">Sí</dd></div>
            <div><dt className="text-slate-500">Sedes disp.</dt><dd className="font-bold">{prod.sedes.length} sedes</dd></div>
            <div><dt className="text-slate-500">Stock total</dt><dd className="font-bold">0</dd></div>
          </dl>
        </section>
      ))}
    </div>}

    {activeTab==='INVENTARIO'&&<>
      {!resumen.ventaHabilitada&&<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><b>Venta de Chips no habilitada.</b> Esta sede puede administrar stock, pero no vender hasta contar con autorización comercial y un producto fiscal válido.</div>}
      {!resumen.stockPermitido&&<div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"><b>Stock no habilitado.</b> La sede no puede recibir ni reservar Chips.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map(([label,value])=><div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-[#052A79]">{value}</div></div>)}</div>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex gap-2"><button onClick={()=>setModo('INGRESO')} className={`rounded px-3 py-2 text-xs font-bold ${modo==='INGRESO'?'bg-[#052A79] text-white':'bg-slate-100'}`}>Ingresar stock</button><button onClick={()=>setModo('TRANSFERENCIA')} className={`rounded px-3 py-2 text-xs font-bold ${modo==='TRANSFERENCIA'?'bg-[#052A79] text-white':'bg-slate-100'}`}>Transferir</button></div>
          {modo==='TRANSFERENCIA'&&<select value={destino} onChange={e=>setDestino(e.target.value)} className="mb-3 w-full rounded border border-slate-300 p-2 text-sm"><option value="">Seleccione sede destino</option>{plantasDisponibles.map(p=><option key={p.key} value={p.key}>{p.nombre}</option>)}</select>}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-bold text-slate-700">Producto a {modo === 'INGRESO' ? 'ingresar' : 'transferir'}</label>
            <select value={selectedProductToEnter} onChange={e => setSelectedProductToEnter(e.target.value)} className="w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="CHIP">Chip y porta chip (Serializado)</option>
              {extraProductos.map((p, i) => <option key={i} value={p.nombre}>{p.nombre}</option>)}
            </select>
          </div>
          <ChipScannerInput value={scan} onChange={setScan}/>{error&&<p className="mt-3 text-sm text-red-700">{error}</p>}{mensaje&&<p className="mt-3 text-sm text-emerald-700">{mensaje}</p>}
          <button disabled={loading || !resumen.stockPermitido} onClick={confirmar} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50">{loading?'Procesando...':'Confirmar'}</button>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-200 p-4"><h2 className="font-bold">Chips registrados</h2><input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar número" className="ml-auto rounded border border-slate-300 px-3 py-2 text-sm"/></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>{modo==='TRANSFERENCIA'&&<th className="p-3 w-10"></th>}<th className="p-3">Número</th><th className="p-3">Producto / Tipo</th><th className="p-3">Estado</th><th className="p-3">Sede</th><th className="p-3">Ingreso</th><th className="p-3">Último movimiento</th></tr></thead><tbody>{chips.map(c=><tr key={c.id} className="border-t border-slate-100">{modo==='TRANSFERENCIA'&&<td className="p-3"><input type="checkbox" disabled={c.estado!=='DISPONIBLE'} checked={scan.includes(c.numero_chip)} onChange={e=>{if(e.target.checked){setScan(prev=>prev?`${prev}\n${c.numero_chip}`:c.numero_chip);}else{setScan(prev=>prev.split('\n').map(x=>x.trim()).filter(x=>x&&x!==c.numero_chip).join('\n'));}}} className="rounded border-slate-300 text-[#052A79] focus:ring-[#052A79]"/></td>}<td className="p-3 font-mono font-bold">{c.numero_chip}</td><td className="p-3">{localChipProducts[c.numero_chip] || (c as any).producto_nombre || 'Chip y porta chip'}</td><td className="p-3">{c.estado}</td><td className="p-3">{c.planta_nombre}</td><td className="p-3">{new Date(c.creado_en).toLocaleString()}</td><td className="p-3">{c.ultimo_movimiento?new Date(c.ultimo_movimiento).toLocaleString():'-'}</td></tr>)}{!chips.length&&<tr><td colSpan={modo==='TRANSFERENCIA'?7:6} className="p-10 text-center text-slate-400">No hay chips registrados.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </>}
    
    {showProductModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold text-slate-900">Agregar Nuevo Producto Inventariable</h2>
            <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5">
            <div className="mb-4">
              <label className="mb-1 block text-sm font-bold text-slate-700">Tipo de Producto</label>
              <select 
                value={newProductTipo}
                onChange={(e) => setNewProductTipo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Accesorio de Chip (Porta chip, etiquetas)">Accesorio de Chip (Porta chip, etiquetas)</option>
                <option value="Dispositivo de lectura (Escáner, antena)">Dispositivo de lectura (Escáner, antena)</option>
                <option value="Material publicitario (Banners, afiches)">Material publicitario (Banners, afiches)</option>
                <option value="Otro producto físico general">Otro producto físico general</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Define la relación de este producto con el inventario del módulo de Chips.</p>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-bold text-slate-700">Nombre del Producto</label>
              <input 
                type="text" 
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Ej. Porta chip acrílico, Lector RFID..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Sedes Disponibles</label>
              <p className="mb-3 text-xs text-slate-500">Seleccione las sedes de Faregas donde este producto estará disponible.</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                {plantasDisponibles.map(planta => (
                  <label key={planta.key} className="flex items-center gap-2 rounded p-2 text-sm hover:bg-slate-200">
                    <input 
                      type="checkbox" 
                      checked={newProductSedes.includes(planta.key)}
                      onChange={(e) => {
                        if (e.target.checked) setNewProductSedes([...newProductSedes, planta.key]);
                        else setNewProductSedes(newProductSedes.filter(k => k !== planta.key));
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {planta.nombre}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 rounded-b-2xl bg-slate-50 p-5">
            <button onClick={() => setShowProductModal(false)} disabled={savingProduct} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
            <button 
              onClick={async () => {
                try {
                  setSavingProduct(true);
                  await faregasChipsApi.crearProductoInventariable(newProductName, newProductSedes);
                  setExtraProductos(prev => [...prev, { nombre: newProductName, sedes: newProductSedes, tipo: newProductTipo }]);
                  alert('Producto guardado correctamente.');
                  setShowProductModal(false);
                  setNewProductName('');
                  setNewProductSedes([]);
                  setNewProductTipo('Accesorio de Chip (Porta chip, etiquetas)');
                } catch (e: any) {
                  alert('Error al guardar el producto: ' + e.message);
                } finally {
                  setSavingProduct(false);
                }
              }} 
              disabled={!newProductName || newProductSedes.length === 0 || savingProduct}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {savingProduct ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
