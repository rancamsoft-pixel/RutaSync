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
  label?: string;
  options: SearchableOption[];
  value: string;
  onChange: (id: string) => void;
  searchPlaceholder?: string;
  compact?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  searchPlaceholder = 'Buscar...',
  compact = false,
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
    <div className="w-full relative">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-bold text-slate-800">
            {label}
          </label>
          <span className="text-xs font-medium text-slate-500">
            {options.length} disponibles
          </span>
        </div>
      )}

      {/* Botón selector: en modo compact es más bajito y muestra abreviación / label */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full rounded-xl border text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
          compact
            ? 'min-h-[38px] px-2.5 py-1 text-xs bg-white border-slate-300 hover:bg-slate-50'
            : 'min-h-[50px] px-3.5 py-2 text-sm sm:text-base ' +
              (isOpen
                ? 'bg-green-50/70 border-green-600 ring-2 ring-green-600/20'
                : 'bg-white border-slate-300 hover:bg-slate-50')
        }`}
      >
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <div className="font-bold text-slate-900 truncate">
            {selectedOption?.label ?? 'Seleccionar...'}
          </div>
          {!compact && selectedOption?.sublabel && (
            <div className="text-xs text-slate-500 truncate">
              {selectedOption.sublabel}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!compact && selectedOption?.badgeText && (
            <span
              className={`font-bold px-1.5 py-0.5 rounded border tabular-nums text-xs ${getBadgeClasses(
                selectedOption.badgeTone
              )}`}
            >
              {selectedOption.badgeText}
            </span>
          )}
          <span className="w-5 h-5 rounded text-slate-500 flex items-center justify-center">
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </div>
      </button>

      {/* Panel desplegable con buscador rápido tipo autocomplete */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-300 bg-white shadow-xl overflow-hidden">
          <div className="p-1.5 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none py-0.5"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
            {filteredOptions.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-slate-500">
                Sin coincidencias para "{query}"
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
                    className={`w-full px-2.5 py-2 text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-green-50 text-green-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-green-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-1.5">
                          {compact && (
                            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-900 border border-green-200 text-[11px] font-mono font-bold shrink-0">
                              {opt.label}
                            </span>
                          )}
                          <span className="truncate">
                            {compact && opt.sublabel ? opt.sublabel : opt.label}
                          </span>
                        </div>
                        {!compact && opt.sublabel && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {opt.badgeText && (
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 tabular-nums ${getBadgeClasses(
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

