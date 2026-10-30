import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerExtra,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-[2px] p-3 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bottom-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal siempre centrado y con alto constante (h-[540px] max-h-[86dvh]) para que no se agrande ni se encoja al cambiar de tab */}
      <div className="w-full max-w-lg h-[540px] max-h-[86dvh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Cabecera compacta */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0 border border-green-100">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h2
                  id="bottom-sheet-title"
                  className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {headerExtra && <div>{headerExtra}</div>}
        </div>

        {/* Contenido interno con scroll independiente manteniendo fija la altura del modal */}
        <div className="p-4 overflow-y-auto overflow-x-hidden space-y-3.5 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
