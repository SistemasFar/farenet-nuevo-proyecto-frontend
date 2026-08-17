import { useEffect, useState } from 'react';
import { faregasAuditoriaApi, type AuditoriaAccesoFaregas } from '../../services/faregas-auditoria.api';

export function AuditoriaView() {
    const [registros, setRegistros] = useState<AuditoriaAccesoFaregas[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const [evento, setEvento] = useState('');
    const [exitoso, setExitoso] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const cargarAuditoria = async () => {
        try {
            setLoading(true);
            setError('');

            const data = await faregasAuditoriaApi.listarAccesos({
                username,
                evento,
                exitoso,
                fechaInicio,
                fechaFin
            });

            setRegistros(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Error al cargar auditoría.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarAuditoria();
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-gray-800">
                    Auditoría de Accesos
                </h1>
                <p className="text-sm text-gray-500">
                    Consulta de eventos de autenticación y confirmación de sede.
                </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                    <input
                        type="text"
                        placeholder="Usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                    />

                    <select
                        value={evento}
                        onChange={(e) => setEvento(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                    >
                        <option value="">Todos los eventos</option>
                        <option value="LOGIN">LOGIN</option>
                        <option value="CONFIRMAR_PLANTA">CONFIRMAR_PLANTA</option>
                    </select>

                    <select
                        value={exitoso}
                        onChange={(e) => setExitoso(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                    >
                        <option value="">Todos</option>
                        <option value="true">Exitoso</option>
                        <option value="false">Fallido</option>
                    </select>

                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                    />

                    <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                    />
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={cargarAuditoria}
                        disabled={loading}
                        className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <span className="font-semibold text-gray-700">
                        Registros recientes
                    </span>

                    <button
                        type="button"
                        onClick={cargarAuditoria}
                        disabled={loading}
                        className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : 'Actualizar'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Evento</th>
                                <th className="px-4 py-3">Resultado</th>
                                <th className="px-4 py-3">Mensaje</th>
                                <th className="px-4 py-3">Planta</th>
                                <th className="px-4 py-3">IP</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {registros.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        {new Date(item.fecha_evento).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">{item.username || '-'}</td>
                                    <td className="px-4 py-3">{item.evento}</td>
                                    <td className="px-4 py-3">
                                        {item.exitoso ? (
                                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                                Exitoso
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                                Fallido
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{item.mensaje || '-'}</td>
                                    <td className="px-4 py-3">{item.planta_key || '-'}</td>
                                    <td className="px-4 py-3">{item.ip_direccion || '-'}</td>
                                </tr>
                            ))}

                            {!loading && registros.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-6 text-center text-gray-500"
                                    >
                                        No hay registros de auditoría.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
