import { Edit, Power, PowerOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  faregasConfigApi,
  type EmpresaFaregas,
  type Sede
} from '../../../services/faregas-config.api';
import { exportarExcel } from '../../../utils/exportar-excel';

export default function TabEmpresas() {
  const [empresas, setEmpresas] = useState<EmpresaFaregas[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<EmpresaFaregas | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      const [empresasData, sedesData] = await Promise.all([
        faregasConfigApi.obtenerEmpresas(),
        faregasConfigApi.obtenerSedesEmpresas()
      ]);
      setEmpresas(empresasData);
      setSedes(sedesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;
    void Promise.all([faregasConfigApi.obtenerEmpresas(), faregasConfigApi.obtenerSedesEmpresas()])
      .then(([empresasData, sedesData]) => {
        if (!cancelado) { setEmpresas(empresasData); setSedes(sedesData); setError(''); }
      })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar empresas'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const sedesFiltradas = useMemo(() => {
    const texto = buscar.trim().toLowerCase();
    if (!texto) return sedes;
    return sedes.filter((sede) =>
      sede.key.toLowerCase().includes(texto)
      || sede.nombre.toLowerCase().includes(texto)
      || sede.empresa_nombre.toLowerCase().includes(texto)
    );
  }, [buscar, sedes]);

  const asignar = async (sede: Sede, empresaKey: string) => {
    if (empresaKey === sede.empresa_key) return;
    const empresa = empresas.find((item) => item.key === empresaKey);
    if (!empresa || !confirm(`¿Asignar la sede ${sede.nombre} a ${empresa.nombre}?`)) return;
    try {
      await faregasConfigApi.asignarEmpresaSede(sede.key, empresaKey);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al asignar empresa');
    }
  };

  const cambiarEstado = async (empresa: EmpresaFaregas) => {
    const accion = empresa.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} la empresa ${empresa.nombre}?`)) return;
    try {
      await faregasConfigApi.cambiarEstadoEmpresa(empresa.key, !empresa.activo);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar el estado de la empresa');
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Cargando empresas y relaciones históricas...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return <div className="space-y-6">
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <strong>Empresas disponibles y asignación por sede.</strong> Este maestro multiempresa se administra de forma independiente; editarlo aquí no modifica las tablas legacy.
    </div>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div><h3 className="font-bold text-slate-700">Administración de Empresas</h3><p className="text-xs text-slate-500">{empresas.length} empresas registradas</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => exportarExcel('faregas_empresas', 'Empresas', [
          { key: 'codigo', header: 'CÓDIGO', width: 18 },
          { key: 'nombre', header: 'RAZÓN SOCIAL', width: 42 },
          { key: 'ruc', header: 'RUC', width: 18 },
          { key: 'telefono', header: 'TELÉFONO', width: 20 },
          { key: 'sedes', header: 'SEDES', width: 12 }
        ], empresas.map((empresa) => ({ codigo: empresa.key, nombre: empresa.nombre, ruc: empresa.ruc || '', telefono: empresa.telefono || '', sedes: empresa.total_sedes })))} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">↓ Exportar Excel</button><button type="button" onClick={() => setCreando(true)} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">+ Nueva Empresa</button></div>
      </div>
      <div className="max-h-[34vh] overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-white text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Razón social</th><th className="px-4 py-3">RUC</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3 text-center">Sedes</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{empresas.map((empresa) => <tr key={empresa.key} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono font-bold text-[#052A79]">{empresa.key}</td><td className="px-4 py-3 font-semibold">{empresa.nombre}</td><td className="px-4 py-3 font-mono">{empresa.ruc || '—'}</td><td className="px-4 py-3">{empresa.telefono || '—'}</td><td className="px-4 py-3 text-center font-bold">{empresa.total_sedes}</td><td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-bold ${empresa.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{empresa.activo ? 'ACTIVA' : 'INACTIVA'}</span></td><td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => setEditando(empresa)} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 transition-colors"><Edit size={18} /></button><button onClick={() => void cambiarEstado(empresa)} title={empresa.activo ? "Desactivar" : "Activar"} className={empresa.activo ? "rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] hover:bg-red-100 transition-colors" : "rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[#052A79] hover:bg-green-100 transition-colors"}>{empresa.activo ? <PowerOff size={18} /> : <Power size={18} />}</button></div></td></tr>)}</tbody></table></div>
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-slate-700">Empresa asignada por sede</h3><p className="text-xs text-slate-500">Cada sede debe pertenecer exactamente a una empresa.</p></div><input value={buscar} onChange={(event) => setBuscar(event.target.value)} placeholder="Buscar sede o empresa" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:max-w-md" /></div>
      <div className="max-h-[42vh] overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-white text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Sede</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3 text-center">Estado sede</th></tr></thead><tbody className="divide-y divide-slate-100">{sedesFiltradas.map((sede) => <tr key={sede.key} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono">{sede.key}</td><td className="px-4 py-3 font-semibold">{sede.nombre}</td><td className="px-4 py-3"><select value={sede.empresa_key} onChange={(event) => void asignar(sede, event.target.value)} className="w-full min-w-72 rounded-lg border border-slate-300 bg-white p-2"><option value={sede.empresa_key}>{sede.empresa_nombre}</option>{empresas.filter((empresa) => empresa.activo && empresa.key !== sede.empresa_key).map((empresa) => <option key={empresa.key} value={empresa.key}>{empresa.nombre}</option>)}</select></td><td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-bold ${sede.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sede.activo ? 'ACTIVA' : 'INACTIVA'}</span></td></tr>)}</tbody></table></div>
    </section>

    {editando && <EmpresaModal empresa={editando} onClose={() => setEditando(null)} onSaved={async () => { setEditando(null); await cargar(); }} />}
    {creando && <NuevaEmpresaModal onClose={() => setCreando(false)} onSaved={async () => { setCreando(false); await cargar(); }} />}
  </div>;
}

function NuevaEmpresaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ key: '', nombre: '', ruc: '', direccion: '', telefono: '', cuenta_banco_nacion: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    try { setSaving(true); setError(''); await faregasConfigApi.crearEmpresa(form); await onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al crear empresa'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-bold text-[#052A79]">Nueva Empresa</h3><p className="mb-5 text-sm text-slate-500">La empresa será propia de FAREGAS y se creará activa.</p><form onSubmit={guardar} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Código</label><input required maxLength={30} value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} className="w-full rounded-lg border border-slate-300 p-2.5 font-mono font-bold" placeholder="EMPRESA_NUEVA" /></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">RUC</label><input inputMode="numeric" maxLength={11} value={form.ruc} onChange={(event) => setForm({ ...form, ruc: event.target.value.replace(/\D/g, '') })} className="w-full rounded-lg border border-slate-300 p-2.5 font-mono" /></div></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Razón social</label><input required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5" /></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Dirección</label><input value={form.direccion} onChange={(event) => setForm({ ...form, direccion: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5" /></div><div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Teléfono</label><input value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5" /></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Cuenta Banco de la Nación</label><input value={form.cuenta_banco_nacion} onChange={(event) => setForm({ ...form, cuenta_banco_nacion: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5 font-mono" /></div></div>{error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={saving} className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Creando...' : 'Crear Empresa'}</button></div></form></div></div>;
}

function EmpresaModal({ empresa, onClose, onSaved }: { empresa: EmpresaFaregas; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ nombre: empresa.nombre, ruc: empresa.ruc || '', direccion: empresa.direccion || '', telefono: empresa.telefono || '', cuenta_banco_nacion: empresa.cuenta_banco_nacion || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    try { setSaving(true); setError(''); await faregasConfigApi.editarEmpresa(empresa.key, form); await onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al editar empresa'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-bold text-[#052A79]">Editar Empresa</h3><p className="mb-5 text-sm text-slate-500">Código inmutable: <span className="font-mono font-bold">{empresa.key}</span></p><form onSubmit={guardar} className="space-y-4"><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Razón social</label><input required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5" /></div><div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">RUC</label><input inputMode="numeric" maxLength={11} value={form.ruc} onChange={(event) => setForm({ ...form, ruc: event.target.value.replace(/\D/g, '') })} className="w-full rounded-lg border border-slate-300 p-2.5 font-mono" /></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Teléfono</label><input value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5" /></div></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Dirección</label><input value={form.direccion} onChange={(event) => setForm({ ...form, direccion: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5" /></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Cuenta Banco de la Nación</label><input value={form.cuenta_banco_nacion} onChange={(event) => setForm({ ...form, cuenta_banco_nacion: event.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5 font-mono" /></div>{error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={saving} className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Empresa'}</button></div></form></div></div>;
}
