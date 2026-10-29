import React from 'react';

export const SkeletonMetricsCard: React.FC = () => {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Cargando resumen financiero desde la memoria del dispositivo"
    >
      <div className="h-6 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-slate-100 rounded-xl" />
        <div className="h-20 bg-slate-100 rounded-xl" />
        <div className="h-20 bg-slate-100 rounded-xl" />
        <div className="h-20 bg-slate-100 rounded-xl" />
      </div>
      <span className="sr-only">Cargando datos guardados en el dispositivo...</span>
    </div>
  );
};

export const SkeletonOperationList: React.FC<{ rows?: number }> = ({
  rows = 3,
}) => {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Cargando lista de registros de la jornada"
    >
      <div className="h-6 w-56 bg-slate-200 rounded-lg" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 border border-slate-100 rounded-xl space-y-2.5 bg-slate-50/50"
        >
          <div className="h-5 w-3/5 bg-slate-200 rounded" />
          <div className="h-4 w-2/5 bg-slate-200 rounded" />
          <div className="h-8 w-44 bg-slate-200 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Cargando registros de hoy...</span>
    </div>
  );
};
