import { DatosFacturacion } from './DatosFacturacion';
import React, { useState } from 'react';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import { MensajeError, claseConError, type ErroresCampo } from '../../faregas-wizard-errores';
import { faregasClientesApi } from '../../../../services/faregas-clientes.api';

/** Clase original de los campos de titular; el error sólo cambia el color. */
const CLASE_CAMPO = 'w-full h-[42px] px-3 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors';

export interface TitularState {
  _uuid: string; // for React keys
  titularId: number | null;
  orden: number;
  clienteId: number | null;
  tipoDocumento: string;
  nroDocumento: string;
  nombreRazonSocial: string;
  direccion: string;
}

interface TitularesListProps {
  titulares: TitularState[];
  setTitulares: React.Dispatch<React.SetStateAction<TitularState[]>>;
  formFacturacion: FormFacturacionState;
  setFormFacturacion: React.Dispatch<React.SetStateAction<FormFacturacionState>>;
  onRemoveTitular?: (titular: TitularState) => Promise<void>;
  erroresCampo?: ErroresCampo;
  onCorregirCampo?: (campo: string) => void;
  mostrarTitulares?: boolean;
  mostrarFacturacion?: boolean;
  mostrarDireccionTitular?: boolean;
  integrarPropietarioGlpAnual?: boolean;
}

