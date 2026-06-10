import { useEffect, useState } from 'react';

type Status = 'online' | 'slow' | 'offline';

export function NetworkStatus() {
  const [status, setStatus] = useState<Status>('online');
  const [latency, setLatency] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState('');

  const checkNetwork = async () => {
    if (!navigator.onLine) {
      setStatus('offline');
      setLatency(null);
      setLastCheck(new Date().toLocaleTimeString());
      return;
    }

    const start = performance.now();

    try {
      await fetch(window.location.origin, {
        method: 'HEAD',
        cache: 'no-store'
      });

      const ms = Math.round(performance.now() - start);

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
    checkNetwork();

    const interval = window.setInterval(checkNetwork, 8000);

    window.addEventListener('online', checkNetwork);
    window.addEventListener('offline', checkNetwork);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', checkNetwork);
      window.removeEventListener('offline', checkNetwork);
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
    online: 'Red estable',
    slow: 'Red lenta',
    offline: 'Sin red'
  }[status];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition ring-2 ${ringClass}`}
        title="Estado de red"
      >
        {status !== 'offline' && (
          <span className={`absolute h-3 w-3 rounded-full animate-ping ${status === 'online' ? 'bg-emerald-400' : 'bg-orange-400'}`} />
        )}

        <svg
          className={`h-6 w-6 ${colorClass}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3.5 9.5C8.2 5.7 15.8 5.7 20.5 9.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6.8 13C9.8 10.7 14.2 10.7 17.2 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 16.3C11.2 15.5 12.8 15.5 14 16.3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="19" r="1.3" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 p-4 z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Conectividad de Red
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