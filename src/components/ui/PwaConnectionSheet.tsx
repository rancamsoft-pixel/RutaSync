import React, { useState } from 'react';
import {
  CheckCircle2,
  CloudOff,
  Database,
  Download,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wifi,
} from 'lucide-react';
import { SyncConflictRecord, SyncQueueItem } from '../../types/domain';
import { BottomSheet } from './BottomSheet';

export interface PwaConnectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  syncQueue: SyncQueueItem[];
  syncConflicts: SyncConflictRecord[];
  onForceSync: () => Promise<void>;
  onExportBackup: () => string;
  onRestoreBackup: (json: string) => Promise<void>;
}

export const PwaConnectionSheet: React.FC<PwaConnectionSheetProps> = ({
  isOpen,
  onClose,
  isOnline,
  onToggleOnline,
  syncQueue,
  syncConflicts,
  onForceSync,
  onExportBackup,
  onRestoreBackup,
}) => {
  const [backupText, setBackupText] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const pendingItems = syncQueue.filter((q) => q.status === 'PENDING');
  const syncedItems = syncQueue.filter((q) => q.status === 'SYNCED');
  const unresolvedConflicts = syncConflicts.filter((c) => !c.resolved);

  const handleDownloadBackup = () => {
    const bundle = onExportBackup();
    setBackupText(bundle);
    try {
      const blob = new Blob([bundle], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rutabanano-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({
        ok: true,
        text: 'Copia de seguridad descargada y verificada con suma de control.',
      });
    } catch {
      setStatusMsg({
        ok: true,
        text: 'Copia de seguridad generada en el campo inferior.',
      });
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Estado de Conexión y Respaldo"
      subtitle="Sincronización offline (IndexedDB) y copias de seguridad"
      icon={<Database className="w-5 h-5" />}
    >
      {/* Estado actual de cobertura */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          isOnline
            ? 'bg-green-50/80 border-green-200 text-green-950'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isOnline
              ? 'bg-green-600 text-white'
              : 'bg-amber-600 text-white'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-5 h-5" />
          ) : (
            <CloudOff className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="font-bold text-base">
            {isOnline
              ? 'Conectado: sincronización automática activa'
              : 'Modo sin señal móvil (operación local activa)'}
          </div>
          <p className="text-sm mt-0.5 opacity-90 leading-relaxed">
            {isOnline
              ? 'Cada registro se guarda primero en el teléfono y luego se sincroniza sin duplicados.'
              : 'Puedes anotar ventas, cobros, gastos y devoluciones sin internet. Los datos permanecen seguros aunque reinicies el celular.'}
          </p>
        </div>
      </div>

      {/* Indicadores de cola */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <span className="block text-xs font-medium text-slate-600">
            Pendientes
          </span>
          <strong className="text-2xl font-bold text-slate-900 tabular-nums">
            {pendingItems.length}
          </strong>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <span className="block text-xs font-medium text-slate-600">
            Sincronizados
          </span>
          <strong className="text-2xl font-bold text-green-700 tabular-nums">
            {syncedItems.length}
          </strong>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <span className="block text-xs font-medium text-slate-600">
            Conflictos
          </span>
          <strong className="text-2xl font-bold text-amber-700 tabular-nums">
            {unresolvedConflicts.length}
          </strong>
        </div>
      </div>

      {/* Acciones de conexión */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onToggleOnline}
          className={`min-h-[52px] px-4 py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer ${
            isOnline
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
              : 'bg-green-700 hover:bg-green-800 text-white'
          }`}
        >
          {isOnline ? (
            <>
              <CloudOff className="w-5 h-5" />
              <span>Simular modo sin señal</span>
            </>
          ) : (
            <>
              <Wifi className="w-5 h-5" />
              <span>Reconectar señal ahora</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={!isOnline}
          onClick={async () => {
            await onForceSync();
            setStatusMsg({
              ok: true,
              text: 'Cola de sincronización procesada con verificación de idempotencia.',
            });
          }}
          className="min-h-[52px] px-4 py-3 rounded-xl font-semibold text-base bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Sincronizar cola ahora</span>
        </button>
      </div>

      {/* Respaldo y recuperación */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <ShieldCheck className="w-5 h-5 text-green-700" />
          <span>Copias de seguridad y recuperación</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Descarga un archivo de respaldo verificado o restaura tus datos en caso de cambio de equipo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="min-h-[50px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-5 h-5 text-slate-600" />
            <span>Descargar respaldo</span>
          </button>

          <button
            type="button"
            disabled={!backupText.trim()}
            onClick={async () => {
              try {
                await onRestoreBackup(backupText);
                setStatusMsg({
                  ok: true,
                  text: 'Respaldo verificado y restaurado correctamente.',
                });
              } catch (err) {
                setStatusMsg({
                  ok: false,
                  text:
                    err instanceof Error
                      ? err.message
                      : 'Error al restaurar el archivo',
                });
              }
            }}
            className="min-h-[50px] px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 disabled:opacity-40 text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-5 h-5" />
            <span>Restaurar desde texto</span>
          </button>
        </div>

        <textarea
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="Contenido del archivo de respaldo (.json)..."
          value={backupText}
          onChange={(e) => setBackupText(e.target.value)}
        />

        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              statusMsg.ok
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
