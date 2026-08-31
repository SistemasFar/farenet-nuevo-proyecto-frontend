const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

const headers = (): HeadersInit => {
  const token = sessionStorage.getItem('faregasAccessToken')?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${BASE_URL}/faregas/certificados${path}`, { headers: headers() });
  const body = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message || 'No se pudo consultar la facturación.');
  return body;
};

export interface DocumentoFacturacionAdmin {
  id: number;
  certificadoId: number;
  plantaKey: string;
  plantaNombre: string;
  empresaKey: string;
  empresaNombre: string;
  tipoComprobante: string;
  nroComprobante: string | null;
  nroDocumento: string;
  cliente: string;
  placa: string | null;
  importeTotal: number;
  estado: string;
  aceptadaSunat: boolean | null;
  mensajeSunat: string | null;
  enlacePdf: string | null;
  enlaceXml: string | null;
  enlaceCdr: string | null;
  intentos: number;
  fechaUltimoIntento: string | null;
  fechaCreacion: string;
}

export interface OperacionFacturacionAdmin {
  operacion?: string;
  numero_intento: number;
  estado: string;
  http_status: number | null;
  error: string | null;
  usuario_creacion?: string;
  fecha_creacion: string;
  fecha_finalizacion: string | null;
}

export interface FiltrosFacturacionAdmin {
  texto?: string;
  empresaKey?: string;
  plantaKey?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  limite?: number;
}

export const faregasFacturacionAdminApi = {
  listar: async (filtros: FiltrosFacturacionAdmin) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    return request<{ ok: true; data: {
      documentos: DocumentoFacturacionAdmin[];
      total: number;
      pagina: number;
      limite: number;
      plantas: Array<{ key: string; nombre: string; empresaKey: string }>;
      empresas: Array<{ key: string; nombre: string }>;
    } }>(`/facturacion/admin/documentos?${params.toString()}`);
  },
  obtenerDetalle: (id: number) => request<{ ok: true; data: {
    documento: DocumentoFacturacionAdmin;
    intentos: OperacionFacturacionAdmin[];
    operaciones: OperacionFacturacionAdmin[];
  } }>(`/facturacion/admin/documentos/${id}`)
};
