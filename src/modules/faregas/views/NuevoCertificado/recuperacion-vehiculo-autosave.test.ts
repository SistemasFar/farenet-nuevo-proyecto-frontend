import { describe, expect, it, vi } from 'vitest';
import { ControlAutosave, crearSnapshotAutosave } from './autosave-control';
import fuenteWizard from './NuevoCertificadoView.tsx?raw';
import fuenteApi from '../../services/faregas-certificados.api.ts?raw';

const ejecutarAutosave = async (
  control: ControlAutosave,
  bloque: string,
  valor: unknown,
  request: () => Promise<void>
) => {
  const snapshot = crearSnapshotAutosave(valor);
  if (!control.preparar(bloque, snapshot)) return false;
  try {
    await request();
    control.confirmar(bloque, snapshot);
    return true;
  } catch (error) {
    control.fallar(bloque, snapshot);
    throw error;
  }
};

describe('snapshot normalizado de autosave', () => {
  it('es estable aunque cambie el orden de las claves', () => {
    expect(crearSnapshotAutosave({ b: 2, a: 1 })).toBe(crearSnapshotAutosave({ a: 1, b: 2 }));
  });

  it('normaliza undefined y null de la misma manera', () => {
    expect(crearSnapshotAutosave({ valor: undefined })).toBe(crearSnapshotAutosave({ valor: null }));
  });

  it('omite identificadores efímeros creados durante la persistencia', () => {
    expect(crearSnapshotAutosave({ _uuid: 'uno', titularId: null, clienteId: null, nombre: 'GRACE' }))
      .toBe(crearSnapshotAutosave({ _uuid: 'dos', titularId: 8, clienteId: 12, nombre: 'GRACE' }));
  });

  it('conserva el orden significativo de componentes', () => {
    expect(crearSnapshotAutosave([{ orden: 1 }, { orden: 2 }]))
      .not.toBe(crearSnapshotAutosave([{ orden: 2 }, { orden: 1 }]));
  });
});

describe('control de autosave y conteo de peticiones', () => {
  it('la hidratación sembrada no genera escrituras', async () => {
    const control = new ControlAutosave();
    const request = vi.fn(async () => undefined);
    const valor = { placa: 'ABC123', marca: 'TOYOTA' };
    control.sembrar('VEHICULO', crearSnapshotAutosave(valor));

    expect(await ejecutarAutosave(control, 'VEHICULO', valor, request)).toBe(false);
    expect(request).toHaveBeenCalledTimes(0);
  });

  it('una modificación real genera una sola escritura', async () => {
    const control = new ControlAutosave();
    const request = vi.fn(async () => undefined);
    control.sembrar('VEHICULO', crearSnapshotAutosave({ marca: 'TOYOTA' }));

    expect(await ejecutarAutosave(control, 'VEHICULO', { marca: 'KIA' }, request)).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('el cambio persistido se conserva al simular una recarga', async () => {
    let servidor = { marca: 'TOYOTA', modelo: 'YARIS' };
    const control = new ControlAutosave();
    control.sembrar('VEHICULO', crearSnapshotAutosave(servidor));
    const editado = { ...servidor, modelo: 'COROLLA' };

    await ejecutarAutosave(control, 'VEHICULO', editado, async () => {
      servidor = { ...editado };
    });

    const despuesDeRecargar = new ControlAutosave();
    despuesDeRecargar.sembrar('VEHICULO', crearSnapshotAutosave(servidor));
    const request = vi.fn(async () => undefined);
    expect(servidor.modelo).toBe('COROLLA');
    expect(await ejecutarAutosave(despuesDeRecargar, 'VEHICULO', servidor, request)).toBe(false);
    expect(request).toHaveBeenCalledTimes(0);
  });

  it('renders repetidos del mismo valor no repiten la petición', async () => {
    const control = new ControlAutosave();
    const request = vi.fn(async () => undefined);
    const valor = { marca: 'KIA' };

    await ejecutarAutosave(control, 'VEHICULO', valor, request);
    await ejecutarAutosave(control, 'VEHICULO', valor, request);
    await ejecutarAutosave(control, 'VEHICULO', valor, request);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('no encola dos veces el mismo snapshot mientras está pendiente', () => {
    const control = new ControlAutosave();
    const snapshot = crearSnapshotAutosave({ modelo: 'YARIS' });
    expect(control.preparar('VEHICULO', snapshot)).toBe(true);
    expect(control.preparar('VEHICULO', snapshot)).toBe(false);
  });

  it('permite encolar un cambio nuevo mientras el anterior sigue pendiente', () => {
    const control = new ControlAutosave();
    expect(control.preparar('VEHICULO', crearSnapshotAutosave({ modelo: 'YARIS' }))).toBe(true);
    expect(control.preparar('VEHICULO', crearSnapshotAutosave({ modelo: 'COROLLA' }))).toBe(true);
  });

  it('sólo actualiza la línea base después de confirmar', () => {
    const control = new ControlAutosave();
    const snapshot = crearSnapshotAutosave({ vin: 'VIN-1' });
    expect(control.preparar('VEHICULO', snapshot)).toBe(true);
    expect(control.estaPersistido('VEHICULO', snapshot)).toBe(false);
    control.confirmar('VEHICULO', snapshot);
    expect(control.estaPersistido('VEHICULO', snapshot)).toBe(true);
  });

  it('un fallo libera el snapshot para un reintento', () => {
    const control = new ControlAutosave();
    const snapshot = crearSnapshotAutosave({ vin: 'VIN-1' });
    expect(control.preparar('VEHICULO', snapshot)).toBe(true);
    control.fallar('VEHICULO', snapshot);
    expect(control.preparar('VEHICULO', snapshot)).toBe(true);
  });

  it('aísla los snapshots de vehículo y pago', () => {
    const control = new ControlAutosave();
    const snapshot = crearSnapshotAutosave({ total: 50 });
    control.sembrar('PAGO', snapshot);
    expect(control.estaPersistido('PAGO', snapshot)).toBe(true);
    expect(control.estaPersistido('VEHICULO', snapshot)).toBe(false);
  });
});

describe('persistencia de la recuperación histórica', () => {
  it('consulta por borrador excluido, tipo y modalidad', () => {
    expect(fuenteApi).toContain("params.set('excludeCertificadoId'");
    expect(fuenteApi).toContain("params.set('tipoCertificado'");
    expect(fuenteApi).toContain("params.set('modalidad'");
  });

  it('guarda la recuperación antes del cambio de ruta', () => {
    const guardar = fuenteWizard.indexOf('await guardarPasoVehiculo(idBorrador, false, estadoRecuperado)');
    const navegar = fuenteWizard.indexOf('navigate(`/faregas/certificados/${idBorrador}/continuar`, { replace: true })');
    expect(guardar).toBeGreaterThan(-1);
    expect(navegar).toBeGreaterThan(guardar);
  });

  it('descarta respuestas asíncronas de una placa anterior', () => {
    expect(fuenteWizard).toContain('placaActualRef.current !== placaSolicitada');
    expect(fuenteWizard).toContain('placaActualRef.current !== placaConsultada');
  });

  it('no activa autosave en consulta ni rectificación', () => {
    expect(fuenteWizard).toContain('soloLectura || modoRectificacion');
  });

  it('vacía la cola antes de avanzar, volver o salir', () => {
    expect(fuenteWizard.match(/await autosaveQueueRef\.current\.catch/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
