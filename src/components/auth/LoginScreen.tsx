import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  LogIn,
  ShieldCheck,
  Truck,
  User,
  UserCheck,
} from 'lucide-react';
import { UserAccount } from '../../types/domain';

export interface LoginScreenProps {
  users: UserAccount[];
  initialUserId?: string;
  onLoginSuccess: (user: UserAccount) => void;
  onVerifyPin: (
    userId: string,
    pin: string
  ) => { ok: boolean; user?: UserAccount; message: string };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  initialUserId,
  onLoginSuccess,
  onVerifyPin,
}) => {
  const activeUsers = users.filter((u) => u.active);
  const defaultUser =
    activeUsers.find((u) => u.id === initialUserId) ||
    activeUsers.find((u) => u.role === 'OWNER') ||
    activeUsers[0];

  const [selectedUserId, setSelectedUserId] = useState<string>(
    defaultUser?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedUser =
    users.find((u) => u.id === selectedUserId) || defaultUser;

  const handleKeypadPress = (val: string) => {
    setErrorMessage(null);
    if (val === 'CLEAR') {
      setPin('');
    } else if (val === 'BACKSPACE') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((prev) => prev + val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedUserId) {
      setErrorMessage('Por favor selecciona tu cuenta de usuario.');
      return;
    }

    if (!pin.trim()) {
      setErrorMessage('Por favor ingresa tu PIN de acceso.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = onVerifyPin(selectedUserId, pin);
      if (res.ok && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.message || 'PIN incorrecto. Inténtalo de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Contenedor Principal Centrado */}
      <div className="w-full max-w-md space-y-6">
        {/* Identidad de Marca */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-xl shadow-emerald-500/20 mb-1 border border-emerald-300/30">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            RutaSync
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-400">
            Control Operativo y Logística Bananera
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión Profesional */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 text-slate-900 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona tu operador e ingresa tu PIN de seguridad
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Selector de Operador / Usuario */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Operador / Usuario
              </label>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeUsers.map((u) => {
                  const isSelected = selectedUserId === u.id;
                  const isOwner = u.role === 'OWNER';
                  const initials = u.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setErrorMessage(null);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                          : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isOwner
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span
                              className={`font-semibold ${
                                isOwner ? 'text-emerald-700' : 'text-slate-600'
                              }`}
                            >
                              {isOwner ? 'Dueño / Administrador' : 'Auxiliar de Ruta'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Campo de PIN de Seguridad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  PIN de Seguridad (4 dígitos)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Mostrar</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="••••"
                  className="w-full min-h-[52px] px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50/50 text-xl font-bold tracking-widest text-slate-900 tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-center"
                  value={pin}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setPin(e.target.value);
                  }}
                />
              </div>

              {/* Teclado numérico táctil rápido para dispositivos móviles */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACKSPACE'].map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`min-h-[46px] rounded-xl font-bold text-sm sm:text-base flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                        key === 'CLEAR'
                          ? 'bg-slate-100 text-slate-600 text-xs font-extrabold hover:bg-slate-200'
                          : key === 'BACKSPACE'
                          ? 'bg-slate-100 text-slate-600 text-xs font-extrabold hover:bg-slate-200'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    >
                      {key === 'CLEAR' ? 'C' : key === 'BACKSPACE' ? '⌫' : key}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Alerta de Error si el PIN falla */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm font-medium flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 3. Botón Principal de Inicio de Sesión */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[54px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSubmitting ? 'Verificando credenciales...' : 'Ingresar al Sistema'}</span>
            </button>
          </form>
        </div>

        {/* Pie de Seguridad */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Acceso cifrado · Modo fuera de línea activo</span>
        </div>
      </div>
    </div>
  );
};
