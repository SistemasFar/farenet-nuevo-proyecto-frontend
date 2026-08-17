import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { CheckCircle2, FileText, Loader2, Search, Send, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import { faregasClientesApi } from '../../../../services/faregas-clientes.api';
import type { FacturacionFaregas } from '../../../../types/faregas-api';
import type { FormFacturacionState } from '../../NuevoCertificadoView';

interface FacturacionStepProps {
  certificadoId?: number;
  formFacturacion: FormFacturacionState;
  setFormFacturacion: Dispatch<SetStateAction<FormFacturacionState>>;
  facturacion: FacturacionFaregas | null;
  onFacturacionChange: (facturacion: FacturacionFaregas | null) => void;
}

export function FacturacionStep({
  certificadoId,
  formFacturacion,
  setFormFacturacion,
  facturacion,
  onFacturacionChange,
}: FacturacionStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [integracion, setIntegracion] = useState<{ enabled: boolean; configured: boolean } | null>(null);
  const bloqueado = facturacion?.estado === 'ACEPTADO' || facturacion?.estado === 'PENDIENTE' || facturacion?.estado === 'ERROR';

  useEffect(() => {
    if (!certificadoId) return;
    setIsLoading(true);
    faregasCertificadosApi.obtenerFacturacion(certificadoId)
      .then(response => {
        const guardada = response.data?.facturacion as FacturacionFaregas | null;
        setIntegracion(response.data?.integracion || null);
        onFacturacionChange(guardada);
        if (guardada) {
          setFormFacturacion(prev => ({
            ...prev,
            tipoDocFac: guardada.tipoComprobante,
            nroDocFac: guardada.nroDocumento,
            razonSocialFac: guardada.nombreRazonSocial,
            direccionFac: guardada.direccion,
            emailFac: guardada.email || '',
            telefonoFac: guardada.telefono || '',
          }));
        }
      })
      .catch(error => Swal.fire('Facturacion', error.message || 'No se pudo recuperar la facturacion.', 'error'))
      .finally(() => setIsLoading(false));
  }, [certificadoId, onFacturacionChange, setFormFacturacion]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const normalizado = type === 'email' ? value.trim().toLowerCase() : value.toUpperCase();
    setFormFacturacion(prev => ({ ...prev, [name]: normalizado }));
  };

  const datosRequest = () => ({
    tipoComprobante: formFacturacion.tipoDocFac,
    nroDocumento: formFacturacion.nroDocFac,
    nombreRazonSocial: formFacturacion.razonSocialFac,
    direccion: formFacturacion.direccionFac,
    email: formFacturacion.emailFac || null,
    telefono: formFacturacion.telefonoFac || null,
  });

  const guardar = async (notificar = true) => {
    if (!certificadoId) throw new Error('No existe un borrador de certificado.');
    setIsSaving(true);
    try {
      const response = await faregasCertificadosApi.guardarFacturacion(certificadoId, datosRequest());
      const guardada = response.data as FacturacionFaregas;
      onFacturacionChange(guardada);
      if (notificar) await Swal.fire('Guardado', 'Los datos fiscales quedaron guardados.', 'success');
      return guardada;
    } finally {
      setIsSaving(false);
    }
  };

  const buscarCliente = async () => {
    const documento = formFacturacion.nroDocFac.replace(/\D/g, '');
    const tipo = documento.length === 11 ? 'RUC' : documento.length === 8 ? 'DNI' : '';
    if (!tipo) {
      await Swal.fire('Documento invalido', 'Ingrese un DNI de 8 digitos o un RUC de 11 digitos.', 'warning');
      return;
    }
    setIsSearching(true);
    try {
      const response = await faregasClientesApi.autocompletarPersona(tipo, documento);
      const persona = response.data;
      setFormFacturacion(prev => ({
        ...prev,
        razonSocialFac: persona.nombreRazonSocial || persona.nombrerazonsocial || '',
        direccionFac: persona.direccion || '',
        emailFac: persona.correo || persona.email || '',
        telefonoFac: persona.telefono || '',
      }));
    } catch (error: any) {
      await Swal.fire('Sin coincidencias', error.message || 'No se encontro el documento en Faregas ni Farenet.', 'info');
    } finally {
      setIsSearching(false);
    }
  };

  const emitir = async () => {
    if (!certificadoId || isEmitting) return;
    const confirmation = await Swal.fire({
      title: '¿Emitir comprobante electronico?',
      text: 'Se reservara el siguiente numero de la serie compartida con Farenet y se enviara a Nubefact/SUNAT.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'EMITIR COMPROBANTE',
      cancelButtonText: 'CANCELAR',
      confirmButtonColor: '#052a79',
    });
    if (!confirmation.isConfirmed) return;

    setIsEmitting(true);
    try {
      // ERROR/PENDIENTE ya tienen serie reservada y deben reintentarse con el
      // mismo contenido para no generar un comprobante diferente.
      if (facturacion?.estado !== 'ERROR' && facturacion?.estado !== 'PENDIENTE') {
        await guardar(false);
      }
      const response = await faregasCertificadosApi.emitirFacturacion(certificadoId);
      const emitida = response.data as FacturacionFaregas;
      onFacturacionChange(emitida);
      await Swal.fire('Comprobante aceptado', `${emitida.nroComprobante} fue aceptado por Nubefact/SUNAT.`, 'success');
    } catch (error: any) {
      const detalle = Array.isArray(error.detalles) ? error.detalles.join('\n') : error.message;
      await Swal.fire('No se emitio el comprobante', detalle || 'Revise la configuracion o respuesta de Nubefact.', 'error');
    } finally {
      setIsEmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center gap-3 p-16 font-bold text-slate-600"><Loader2 className="h-6 w-6 animate-spin" /> Cargando facturacion...</div>;
  }

  const estadoColor = facturacion?.estado === 'ACEPTADO'
    ? 'border-green-200 bg-green-50 text-green-700'
    : facturacion?.estado === 'RECHAZADO' || facturacion?.estado === 'ERROR'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="rounded-xl bg-[#052a79]/10 p-2.5"><FileText className="h-6 w-6 text-[#052a79]" /></div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Facturacion electronica</h3>
          <p className="text-sm text-slate-500">Datos fiscales independientes del propietario del vehiculo.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 rounded-2xl border-2 border-slate-200 bg-white p-8">
        {facturacion && (
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${estadoColor}`}>
            <div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5" /> ESTADO: {facturacion.estado}</div>
            <div className="font-bold">{facturacion.nroComprobante || 'SIN NUMERO RESERVADO'}</div>
            {facturacion.enlacePdf && <a href={facturacion.enlacePdf} target="_blank" rel="noreferrer" className="underline">VER PDF</a>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">TIPO DE COMPROBANTE</label>
            <select disabled={bloqueado} name="tipoDocFac" value={formFacturacion.tipoDocFac} onChange={handleInput} className="w-full rounded-xl border-2 border-slate-200 p-3 font-bold uppercase focus:border-[#f59e0b] disabled:bg-slate-100">
              <option value="">-- SELECCIONAR --</option>
              <option value="BOLETA">BOLETA</option>
              <option value="FACTURA">FACTURA</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">DNI / RUC</label>
            <div className="flex gap-2">
              <input disabled={bloqueado} inputMode="numeric" name="nroDocFac" value={formFacturacion.nroDocFac} onChange={handleInput} maxLength={11} className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 p-3 font-bold disabled:bg-slate-100" placeholder="Numero de documento" />
              <button type="button" disabled={bloqueado || isSearching} onClick={buscarCliente} className="rounded-xl bg-slate-100 px-4 text-[#052a79] hover:bg-slate-200 disabled:opacity-50" title="Buscar en Faregas y Farenet">
                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-500">NOMBRE / RAZON SOCIAL</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input disabled={bloqueado} name="razonSocialFac" value={formFacturacion.razonSocialFac} onChange={handleInput} className="w-full rounded-xl border-2 border-slate-200 py-3 pl-12 pr-4 font-bold uppercase disabled:bg-slate-100" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-500">DIRECCION FISCAL</label>
            <input disabled={bloqueado} name="direccionFac" value={formFacturacion.direccionFac} onChange={handleInput} className="w-full rounded-xl border-2 border-slate-200 p-3 font-bold uppercase disabled:bg-slate-100" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">CORREO ELECTRONICO (OPCIONAL)</label>
            <input disabled={bloqueado} type="email" name="emailFac" value={formFacturacion.emailFac} onChange={handleInput} className="w-full rounded-xl border-2 border-slate-200 p-3 font-bold disabled:bg-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">TELEFONO (OPCIONAL)</label>
            <input disabled={bloqueado} name="telefonoFac" value={formFacturacion.telefonoFac} onChange={handleInput} className="w-full rounded-xl border-2 border-slate-200 p-3 font-bold disabled:bg-slate-100" />
          </div>
        </div>

        {integracion && (!integracion.enabled || !integracion.configured) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Nubefact esta {integracion.enabled ? 'sin URL o token configurados' : 'deshabilitado'}. Los datos pueden guardarse, pero el comprobante no podra emitirse hasta configurar el backend.
          </div>
        )}

        {facturacion?.sunatDescription && facturacion.estado !== 'ACEPTADO' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{facturacion.sunatDescription}</div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          {!bloqueado && (
            <button type="button" disabled={isSaving || isEmitting} onClick={() => guardar(true)} className="rounded-xl border-2 border-[#052a79] px-5 py-3 text-xs font-black text-[#052a79] disabled:opacity-50">
              {isSaving ? 'GUARDANDO...' : 'GUARDAR DATOS'}
            </button>
          )}
          {facturacion?.estado !== 'ACEPTADO' && (
            <button type="button" disabled={isSaving || isEmitting || !integracion?.enabled || !integracion?.configured} onClick={emitir} className="flex items-center gap-2 rounded-xl bg-[#052a79] px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {isEmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isEmitting ? 'EMITIENDO...' : facturacion?.estado === 'ERROR' || facturacion?.estado === 'PENDIENTE' ? 'REINTENTAR EN NUBEFACT' : 'EMITIR EN NUBEFACT'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
