import { useState } from 'react';

import { useEmpresa } from '@/context/EmpresaContext';
import { plantaSession } from '@/services/api';
import type { EmpresaAsignada } from '@/types/auth';

import bgFarenet from '@/assets/images/farenet1.png';

// Configuración visual local
const EMPRESA_THEME: Record<string, { colorPrincipal: string; colorHover: string }> = {
  FARENET: {
    colorPrincipal: '#052A79',
    colorHover: '#031b4e'
  },
  FAREGAS: {
    colorPrincipal: '#0284c7', // Azul claro genérico para diferenciar
    colorHover: '#0369a1'
  }
};

interface SeleccionEmpresaViewProps {
  onLogout: () => void;
  onSelect: (empresa: EmpresaAsignada) => void;
}

export function SeleccionEmpresaView({ onLogout, onSelect }: SeleccionEmpresaViewProps) {
  const { empresasDisponibles, seleccionarEmpresa } = useEmpresa();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectEmpresa = (empresa: EmpresaAsignada) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Limpiar planta previa para forzar el selector
      plantaSession.limpiar();
      sessionStorage.removeItem('plantaSeleccionada'); // Por si acaso

      // 2. Guardar empresa seleccionada
      seleccionarEmpresa(empresa);

      // 3. Informar éxito al componente padre (App) para que cambie la ruta
      onSelect(empresa);
    } catch (err) {
      setError('Ocurrió un error al seleccionar la empresa.');
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4 select-none bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${bgFarenet})` }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

      <div className="absolute top-5 right-5 z-20">
        <button 
          onClick={onLogout}
          className="text-sm text-white/80 hover:text-white font-semibold uppercase tracking-wider transition"
        >
          Cerrar Sesión
        </button>
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center relative z-10">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Selecciona tu Empresa
          </h1>
          <p className="mt-1 text-lg font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Tienes acceso a múltiples espacios de trabajo
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-500/20 backdrop-blur-sm p-3 text-center border-l-4 border-red-500 w-full">
            <p className="text-sm font-semibold text-red-200">
              {error}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {empresasDisponibles.map((empresa) => {
            const theme = EMPRESA_THEME[empresa.key] || { colorPrincipal: '#475569', colorHover: '#334155' };
            
            return (
              <button
                key={empresa.key}
                disabled={loading}
                onClick={() => handleSelectEmpresa(empresa)}
                className="group flex flex-col items-center justify-center p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:bg-white/20 transition-all duration-300 border border-white/20 disabled:opacity-50 relative overflow-hidden"
              >
                {empresa.logoUrl ? (
                  <img src={empresa.logoUrl} alt={empresa.nombre} className="h-16 object-contain mb-4" />
                ) : (
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg transition-colors duration-300"
                    style={{ backgroundColor: theme.colorPrincipal }}
                  >
                    {empresa.nombre.charAt(0)}
                  </div>
                )}
                
                <h2 className="text-2xl font-black tracking-tight text-gold-3d font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] uppercase text-center mt-5">
                  {empresa.nombre}
                </h2>
                <span className="text-xs text-white/80 font-bold mt-1 tracking-wider">
                  CÓDIGO: {empresa.key}
                </span>

                <div 
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gold-3d py-3 text-white text-sm font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </div>
              </button>
            );
          })}
        </div>

        {empresasDisponibles.length === 0 && (
          <div className="text-center p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20 w-full">
            <p className="text-white/80 font-bold">No se encontraron empresas autorizadas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
