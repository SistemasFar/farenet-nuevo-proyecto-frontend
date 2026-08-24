import TabSeries from './TabSeries';

export default function TabFacturacion() {
  return <div>
    <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
      <div className="flex-1 rounded-md bg-[#052A79] px-4 py-2 text-center text-sm font-bold text-white shadow">SERIES</div>
    </div>
    <TabSeries />
  </div>;
}
