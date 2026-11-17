// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { SolicitudNotaCreditoModal } from './SolicitudNotaCreditoModal';
import { faregasSolicitudesOperacionApi } from '../../services/faregas-solicitudes-operacion.api';
vi.mock('../../services/faregas-solicitudes-operacion.api', () => ({ faregasSolicitudesOperacionApi: { contextoNotaCredito: vi.fn(), crear: vi.fn() } }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe('solicitud de nota de crédito sin permisos fiscales', () => {
 let host: HTMLDivElement; let root: ReturnType<typeof createRoot>;
 beforeEach(() => {host=document.createElement('div');document.body.append(host);root=createRoot(host);vi.clearAllMocks();});
 afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
 it('registra únicamente solicitud pendiente y conserva una clave de idempotencia', async()=>{
  vi.mocked(faregasSolicitudesOperacionApi.contextoNotaCredito).mockResolvedValue({comprobante:{numero:'BTEST-1'},planta:{nombre:'SURCO'}} as never);
  vi.mocked(faregasSolicitudesOperacionApi.crear).mockResolvedValue({ok:true,data:{id:12},creada:true} as never);
  const creada=vi.fn();await act(async()=>root.render(<SolicitudNotaCreditoModal certificadoId={10} onCerrar={()=>{}} onCreada={creada}/>));
  expect(host.textContent).toContain('Solicitar nota de crédito');
  const textarea=host.querySelector('textarea')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(textarea,'Sustento de corrección');textarea.dispatchEvent(new Event('input',{bubbles:true}));});
  // React DOM reconoce el evento change mediante input en textarea.
  const enviar=Array.from(host.querySelectorAll('button')).find(x=>x.textContent==='Registrar solicitud pendiente')!;
  await act(async()=>enviar.click());
  expect(faregasSolicitudesOperacionApi.crear).toHaveBeenCalledWith(expect.objectContaining({certificadoId:10,tipoOperacion:'EMITIR_NOTA_CREDITO',motivo:'Sustento de corrección',datosPropuestos:{motivoCodigo:'01'},idempotenciaClave:expect.any(String)}));
  expect(host.textContent).toContain('pendiente de aprobación');expect(creada).toHaveBeenCalledOnce();
 });
 it('un error de acceso impide enviar',async()=>{
  vi.mocked(faregasSolicitudesOperacionApi.contextoNotaCredito).mockRejectedValue(Error('Sede no autorizada'));
  await act(async()=>root.render(<SolicitudNotaCreditoModal certificadoId={10} onCerrar={()=>{}} onCreada={()=>{}}/>));
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Sede no autorizada');
  expect(Array.from(host.querySelectorAll('button')).find(x=>x.textContent==='Registrar solicitud pendiente')?.disabled).toBe(true);
  expect(faregasSolicitudesOperacionApi.crear).not.toHaveBeenCalled();
 });
});
