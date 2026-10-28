import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, FileText, History, Loader2, PlusCircle, Printer, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import type { MaestrosPagoResponse } from '@/types/maestros';
import { faregasPagosApi } from '../../services/faregas-pagos.api';
import {
  faregasDuplicadosApi,
  type CandidatoDuplicado,
  type SolicitudDuplicado,
  type TipoDuplicado,
} from '../../services/faregas-duplicados.api';

type MedioPago = 'EFECTIVO' | 'TARJETA' | 'BANCO';

interface PagoAgregado {
  id?: number;
  tipo: 'EFECTIVO' | 'TARJETA' | 'BANCO';
  importe: string;
  tarjetaKey?: string;
  tarjetaNombre?: string;
  modalidadTarjeta?: 'DEBITO' | 'CREDITO';
  nroOperacion?: string;
  entidadFinancieraKey?: string;
  cuentaCorrienteKey?: string;
  fechaDeposito?: string;
}

const fechaHoy = () => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const PERIODO_HISTORIAL_INICIAL = {
  desde: `${fechaHoy().slice(0, 7)}-01`,
  hasta: fechaHoy(),
};

const textoFecha = (fecha?: string | null) => {
  if (!fecha) return '-';
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
};

const textoFechaHora = (fecha?: string | null) => {
  if (!fecha) return '-';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return textoFecha(fecha);
  return valor.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const mensajeError = (error: unknown) => error instanceof Error
  ? error.message
  : 'No se pudo completar la operación.';

export function DuplicadoCertificadoModal({ onClose }: { onClose: () => void }) {
  const [tipos, setTipos] = useState<TipoDuplicado[]>([]);
  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState('TODOS');
  const [resultados, setResultados] = useState<CandidatoDuplicado[]>([]);
  const [historial, setHistorial] = useState<SolicitudDuplicado[]>([]);
  const [historialDesde, setHistorialDesde] = useState(PERIODO_HISTORIAL_INICIAL.desde);
  const [historialHasta, setHistorialHasta] = useState(PERIODO_HISTORIAL_INICIAL.hasta);
  const [historialPagina, setHistorialPagina] = useState(1);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [historialTotalPaginas, setHistorialTotalPaginas] = useState(1);
  const [seleccionado, setSeleccionado] = useState<CandidatoDuplicado | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudDuplicado | null>(null);
  const [maestros, setMaestros] = useState<MaestrosPagoResponse['data'] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});
  const [vista, setVista] = useState<{ duplicadoId: number; html: string } | null>(null);
  const [vistaFallidaId, setVistaFallidaId] = useState<number | null>(null);
  const vistaRef = useRef<HTMLIFrameElement>(null);
  const agregandoPagoRef = useRef(false);
  const procesandoRef = useRef(false);

  const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA');
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'RUC' | 'CARNETEXTRANJERIA'>('DNI');
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pagosAgregados, setPagosAgregados] = useState<PagoAgregado[]>([]);
  const [pagoTab, setPagoTab] = useState<MedioPago>('EFECTIVO');
  const [montoPago, setMontoPago] = useState('50.00');
  const [tarjetaKey, setTarjetaKey] = useState('');
  const [modalidadTarjeta, setModalidadTarjeta] = useState<'DEBITO' | 'CREDITO'>('DEBITO');
  const [nroOperacion, setNroOperacion] = useState('');
  const [fechaDeposito, setFechaDeposito] = useState(fechaHoy());
  const [avisoPagoConfirmado, setAvisoPagoConfirmado] = useState('');

  const cuentaFaregas = maestros?.cuentasCorrientes?.[0];
  const entidadFaregas = maestros?.entidadesFinancieras?.find(
    (item) => item.key === cuentaFaregas?.entidadfinanciera_key,
  );
  const totalDuplicado = Number(solicitud?.precio || 50);
  const totalPagado = useMemo(
    () => pagosAgregados.reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0),
    [pagosAgregados]
  );
  const saldoPendiente = useMemo(
    () => Math.max(0, Math.round((totalDuplicado - totalPagado + Number.EPSILON) * 100) / 100),
    [totalDuplicado, totalPagado]
  );
  const pagoCompleto = useMemo(
    () => Math.abs(totalPagado - totalDuplicado) < 0.009,
    [totalPagado, totalDuplicado]
  );
  const tarjetaSeleccionada = maestros?.tarjetas?.find((item) => item.key === tarjetaKey);
  const nombreTarjetaSeleccionada = String(tarjetaSeleccionada?.nombre || '').toUpperCase();
  const esCuponidad = nombreTarjetaSeleccionada.includes('CUPONIDAD');
  const esYapePlin = ['YAPE', 'PLIN'].some((texto) => nombreTarjetaSeleccionada.includes(texto));
  const esBilletera = esCuponidad || esYapePlin;
  const pagoYaRegistrado = ['PAGADO', 'FACTURADO'].includes(String(solicitud?.operacionEstado || '').toUpperCase());
  const duplicadoDisponibleId = solicitud?.estado === 'DISPONIBLE' ? solicitud.id : null;
  const vistaHtml = vista?.duplicadoId === duplicadoDisponibleId ? vista.html : '';
  const cargandoVista = duplicadoDisponibleId !== null && !vistaHtml && vistaFallidaId !== duplicadoDisponibleId;

  const limpiarError = (campo: string) => {
    setErroresCampos((prev) => {
      if (!prev[campo]) return prev;
      const nuevo = { ...prev };
      delete nuevo[campo];
      return nuevo;
    });
  };

  const inputClase = (campo: string, claseExtra = '') => {
    const tieneError = Boolean(erroresCampos[campo]);
    const base = tieneError
      ? 'border-2 border-red-500 bg-red-50/20 text-red-900 focus:border-red-600 focus:ring-red-500'
      : 'border border-slate-300 focus:border-[#052a79] focus:ring-0';
    return `${base} w-full rounded-lg p-2.5 text-sm transition-colors ${claseExtra}`;
  };

  useEffect(() => {
    void Promise.all([
      faregasDuplicadosApi.listarTipos(),
      faregasPagosApi.obtenerMaestros(),
      faregasDuplicadosApi.listarHistorial({ ...PERIODO_HISTORIAL_INICIAL, pagina: 1 }),
    ])
      .then(([listaTipos, respuestaMaestros, respuestaHistorial]) => {
        setTipos(listaTipos);
        setMaestros(respuestaMaestros.data);
        setHistorial(respuestaHistorial.items);
        setHistorialPagina(respuestaHistorial.paginacion.pagina);
        setHistorialTotal(respuestaHistorial.paginacion.total);
        setHistorialTotalPaginas(respuestaHistorial.paginacion.totalPaginas);
      })
      .catch((err) => setError(mensajeError(err)))
      .finally(() => setCargandoHistorial(false));
  }, []);

  useEffect(() => {
    if (duplicadoDisponibleId === null) return;

    let activa = true;
    void faregasDuplicadosApi.obtenerVista(duplicadoDisponibleId)
      .then((vista) => {
        if (activa) setVista({ duplicadoId: duplicadoDisponibleId, html: vista.html });
      })
      .catch((err) => {
        if (activa) {
          setVistaFallidaId(duplicadoDisponibleId);
          setError(mensajeError(err));
        }
      });
    return () => { activa = false; };
  }, [duplicadoDisponibleId]);

  const buscar = async (opciones: { conservarError?: boolean } = {}) => {
    const placaNormalizada = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (placaNormalizada.length < 5) {
      if (!opciones.conservarError) setError('Ingrese una placa válida.');
      return;
    }
    setBuscando(true);
    if (!opciones.conservarError) setError('');
    setResultados([]);
    try {
      const candidatos = await faregasDuplicadosApi.buscar(placaNormalizada, tipo);
      setResultados(candidatos.filter((item) => item.duplicable));
    } catch (err) {
      if (!opciones.conservarError) setError(mensajeError(err));
    } finally {
      setBuscando(false);
    }
  };

  const cargarPaginaHistorial = async (pagina: number) => {
    if (historialDesde && historialHasta && historialDesde > historialHasta) {
      setError('La fecha Desde no puede ser posterior a la fecha Hasta.');
      return;
    }
    setCargandoHistorial(true);
    setError('');
    try {
      const respuesta = await faregasDuplicadosApi.listarHistorial({
        desde: historialDesde,
        hasta: historialHasta,
        pagina,
      });
      setHistorial(respuesta.items);
      setHistorialPagina(respuesta.paginacion.pagina);
      setHistorialTotal(respuesta.paginacion.total);
      setHistorialTotalPaginas(respuesta.paginacion.totalPaginas);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargandoHistorial(false);
    }
  };

  const iniciarSolicitud = async (candidato: CandidatoDuplicado) => {
    const tieneDuplicadosPrevios = Number(candidato.duplicadosEmitidosCount || 0) > 0;
    const confirmacion = await Swal.fire({
      title: '¿Confirmar solicitud?',
      text: `¿Deseas solicitar un ${tieneDuplicadosPrevios ? 'nuevo ' : ''}duplicado del certificado ${candidato.numeroCertificado} por S/ 50.00? Se generará una nueva operación y su correspondiente comprobante de pago.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#052a79',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.isConfirmed) return;

    setProcesando(true);
    setError('');
    setErroresCampos({});
    try {
      const creada = await faregasDuplicadosApi.crear(candidato.certificadoId);
      const cliente = candidato.cliente;
      const documentoTipo = String(cliente.tipoDocumento || '').toUpperCase();
      const tipoDoc = (['DNI', 'RUC', 'CARNETEXTRANJERIA'].includes(documentoTipo)
        ? documentoTipo
        : 'DNI') as typeof tipoDocumento;
      setSeleccionado(candidato);
      setSolicitud(creada);
      setTipoDocumento(tipoDoc);
      setTipoComprobante(tipoDoc === 'RUC' ? 'FACTURA' : 'BOLETA');
      setDocumento(cliente.nroDocumento || '');
      setNombre(cliente.nombreRazonSocial || '');
      setDireccion(cliente.direccion || '');
      setEmail(cliente.email || '');
      setTelefono(cliente.telefono || '');
      setAvisoPagoConfirmado('');

      if (Array.isArray(creada.pagos) && creada.pagos.length > 0) {
        setPagosAgregados(creada.pagos.map((p) => ({
          id: p.id,
          tipo: p.tipo,
          importe: Number(p.importe).toFixed(2),
          tarjetaKey: p.tarjetaKey,
          tarjetaNombre: maestros?.tarjetas?.find((t) => t.key === p.tarjetaKey)?.nombre,
          modalidadTarjeta: p.modalidadTarjeta,
          nroOperacion: p.nroOperacion,
          entidadFinancieraKey: p.entidadFinancieraKey,
          cuentaCorrienteKey: p.cuentaCorrienteKey,
          fechaDeposito: p.fechaDeposito,
        })));
        const suma = creada.pagos.reduce((acc, p) => acc + Number(p.importe || 0), 0);
        const rem = Math.max(0, Math.round((50 - suma + Number.EPSILON) * 100) / 100);
        setMontoPago(rem > 0 ? rem.toFixed(2) : '');
      } else {
        setPagosAgregados([]);
        setMontoPago('50.00');
      }
    } catch (err) {
      const codigo = (err as { codigo?: string }).codigo;
      setError(mensajeError(err));
      if (codigo === 'CERTIFICADO_NO_DISPONIBLE_PARA_DUPLICADO') {
        await buscar({ conservarError: true });
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleAgregarPago = () => {
    if (agregandoPagoRef.current) return;
    agregandoPagoRef.current = true;

    try {
      setError('');
      setAvisoPagoConfirmado('');
      const nuevosErrores: Record<string, string> = {};

      const montoNum = parseFloat(montoPago);
      if (!montoPago || !montoPago.trim()) {
        nuevosErrores.montoPago = 'Ingrese el importe a pagar.';
      } else if (isNaN(montoNum) || montoNum <= 0) {
        nuevosErrores.montoPago = 'Ingrese un importe válido mayor a S/ 0.00.';
      } else if (montoNum - saldoPendiente > 0.009) {
        nuevosErrores.montoPago = `El importe ingresado (S/ ${montoNum.toFixed(2)}) excede el saldo pendiente (S/ ${saldoPendiente.toFixed(2)}).`;
      }

      if (pagoTab === 'TARJETA') {
        if (!tarjetaKey) {
          nuevosErrores.tarjetaKey = 'Seleccione la marca o medio de tarjeta.';
        }
        if (!esBilletera && !modalidadTarjeta) {
          nuevosErrores.modalidadTarjeta = 'Seleccione la modalidad de la tarjeta (Débito o Crédito).';
        }
        if (!nroOperacion.trim()) {
          nuevosErrores.nroOperacion = 'Ingrese el N.° de operación o referencia de la tarjeta.';
        } else if (esCuponidad && nroOperacion.trim().length !== 10) {
          nuevosErrores.nroOperacion = 'El código de Cuponidad debe tener exactamente 10 caracteres.';
        } else if (esYapePlin && (nroOperacion.trim().length < 4 || nroOperacion.trim().length > 10)) {
          nuevosErrores.nroOperacion = 'El N.° de operación de Yape/Plin debe tener entre 4 y 10 dígitos.';
        }
      }

      if (pagoTab === 'BANCO') {
      if (!cuentaFaregas) {
          nuevosErrores.cuentaBancaria = 'La cuenta bancaria FAREGAS no está configurada.';
        }
        if (!nroOperacion.trim()) {
          nuevosErrores.nroOperacion = 'Ingrese el N.° de operación bancaria.';
        }
        if (!fechaDeposito) {
          nuevosErrores.fechaDeposito = 'Seleccione la fecha del depósito.';
        } else if (fechaDeposito > fechaHoy()) {
          nuevosErrores.fechaDeposito = 'La fecha de depósito no puede ser posterior a hoy.';
        }
      }

      const listaErrores = Object.values(nuevosErrores);
      if (listaErrores.length > 0) {
        setErroresCampos((prev) => ({ ...prev, ...nuevosErrores }));
        if (nuevosErrores.montoPago) {
          document.getElementById('duplicado-monto-pago')?.focus();
        } else if (nuevosErrores.tarjetaKey) {
          document.getElementById('duplicado-tarjeta-key')?.focus();
        } else if (nuevosErrores.modalidadTarjeta) {
          document.getElementById('duplicado-modalidad-tarjeta')?.focus();
        } else if (nuevosErrores.nroOperacion) {
          document.getElementById('duplicado-nro-operacion')?.focus();
        } else if (nuevosErrores.fechaDeposito) {
          document.getElementById('duplicado-fecha-deposito')?.focus();
        }
        return;
      }

      // Si todo es válido, limpiar errores de pago y agregar
      setErroresCampos((prev) => {
        const clon = { ...prev };
        delete clon.montoPago;
        delete clon.tarjetaKey;
        delete clon.modalidadTarjeta;
        delete clon.nroOperacion;
        delete clon.fechaDeposito;
        delete clon.pagos;
        return clon;
      });

      const tarjetaObj = maestros?.tarjetas?.find((item) => item.key === tarjetaKey);
      const nuevoPago: PagoAgregado = {
        tipo: pagoTab,
        importe: montoNum.toFixed(2),
        tarjetaKey: pagoTab === 'TARJETA' ? tarjetaKey : undefined,
        tarjetaNombre: pagoTab === 'TARJETA' ? tarjetaObj?.nombre : undefined,
        modalidadTarjeta: pagoTab === 'TARJETA' && !esBilletera ? modalidadTarjeta : undefined,
        nroOperacion: pagoTab !== 'EFECTIVO' ? nroOperacion.trim() : undefined,
        entidadFinancieraKey: pagoTab === 'BANCO' ? cuentaFaregas?.entidadfinanciera_key : undefined,
        cuentaCorrienteKey: pagoTab === 'BANCO' ? cuentaFaregas?.key : undefined,
        fechaDeposito: pagoTab === 'BANCO' ? fechaDeposito : undefined,
      };

      const nuevosPagos = [...pagosAgregados, nuevoPago];
      setPagosAgregados(nuevosPagos);

      const nuevoTotalPagado = nuevosPagos.reduce((sum, p) => sum + parseFloat(p.importe), 0);
      const nuevoSaldo = Math.max(0, Math.round((totalDuplicado - nuevoTotalPagado + Number.EPSILON) * 100) / 100);
      setMontoPago(nuevoSaldo > 0 ? nuevoSaldo.toFixed(2) : '');
      setNroOperacion('');
      setTarjetaKey('');
    } finally {
      agregandoPagoRef.current = false;
    }
  };

  const eliminarPago = (index: number) => {
    const item = pagosAgregados[index];
    if (item?.id) {
      setAvisoPagoConfirmado('Este pago está confirmado en caja y no puede eliminarse desde el duplicado. Requiere el proceso autorizado de caja.');
      return;
    }
    setAvisoPagoConfirmado('');
    setError('');
    const nuevosPagos = pagosAgregados.filter((_, i) => i !== index);
    setPagosAgregados(nuevosPagos);
    const nuevoTotalPagado = nuevosPagos.reduce((sum, p) => sum + parseFloat(p.importe), 0);
    const nuevoSaldo = Math.max(0, Math.round((totalDuplicado - nuevoTotalPagado + Number.EPSILON) * 100) / 100);
    setMontoPago(nuevoSaldo > 0 ? nuevoSaldo.toFixed(2) : '');
  };

  const procesar = async () => {
    if (procesandoRef.current || procesando) return;

    setError('');
    const errores: Record<string, string> = {};

    // 1. Validaciones de comprobante y documento
    if (!tipoComprobante) {
      errores.tipoComprobante = 'Seleccione el tipo de comprobante.';
    }
    if (!tipoDocumento) {
      errores.tipoDocumento = 'Seleccione el tipo de documento.';
    }

    const docLimpio = documento.trim().toUpperCase();
    if (!docLimpio) {
      errores.documento = 'Ingrese el número de documento.';
    } else if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(docLimpio)) {
      errores.documento = 'El DNI debe tener 8 dígitos numéricos.';
    } else if (tipoDocumento === 'RUC' && !/^\d{11}$/.test(docLimpio)) {
      errores.documento = 'El RUC debe tener 11 dígitos numéricos.';
    } else if (tipoDocumento === 'CARNETEXTRANJERIA' && !/^[A-Z0-9]{1,20}$/.test(docLimpio)) {
      errores.documento = 'El carnet de extranjería debe contener hasta 20 caracteres.';
    } else if (tipoComprobante === 'FACTURA' && tipoDocumento !== 'RUC') {
      errores.documento = 'Una factura requiere un número de RUC de 11 dígitos.';
    }

    // 2. Nombre o razón social
    if (!nombre.trim()) {
      errores.nombre = 'Ingrese el nombre o razón social.';
    } else if (nombre.trim().length > 100) {
      errores.nombre = 'El nombre o razón social admite hasta 100 caracteres.';
    }

    // 3. Dirección fiscal (opcional según reglas, pero validar longitud máxima si se ingresa)
    if (direccion.trim().length > 100) {
      errores.direccion = 'La dirección fiscal admite hasta 100 caracteres.';
    }

    // 4. Correo electrónico (opcional, validar formato sólo si se ingresó)
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errores.email = 'El correo electrónico no tiene un formato válido.';
    }

    // 5. Teléfono (opcional, validar longitud máxima)
    if (telefono.trim().length > 30) {
      errores.telefono = 'El teléfono admite hasta 30 caracteres.';
    }

    // 6. Validación de pago completo antes de emitir
    if (!pagoYaRegistrado && !pagoCompleto) {
      errores.pagos = `Falta registrar S/ ${saldoPendiente.toFixed(2)} para completar el total del duplicado.`;
    }

    const listaErrores = Object.values(errores);
    if (listaErrores.length > 0) {
      setErroresCampos(errores);

      // Enfocar el primer campo inválido
      if (errores.documento) {
        document.getElementById('duplicado-documento')?.focus();
      } else if (errores.nombre) {
        document.getElementById('duplicado-nombre')?.focus();
      } else if (errores.direccion) {
        document.getElementById('duplicado-direccion')?.focus();
      } else if (errores.email) {
        document.getElementById('duplicado-email')?.focus();
      } else if (errores.telefono) {
        document.getElementById('duplicado-telefono')?.focus();
      } else if (errores.pagos) {
        document.getElementById('duplicado-monto-pago')?.focus();
      }
      return;
    }

    if (!solicitud) return;

    procesandoRef.current = true;
    setProcesando(true);
    setErroresCampos({});
    setError('');

    try {
      const actualizada = await faregasDuplicadosApi.procesar(solicitud.id, {
        pagos: pagosAgregados.map((p) => ({
          tipo: p.tipo,
          importe: parseFloat(p.importe),
          tarjetaKey: p.tarjetaKey,
          modalidadTarjeta: p.modalidadTarjeta,
          nroOperacion: p.nroOperacion?.trim(),
          entidadFinancieraKey: p.entidadFinancieraKey,
          cuentaCorrienteKey: p.cuentaCorrienteKey,
          fechaDeposito: p.fechaDeposito,
        })),
        facturacion: {
          tipoComprobante,
          tipoDocumentoCliente: tipoDocumento,
          nroDocumento: docLimpio,
          nombreRazonSocial: nombre.trim(),
          direccion: direccion.trim(),
          email: email.trim() || null,
          telefono: telefono.trim() || null,
          condicionPago: 'CONTADO',
          cuotas: [],
          medioPago: pagosAgregados.map((p) => p.tipo).join(', ') || 'EFECTIVO',
        },
      });
      setSolicitud(actualizada);
      if (actualizada.estado === 'DISPONIBLE') {
        void cargarPaginaHistorial(1);
        if (placa.trim()) void buscar();
        await Swal.fire('Duplicado disponible', 'El comprobante fue procesado y ya puede descargar el duplicado.', 'success');
      } else {
        await Swal.fire('Comprobante pendiente', 'La solicitud quedó guardada. El duplicado se habilitará cuando el comprobante quede operativo.', 'info');
      }
    } catch (err) {
      try {
        setSolicitud(await faregasDuplicadosApi.obtener(solicitud.id));
      } catch {
        // Se conserva la solicitud local para permitir reintentar.
      }
      setError(mensajeError(err));
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  };

  const descargarSolicitud = async (item: SolicitudDuplicado, tipoDescarga: 'CERTIFICADO' | 'COMPROBANTE') => {
    try {
      if (tipoDescarga === 'CERTIFICADO') {
        await faregasDuplicadosApi.descargarCertificado(item.id, item.numeroCertificado);
      } else {
        await faregasDuplicadosApi.descargarComprobante(item.id);
      }
    } catch (err) {
      await Swal.fire('No se pudo descargar', mensajeError(err), 'error');
    }
  };

  const descargar = async (tipoDescarga: 'CERTIFICADO' | 'COMPROBANTE') => {
    if (solicitud) await descargarSolicitud(solicitud, tipoDescarga);
  };

  const abrirHistorial = (item: SolicitudDuplicado) => {
    setSeleccionado(null);
    setSolicitud(item);
    setError('');
    setErroresCampos({});
  };

  const imprimirDuplicado = async () => {
    const ventana = vistaRef.current?.contentWindow;
    if (!ventana || !vistaHtml) {
      await Swal.fire('Vista no disponible', 'Espere a que termine de cargar el duplicado.', 'info');
      return;
    }
    ventana.focus();
    ventana.print();
  };

  const volverBusqueda = () => {
    setSeleccionado(null);
    setSolicitud(null);
    setError('');
    setErroresCampos({});
    setNroOperacion('');
    setTarjetaKey('');
    setPagosAgregados([]);
    setMontoPago('50.00');
    setAvisoPagoConfirmado('');
  };

  const listaErroresCampos = Object.values(erroresCampos);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-label="Duplicado de certificado">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#052a79] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <Copy className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-black">Duplicado de certificado</h2>
              <p className="text-xs text-blue-100">Duplicado del mismo certificado emitido · S/ 50.00</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Cerrar"><X /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {listaErroresCampos.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-center gap-2 font-black text-red-900 mb-1">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <span>Por favor corrija los siguientes campos ({listaErroresCampos.length}):</span>
              </div>
              {listaErroresCampos.length === 1 ? (
                <p className="font-semibold text-xs text-red-700 mt-1">{listaErroresCampos[0]}</p>
              ) : (
                <ul className="list-disc list-inside space-y-0.5 font-semibold text-xs text-red-700 mt-1">
                  {listaErroresCampos.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!solicitud ? (
            <>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                Se mostrará únicamente el último certificado <strong>emitido</strong> por cada tipo. No procede si fue anulado o si pasó más de un año desde su fecha original.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">PLACA</label>
                  <input value={placa} maxLength={10} onChange={(event) => setPlaca(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter') void buscar(); }} placeholder="Ej. ABC123" className="w-full rounded-lg border border-slate-300 p-2.5 font-bold uppercase" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">TIPO DE CERTIFICADO</label>
                  <select value={tipo} onChange={(event) => setTipo(event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5">
                    <option value="TODOS">Todos los tipos</option>
                    {tipos.map((item) => <option key={item.valor} value={item.valor}>{item.nombre}</option>)}
                  </select>
                </div>
                <button type="button" disabled={buscando} onClick={() => void buscar()} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#052a79] px-5 py-2.5 font-bold text-white disabled:opacity-50">
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {!buscando && resultados.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Busque una placa para ver sus últimos certificados emitidos.</p>}
                {resultados.map((item) => (
                  <div key={item.certificadoId} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-[#052a79]">{item.numeroCertificado}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{item.tipoNombre}</span>
                        {Number(item.duplicadosEmitidosCount || 0) > 0 && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                            {item.duplicadosEmitidosCount} duplicado{item.duplicadosEmitidosCount === 1 ? '' : 's'} emitido{item.duplicadosEmitidosCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">Placa {item.placa} · Emitido {textoFecha(item.fechaEmision)} · Disponible hasta {textoFecha(item.fechaLimiteDuplicado)}</p>
                      {Number(item.duplicadosEmitidosCount || 0) > 0 && (
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          Duplicados emitidos anteriormente: {item.duplicadosEmitidosCount} · Precio nuevo duplicado: S/ 50.00
                        </p>
                      )}
                      {!item.duplicable && <p className="mt-1 text-xs font-bold text-red-600">{item.motivoNoDisponible}</p>}
                    </div>
                    {item.duplicable && (
                      <button type="button" disabled={procesando} onClick={() => void iniciarSolicitud(item)} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40">
                        {Number(item.duplicadosEmitidosCount || 0) > 0 ? 'Solicitar nuevo duplicado' : 'Solicitar duplicado'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <section className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-[#052a79]" />
                    <div>
                      <h3 className="font-black text-slate-800">Historial de duplicados emitidos</h3>
                      <p className="text-xs text-slate-500">Duplicados disponibles y comprobantes de la sede activa.</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700">{historialTotal}</span>
                </div>

                <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className="text-xs font-bold text-slate-600">DESDE
                    <input type="date" value={historialDesde} max={historialHasta || fechaHoy()} onChange={(event) => setHistorialDesde(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-slate-600">HASTA
                    <input type="date" value={historialHasta} min={historialDesde || undefined} max={fechaHoy()} onChange={(event) => setHistorialHasta(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
                  </label>
                  <button type="button" disabled={cargandoHistorial} onClick={() => void cargarPaginaHistorial(1)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#052a79] px-4 py-2 text-sm font-black text-white disabled:opacity-40">
                    {cargandoHistorial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar historial
                  </button>
                </div>

                {cargandoHistorial ? (
                  <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Cargando historial...</div>
                ) : historial.length === 0 ? (
                  <div className="flex min-h-32 items-center justify-center px-4 text-center text-sm text-slate-500">Todavía no hay duplicados emitidos en esta sede.</div>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] w-full text-left text-sm">
                      <thead className="bg-white text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Placa</th>
                          <th className="px-4 py-3">Certificado</th>
                          <th className="px-4 py-3 text-center">Duplicado</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Comprobante</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historial.map((item) => (
                          <tr key={item.id} className="bg-white hover:bg-blue-50/40">
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{textoFechaHora(item.fechaDisponible)}</td>
                            <td className="px-4 py-3 font-black text-slate-800">{item.placa}</td>
                            <td className="px-4 py-3 font-bold text-[#052a79]">{item.numeroCertificado}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-[#052a79]">
                                #{item.numeroDuplicado || 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{item.tipoNombre}</td>
                            <td className="px-4 py-3">
                              <span className="block font-bold text-slate-800">{item.nroComprobante || '-'}</span>
                              <span className="text-xs text-slate-500">{item.tipoComprobante || 'Comprobante'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => void descargarSolicitud(item, 'COMPROBANTE')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" title="Descargar comprobante">
                                  <FileText className="h-4 w-4" /> Comprobante
                                </button>
                                <button type="button" onClick={() => abrirHistorial(item)} className="inline-flex items-center gap-1 rounded-lg bg-[#052a79] px-3 py-2 text-xs font-black text-white hover:bg-blue-900">
                                  <Printer className="h-4 w-4" /> Ver / imprimir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                      <span>Mostrando {historial.length} de {historialTotal} duplicados · máximo 10 por página</span>
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label="Página anterior" disabled={cargandoHistorial || historialPagina <= 1} onClick={() => void cargarPaginaHistorial(historialPagina - 1)} className="rounded-lg border border-slate-300 bg-white p-2 text-[#052a79] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                        <span className="min-w-24 text-center font-black text-slate-700">Página {historialPagina} de {historialTotalPaginas}</span>
                        <button type="button" aria-label="Página siguiente" disabled={cargandoHistorial || historialPagina >= historialTotalPaginas} onClick={() => void cargarPaginaHistorial(historialPagina + 1)} className="rounded-lg border border-slate-300 bg-white p-2 text-[#052a79] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-[#052a79]">{seleccionado?.tipoNombre || solicitud.tipoNombre} · {solicitud.numeroCertificado}</p>
                    {solicitud.numeroDuplicado && (
                      <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-black text-[#052a79]">
                        Duplicado #{solicitud.numeroDuplicado}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">Placa {solicitud.placa} · Fecha original {textoFecha(solicitud.fechaEmision)}</p>
                  <p className="text-xs font-semibold text-slate-500">La fecha, número y contenido del certificado original no cambian.</p>
                </div>
                <div className="text-right"><p className="text-xs font-bold text-slate-500">PRECIO FIJO</p><p className="text-2xl font-black text-[#052a79]">S/ 50.00</p></div>
              </div>

              {solicitud.estado !== 'DISPONIBLE' && (
                <>
                  {pagoYaRegistrado && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                      El pago de S/ 50.00 ya está registrado. Al continuar no se cobrará nuevamente; sólo se confirmará el comprobante y se habilitará la descarga.
                    </div>
                  )}
                  <section className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-black text-slate-800">Datos del comprobante</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">COMPROBANTE</label>
                        <select
                          id="duplicado-tipo-comprobante"
                          value={tipoComprobante}
                          onChange={(event) => {
                            const valor = event.target.value as 'BOLETA' | 'FACTURA';
                            setTipoComprobante(valor);
                            limpiarError('tipoComprobante');
                            if (valor === 'FACTURA') {
                              setTipoDocumento('RUC');
                              limpiarError('tipoDocumento');
                            }
                          }}
                          className={inputClase('tipoComprobante')}
                        >
                          <option value="BOLETA">Boleta</option>
                          <option value="FACTURA">Factura</option>
                        </select>
                        {erroresCampos.tipoComprobante && (
                          <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.tipoComprobante}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">TIPO DE DOCUMENTO</label>
                        <select
                          id="duplicado-tipo-documento"
                          value={tipoDocumento}
                          disabled={tipoComprobante === 'FACTURA'}
                          onChange={(event) => {
                            setTipoDocumento(event.target.value as typeof tipoDocumento);
                            limpiarError('tipoDocumento');
                            limpiarError('documento');
                          }}
                          className={inputClase('tipoDocumento', 'disabled:bg-slate-100')}
                        >
                          <option value="DNI">DNI</option>
                          <option value="RUC">RUC</option>
                          <option value="CARNETEXTRANJERIA">Carnet de extranjería</option>
                        </select>
                        {erroresCampos.tipoDocumento && (
                          <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.tipoDocumento}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">NÚMERO DE DOCUMENTO</label>
                        <input
                          id="duplicado-documento"
                          value={documento}
                          maxLength={tipoDocumento === 'RUC' ? 11 : tipoDocumento === 'DNI' ? 8 : 20}
                          placeholder={tipoDocumento === 'RUC' ? '11 dígitos' : tipoDocumento === 'DNI' ? '8 dígitos' : 'Número de documento'}
                          onChange={(event) => {
                            setDocumento(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                            limpiarError('documento');
                          }}
                          className={inputClase('documento', 'font-semibold')}
                        />
                        {erroresCampos.documento && (
                          <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.documento}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">NOMBRE / RAZÓN SOCIAL</label>
                        <input
                          id="duplicado-nombre"
                          value={nombre}
                          maxLength={100}
                          placeholder="Nombre o razón social"
                          onChange={(event) => {
                            setNombre(event.target.value);
                            limpiarError('nombre');
                          }}
                          className={inputClase('nombre', 'font-semibold')}
                        />
                        {erroresCampos.nombre && (
                          <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.nombre}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-600 block mb-1">DIRECCIÓN FISCAL</label>
                        <input
                          id="duplicado-direccion"
                          value={direccion}
                          maxLength={100}
                          placeholder="Dirección fiscal"
                          onChange={(event) => {
                            setDireccion(event.target.value);
                            limpiarError('direccion');
                          }}
                          className={inputClase('direccion')}
                        />
                        {erroresCampos.direccion && (
                          <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.direccion}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">CORREO</label>
                        <input
                          id="duplicado-email"
                          type="email"
                          value={email}
                          placeholder="correo@ejemplo.com (opcional)"
                          onChange={(event) => {
                            setEmail(event.target.value);
                            limpiarError('email');
                          }}
                          className={inputClase('email')}
                        />
                        {erroresCampos.email && (
                          <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">TELÉFONO</label>
                        <input
                          id="duplicado-telefono"
                          value={telefono}
                          maxLength={30}
                          placeholder="Teléfono (opcional)"
                          onChange={(event) => {
                            setTelefono(event.target.value);
                            limpiarError('telefono');
                          }}
                          className={inputClase('telefono')}
                        />
                        {erroresCampos.telefono && (
                          <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.telefono}</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="font-black text-slate-800">Pago al contado</h3>
                        <p className="text-xs text-slate-500">
                          Puede registrar uno o varios medios de pago hasta completar los S/ {totalDuplicado.toFixed(2)}.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-500">Total a pagar: </span>
                        <span className="text-sm font-black text-[#052a79]">S/ {totalDuplicado.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Resumen de cuenta de pagos */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                        <p className="text-xs font-bold text-slate-500">TOTAL DUPLICADO</p>
                        <p className="text-lg font-black text-slate-800">S/ {totalDuplicado.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                        <p className="text-xs font-bold text-emerald-700">PAGADO</p>
                        <p className="text-lg font-black text-emerald-800">S/ {totalPagado.toFixed(2)}</p>
                      </div>
                      <div className={`rounded-xl border p-3 text-center ${saldoPendiente === 0 ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
                        <p className={`text-xs font-bold ${saldoPendiente === 0 ? 'text-green-700' : 'text-amber-700'}`}>FALTA PAGAR</p>
                        <p className={`text-lg font-black ${saldoPendiente === 0 ? 'text-green-800' : 'text-amber-800'}`}>S/ {saldoPendiente.toFixed(2)}</p>
                      </div>
                    </div>

                    {pagoCompleto ? (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        <span>Pago completo. Puede emitir el comprobante.</span>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-bold text-amber-800">
                        Falta registrar S/ {saldoPendiente.toFixed(2)} para completar el total del duplicado.
                      </div>
                    )}

                    {erroresCampos.pagos && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-800">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                        <span>{erroresCampos.pagos}</span>
                      </div>
                    )}

                    {/* Formulario para agregar pago si queda saldo pendiente */}
                    {saldoPendiente > 0 && (
                      <div className="mt-4 rounded-xl border-2 border-slate-200 bg-white p-4 space-y-4">
                        <p className="text-xs font-black tracking-wide text-[#052a79]">AGREGAR MEDIO DE PAGO</p>

                        <div className="grid grid-cols-3 gap-2">
                          {(['EFECTIVO', 'TARJETA', 'BANCO'] as MedioPago[]).map((medio) => (
                            <button
                              type="button"
                              key={medio}
                              onClick={() => {
                                setPagoTab(medio);
                                setNroOperacion('');
                                setError('');
                                setErroresCampos((prev) => {
                                  const c = { ...prev };
                                  delete c.tarjetaKey;
                                  delete c.modalidadTarjeta;
                                  delete c.nroOperacion;
                                  delete c.fechaDeposito;
                                  delete c.cuentaBancaria;
                                  return c;
                                });
                              }}
                              className={`rounded-lg border px-3 py-2 text-xs font-black transition-colors ${
                                pagoTab === medio
                                  ? 'border-[#052a79] bg-[#052a79] text-white shadow-sm'
                                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {medio}
                            </button>
                          ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-600">MONTO (S/) *</label>
                            <input
                              id="duplicado-monto-pago"
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={saldoPendiente}
                              value={montoPago}
                              onChange={(e) => {
                                setMontoPago(e.target.value);
                                limpiarError('montoPago');
                                limpiarError('pagos');
                              }}
                              placeholder="0.00"
                              className={inputClase('montoPago', 'font-bold')}
                            />
                            {erroresCampos.montoPago && (
                              <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.montoPago}</p>
                            )}
                          </div>

                          {pagoTab !== 'EFECTIVO' && (
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-600">N.° OPERACIÓN / REFERENCIA *</label>
                              <input
                                id="duplicado-nro-operacion"
                                type="text"
                                value={nroOperacion}
                                onChange={(e) => {
                                  setNroOperacion(e.target.value);
                                  limpiarError('nroOperacion');
                                }}
                                placeholder={pagoTab === 'TARJETA' ? 'Ej. 123456' : 'N.° de operación bancaria'}
                                className={inputClase('nroOperacion', 'font-bold')}
                              />
                              {erroresCampos.nroOperacion && (
                                <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.nroOperacion}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {pagoTab === 'TARJETA' && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-600">MARCA / MEDIO *</label>
                              <select
                                id="duplicado-tarjeta-key"
                                value={tarjetaKey}
                                onChange={(e) => {
                                  setTarjetaKey(e.target.value);
                                  setModalidadTarjeta('DEBITO');
                                  limpiarError('tarjetaKey');
                                }}
                                className={inputClase('tarjetaKey')}
                              >
                                <option value="">-- Seleccione tarjeta --</option>
                                {maestros?.tarjetas.map((item) => (
                                  <option key={item.key} value={item.key}>{item.nombre}</option>
                                ))}
                              </select>
                              {erroresCampos.tarjetaKey && (
                                <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.tarjetaKey}</p>
                              )}
                            </div>
                            {!esBilletera && tarjetaKey && (
                              <div>
                                <label className="mb-1 block text-xs font-bold text-slate-600">MODALIDAD *</label>
                                <select
                                  id="duplicado-modalidad-tarjeta"
                                  value={modalidadTarjeta}
                                  onChange={(e) => {
                                    setModalidadTarjeta(e.target.value as 'DEBITO' | 'CREDITO');
                                    limpiarError('modalidadTarjeta');
                                  }}
                                  className={inputClase('modalidadTarjeta')}
                                >
                                  <option value="DEBITO">Débito</option>
                                  <option value="CREDITO">Crédito</option>
                                </select>
                                {erroresCampos.modalidadTarjeta && (
                                  <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.modalidadTarjeta}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {pagoTab === 'BANCO' && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-slate-700">
                              <strong>{entidadFaregas?.nombre || maestros?.cuentaFaregas?.entidad || 'Cuenta FAREGAS'}</strong><br />
                              Cuenta: {maestros?.cuentaFaregas?.numeroCompleto || cuentaFaregas?.nombre || '-'}<br />
                              CCI: {maestros?.cuentaFaregas?.cci || '-'}
                              {erroresCampos.cuentaBancaria && (
                                <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.cuentaBancaria}</p>
                              )}
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-600">FECHA DEPÓSITO *</label>
                              <input
                                id="duplicado-fecha-deposito"
                                type="date"
                                max={fechaHoy()}
                                value={fechaDeposito}
                                onChange={(e) => {
                                  setFechaDeposito(e.target.value);
                                  limpiarError('fechaDeposito');
                                }}
                                className={inputClase('fechaDeposito')}
                              />
                              {erroresCampos.fechaDeposito && (
                                <p className="mt-1 text-xs font-semibold text-red-600">{erroresCampos.fechaDeposito}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleAgregarPago}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#052a79] py-2.5 text-sm font-black text-white hover:bg-blue-900 transition shadow-sm"
                        >
                          <PlusCircle className="h-4 w-4" /> Agregar pago
                        </button>
                      </div>
                    )}

                    {/* Lista de pagos registrados */}
                    <div className="mt-4">
                      <h4 className="text-xs font-black tracking-wide text-slate-700 mb-2">PAGOS REGISTRADOS</h4>

                      {avisoPagoConfirmado && (
                        <div className="mb-3 flex items-start justify-between rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>{avisoPagoConfirmado}</span>
                          </div>
                          <button type="button" onClick={() => setAvisoPagoConfirmado('')} className="font-bold text-amber-800 ml-2">✕</button>
                        </div>
                      )}

                      {pagosAgregados.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                          No hay pagos registrados. Ingrese el monto y pulse "Agregar pago".
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {pagosAgregados.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-800">
                                    {p.tipo} {p.tarjetaNombre ? `· ${p.tarjetaNombre}` : p.tarjetaKey ? `· ${p.tarjetaKey}` : ''} {p.modalidadTarjeta ? `(${p.modalidadTarjeta})` : ''}
                                  </span>
                                  {p.id && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      CONFIRMADO
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {p.nroOperacion ? `Operación: ${p.nroOperacion}` : 'Sin referencia'}
                                  {p.fechaDeposito ? ` · Fecha: ${textoFecha(p.fechaDeposito)}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-[#052a79]">S/ {parseFloat(p.importe).toFixed(2)}</span>
                                <button
                                  type="button"
                                  onClick={() => eliminarPago(idx)}
                                  className={`rounded-lg p-1.5 transition ${
                                    p.id
                                      ? 'text-slate-300 hover:text-amber-600 cursor-pointer'
                                      : 'text-red-500 hover:bg-red-50 hover:text-red-700'
                                  }`}
                                  title={p.id ? 'Pago confirmado en caja (protegido)' : 'Eliminar pago'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {solicitud.estado === 'DISPONIBLE' && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-black text-emerald-800">Duplicado disponible</p><p className="text-sm text-emerald-700">El PDF conserva exactamente el certificado original, sin marcas de agua.</p></div>}

              {solicitud.estado === 'DISPONIBLE' && (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
                    <div>
                      <h3 className="font-black text-slate-800">Vista previa del duplicado</h3>
                      <p className="text-xs text-slate-500">Revise el documento antes de imprimirlo.</p>
                    </div>
                    <button type="button" onClick={() => void imprimirDuplicado()} disabled={!vistaHtml || cargandoVista} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#052a79] px-4 py-2 text-sm font-black text-white disabled:opacity-40">
                      <Printer className="h-4 w-4" /> Imprimir duplicado
                    </button>
                  </div>
                  {cargandoVista ? (
                    <div className="flex h-72 items-center justify-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Cargando vista previa...</div>
                  ) : vistaHtml ? (
                    <iframe ref={vistaRef} title="Vista previa del duplicado" srcDoc={vistaHtml} className="h-[68vh] min-h-[520px] w-full bg-white" />
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm font-bold text-red-600">No se pudo cargar la vista previa.</div>
                  )}
                </section>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={volverBusqueda} disabled={procesando} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">{solicitud.estado === 'DISPONIBLE' ? 'Volver al historial' : 'Volver'}</button>
                {solicitud.estado !== 'DISPONIBLE' && (
                  <button
                    type="button"
                    onClick={() => void procesar()}
                    disabled={procesando}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
                    {pagoYaRegistrado
                      ? 'Confirmar comprobante y habilitar duplicado'
                      : saldoPendiente > 0
                        ? `Falta pagar S/ ${saldoPendiente.toFixed(2)}`
                        : 'Pagar S/ 50.00 y emitir comprobante'}
                  </button>
                )}
                {solicitud.estado === 'DISPONIBLE' && <><button type="button" onClick={() => void descargar('COMPROBANTE')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#052a79] px-4 py-2 text-sm font-black text-[#052a79]"><FileText className="h-4 w-4" /> Descargar comprobante</button><button type="button" onClick={() => void descargar('CERTIFICADO')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-black text-white"><Download className="h-4 w-4" /> Descargar duplicado</button></>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
