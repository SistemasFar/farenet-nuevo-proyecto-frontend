import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado al renderizar la aplicación:', error, info.componentStack);
  }

  private irAlInicio = () => {
    const destino = window.location.pathname.startsWith('/faregas') ? '/faregas/inicio' : '/inicio';
    window.location.assign(destino);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section role="alert" className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-7 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">No se pudo mostrar esta pantalla</h1>
          <p className="mt-2 text-sm text-slate-600">
            La sesión continúa activa. Recargue la página; si el problema persiste, vuelva al inicio e inténtelo nuevamente.
          </p>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs text-slate-500">
            Detalle técnico: {this.state.error.message || 'Error de renderizado no identificado.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#052a79] px-5 py-2.5 text-sm font-black text-white"
            >
              <RefreshCw className="h-4 w-4" /> RECARGAR
            </button>
            <button
              type="button"
              onClick={this.irAlInicio}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700"
            >
              <Home className="h-4 w-4" /> VOLVER AL INICIO
            </button>
          </div>
        </section>
      </main>
    );
  }
}
