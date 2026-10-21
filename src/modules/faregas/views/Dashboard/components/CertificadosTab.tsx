import React from 'react';
import type {
  CertificadoDetalleItem,
  DashboardResumenResponse,
  DuplicadoDetalleItem,
  PaginadoResponse,
  SedeDetalleItem
} from '../../../services/faregas-dashboard.api';
import { DashboardCertificados } from './DashboardCertificados';
import { DashboardCertificadosEvolucion } from './DashboardCertificadosEvolucion';
import { DashboardDuplicados } from './DashboardDuplicados';
import { DashboardDuplicadosEvolucion } from './DashboardDuplicadosEvolucion';
import { DashboardDuplicadosGrafico } from './DashboardDuplicadosGrafico';
import { DashboardGraficos } from './DashboardGraficos';
import { DashboardKpis } from './DashboardKpis';
import { DashboardSedes } from './DashboardSedes';

interface CertificadosTabProps {
  resumen: DashboardResumenResponse | null;
  certificados: PaginadoResponse<CertificadoDetalleItem> | null;
  duplicados: PaginadoResponse<DuplicadoDetalleItem> | null;
  sedes: SedeDetalleItem[];
  cargando: boolean;
  tipoCertificadoSeleccionado?: string;
  tipoDuplicadoSeleccionado?: string;
  onSeleccionarTipoCertificado: (tipo?: string) => void;
  onSeleccionarTipoDuplicado: (tipo?: string) => void;
  paginaCertificados: number;
  paginaDuplicados: number;
  onCambiarPaginaCertificados: (pagina: number) => void;
  onCambiarPaginaDuplicados: (pagina: number) => void;
}

export const CertificadosTab: React.FC<CertificadosTabProps> = ({
  resumen,
  certificados,
  duplicados,
  sedes,
  cargando,
  tipoCertificadoSeleccionado,
  tipoDuplicadoSeleccionado,
  onSeleccionarTipoCertificado,
  onSeleccionarTipoDuplicado,
  paginaCertificados,
  paginaDuplicados,
  onCambiarPaginaCertificados,
  onCambiarPaginaDuplicados
}) => (
  <div className="space-y-4">
    {/* Sección A: Estado de Certificados Oficiales y Duplicados (4 tarjetas) */}
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={[
        'certificadosEmitidos',
        'certificadosPendientes',
        'certificadosAnulados',
        'duplicadosEmitidos'
      ]}
      titulo="Estado de certificados"
      descripcion="Emisiones oficiales, borradores pendientes, anulaciones y duplicados emitidos durante el período."
    />

    {/* Sección B: Ventas de Certificados Originales */}
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={[
        'ventaOperativaCertificados',
        'ventaBrutaCertificados',
        'ventaNetaCertificados',
        'ticketPromedioCertificados'
      ]}
      titulo="Ventas de certificados"
      descripcion="Importes calculados solo con líneas de certificados facturadas; no incluyen chips, papeles ni otros productos de almacén. Pasa el cursor sobre una tarjeta para ver su fórmula."
    />

    {/* Sección C: Gráfico de Tipos de Certificado Originales Vendidos */}
    <DashboardGraficos
      serieDiaria={[]}
      distribucionCertificados={resumen?.distribucionCertificados || []}
      distribucionPagos={[]}
      productos={[]}
      mostrar={['certificados']}
      tipoCertificadoSeleccionado={tipoCertificadoSeleccionado}
      onSeleccionarTipoCertificado={onSeleccionarTipoCertificado}
    />

    <DashboardCertificadosEvolucion serie={resumen?.serieCertificados || []} />

    {/* Sección D: Métricas Financieras de Duplicados */}
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={[
        'ventaDuplicados',
        'totalCobradoDuplicados',
        'saldoPendienteDuplicados',
        'ticketPromedioDuplicados'
      ]}
      titulo="Ingresos por duplicados"
      descripcion="Importe correspondiente a los duplicados facturados y cobrados durante el período seleccionado. Esta cantidad ya forma parte de la venta general y no se suma nuevamente."
    />

    {/* Sección E: Gráfico Duplicados por Tipo de Certificado con Interactividad */}
    <DashboardDuplicadosGrafico
      distribucionDuplicados={resumen?.distribucionDuplicados || []}
      tipoDuplicadoSeleccionado={tipoDuplicadoSeleccionado}
      onSeleccionarTipoDuplicado={onSeleccionarTipoDuplicado}
      cargando={cargando}
    />

    {/* Evolución Diaria de Duplicados */}
    <DashboardDuplicadosEvolucion serie={resumen?.serieDuplicados || []} />

    {/* Sección F: Historial Detallado de Duplicados Emitidos */}
    <DashboardDuplicados
      data={duplicados}
      cargando={cargando}
      pagina={paginaDuplicados}
      onCambiarPagina={onCambiarPaginaDuplicados}
    />

    {/* Sección G: Certificados Originales Registrados */}
    <DashboardCertificados
      data={certificados}
      cargando={cargando}
      pagina={paginaCertificados}
      onCambiarPagina={onCambiarPaginaCertificados}
    />

    {/* Sección H: Comparativa y Ranking por Sede */}
    <DashboardSedes sedes={sedes} cargando={cargando} />
  </div>
);
