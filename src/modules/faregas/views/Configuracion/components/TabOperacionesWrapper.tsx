import TabCertificadosBase from './TabCertificadosBase';

interface Props {
  canViewProducts: boolean;
  canManageTarifas: boolean;
  onGoToTarifas: () => void;
}

export default function TabOperacionesWrapper({ canViewProducts, canManageTarifas, onGoToTarifas }: Props) {
  return (
    <TabCertificadosBase
      canViewProducts={canViewProducts}
      canManageTarifas={canManageTarifas}
      onGoToTarifas={onGoToTarifas}
    />
  );
}
