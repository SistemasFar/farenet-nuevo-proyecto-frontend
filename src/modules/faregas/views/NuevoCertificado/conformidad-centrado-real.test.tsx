// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PrevisualizacionCertificadoStep } from './components/NuevoCertificado/PrevisualizacionCertificadoStep';
import { VerificacionStep, PreviewCertificadoCompacto } from './components/NuevoCertificado/VerificacionStep';
import { asegurarCentradoHtml } from '../../services/faregas-comprobante-visor.service';

describe('FAREGAS — Verificación de Centrado y Ausencia de ReferenceError', () => {
  const mockBorradorHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Certificado de Conformidad - Previsualización</title>
    <style>
        @page { size: A4 portrait; margin: 0; }
        html { width: 210mm; min-height: 297mm; background: #fff; }
        body { font-family: Arial; margin: 0; padding: 107.45pt 56.65pt 70.9pt 84.75pt; width: 210mm; min-height: 297mm; box-sizing: border-box; }
        @media screen {
            html { width: 100% !important; min-height: 100% !important; }
            body { margin-left: auto !important; margin-right: auto !important; }
        }
    </style>
</head>
<body>
    <div class="documento-certificado">
        <h1>BORRADOR CONFORMIDAD TEST</h1>
        <p>PLACA: ABC-123</p>
    </div>
</body>
</html>`;

  // Simulación fiel del snapshot guardado en PostgreSQL para el certificado DG-39-000428 (ID 768)
  const snapshotRealCertificado768 = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Certificado de Conformidad - Previsualización</title>
    <style>
        @page { size: A4 portrait; margin: 0; }
        html {
            width: 210mm;
            min-height: 297mm;
            background: #fff;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            color: #000;
            line-height: 12pt;
            margin: 0;
            padding: 107.45pt 56.65pt 70.9pt 84.75pt;
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            background-color: #fff;
            position: relative;
        }
    </style>
</head>
<body>
    <div class="documento-certificado">
        <h2>DG-39-000428</h2>
        <p>CONFORMIDAD - MODIFICACIÓN DE DATOS</p>
    </div>
</body>
</html>`;

  it('1. asegurarCentradoHtml normaliza el snapshot histórico del certificado 768 sin romper @page', () => {
    const htmlResultado = asegurarCentradoHtml(snapshotRealCertificado768);

    expect(htmlResultado).toContain('@media screen');
    expect(htmlResultado).toContain('margin-left: auto !important');
    expect(htmlResultado).toContain('margin-right: auto !important');
    expect(htmlResultado).toContain('width: 100% !important');
    expect(htmlResultado).toContain('@page { size: A4 portrait; margin: 0; }');
    expect(htmlResultado).toContain('DG-39-000428');
  });

  it('2. PreviewCertificadoCompacto renderiza el certificado definitivo 768 con htmlCentrado en srcDoc sin ReferenceError', () => {
    let markup = '';
    expect(() => {
      markup = renderToStaticMarkup(
        <PreviewCertificadoCompacto
          html={snapshotRealCertificado768}
          loading={false}
          error=""
          frameRef={{ current: null }}
          onPrint={() => {}}
          onDownload={() => {}}
          mostrarImprimir={true}
          downloading={false}
          emitted={true}
        />
      );
    }).not.toThrow();

    expect(markup).toContain('Documento definitivo');
    expect(markup).toContain('<iframe');
    // Verifica que el iframe contiene el html normalizado con la regla de centrado
    expect(markup).toContain('faregas-preview-centrado');
    expect(markup).toContain('margin-left: auto !important');
    expect(markup).toContain('margin-right: auto !important');
    expect(markup).toContain('DG-39-000428');
  });

  it('3. PreviewCertificadoCompacto renderiza el borrador de conformidad con htmlCentrado en srcDoc', () => {
    let markup = '';
    expect(() => {
      markup = renderToStaticMarkup(
        <PreviewCertificadoCompacto
          html={mockBorradorHtml}
          loading={false}
          error=""
          frameRef={{ current: null }}
          onPrint={() => {}}
          onDownload={() => {}}
          mostrarImprimir={false}
          downloading={false}
          emitted={false}
        />
      );
    }).not.toThrow();

    expect(markup).toContain('Previsualización del certificado');
    expect(markup).toContain('<iframe');
    expect(markup).toContain('margin-left: auto !important');
    expect(markup).toContain('margin-right: auto !important');
    expect(markup).toContain('BORRADOR CONFORMIDAD TEST');
  });

  it('4. VerificacionStep monta sin lanzar ReferenceError htmlCentrado', () => {
    let markup = '';
    expect(() => {
      markup = renderToStaticMarkup(
        <VerificacionStep
          certificadoId={768}
          certificadoEstado="EMITIDO"
          soloLectura={true}
          tipoCertificado="CONFORMIDAD"
          formCaja={{} as any}
          formVehiculo={{} as any}
          formPropietario={{} as any}
          formGlp={{} as any}
          formGnv={{} as any}
          formConformidad={{ tipoConformidad: 'MODIFICACION' } as any}
          pagosAgregados={[]}
          formFacturacion={{} as any}
          facturacion={null}
          mostrarAcciones={false}
          mostrarEncabezado={true}
        />
      );
    }).not.toThrow();

    expect(markup).toBeTruthy();
  });

  it('5. PrevisualizacionCertificadoStep monta sin lanzar ReferenceError htmlCentrado', () => {
    let markup = '';
    expect(() => {
      markup = renderToStaticMarkup(
        <PrevisualizacionCertificadoStep
          certificadoId={768}
          modoRectificacion={false}
        />
      );
    }).not.toThrow();

    expect(markup).toBeTruthy();
  });
});
