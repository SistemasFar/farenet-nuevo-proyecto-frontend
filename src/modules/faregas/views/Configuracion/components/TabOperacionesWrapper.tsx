import { useState } from 'react';
import TabCertificadosBase from './TabCertificadosBase';
import TabFormatos from './TabFormatos';
import { Layers, FileText } from 'lucide-react';

interface Props {
  canViewProducts: boolean;
  canManageTarifas: boolean;
  onGoToTarifas: () => void;
}

type SubTab = 'OPERACIONES' | 'FORMATOS';

export default function TabOperacionesWrapper({ canViewProducts, canManageTarifas, onGoToTarifas }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('OPERACIONES');

  return (
    <div className="space-y-4">
      {/* Navegación Interna */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setSubTab('OPERACIONES')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            subTab === 'OPERACIONES'
              ? 'border-[#052A79] text-[#052A79]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Layers size={18} />
          Operaciones
        </button>
        <button
          onClick={() => setSubTab('FORMATOS')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            subTab === 'FORMATOS'
              ? 'border-[#052A79] text-[#052A79]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <FileText size={18} />
          Formatos de Certificado
        </button>
      </div>

      {/* Contenido */}
      <div className="pt-2">
        {subTab === 'OPERACIONES' && (
          <TabCertificadosBase 
            canViewProducts={canViewProducts} 
            canManageTarifas={canManageTarifas} 
            onGoToTarifas={onGoToTarifas} 
          />
        )}
        {subTab === 'FORMATOS' && <TabFormatos />}
      </div>
    </div>
  );
}
