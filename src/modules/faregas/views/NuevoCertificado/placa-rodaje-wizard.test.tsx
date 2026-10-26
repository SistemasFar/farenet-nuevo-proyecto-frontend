// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CamposVehiculoCertificado } from './components/NuevoCertificado/CamposVehiculoCertificado';
import { obtenerCamposVehiculoCertificado } from './faregas-certificado-campos';

const valorPlacaRenderizado = (placaRodaje: string, placaTecnica: string) => {
  const html = renderToStaticMarkup(
    <CamposVehiculoCertificado
      campos={obtenerCamposVehiculoCertificado('GLP_ANUAL', 'INICIAL')}
      formVehiculo={{ placaNueva: placaTecnica }}
      placaRodaje={placaRodaje}
      onChange={() => undefined}
      categoriaVehicular=""
      categoriasVehiculares={[]}
      onCategoriaVehicularChange={() => undefined}
      erroresCampo={{}}
      obligatorios={new Set()}
    />
  );
  const contenedor = document.createElement('div');
  contenedor.innerHTML = html;
  return contenedor.querySelector('[data-campo-certificado="placaNueva"]')?.textContent?.trim() || '';
};

describe('Placa de rodaje del wizard', () => {
  it('muestra la placa de Datos Iniciales aunque el formulario técnico aún no tenga datos', () => {
    const contenido = valorPlacaRenderizado('DDD111', '');

    expect(contenido).toContain('DDD111');
    expect(contenido).not.toContain('PENDIENTE');
  });

  it('no permite que un valor técnico anterior reemplace la placa válida', () => {
    const contenido = valorPlacaRenderizado('DDD111', 'OLD999');

    expect(contenido).toContain('DDD111');
    expect(contenido).not.toContain('OLD999');
  });

  it('conserva una placa técnica válida cuando la fuente principal todavía está vacía', () => {
    const contenido = valorPlacaRenderizado('', 'DDD111');

    expect(contenido).toContain('DDD111');
    expect(contenido).not.toContain('PENDIENTE');
  });
});
