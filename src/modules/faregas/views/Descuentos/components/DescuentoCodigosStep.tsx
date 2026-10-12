import { useState } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import Swal from 'sweetalert2';
import { faregasDescuentosAdminApi, type DescuentoAdmin, type ResultadoCodigosMasivos } from '../../../services/faregas-descuentos.api';
import { analizarFilasImportacion, construirVigenciaCodigo, filasDesdeCsv, generarPreviewLote, type CodigoImportado, type ErrorImportacion } from '../descuentos-wizard.utils';

type Modo = 'UNICO' | 'LOTE' | 'IMPORTAR';
type Props = {
  descuento: DescuentoAdmin;
  totalCodigos: number;
  onCambio: () => Promise<void> | void;
  onVerCodigos: () => void;
};

const fecha = (valor: string) => new Date(valor).toLocaleDateString('es-PE');

export function DescuentoCodigosStep({ descuento, totalCodigos, onCambio, onVerCodigos }: Props) {
  const [modo, setModo] = useState<Modo>('UNICO');
  const [personalizarVigencia, setPersonalizarVigencia] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [codigo, setCodigo] = useState('');
  const [placa, setPlaca] = useState('');
  const [maxUsos, setMaxUsos] = useState(1);
  const [prefijo, setPrefijo] = useState('');
  const [cantidad, setCantidad] = useState(100);
  const [usosLote, setUsosLote] = useState(1);
  const [itemsImportados, setItemsImportados] = useState<CodigoImportado[]>([]);
  const [erroresLocales, setErroresLocales] = useState<ErrorImportacion[]>([]);
  const [validacionImportacion, setValidacionImportacion] = useState<ResultadoCodigosMasivos | null>(null);
  const [procesando, setProcesando] = useState(false);

  const vigencia = construirVigenciaCodigo(personalizarVigencia, fechaInicio, fechaFin);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setProcesando(true);
    try {
      await accion();
      await onCambio();
      await Swal.fire('Listo', exito, 'success');
    } catch (error) {
      await Swal.fire('No se pudieron guardar los códigos', error instanceof Error ? error.message : 'Error inesperado.', 'error');
    } finally { setProcesando(false); }
  };

  const crearUnico = () => ejecutar(async () => {
    if (!codigo.trim()) throw new Error('El código es obligatorio.');
    await faregasDescuentosAdminApi.crearCodigo(descuento.id, {
      codigo: codigo.trim().toUpperCase(), placa: placa.trim().toUpperCase(), maxUsos, ...vigencia,
    });
    setCodigo(''); setPlaca('');
  }, 'El código fue creado y heredó el alcance de la campaña.');

  const crearLote = () => ejecutar(async () => {
    const resultado = await faregasDescuentosAdminApi.generarLote(descuento.id, { prefijo, cantidad, maxUsos: usosLote, ...vigencia });
    if (!resultado.creados) throw new Error(`No se crearon códigos. Duplicados: ${resultado.duplicados}.`);
  }, 'El lote fue procesado correctamente.');

  const leerArchivo = async (archivo?: File) => {
    if (!archivo) return;
    setProcesando(true);
    try {
      const extension = archivo.name.split('.').pop()?.toLowerCase();
      if (extension !== 'csv' && extension !== 'xlsx') throw new Error('Use un archivo CSV o XLSX.');
      const filas = extension === 'csv' ? filasDesdeCsv(await archivo.text()) : await readXlsxFile(archivo);
      const analisis = analizarFilasImportacion(filas as unknown[][]);
      setItemsImportados(analisis.items);
      setErroresLocales(analisis.errores);
      if (analisis.items.length) {
        const validacion = await faregasDescuentosAdminApi.importarCodigos(descuento.id, {
          items: analisis.items, validarSolo: true, ...vigencia,
        });
        setValidacionImportacion(validacion);
      } else setValidacionImportacion(null);
    } catch (error) {
      setItemsImportados([]); setValidacionImportacion(null);
      await Swal.fire('No se pudo leer el archivo', error instanceof Error ? error.message : 'Archivo inválido.', 'error');
    } finally { setProcesando(false); }
  };

  const importar = () => ejecutar(async () => {
    if (!itemsImportados.length) throw new Error('Seleccione un archivo con códigos válidos.');
    const resultado = await faregasDescuentosAdminApi.importarCodigos(descuento.id, { items: itemsImportados, ...vigencia });
    if (!resultado.creados) throw new Error(`No se crearon códigos. Duplicados: ${resultado.duplicados}; rechazados: ${resultado.rechazados}.`);
    setItemsImportados([]); setErroresLocales([]); setValidacionImportacion(null);
  }, 'La importación fue procesada en un solo lote.');

  const previewLote = generarPreviewLote(prefijo, cantidad);
  const totalImportacion = itemsImportados.length + erroresLocales.length;
  const validosImportacion = validacionImportacion?.validos ?? itemsImportados.length;
  const erroresServidor = validacionImportacion?.errores || [];
  const duplicadosLocales = erroresLocales.filter(error => error.motivo === 'DUPLICADO_ARCHIVO').length;
  const rechazadosLocales = erroresLocales.length - duplicadosLocales;

  return <div className="space-y-4 p-4">
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
      <b>Vigencia: {fecha(descuento.fecha_inicio)} - {fecha(descuento.fecha_fin)}</b><span className="ml-2">Heredada de la campaña.</span>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
      <div><b className="text-sm">{totalCodigos.toLocaleString('es-PE')} código(s)</b><p className="text-xs text-slate-500">Los códigos autorizan el uso del beneficio ya configurado.</p></div>
      <button type="button" onClick={onVerCodigos} className="rounded-lg border border-[#052a79] px-4 py-2 text-xs font-bold text-[#052a79]">Ver códigos</button>
    </div>
    <section className="rounded-xl border bg-white p-4">
      <b className="text-xs">¿CÓMO DESEA CREAR CÓDIGOS?</b>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">{([['UNICO', 'Código único'], ['LOTE', 'Generar lote'], ['IMPORTAR', 'Importar archivo']] as const).map(([valor, etiqueta]) => <button key={valor} type="button" onClick={() => setModo(valor)} className={`rounded-lg border px-4 py-3 text-xs font-bold ${modo === valor ? 'border-[#052a79] bg-[#052a79] text-white' : 'bg-white text-slate-600'}`}>{etiqueta}</button>)}</div>
    </section>

    <section className="rounded-xl border bg-white p-4">
      {modo === 'UNICO' && <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-bold">CÓDIGO<input value={codigo} onChange={event => setCodigo(event.target.value.toUpperCase())} className="input mt-1" /></label>
        <label className="text-xs font-bold">PLACA (OPCIONAL)<input value={placa} onChange={event => setPlaca(event.target.value.toUpperCase())} className="input mt-1" /></label>
        <label className="text-xs font-bold">MÁXIMO DE USOS<input type="number" min="1" value={maxUsos} onChange={event => setMaxUsos(Number(event.target.value))} className="input mt-1" /></label>
      </div>}
      {modo === 'LOTE' && <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-bold">PREFIJO<input value={prefijo} onChange={event => setPrefijo(event.target.value.toUpperCase())} placeholder="EMPRESA" className="input mt-1" /></label>
        <label className="text-xs font-bold">CANTIDAD (MÁX. 10,000)<input type="number" min="1" max="10000" value={cantidad} onChange={event => setCantidad(Number(event.target.value))} className="input mt-1" /></label>
        <label className="text-xs font-bold">USOS POR CÓDIGO<input type="number" min="1" value={usosLote} onChange={event => setUsosLote(Number(event.target.value))} className="input mt-1" /></label>
        {previewLote.length > 0 && <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs md:col-span-3">{previewLote.map((item, indice) => <div key={`${item}-${indice}`}>{item}</div>)}</div>}
      </div>}
      {modo === 'IMPORTAR' && <div className="space-y-3">
        <input type="file" accept=".csv,.xlsx" onChange={event => void leerArchivo(event.target.files?.[0])} className="block w-full rounded-lg border p-3 text-xs" />
        <p className="text-xs text-slate-500">Columnas: <b>codigo</b> (obligatoria), placa y max_usos (opcionales).</p>
        {totalImportacion > 0 && <div className="grid gap-2 sm:grid-cols-4"><Resumen etiqueta="Total" valor={totalImportacion} /><Resumen etiqueta="Válidos" valor={validosImportacion} /><Resumen etiqueta="Duplicados" valor={duplicadosLocales + (validacionImportacion?.duplicados || 0)} /><Resumen etiqueta="Rechazados" valor={rechazadosLocales + (validacionImportacion?.rechazados || 0)} /></div>}
        {(erroresLocales.length > 0 || erroresServidor.length > 0) && <div className="max-h-36 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{[...erroresLocales, ...erroresServidor].slice(0, 20).map((error, indice) => <div key={`${error.fila}-${error.motivo}-${indice}`}>Fila {error.fila}: {error.codigo ? `${error.codigo} — ` : ''}{error.motivo}</div>)}</div>}
      </div>}

      <label className="mt-4 flex items-center gap-2 border-t pt-4 text-xs font-bold"><input type="checkbox" checked={personalizarVigencia} onChange={event => { setPersonalizarVigencia(event.target.checked); if (!event.target.checked) { setFechaInicio(''); setFechaFin(''); } }} /> Usar vigencia personalizada</label>
      {personalizarVigencia && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">VÁLIDO DESDE<input type="date" value={fechaInicio} onChange={event => setFechaInicio(event.target.value)} className="input mt-1" /></label><label className="text-xs font-bold">VÁLIDO HASTA<input type="date" value={fechaFin} onChange={event => setFechaFin(event.target.value)} className="input mt-1" /></label></div>}
      <div className="mt-4 flex justify-end"><button type="button" disabled={procesando} onClick={() => void (modo === 'UNICO' ? crearUnico() : modo === 'LOTE' ? crearLote() : importar())} className="rounded-lg bg-green-600 px-6 py-2.5 text-xs font-black text-white disabled:opacity-50">{procesando ? 'PROCESANDO...' : modo === 'UNICO' ? 'CREAR CÓDIGO' : modo === 'LOTE' ? 'GENERAR LOTE' : 'IMPORTAR CÓDIGOS'}</button></div>
    </section>
  </div>;
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">{etiqueta}</span><b className="block text-lg text-[#052a79]">{valor.toLocaleString('es-PE')}</b></div>;
}
