import { Link } from 'react-router-dom';

export function NotFoundView({ destino = '/inicio' }: { destino?: string }) {
  return (
    <section className="grid min-h-[65dvh] place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-5xl font-extrabold text-[#052a79] sm:text-7xl">404</p>
        <h1 className="mb-4 text-2xl font-bold text-slate-800">Página no encontrada</h1>
        <p className="mb-8 text-slate-500">
          La ruta a la que intentas acceder no existe o fue movida.
        </p>
        <Link
          to={destino}
          replace
          className="inline-flex min-h-11 items-center rounded-lg bg-[#052a79] px-6 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#052a79]"
        >
          {destino === '/login' ? 'Ir al inicio de sesión' : 'Volver a mi inicio'}
        </Link>
      </div>
    </section>
  );
}
