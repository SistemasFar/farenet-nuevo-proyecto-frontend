export function InicioView() {
  const inspeccionesMock = [
    { placa: 'AHQ305', dni: '09043065', nombre: 'ALBINO LUCIO POCOMUCHA MEJIA', fecha: '08-jun-2026 12:56:58', concepto: 'PARTICULAR LIVIANOS', linea: 'L1_MIXTA', estado: 'PROFUNDIMETRO' },
    { placa: 'CSP208', dni: '20604368406', nombre: 'BFK MOTORS S.A.C.', fecha: '08-jun-2026 13:06:30', concepto: 'TAXI', linea: 'L1_MIXTA', estado: 'ALINEACION' }
  ];

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100 gap-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Lista de Inspecciones en Proceso ({inspeccionesMock.length})
        </h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition">+ Nuevo Duplicado</button>
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition">+ Nuevo Servicio</button>
          <button className="px-3 py-1.5 bg-[#052a79] text-white rounded text-xs font-semibold hover:bg-blue-900 transition">+ Nueva Inspección</button>
        </div>
      </div>

      {/* Buscador */}
      <div className="mt-4 mb-6">
        <input 
          type="text" 
          placeholder="Buscar por placa, nombre o DNI..." 
          className="w-full md:w-1/3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
        />
      </div>

      {/* Tabla Responsiva */}
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#26b49a] text-white font-semibold">
              <th className="p-3 border-r border-teal-600">Placa</th>
              <th className="p-3 border-r border-teal-600">DNI / RUC</th>
              <th className="p-3 border-r border-teal-600">Nombres / Razon Social</th>
              <th className="p-3 border-r border-teal-600">Fecha Inicio</th>
              <th className="p-3 border-r border-teal-600">Concepto</th>
              <th className="p-3 border-r border-teal-600">Linea</th>
              <th className="p-3 border-r border-teal-600">Estado Actual</th>
              <th className="p-3">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {inspeccionesMock.map((ins, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-semibold text-blue-700 bg-slate-50/50">{ins.placa}</td>
                <td className="p-3">{ins.dni}</td>
                <td className="p-3 font-medium">{ins.nombre}</td>
                <td className="p-3 text-slate-500">{ins.fecha}</td>
                <td className="p-3">{ins.concepto}</td>
                <td className="p-3 font-mono text-center bg-slate-50/30">{ins.linea}</td>
                <td className="p-3 font-bold text-slate-600">{ins.estado}</td>
                <td className="p-3"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}