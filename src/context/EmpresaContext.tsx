import React, { createContext, useContext, useState, useEffect } from 'react';
import type { EmpresaAsignada } from '@/types/auth';

interface EmpresaContextProps {
  empresaSeleccionada: EmpresaAsignada | null;
  empresasDisponibles: EmpresaAsignada[];
  seleccionarEmpresa: (empresa: EmpresaAsignada) => void;
  establecerEmpresasDisponibles: (empresas: EmpresaAsignada[]) => void;
  limpiarEmpresa: () => void;
  tieneEmpresaSeleccionada: boolean;
}

const EmpresaContext = createContext<EmpresaContextProps | undefined>(undefined);

export const EmpresaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [empresasDisponibles, setEmpresasDisponiblesState] = useState<EmpresaAsignada[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionadaState] = useState<EmpresaAsignada | null>(null);

  useEffect(() => {
    try {
      const disponiblesRaw = sessionStorage.getItem('empresasDisponibles');
      const seleccionadaRaw = sessionStorage.getItem('empresaSeleccionada');

      let disponibles: EmpresaAsignada[] = [];
      if (disponiblesRaw) {
        disponibles = JSON.parse(disponiblesRaw);
        setEmpresasDisponiblesState(disponibles);
      }

      if (seleccionadaRaw) {
        const seleccionada: EmpresaAsignada = JSON.parse(seleccionadaRaw);
        // Validar que pertenezca a disponibles
        const pertenece = disponibles.some(e => e.key === seleccionada.key);
        if (pertenece) {
          setEmpresaSeleccionadaState(seleccionada);
        } else {
          sessionStorage.removeItem('empresaSeleccionada');
        }
      }
    } catch (error) {
      console.error('Error parseando datos de EmpresaContext', error);
      sessionStorage.removeItem('empresasDisponibles');
      sessionStorage.removeItem('empresaSeleccionada');
    }
  }, []);

  const establecerEmpresasDisponibles = (empresas: EmpresaAsignada[]) => {
    setEmpresasDisponiblesState(empresas);
    sessionStorage.setItem('empresasDisponibles', JSON.stringify(empresas));
    
    // Si la seleccionada actual no está en la nueva lista, limpiarla
    if (empresaSeleccionada) {
      const pertenece = empresas.some(e => e.key === empresaSeleccionada.key);
      if (!pertenece) {
        limpiarEmpresa();
      }
    }
  };

  const seleccionarEmpresa = (empresa: EmpresaAsignada) => {
    setEmpresaSeleccionadaState(empresa);
    sessionStorage.setItem('empresaSeleccionada', JSON.stringify(empresa));
  };

  const limpiarEmpresa = () => {
    setEmpresasDisponiblesState([]);
    setEmpresaSeleccionadaState(null);
    sessionStorage.removeItem('empresasDisponibles');
    sessionStorage.removeItem('empresaSeleccionada');
  };

  return (
    <EmpresaContext.Provider
      value={{
        empresaSeleccionada,
        empresasDisponibles,
        seleccionarEmpresa,
        establecerEmpresasDisponibles,
        limpiarEmpresa,
        tieneEmpresaSeleccionada: empresaSeleccionada !== null,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = (): EmpresaContextProps => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa debe ser usado dentro de un EmpresaProvider');
  }
  return context;
};
