import { useEffect, useState } from 'react';
import { faregasAuditoriaApi, type AuditoriaAccesoFaregas } from '../../services/faregas-auditoria.api';

const MODULOS = [
    { clave: 'INICIO', nombre: 'INICIO' },
    { clave: 'USUARIOS', nombre: 'USUARIOS' },
    { clave: 'DESCUENTOS', nombre: 'DESCUENTOS' },
    { clave: 'CONFIGURACION', nombre: 'CONFIGURACIÓN' },
    { clave: 'ACCESOS', nombre: 'ACCESOS' }
];

const ACCIONES: Record<string, string> = {
    LOGIN: 'Inició sesión en FAREGAS',
    CONFIRMAR_PLANTA: 'Seleccionó la sede de trabajo',
    BORRADOR_CREADO: 'Creó un nuevo borrador de certificado',
    DATOS_INICIALES_GUARDADOS: 'Guardó los datos iniciales del certificado',
    PASO_ACTUALIZADO: 'Avanzó el certificado al siguiente paso',
    VEHICULO_GUARDADO: 'Guardó los datos técnicos del vehículo',
    TITULAR_AGREGADO: 'Agregó un titular al certificado',
    TITULAR_ACTUALIZADO: 'Actualizó un titular del certificado',
    TITULAR_ELIMINADO: 'Eliminó un titular del certificado',
    DATOS_GLP_GUARDADOS: 'Guardó la información GLP',
    COMPONENTES_GLP_GUARDADOS: 'Guardó los componentes GLP',
    VERIFICACIONES_GLP_GUARDADAS: 'Guardó las verificaciones GLP',
    DATOS_GNV_GUARDADOS: 'Guardó la información GNV',
    COMPONENTES_GNV_GUARDADOS: 'Guardó los componentes GNV',
    VERIFICACIONES_GNV_GUARDADAS: 'Guardó las verificaciones GNV',
    CONFORMIDAD_GUARDADA: 'Guardó los datos de conformidad',
    PAGOS_GUARDADOS: 'Registró los pagos del certificado',
    DESCUENTO_APLICADO: 'Aplicó un descuento al certificado',
    DESCUENTO_QUITADO: 'Retiró el descuento del certificado',
    FACTURACION_GUARDADA: 'Guardó los datos de facturación',
    COMPROBANTE_EMITIDO: 'Procesó la emisión del comprobante',
    PREVISUALIZACION_CONSULTADA: 'Revisó la previsualización del certificado',
    EMISION_VALIDADA: 'Validó el certificado antes de emitirlo',
    CERTIFICADO_EMITIDO: 'Emitió el certificado definitivo',
    USUARIO_CREADO: 'Creó un nuevo usuario',
    USUARIO_ACTUALIZADO: 'Actualizó un usuario',
    USUARIO_DESACTIVADO: 'Desactivó un usuario',
    PASSWORD_ACTUALIZADO: 'Cambió la contraseña de un usuario',
    PERFIL_CREADO: 'Creó un perfil de usuario',
    PERFIL_ACTUALIZADO: 'Actualizó un perfil de usuario',
    PERFIL_DESACTIVADO: 'Desactivó un perfil de usuario',
    DESCUENTO_CREADO: 'Creó un nuevo descuento',
    DESCUENTO_ACTUALIZADO: 'Actualizó un descuento',
    DESCUENTO_ESTADO_ACTUALIZADO: 'Cambió el estado de un descuento',
    REGLAS_DESCUENTO_GUARDADAS: 'Guardó el alcance y beneficio de un descuento',
    CODIGO_DESCUENTO_CREADO: 'Creó un código de descuento',
    CODIGO_DESCUENTO_ACTUALIZADO: 'Actualizó un código de descuento',
    CODIGO_DESCUENTO_ESTADO: 'Cambió el estado de un código de descuento'
};

