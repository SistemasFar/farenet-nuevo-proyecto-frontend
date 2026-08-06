interface GenericViewProps {
  title: string;
  description: string;
}

export function GenericView({ title, description }: GenericViewProps) {
  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 p-8 text-center max-w-2xl mx-auto mt-12">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
        🛠️
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
      <div className="mt-6 p-4 bg-slate-50 rounded border border-dashed border-slate-200 text-xs text-slate-400">
        Área de desarrollo - Conexión con endpoints del Backend de Node habilitada.
      </div>
    </div>
  );
}