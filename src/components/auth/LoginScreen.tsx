import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Leaf,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from 'lucide-react';
import { UserAccount } from '../../types/domain';

export interface LoginScreenProps {
  initialUsername?: string;
  onLoginSuccess: (user: UserAccount) => void;
  onAuthenticate: (
    usernameOrEmail: string,
    password: string
  ) => { ok: boolean; user?: UserAccount; message: string };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  initialUsername = '',
  onLoginSuccess,
  onAuthenticate,
}) => {
  const [username, setUsername] = useState<string>(
    initialUsername ||
      localStorage.getItem('rutasync_remember_user') ||
      'admon@ruta.com'
  );
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMessage('Ingresa tu usuario o correo electrónico.');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Ingresa tu contraseña de acceso.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = onAuthenticate(cleanUser, cleanPass);
      if (res.ok && res.user) {
        if (rememberMe) {
          localStorage.setItem('rutasync_remember_user', cleanUser);
        } else {
          localStorage.removeItem('rutasync_remember_user');
        }
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(
          res.message || 'Credenciales incorrectas. Verifica tu usuario y contraseña.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (userDemo: string, passDemo: string) => {
    setUsername(userDemo);
    setPassword(passDemo);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 bg-radial from-emerald-950/40 via-slate-950/80 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Contenedor Principal Centrado */}
      <div className="w-full max-w-md space-y-6 relative z-10">
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

        {/* Tarjeta de Inicio de Sesión Web Profesional */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 text-slate-900 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-extrabold text-slate-900">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa tus credenciales corporativas para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo 1: Usuario o Correo */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Usuario o Correo
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="admon@ruta.com"
                  className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-2xl border border-slate-300 bg-slate-50/60 text-slate-900 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
                  value={username}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setUsername(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Campo 2: Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? (
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

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full min-h-[48px] pl-11 pr-11 py-2.5 rounded-2xl border border-slate-300 bg-slate-50/60 text-slate-900 text-sm font-bold tracking-wider placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
                  value={password}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setPassword(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Opciones: Recordar sesión & Ayuda */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Recordar sesión</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  alert(
                    'Por motivos de seguridad, la recuperación de contraseñas de ruta debe ser autorizada directamente por el Dueño / Administrador Don Carlos.'
                  )
                }
                className="text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Alerta de Error */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm font-medium flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Botón Principal de Inicio de Sesión */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}</span>
            </button>
          </form>

          {/* Sección de Credenciales Demo / Pruebas */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowDemoCredentials(!showDemoCredentials)}
              className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 py-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {showDemoCredentials
                  ? 'Ocultar cuentas de prueba'
                  : 'Ver cuentas de prueba de demostración'}
              </span>
            </button>

            {showDemoCredentials && (
              <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Cuentas disponibles para pruebas:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('admon@ruta.com', '193782')}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Dueño / Admin</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1 rounded font-extrabold">
                        Auto-llenar
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      <strong>admon@ruta.com</strong> · Clave: <strong>193782</strong>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillDemo('pedro', '5678')}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Auxiliar</span>
                      <span className="text-[10px] text-slate-700 bg-slate-100 px-1 rounded font-extrabold">
                        Auto-llenar
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      User: <strong>pedro</strong> · Clave: <strong>5678</strong>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie de Seguridad Corporativo */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Acceso Protegido SSL · Cifrado Local Offline-First</span>
        </div>
      </div>
    </div>
  );
};