const ETIQUETAS_DATOS: Record<string, string> = {
    cantidadPagos: 'Cantidad de pagos', importePagado: 'Importe pagado',
    saldoPendiente: 'Saldo pendiente', estadoOrden: 'Estado del pago',
    tipoComprobante: 'Tipo de comprobante', comprobante: 'Comprobante',
    estado: 'Estado', cantidad: 'Cantidad', pasoActual: 'Paso',
    numeroCertificado: 'Número de certificado', valido: 'Validación',
    importeDescuento: 'Descuento', tipoCalculo: 'Tipo de descuento',
    tarifaCodigo: 'Servicio', ruta: 'Sección', metodo: 'Operación'
};

const nombreModulo = (categoria: string) => {
    if (['CERTIFICADO', 'PAGO', 'FACTURACION'].includes(categoria)) return 'INICIO';
    if (categoria === 'DESCUENTO') return 'DESCUENTOS';
    if (categoria === 'CONFIGURACION') return 'CONFIGURACIÓN';
    if (categoria === 'ACCESO') return 'ACCESOS';
    return categoria || 'OTROS';
};

const accion = (item: AuditoriaAccesoFaregas) => ACCIONES[item.evento] || item.mensaje || item.evento.replaceAll('_', ' ');

const referencia = (item: AuditoriaAccesoFaregas) => {
    if (item.numero_certificado) return item.numero_certificado;
    if (item.certificado_id) return `Borrador #${item.certificado_id}${item.placa ? ` · ${item.placa}` : ''}`;
    if (item.entidad_id) return `Registro #${item.entidad_id}`;
    return '-';
};

