import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { obtenerCamposVehiculoCertificado } from './faregas-certificado-campos';

const verificaciones = Array.from({ length: 8 }, (_, indice) => ({
  codigo: String.fromCharCode(97 + indice),
  descripcion: `VERIFICACIÓN GNV ${indice + 1}`,
  cumple: true,
  observacion: '',
}));

const renderGnvAnual = () => renderToStaticMarkup(
  <VehiculoStep
    tipoCertificado="GNV_ANUAL"
    modalidadCertificado="ANUAL"
    formVehiculo={{
      placaNueva: 'ABC123', categoria: 'M1', marca: 'HYUNDAI', modelo: 'ACCENT',
      version: 'GL', anioFabricacion: '2015', vin: 'VIN123456789', numeroMotor: 'MOTOR123',
      numeroCilindros: '4', cilindrada: '1368', combustible: 'BI-COMBUSTIBLE GNV',
      numeroEjes: '2', numeroRuedas: '4', numeroAsientos: '5', numeroPasajeros: '4',
      longitud: '4.37', ancho: '1.70', alto: '1.457', color: 'PLATA METALIZADO',
      pesoNeto: '1095', pesoBruto: '1560',
    }}
    setFormVehiculo={() => undefined}
    formPropietario={{}}
    setFormPropietario={() => undefined}
    formGlp={{}}
    setFormGlp={() => undefined}
    formGnv={{ fechaVigencia: '2027-10-13', observaciones: 'NINGUNA', verificaciones }}
    setFormGnv={() => undefined}
    formConformidad={{}}
    setFormConformidad={() => undefined}
    titulares={[]}
    setTitulares={() => undefined}
    formFacturacion={{
      tipoDocFac: 'BOLETA', tipoDocumentoFac: 'DNI', nroDocFac: '74045612',
      razonSocialFac: 'CLIENTE FACTURACIÓN', direccionFac: 'AV. PRUEBA 123',
      emailFac: 'prueba@faregas.pe', telefonoFac: '999888777', usarTitularPrincipalFac: false,
    }}
    setFormFacturacion={() => undefined}
    catalogoVerificaciones={{}}
    categoriaVehicular="M1"
    categoriasVehiculares={[{ key: 'M1', nombre: 'M1' }]}
    onCategoriaVehicularChange={() => undefined}
  />
);

describe('formulario GNV ANUAL alineado al certificado oficial', () => {
  it('distribuye exactamente 1–8 a la izquierda y 9–16 a la derecha', () => {
    const campos = obtenerCamposVehiculoCertificado('GNV_ANUAL', 'ANUAL');
    const izquierda = campos.filter((campo) => campo.columnaCertificado === 'izquierda');
    const derecha = campos.filter((campo) => campo.columnaCertificado === 'derecha');

    expect(izquierda.map((campo) => campo.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(derecha.map((campo) => campo.numero)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(derecha.filter((campo) => campo.tipo === 'grupo').map((campo) => campo.campo))
      .toEqual(['numeroCilindros', 'numeroEjes', 'numeroAsientos', 'longitud']);
    expect(campos.find((campo) => campo.numero === 10)).toMatchObject({
      campo: 'combustible',
      automatico: true,
      valorAutomatico: 'BI-COMBUSTIBLE GNV',
    });
    expect(campos.map((campo) => campo.campo)).not.toContain('cargaUtil');
  });

  it('mantiene facturación arriba, no muestra propietario y conserva el orden anual', () => {
    const html = renderGnvAnual();
    const facturacion = html.indexOf('data-seccion-gnv="facturacion"');
    const vehiculo = html.indexOf('data-layout-certificado="dos-columnas"');
    const informacion = html.indexOf('data-seccion-gnv="informacion-especifica"');
    const verificacionesIndex = html.indexOf('data-seccion-gnv="verificaciones"');
    const vigencia = html.indexOf('data-seccion-gnv="vigencia"');
    const observaciones = html.indexOf('data-seccion-gnv="observaciones"');

    expect(html).toContain('A. DATOS DEL VEHÍCULO');
    expect(html).not.toContain('data-propietario-certificado="true"');
    expect(facturacion).toBeGreaterThan(-1);
    expect(vehiculo).toBeGreaterThan(facturacion);
    expect(informacion).toBeGreaterThan(vehiculo);
    expect(verificacionesIndex).toBeGreaterThan(informacion);
    expect(vigencia).toBeGreaterThan(verificacionesIndex);
    expect(observaciones).toBeGreaterThan(vigencia);
    expect(html).toContain('✓ MARCAR LOS 8 COMO CUMPLE');
    expect(html).toContain('BI-COMBUSTIBLE GNV');
  });
});
