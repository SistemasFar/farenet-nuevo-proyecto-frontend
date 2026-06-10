import { useEffect, useState } from 'react';

type BackendStatus = 'online' | 'slow' | 'offline';

interface BackendState {
  status: BackendStatus;
  label: string;
  latency: number | null;
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:3000/api';

export function BackendStatusWidget() {
  const [backend, setBackend] = useState<BackendState>({
    status: 'offline',
    label: 'API...',
    latency: null
  });

  const checkBackend = async () => {
    const start = performance.now();

    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        cache: 'no-store'
      });

      const latency = Math.round(performance.now() - start);

      if (!response.ok) {
        throw new Error('API no disponible');
      }

      setBackend({
        status: latency > 1000 ? 'slow' : 'online',
        label: latency > 1000 ? 'API lenta' : 'API OK',
        latency
      });
    } catch {
      setBackend({
        status: 'offline',
        label: 'API caída',
        latency: null
      });
    }
  };

  useEffect(() => {
    checkBackend();

    const interval = window.setInterval(checkBackend, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const dotClass = {
    online: 'bg-emerald-500',
    slow: 'bg-yellow-400',
    offline: 'bg-red-500'
  }[backend.status];

  const boxClass = {
    online: 'bg-blue-50 border-blue-100 text-blue-700',
    slow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    offline: 'bg-red-50 border-red-100 text-red-700'
  }[backend.status];

  return (
    <div
      title={`${backend.label}${backend.latency !== null ? ` - ${backend.latency} ms` : ''}`}
      className={`hidden md:flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm ${boxClass}`}
    >
      <span className={`h-3 w-3 rounded-full ${dotClass}`} />

      <span className="text-xs font-black hidden lg:inline">
        {backend.label}
      </span>

      {backend.latency !== null && (
        <span className="text-[11px] font-bold hidden xl:inline">
          {backend.latency} ms
        </span>
      )}

      <span className="text-xs font-bold">
        API
      </span>
    </div>
  );
}