export function TitularesList({
  titulares,
  setTitulares,
  formFacturacion,
  setFormFacturacion,
  onRemoveTitular,
  erroresCampo = {},
  onCorregirCampo,
  mostrarTitulares = true,
  mostrarFacturacion = true,
  mostrarDireccionTitular = false,
  integrarPropietarioGlpAnual = false,
}: TitularesListProps) {
  const [buscandoUuid, setBuscandoUuid] = useState<string | null>(null);
  const facturarAlTitular = Boolean(titulares.length > 0 && formFacturacion.usarTitularPrincipalFac);
  const titularPrincipal = [...titulares].sort((a, b) => a.orden - b.orden)[0] || null;
  const errorTitular = (indice: number, campo: string) => erroresCampo[`titular.${indice}.${campo}`];
  const limpiarTitular = (indice: number, campo: string) => onCorregirCampo?.(`titular.${indice}.${campo}`);

  const handleFacturarAlTitularChange = (checked: boolean) => {
    if (!checked || !titularPrincipal) {
      setFormFacturacion((prev) => ({ ...prev, usarTitularPrincipalFac: false }));
      return;
    }

    const tipoDocumentoFac = String(titularPrincipal.tipoDocumento || 'DNI').trim().toUpperCase();
    const tipoDocFac = tipoDocumentoFac === 'RUC' ? 'FACTURA' : 'BOLETA';
    ['tipoDocFac', 'tipoDocumentoFac', 'nroDocFac', 'razonSocialFac', 'direccionFac']
      .forEach((campo) => onCorregirCampo?.(campo));
    setFormFacturacion((prev) => ({
      ...prev,
      usarTitularPrincipalFac: true,
      tipoDocFac,
      tipoDocumentoFac,
      nroDocFac: titularPrincipal.nroDocumento,
      razonSocialFac: titularPrincipal.nombreRazonSocial,
      direccionFac: titularPrincipal.direccion,
      condicionPagoFac: tipoDocFac === 'BOLETA' ? 'CONTADO' : prev.condicionPagoFac,
      fechaVencimientoFac: tipoDocFac === 'BOLETA' ? '' : prev.fechaVencimientoFac,
      cuotasFac: tipoDocFac === 'BOLETA' ? [] : prev.cuotasFac,
    }));
  };
  
  const handleAdd = () => {
    const nextOrden = titulares.length > 0 ? Math.max(...titulares.map(t => t.orden)) + 1 : 1;
    setTitulares(prev => [
      ...prev,
      {
        _uuid: Math.random().toString(36).substring(2) + Date.now().toString(36),
        titularId: null,
        orden: nextOrden,
        clienteId: null,
        tipoDocumento: 'DNI',
        nroDocumento: '',
        nombreRazonSocial: '',
        direccion: ''
      }
    ]);
  };

  const handleChange = (uuid: string, field: keyof TitularState, value: string) => {
    setTitulares(prev => prev.map(t => {
      if (t._uuid !== uuid) return t;
      let finalValue = value.toUpperCase();
      
      if (field === 'nroDocumento') {
        const tipo = t.tipoDocumento;
        if (tipo === 'DNI') {
          finalValue = finalValue.replace(/[^0-9]/g, '').slice(0, 8);
        } else if (tipo === 'RUC') {
          finalValue = finalValue.replace(/[^0-9]/g, '').slice(0, 11);
        } else {
          finalValue = finalValue.replace(/[^A-Z0-9]/g, '').slice(0, 15);
        }
      } else if (field === 'tipoDocumento') {
        // Reset doc number if type changes
        return { ...t, [field]: finalValue, nroDocumento: '', clienteId: null };
      }
      
      return { ...t, [field]: finalValue };
    }));
  };

  const handleBuscarCliente = async (titular: TitularState, index: number) => {
    if (buscandoUuid) return;

    const tipo = String(titular.tipoDocumento || 'DNI').trim().toUpperCase();
    const numero = String(titular.nroDocumento || '').trim().toUpperCase();

    if (!numero) {
      await Swal.fire({
        icon: 'warning',
        title: 'Documento requerido',
        text: 'Ingrese el número de documento a consultar.',
      });
      return;
    }

    if (tipo === 'DNI' && !/^\d{8}$/.test(numero)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Documento inválido',
        text: 'El DNI debe tener 8 dígitos numéricos.',
      });
      return;
    }

    if (tipo === 'RUC' && !/^\d{11}$/.test(numero)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Documento inválido',
        text: 'El RUC debe tener 11 dígitos numéricos.',
      });
      return;
    }

    setBuscandoUuid(titular._uuid);
    try {
      const response = await faregasClientesApi.autocompletarPersona(tipo, numero);
      const persona = response?.data;

      let actualizado = false;
      setTitulares((prev) => {
        const titularActual = prev.find((t) => t._uuid === titular._uuid);
        if (!titularActual) return prev;
        if (
          String(titularActual.tipoDocumento || '').trim().toUpperCase() !== tipo ||
          String(titularActual.nroDocumento || '').trim().toUpperCase() !== numero
        ) {
          return prev;
        }

        actualizado = true;
        limpiarTitular(index, 'nroDocumento');
        limpiarTitular(index, 'nombreRazonSocial');
        limpiarTitular(index, 'direccion');

        return prev.map((t) => {
          if (t._uuid !== titular._uuid) return t;
          return {
            ...t,
            nombreRazonSocial: (persona?.nombreRazonSocial || t.nombreRazonSocial || '').toUpperCase(),
            direccion: (persona?.direccion || t.direccion || '').toUpperCase(),
            clienteId: (persona?.origen === 'FAREGAS' && persona?.id) ? Number(persona.id) : t.clienteId,
          };
        });
      });

      if (actualizado && persona && (persona.nombreRazonSocial || persona.direccion)) {
        const origenTexto = persona.origen === 'FAREGAS'
          ? 'Datos recuperados de clientes Faregas.'
          : 'Datos recuperados de clientes Farenet.';
        await Swal.fire({
          icon: 'success',
          title: 'Cliente encontrado',
          text: origenTexto,
          timer: 1800,
          showConfirmButton: false,
        });
      } else if (!actualizado) {
        // Documento modificado durante la espera
      } else {
        await Swal.fire({
          icon: 'info',
          title: 'Cliente no encontrado',
          text: 'No se encontraron datos para este documento. Puede ingresar los datos manualmente.',
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.toLowerCase().includes('no encontrada') || err?.message?.toLowerCase().includes('no encontrado')) {
        await Swal.fire({
          icon: 'info',
          title: 'Cliente no encontrado',
          text: 'No se encontraron datos para este documento. Puede ingresar los datos manualmente.',
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: 'warning',
          title: 'Consulta no disponible',
          text: err?.message || 'No fue posible consultar el cliente. Puede ingresar los datos manualmente.',
        });
      }
    } finally {
      setBuscandoUuid(null);
    }
  };

  const handleRemove = (titular: TitularState) => {
    const { _uuid: uuid, titularId } = titular;
    if (titularId) {
      Swal.fire({
        title: '¿Eliminar titular?',
        text: 'Este titular ya está guardado en el borrador.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          if (onRemoveTitular) void onRemoveTitular(titular);
        }
      });
    } else {
      setTitulares(prev => prev.filter(t => t._uuid !== uuid));
    }
  };

  return (
    <div className="space-y-4">
      {mostrarTitulares && (<>
      <div className="flex justify-between items-center border-b border-slate-200 pb-2" data-propietario-certificado={integrarPropietarioGlpAnual || undefined}>
        <h4 className="text-sm font-bold text-[#052a79] capitalize tracking-wider">
          {integrarPropietarioGlpAnual ? '1. PROPIETARIO' : '1. Propietario / Dueño del Vehículo'}
        </h4>
        <button type="button" onClick={handleAdd} className="flex items-center gap-1 text-xs font-bold text-white bg-[#052a79] hover:bg-[#041d54] px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar Dueño
        </button>
      </div>

      {titulares.map((t, index) => (
        <div key={t._uuid} className="bg-white p-4 rounded-xl border border-slate-200 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
              {t.titularId ? 'GUARDADO' : 'NUEVO'} | ORDEN {t.orden}
            </span>
            <button type="button" onClick={() => handleRemove(t)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors" title="Eliminar titular">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <h5 className="font-bold text-slate-700 mb-3 text-sm">DUEÑO {index + 1} {index === 0 && '(PRINCIPAL)'}</h5>

          {index === 0 && (
            <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-[#052a79]">
              <input
                type="checkbox"
                checked={facturarAlTitular}
                onChange={(event) => handleFacturarAlTitularChange(event.target.checked)}
                className="h-4 w-4 accent-[#052a79]"
              />
              FACTURAR AL DUEÑO PRINCIPAL
            </label>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">TIPO DE DOCUMENTO</label>
              <select
                value={t.tipoDocumento}
                onChange={(e) => {
                  limpiarTitular(index, 'tipoDocumento');
                  limpiarTitular(index, 'nroDocumento');
                  handleChange(t._uuid, 'tipoDocumento', e.target.value);
                }}
                className={claseConError(CLASE_CAMPO, Boolean(errorTitular(index, 'tipoDocumento')))}
                data-campo-error={errorTitular(index, 'tipoDocumento') ? true : undefined}
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
              </select>
              <MensajeError campo={`titular.${index}.tipoDocumento`} errores={erroresCampo} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t.tipoDocumento === 'RUC' ? 'NÚMERO DE RUC' : 'NÚMERO DE DNI'}
              </label>
              <div className="flex gap-2">
                <input
                  value={t.nroDocumento}
                  inputMode="numeric"
                  maxLength={t.tipoDocumento === 'RUC' ? 11 : 8}
                  placeholder={t.tipoDocumento === 'RUC' ? '11 dígitos' : '8 dígitos'}
                  onChange={(e) => {
                    limpiarTitular(index, 'nroDocumento');
                    handleChange(t._uuid, 'nroDocumento', e.target.value);
                  }}
                  className={claseConError(
                    'h-[42px] min-w-0 flex-1 px-3 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors',
                    Boolean(errorTitular(index, 'nroDocumento'))
                  )}
                  data-campo-error={errorTitular(index, 'nroDocumento') ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => handleBuscarCliente(t, index)}
                  disabled={Boolean(buscandoUuid)}
                  className="flex h-[42px] items-center justify-center rounded-lg bg-slate-200 px-3 transition-colors hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar cliente en el sistema"
                  aria-label="Buscar cliente"
                >
                  {buscandoUuid === t._uuid ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  ) : (
                    <Search className="h-5 w-5 text-slate-600" />
                  )}
                </button>
              </div>
              <MensajeError campo={`titular.${index}.nroDocumento`} errores={erroresCampo} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 mb-1">NOMBRE / RAZÓN SOCIAL</label>
              <input value={t.nombreRazonSocial} onChange={(e) => { limpiarTitular(index, 'nombreRazonSocial'); handleChange(t._uuid, 'nombreRazonSocial', e.target.value); }} className={claseConError(CLASE_CAMPO, Boolean(errorTitular(index, 'nombreRazonSocial')))} data-campo-error={errorTitular(index, 'nombreRazonSocial') ? true : undefined} />
              <MensajeError campo={`titular.${index}.nombreRazonSocial`} errores={erroresCampo} />
            </div>
            {mostrarDireccionTitular && <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 mb-1">DIRECCIÓN</label>
              <input value={t.direccion} onChange={(e) => { limpiarTitular(index, 'direccion'); handleChange(t._uuid, 'direccion', e.target.value); }} className={claseConError(CLASE_CAMPO, Boolean(errorTitular(index, 'direccion')))} data-campo-error={errorTitular(index, 'direccion') ? true : undefined} />
              <MensajeError campo={`titular.${index}.direccion`} errores={erroresCampo} />
            </div>}
          </div>
        </div>
      ))}
      
      {titulares.length === 0 && (
        <div className="text-center text-slate-400 py-6 text-sm font-semibold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          No hay dueños. Haga clic en "Agregar Dueño" para registrar uno.
        </div>
      )}
      </>)}

      {mostrarFacturacion && (
        <DatosFacturacion
          titulares={titulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          erroresCampo={erroresCampo}
          onCorregirCampo={onCorregirCampo}
        />
      )}
    </div>
  );
}
