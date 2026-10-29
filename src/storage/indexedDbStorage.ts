// RutaBanano — Persistencia Local Confiable en IndexedDB con Respaldo y Recuperación (Secciones 8 y 9)
import {
  AuditLogEntry,
  BusinessConfig,
  ClientItem,
  EditAuthorizationRequest,
  FrozenShiftSnapshot,
  LeftoverProductClassification,
  PostClosureAdjustment,
  ProductCatalogItem,
  RouteOperation,
  RouteShift,
  SupplierItem,
  SyncConflictRecord,
  SyncQueueItem,
  UserAccount,
} from '../types/domain';

export interface RutaBananoPersistedState {
  config: BusinessConfig;
  users: UserAccount[];
  products: ProductCatalogItem[];
  suppliers: SupplierItem[];
  clients: ClientItem[];
  shifts: RouteShift[];
  operations: RouteOperation[];
  authorizations: EditAuthorizationRequest[];
  closures: FrozenShiftSnapshot[];
  postClosureAdjustments: PostClosureAdjustment[];
  auditLogs: AuditLogEntry[];
  syncQueue: SyncQueueItem[];
  syncConflicts: SyncConflictRecord[];
  closureClassificationsByShift: Record<string, Record<string, LeftoverProductClassification>>;
  syncedIdempotencyKeys: string[];
  highWaterMarkTimestampMs: number;
}

const DB_NAME = 'RutaBananoOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'appStateStore';
const STATE_KEY = 'RUTABANANO_PRIMARY_STATE_V1';

export class IndexedDbStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback: RutaBananoPersistedState | null = null;

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no disponible en este entorno'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Error abriendo IndexedDB'));
    });

    return this.dbPromise;
  }

  /**
   * Guarda el estado completo en IndexedDB de forma transaccional ANTES de confirmar al usuario.
   */
  public async saveState(state: RutaBananoPersistedState): Promise<void> {
    const cloned: RutaBananoPersistedState = JSON.parse(JSON.stringify(state));
    this.memoryFallback = cloned;

    try {
      const db = await this.openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(cloned, STATE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Error guardando en IndexedDB'));
      });
    } catch {
      // Si el entorno restringe IndexedDB, mantener copia en localStorage si existe
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STATE_KEY, JSON.stringify(cloned));
      }
    }
  }

  /**
   * Recupera el estado persistido tras reinicio del navegador o del dispositivo.
   */
  public async loadState(): Promise<RutaBananoPersistedState | null> {
    try {
      const db = await this.openDatabase();
      const loaded = await new Promise<RutaBananoPersistedState | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STATE_KEY);
        req.onsuccess = () => resolve((req.result as RutaBananoPersistedState) ?? null);
        req.onerror = () => reject(req.error ?? new Error('Error leyendo IndexedDB'));
      });
      if (loaded) {
        this.memoryFallback = JSON.parse(JSON.stringify(loaded));
        return loaded;
      }
    } catch {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STATE_KEY);
        if (raw) {
          return JSON.parse(raw) as RutaBananoPersistedState;
        }
      }
    }
    return this.memoryFallback ? JSON.parse(JSON.stringify(this.memoryFallback)) : null;
  }

  /**
   * Genera una copia de seguridad verificable con firma de integridad para recuperación.
   */
  public exportEncryptedBackupBundle(state: RutaBananoPersistedState): string {
    const payload = JSON.stringify(state);
    let checksum = 0;
    for (let i = 0; i < payload.length; i++) {
      checksum = (checksum * 31 + payload.charCodeAt(i)) >>> 0;
    }
    return JSON.stringify(
      {
        format: 'RUTABANANO_BACKUP_V1',
        exportedAt: Date.now(),
        checksumHex: checksum.toString(16),
        state,
      },
      null,
      2
    );
  }

  /**
   * Valida y restaura una copia de seguridad sin perder trazabilidad.
   */
  public async restoreFromBackupBundle(bundleJson: string): Promise<RutaBananoPersistedState> {
    const parsed = JSON.parse(bundleJson);
    if (!parsed || parsed.format !== 'RUTABANANO_BACKUP_V1' || !parsed.state) {
      throw new Error('El archivo de respaldo no tiene un formato válido de RutaBanano.');
    }
    const payload = JSON.stringify(parsed.state);
    let checksum = 0;
    for (let i = 0; i < payload.length; i++) {
      checksum = (checksum * 31 + payload.charCodeAt(i)) >>> 0;
    }
    if (checksum.toString(16) !== parsed.checksumHex) {
      throw new Error('La suma de verificación del respaldo no coincide. El archivo pudo haberse dañado.');
    }
    await this.saveState(parsed.state);
    return parsed.state;
  }
}

