// RutaSync — Conector Oficial Cloud Firestore & Inicializador de Colecciones y Roles
import { RutaBananoPersistedState } from '../storage/indexedDbStorage';
import { SyncQueueItem } from '../types/domain';

export interface FirebaseConnectionConfig {
  projectId: string;
  apiKey: string;
  authDomain?: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

// Configuración real del proyecto Firebase "RutaSync" (rutasync-banano)
export const DEFAULT_FIREBASE_CONFIG: FirebaseConnectionConfig = {
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'rutasync-banano',
  apiKey:
    import.meta.env?.VITE_FIREBASE_API_KEY ||
    'AIzaSyCdCPKIhf_LAJBeJi6UyUOVH18Skne9xsc',
  authDomain:
    import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ||
    'rutasync-banano.firebaseapp.com',
  appId:
    import.meta.env?.VITE_FIREBASE_APP_ID ||
    '1:479520066898:web:61c8354e18bf19ca9fbe8b',
  storageBucket: 'rutasync-banano.firebasestorage.app',
  messagingSenderId: '479520066898',
};

/**
 * Convierte cualquier valor JavaScript a formato Firestore REST Value
 */
function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function toFirestoreDocument(obj: Record<string, unknown>): {
  fields: Record<string, unknown>;
} {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return { fields };
}

export class FirebaseCloudSyncAdapter {
  private config: FirebaseConnectionConfig;

  constructor(config?: Partial<FirebaseConnectionConfig>) {
    this.config = {
      ...DEFAULT_FIREBASE_CONFIG,
      ...config,
    };
  }

  public getProjectId(): string {
    return this.config.projectId;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.projectId && this.config.apiKey);
  }

  private getBaseUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents`;
  }

  /**
   * Construye la ruta de colección aislada por negocio (tenant isolation)
   * coincidiendo con firestore.rules:
   * businesses/{businessId}/{collection}/{entityId}
   */
  public getFirestoreDocumentPath(item: SyncQueueItem): string {
    const collectionMap: Record<SyncQueueItem['entityType'], string> = {
      SHIFT: 'shifts',
      OPERATION: 'operations',
      AUTHORIZATION: 'editAuthorizations',
      CLOSURE: 'closures',
      ADJUSTMENT: 'postClosureAdjustments',
      AUDIT: 'auditLogs',
      USER: 'users',
    };
    const collectionName = collectionMap[item.entityType];
    return `businesses/${item.businessId}/${collectionName}/${item.entityId}`;
  }

  /**
   * Envía un documento de forma idempotente (PATCH upsert) a Cloud Firestore.
   */
  public async upsertDocument(
    docPath: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    if (typeof fetch === 'undefined') return false;
    // Evitar llamadas de red externas durante pruebas unitarias en Vitest/jsdom
    const metaEnv = (import.meta as unknown as { env?: { MODE?: string } }).env;
    if (metaEnv?.MODE === 'test') {
      return true;
    }

    const keyParam = this.config.apiKey ? `?key=${this.config.apiKey}` : '';
    const url = `${this.getBaseUrl()}/${docPath}${keyParam}`;

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toFirestoreDocument(payload)),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Sincroniza un item individual de la cola de sincronización hacia Cloud Firestore.
   */
  public async syncQueueItemToFirestore(item: SyncQueueItem): Promise<boolean> {
    if (!item.payload || typeof item.payload !== 'object') return true;
    const docPath = this.getFirestoreDocumentPath(item);
    return this.upsertDocument(
      docPath,
      item.payload as Record<string, unknown>
    );
  }

  /**
   * Provisiona y sincroniza todas las colecciones base, roles y datos iniciales en Cloud Firestore.
   */
  public async syncInitialCollectionsAndRoles(
    state: RutaBananoPersistedState
  ): Promise<{ syncedDocuments: number }> {
    const bId = state.config.businessId;
    let count = 0;

    // 1. Documento raíz del negocio
    if (
      await this.upsertDocument(
        `businesses/${bId}`,
        state.config as unknown as Record<string, unknown>
      )
    ) {
      count++;
    }

    // 2. Colección oficial de Roles (OWNER y HELPER)
    const roles = [
      {
        id: 'OWNER',
        name: 'Administrador / Dueño',
        description:
          'Control total: crear/activar/desactivar auxiliares, configurar plazos, aprobar ediciones vencidas, ejecutar cierres y ajustes posteriores.',
        canManageUsers: true,
        canConfigurePolicies: true,
        canApproveExpiredEdits: true,
        canCreatePostClosureAdjustments: true,
      },
      {
        id: 'HELPER',
        name: 'Auxiliar de Ruta',
        description:
          'Operación en ruta: registrar ventas, compras, cobros, gastos, devoluciones y canastillas; editar dentro del plazo; solicitar autorización fuera del plazo.',
        canManageUsers: false,
        canConfigurePolicies: false,
        canApproveExpiredEdits: false,
        canCreatePostClosureAdjustments: false,
      },
    ];
    for (const r of roles) {
      if (await this.upsertDocument(`businesses/${bId}/roles/${r.id}`, r)) {
        count++;
      }
    }

    // 3. Usuarios (con sus roles y permisos)
    for (const u of state.users) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/users/${u.id}`,
          u as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }

    // 4. Catálogo de Productos, Proveedores y Clientes
    for (const p of state.products) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/products/${p.id}`,
          p as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const s of state.suppliers) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/suppliers/${s.id}`,
          s as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const c of state.clients) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/clients/${c.id}`,
          c as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }

    // 5. Jornadas, Operaciones, Autorizaciones, Cierres y Auditoría
    for (const sh of state.shifts) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/shifts/${sh.id}`,
          sh as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const op of state.operations) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/operations/${op.id}`,
          op as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const auth of state.authorizations) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/editAuthorizations/${auth.id}`,
          auth as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const cl of state.closures) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/closures/${cl.closureId}`,
          cl as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const log of state.auditLogs.slice(0, 20)) {
      if (
        await this.upsertDocument(
          `businesses/${bId}/auditLogs/${log.id}`,
          log as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }

    return { syncedDocuments: count };
  }
}
