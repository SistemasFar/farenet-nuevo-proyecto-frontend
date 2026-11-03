import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SelectorDescuento } from './components/NuevoCertificado/SelectorDescuento';
import { CajaStep } from './components/NuevoCertificado/CajaStep';
import { PagoStep } from './components/NuevoCertificado/PagoStep';

describe('FAREGAS — Implementación de Descuentos sin Códigos', () => {

  it('1. SelectorDescuento se renderiza sin campos de texto ni botones de consulta manual', () => {
    const html = renderToStaticMarkup(
      <SelectorDescuento
        certificadoId={123}
        onDescuentoChange={() => undefined}
      />
    );

    expect(html).toContain('Descuento');
    expect(html).toContain('SIN DESCUENTO');
    expect(html).toContain('CON DESCUENTO');
    expect(html).not.toContain('Ingresa el código de descuento');
    expect(html).not.toContain('Ingrese el código de descuento');
    expect(html).not.toContain('placeholder="Ingresa el código');
    expect(html).not.toContain('CONSULTAR CÓDIGO');
  });

  it('2. SelectorDescuento muestra desglose claro si hay un descuento ya aplicado en el borrador', () => {
    const descuentoMock = {
      descuentoId: 15,
      codigo: 'CUPONCITO',
      nombre: 'CUPONCITO',
      tipo: 'CAMPANA' as const,
      tipoCalculo: 'PORCENTAJE' as const,
      valor: 50,
      formaPago: 'CONTADO' as const,
      tarifaOriginal: 90,
      importeDescuento: 45,
      importeFinal: 45,
      fechaFin: '2027-01-01',
      beneficio: '50% (-S/ 45.00)',
      autorizaGratuidad: false,
    };

    const html = renderToStaticMarkup(
      <SelectorDescuento
        certificadoId={123}
        descuentoActual={descuentoMock}
        onDescuentoChange={() => undefined}
      />
    );

    expect(html).toContain('CUPONCITO');
    expect(html).toContain('Tarifa Original');
    expect(html).toContain('S/ 90.00');
    expect(html).toContain('- S/ 45.00');
    expect(html).toContain('S/ 45.00');
  });

  it('3. CajaStep (Datos Iniciales) NO renderiza selector de descuento', () => {
    const catalogoMock = {
      sede: { key: '98', nombre: 'SURCO' },
      categorias: [
        {
          codigo: 'GNV',
          nombre: 'GNV',
          orden: 1,
          servicios: [
            {
              id: 1,
              codigo: '0126',
              nombre: 'GNV ANUAL',
              tipo_flujo: 'CERTIFICACION',
              tipo_certificado_clave: 'GNV_ANUAL',
              requiere_vehiculo: true,
              tarifa: {
                codigo: 'TAR-01',
                nombre: 'Tarifa GNV Anual',
                precio: 90,
                importeTotal: 90,
                requiereChip: false,
              },
            },
          ],
        },
      ],
    };

    const html = renderToStaticMarkup(
      <CajaStep
        catalogoInicial={catalogoMock as any}
        plantaSeleccionada="98"
        plantaNombre="SURCO"
        formCaja={{
          tipoPlaca: 'PARTICULAR',
          placa: 'ABC-123',
          tallerNombre: '',
          concepto: 'GNV ANUAL',
          categoria: 'M1',
          tipoInspeccion: 'ANUAL',
          tipoCertificado: 'GNV_ANUAL',
          modalidadCertificado: '',
          tipo_flujo: 'CERTIFICACION',
          requiere_certificado: true,
          servicioCodigo: '0126',
          tipoAutorizacion: '',
          tarifaCodigo: 'TAR-01',
        }}
        setFormCaja={() => undefined}
        certificadoId={123}
        consultaRealizada={true}
        consultando={false}
        onConsultar={async () => undefined}
        onInvalidarConsulta={() => undefined}
      />
    );

    // Datos Iniciales NO debe mostrar SIN DESCUENTO ni CON DESCUENTO
    expect(html).not.toContain('SIN DESCUENTO');
    expect(html).not.toContain('CON DESCUENTO');

    // NO debe existir rastro de ConsultaDescuento con código manual
    expect(html).not.toContain('Consulta uno de los códigos vinculados');
    expect(html).not.toContain('Ingresa el código de descuento');
  });

  it('4. PagoStep renderiza la sección DESCUENTO debajo de Condición de Pago', () => {
    const html = renderToStaticMarkup(
      <PagoStep
        pagoTab="EFECTIVO"
        setPagoTab={() => undefined}
        formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '' }}
        setFormPago={() => undefined}
        pagosAgregados={[]}
        handleAgregarPago={() => undefined}
        eliminarPago={() => undefined}
        totalPagar={90}
        tarifaOriginal={90}
        descuento={0}
        resumenComercial={null}
        maestrosPago={{ tarjetas: [] } as any}
        tipoComprobante="FACTURA"
        condicionPago="CONTADO"
        onCondicionPagoChange={() => undefined}
        fechaInicioCredito="2026-11-02"
        fechaVencimientoCredito="2026-12-02"
        onFechaInicioCreditoChange={() => undefined}
        onFechaVencimientoCreditoChange={() => undefined}
        certificadoId={719}
        descuentoActual={null}
        onDescuentoChange={() => undefined}
      />
    );

    // La sección DESCUENTO debe estar presente en Pago
    expect(html).toContain('Descuento');
    expect(html).toContain('SIN DESCUENTO');
    expect(html).toContain('CON DESCUENTO');

    // Debe estar debajo de CONDICIÓN DE PAGO (aparece antes en el HTML)
    const condicionIdx = html.indexOf('CONDICIÓN DE PAGO');
    const descuentoIdx = html.indexOf('Descuento');
    expect(condicionIdx).toBeGreaterThanOrEqual(0);
    expect(descuentoIdx).toBeGreaterThanOrEqual(0);
    expect(descuentoIdx).toBeGreaterThan(condicionIdx);

    // NO debe haber campo de código manual
    expect(html).not.toContain('Ingresa el código de descuento');
    expect(html).not.toContain('CONSULTAR CÓDIGO');
  });

  it('5. PagoStep muestra descuento aplicado cuando existe uno en el borrador', () => {
    const descuentoMock = {
      descuentoId: 15,
      codigo: 'DESC719',
      nombre: 'DESCUENTO GLP SURCO',
      tipo: 'CAMPANA' as const,
      tipoCalculo: 'PORCENTAJE' as const,
      valor: 10,
      formaPago: 'CONTADO' as const,
      tarifaOriginal: 90,
      importeDescuento: 9,
      importeFinal: 81,
      fechaFin: '2027-01-01',
      beneficio: '10% (-S/ 9.00)',
      autorizaGratuidad: false,
    };

    const html = renderToStaticMarkup(
      <PagoStep
        pagoTab="EFECTIVO"
        setPagoTab={() => undefined}
        formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '' }}
        setFormPago={() => undefined}
        pagosAgregados={[]}
        handleAgregarPago={() => undefined}
        eliminarPago={() => undefined}
        totalPagar={81}
        tarifaOriginal={90}
        descuento={9}
        resumenComercial={{
          precioCertificado: 90,
          descuentoCertificado: 9,
          certificadoNeto: 81,
          requiereChip: false,
          productoChipId: null,
          precioChip: 0,
          importeTotal: 81,
        }}
        maestrosPago={{ tarjetas: [] } as any}
        tipoComprobante="FACTURA"
        condicionPago="CONTADO"
        onCondicionPagoChange={() => undefined}
        fechaInicioCredito="2026-11-02"
        fechaVencimientoCredito="2026-12-02"
        onFechaInicioCreditoChange={() => undefined}
        onFechaVencimientoCreditoChange={() => undefined}
        certificadoId={719}
        descuentoActual={descuentoMock}
        onDescuentoChange={() => undefined}
      />
    );

    expect(html).toContain('DESCUENTO GLP SURCO');
    expect(html).toContain('Tarifa Original');
    expect(html).toContain('S/ 90.00');
    expect(html).not.toContain('Ingresa el código de descuento');
  });

});
