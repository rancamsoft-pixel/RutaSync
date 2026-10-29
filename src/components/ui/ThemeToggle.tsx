import React from 'react';
import { Moon, Sun } from 'lucide-react';

export interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  compact = false,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        theme === 'light'
          ? 'Cambiar a Modo Oscuro (descanso visual nocturno)'
          : 'Cambiar a Modo Claro (alto contraste para sol)'
      }
      title={
        theme === 'light'
          ? 'Modo Oscuro para madrugada o bodega'
          : 'Modo Claro para lectura bajo el sol'
      }
      className="theme-toggle-btn"
    >
      {theme === 'light' ? (
        <>
          <Moon size={20} aria-hidden="true" />
          {!compact && <span>Modo Noche</span>}
        </>
      ) : (
        <>
          <Sun size={20} aria-hidden="true" />
          {!compact && <span>Modo Sol</span>}
        </>
      )}
    </button>
  );
};

