import React, { useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';
import { deterministicHash } from '../../domain/securityEngine';
import { UserAccount } from '../../types/domain';
import { BottomSheet } from './BottomSheet';

export interface AuthLoginSheetProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  activeUser: UserAccount;
  onAuthenticateUser: (userId: string) => void;
  onUpdatePin?: (
    targetUserId: string,
    newPin: string
  ) => Promise<{ ok: boolean; message: string }>;
  onLogout?: () => void;
}

const DEFAULT_PINS: Record<string, string> = {
  'USR-OWNER-01': '1234',
  'USR-HELPER-01': '5678',
  'USR-HELPER-02': '9012',
};

export const AuthLoginSheet: React.FC<AuthLoginSheetProps> = ({
  isOpen,
  onClose,
  users,
  activeUser,
  onAuthenticateUser,
  onUpdatePin,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'PIN' | 'LOGOUT'>('LOGIN');

  // Login state
  const [selectedUserId, setSelectedUserId] = useState<string>(activeUser.id);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Change PIN state
  const [pinTargetUserId, setPinTargetUserId] = useState<string>(activeUser.id);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [pinFeedback, setPinFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState<boolean>(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      setErrorMsg('Selecciona un usuario válido.');
      return;
    }

    if (!targetUser.active) {
      setErrorMsg(
        'Esta cuenta fue desactivada por el administrador. Su acceso está revocado.'
      );
      return;
    }

    const expectedPin = DEFAULT_PINS[targetUser.id];
    const inputHash = deterministicHash(
      targetUser.role === 'OWNER'
        ? `OWNER_PIN_${pinInput}`
        : `HELPER_PIN_${pinInput}`
    );
    const directHash = deterministicHash(pinInput);

    const isPinValid =
      (expectedPin && pinInput === expectedPin) ||
      inputHash === targetUser.pinOrCredentialHash ||
      directHash === targetUser.pinOrCredentialHash;

    if (!isPinValid) {
      setErrorMsg(
        `PIN incorrecto. (PIN sugerido para ${targetUser.name}: ${
          expectedPin ?? '1234'
        })`
      );
      return;
    }

    onAuthenticateUser(targetUser.id);
    setPinInput('');
    onClose();
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinFeedback(null);

    if (!newPin || newPin.length < 4) {
      setPinFeedback({
        type: 'error',
        text: 'El nuevo PIN debe tener al menos 4 dígitos numéricos.',
      });
      return;
    }

    if (newPin !== confirmNewPin) {
      setPinFeedback({
        type: 'error',
        text: 'Los dos PIN ingresados no coinciden. Verifica e intenta de nuevo.',
      });
      return;
    }

    if (!onUpdatePin) {
      setPinFeedback({
        type: 'error',
        text: 'Función de cambio de PIN no disponible en este momento.',
      });
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await onUpdatePin(pinTargetUserId, newPin);
      if (res.ok) {
        setPinFeedback({
          type: 'success',
          text: `PIN actualizado exitosamente para el usuario. Guárdalo bien: ${newPin}`,
        });
        setNewPin('');
        setConfirmNewPin('');
      } else {
        setPinFeedback({
          type: 'error',
          text: res.message || 'No se pudo actualizar el PIN.',
        });
      }
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    }
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Acceso y Seguridad"
      subtitle={`Usuario actual: ${activeUser.name} (${activeUser.role === 'OWNER' ? 'Dueño' : 'Auxiliar'})`}
      icon={<KeyRound className="w-5 h-5 text-green-700" />}
    >
      <div className="space-y-4">
        {/* Selector de sub-acción: Cambiar Usuario / Cambiar PIN / Cerrar Sesión */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMsg(null);
            }}
            className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LOGIN'
                ? 'bg-white text-green-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cambiar Usuario
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('PIN');
              setPinFeedback(null);
            }}
            className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PIN'
                ? 'bg-white text-green-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cambiar PIN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOGOUT')}
            className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LOGOUT'
                ? 'bg-red-50 text-red-900 shadow-xs border border-red-200'
                : 'text-slate-600 hover:text-red-700'
            }`}
          >
            Cerrar Sesión
          </button>
        </div>

        {/* TAB 1: CAMBIAR USUARIO */}
        {activeTab === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">
                Selecciona la cuenta con la que vas a operar:
              </label>
              <div className="space-y-2">
                {users.map((u) => {
                  const isSelected = selectedUserId === u.id;
                  const isOwner = u.role === 'OWNER';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setErrorMsg(null);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-green-50 border-green-600 ring-1 ring-green-600'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOwner
                              ? 'bg-green-700 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isOwner ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isOwner && (
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-green-100 text-green-900 border border-green-200">
                                Dueño
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            Rol: {isOwner ? 'Dueño / Administrador' : 'Auxiliar de Ruta'}{' '}
                            · PIN sugerido: {DEFAULT_PINS[u.id] ?? '1234'}
                          </div>
                        </div>
                      </div>

                      {!u.active ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                          Desactivado
                        </span>
                      ) : isSelected ? (
                        <UserCheck className="w-5 h-5 text-green-700 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Ingresa el PIN de seguridad (4 dígitos)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="Ej: 1234..."
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-lg font-bold tracking-widest text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[46px] px-3 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CAMBIAR PIN */}
        {activeTab === 'PIN' && (
          <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Usuario al que se le cambiará el PIN:
              </label>
              {activeUser.role === 'OWNER' ? (
                <select
                  value={pinTargetUserId}
                  onChange={(e) => setPinTargetUserId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'OWNER' ? 'Dueño' : 'Auxiliar'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{activeUser.name} (Tu cuenta activa)</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nuevo PIN (4 dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="Ej: 5678"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-900 tracking-wider tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Confirmar nuevo PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="Repite el PIN"
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-900 tracking-wider tabular-nums"
                />
              </div>
            </div>

            {pinFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2 ${
                  pinFeedback.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {pinFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                )}
                <span>{pinFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdatingPin}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{isUpdatingPin ? 'Guardando...' : 'Guardar Nuevo PIN'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CERRAR SESIÓN */}
        {activeTab === 'LOGOUT' && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                <LogOut className="w-5 h-5 text-red-600" />
                <span>¿Deseas cerrar la sesión activa?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estás conectado actualmente como <strong>{activeUser.name}</strong>. Al
                cerrar sesión, la aplicación bloqueará el registro de operaciones hasta
                que cualquier usuario ingrese su PIN de acceso.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm cursor-pointer"
              >
                Permanecer
              </button>
              <button
                type="button"
                onClick={handleLogoutAction}
                className="min-h-[46px] px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
