const CAMPOS_EFIMEROS = new Set(['_uuid', 'titularId', 'clienteId']);

const normalizarValor = (valor: unknown): unknown => {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === 'number' && !Number.isFinite(valor)) return null;
  if (Array.isArray(valor)) return valor.map(normalizarValor);
  if (typeof valor !== 'object') return valor;

  return Object.keys(valor as Record<string, unknown>)
    .filter((clave) => !CAMPOS_EFIMEROS.has(clave))
    .sort()
    .reduce<Record<string, unknown>>((resultado, clave) => {
      resultado[clave] = normalizarValor((valor as Record<string, unknown>)[clave]);
      return resultado;
    }, {});
};

export const crearSnapshotAutosave = (valor: unknown) =>
  JSON.stringify(normalizarValor(valor));

/**
 * Lleva por bloque el último snapshot confirmado y los que están en cola.
 * Un snapshot sólo se considera persistido después de una respuesta exitosa.
 */
export class ControlAutosave {
  private readonly persistidos = new Map<string, string>();
  private readonly pendientes = new Map<string, Set<string>>();

  sembrar(bloque: string, snapshot: string) {
    this.persistidos.set(bloque, snapshot);
  }

  preparar(bloque: string, snapshot: string) {
    if (this.persistidos.get(bloque) === snapshot) return false;
    const cola = this.pendientes.get(bloque) ?? new Set<string>();
    if (cola.has(snapshot)) return false;
    cola.add(snapshot);
    this.pendientes.set(bloque, cola);
    return true;
  }

  confirmar(bloque: string, snapshot: string) {
    this.persistidos.set(bloque, snapshot);
    this.retirarPendiente(bloque, snapshot);
  }

  fallar(bloque: string, snapshot: string) {
    this.retirarPendiente(bloque, snapshot);
  }

  estaPersistido(bloque: string, snapshot: string) {
    return this.persistidos.get(bloque) === snapshot;
  }

  private retirarPendiente(bloque: string, snapshot: string) {
    const cola = this.pendientes.get(bloque);
    if (!cola) return;
    cola.delete(snapshot);
    if (cola.size === 0) this.pendientes.delete(bloque);
  }
}
