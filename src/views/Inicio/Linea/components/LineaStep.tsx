import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle, Eye, Settings, RefreshCw, X } from 'lucide-react';

interface LineaStepProps {
  nroInspeccion: string;
  estadoLinea: any;
  onRefresh: () => void;
}

const NOMBRES_MAQUINA: Record<string, string> = {
  '1': 'Alineación',
  '2': 'Suspensión',
  '3': 'Frenómetro',
  '4': 'Analizador de Gases',
  '5': 'Opacímetro',
  '6': 'Sonómetro',
  '7': 'Luxómetro',
  '9': 'Inspección Visual',
  '10': 'Profundímetro',
  '11': 'Foto Gases',
  '12': 'Foto Luces',
  '13': 'Foto Frenos',
  '15': 'Foto Frenos',
};

const getTipo = (item: any) => String(
  item?.tipomaquina_key ??
  item?.tipo_maquina_key ??
  item?.tipoMaquinaKey ??
  item?.tipomaquina?.key ??
  ''
).trim();

const parseData = (data: any) => {
  if (!data) return {};
  if (typeof data === 'object') return data;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return {}; }
  }
  return {};
};

const extraerFotoRaw = (item: any) => {
  const dataObj = parseData(item?.data);
  return (
    dataObj?.foto ??
    dataObj?.Foto ??
    dataObj?.imagen ??
    dataObj?.image ??
    dataObj?.base64 ??
    item?.foto ??
    null
  );
};

const hexToBase64 = (hex: string) => {
  const clean = hex.replace(/^\\x/i, '').trim();
  const bytes = new Uint8Array(clean.length / 2);

  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }

  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

const normalizarFoto = (foto: any) => {
  if (!foto || typeof foto !== 'string') return null;

  const clean = foto.trim();

  if (clean.startsWith('data:image')) return clean;
  if (clean.startsWith('/9j/')) return `data:image/jpeg;base64,${clean}`;
  if (clean.startsWith('iVBOR')) return `data:image/png;base64,${clean}`;

  const hex = clean.replace(/^\\x/i, '').toLowerCase();

  if (/^[0-9a-f]+$/.test(hex) && hex.startsWith('ffd8')) {
    return `data:image/jpeg;base64,${hexToBase64(hex)}`;
  }

  return null;
};

