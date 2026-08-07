import React, { useState } from 'react';
import { vehiculoApi, maestrosApi } from '@/services/api';
import { InputField, AgregarMaestroModal } from './SharedForms';

export const loadModelos = async (inputValue: string) => {
  try {
    const response = await maestrosApi.buscarModelosAsync(inputValue);
    return response.data.map((m: any) => ({ value: m.key, label: m.nombre }));
  } catch (error) {
    console.error(error);
    return [];
  }
};

const loadColores = async (inputValue: string) => {
  try {
    const response = await maestrosApi.buscarColoresAsync(inputValue);
    return response.data.map((c: any) => ({ value: c.key, label: c.nombre }));
  } catch (error) {
    console.error(error);
    return [];
  }
};

interface VehiculoStepProps {
  vehiculoTab: 'DATOS' | 'SOAT';
  setVehiculoTab: (tab: 'DATOS' | 'SOAT') => void;
  formVehiculo: any;
  setFormVehiculo: (data: any) => void;
  maestrosVehiculo: any;
  getCategoriaName: () => string;
  onValidationChange?: (isValid: boolean) => void;
  placaCaja?: string;
  isReinspeccion?: boolean;
  onNext?: () => void;
}

export function VehiculoStep({
  vehiculoTab,
  setVehiculoTab,
  formVehiculo,
  setFormVehiculo,
  maestrosVehiculo,
  getCategoriaName,
  onValidationChange,
  placaCaja,
  isReinspeccion,
  onNext
}: VehiculoStepProps) {

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTabla, setModalTabla] = useState('');
  const [modalField, setModalField] = useState('');
  const [modalOptions, setModalOptions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalAsyncSearch, setModalAsyncSearch] = useState<any>(null);

  const [searchingVehiculo, setSearchingVehiculo] = useState(false);

  React.useEffect(() => {
    if (formVehiculo.fechaEmisionSoat && formVehiculo.mesesSoat) {
      const emision = new Date(formVehiculo.fechaEmisionSoat);
      if (!isNaN(emision.getTime())) {
        emision.setMonth(emision.getMonth() + parseInt(formVehiculo.mesesSoat, 10));
        const vencimiento = emision.toISOString().split('T')[0];
        if (formVehiculo.fechaVencimientoSoat !== vencimiento) {
          setFormVehiculo((prev: any) => ({ ...prev, fechaVencimientoSoat: vencimiento }));
        }
      }
    }
  }, [formVehiculo.fechaEmisionSoat, formVehiculo.mesesSoat]);

  const handleSearchVehiculo = async () => {
    const p = formVehiculo.placaNueva || placaCaja;
    if (!p) return;
    setSearchingVehiculo(true);
    try {
      const res = await vehiculoApi.buscarPorPlaca(p);
      if (res?.data) {
        setFormVehiculo((prev: any) => ({
          ...prev,
          placaNueva: res.data.placamotor || p,
          nroSerie: res.data.nrovin || res.data.nroserie || '',
          nroMotor: res.data.nromotor || '',
          anioFabricacion: res.data.aniofabricacion || '',
          anioModelo: res.data.aniomodelo || '',
          categoria: res.data.categoria_key || prev.categoria || '',
          categoriaExtra: res.data.categoriaextra || '',
          clase: res.data.vehiculoclase_key || '',
          marca: res.data.marca_key || '',
          modelo: res.data.modelo_key || '',
          color: res.data.color_key || '',
          carroceria: res.data.carroceria_key || '',
          combustible: res.data.combustible_key || '',
          nroCilindros: res.data.nrocilindros || '',
          kilometraje: res.data.kilometraje || '',
          kilometrajeOriginal: res.data.kilometraje || 0,
          nroAsientos: res.data.nroasientos || '',
          nroPasajeros: res.data.nropasajeros || '',
          nroRuedas: res.data.nroruedas || '',
          nroEjes: res.data.nroejes || '',
          nroPuertas: res.data.nropuertas || '',
          nroPisos: res.data.nropisos || '',
          salidasEmergencia: res.data.nrosalidaemergencia || '',
          pesoSeco: res.data.pesoseco || '',
          pesoBruto: res.data.pesobruto || '',
          cargaUtil: res.data.cargautil || '',
          longitud: res.data.longitud || '',
          altura: res.data.alto || res.data.altura || '',
          ancho: res.data.ancho || '',
          nroSoat: res.data.nrosoat || '',
          tipoPoliza: res.data.tipopoliza_key || '',
          aseguradora: res.data.aseguradora_key || '',
          fechaEmisionSoat: res.data.fechiniciotarjetapropiedad ? res.data.fechiniciotarjetapropiedad.split('T')[0] : '',
          fechaVencimientoSoat: res.data.fechfintarjetapropiedad ? res.data.fechfintarjetapropiedad.split('T')[0] : '',
          mesesSoat: res.data.fechiniciotarjetapropiedad && res.data.fechfintarjetapropiedad ? 
            (new Date(res.data.fechfintarjetapropiedad).getFullYear() - new Date(res.data.fechiniciotarjetapropiedad).getFullYear()) * 12 === 6 ? '6' : '12' : '12'
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingVehiculo(false);
    }
  };

  React.useEffect(() => {
    if (placaCaja && !formVehiculo.placaNueva && !formVehiculo.marca) {
      handleSearchVehiculo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placaCaja]);

  const handleAddNuevo = (title: string, tabla: string, field: string, options: any = [], asyncSearchFunc?: any) => {
    setModalTitle(title);
    setModalTabla(tabla);
    setModalField(field);
    setModalOptions(options);
    setModalAsyncSearch(() => asyncSearchFunc);
    setModalOpen(true);
  };

  const handleSaveNuevo = async (valor: string) => {
    try {
      setModalLoading(true);
      const res = await maestrosApi.agregarMaestroAsync(modalTabla, valor);

      setFormVehiculo({
        ...formVehiculo,
        [modalField]: res.data.key,
        [`${modalField}_label`]: res.data.nombre
      });

      if (modalTabla === 'clase' && maestrosVehiculo?.clases) maestrosVehiculo.clases.push(res.data);
      if (modalTabla === 'marca' && maestrosVehiculo?.marcas) maestrosVehiculo.marcas.push(res.data);
      if (modalTabla === 'carroceria' && maestrosVehiculo?.carrocerias) maestrosVehiculo.carrocerias.push(res.data);
      if (modalTabla === 'color' && maestrosVehiculo?.colores) maestrosVehiculo.colores.push(res.data);

      setModalOpen(false);
    } catch (err: any) {
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  const checkDatosValid = () => {
    const catName = getCategoriaName() || '';
    if (!catName) return ['Categoría'];

    const isCategoriaO = catName.trim().startsWith('O');
    const hasCategoriaExtra = ['M2', 'M3'].includes(catName);
    const isValid = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';

    const coreFields = [
      'clase', 'marca', 'modelo', 'color', 'carroceria',
      'nroSerie', 'anioFabricacion', 'combustible',
      'longitud', 'ancho', 'altura', 'nroEjes', 'nroRuedas',
      'pesoSeco', 'cargaUtil', 'pesoBruto'
    ];

    let missing: string[] = [];

    for (const f of coreFields) {
      if (!isValid((formVehiculo as any)[f])) missing.push(f);
    }

    if (hasCategoriaExtra && !isValid(formVehiculo.categoriaExtra)) missing.push('categoriaExtra');

    if (!isCategoriaO) {
      const dynamicFields = [
        'nroMotor', 'nroCilindros', 'kilometraje', 'nroAsientos',
        'nroPasajeros', 'nroPuertas', 'nroPisos', 'salidasEmergencia'
      ];
      for (const f of dynamicFields) {
        if (!isValid((formVehiculo as any)[f])) missing.push(f);
      }

      if (isValid((formVehiculo as any)['kilometraje'])) {
        const kmActual = parseFloat((formVehiculo as any)['kilometraje']);
        const kmOriginal = parseFloat((formVehiculo as any)['kilometrajeOriginal'] || 0);
        if (kmOriginal > 0 && kmActual <= kmOriginal) {
          missing.push(`Kilometraje (debe ser mayor a ${kmOriginal})`);
        }
      }
    }

    return missing;
  };

  const missingDatos = checkDatosValid();
  const isDatosValid = missingDatos.length === 0;

  const checkSoatValid = () => {
    const isValid = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
    const soatFields = ['nroSoat', 'tipoPoliza', 'aseguradora', 'mesesSoat', 'fechaEmisionSoat', 'fechaVencimientoSoat'];
    let missing: string[] = [];
    for (const f of soatFields) {
      if (!isValid((formVehiculo as any)[f])) missing.push(f);
    }
    return missing;
  };

  const missingSoat = checkSoatValid();
  const isSoatValid = missingSoat.length === 0;

  const isAllValid = isDatosValid && isSoatValid;

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isAllValid);
    }
  }, [isAllValid, onValidationChange]);

  return (
    <div className="space-y-6">
      <AgregarMaestroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveNuevo}
        title={modalTitle}
        loading={modalLoading}
        existingOptions={modalOptions}
        asyncSearch={modalAsyncSearch}
      />
      {/* Pestañas de Vehículo */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        {(['DATOS DEL VEHÍCULO', 'SOAT'] as const).map(tab => {
          const key = tab === 'DATOS DEL VEHÍCULO' ? 'DATOS' : tab as 'SOAT';

          let isDisabled = false;
          let disabledReason = '';

          if (key === 'SOAT' && !isDatosValid) {
            isDisabled = true;
            disabledReason = 'Debe completar todos los datos del vehículo primero';
          }

          return (
            <button
              key={key}
              onClick={() => !isDisabled && setVehiculoTab(key)}
              disabled={isDisabled}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all 
                ${vehiculoTab === key ? 'bg-white text-[#052a79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
              `}
              title={disabledReason}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {vehiculoTab === 'DATOS' && (() => {
          const catName = getCategoriaName() || ''; 
          const isCategoriaO = catName.trim().startsWith('O');
          const hasCategoriaExtra = ['M2', 'M3'].includes(catName);
          const hasMotor = !isCategoriaO;
          const hasAsientos = !isCategoriaO;
          const hasPasajeros = !isCategoriaO;
          const hasPisos = !isCategoriaO;
          const hasCargaUtil = true;
          const hasPuertas = !isCategoriaO;
          const hasSalidasEmergencia = !isCategoriaO;
          const hasCilindros = !isCategoriaO;
          const hasKilometraje = !isCategoriaO;

          const optsClases = maestrosVehiculo?.clases.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsMarcas = maestrosVehiculo?.marcas.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsCarrocerias = maestrosVehiculo?.carrocerias.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsCombustibles = maestrosVehiculo?.combustibles.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsCategoriasExtra = maestrosVehiculo?.categoriasExtra?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];

          return (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-[#052a79] uppercase">Datos del Vehículo</h3>
                {catName && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">Categoría {catName}</span>}
              </div>

              {!catName ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-sm font-semibold text-center">
                  Selecciona una Categoría en el Paso 1 (Caja) para cargar los campos dinámicos del vehículo.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Identificadores y Clasificación</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <InputField label="Categoría" name="categoria_display" overrideValue={catName} disabled={true} formData={formVehiculo} setFormData={setFormVehiculo} />
                      {hasCategoriaExtra && <InputField label="Categoría Extra" name="categoriaExtra" isSelect options={optsCategoriasExtra} formData={formVehiculo} setFormData={setFormVehiculo} />}
                      <InputField label="Clase" name="clase" isSelect options={optsClases} onAddNuevo={() => handleAddNuevo('Clase', 'vehiculoclase', 'clase', optsClases)} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Marca" name="marca" isSelect options={optsMarcas} onAddNuevo={() => handleAddNuevo('Marca', 'marca', 'marca', optsMarcas)} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Modelo" name="modelo" isAsyncSelect defaultOptions={true} loadOptions={loadModelos} onAddNuevo={() => handleAddNuevo('Modelo', 'modelo', 'modelo', [], loadModelos)} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Color" name="color" isAsyncSelect defaultOptions={true} loadOptions={loadColores} onAddNuevo={() => handleAddNuevo('Color', 'color', 'color', [], loadColores)} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Carrocería" name="carroceria" isSelect options={optsCarrocerias} onAddNuevo={() => handleAddNuevo('Carrocería', 'carroceria', 'carroceria', optsCarrocerias)} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Marca Carrocería" name="marcaCarroceria" disabled={true} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Placa Nueva" name="placaNueva" onSearch={handleSearchVehiculo} searching={searchingVehiculo} disabled={!(isReinspeccion || parseFloat((formVehiculo as any)['kilometrajeOriginal'] || 0) > 0)} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Nro Serie (VIN)" name="nroSerie" maxLength={22} formData={formVehiculo} setFormData={setFormVehiculo} />
                      {hasMotor && <InputField label="Nro Motor" name="nroMotor" maxLength={20} formData={formVehiculo} setFormData={setFormVehiculo} />}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Especificaciones Técnicas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <InputField label="Año Fabricación" name="anioFabricacion" type="number" maxLength={4} minNumber={1800} maxNumber={new Date().getFullYear() + 2} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Combustible" name="combustible" isSelect options={optsCombustibles} formData={formVehiculo} setFormData={setFormVehiculo} />
                      {hasCilindros && <InputField label="Nro Cilindros" name="nroCilindros" type="number" formData={formVehiculo} setFormData={setFormVehiculo} />}
                      {hasKilometraje && <InputField label="Kilometraje" name="kilometraje" type="number" maxLength={6} formData={formVehiculo} setFormData={setFormVehiculo} />}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Capacidad y Dimensiones</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {hasAsientos && <InputField label="Nro Asientos" name="nroAsientos" type="number" minNumber={0} maxNumber={80} formData={formVehiculo} setFormData={setFormVehiculo} />}
                      {hasPasajeros && <InputField label="Nro Pasajeros" name="nroPasajeros" type="number" minNumber={0} maxNumber={80} formData={formVehiculo} setFormData={setFormVehiculo} />}
                      {hasPuertas && <InputField label="Nro Puertas" name="nroPuertas" type="number" formData={formVehiculo} setFormData={setFormVehiculo} />}
                      {hasPisos && <InputField label="Nro Pisos" name="nroPisos" type="number" formData={formVehiculo} setFormData={setFormVehiculo} />}
                      {hasSalidasEmergencia && <InputField label="Salidas de Emergencia" name="salidasEmergencia" type="number" formData={formVehiculo} setFormData={setFormVehiculo} />}
                      <InputField label="Peso Seco (Kg)" name="pesoSeco" type="number" maxLength={5} formData={formVehiculo} setFormData={setFormVehiculo} />
                      {hasCargaUtil && <InputField label="Carga Útil (Kg)" name="cargaUtil" type="number" maxLength={5} formData={formVehiculo} setFormData={setFormVehiculo} />}
                      <InputField label="Peso Bruto (Kg)" name="pesoBruto" type="number" maxLength={5} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Longitud (m)" name="longitud" type="number" formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Ancho (m)" name="ancho" type="number" formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Altura (m)" name="altura" type="number" formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Nro Ejes" name="nroEjes" type="number" maxNumber={6} formData={formVehiculo} setFormData={setFormVehiculo} />
                      <InputField label="Nro Ruedas" name="nroRuedas" type="number" maxNumber={24} formData={formVehiculo} setFormData={setFormVehiculo} />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center justify-center">
                {!isDatosValid && (
                  <p className="text-xs text-amber-600 font-bold mb-3 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                    ⚠️ Complete todos los campos obligatorios para continuar al SOAT
                  </p>
                )}
                <button
                  type="button"
                  disabled={!isDatosValid}
                  onClick={() => setVehiculoTab('SOAT')}
                  className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
                    ${isDatosValid ? 'bg-gold-3d hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                  `}
                >
                  Continuar a SOAT
                </button>
                {!isDatosValid && (
                  <p className="mt-3 text-xs text-red-500 font-semibold max-w-lg text-center">
                    Falta completar: {missingDatos.join(', ')}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
        {vehiculoTab === 'SOAT' && (() => {
          const optsTiposPoliza = maestrosVehiculo?.tiposPoliza?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsAseguradoras = maestrosVehiculo?.aseguradoras?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];

          return (
            <div>
              <h3 className="text-sm font-black text-[#052a79] uppercase mb-4">SOAT</h3>
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputField
                    label="Nro SOAT"
                    name="nroSoat"
                    maxLength={25}
                    onKeyDown={(e: any) => {
                      if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e: any) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setFormVehiculo({ ...formVehiculo, nroSoat: val });
                    }}
                    overrideValue={formVehiculo.nroSoat || ''}
                    formData={formVehiculo} setFormData={setFormVehiculo}
                  />
                  <InputField label="Tipo de Póliza" name="tipoPoliza" isSelect options={optsTiposPoliza} formData={formVehiculo} setFormData={setFormVehiculo} />
                  <InputField label="Aseguradora" name="aseguradora" isSelect options={optsAseguradoras} formData={formVehiculo} setFormData={setFormVehiculo} />
                  <InputField
                    label="Vigencia SOAT (Meses)"
                    name="mesesSoat"
                    isSelect
                    options={[ { value: '6', label: '6 meses' }, { value: '12', label: '12 meses' } ]}
                    formData={formVehiculo} setFormData={setFormVehiculo}
                  />
                  <InputField label="Fecha de Emisión" name="fechaEmisionSoat" type="date" formData={formVehiculo} setFormData={setFormVehiculo} />
                  <InputField label="Fecha de Vencimiento" name="fechaVencimientoSoat" type="date" disabled={!!formVehiculo.fechaEmisionSoat} formData={formVehiculo} setFormData={setFormVehiculo} />
                </div>
              </div>

              {onNext && (
                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center justify-center">
                  {!isSoatValid && (
                    <p className="text-xs text-amber-600 font-bold mb-3 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                      ⚠️ Complete todos los campos del SOAT para continuar
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!isSoatValid}
                    onClick={onNext}
                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
                        ${isSoatValid ? 'bg-[#052a79] text-white hover:bg-blue-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                      `}
                  >
                    Siguiente Paso
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
