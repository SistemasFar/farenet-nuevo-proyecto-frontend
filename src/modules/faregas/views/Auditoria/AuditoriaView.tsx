import { useEffect, useState, useMemo } from 'react';
import { Eye, Download, Search, RotateCcw, AlertTriangle, Layers } from 'lucide-react';
import { Paginacion } from '../components/Paginacion';
import { faregasAuditoriaApi, type AuditoriaAccesoFaregas } from '../../services/faregas-auditoria.api';

type GrupoModulo = 'TODOS' | 'OPERACIONES' | 'FACTURACION_PAGOS' | 'INVENTARIO' | 'ADMINISTRACION' | 'CONFIGURACION';

interface ModuloItem {
    clave: string;
    nombre: string;
    grupo: GrupoModulo;
}

const GRUPOS: Array<{ clave: GrupoModulo; nombre: string }> = [
    { clave: 'TODOS', nombre: 'TODOS' },
    { clave: 'OPERACIONES', nombre: 'OPERACIONES' },
    { clave: 'FACTURACION_PAGOS', nombre: 'FACTURACIÓN Y PAGOS' },
    { clave: 'INVENTARIO', nombre: 'INVENTARIO' },
    { clave: 'ADMINISTRACION', nombre: 'ADMINISTRACIÓN' },
    { clave: 'CONFIGURACION', nombre: 'CONFIGURACIÓN Y ACCESOS' }
];

const MODULOS: ModuloItem[] = [
    { clave: 'TODOS', nombre: 'Todos los módulos', grupo: 'TODOS' },
    // Operaciones
    { clave: 'INICIO', nombre: 'Inicio y operaciones generales', grupo: 'OPERACIONES' },
    { clave: 'CERTIFICADOS', nombre: 'Certificados emitidos', grupo: 'OPERACIONES' },
    { clave: 'BORRADORES', nombre: 'Borradores de certificados', grupo: 'OPERACIONES' },
    { clave: 'DUPLICADOS', nombre: 'Duplicados de certificados', grupo: 'OPERACIONES' },
    { clave: 'RECTIFICACIONES', nombre: 'Rectificaciones', grupo: 'OPERACIONES' },
    // Facturación y Pagos
    { clave: 'FACTURACION', nombre: 'Facturación electrónica', grupo: 'FACTURACION_PAGOS' },
    { clave: 'NOTAS_CREDITO', nombre: 'Notas de crédito', grupo: 'FACTURACION_PAGOS' },
    { clave: 'ANULACIONES', nombre: 'Anulaciones de comprobantes', grupo: 'FACTURACION_PAGOS' },
    { clave: 'PAGOS', nombre: 'Pagos y cobranzas', grupo: 'FACTURACION_PAGOS' },
    { clave: 'CREDITOS', nombre: 'Créditos y cuotas', grupo: 'FACTURACION_PAGOS' },
    // Inventario
    { clave: 'INVENTARIO', nombre: 'Inventario y chips', grupo: 'INVENTARIO' },
    // Administración
    { clave: 'USUARIOS', nombre: 'Usuarios del sistema', grupo: 'ADMINISTRACION' },
    { clave: 'PERFILES', nombre: 'Perfiles y permisos', grupo: 'ADMINISTRACION' },
    { clave: 'SOLICITUDES', nombre: 'Solicitudes administrativas', grupo: 'ADMINISTRACION' },
    { clave: 'MULTISEDE', nombre: 'Operaciones multisede', grupo: 'ADMINISTRACION' },
    // Configuración y Accesos
    { clave: 'DESCUENTOS', nombre: 'Reglas y códigos de descuento', grupo: 'CONFIGURACION' },
    { clave: 'CONFIGURACION', nombre: 'Configuración general', grupo: 'CONFIGURACION' },
    { clave: 'ACCESOS', nombre: 'Accesos y sesiones', grupo: 'CONFIGURACION' }
];

