import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-0 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bottom-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-bottom-sheet w-full max-w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Indicador superior tipo hoja móvil */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-11 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Cabecera limpia y compacta en móvil */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-start justify-between gap-2.5 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0 border border-green-100">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="bottom-sheet-title"
                className="text-lg sm:text-xl font-bold text-slate-900 leading-tight truncate"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido desplazable sin desborde horizontal */}
        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
