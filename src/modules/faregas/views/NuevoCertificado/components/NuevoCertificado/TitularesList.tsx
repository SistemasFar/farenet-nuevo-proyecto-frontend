import React from 'react';
import { Search, Plus, Trash2, ReceiptText } from 'lucide-react';
import { faregasClientesApi } from '../../../../services/faregas-clientes.api';
import Swal from 'sweetalert2';
import type { FormFacturacionState } from '../../NuevoCertificadoView';

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
}

export function TitularesList({
  titulares,
  setTitulares,
  formFacturacion,
  setFormFacturacion,
  onRemoveTitular,
}: TitularesListProps) {
  
  const handleAdd = () => {
    const nextOrden = titulares.length > 0 ? Math.max(...titulares.map(t => t.orden)) + 1 : 1;
    setTitulares(prev => [
      ...prev,
      {
        _uuid: crypto.randomUUID(),
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
        return { ...t, [field]: finalValue, nroDocumento: '' };
      }
      
      return { ...t, [field]: finalValue };
    }));
  };

  const handleSearch = async (uuid: string, tipoDocumento: string, nroDocumento: string) => {
    if (!nroDocumento) return;
    
    try {
      const res = await faregasClientesApi.autocompletarPersona(tipoDocumento, nroDocumento);
      if (res.ok && res.data) {
        setTitulares(prev => prev.map(t => {
          if (t._uuid === uuid) {
            return {
              ...t,
              clienteId: res.data.clienteExistente ? res.data.id : null,
              nombreRazonSocial: res.data.nombreRazonSocial || '',
              direccion: res.data.direccion || ''
            };
          }
          return t;
        }));
        Swal.fire({
          icon: 'success',
          title: 'Encontrado',
          text: res.data.origen === 'FAREGAS' ? 'Cliente FAREGAS recuperado' : 'Datos autocompletados desde FARENET',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (e: unknown) {
      const status = e instanceof Error && 'status' in e ? (e as Error & { status?: number }).status : undefined;
      if (status === 404) {
        Swal.fire({
          icon: 'info',
          title: 'No encontrado',
          text: 'Puede ingresar los datos manualmente.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al consultar el documento.'
        });
      }
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

  const handleFacturacionChange = (field: keyof FormFacturacionState, value: string | boolean) => {
    setFormFacturacion(prev => {
      if (typeof value === 'boolean') return { ...prev, [field]: value };

      let normalizado = value.toUpperCase();
      if (field === 'emailFac') normalizado = value.trim().toLowerCase();
      if (field === 'nroDocFac') normalizado = value.replace(/\D/g, '').slice(0, 11);
      if (field === 'telefonoFac') normalizado = value.replace(/[^0-9+()\-\s]/g, '').slice(0, 30);
      return { ...prev, [field]: normalizado };
    });
  };

  const buscarClienteFacturacion = async () => {
    const documento = formFacturacion.nroDocFac.replace(/\D/g, '');
    const tipoDocumento = documento.length === 11 ? 'RUC' : documento.length === 8 ? 'DNI' : '';
    if (!tipoDocumento) {
      await Swal.fire('Documento inválido', 'Ingrese un DNI de 8 dígitos o un RUC de 11 dígitos.', 'warning');
      return;
    }

    try {
      const response = await faregasClientesApi.autocompletarPersona(tipoDocumento, documento);
      const persona = response.data;
      setFormFacturacion(prev => ({
        ...prev,
        tipoDocFac: tipoDocumento === 'RUC' ? 'FACTURA' : 'BOLETA',
        razonSocialFac: persona.nombreRazonSocial || persona.nombrerazonsocial || '',
        direccionFac: persona.direccion || '',
        emailFac: persona.correo || persona.email || prev.emailFac,
        telefonoFac: persona.telefono || prev.telefonoFac,
      }));
      await Swal.fire({
        icon: 'success',
        title: 'Cliente encontrado',
        text: persona.origen === 'FAREGAS' ? 'Datos recuperados de Faregas.' : 'Datos recuperados de Farenet.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire('Sin coincidencias', 'Puede completar los datos de facturación manualmente.', 'info');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <h4 className="text-sm font-bold text-[#052a79] uppercase tracking-wider">C. Titulares y Datos de Facturación</h4>
        <button type="button" onClick={handleAdd} className="flex items-center gap-1 text-xs font-bold text-white bg-[#052a79] hover:bg-[#041d54] px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar Titular
        </button>
      </div>

      {titulares.map((t, index) => (
        <div key={t._uuid} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
              {t.titularId ? 'GUARDADO' : 'NUEVO'} | ORDEN {t.orden}
            </span>
            <button type="button" onClick={() => handleRemove(t)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors" title="Eliminar titular">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <h5 className="font-bold text-slate-700 mb-3 text-sm">TITULAR {index + 1} {index === 0 && '(PRINCIPAL)'}</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">TIPO DOC.</label>
              <select value={t.tipoDocumento} onChange={(e) => handleChange(t._uuid, 'tipoDocumento', e.target.value)} className="w-full h-[42px] px-3 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors">
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">CE</option>
                <option value="PASAPORTE">PASAPORTE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">NRO. DOCUMENTO</label>
              <div className="flex gap-2">
                <input value={t.nroDocumento} onChange={(e) => handleChange(t._uuid, 'nroDocumento', e.target.value)} className="w-full h-[42px] px-3 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                <button type="button" onClick={() => handleSearch(t._uuid, t.tipoDocumento, t.nroDocumento)} className="bg-slate-200 hover:bg-slate-300 px-3 rounded-lg transition-colors flex items-center justify-center h-[42px]">
                  <Search className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">NOMBRE / RAZÓN SOCIAL</label>
              <input value={t.nombreRazonSocial} onChange={(e) => handleChange(t._uuid, 'nombreRazonSocial', e.target.value)} className="w-full h-[42px] px-3 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 mb-1">DIRECCIÓN</label>
              <input value={t.direccion} onChange={(e) => handleChange(t._uuid, 'direccion', e.target.value)} className="w-full h-[42px] px-3 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
            </div>
          </div>
        </div>
      ))}
      
      {titulares.length === 0 && (
        <div className="text-center text-slate-400 py-6 text-sm font-semibold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          No hay titulares. Haga clic en "Agregar Titular" para registrar uno.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border-2 border-blue-200 bg-blue-50/40">
        <div className="flex flex-col gap-3 border-b border-blue-200 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#052a79] p-2 text-white">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-sm font-black uppercase text-[#052a79]">Datos para facturación</h5>
              <p className="text-xs font-medium text-slate-600">Se utilizarán posteriormente para emitir la boleta o factura.</p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={formFacturacion.usarTitularPrincipalFac}
              onChange={(event) => handleFacturacionChange('usarTitularPrincipalFac', event.target.checked)}
              className="h-4 w-4 accent-[#052a79]"
            />
            FACTURAR AL TITULAR PRINCIPAL
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
          {formFacturacion.usarTitularPrincipalFac && !titulares.length && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 md:col-span-4">
              Agregue el titular principal para completar automáticamente los datos de facturación.
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">TIPO DE COMPROBANTE</label>
            <select
              value={formFacturacion.tipoDocFac}
              disabled={formFacturacion.usarTitularPrincipalFac}
              onChange={(event) => handleFacturacionChange('tipoDocFac', event.target.value)}
              className="h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b] disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">-- SELECCIONAR --</option>
              <option value="BOLETA">BOLETA</option>
              <option value="FACTURA">FACTURA</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">DNI / RUC</label>
            <div className="flex gap-2">
              <input
                value={formFacturacion.nroDocFac}
                readOnly={formFacturacion.usarTitularPrincipalFac}
                onChange={(event) => handleFacturacionChange('nroDocFac', event.target.value)}
                inputMode="numeric"
                maxLength={11}
                className="h-[42px] min-w-0 flex-1 rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b] read-only:bg-slate-100 read-only:text-slate-500"
              />
              {!formFacturacion.usarTitularPrincipalFac && (
                <button type="button" onClick={buscarClienteFacturacion} className="flex h-[42px] items-center justify-center rounded-lg bg-slate-200 px-3 transition-colors hover:bg-slate-300" title="Buscar cliente">
                  <Search className="h-5 w-5 text-slate-600" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-500">NOMBRE / RAZÓN SOCIAL</label>
            <input
              value={formFacturacion.razonSocialFac}
              readOnly={formFacturacion.usarTitularPrincipalFac}
              onChange={(event) => handleFacturacionChange('razonSocialFac', event.target.value)}
              maxLength={100}
              className="h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold uppercase text-slate-800 focus:border-[#f59e0b] read-only:bg-slate-100 read-only:text-slate-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-bold text-slate-500">DIRECCIÓN FISCAL</label>
            <input
              value={formFacturacion.direccionFac}
              readOnly={formFacturacion.usarTitularPrincipalFac}
              onChange={(event) => handleFacturacionChange('direccionFac', event.target.value)}
              maxLength={100}
              className="h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold uppercase text-slate-800 focus:border-[#f59e0b] read-only:bg-slate-100 read-only:text-slate-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-500">CORREO ELECTRÓNICO (OPCIONAL)</label>
            <input
              type="email"
              value={formFacturacion.emailFac}
              onChange={(event) => handleFacturacionChange('emailFac', event.target.value)}
              className="h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-500">TELÉFONO (OPCIONAL)</label>
            <input
              value={formFacturacion.telefonoFac}
              onChange={(event) => handleFacturacionChange('telefonoFac', event.target.value)}
              maxLength={30}
              className="h-[42px] w-full rounded-lg border-2 border-slate-200 px-3 font-semibold text-slate-800 focus:border-[#f59e0b]"
            />
          </div>

          <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-xs font-medium text-slate-600 md:col-span-4">
            {formFacturacion.usarTitularPrincipalFac
              ? 'El documento, nombre y dirección se mantienen sincronizados con el titular principal.'
              : 'La boleta o factura se emitirá a una persona o empresa diferente del titular del certificado.'}
          </div>
        </div>
      </div>
    </div>
  );
}
