import React, { useState } from 'react';
import {
  Ban,
  Bell,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  KeyRound,
  Leaf,
  Plus,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { UserAccount } from '../../types/domain';

export type NavTabId = 'OPERATE' | 'SUPPLIERS' | 'CLIENTS' | 'OWNER';

export interface ResponsivePwaShellProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isOnline: boolean;
  onOpenConnectionSheet: () => void;
  onOpenAuthSheet: () => void;
  onOpenNotificationsModal: () => void;
  onOpenQuickSale: () => void;
  onOpenQuickExpense: () => void;
  pendingSyncCount: number;
  pendingAuthCount: number;
  activeUser: UserAccount;
  expectedCashFormatted?: string;
  shiftOpen?: boolean;
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
  onOpenNotificationsModal,
  onOpenQuickSale,
  onOpenQuickExpense,
  pendingSyncCount,
  pendingAuthCount,
  activeUser,
  expectedCashFormatted,
  shiftOpen = true,
  firebaseProjectId,
  children,
  rightPanel,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [fabMenuOpen, setFabMenuOpen] = useState<boolean>(false);

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
      id: 'SUPPLIERS',
      label: 'Compras y Devoluciones',
      shortLabel: 'Compras/Dev.',
      icon: <Truck className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'CLIENTS',
      label: 'Cobros y Deudas',
      shortLabel: 'Cobros/Deudas',
      icon: <Users className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'OWNER',
      label: 'Panel del Dueño',
      shortLabel: 'Dueño',
      icon: <UserCheck className="w-5 h-5" aria-hidden="true" />,
      badge: pendingAuthCount > 0 ? pendingAuthCount : undefined,
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* ====================================================================
          MENÚ LATERAL COLAPSABLE (DESKTOP >= 1024px)
         ==================================================================== */}
      <aside
        aria-label="Menú principal en escritorio"
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-slate-200 shrink-0 transition-all duration-200 z-40 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between gap-2">
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
          CONTENIDO PRINCIPAL CON CABECERA FIJA SIEMPRE VISIBLE AL HACER SCROLL
         ==================================================================== */}
      <div
        className={`flex-1 min-w-0 w-full max-w-full flex flex-col pb-28 lg:pb-16 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <header
          className={`fixed top-0 right-0 left-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs transition-all duration-200 ${
            sidebarCollapsed ? 'lg:left-20' : 'lg:left-72'
          }`}
        >
          <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
            {/* Identidad, Usuario Activo y Dato Clave de Caja */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-700 text-white flex lg:hidden items-center justify-center shrink-0 shadow-xs">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight shrink-0">
                    RutaSync
                  </h1>
                  {expectedCashFormatted && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-green-50 text-green-800 border border-green-200 tabular-nums truncate">
                      Caja: {expectedCashFormatted}
                    </span>
                  )}
                  {!activeUser.active && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 shrink-0">
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

            {/* Botones de Campanita (Autorizaciones), Usuario y Conexión */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenNotificationsModal}
                aria-label="Notificaciones y solicitudes de autorización"
                title="Autorizaciones de edición fuera de plazo"
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  pendingAuthCount > 0
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Bell className="w-4 h-4" />
                {pendingAuthCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center tabular-nums shadow-2xs">
                    {pendingAuthCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenAuthSheet}
                className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cambiar sesión de usuario con PIN"
              >
                <KeyRound className="w-4 h-4 text-green-700 shrink-0" />
                <span className="hidden sm:inline">Usuario</span>
              </button>

              <button
                type="button"
                onClick={onOpenConnectionSheet}
                className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
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
                <span className="hidden md:inline">
                  {isOnline
                    ? 'Conectado'
                    : `Sin señal (${pendingSyncCount})`}
                </span>
                <Database className="w-3.5 h-3.5 opacity-70 md:hidden shrink-0" />
              </button>
            </div>
          </div>

          {!isOnline && (
            <div
              role="status"
              className="bg-amber-50 border-t border-amber-200 px-3 sm:px-4 py-1.5 text-amber-950 text-xs"
            >
              <div className="max-w-6xl mx-auto flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">
                  <strong>Modo sin señal:</strong> Guardando en el teléfono; se sincronizará al recuperar cobertura.
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Espaciador para compensar la barra fija superior */}
        <div className={isOnline ? 'h-16 shrink-0' : 'h-24 shrink-0'} />

        {/* Área de Trabajo Principal */}
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div
            className={
              rightPanel
                ? 'xl:col-span-8 min-w-0 space-y-4'
                : 'xl:col-span-12 min-w-0 space-y-4'
            }
          >
            {children}
          </div>
          {rightPanel && (
            <aside className="xl:col-span-4 min-w-0 xl:sticky xl:top-20 space-y-4">
              {rightPanel}
            </aside>
          )}
        </div>

        {/* ====================================================================
            UN SOLO BOTÓN CIRCULAR FLOTANTE (+) CON SUBMENÚ (VENTA | GASTO)
           ==================================================================== */}
        {shiftOpen && activeUser.active && (
          <>
            {fabMenuOpen && (
              <div
                className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[1px]"
                onClick={() => setFabMenuOpen(false)}
              />
            )}

            <div className="fixed bottom-[74px] lg:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5">
              {fabMenuOpen && (
                <div className="flex flex-col items-end gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFabMenuOpen(false);
                      onOpenQuickExpense();
                    }}
                    className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-slate-900 font-bold text-sm shadow-xl border border-slate-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <span>Registrar Gasto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFabMenuOpen(false);
                      onOpenQuickSale();
                    }}
                    className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white hover:bg-green-50 text-slate-900 font-bold text-sm shadow-xl border border-slate-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-xl bg-green-100 text-green-800 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4" />
                    </span>
                    <span>Registrar Venta</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setFabMenuOpen((prev) => !prev)}
                aria-label="Abrir menú rápido de Venta o Gasto"
                title="Registrar Venta o Gasto"
                className={`w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  fabMenuOpen
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-green-700 hover:bg-green-800'
                }`}
              >
                {fabMenuOpen ? (
                  <X className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <Plus className="w-7 h-7 stroke-[2.5]" />
                )}
              </button>
            </div>
          </>
        )}

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
                className={`min-h-[62px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative ${
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
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-600 text-white text-[10px] font-bold rounded-full tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] leading-tight truncate max-w-full">
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
