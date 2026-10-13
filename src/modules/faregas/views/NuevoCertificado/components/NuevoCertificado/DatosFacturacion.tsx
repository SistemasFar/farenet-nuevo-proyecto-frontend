import React, { useState } from 'react';
import { Search, ReceiptText, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import type { TitularState } from './TitularesList';
import { MensajeError, claseConError, type ErroresCampo } from '../../faregas-wizard-errores';
import { faregasClientesApi } from '../../../../services/faregas-clientes.api';
import { atributosDocumento, REGLAS_DOCUMENTO, validarDocumento } from '../../../Usuarios/usuariosValidacion';

const TIPOS_DOCUMENTO_FACTURACION = [
  { value: 'DNI', catalogKey: 'dni', label: 'DNI' },
  { value: 'RUC', catalogKey: 'ruc', label: 'RUC' },
  { value: 'CARNETEXTRANJERIA', catalogKey: 'carnetextranjeria', label: 'CARNÉ DE EXTRANJERÍA' },
] as const;

const normalizarTipoDocumento = (value: unknown) => {
  const tipo = String(value || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (tipo === 'CARNETDEEXTRANJERIA' || tipo === 'CE') return 'CARNETEXTRANJERIA';
  return tipo;
};

const claveCatalogoDocumento = (tipo: string) =>
  TIPOS_DOCUMENTO_FACTURACION.find((item) => item.value === tipo)?.catalogKey || '';

export interface DatosFacturacionProps {
  titulares: TitularState[];
  formFacturacion: FormFacturacionState;
  setFormFacturacion: React.Dispatch<React.SetStateAction<FormFacturacionState>>;
  erroresCampo?: ErroresCampo;
  onCorregirCampo?: (campo: string) => void;
  tituloSeccion?: string;
  dataSeccion?: string;
}

export function DatosFacturacion({
  titulares,
  formFacturacion,
  setFormFacturacion,
  erroresCampo = {},
  onCorregirCampo,
  tituloSeccion,
  dataSeccion,
}: DatosFacturacionProps) {
  const [buscando, setBuscando] = useState(false);
  const [errorDocumentoConsulta, setErrorDocumentoConsulta] = useState<string | null>(null);
  const facturarAlTitular = Boolean(titulares.length > 0 && formFacturacion.usarTitularPrincipalFac);
  const tipoDocumentoSeleccionado = normalizarTipoDocumento(formFacturacion.tipoDocumentoFac || 'DNI');
  const atributosNumeroDocumento = atributosDocumento(claveCatalogoDocumento(tipoDocumentoSeleccionado));

  const handleFacturacionChange = (field: keyof FormFacturacionState, value: string | boolean) => {
    onCorregirCampo?.(String(field));
    setFormFacturacion((prev) => {
      if (typeof value === 'boolean') return { ...prev, [field]: value };

      let normalizado = typeof value === 'string' ? value.toUpperCase() : value;
      if (field === 'emailFac') normalizado = (value as string).trim().toLowerCase();
      if (field === 'nroDocFac') {
        const regla = REGLAS_DOCUMENTO[claveCatalogoDocumento(tipoDocumentoSeleccionado)];
        normalizado = regla?.soloDigitos
          ? (value as string).replace(/\D/g, '').slice(0, regla.maxLength)
          : (value as string).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, regla?.maxLength || 20);
        setErrorDocumentoConsulta(
          normalizado ? validarDocumento(claveCatalogoDocumento(tipoDocumentoSeleccionado), normalizado) : null
        );
      }
      if (field === 'telefonoFac') normalizado = (value as string).replace(/\D/g, '').slice(0, 9);
      return { ...prev, [field]: normalizado };
    });
  };

  const handleTipoDocumentoChange = (tipo: string) => {
    const tipoNormalizado = normalizarTipoDocumento(tipo);
    const errorDocumento = formFacturacion.nroDocFac
      ? validarDocumento(claveCatalogoDocumento(tipoNormalizado), formFacturacion.nroDocFac)
      : null;
    setErrorDocumentoConsulta(errorDocumento);
    onCorregirCampo?.('tipoDocumentoFac');
    onCorregirCampo?.('nroDocFac');
    onCorregirCampo?.('razonSocialFac');
    onCorregirCampo?.('direccionFac');
    onCorregirCampo?.('emailFac');
    onCorregirCampo?.('telefonoFac');
    setFormFacturacion((prev) => ({
      ...prev,
      tipoDocumentoFac: tipoNormalizado,
      tipoDocFac: tipoNormalizado === 'RUC'
        ? 'FACTURA'
        : prev.tipoDocFac === 'FACTURA' ? 'BOLETA' : prev.tipoDocFac,
      razonSocialFac: '',
      direccionFac: '',
      emailFac: '',
      telefonoFac: '',
    }));
  };

  const handleFacturarAlTitularChange = (checked: boolean) => {
    const titularPrincipal = [...titulares].sort((a, b) => a.orden - b.orden)[0];
    if (!checked || !titularPrincipal) {
      handleFacturacionChange('usarTitularPrincipalFac', checked);
      return;
    }
    const tipoDocumentoFac = normalizarTipoDocumento(titularPrincipal.tipoDocumento || 'DNI');
    setErrorDocumentoConsulta(null);
    setFormFacturacion((prev) => ({
      ...prev,
      usarTitularPrincipalFac: true,
      tipoDocFac: tipoDocumentoFac === 'RUC' ? 'FACTURA' : 'BOLETA',
      tipoDocumentoFac,
      nroDocFac: titularPrincipal.nroDocumento,
      razonSocialFac: titularPrincipal.nombreRazonSocial,
      direccionFac: titularPrincipal.direccion,
    }));
  };

  const buscarClienteFacturacion = async () => {
    if (buscando) return;
    const tipoDocumento = tipoDocumentoSeleccionado;
    const claveCatalogo = claveCatalogoDocumento(tipoDocumento);
    if (!claveCatalogo) {
      await Swal.fire({
        icon: 'warning',
        title: 'Tipo de documento requerido',
        text: 'Seleccione el tipo de documento que desea consultar.',
      });
      return;
    }
    const docNormalizado = String(formFacturacion.nroDocFac || '').trim().toUpperCase();
    const errorDocumento = validarDocumento(claveCatalogo, docNormalizado);
    setErrorDocumentoConsulta(errorDocumento);
    if (errorDocumento) {
      await Swal.fire({ icon: 'warning', title: 'Documento inválido', text: errorDocumento });
      return;
    }

    setBuscando(true);
    try {
      const response = await faregasClientesApi.consultarDocumento(tipoDocumento, docNormalizado);
      if (response && response.encontrado && response.data) {
        const cliente = response.data;
        const tipoComprobante = tipoDocumento === 'RUC' ? 'FACTURA' : 'BOLETA';

        onCorregirCampo?.('tipoDocFac');
        onCorregirCampo?.('nroDocFac');
        onCorregirCampo?.('razonSocialFac');
        onCorregirCampo?.('direccionFac');
        onCorregirCampo?.('emailFac');
        onCorregirCampo?.('telefonoFac');

        setFormFacturacion((prev) => ({
          ...prev,
          tipoDocFac: tipoComprobante,
          tipoDocumentoFac: tipoDocumento,
          razonSocialFac: cliente.nombreRazonSocial || prev.razonSocialFac,
          direccionFac: cliente.direccion || prev.direccionFac,
          emailFac: cliente.correo || cliente.email || prev.emailFac,
          telefonoFac: cliente.telefono || prev.telefonoFac,
        }));

        const textoOrigen = response.origen === 'FAREGAS'
          ? 'Datos recuperados de Faregas.'
          : response.origen === 'RENIEC'
            ? 'Datos obtenidos de consulta DNI.'
            : response.origen === 'SUNAT'
              ? 'Datos obtenidos de consulta RUC.'
              : 'Datos obtenidos de consulta externa.';
        await Swal.fire({
          icon: 'success',
          title: 'Cliente encontrado',
          text: textoOrigen,
          timer: 2000,
          showConfirmButton: false,
        });
      } else if (response?.origen === 'EXTERNO_NO_CONFIGURADO') {
        await Swal.fire({
          icon: 'info',
          title: 'Consulta externa no configurada',
          text: 'Consulta externa no configurada. Puede completar los datos manualmente.',
        });
      } else if (response?.origen === 'SIN_PROVEEDOR_PARA_TIPO') {
        await Swal.fire({
          icon: 'info',
          title: 'Consulta externa no disponible para este tipo',
          text: 'No existe consulta externa configurada para este tipo de documento. Complete los datos manualmente.',
        });
      } else if (response?.origen === 'EXTERNO_NO_AUTORIZADO') {
        await Swal.fire({
          icon: 'warning',
          title: 'Consulta externa no autorizada',
          text: 'No fue posible autenticar la consulta externa. Puede completar los datos manualmente.',
        });
      } else if (response?.origen === 'EXTERNO_TIMEOUT') {
        await Swal.fire({
          icon: 'info',
          title: 'Servicio temporalmente no disponible',
          text: 'El servicio de consulta no está disponible temporalmente. Puede completar los datos manualmente.',
        });
      } else if (response?.origen === 'ERROR_EXTERNO') {
        await Swal.fire({
          icon: 'info',
          title: 'Consulta no disponible',
          text: 'No fue posible consultar el documento. Puede completar los datos manualmente.',
        });
      } else if (response?.origen === 'NO_ENCONTRADO') {
        await Swal.fire({
          icon: 'info',
          title: 'Sin coincidencias',
          text: 'No se encontraron datos para este documento.',
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: 'info',
          title: 'Consulta no disponible',
          text: 'No fue posible consultar el documento. Puede completar los datos manualmente.',
        });
      }
    } catch {
      await Swal.fire({
        icon: 'info',
        title: 'Consulta no disponible',
        text: 'No fue posible consultar el documento. Puede completar los datos manualmente.',
      });
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-xl border-2 border-blue-200 bg-white"
      data-seccion-facturacion={dataSeccion || undefined}
    >
      <div className="flex flex-col gap-3 border-b border-blue-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#052a79] p-2 text-white">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-sm font-black capitalize text-[#052a79]">
              {tituloSeccion || 'DATOS PARA FACTURACIÓN'}
            </h5>
            <p className="text-xs font-medium text-slate-600">
              Se utilizarán posteriormente para emitir la boleta o factura.
            </p>
          </div>
        </div>
        {titulares.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={formFacturacion.usarTitularPrincipalFac}
              onChange={(event) => handleFacturarAlTitularChange(event.target.checked)}
              className="h-4 w-4 accent-[#052a79]"
            />
            FACTURAR AL DUEÑO PRINCIPAL
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
        {facturarAlTitular && !titulares.length && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 md:col-span-4">
            Agregue el dueño principal para completar automáticamente los datos de facturación.
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">TIPO DE COMPROBANTE</label>
          <select
            value={formFacturacion.tipoDocFac}
            disabled={facturarAlTitular}
            onChange={(event) => handleFacturacionChange('tipoDocFac', event.target.value)}
            className={claseConError(
              'h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b] disabled:bg-slate-100 disabled:text-slate-500',
              Boolean(erroresCampo['tipoDocFac'])
            )}
            data-campo-error={erroresCampo['tipoDocFac'] ? true : undefined}
            aria-invalid={erroresCampo['tipoDocFac'] ? true : undefined}
            aria-describedby={erroresCampo['tipoDocFac'] ? 'error-tipoDocFac' : undefined}
          >
            <option value="">-- SELECCIONAR --</option>
            <option value="BOLETA">BOLETA</option>
            <option value="FACTURA">FACTURA</option>
          </select>
          <MensajeError campo="tipoDocFac" errores={erroresCampo} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            TIPO DE DOCUMENTO <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            aria-label="Tipo de documento de facturación"
            value={tipoDocumentoSeleccionado}
            disabled={facturarAlTitular}
            onChange={(event) => handleTipoDocumentoChange(event.target.value)}
            className={claseConError(
              'h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b] disabled:bg-slate-100 disabled:text-slate-500',
              Boolean(erroresCampo['tipoDocumentoFac'])
            )}
            data-campo-error={erroresCampo['tipoDocumentoFac'] ? true : undefined}
          >
            {TIPOS_DOCUMENTO_FACTURACION.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
          <MensajeError campo="tipoDocumentoFac" errores={erroresCampo} />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            NÚMERO DE DOCUMENTO <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <div className="flex gap-2">
            <input
              aria-label="Número de documento de facturación"
              value={formFacturacion.nroDocFac}
              readOnly={facturarAlTitular}
              onChange={(event) => handleFacturacionChange('nroDocFac', event.target.value)}
              onBlur={() => setErrorDocumentoConsulta(
                formFacturacion.nroDocFac
                  ? validarDocumento(claveCatalogoDocumento(tipoDocumentoSeleccionado), formFacturacion.nroDocFac)
                  : null
              )}
              inputMode={atributosNumeroDocumento.inputMode}
              maxLength={atributosNumeroDocumento.maxLength}
              className={claseConError(
                'h-[42px] min-w-0 flex-1 rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b] read-only:bg-slate-100 read-only:text-slate-500',
                Boolean(erroresCampo['nroDocFac'] || errorDocumentoConsulta)
              )}
              data-campo-error={(erroresCampo['nroDocFac'] || errorDocumentoConsulta) ? true : undefined}
              aria-invalid={(erroresCampo['nroDocFac'] || errorDocumentoConsulta) ? true : undefined}
              aria-describedby={(erroresCampo['nroDocFac'] || errorDocumentoConsulta) ? 'error-nroDocFac' : undefined}
            />
            <button
              type="button"
              onClick={buscarClienteFacturacion}
              disabled={buscando}
              className="flex h-[42px] items-center justify-center rounded-lg bg-slate-200 px-3 transition-colors hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Buscar cliente en Faregas / Consulta externa"
              aria-label="Buscar cliente"
            >
              {buscando ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              ) : (
                <Search className="h-5 w-5 text-slate-600" />
              )}
            </button>
          </div>
          {errorDocumentoConsulta
            ? <p id="error-nroDocFac" className="mt-1 text-xs font-semibold text-red-600">{errorDocumentoConsulta}</p>
            : <MensajeError campo="nroDocFac" errores={erroresCampo} />}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold text-slate-500">NOMBRE / RAZÓN SOCIAL</label>
          <input
            value={formFacturacion.razonSocialFac}
            readOnly={facturarAlTitular}
            onChange={(event) => handleFacturacionChange('razonSocialFac', event.target.value)}
            maxLength={100}
            className={claseConError(
              'h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold capitalize text-slate-800 focus:border-[#f59e0b] read-only:bg-slate-100 read-only:text-slate-500',
              Boolean(erroresCampo['razonSocialFac'])
            )}
            data-campo-error={erroresCampo['razonSocialFac'] ? true : undefined}
            aria-invalid={erroresCampo['razonSocialFac'] ? true : undefined}
            aria-describedby={erroresCampo['razonSocialFac'] ? 'error-razonSocialFac' : undefined}
          />
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-bold text-slate-500">DIRECCIÓN FISCAL</label>
          <input
            value={formFacturacion.direccionFac}
            readOnly={facturarAlTitular}
            onChange={(event) => handleFacturacionChange('direccionFac', event.target.value)}
            maxLength={100}
            className={claseConError(
              'h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold capitalize text-slate-800 focus:border-[#f59e0b] read-only:bg-slate-100 read-only:text-slate-500',
              Boolean(erroresCampo['direccionFac'])
            )}
            data-campo-error={erroresCampo['direccionFac'] ? true : undefined}
            aria-invalid={erroresCampo['direccionFac'] ? true : undefined}
            aria-describedby={erroresCampo['direccionFac'] ? 'error-direccionFac' : undefined}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            CORREO ELECTRÓNICO <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            required
            aria-required="true"
            value={formFacturacion.emailFac}
            onChange={(event) => handleFacturacionChange('emailFac', event.target.value)}
            className={claseConError(
              'h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b]',
              Boolean(erroresCampo['emailFac'])
            )}
            data-campo-error={erroresCampo['emailFac'] ? true : undefined}
            aria-invalid={erroresCampo['emailFac'] ? true : undefined}
            aria-describedby={erroresCampo['emailFac'] ? 'error-emailFac' : undefined}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            TELÉFONO <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            type="tel"
            required
            aria-required="true"
            value={formFacturacion.telefonoFac}
            onChange={(event) => handleFacturacionChange('telefonoFac', event.target.value)}
            maxLength={9}
            className={claseConError(
              'h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b]',
              Boolean(erroresCampo['telefonoFac'])
            )}
            data-campo-error={erroresCampo['telefonoFac'] ? true : undefined}
            aria-invalid={erroresCampo['telefonoFac'] ? true : undefined}
            aria-describedby={erroresCampo['telefonoFac'] ? 'error-telefonoFac' : undefined}
          />
        </div>

        <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-xs font-medium text-slate-600 md:col-span-4">
          {facturarAlTitular
            ? 'El documento, nombre y dirección se mantienen sincronizados con el dueño principal.'
            : 'La boleta o factura se emitirá a una persona o empresa diferente del dueño del vehículo.'}
        </div>
      </div>
    </div>
  );
}
