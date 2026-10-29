import React, { useState } from 'react';
import { KeyRound, LogIn, ShieldCheck, User, UserCheck } from 'lucide-react';
import { deterministicHash } from '../../domain/securityEngine';
import { UserAccount } from '../../types/domain';
import { BottomSheet } from './BottomSheet';

export interface AuthLoginSheetProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  activeUser: UserAccount;
  onAuthenticateUser: (userId: string) => void;
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
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(activeUser.id);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      setErrorMsg('Selecciona un usuario válido.');
      return;
    }

    if (!targetUser.active) {
      setErrorMsg(
        'Esta cuenta de auxiliar fue desactivada por el administrador. Su acceso está revocado.'
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
        `PIN incorrecto. (PIN configurado para ${targetUser.name}: ${
          expectedPin ?? '1122'
        })`
      );
      return;
    }

    onAuthenticateUser(targetUser.id);
    setPinInput('');
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar Sesión de Usuario"
      subtitle="Autenticación por rol y PIN de seguridad"
      icon={<KeyRound className="w-5 h-5" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-base font-bold text-slate-800">
            Selecciona tu cuenta
          </label>
          <div className="space-y-2">
            {users.map((u) => {
              const isSelected = selectedUserId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setErrorMsg(null);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-green-50 border-green-600 ring-1 ring-green-600'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        u.role === 'OWNER'
                          ? 'bg-green-700 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role === 'OWNER' ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-base text-slate-900">
                        {u.name}
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        Rol:{' '}
                        {u.role === 'OWNER'
                          ? 'Administrador / Dueño'
                          : 'Auxiliar de Ruta'}{' '}
                        · PIN: {DEFAULT_PINS[u.id] ?? '1122'}
                      </div>
                    </div>
                  </div>

                  {!u.active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
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
          <label className="block text-base font-bold text-slate-800 mb-1.5">
            PIN de acceso (4 dígitos)
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Ingresa tu PIN..."
            className="w-full min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-xl font-bold tracking-widest text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-[54px] px-4 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>Iniciar sesión</span>
          </button>
        </div>
      </form>
    </BottomSheet>
  );
};

