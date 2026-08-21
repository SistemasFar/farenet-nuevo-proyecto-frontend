import { useState, useEffect } from 'react';

type Servicio = {
    id: number;
    codigo: string;
    nombre: string;
    familia: string;
    tipo_certificado_clave: string | null;
    modalidad: string | null;
    requiere_certificado: boolean;
    requiere_vehiculo: boolean;
    activo: boolean;
    orden: number;
};

const BASE_CERTS = [
    { label: 'GNV Inicial', clave: 'GNV_ANUAL', mod: 'INICIAL' },
    { label: 'GNV Anual', clave: 'GNV_ANUAL', mod: 'ANUAL' },
    { label: 'GLP Inicial', clave: 'GLP_ANUAL', mod: 'INICIAL' },
    { label: 'GLP Anual', clave: 'GLP_ANUAL', mod: 'ANUAL' },
    { label: 'Conformidad', clave: 'CONFORMIDAD', mod: null },
];

export default function TabServicios() {
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const [form, setForm] = useState({
        codigo: '',
        nombre: '',
        familia: 'GLP',
        requiere_certificado: true,
        base_id: 2, // Default to GLP Inicial
        requiere_vehiculo: true,
        orden: 10
    });

    const fetchServicios = async () => {
        try {
            const token = JSON.parse(sessionStorage.getItem('faregasToken') || 'null');
            const res = await fetch('/api/faregas/config/servicios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setServicios(data.servicios);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServicios();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            const token = JSON.parse(sessionStorage.getItem('faregasToken') || 'null');
            
            const baseCert = BASE_CERTS[form.base_id];
            
            const payload = {
                codigo: form.codigo,
                nombre: form.nombre,
                familia: form.familia,
                requiere_certificado: form.requiere_certificado,
                tipo_certificado_clave: form.requiere_certificado ? baseCert.clave : null,
                modalidad: form.requiere_certificado ? baseCert.mod : null,
                requiere_vehiculo: form.requiere_vehiculo,
                orden: form.orden
            };

            const url = editId ? `/api/faregas/config/servicios/${editId}` : '/api/faregas/config/servicios';
            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setShowModal(false);
                fetchServicios();
            } else {
                setErrorMsg(data.message);
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Error guardando servicio');
        }
    };

    const toggleEstado = async (id: number, activoActual: boolean) => {
        try {
            const token = JSON.parse(sessionStorage.getItem('faregasToken') || 'null');
            const res = await fetch(`/api/faregas/config/servicios/${id}/estado`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ activo: !activoActual })
            });
            if (res.ok) fetchServicios();
        } catch (e) {
            console.error(e);
        }
    };

    const openCreate = () => {
        setEditId(null);
        setForm({ codigo: '', nombre: '', familia: 'GLP', requiere_certificado: true, base_id: 2, requiere_vehiculo: true, orden: 10 });
        setErrorMsg('');
        setShowModal(true);
    };

    const openEdit = (s: Servicio) => {
        setEditId(s.id);
        
        let base_id = 0;
        if (s.requiere_certificado && s.tipo_certificado_clave) {
            const idx = BASE_CERTS.findIndex(b => b.clave === s.tipo_certificado_clave && b.mod === s.modalidad);
            if (idx >= 0) base_id = idx;
        }

        setForm({ 
            codigo: s.codigo, 
            nombre: s.nombre, 
            familia: s.familia, 
            requiere_certificado: s.requiere_certificado, 
            base_id, 
            requiere_vehiculo: s.requiere_vehiculo, 
            orden: s.orden || 0 
        });
        setErrorMsg('');
        setShowModal(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">SERVICIOS COMERCIALES</h2>
                <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
                    + NUEVO SERVICIO
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">Cargando...</div>
            ) : (
                <div className="overflow-x-auto bg-white border border-slate-200 rounded">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-4 py-3">CÓDIGO</th>
                                <th className="px-4 py-3">NOMBRE</th>
                                <th className="px-4 py-3">FAMILIA</th>
                                <th className="px-4 py-3">CERTIFICADO BASE</th>
                                <th className="px-4 py-3">ESTADO</th>
                                <th className="px-4 py-3">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {servicios.map(s => {
                                let baseLabel = '-';
                                if (s.requiere_certificado) {
                                    const b = BASE_CERTS.find(c => c.clave === s.tipo_certificado_clave && c.mod === s.modalidad);
                                    if (b) baseLabel = b.label;
                                }

                                return (
                                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-xs">{s.codigo}</td>
                                        <td className="px-4 py-3 font-medium">{s.nombre}</td>
                                        <td className="px-4 py-3">{s.familia}</td>
                                        <td className="px-4 py-3">{baseLabel}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${s.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {s.activo ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 space-x-2">
                                            <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline">Editar</button>
                                            <button onClick={() => toggleEstado(s.id, s.activo)} className={`${s.activo ? 'text-red-600' : 'text-green-600'} hover:underline`}>
                                                {s.activo ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">{editId ? 'EDITAR SERVICIO' : 'NUEVO SERVICIO'}</h3>
                        
                        {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{errorMsg}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Código Técnico</label>
                                <input required type="text" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})} disabled={!!editId} className="w-full border rounded px-3 py-2 disabled:bg-slate-100 uppercase" />
                                {!editId && <p className="text-xs text-slate-500 mt-1">Solo lectura después de creado.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nombre Comercial</label>
                                <input required type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Familia</label>
                                <select value={form.familia} onChange={e => setForm({...form, familia: e.target.value})} className="w-full border rounded px-3 py-2">
                                    <option value="GLP">GLP</option>
                                    <option value="GNV">GNV</option>
                                    <option value="CONFORMIDAD">CONFORMIDAD</option>
                                    <option value="OTROS">OTROS</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center space-x-2 pt-2">
                                <input type="checkbox" id="reqC" checked={form.requiere_certificado} onChange={e => setForm({...form, requiere_certificado: e.target.checked})} />
                                <label htmlFor="reqC" className="font-semibold text-sm">Genera Certificado</label>
                            </div>

                            {form.requiere_certificado && (
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Certificado Base (Template)</label>
                                    <select value={form.base_id} onChange={e => setForm({...form, base_id: parseInt(e.target.value)})} className="w-full border rounded px-3 py-2">
                                        {BASE_CERTS.map((b, i) => (
                                            <option key={i} value={i}>{b.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center space-x-2 pt-2">
                                <input type="checkbox" id="reqV" checked={form.requiere_vehiculo} onChange={e => setForm({...form, requiere_vehiculo: e.target.checked})} />
                                <label htmlFor="reqV" className="font-semibold text-sm">Requiere Vehículo (Datos técnicos)</label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1">Orden de visualización</label>
                                <input type="number" min="0" value={form.orden} onChange={e => setForm({...form, orden: parseInt(e.target.value) || 0})} className="w-full border rounded px-3 py-2" />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