const ACCIONES: Record<string, string> = {
    // Sesión y accesos
    LOGIN: 'Inició sesión en FAREGAS',
    LOGOUT: 'Cerró sesión en FAREGAS',
    CONFIRMAR_PLANTA: 'Seleccionó la sede de trabajo',
    CAMBIO_PLANTA: 'Cambió de sede operativa',
    PASSWORD_PROPIO_CAMBIADO: 'Actualizó su propia contraseña',
    
    // Certificados
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
    PREVISUALIZACION_CONSULTADA: 'Revisó la previsualización del certificado',
    EMISION_VALIDADA: 'Validó el certificado antes de emitirlo',
    CERTIFICADO_NUMERO_ASIGNADO: 'Asignó el número definitivo del certificado',
    CERTIFICADO_EMITIDO: 'Emitió el certificado definitivo',
    DUPLICADO_EMITIDO: 'Emitió un duplicado de certificado',
    RECTIFICACION_GUARDADA: 'Registró una rectificación de certificado',
    RECTIFICACION_EMITIDA: 'Emitió la rectificación de certificado',

    // Facturación y Notas de crédito
    FACTURACION_GUARDADA: 'Guardó los datos de facturación',
    COMPROBANTE_EMITIDO: 'Emitió comprobante de pago electrónico',
    VENTA_DIRECTA_EMITIDA: 'Emitió venta directa con comprobante',
    NOTA_CREDITO_CREADA: 'Registró solicitud de nota de crédito',
    NOTA_CREDITO_EMITIDA: 'Emitió nota de crédito electrónica',
    ANULACION_SOLICITADA: 'Solicitó la anulación de comprobante',
    ANULACION_EJECUTADA: 'Ejecutó la anulación de comprobante',
    COMPROBANTE_ANULADO: 'Comprobante electrónico anulado',
    ERROR_EMISION_FACTURACION: 'Error en procesamiento de facturación electrónica',

    // Pagos
    PAGOS_GUARDADOS: 'Registró los pagos del certificado',
    PAGO_REGISTRADO: 'Registró un pago en caja',
    PAGO_PARCIAL_REGISTRADO: 'Registró pago parcial',
    CREDITO_REGISTRADO: 'Registró operación al crédito',
    CUOTAS_MODIFICADAS: 'Actualizó las cuotas de crédito',
    PAGO_ANULADO: 'Anuló operación de pago',

    // Inventario y Chips
    CHIP_INGRESADO: 'Ingresó lote de chips a la sede',
    INVENTARIO_INGRESO: 'Registró ingreso de stock al inventario',
    CHIP_TRANSFERIDO: 'Transfirió chips a otra sede',
    CHIP_RESERVADO: 'Reservó chip para emisión',
    CHIP_RESERVA_LIBERADA: 'Liberó reserva de chip',
    CHIP_VENDIDO: 'Registró venta de chip',
    CHIP_DADO_BAJA: 'Dio de baja chip por daño o defecto',

    // Usuarios y Perfiles
    USUARIO_CREADO: 'Creó un nuevo usuario',
    USUARIO_ACTUALIZADO: 'Actualizó datos de usuario',
    USUARIO_DESACTIVADO: 'Desactivó un usuario',
    USUARIO_ELIMINADO: 'Eliminó un usuario del sistema',
    PASSWORD_ACTUALIZADO: 'Restableció la contraseña de un usuario',
    PERFIL_CREADO: 'Creó un perfil de usuario',
    PERFIL_ACTUALIZADO: 'Actualizó un perfil de usuario',
    PERFIL_DESACTIVADO: 'Desactivó un perfil de usuario',
    PERFIL_ELIMINADO: 'Eliminó un perfil de usuario',

    // Descuentos
    DESCUENTO_APLICADO: 'Aplicó un descuento',
    DESCUENTO_QUITADO: 'Retiró el descuento',
    DESCUENTO_CREADO: 'Creó un nuevo descuento',
    DESCUENTO_ACTUALIZADO: 'Actualizó un descuento',
    DESCUENTO_ESTADO_ACTUALIZADO: 'Cambió el estado de un descuento',
    REGLAS_DESCUENTO_GUARDADAS: 'Guardó el alcance y beneficio de un descuento',
    CODIGO_DESCUENTO_CREADO: 'Creó un código de descuento',
    CODIGO_DESCUENTO_ACTUALIZADO: 'Actualizó un código de descuento',
    CODIGO_DESCUENTO_ESTADO: 'Cambió el estado de un código de descuento',

    // Solicitudes Administrativas
    SOLICITUD_CREADA: 'Creó solicitud administrativa',
    SOLICITUD_APROBADA: 'Aprobó solicitud administrativa',
    SOLICITUD_RECHAZADA: 'Rechazó solicitud administrativa',
    SOLICITUD_CANCELADA: 'Canceló solicitud administrativa'
};

