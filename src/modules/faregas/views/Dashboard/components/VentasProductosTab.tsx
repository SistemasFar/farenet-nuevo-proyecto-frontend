import React from 'react';
import type {
  DashboardResumenResponse,
  PaginadoResponse,
  ProductoDetalleItem,
  SedeDetalleItem,
  UsuarioDetalleItem
} from '../../../services/faregas-dashboard.api';
import { DashboardGraficos } from './DashboardGraficos';
import { DashboardKpis } from './DashboardKpis';
import { DashboardSedes } from './DashboardSedes';
import { DashboardUsuarios } from './DashboardUsuarios';
import { DashboardVentas } from './DashboardVentas';

interface VentasProductosTabProps {
  resumen: DashboardResumenResponse | null;
  ventas: PaginadoResponse<ProductoDetalleItem> | null;
  sedes: SedeDetalleItem[];
  usuarios: UsuarioDetalleItem[];
  cargando: boolean;
  productoIdSeleccionado?: number;
  onSeleccionarProducto?: (productoId?: number) => void;
}

export const VentasProductosTab: React.FC<VentasProductosTabProps> = ({
  resumen,
  ventas,
  sedes,
  usuarios,
  cargando,
  productoIdSeleccionado,
  onSeleccionarProducto
}) => (
  <div className="space-y-4">
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={['productosVendidos', 'ventaBruta', 'ventaNeta', 'ticketPromedio']}
      titulo="Ventas y productos"
      descripcion="Importes y unidades facturadas conservando la clave original de cada producto."
    />
    <DashboardGraficos
      serieDiaria={resumen?.serieDiaria || []}
      distribucionCertificados={[]}
      distribucionPagos={[]}
      productos={resumen?.distribucionProductos || ventas?.items || []}
      mostrar={['evolucion', 'productos']}
      productoIdSeleccionado={productoIdSeleccionado}
      onSeleccionarProducto={onSeleccionarProducto}
    />
    <DashboardVentas data={ventas} cargando={cargando} />
    <DashboardSedes sedes={sedes} cargando={cargando} />
    <DashboardUsuarios usuarios={usuarios} cargando={cargando} />
  </div>
);
