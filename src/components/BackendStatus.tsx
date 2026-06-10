import { useEffect, useState } from 'react';

type Status = 'online' | 'slow' | 'offline';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:3000/api';

export function BackendStatus() {
  const [status, setStatus] = useState<Status>('offline');
  const [latency, setLatency] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState('');

  const checkBackend = async () => {
    const start = performance.now();

    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        cache: 'no-store'
      });

      const ms = Math.round(performance.now() - start);

      if (!response.ok) {
        throw new Error('Backend no disponible');
      }

      setLatency(ms);
      setStatus(ms > 900 ? 'slow' : 'online');
      setLastCheck(new Date().toLocaleTimeString());
    } catch {
      setStatus('offline');
      setLatency(null);
      setLastCheck(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkBackend();

    const interval = window.setInterval(checkBackend, 8000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const colorClass = {
    online: 'text-emerald-400',
    slow: 'text-orange-400',
    offline: 'text-red-500'
  }[status];

  const ringClass = {
    online: 'ring-emerald-400/40',
    slow: 'ring-orange-400/40',
    offline: 'ring-red-500/40'
  }[status];

  const label = {
    online: 'Backend operativo',
    slow: 'Backend lento',
    offline: 'Backend caído'
  }[status];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition ring-2 ${ringClass}`}
        title="Estado del backend"
      >
        {status !== 'offline' && (
          <span className={`absolute h-3 w-3 rounded-full animate-ping ${status === 'online' ? 'bg-emerald-400' : 'bg-orange-400'}`} />
        )}

        <svg
          className={`h-6 w-6 ${colorClass}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="6"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="4"
            y="14"
            width="16"
            height="6"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="8" cy="7" r="1" fill="currentColor" />
          <circle cx="8" cy="17" r="1" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 p-4 z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Backend Farenet
              </p>
              <p className="text-sm font-black text-slate-800">
                {label}
              </p>
            </div>

            <span className={`h-3 w-3 rounded-full ${
              status === 'online'
                ? 'bg-emerald-500'
                : status === 'slow'
                  ? 'bg-orange-400'
                  : 'bg-red-500'
            }`} />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Estado</span>
              <span className="font-bold">{label}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Endpoint</span>
              <span className="font-bold">/api/health</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Latencia</span>
              <span className="font-bold">
                {latency !== null ? `${latency} ms` : 'No disponible'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Última revisión</span>
              <span className="font-bold">{lastCheck || '-'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}