const ETIQUETAS_DATOS: Record<string, string> = {
    cantidadPagos: 'Cantidad de pagos', importePagado: 'Importe pagado',
    saldoPendiente: 'Saldo pendiente', estadoOrden: 'Estado del pago',
    tipoComprobante: 'Tipo de comprobante', comprobante: 'Comprobante',
    estado: 'Estado', cantidad: 'Cantidad', pasoActual: 'Paso',
    numeroCertificado: 'Número de certificado', valido: 'Validación',
    importeDescuento: 'Descuento', tipoCalculo: 'Tipo de descuento',
    tarifaCodigo: 'Servicio', ruta: 'Sección', metodo: 'Operación',
    destinoKey: 'Sede destino', numeroChip: 'Número de chip',
    perfil_id: 'Perfil asignado', total: 'Total operación'
};

const hoyLocal = () => {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, '0');
    const d = String(ahora.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Validación estricta de máximo un mes calendario.
 * Ejemplos válidos:
 *   01/11/2026 a 30/11/2026
 *   15/10/2026 a 13/11/2026
 *   01/02/2026 a 28/02/2026
 */
const validarRangoMaximoUnMes = (desdeStr: string, hastaStr: string): { valido: boolean; mensaje?: string } => {
    if (!desdeStr || !hastaStr) {
        return { valido: false, mensaje: 'Las fechas Desde y Hasta son obligatorias.' };
    }
    const [y1, m1, d1] = desdeStr.split('-').map(Number);
    const [y2, m2, d2] = hastaStr.split('-').map(Number);
    const dDesde = new Date(y1, m1 - 1, d1);
    const dHasta = new Date(y2, m2 - 1, d2);
    if (dDesde > dHasta) {
        return { valido: false, mensaje: 'La fecha Desde no puede ser posterior a la fecha Hasta.' };
    }

    const targetY = m1 === 12 ? y1 + 1 : y1;
    const targetM = m1 === 12 ? 1 : m1 + 1;
    const diasEnMesDestino = new Date(targetY, targetM, 0).getDate();
    const targetD = Math.min(d1, diasEnMesDestino);
    const maxPermitido = new Date(targetY, targetM - 1, targetD);

    if (dHasta > maxPermitido) {
        return {
            valido: false,
            mensaje: 'El rango de consulta no puede superar un mes calendario (máximo hasta 31 días).'
        };
    }
    return { valido: true };
};

const accionTexto = (item: AuditoriaAccesoFaregas) => ACCIONES[item.evento] || item.mensaje || item.evento.replaceAll('_', ' ');

const referenciaTexto = (item: AuditoriaAccesoFaregas) => {
    if (item.documento_referencia) return item.documento_referencia;
    if (item.numero_certificado) return item.numero_certificado;
    if (item.certificado_id) return `Borrador #${item.certificado_id}${item.placa ? ` · ${item.placa}` : ''}`;
    if (item.entidad_id) return `${item.entidad || 'Reg.'} #${item.entidad_id}`;
    return '-';
};

export function AuditoriaView() {
    const [registros, setRegistros] = useState<AuditoriaAccesoFaregas[]>([]);
    const [seleccionado, setSeleccionado] = useState<AuditoriaAccesoFaregas | null>(null);
    const [grupoActivo, setGrupoActivo] = useState<GrupoModulo>('TODOS');
    const [modulo, setModulo] = useState('TODOS');
    const [loading, setLoading] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [error, setError] = useState('');
    const [buscar, setBuscar] = useState('');
    const [username, setUsername] = useState('');
    const [resultado, setResultado] = useState('');
    const [fechaInicio, setFechaInicio] = useState(hoyLocal());
    const [fechaFin, setFechaFin] = useState(hoyLocal());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [resumen, setResumen] = useState({ items: 0, total: 0, page: 1, limit: 10, totalPages: 0 });

    // Validación reactiva del rango de fechas
    const validacionRango = useMemo(() => {
        return validarRangoMaximoUnMes(fechaInicio, fechaFin);
    }, [fechaInicio, fechaFin]);

    // Módulos visibles en el desplegable según el grupo activo
    const modulosFiltrados = useMemo(() => {
        if (grupoActivo === 'TODOS') return MODULOS;
        return [MODULOS[0], ...MODULOS.filter(m => m.grupo === grupoActivo && m.clave !== 'TODOS')];
    }, [grupoActivo]);

    const cargarAuditoria = async (moduloSeleccionado = modulo, paginaActual = page) => {
        if (!validacionRango.valido) return;

        try {
            setLoading(true);
            setError('');
            const respuesta = await faregasAuditoriaApi.listarAccesos({
                modulo: moduloSeleccionado === 'TODOS' ? undefined : moduloSeleccionado,
                buscar: buscar.trim(),
                username: username.trim(),
                resultado: resultado || undefined,
                fechaInicio,
                fechaFin,
                page: paginaActual,
                pageSize
            });
            setRegistros(respuesta.items);
            setResumen({
                items: respuesta.items.length,
                total: respuesta.total,
                page: respuesta.page,
                limit: respuesta.limit,
                totalPages: respuesta.totalPages
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar auditoría.');
        } finally {
            setLoading(false);
        }
    };

    const cambiarGrupo = (nuevoGrupo: GrupoModulo) => {
        setGrupoActivo(nuevoGrupo);
        if (nuevoGrupo === 'TODOS') {
            setModulo('TODOS');
            setPage(1);
            void cargarAuditoria('TODOS', 1);
        } else {
            const primeros = MODULOS.filter(m => m.grupo === nuevoGrupo);
            const elegido = primeros[0]?.clave || 'TODOS';
            setModulo(elegido);
            setPage(1);
            void cargarAuditoria(elegido, 1);
        }
    };

    const cambiarModulo = (nuevoModulo: string) => {
        setModulo(nuevoModulo);
        const modEncontrado = MODULOS.find(m => m.clave === nuevoModulo);
        if (modEncontrado && modEncontrado.grupo !== 'TODOS') {
            setGrupoActivo(modEncontrado.grupo);
        }
        setPage(1);
        void cargarAuditoria(nuevoModulo, 1);
    };

    const aplicarFiltros = () => {
        setPage(1);
        void cargarAuditoria(modulo, 1);
    };

    const limpiar = () => {
        setBuscar('');
        setUsername('');
        setResultado('');
        setFechaInicio(hoyLocal());
        setFechaFin(hoyLocal());
        setGrupoActivo('TODOS');
        setModulo('TODOS');
        setPage(1);
        void faregasAuditoriaApi.listarAccesos({
            fechaInicio: hoyLocal(),
            fechaFin: hoyLocal(),
            page: 1,
            pageSize
        }).then(res => {
            setRegistros(res.items);
            setResumen({
                items: res.items.length,
                total: res.total,
                page: res.page,
                limit: res.limit,
                totalPages: res.totalPages
            });
        }).catch(() => {});
    };

    useEffect(() => {
        let activo = true;
        faregasAuditoriaApi.listarAccesos({
            fechaInicio: hoyLocal(),
            fechaFin: hoyLocal(),
            page: 1,
            pageSize: 10
        })
            .then((respuesta) => {
                if (!activo) return;
                setRegistros(respuesta.items);
                setResumen({
                    items: respuesta.items.length,
                    total: respuesta.total,
                    page: respuesta.page,
                    limit: respuesta.limit,
                    totalPages: respuesta.totalPages
                });
            })
            .catch((err: unknown) => { if (activo) setError(err instanceof Error ? err.message : 'Error al cargar auditoría.'); })
            .finally(() => { if (activo) setLoading(false); });
        return () => { activo = false; };
    }, []);

    const exportarExcel = async () => {
        if (!validacionRango.valido) return;
        try {
            setExportando(true);
            const blob = await faregasAuditoriaApi.exportarExcel({
                modulo: modulo === 'TODOS' ? undefined : modulo,
                buscar: buscar.trim(),
                username: username.trim(),
                resultado: resultado || undefined,
                fechaInicio,
                fechaFin
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const modNom = modulo === 'TODOS' ? 'TODOS' : modulo;
            link.setAttribute('download', `Auditoria_FAREGAS_${modNom}_${fechaInicio}_a_${fechaFin}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al descargar la exportación de auditoría.');
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Auditoría Integral FAREGAS</h1>
                    <p className="text-sm text-gray-500">Trazabilidad completa de operaciones, certificados, facturación, pagos y seguridad.</p>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 self-start sm:self-auto">
                    Zona horaria: <strong>America/Lima (UTC-5)</strong>
                </div>
            </div>

            {/* Panel de Navegación por Grupos y Filtros */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Pestañas de grupos de módulos organizadas (Evita desbordamiento horizontal) */}
                <div className="flex flex-wrap border-b border-gray-200 bg-slate-50/70 p-1.5 gap-1">
                    {GRUPOS.map((g) => (
                        <button
                            key={g.clave}
                            type="button"
                            onClick={() => cambiarGrupo(g.clave)}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                                grupoActivo === g.clave
                                    ? 'bg-[#052A79] text-white shadow-sm'
                                    : 'bg-white text-gray-600 hover:bg-slate-100 border border-slate-200/60'
                            }`}
                        >
                            {g.clave === 'TODOS' && <Layers className="w-3.5 h-3.5" />}
                            {g.nombre}
                        </button>
                    ))}
                </div>

                {/* Filtros específicos */}
                <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        {/* Selector de módulo específico */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Módulo específico:</label>
                            <select
                                value={modulo}
                                onChange={(e) => cambiarModulo(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-[#052A79]"
                            >
                                {modulosFiltrados.map((m) => (
                                    <option key={m.clave} value={m.clave}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Búsqueda por texto */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Buscar por referencia o detalle:</label>
                            <input
                                type="text"
                                placeholder="Placa, certificado, factura, recibo o descripción"
                                value={buscar}
                                onChange={(e) => setBuscar(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                            />
                        </div>

                        {/* Usuario */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Usuario:</label>
                            <input
                                type="text"
                                placeholder="Ej. gibarra"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                            />
                        </div>

                        {/* Resultado */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Resultado:</label>
                            <select
                                value={resultado}
                                onChange={(e) => setResultado(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#052A79]"
                            >
                                <option value="">Todos</option>
                                <option value="EXITO">Completado / Éxito</option>
                                <option value="ERROR">Error / Rechazado</option>
                            </select>
                        </div>
                    </div>

                    {/* Fila de fechas obligatorias con validación de máximo 1 mes */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end pt-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                Fecha Desde <span className="text-red-500">*</span>:
                            </label>
                            <input
                                aria-label="Fecha desde"
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                                    !validacionRango.valido ? 'border-red-400 bg-red-50/50' : 'border-gray-300 focus:border-[#052A79]'
                                }`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                Fecha Hasta <span className="text-red-500">*</span>:
                            </label>
                            <input
                                aria-label="Fecha hasta"
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                                    !validacionRango.valido ? 'border-red-400 bg-red-50/50' : 'border-gray-300 focus:border-[#052A79]'
                                }`}
                            />
                        </div>

                        <div className="lg:col-span-2 flex gap-2">
                            <button
                                type="button"
                                onClick={aplicarFiltros}
                                disabled={loading || !validacionRango.valido}
                                className="flex-1 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Search className="w-4 h-4" />
                                {loading ? 'Buscando...' : 'Buscar'}
                            </button>
                            <button
                                type="button"
                                onClick={limpiar}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                                title="Restablecer filtros a hoy"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Limpiar
                            </button>
                        </div>

                        <div className="lg:col-span-2 text-xs text-slate-500">
                            * Rango obligatorio acotado a un <strong>mes calendario</strong> como máximo.
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerta de validación de rango mayor a un mes */}
            {!validacionRango.valido && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800 flex items-center gap-2.5 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{validacionRango.mensaje}</span>
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Tabla de registros */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 px-4 py-3 gap-2 bg-slate-50/50">
                    <div>
                        <div className="font-bold text-gray-800 text-sm">Actividad y Operaciones Auditadas</div>
                        <div className="text-xs text-gray-500">
                            {resumen.total} eventos registrados {modulo !== 'TODOS' ? `en módulo ${modulo}` : ''}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={exportarExcel}
                            disabled={loading || exportando || registros.length === 0 || !validacionRango.valido}
                            className="flex items-center gap-1.5 rounded-lg bg-[#0F7B3E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b5f30] shadow-sm disabled:opacity-50 transition"
                            title="Exportar registros filtrados a Excel (máx 10,000 filas por consulta)"
                        >
                            <Download className="h-4 w-4" />
                            {exportando ? 'Exportando...' : 'Exportar Excel'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void cargarAuditoria()}
                            disabled={loading || !validacionRango.valido}
                            className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 shadow-sm"
                        >
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-100/80 text-xs font-bold uppercase text-slate-600">
                            <tr>
                                <th className="px-4 py-3">Fecha y Hora</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Perfil</th>
                                <th className="px-4 py-3">Módulo</th>
                                <th className="px-4 py-3">Acción / Descripción</th>
                                <th className="px-4 py-3">Referencia</th>
                                <th className="px-4 py-3">Sede</th>
                                <th className="px-4 py-3">Resultado</th>
                                <th className="px-4 py-3 text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {registros.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                                        {new Date(item.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-800 text-xs">
                                        {item.username || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                                            {item.perfil || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#052A79] border border-blue-200">
                                            {item.modulo || item.categoria || 'OPERACIONES'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-800 max-w-md">
                                        <div className="font-semibold text-slate-800">{accionTexto(item)}</div>
                                        {item.mensaje && item.mensaje !== accionTexto(item) && (
                                            <div className="text-[11px] text-slate-500 truncate" title={item.mensaje}>
                                                {item.mensaje}
                                            </div>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-xs text-[#052A79]">
                                        {referenciaTexto(item)}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium text-slate-700">
                                        {item.planta_key || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                            (item.resultado === 'EXITO' || (item.exitoso && !item.resultado))
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : item.resultado === 'RECHAZADO'
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : 'bg-red-100 text-red-800 border border-red-200'
                                        }`}>
                                            {item.resultado || (item.exitoso ? 'COMPLETADO' : 'ERROR')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => setSeleccionado(item)}
                                            title="Ver auditoría completa"
                                            className="rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-[#052A79] hover:bg-blue-100 hover:border-blue-300 transition shadow-sm"
                                        >
                                            <Eye size={17} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && registros.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                                        No se encontraron eventos de auditoría para el período y filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Paginacion
                    resumen={resumen}
                    onCambioPagina={(p) => { setPage(p); void cargarAuditoria(modulo, p); }}
                    onCambioPageSize={(s) => { setPageSize(s); setPage(1); void cargarAuditoria(modulo, 1); }}
                    etiqueta="eventos"
                    deshabilitado={loading}
                />
            </div>

            {seleccionado && <DetalleEvento item={seleccionado} cerrar={() => setSeleccionado(null)} />}
        </div>
    );
}

function DetalleEvento({ item, cerrar }: { item: AuditoriaAccesoFaregas; cerrar: () => void }) {
    const datos = Object.entries(item.datos || {}).filter(([clave]) => ETIQUETAS_DATOS[clave] || typeof item.datos?.[clave] !== 'object');
    const fechaHoraLima = new Date(item.fecha_evento).toLocaleString('es-PE', { timeZone: 'America/Lima' });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onMouseDown={cerrar}>
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-200 bg-slate-50 px-6 py-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Detalle del Evento de Auditoría</h2>
                        <p className="text-xs text-slate-500">ID del Evento: #{item.id} · {fechaHoraLima}</p>
                    </div>
                    <button type="button" aria-label="Cerrar" onClick={cerrar} className="text-2xl text-gray-400 hover:text-gray-700 font-bold">
                        &times;
                    </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
                    {/* Tarjeta de Resumen */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                        <div className="text-xs font-bold text-blue-900 uppercase">Descripción comprensible de la acción</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                            {item.mensaje || accionTexto(item)}
                        </div>
                        {item.motivo_error && (
                            <div className="mt-2 text-xs font-medium text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                                <strong>Motivo de Error / Rechazo:</strong> {item.motivo_error}
                            </div>
                        )}
                    </div>

                    {/* Matriz de Datos Principales */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <Dato titulo="Fecha y Hora" valor={fechaHoraLima} />
                        <Dato titulo="Usuario Responsable" valor={item.username || '-'} />
                        <Dato titulo="Perfil" valor={item.perfil || '-'} />
                        <Dato titulo="Sede / Planta" valor={item.planta_key || '-'} />
                        <Dato titulo="Módulo Funcional" valor={item.modulo || item.categoria || 'OPERACIONES'} />
                        <Dato titulo="Acción" valor={item.evento} />
                        <Dato titulo="Documento / Referencia" valor={referenciaTexto(item)} />
                        <Dato titulo="Resultado" valor={item.resultado || (item.exitoso ? 'EXITO' : 'ERROR')} />
                        <Dato titulo="Tipo de Operación" valor={item.es_automatico ? 'Automático (Worker)' : 'Manual (Usuario)'} />
                        {item.placa && <Dato titulo="Placa del Vehículo" valor={item.placa} />}
                        {item.tipo_certificado && <Dato titulo="Tipo de Certificado" valor={item.tipo_certificado} />}
                        {item.entidad && <Dato titulo="Entidad BD Afectada" valor={`${item.entidad} #${item.entidad_id || ''}`} />}
                    </div>

                    {/* Datos complementarios no sensibles */}
                    {datos.length > 0 && (
                        <div className="border-t border-slate-200 pt-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Parámetros Operativos Registrados</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                                {datos.map(([clave, valor]) => (
                                    <div key={clave}>
                                        <span className="font-semibold text-slate-600">{ETIQUETAS_DATOS[clave] || clave}:</span>{' '}
                                        <span className="text-slate-800">{typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor ?? '-')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Snapshot de Datos Previos / Nuevos si existen */}
                    {(item.datos_previos || item.datos_nuevos) && (
                        <div className="border-t border-slate-200 pt-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Cambios de Valores Auditados</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                {item.datos_previos && (
                                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                                        <div className="font-bold text-amber-900 mb-1">Valores Anteriores:</div>
                                        <pre className="overflow-x-auto text-[11px] text-amber-800 font-mono">
                                            {JSON.stringify(item.datos_previos, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {item.datos_nuevos && (
                                    <div className="p-3 bg-green-50/60 border border-green-200 rounded-xl">
                                        <div className="font-bold text-green-900 mb-1">Valores Nuevos:</div>
                                        <pre className="overflow-x-auto text-[11px] text-green-800 font-mono">
                                            {JSON.stringify(item.datos_nuevos, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end border-t border-gray-200 bg-slate-50 px-6 py-3">
                    <button
                        type="button"
                        onClick={cerrar}
                        className="rounded-lg bg-[#052A79] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#031c54] transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

function Dato({ titulo, valor }: { titulo: string; valor?: string | null }) {
    return (
        <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">{titulo}</div>
            <div className="mt-0.5 break-words text-xs font-semibold text-slate-800">{valor || '-'}</div>
        </div>
    );
}
