import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

export interface SearchableOption {
  id: string;
  label: string;
  sublabel?: string;
  badgeText?: string;
  badgeTone?: 'green' | 'amber' | 'slate' | 'blue';
}

export interface SearchableSelectProps {
  label: string;
  options: SearchableOption[];
  value: string;
  onChange: (id: string) => void;
  searchPlaceholder?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  searchPlaceholder = 'Buscar por nombre...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((o) => o.id === value) ?? options[0],
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
        (o.badgeText && o.badgeText.toLowerCase().includes(q))
    );
  }, [options, query]);

  const getBadgeClasses = (tone?: SearchableOption['badgeTone']) => {
    switch (tone) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'amber':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-bold text-slate-800">
          {label}
        </label>
        <span className="text-xs font-medium text-slate-500">
          {options.length} disponibles
        </span>
      </div>

      {/* Botón compacto que muestra solo el seleccionado actual */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[50px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
          isOpen
            ? 'bg-green-50/70 border-green-600 ring-2 ring-green-600/20'
            : 'bg-white border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {selectedOption?.label ?? 'Seleccionar...'}
          </div>
          {selectedOption?.sublabel && (
            <div className="text-xs text-slate-500 truncate">
              {selectedOption.sublabel}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedOption?.badgeText && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-lg border tabular-nums ${getBadgeClasses(
                selectedOption.badgeTone
              )}`}
            >
              {selectedOption.badgeText}
            </span>
          )}
          <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </div>
      </button>

      {/* Panel desplegable con buscador para 70+ clientes o múltiples productos */}
      {isOpen && (
        <div className="mt-1.5 rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none py-1"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                No se encontraron coincidencias para "{query}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-green-50 text-green-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {isSelected && (
                        <Check className="w-4 h-4 text-green-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div className="text-xs text-slate-500 truncate">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {opt.badgeText && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border shrink-0 tabular-nums ${getBadgeClasses(
                          opt.badgeTone
                        )}`}
                      >
                        {opt.badgeText}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

