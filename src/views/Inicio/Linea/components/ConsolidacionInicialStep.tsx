import React, { useEffect, useState } from 'react';
import { maestrosApi, plantaSession } from '../../../../services/api';

interface ConsolidacionInicialStepProps {
  nroInspeccion?: string;
  inspeccionData?: any;
  onSiguiente: () => void;
  onAnular: () => void;
}

export function ConsolidacionInicialStep({ nroInspeccion, inspeccionData, onSiguiente, onAnular }: ConsolidacionInicialStepProps) {
  // Vehículo
  const placa = inspeccionData?.form_data?.caja?.placa || inspeccionData?.form_data?.vehiculo?.placa || 'N/A';
  const marca = inspeccionData?.form_data?.vehiculo?.marca || 'N/A';
  const modelo = inspeccionData?.form_data?.vehiculo?.modelo || 'N/A';
  
  // Concepto y Pago
  const concepto = inspeccionData?.form_data?.caja?.concepto || 'N/A'; 
  const montoTotal = inspeccionData?.precio_total || '0.00';

  // Cliente (Recibo)
  const docCliente = inspeccionData?.form_data?.facturacion?.nroDocFac || 'N/A';
  const nombreCliente = inspeccionData?.form_data?.facturacion?.razonSocialFac || inspeccionData?.form_data?.facturacion?.nombresFac || 'N/A';

  // Propietario (Certificado)
  const docPropietario = inspeccionData?.form_data?.vehiculo?.nroDocProp || 'N/A';
  const nombrePropietario = inspeccionData?.form_data?.vehiculo?.razonSocialProp || inspeccionData?.form_data?.vehiculo?.nombresProp || 'N/A';

  // Estado Local para Combos y Formularios
  const [ingenieros, setIngenieros] = useState<any[]>([]);
  const [ingenieroId, setIngenieroId] = useState('');
  
  // Mocks para los nuevos campos (en el backend real se llenarán con endpoints maestros)
  const [tipoInspeccion, setTipoInspeccion] = useState('ORDINARIA');
  const [tipoCertificado, setTipoCertificado] = useState('VEHICULOS PARTICULARES');
  const [tipoAutorizacion, setTipoAutorizacion] = useState('');
  const [observacion, setObservacion] = useState('');
  
  // Estado para Gas
  const [sinCertificadoGas, setSinCertificadoGas] = useState(false);
  const [codCertificadoGas, setCodCertificadoGas] = useState('');
  const [empresaGas, setEmpresaGas] = useState('');
  const [fechaVencGas, setFechaVencGas] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const fetchIngenieros = async () => {
      try {
        const planta = plantaSession.obtener();
        if (planta?.key) {
          const res = await maestrosApi.obtenerIngenierosAsync(planta.key);
          if (res.status === 'success' && res.data) {
            setIngenieros(res.data);
          }
        }
      } catch (error) {
        console.error("Error cargando ingenieros", error);
      }
    };
    fetchIngenieros();
  }, []);

  const handleConsolidar = async () => {
    if (!ingenieroId) {
      import('sweetalert2').then(Swal => {
        Swal.default.fire({
          icon: 'warning',
          title: 'Ingeniero Requerido',
          text: 'Debe asignar a un ingeniero certificador antes de consolidar.',
          confirmButtonColor: '#052a79'
        });
      });
      return;
    }

    try {
      setIsSaving(true);
      const { lineaApi } = await import('../../../../services/api/linea');
      if (nroInspeccion) {
        await lineaApi.consolidarInspeccion(nroInspeccion, { 
          ingenieroSeleccionado: ingenieroId,
          tipoInspeccion,
          tipoCertificado,
          tipoAutorizacion,
          observacion,
          gas: {
            sinCertificado: sinCertificadoGas,
            codigo: codCertificadoGas,
            empresa: empresaGas,
            fechaVenc: fechaVencGas
          }
        });
      }
      
      import('sweetalert2').then(Swal => {
        Swal.default.fire({
          icon: 'success',
          title: 'Consolidación Exitosa',
          text: 'La inspección ha sido consolidada correctamente.',
          confirmButtonColor: '#052a79',
          timer: 1500
        });
      });
    } catch (error) {
      console.error("Error consolidando", error);
      import('sweetalert2').then(Swal => {
        Swal.default.fire({
          icon: 'error',
          title: 'Error de Guardado',
          text: 'No se pudo consolidar la inspección.',
          confirmButtonColor: '#d33'
        });
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSiguienteWithValidation = () => {
    onSiguiente();
  };

  const handleModificarPropietario = () => {
    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: 'Modificar Propietario',
        text: 'Esta función abrirá el modal de edición de propietario.',
        icon: 'info'
      });
    });
  };

  const handleMockAction = (actionName: string) => {
    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: actionName,
        text: 'Acción simulada. Pendiente de integración con backend/MTC.',
        icon: 'info'
      });
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Banner Amarillo */}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl shadow-sm flex items-center justify-center gap-3 font-medium">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm">Aún no se puede certificar porque faltan más pruebas.</span>
        </div>

        {/* Resumen de la Inspección Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
             <h2 className="text-xl font-black text-[#052a79] flex items-center gap-2">
               <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
               Resumen de la Inspección
             </h2>
             <div className="text-right flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Cliente (Recibo)</p>
                  <p className="text-xs font-bold text-[#052a79] mt-0.5">{docCliente} - {nombreCliente}</p>
                </div>
             </div>
          </div>
          
          {/* Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-colors hover:border-blue-200">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Vehículo</p>
                <p className="text-sm font-black text-[#052a79] uppercase">{placa}</p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{marca} - {modelo}</p>
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-colors hover:border-blue-200">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Concepto</p>
                <p className="text-sm font-black text-[#052a79] uppercase">{concepto}</p>
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-colors hover:border-blue-200">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Pagado</p>
                <p className="text-2xl font-black text-emerald-600">S/ {Number(montoTotal).toFixed(2)}</p>
             </div>

             <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative group transition-all hover:shadow-md hover:bg-blue-50">
                <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-1">Propietario (Certificado)</p>
                <p className="text-xs font-black text-[#052a79]">{docPropietario}</p>
                <p className="text-[11px] text-[#052a79] font-semibold mt-1 uppercase line-clamp-2" title={nombrePropietario}>{nombrePropietario}</p>
                
                <button 
                  onClick={handleModificarPropietario}
                  className="absolute top-4 right-4 bg-white hover:bg-[#052a79] hover:text-white text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-blue-200 transition-colors"
                >
                  Modificar
                </button>
             </div>
          </div>
        </div>

        {/* Campos Maestros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
           {/* Decoración de fondo */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-50"></div>
           
           <h3 className="text-lg font-bold text-[#052a79] mb-6 flex items-center gap-2 relative z-10">
             <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
             Datos de Certificación
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {/* Tipo Inspección */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo Inspección <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={tipoInspeccion} onChange={e => setTipoInspeccion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-[#052a79] text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 appearance-none transition-all outline-none">
                    <option value="ORDINARIA">ORDINARIA</option>
                    <option value="REINSPECCION">REINSPECCION</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Tipo Certificado */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo Certificado <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={tipoCertificado} onChange={e => setTipoCertificado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-[#052a79] text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 appearance-none transition-all outline-none">
                    <option value="VEHICULOS PARTICULARES">VEHICULOS PARTICULARES</option>
                    <option value="TRANSPORTE PUBLICO">TRANSPORTE PUBLICO</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Tipo Autorización */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo Autorización <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={tipoAutorizacion} onChange={e => setTipoAutorizacion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-[#052a79] text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 appearance-none transition-all outline-none">
                    <option value="">Seleccione...</option>
                    <option value="MTC">MTC</option>
                    <option value="ATU">ATU</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Ingeniero Certificador */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ingeniero Certificador <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-blue-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <select value={ingenieroId} onChange={e => setIngenieroId(e.target.value)} className={`w-full bg-slate-50 border border-slate-200 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 pl-12 appearance-none transition-all outline-none shadow-sm ${!ingenieroId ? 'text-slate-400' : 'text-[#052a79]'}`}>
                    <option value="">Seleccione ingeniero...</option>
                    {ingenieros.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.nombre}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Observacion */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observación</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </div>
                  <input type="text" placeholder="Escriba alguna observación (opcional)..." value={observacion} onChange={e => setObservacion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-[#052a79] text-sm font-medium rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 pl-12 transition-all outline-none" />
                </div>
              </div>
           </div>
        </div>

        {/* Sección Gas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="bg-slate-50 px-6 py-4 flex items-center gap-4 border-b border-slate-200">
             <label className="flex items-center gap-3 cursor-pointer group">
               <div className="relative">
                 <input type="checkbox" checked={sinCertificadoGas} onChange={e => setSinCertificadoGas(e.target.checked)} className="sr-only peer" />
                 <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </div>
               <span className="text-sm font-bold text-[#052a79] uppercase group-hover:text-blue-700 transition-colors">Sin Certificado de Gas</span>
             </label>
           </div>
           
           {!sinCertificadoGas && (
             <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white relative z-10">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cod. Certificado Gas <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Ingrese código..." value={codCertificadoGas} onChange={e => setCodCertificadoGas(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-[#052a79] text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Emp. Certificadora Gas <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={empresaGas} onChange={e => setEmpresaGas(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-[#052a79] text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 appearance-none transition-all outline-none">
                       <option value="">Seleccione...</option>
                       <option value="1">Empresa Gas 1</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Venc. Cert. Gas <span className="text-red-500">*</span></label>
                  <input type="date" value={fechaVencGas} onChange={e => setFechaVencGas(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-[#052a79] text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none" />
                </div>
             </div>
           )}
        </div>

        {/* Botonera Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 w-full max-w-5xl mx-auto">
           <div className="flex flex-col gap-2">
             <button onClick={handleConsolidar} disabled={isSaving} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">{isSaving ? 'Consolidando...' : 'Consolidar'}</button>
             <button onClick={onAnular} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Anular Inspección</button>
             <button onClick={() => handleMockAction('Reimprimir Certificado')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Reimprimir Certificado</button>
           </div>
           <div className="flex flex-col gap-2">
             <button onClick={() => handleMockAction('Visualizar')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Visualizar</button>
             <button onClick={() => handleMockAction('Visualizar Informe')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Visualizar Informe</button>
             <button onClick={() => handleMockAction('Visualizar Recibo')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Visualizar Recibo</button>
           </div>
           <div className="flex flex-col gap-2">
             <button onClick={() => handleMockAction('Error Impresion')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Error Impresion</button>
             <button onClick={() => handleMockAction('Cambiar Observacion')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Cambiar Observacion</button>
           </div>
        </div>

        {/* Soporte */}
        <div className="pt-8">
           <h3 className="text-xl font-medium text-[#052a79] mb-4 border-b border-slate-200 pb-2">Soporte</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
              <div className="flex flex-col gap-2">
                <button onClick={() => handleMockAction('Registro Vehiculo MTC')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Registro Vehículo MTC</button>
                <button onClick={() => handleMockAction('Registro Resultados')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Registro Resultados</button>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleMockAction('Registro Poliza MTC')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Registro Póliza MTC</button>
                <button onClick={() => handleMockAction('Cambiar Linea')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Cambiar Linea</button>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleMockAction('Cambio Motor')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Cambio Motor</button>
                <button onClick={() => handleMockAction('Cambiar firma')} className="bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] text-[#052a79] py-2 rounded-lg font-black text-sm uppercase shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-md transition-all">Cambiar firma</button>
              </div>
           </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex-shrink-0 bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center px-8">
        <div className="flex gap-4">
          <button onClick={onAnular} className="px-6 py-2 rounded-lg border border-slate-200 text-[#052a79] font-bold uppercase text-xs hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button className="px-6 py-2 rounded-lg border border-slate-200 text-slate-400 font-bold uppercase text-xs cursor-not-allowed">
            Anterior
          </button>
        </div>
        <button onClick={handleSiguienteWithValidation} className="px-10 py-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-slate-900 font-black uppercase text-xs shadow-sm transition-colors">
          Siguiente
        </button>
      </div>
    </div>
  );
}
