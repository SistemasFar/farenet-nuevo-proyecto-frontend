// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import {
  obtenerCamposVehiculoCertificado,
  resolverServicioConformidad,
  CODIGOS_CAMBIO_MOTOR,
  CODIGOS_PESADOS,
  CODIGOS_MODIFICACION_DATOS,
} from './faregas-certificado-campos';

const vehiculoBase = {
  placaNueva: 'CON123',
  clase: 'N2',
  categoria: 'N2',
  modelo: 'CANTER',
  marca: 'MITSUBISHI',
  serieChasis: 'CANTER-SER-1',
  vin: 'CANTER-VIN-1',
  numeroMotor: 'CANTER-MOT-1',
  color: 'BLANCO',
  carroceria: 'FURGON',
  combustible: 'DIESEL',
  potencia: '110 / 2800',
  numeroAsientos: '3',
  numeroPasajeros: '2',
  cilindrada: '2977',
  numeroCilindros: '4',
  longitud: '5.90',
  alto: '2.80',
  ancho: '2.05',
  pesoBruto: '5500',
  pesoNeto: '2800',
  cargaUtil: '2700',
  anioFabricacion: '2022',
  anioModelo: '2022',
  formulaRodante: '4x2',
  numeroEjes: '2',
  numeroRuedas: '6',
  version: '4.9T',
};

const titularBase = [
  {
    tipoTitular: 'PROPIETARIO',
    tipoDocumento: 'RUC',
    numeroDocumento: '20123456789',
    nombreRazonSocial: 'EMPRESA PRUEBA S.A.C.',
    direccion: 'AV. PROPIETARIO 500',
    esPrincipal: true,
  },
];

const facturacionBase = {
  tipoComprobante: 'FACTURA',
  tipoDocumento: 'RUC',
  numeroDocumento: '20123456789',
  razonSocial: 'EMPRESA PRUEBA S.A.C.',
  direccion: 'AV. FACTURACION 500',
  email: 'facturacion@prueba.com',
  telefono: '999888777',
  facturarADuenoPrincipal: true,
};

