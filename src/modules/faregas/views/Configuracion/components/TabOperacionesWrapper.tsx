import TabCertificadosBase from './TabCertificadosBase';

interface Props {
  canViewProducts: boolean;
  canManageTarifas: boolean;
  canManageFormats: boolean;
  onGoToTarifas: () => void;
}

export default function TabOperacionesWrapper({ canViewProducts, canManageTarifas, canManageFormats, onGoToTarifas }: Props) {
  return (
    <TabCertificadosBase
      canViewProducts={canViewProducts}
      canManageTarifas={canManageTarifas}
      canManageFormats={canManageFormats}
      onGoToTarifas={onGoToTarifas}
    />
  );
}