export function AuditoriaView() {
    const [registros, setRegistros] = useState<AuditoriaAccesoFaregas[]>([]);
    const [seleccionado, setSeleccionado] = useState<AuditoriaAccesoFaregas | null>(null);
    const [modulo, setModulo] = useState('INICIO');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [buscar, setBuscar] = useState('');
    const [username, setUsername] = useState('');
    const [exitoso, setExitoso] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const cargarAuditoria = async (moduloSeleccionado = modulo, filtrosLimpios = false) => {
        try {
            setLoading(true);
            setError('');
            setRegistros(await faregasAuditoriaApi.listarAccesos({
                modulo: moduloSeleccionado,
                buscar: filtrosLimpios ? '' : buscar,
                username: filtrosLimpios ? '' : username,
                exitoso: filtrosLimpios ? '' : exitoso,
                fechaInicio: filtrosLimpios ? '' : fechaInicio,
                fechaFin: filtrosLimpios ? '' : fechaFin
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar auditoría.');
        } finally {
            setLoading(false);
        }
    };

    const seleccionarModulo = (nuevoModulo: string) => {
        setModulo(nuevoModulo);
        void cargarAuditoria(nuevoModulo);
    };

    const limpiar = () => {
        setBuscar('');
        setUsername('');
        setExitoso('');
        setFechaInicio('');
        setFechaFin('');
        void cargarAuditoria(modulo, true);
    };

    useEffect(() => {
        let activo = true;
        faregasAuditoriaApi.listarAccesos({ modulo: 'INICIO' })
            .then((data) => { if (activo) setRegistros(data); })
            .catch((err: unknown) => { if (activo) setError(err instanceof Error ? err.message : 'Error al cargar auditoría.'); })
            .finally(() => { if (activo) setLoading(false); });
        return () => { activo = false; };
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-gray-800">Auditoría FAREGAS</h1>
                <p className="text-sm text-gray-500">Consulta quién realizó cada operación dentro del sistema.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-3 border-b border-gray-200 lg:grid-cols-6">
                    {MODULOS.map((item) => (
                        <button
                            key={item.clave}
                            type="button"
                            onClick={() => seleccionarModulo(item.clave)}
                            className={`border-b-2 px-3 py-3 text-xs font-bold transition ${modulo === item.clave ? 'border-[#0B57FF] bg-blue-50 text-[#052A79]' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                        >
                            {item.nombre}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
                        <input type="text" placeholder="Buscar certificado, borrador, placa o descripción" value={buscar} onChange={(e) => setBuscar(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79] lg:col-span-2" />
                        <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]" />
                        <select value={exitoso} onChange={(e) => setExitoso(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]">
                            <option value="">Todos los resultados</option><option value="true">Completado</option><option value="false">No completado</option>
                        </select>
                        <input aria-label="Fecha desde" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]" />
                        <input aria-label="Fecha hasta" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]" />
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => void cargarAuditoria()} disabled={loading} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Buscando...' : 'Buscar'}</button>
                        <button type="button" onClick={limpiar} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Limpiar</button>
                    </div>
                </div>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div><div className="font-semibold text-gray-700">Actividad registrada</div><div className="text-xs text-gray-500">{registros.length} registros encontrados</div></div>
                    <button type="button" onClick={() => void cargarAuditoria()} disabled={loading} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Actualizar</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>
                            <th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Qué hizo</th><th className="px-4 py-3">Módulo</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Sede</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3">Detalle</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {registros.map((item) => <tr key={item.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-4 py-3">{new Date(item.fecha_evento).toLocaleString('es-PE')}</td>
                                <td className="px-4 py-3 font-semibold text-gray-800">{item.username || '-'}</td>
                                <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{item.perfil || '-'}</span></td>
                                <td className="px-4 py-3 text-gray-800">{accion(item)}</td>
                                <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#052A79]">{nombreModulo(item.categoria)}</span></td>
                                <td className="whitespace-nowrap px-4 py-3 font-medium text-[#052A79]">{referencia(item)}</td>
                                <td className="px-4 py-3">{item.planta_key || '-'}</td>
                                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.exitoso ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.exitoso ? 'Completado' : 'No completado'}</span></td>
                                <td className="px-4 py-3"><button type="button" onClick={() => setSeleccionado(item)} className="font-semibold text-[#052A79] hover:underline">Ver</button></td>
                            </tr>)}
                            {!loading && registros.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No hay actividad registrada en este módulo.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {seleccionado && <DetalleEvento item={seleccionado} cerrar={() => setSeleccionado(null)} />}
        </div>
    );
}

function DetalleEvento({ item, cerrar }: { item: AuditoriaAccesoFaregas; cerrar: () => void }) {
    const datos = Object.entries(item.datos || {}).filter(([clave]) => ETIQUETAS_DATOS[clave]);
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={cerrar}>
        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-bold text-gray-900">Detalle de la actividad</h2><p className="text-sm text-gray-500">{accion(item)}</p></div><button type="button" aria-label="Cerrar" onClick={cerrar} className="text-2xl text-gray-500">×</button></div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
                <Dato titulo="Fecha" valor={new Date(item.fecha_evento).toLocaleString('es-PE')} /><Dato titulo="Usuario" valor={item.username || '-'} />
                <Dato titulo="Perfil" valor={item.perfil} /><Dato titulo="Módulo" valor={nombreModulo(item.categoria)} />
                <Dato titulo="Resultado" valor={item.exitoso ? 'Completado' : 'No completado'} /><Dato titulo="Referencia" valor={referencia(item)} />
                <Dato titulo="Sede" valor={item.planta_key} />
                {item.placa && <Dato titulo="Placa" valor={item.placa} />}{item.tipo_certificado && <Dato titulo="Tipo de certificado" valor={item.tipo_certificado} />}
                <div className="sm:col-span-2"><Dato titulo="Descripción" valor={item.mensaje || accion(item)} /></div>
                {datos.map(([clave, valor]) => <Dato key={clave} titulo={ETIQUETAS_DATOS[clave]} valor={typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor ?? '-')} />)}
            </div>
            <div className="flex justify-end border-t border-gray-200 p-4"><button type="button" onClick={cerrar} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">Cerrar</button></div>
        </div>
    </div>;
}

function Dato({ titulo, valor }: { titulo: string; valor?: string | null }) {
    return <div><div className="text-xs font-semibold uppercase text-gray-500">{titulo}</div><div className="mt-1 break-words text-sm text-gray-800">{valor || '-'}</div></div>;
}