export function LineaStep({ nroInspeccion, estadoLinea, onRefresh }: LineaStepProps) {
  const [modalFoto, setModalFoto] = useState<{ open: boolean, src: string, titulo: string }>({ open: false, src: '', titulo: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentChangeTipo, setCurrentChangeTipo] = useState('');
  const [esSistemas, setEsSistemas] = useState(false);

  React.useEffect(() => {
    try {
      const ustr = sessionStorage.getItem('user');
      if (ustr) {
        const parsed = JSON.parse(ustr);
        const perfil = String(parsed.perfilId || parsed.perfil || parsed.perfilUsuario || '').toLowerCase();
        setEsSistemas(
          perfil.includes('sistema') ||
          perfil.includes('admin') ||
          perfil.includes('desarrollador')
        );
      }
    } catch { }
  }, []);

  const handleCambiarClick = (titulo: string) => {
    if (!esSistemas) return;
    let tipo = 'FRENOS';
    if (titulo === 'Gases') tipo = 'GASES';
    if (titulo === 'Luces') tipo = 'LUCES';
    setCurrentChangeTipo(tipo);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipoFoto', currentChangeTipo);
      
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/linea/foto/${nroInspeccion}/cambiar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Error al cambiar foto');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error interno');
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReiniciarFoto = async (titulo: string) => {
    if (!esSistemas) return;
    if (!window.confirm(`¿Está seguro de reiniciar la foto de ${titulo}?`)) return;
    
    let tipo = 'FRENOS';
    if (titulo === 'Gases') tipo = 'GASES';
    if (titulo === 'Luces') tipo = 'LUCES';
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/linea/foto/${nroInspeccion}/reiniciar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoFoto: tipo })
      });
      if (!res.ok) throw new Error('Error al reiniciar foto');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error interno');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReiniciarPrueba = async (item: any) => {
    if (!esSistemas) return;
    if (!item.id) {
      alert("La prueba no tiene un ID de resultado válido para reiniciar.");
      return;
    }
    if (!window.confirm(`¿Está seguro de reiniciar esta prueba?`)) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/linea/prueba/${nroInspeccion}/reiniciar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resultadoMaquinaId: item.id,
          tipoMaquinaKey: getTipo(item)
        })
      });
      if (!res.ok) throw new Error('Error al reiniciar prueba');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error interno');
    } finally {
      setIsSubmitting(false);
    }
  };

  const source = estadoLinea?.linea?.recibidas ? estadoLinea.linea : estadoLinea;
  const faltantes = source?.faltantes || [];
  const noAplicables = source?.noAplicables || [];
  const obligatorias = source?.obligatorias || [];

  // 1. Fuente unica
  const todosResultadosRaw = [
    ...(estadoLinea?.resultadosMaquinaRaw || []),
    ...(estadoLinea?.linea?.recibidas || []),
    ...(estadoLinea?.linea?.resultadosMaquina || []),
    ...(estadoLinea?.resultadosMaquina || []),
  ];

  // Eliminar duplicados
  const mapUnique = new Map();
  todosResultadosRaw.forEach((r: any) => {
    const key = `${r.id || ''}-${getTipo(r)}`;
    if (!mapUnique.has(key)) mapUnique.set(key, r);
  });
  const todosResultados = Array.from(mapUnique.values());

  const recibidas = todosResultados;

  const TIPOS_FOTO = new Set(['11', '12', '13', '15']);
  const TIPOS_PRUEBA = new Set(['1', '2', '3', '4', '5', '6', '7', '9', '10']);

  const esFoto = (item: any) => TIPOS_FOTO.has(getTipo(item));
  const esPrueba = (item: any) => TIPOS_PRUEBA.has(getTipo(item));

  const resultadosPruebas = recibidas.filter(esPrueba);

  const aprobados = resultadosPruebas.filter((p: any) => p.resultado === 'A');
  const desaprobados = resultadosPruebas.filter((p: any) => p.resultado === 'D');
  const faltantesNormales = faltantes.filter(esPrueba);

  const obligatoriasPrueba = obligatorias.filter((o: any) => TIPOS_PRUEBA.has(getTipo(o)));

  const totalPruebas = obligatoriasPrueba.length > 0
    ? obligatoriasPrueba.length
    : (aprobados.length + desaprobados.length + faltantesNormales.length);

  const avanceCompletadas = aprobados.length + desaprobados.length;
  
  // En caso de que el total sea 0 (y hay resultadosPruebas sin fallbacks)
  const avanceMostradoTotal = totalPruebas === 0 && resultadosPruebas.length > 0 
    ? resultadosPruebas.length 
    : totalPruebas;

  const buscarFotoPorTipos = (tipos: string[]) => {
    const item = todosResultados.find((r: any) => tipos.includes(getTipo(r)));
    if (!item) return null;
  
    const raw = extraerFotoRaw(item);
    const normalizada = normalizarFoto(raw);
  
    return {
      item,
      raw,
      src: normalizada,
    };
  };

  const fotoGases = buscarFotoPorTipos(['11']);
  const fotoLuces = buscarFotoPorTipos(['12']);
  const fotoFrenos = buscarFotoPorTipos(['13', '15']);

  const renderFotoItem = (titulo: string, dataObj: any) => {
    const isListo = !!dataObj?.src;
    
    return (
      <div className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 text-sm uppercase">{titulo}</span>
          {isListo ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">
              <CheckCircle2 className="w-3 h-3" /> LISTO
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">
              <AlertCircle className="w-3 h-3" /> PENDIENTE
            </span>
          )}
        </div>
        
        <div className="flex gap-2 mt-2">
          <button 
             className={`flex-1 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors ${isListo ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'}`}
             onClick={() => {
                if(isListo) {
                   setModalFoto({ open: true, src: dataObj.src, titulo });
                }
             }}
          >
             <Eye className="w-3 h-3" /> Ver
          </button>
          
          <button 
             className={`flex-1 text-xs font-bold py-1.5 rounded flex justify-center items-center transition-colors ${!esSistemas || isSubmitting ? 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
             onClick={() => handleCambiarClick(titulo)}
             disabled={!esSistemas || isSubmitting}
             title={!esSistemas ? "Solo Sistemas puede cambiar fotos" : ""}
          >
             Cambiar
          </button>
          <button 
             className={`flex-1 text-xs font-bold py-1.5 rounded flex justify-center items-center transition-colors ${!esSistemas || !isListo || isSubmitting ? 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
             onClick={() => isListo && handleReiniciarFoto(titulo)}
             disabled={!esSistemas || !isListo || isSubmitting}
             title={!esSistemas ? "Solo Sistemas puede reiniciar fotos" : ""}
          >
             Reiniciar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans animate-fade-in-up">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">


        
        {/* Panel Superior: Fotos y Resumen */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Eye className="w-5 h-5 text-blue-600" /> Control Visual (Fotos)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {renderFotoItem('Frenos', fotoFrenos)}
              {renderFotoItem('Gases', fotoGases)}
              {renderFotoItem('Luces', fotoLuces)}
            </div>
          </div>
          <div className="w-full md:w-64 bg-slate-800 text-white p-5 rounded-xl shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
             <Settings className="w-24 h-24 absolute -right-4 -bottom-4 text-white opacity-5" />
             <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Avance</span>
             <span className="text-4xl font-black mt-1">{avanceCompletadas} <span className="text-xl text-slate-400 font-medium">/ {avanceMostradoTotal}</span></span>
             <button onClick={onRefresh} className="mt-3 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded flex items-center gap-2 transition-colors">
               <RefreshCw className="w-3 h-3" /> Refrescar
             </button>
          </div>
        </div>

        {/* Tablero Principal: Aprobados, Desaprobados, Faltantes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Aprobados */}
          <div className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-green-50 p-3 border-b border-green-200 flex justify-between items-center">
              <span className="font-bold text-green-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Aprobados</span>
              <span className="bg-green-200 text-green-800 text-xs font-black px-2 py-0.5 rounded-full">{aprobados.length}</span>
            </div>
            <div className="p-4 space-y-2 flex-1 max-h-64 overflow-y-auto">
              {aprobados.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Ninguna prueba aprobada aún</p>}
              {aprobados.map((p: any) => (
                <div key={p.id || getTipo(p)} className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                  <span>{NOMBRES_MAQUINA[getTipo(p)] || p.nombre || p.nombre_prueba || `Tipo ${getTipo(p)}`}</span>
                  <button 
                    className={`text-xs px-2 py-1 rounded disabled:opacity-50 ${!esSistemas ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 text-red-700'}`} 
                    onClick={() => handleReiniciarPrueba(p)}
                    disabled={!esSistemas || isSubmitting}
                    title={!esSistemas ? "Solo Sistemas puede reiniciar pruebas" : ""}
                  >Reiniciar</button>
                </div>
              ))}
            </div>
          </div>

          {/* Desaprobados */}
          <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-red-50 p-3 border-b border-red-200 flex justify-between items-center">
              <span className="font-bold text-red-800 flex items-center gap-2"><XCircle className="w-4 h-4" /> Desaprobados</span>
              <span className="bg-red-200 text-red-800 text-xs font-black px-2 py-0.5 rounded-full">{desaprobados.length}</span>
            </div>
            <div className="p-4 space-y-2 flex-1 max-h-64 overflow-y-auto">
              {desaprobados.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Ninguna prueba desaprobada</p>}
              {desaprobados.map((p: any) => (
                <div key={p.id || getTipo(p)} className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                  <span>{NOMBRES_MAQUINA[getTipo(p)] || p.nombre || p.nombre_prueba || `Tipo ${getTipo(p)}`}</span>
                  <button 
                    className={`text-xs px-2 py-1 rounded disabled:opacity-50 ${!esSistemas ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 text-red-700'}`} 
                    onClick={() => handleReiniciarPrueba(p)}
                    disabled={!esSistemas || isSubmitting}
                    title={!esSistemas ? "Solo Sistemas puede reiniciar pruebas" : ""}
                  >Reiniciar</button>
                </div>
              ))}
            </div>
          </div>

          {/* Faltantes */}
          <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-amber-50 p-3 border-b border-amber-200 flex justify-between items-center">
              <span className="font-bold text-amber-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Faltantes</span>
              <span className="bg-amber-200 text-amber-800 text-xs font-black px-2 py-0.5 rounded-full">{faltantesNormales.length}</span>
            </div>
            <div className="p-4 space-y-2 flex-1 max-h-64 overflow-y-auto">
              {faltantesNormales.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay pruebas faltantes</p>}
              {faltantesNormales.map((p: any) => (
                <div key={getTipo(p)} className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                  <span>{NOMBRES_MAQUINA[getTipo(p)] || p.nombre_prueba || `Tipo ${getTipo(p)}`}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* No Aplicables */}
        {noAplicables.length > 0 && (
          <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex flex-wrap gap-2">
            <span className="text-sm font-bold text-slate-500 mr-2 flex items-center">No Aplica:</span>
            {noAplicables.map((p: any) => (
              <span key={getTipo(p)} className="text-xs bg-white text-slate-400 px-2 py-1 rounded border border-slate-200">{NOMBRES_MAQUINA[getTipo(p)] || p.nombre_prueba || `Tipo ${getTipo(p)}`}</span>
            ))}
          </div>
        )}

      </div>

      {/* Modal Foto */}
      {modalFoto.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                Foto: {modalFoto.titulo}
              </h2>
              <button onClick={() => setModalFoto({ ...modalFoto, open: false })} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex justify-center items-center bg-slate-100">
              <img 
                src={modalFoto.src} 
                alt={`Foto ${modalFoto.titulo}`} 
                className="max-w-full max-h-[60vh] object-contain rounded border border-slate-300 shadow-sm"
                onError={(e: any) => { e.target.src = 'https://via.placeholder.com/800x600?text=Error+cargando+imagen'; }}
              />
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <div className="text-sm text-slate-500 font-medium">
                Inspección: {nroInspeccion}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalFoto({ ...modalFoto, open: false })}
                  className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
