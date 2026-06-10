import { useEffect, useRef, useState } from 'react';

type NetworkLevel = 'stable' | 'slow' | 'offline';

interface NetworkState {
  level: NetworkLevel;
  latency: number | null;
  lastCheck: string;
  online: boolean;
}

export function NetworkStatus() {
  const [open, setOpen] = useState(false);
  const [network, setNetwork] = useState<NetworkState>({
    level: navigator.onLine ? 'stable' : 'offline',
    latency: null,
    lastCheck: '',
    online: navigator.onLine
  });

  const widgetRef = useRef<HTMLDivElement>(null);

  const checkNetwork = async () => {
    const now = new Date().toLocaleTimeString();

    if (!navigator.onLine) {
      setNetwork({
        level: 'offline',
        latency: null,
        lastCheck: now,
        online: false
      });
      return;
    }

    const start = performance.now();

    try {
      await fetch(window.location.origin, {
        method: 'HEAD',
        cache: 'no-store'
      });

      const latency = Math.round(performance.now() - start);

      setNetwork({
        level: latency > 900 ? 'slow' : 'stable',
        latency,
        lastCheck: now,
        online: true
      });
    } catch {
      setNetwork({
        level: 'offline',
        latency: null,
        lastCheck: now,
        online: false
      });
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        widgetRef.current &&
        !widgetRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const colorClass = {
    stable: 'text-emerald-400',
    slow: 'text-orange-400',
    offline: 'text-red-500'
  }[network.level];

  const bgPulseClass = {
    stable: 'bg-emerald-400',
    slow: 'bg-orange-400',
    offline: 'bg-red-500'
  }[network.level];

  const ringClass = {
    stable: 'ring-emerald-400/40',
    slow: 'ring-orange-400/40',
    offline: 'ring-red-500/40'
  }[network.level];

  const label = {
    stable: 'Red estable',
    slow: 'Red lenta',
    offline: 'Sin conexión'
  }[network.level];

  const description = {
    stable: 'La conectividad del equipo se encuentra estable.',
    slow: 'La red responde, pero con latencia elevada.',
    offline: 'El navegador detecta pérdida de conexión.'
  }[network.level];

  return (
    <div className="relative" ref={widgetRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          relative
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-white/10
          border
          border-white/20
          hover:bg-white/15
          transition
          ring-2
          ${ringClass}
        `}
        title="Conectividad de red"
      >
        {network.level !== 'offline' && (
          <span
            className={`
              absolute
              h-3
              w-3
              rounded-full
              animate-ping
              ${bgPulseClass}
            `}
          />
        )}

        <svg
          className={`h-6 w-6 ${colorClass}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
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
          <circle
            cx="12"
            cy="19"
            r="1.3"
            fill="currentColor"
          />
        </svg>

        <span
          className={`
            absolute
            -right-1
            -top-1
            h-3
            w-3
            rounded-full
            border
            border-[#0033a0]
            ${bgPulseClass}
          `}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 p-4 z-50">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Conectividad de Red
              </p>

              <p className="text-sm font-black text-slate-800 mt-1">
                {label}
              </p>

              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {description}
              </p>
            </div>

            <span
              className={`
                h-3
                w-3
                rounded-full
                mt-1
                ${bgPulseClass}
              `}
            />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Estado</span>
              <span className="font-bold text-slate-800">
                {label}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Navegador online</span>
              <span className="font-bold text-slate-800">
                {network.online ? 'Sí' : 'No'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Latencia aproximada</span>
              <span className="font-bold text-slate-800">
                {network.latency !== null
                  ? `${network.latency} ms`
                  : 'No disponible'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Última revisión</span>
              <span className="font-bold text-slate-800">
                {network.lastCheck || '-'}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Este indicador valida la conectividad de la red.              
            </p>
          </div>
        </div>
      )}
    </div>
  );
}