import { useState, useEffect } from 'react';

type CertificadoBase = {
    label: string;
    clave: string;
    mod: string | null;
};

const BASE_CERTS: CertificadoBase[] = [
    { label: 'GNV Inicial', clave: 'GNV_ANUAL', mod: 'INICIAL' },
    { label: 'GNV Anual', clave: 'GNV_ANUAL', mod: 'ANUAL' },
    { label: 'GLP Inicial', clave: 'GLP_ANUAL', mod: 'INICIAL' },
    { label: 'GLP Anual', clave: 'GLP_ANUAL', mod: 'ANUAL' },
    { label: 'Conformidad', clave: 'CONFORMIDAD', mod: null },
];

export default function TabCertificadosBase() {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServicios = async () => {
            try {
                const token = JSON.parse(sessionStorage.getItem('faregasToken') || 'null');
                const res = await fetch('/api/faregas/config/servicios', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    const cnts: Record<string, number> = {};
                    data.servicios.forEach((s: any) => {
                        if (s.requiere_certificado && s.tipo_certificado_clave) {
                            const mod = s.modalidad || 'NULL';
                            const hash = `${s.tipo_certificado_clave}_${mod}`;
                            cnts[hash] = (cnts[hash] || 0) + 1;
                        }
                    });
                    setCounts(cnts);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchServicios();
    }, []);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">CERTIFICADOS BASE (TEMPLATES)</h2>
                <p className="text-sm text-slate-500 mt-1">Estos son los templates inmutables que dictan el flujo principal de Datos Iniciales y los PDFs generados. Los servicios comerciales heredan de estos.</p>
            </div>

            {loading ? (
                <div className="text-center py-8">Cargando...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BASE_CERTS.map((cert, i) => {
                        const hash = `${cert.clave}_${cert.mod || 'NULL'}`;
                        const c = counts[hash] || 0;
                        return (
                            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <h3 className="text-lg font-black text-blue-900 mb-2">{cert.label}</h3>
                                <div className="space-y-2 text-sm text-slate-600">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Clave Técnica:</span>
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{cert.clave}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Modalidad:</span>
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{cert.mod || 'NULL'}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2 mt-2">
                                        <span className="font-semibold">Servicios Asociados:</span>
                                        <span className="font-bold text-blue-600">{c}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