describe('Conformidad: Layout oficial y reglas por servicio', () => {
  it('1. CAMPOS_CONFORMIDAD contiene exactamente 13 filas paralelas en dos columnas siguiendo el Word', () => {
    const campos = obtenerCamposVehiculoCertificado('CONFORMIDAD');
    expect(campos).toHaveLength(26);

    const izq = campos.filter((c) => c.columnaCertificado === 'izquierda');
    const der = campos.filter((c) => c.columnaCertificado === 'derecha');
    expect(izq).toHaveLength(13);
    expect(der).toHaveLength(13);

    // Fila 1: Placa de rodaje / Clase
    expect(izq[0].campo).toBe('placaNueva');
    expect(izq[0].etiqueta).toBe('PLACA DE RODAJE');
    expect(izq[0].automatico).toBe(true);
    expect(der[0].campo).toBe('clase');
    expect(der[0].etiqueta).toBe('CLASE');

    // Fila 2: Categoría / Altura (metros)
    expect(izq[1].campo).toBe('categoria');
    expect(der[1].campo).toBe('alto');
    expect(der[1].etiqueta).toBe('ALTURA (METROS)');

    // Fila 3: Modelo / Ancho (metros)
    expect(izq[2].campo).toBe('modelo');
    expect(der[2].campo).toBe('ancho');
    expect(der[2].etiqueta).toBe('ANCHO (METROS)');

    // Fila 4: Marca / Peso bruto (kg)
    expect(izq[3].campo).toBe('marca');
    expect(der[3].campo).toBe('pesoBruto');
    expect(der[3].etiqueta).toBe('PESO BRUTO (KG)');

    // Fila 5: Serie / Chasis / Peso neto (kg)
    expect(izq[4].campo).toBe('serieChasis');
    expect(izq[4].etiqueta).toBe('SERIE / CHASIS');
    expect(der[4].campo).toBe('pesoNeto');
    expect(der[4].etiqueta).toBe('PESO NETO (KG)');

    // Fila 6: Motor / Carga útil (kg)
    expect(izq[5].campo).toBe('numeroMotor');
    expect(izq[5].etiqueta).toBe('MOTOR');
    expect(der[5].campo).toBe('cargaUtil');
    expect(der[5].etiqueta).toBe('CARGA ÚTIL (KG)');

    // Fila 7: Color / Año de fabricación
    expect(izq[6].campo).toBe('color');
    expect(der[6].campo).toBe('anioFabricacion');

    // Fila 8: Carrocería / Año de modelo
    expect(izq[7].campo).toBe('carroceria');
    expect(der[7].campo).toBe('anioModelo');

    // Fila 9: Combustible / Fórmula rodante
    expect(izq[8].campo).toBe('combustible');
    expect(der[8].campo).toBe('formulaRodante');

    // Fila 10: Potencia / N° Ejes
    expect(izq[9].campo).toBe('potencia');
    expect(der[9].campo).toBe('numeroEjes');

    // Fila 11: Asientos / Pasajeros / N° Ruedas
    expect(izq[10].tipo).toBe('grupo');
    expect(izq[10].etiqueta).toBe('ASIENTOS / PASAJEROS');
    expect(izq[10].separador).toBe('/');
    expect(izq[10].campos?.map((s) => s.campo)).toEqual(['numeroAsientos', 'numeroPasajeros']);
    expect(der[10].campo).toBe('numeroRuedas');

    // Fila 12: Cilindrada / Cilindros / Versión
    expect(izq[11].tipo).toBe('grupo');
    expect(izq[11].etiqueta).toBe('CILINDRADA (CC) / CILINDROS');
    expect(izq[11].separador).toBe('/');
    expect(izq[11].campos?.map((s) => s.campo)).toEqual(['cilindrada', 'numeroCilindros']);
    expect(der[11].campo).toBe('version');

    // Fila 13: Longitud / VIN
    expect(izq[12].campo).toBe('longitud');
    expect(der[12].campo).toBe('vin');
    expect(der[12].etiqueta).toBe('VIN');
  });

  it('2. resolverServicioConformidad: Cambio de Motor fija CAMBIO DE MOTOR y tipo MODIFICACION', () => {
    const resPorNombre = resolverServicioConformidad(undefined, 'CERTIFICADO DE CONFORMIDAD DE CAMBIO DE MOTOR');
    expect(resPorNombre.esCambioDeMotor).toBe(true);
    expect(resPorNombre.caracteristicaFija).toBe('CAMBIO DE MOTOR');
    expect(resPorNombre.tipoTrabajoSugerido).toBe('MODIFICACION');
    expect(resPorNombre.usoOriginalSugerido).toBe('PERSONAS');

    for (const cod of CODIGOS_CAMBIO_MOTOR) {
      const res = resolverServicioConformidad(cod, '');
      expect(res.esCambioDeMotor).toBe(true);
      expect(res.caracteristicaFija).toBe('CAMBIO DE MOTOR');
    }
  });

  it('3. resolverServicioConformidad: Pesados es variable y NO hereda CAMBIO DE MOTOR', () => {
    const resPorNombre = resolverServicioConformidad(undefined, 'CERTIFICADO DE CONFORMIDAD DE PESADOS');
    expect(resPorNombre.esCambioDeMotor).toBe(false);
    expect(resPorNombre.esPesados).toBe(true);
    expect(resPorNombre.caracteristicaFija).toBeNull();

    for (const cod of CODIGOS_PESADOS) {
      const res = resolverServicioConformidad(cod, '');
      expect(res.esCambioDeMotor).toBe(false);
      expect(res.caracteristicaFija).toBeNull();
    }
  });

  it('4. resolverServicioConformidad: Modificación de Datos es variable y NO hereda CAMBIO DE MOTOR', () => {
    const resPorNombre = resolverServicioConformidad(undefined, 'CERTIFICADO DE CONFORMIDAD MODIFICACION DE DATOS');
    expect(resPorNombre.esCambioDeMotor).toBe(false);
    expect(resPorNombre.esModificacionDatos).toBe(true);
    expect(resPorNombre.caracteristicaFija).toBeNull();

    for (const cod of CODIGOS_MODIFICACION_DATOS) {
      const res = resolverServicioConformidad(cod, '');
      expect(res.esCambioDeMotor).toBe(false);
      expect(res.caracteristicaFija).toBeNull();
    }
  });

  it('5. Render VehiculoStep en CAMBIO DE MOTOR: propietario sin dirección, facturación una sola vez y característica editable', () => {
    const html = renderToStaticMarkup(
      <VehiculoStep
        tipoCertificado="CONFORMIDAD"
        modalidadCertificado=""
        servicioCodigo="0046"
        servicioNombre="CERTIFICADO DE CONFORMIDAD DE CAMBIO DE MOTOR"
        formVehiculo={vehiculoBase}
        setFormVehiculo={() => undefined}
        formPropietario={{}}
        setFormPropietario={() => undefined}
        formGlp={{}}
        setFormGlp={() => undefined}
        formGnv={{}}
        setFormGnv={() => undefined}
        formConformidad={{
          tipoConformidad: 'MODIFICACION',
          caracteristicaRegistrable: 'CAMBIO DE MOTOR',
          usoOriginalVehiculo: 'PERSONAS',
        }}
        setFormConformidad={() => undefined}
        titulares={titularBase as any}
        setTitulares={() => undefined}
        formFacturacion={facturacionBase as any}
        setFormFacturacion={() => undefined}
        categoriaVehicular="N2"
        categoriasVehiculares={[]}
        onCategoriaVehicularChange={() => undefined}
      />
    );

    // El bloque propietario conserva el nombre, pero ya no solicita su dirección.
    expect(html).toContain('data-seccion-conformidad="propietario"');
    expect(html).toContain('EMPRESA PRUEBA S.A.C.');
    expect(html).not.toContain('AV. PROPIETARIO 500');

    // Facturación debajo de propietario (aparece una sola vez)
    expect(html).toContain('data-seccion-conformidad="facturacion"');
    const conteoFacturacion = (html.match(/data-seccion-conformidad="facturacion"/g) || []).length;
    expect(conteoFacturacion).toBe(1);

    // Layout dos columnas con 13 filas
    expect(html).toContain('data-layout-certificado="dos-columnas"');
    expect(html).toContain('data-fila-certificado="1"');
    expect(html).toContain('data-fila-certificado="13"');

    // Placa y clase
    expect(html).toContain('PLACA DE RODAJE');
    expect(html).toContain('CLASE');

    // Sección B específica
    expect(html).toContain('data-seccion-conformidad="especifica"');
    expect((html.match(/B\. INFORMACIÓN ESPECÍFICA: CONFORMIDAD/g) || [])).toHaveLength(1);
        expect(html).not.toContain('Tipo de trabajo realizado');
    expect(html).not.toContain('data-seccion-conformidad="tipo-trabajo"');
    expect(html).toContain('1. Rectificación de características registrables');
    expect(html).not.toContain('2. Rectificación de características registrables');

    // La característica sugerida por el servicio queda editable.
    expect(html).not.toContain('data-caracteristica-fija="true"');
    expect(html).toContain('aria-label="Característica registrable"');
    expect(html).toContain('value="CAMBIO DE MOTOR"');

    // Uso original
    expect(html).toContain('USO ORIGINAL DEL VEHÍCULO');
    expect(html).toContain('PERSONAS');
    expect(html).toContain('MERCANCÍAS');
    expect(html).not.toContain('MIXTO');
    expect(html).not.toContain('OTRO USO');

    // Campos sobrantes eliminados NO deben aparecer
    expect(html).not.toContain('Trámite solicitado');
    expect(html).not.toContain('Motivo de solicitud');
    expect(html).not.toContain('Descripción complementaria');
  });

  it('6. Render VehiculoStep en PESADOS: característica es texto libre y conserva slash y guion', () => {
    const html = renderToStaticMarkup(
      <VehiculoStep
        tipoCertificado="CONFORMIDAD"
        modalidadCertificado=""
        servicioCodigo="0087"
        servicioNombre="CERTIFICADO DE CONFORMIDAD DE PESADOS"
        formVehiculo={vehiculoBase}
        setFormVehiculo={() => undefined}
        formPropietario={{}}
        setFormPropietario={() => undefined}
        formGlp={{}}
        setFormGlp={() => undefined}
        formGnv={{}}
        setFormGnv={() => undefined}
        formConformidad={{
          tipoConformidad: 'MODIFICACION',
          caracteristicaRegistrable: 'RECTIFICACIÓN DE COLOR / MODELO-1',
          usoOriginalVehiculo: 'MERCANCÍAS',
        }}
        setFormConformidad={() => undefined}
        titulares={titularBase as any}
        setTitulares={() => undefined}
        formFacturacion={facturacionBase as any}
        setFormFacturacion={() => undefined}
        categoriaVehicular="N2"
        categoriasVehiculares={[]}
        onCategoriaVehicularChange={() => undefined}
      />
    );

    expect(html).not.toContain('data-caracteristica-fija="true"');
    expect(html).not.toContain('aria-label="Selector de característica registrable"');
    expect(html).toContain('aria-label="Característica registrable"');
    expect(html).toContain('value="RECTIFICACIÓN DE COLOR / MODELO-1"');
  });

  it('7. Render VehiculoStep en MODIFICACIÓN DE DATOS: muestra entrada libre sin catálogo obligatorio', () => {
    const html = renderToStaticMarkup(
      <VehiculoStep
        tipoCertificado="CONFORMIDAD"
        modalidadCertificado=""
        servicioCodigo="0085"
        servicioNombre="CERTIFICADO DE CONFORMIDAD MODIFICACION DE DATOS"
        formVehiculo={vehiculoBase}
        setFormVehiculo={() => undefined}
        formPropietario={{}}
        setFormPropietario={() => undefined}
        formGlp={{}}
        setFormGlp={() => undefined}
        formGnv={{}}
        setFormGnv={() => undefined}
        formConformidad={{
          tipoConformidad: 'MODIFICACION',
          caracteristicaRegistrable: '',
          usoOriginalVehiculo: 'PERSONAS',
        }}
        setFormConformidad={() => undefined}
        titulares={titularBase as any}
        setTitulares={() => undefined}
        formFacturacion={facturacionBase as any}
        setFormFacturacion={() => undefined}
        categoriaVehicular="M1"
        categoriasVehiculares={[]}
        onCategoriaVehicularChange={() => undefined}
      />
    );

    expect(html).not.toContain('data-caracteristica-fija="true"');
    expect(html).not.toContain('aria-label="Selector de característica registrable"');
    expect(html).toContain('aria-label="Característica registrable"');
    expect(html).toContain('placeholder="Ej. RECTIFICACIÓN DE COLOR / MODELO"');
  });

  it('8. Presenta sin recortar los caracteres técnicos admitidos en Conformidad', () => {
    const html = renderToStaticMarkup(
      <VehiculoStep
        tipoCertificado="CONFORMIDAD"
        modalidadCertificado=""
        servicioCodigo="0085"
        servicioNombre="CERTIFICADO DE CONFORMIDAD MODIFICACION DE DATOS"
        formVehiculo={{
          ...vehiculoBase,
          modelo: 'ACCENT-GL',
          version: 'GL-1.6/AT',
          numeroMotor: 'ABC-123/456',
          potencia: '75 kW @ 4500 RPM',
          cilindrada: '0.8',
          vin: 'KMHCT41BAGU99****',
        }}
        setFormVehiculo={() => undefined}
        formPropietario={{}}
        setFormPropietario={() => undefined}
        formGlp={{}}
        setFormGlp={() => undefined}
        formGnv={{}}
        setFormGnv={() => undefined}
        formConformidad={{
          tipoConformidad: 'MODIFICACION',
          caracteristicaRegistrable: 'MOTOR / SERIE-1',
          usoOriginalVehiculo: 'PERSONAS',
        }}
        setFormConformidad={() => undefined}
        titulares={titularBase as any}
        setTitulares={() => undefined}
        formFacturacion={facturacionBase as any}
        setFormFacturacion={() => undefined}
        categoriaVehicular="M1"
        categoriasVehiculares={[]}
        onCategoriaVehicularChange={() => undefined}
      />
    );

    expect(html).toContain('value="ACCENT-GL"');
    expect(html).toContain('value="GL-1.6/AT"');
    expect(html).toContain('value="ABC-123/456"');
    expect(html).toContain('value="75 kW @ 4500 RPM"');
    expect(html).toContain('value="0.8"');
    expect(html).toContain('value="KMHCT41BAGU99****"');
  });

  it('9. Conserva e informa un uso histórico no permitido sin ofrecerlo como opción', () => {
    const html = renderToStaticMarkup(
      <VehiculoStep
        tipoCertificado="CONFORMIDAD"
        modalidadCertificado=""
        formVehiculo={vehiculoBase}
        setFormVehiculo={() => undefined}
        formPropietario={{}}
        setFormPropietario={() => undefined}
        formGlp={{}}
        setFormGlp={() => undefined}
        formGnv={{}}
        setFormGnv={() => undefined}
        formConformidad={{
          tipoConformidad: 'MODIFICACION',
          caracteristicaRegistrable: 'CAMBIO DE MOTOR',
          usoOriginalVehiculo: 'MIXTO',
        }}
        setFormConformidad={() => undefined}
        titulares={titularBase as any}
        setTitulares={() => undefined}
        formFacturacion={facturacionBase as any}
        setFormFacturacion={() => undefined}
        categoriaVehicular="M1"
        categoriasVehiculares={[]}
        onCategoriaVehicularChange={() => undefined}
      />
    );

    expect(html).toContain('El borrador conserva el valor anterior “MIXTO”');
    expect(html).not.toContain('<option value="MIXTO"');
    expect(html).not.toContain('OTRO USO');
  });
});
