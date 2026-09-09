import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ScanBarcode } from 'lucide-react';
import { faregasChipsApi } from '../../../../services/faregas-chips.api';

interface ChipBarcodeFieldProps {
  value: string;
  certificadoId?: number | null;
  onChange: (value: string) => void;
}

type Validacion = {
  tipo: 'neutral' | 'cargando' | 'correcto' | 'error';
  mensaje: string;
};

const limpiarNumero = (value: string) => value
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .slice(0, 15);

const mensajeNoDisponible = (codigo: string, plantaNombre?: string, estado?: string) => {
  if (codigo === 'CHIP_NO_ENCONTRADO') return 'El código no está registrado en el inventario.';
  if (codigo === 'CHIP_OTRA_SEDE') return `El chip pertenece a ${plantaNombre || 'otra sede'}.`;
  return `El chip no está disponible${estado ? `: estado ${estado}` : ''}.`;
};

export function ChipBarcodeField({ value, certificadoId, onChange }: ChipBarcodeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ultimaValidacion = useRef('');
  const [validacion, setValidacion] = useState<Validacion>({
    tipo: 'neutral',
    mensaje: 'Escanee el código de barras. El lector debe enviar Enter al finalizar.'
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (value !== ultimaValidacion.current) {
      setValidacion({
        tipo: 'neutral',
        mensaje: value
          ? 'Presione Enter o Validar para comprobar el chip.'
          : 'Escanee el código de barras. El lector debe enviar Enter al finalizar.'
      });
    }
  }, [value]);

  const validar = async () => {
    const numero = limpiarNumero(value);
    if (!numero) {
      setValidacion({ tipo: 'error', mensaje: 'Escanee o escriba el número del chip.' });
      return;
    }
    if (!/^[A-Z0-9]{1,15}$/.test(numero)) {
      setValidacion({ tipo: 'error', mensaje: 'El número debe ser alfanumérico y tener máximo 15 caracteres.' });
      return;
    }

    setValidacion({ tipo: 'cargando', mensaje: 'Validando chip en el inventario…' });
    try {
      const chip = await faregasChipsApi.consultarDisponibilidad(numero, certificadoId);
      ultimaValidacion.current = numero;
      if (!chip.disponible) {
        setValidacion({ tipo: 'error', mensaje: mensajeNoDisponible(chip.codigo, chip.plantaNombre, chip.estado) });
        return;
      }
      setValidacion({
        tipo: 'correcto',
        mensaje: chip.asignadoAlCertificado
          ? 'Chip reservado para este certificado.'
          : 'Chip disponible en esta sede; se reservará al guardar.'
      });
    } catch (error: unknown) {
      setValidacion({
        tipo: 'error',
        mensaje: error instanceof Error ? error.message : 'No se pudo validar el chip.'
      });
    }
  };

  const color = validacion.tipo === 'correcto'
    ? 'border-emerald-400 focus:border-emerald-500'
    : validacion.tipo === 'error'
      ? 'border-red-400 focus:border-red-500'
      : 'border-amber-300 focus:border-amber-500';

  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-500">
        N° CHIP <span className="text-red-500">*</span>{' '}
        <span className="font-normal text-slate-400">(código de barras, máx. 15)</span>
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            name="numeroChip"
            value={value}
            onChange={(event) => onChange(limpiarNumero(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void validar();
              }
            }}
            maxLength={15}
            autoComplete="off"
            className={`w-full rounded-lg border-2 py-2 pl-10 pr-3 font-mono font-bold uppercase text-slate-800 outline-none transition-colors ${color}`}
            placeholder="ESCANEE EL CHIP"
          />
        </div>
        <button
          type="button"
          onClick={() => void validar()}
          disabled={validacion.tipo === 'cargando'}
          className="inline-flex items-center gap-2 rounded-lg bg-[#052a79] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          {validacion.tipo === 'cargando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
          Validar
        </button>
      </div>
      <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${
        validacion.tipo === 'correcto' ? 'text-emerald-700'
          : validacion.tipo === 'error' ? 'text-red-700'
            : 'text-slate-500'
      }`}>
        {validacion.tipo === 'correcto' && <CheckCircle2 className="h-4 w-4" />}
        {validacion.tipo === 'error' && <AlertCircle className="h-4 w-4" />}
        {validacion.mensaje}
      </p>
    </div>
  );
}

