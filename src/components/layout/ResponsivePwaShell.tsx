import React, { useState } from 'react';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  KeyRound,
  Leaf,
  Lock,
  ShieldCheck,
  ShoppingBag,
  User,
  UserCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { UserAccount } from '../../types/domain';

export type NavTabId = 'OPERATE' | 'CLOSE' | 'OWNER' | 'AUDIT';

export interface ResponsivePwaShellProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isOnline: boolean;
  onOpenConnectionSheet: () => void;
  onOpenAuthSheet: () => void;
  pendingSyncCount: number;
  pendingAuthCount: number;
  activeUser: UserAccount;
  firebaseProjectId: string;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export const ResponsivePwaShell: React.FC<ResponsivePwaShellProps> = ({
  activeTab,
  onSelectTab,
  isOnline,
  onOpenConnectionSheet,
  onOpenAuthSheet,
  pendingSyncCount,
  pendingAuthCount,
  activeUser,
  firebaseProjectId,
  children,
  rightPanel,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Nombre corto limpio sin paréntesis redundantes para móvil
  const cleanUserName = activeUser.name.replace(/\s*\(.*?\)\s*/g, '').trim();
  const roleLabel = activeUser.role === 'OWNER' ? 'Dueño' : 'Auxiliar';

  const navItems: Array<{
    id: NavTabId;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'OPERATE',
      label: 'Ruta de Hoy',
      shortLabel: 'Ruta Hoy',
      icon: <ShoppingBag className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'CLOSE',
      label: 'Cerrar Jornada',
      shortLabel: 'Cerrar Día',
      icon: <Lock className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'OWNER',
      label: 'Panel del Dueño',
      shortLabel: 'Dueño',
      icon: <UserCheck className="w-5 h-5" aria-hidden="true" />,
      badge: pendingAuthCount > 0 ? pendingAuthCount : undefined,
    },
    {
      id: 'AUDIT',
      label: 'Auditoría y Pruebas',
      shortLabel: 'Auditoría',
      icon: <ShieldCheck className="w-5 h-5" aria-hidden="true" />,
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* ====================================================================
          MENÚ LATERAL COLAPSABLE (DESKTOP >= 1024px)
         ==================================================================== */}
      <aside
        aria-label="Menú principal en escritorio"
        className={`hidden lg:flex flex-col sticky top-0 h-screen bg-white border-r border-slate-200 shrink-0 transition-all duration-200 z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Cabecera de marca RutaSync */}
        <div className="h-18 px-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Leaf className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="font-bold text-lg text-slate-900 leading-tight">
                  RutaSync
                </div>
                <div className="text-xs font-medium text-slate-500">
                  RutaBanano · Cloud Firestore
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={
              sidebarCollapsed
                ? 'Expandir menú lateral'
                : 'Colapsar menú lateral'
            }
            className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Enlaces de navegación */}
        <nav className="flex-1 p-3 space-y-1.5" aria-label="Secciones">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full min-h-[52px] px-3.5 py-3 rounded-xl font-semibold text-base flex items-center gap-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-green-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {item.badge !== undefined && (
                  <span
                    className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full tabular-nums ${
                      isActive
                        ? 'bg-white text-green-800'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sesión y conexión a Firebase en pie del menú lateral */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={onOpenAuthSheet}
            title="Cambiar sesión de usuario con PIN"
            className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left flex items-center gap-3 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {activeUser.name}
                </div>
                <div className="text-xs text-green-700 font-medium truncate">
                  Cambiar cuenta / PIN
                </div>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenConnectionSheet}
            className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
              isOnline
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isOnline
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {isOnline ? (
                <Cloud className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  Firebase: {firebaseProjectId}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {pendingSyncCount} en cola · Ver sincronización
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ====================================================================
          CONTENIDO PRINCIPAL Y CABECERA MÓVIL OPTIMIZADA (UNA SOLA FILA)
         ==================================================================== */}
      <div className="flex-1 min-w-0 w-full max-w-full flex flex-col pb-24 lg:pb-10">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
            {/* Identidad y Sesión Activa */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-700 text-white flex lg:hidden items-center justify-center shrink-0 shadow-xs">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                    RutaSync
                  </h1>
                  {!activeUser.active && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200 shrink-0">
                      <Ban className="w-3 h-3 text-red-600" />
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-green-800 truncate">
                  <User className="w-3 h-3 text-green-700 shrink-0" />
                  <span className="truncate">
                    {cleanUserName} · {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones de sesión y sincronización en la misma línea */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenAuthSheet}
                className="min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cambiar sesión de usuario con PIN"
              >
                <KeyRound className="w-4 h-4 text-green-700 shrink-0" />
                <span className="hidden xs:inline sm:inline">Usuario</span>
              </button>

              <button
                type="button"
                onClick={onOpenConnectionSheet}
                className={`min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  isOnline
                    ? 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title="Estado de conexión con Firebase Cloud Firestore y respaldos"
              >
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-700 shrink-0" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {isOnline
                    ? 'Firebase conectado'
                    : `Sin señal (${pendingSyncCount})`}
                </span>
                <Database className="w-3.5 h-3.5 opacity-70 sm:hidden shrink-0" />
              </button>
            </div>
          </div>

          {!isOnline && (
            <div
              role="status"
              className="bg-amber-50 border-t border-amber-200 px-3 sm:px-4 py-2 text-amber-950 text-xs sm:text-sm"
            >
              <div className="max-w-6xl mx-auto flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="leading-snug">
                  <strong>Sin señal móvil:</strong> Guardando en el teléfono; se sincronizará con Firebase al recuperar cobertura.
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Área de Trabajo Principal */}
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div
            className={
              rightPanel
                ? 'xl:col-span-8 min-w-0 space-y-4 sm:space-y-5'
                : 'xl:col-span-12 min-w-0 space-y-4 sm:space-y-5'
            }
          >
            {children}
          </div>
          {rightPanel && (
            <aside className="xl:col-span-4 min-w-0 xl:sticky xl:top-24 space-y-4 sm:space-y-5">
              {rightPanel}
            </aside>
          )}
        </div>

        {/* ====================================================================
            BARRA INFERIOR DE NAVEGACIÓN (MÓVIL < 1024px)
           ==================================================================== */}
        <nav
          aria-label="Navegación principal inferior"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-lg grid grid-cols-4"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[64px] py-1.5 px-1 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer relative ${
                  isActive
                    ? 'text-green-800 font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-4 h-1 rounded-b-full bg-green-700" />
                )}
                <div
                  className={`relative px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-green-50 text-green-700' : ''
                  }`}
                >
                  {item.icon}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-600 text-white text-[11px] font-bold rounded-full tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] sm:text-xs leading-tight truncate max-w-full">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
