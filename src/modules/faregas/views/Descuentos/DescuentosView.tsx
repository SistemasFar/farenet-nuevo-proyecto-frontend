import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Filter, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export function DescuentosView() {
  return (
    <div className="flex h-full flex-col p-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-[#052a79] text-white rounded-xl shadow-lg shadow-[#052a79]/20">
              <Tag className="w-6 h-6" />
            </div>
            Descuentos y Alianzas
          </h1>
          <p className="text-slate-500 font-semibold mt-2 ml-14">
            Gestión de códigos promocionales, convenios corporativos y reglas de aplicación.
          </p>
        </div>
        <button
          onClick={() => { /* Abrir Modal de Creación */ }}
          className="bg-gold-3d hover:bg-yellow-500 text-slate-900 font-black px-6 py-3 rounded-xl shadow-md flex items-center gap-2 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          NUEVO DESCUENTO
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 font-medium flex flex-col items-center justify-center min-h-[300px]">
         <Tag className="w-16 h-16 text-slate-200 mb-4" />
         Módulo administrativo en construcción...
         <p className="text-sm font-normal mt-2">Aquí irá la tabla de listado de descuentos y las opciones de edición.</p>
      </div>
    </div>
  );
}
