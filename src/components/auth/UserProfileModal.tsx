import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react';
import { UserAccount } from '../../types/domain';
import { BottomSheet } from '../ui/BottomSheet';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount;
  onLogout: () => void;
  onUpdatePin: (
    newPin: string
  ) => Promise<{ ok: boolean; message: string }>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onUpdatePin,
}) => {
  const [activeView, setActiveView] = useState<'DETAILS' | 'CHANGE_PIN'>('DETAILS');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinFeedback, setPinFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isOwner = user.role === 'OWNER';
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinFeedback(null);

    if (!newPin || newPin.length < 4) {
      setPinFeedback({
        type: 'error',
        text: 'El nuevo PIN debe tener al menos 4 dígitos numéricos.',
      });
      return;
    }

    if (newPin !== confirmPin) {
      setPinFeedback({
        type: 'error',
        text: 'Los PIN ingresados no coinciden. Por favor verifica.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onUpdatePin(newPin);
      if (res.ok) {
        setPinFeedback({
          type: 'success',
          text: 'Tu nuevo PIN ha sido actualizado exitosamente.',
        });
        setNewPin('');
        setConfirmPin('');
        setTimeout(() => {
          setActiveView('DETAILS');
          setPinFeedback(null);
        }, 1800);
      } else {
        setPinFeedback({
          type: 'error',
          text: res.message || 'No se pudo actualizar el PIN.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Mi Cuenta"
      subtitle="Perfil y seguridad del usuario activo"
      icon={<User className="w-5 h-5 text-emerald-700" />}
    >
      <div className="space-y-4">
        {/* Tarjeta de Información de Usuario */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${
                isOwner
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-800 text-white'
              }`}
            >
              {initials}
            </div>
            <div>
              <div className="font-extrabold text-base text-slate-900">
                {user.name}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isOwner
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {isOwner ? 'Dueño / Administrador' : 'Auxiliar de Ruta'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Vehículo Asignado
            </div>
            <div className="text-xs font-extrabold text-slate-700">
              NPR Placa KLM-456
            </div>
          </div>
        </div>

        {activeView === 'DETAILS' ? (
          <div className="space-y-3 pt-1">
            {/* Opciones de Perfil */}
            <button
              type="button"
              onClick={() => {
                setActiveView('CHANGE_PIN');
                setPinFeedback(null);
              }}
              className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    Cambiar mi Contraseña / PIN
                  </div>
                  <div className="text-xs text-slate-500">
                    Actualiza tu clave de acceso al sistema
                  </div>
                </div>
              </div>
            </button>

            {/* Botón de Cerrar Sesión */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full p-3.5 rounded-2xl border border-red-200 hover:border-red-300 bg-red-50/60 hover:bg-red-50 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-red-900">
                    Cerrar Sesión
                  </div>
                  <div className="text-xs text-red-700">
                    Salir de la cuenta y volver a la pantalla de acceso
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Formulario de Cambio de PIN */
          <form onSubmit={handlePinSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nuevo PIN (4 dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="Ej: 8492"
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 text-center tracking-widest tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmar nuevo PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="Repite el PIN"
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 text-center tracking-widest tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                />
              </div>
            </div>

            {pinFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2 ${
                  pinFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {pinFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                )}
                <span>{pinFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActiveView('DETAILS');
                  setPinFeedback(null);
                }}
                className="min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[46px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Guardando...' : 'Guardar PIN'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </BottomSheet>
  );
};

