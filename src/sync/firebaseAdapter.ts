// RutaSync — Conector Oficial Cloud Firestore & Inicializador de Colecciones y Roles
import { RutaBananoPersistedState } from '../storage/indexedDbStorage';
import {
  AuditLogEntry,
  BusinessConfig,
  ClientItem,
  EditAuthorizationRequest,
  FrozenShiftSnapshot,
  PostClosureAdjustment,
  ProductCatalogItem,
  RouteOperation,
  RouteShift,
  SupplierItem,
  SyncQueueItem,
  UserAccount,
} from '../types/domain';

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

/**
 * Convierte un valor Firestore REST Value de regreso a JavaScript nativo
 */
function fromFirestoreValue(valObj: Record<string, unknown>): unknown {
  if ('nullValue' in valObj) return null;
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('stringValue' in valObj) return String(valObj.stringValue);
  if ('timestampValue' in valObj) return String(valObj.timestampValue);
  if ('arrayValue' in valObj) {
    const arr = valObj.arrayValue as { values?: Record<string, unknown>[] };
    return (arr?.values ?? []).map((v) => fromFirestoreValue(v));
  }
  if ('mapValue' in valObj) {
    const map = valObj.mapValue as { fields?: Record<string, Record<string, unknown>> };
    const out: Record<string, unknown> = {};
    if (map?.fields) {
      for (const [k, v] of Object.entries(map.fields)) {
        out[k] = fromFirestoreValue(v);
      }
    }
    return out;
  }
  return null;
}

export function fromFirestoreDocument<T = Record<string, unknown>>(doc: {
  fields?: Record<string, Record<string, unknown>>;
}): T {
  const out: Record<string, unknown> = {};
  if (doc?.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      out[k] = fromFirestoreValue(v);
    }
  }
  return out as T;
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

  private getCollectionName(entityType: SyncQueueItem['entityType']): string {
    const collectionMap: Record<SyncQueueItem['entityType'], string> = {
      SHIFT: 'shifts',
      OPERATION: 'operations',
      AUTHORIZATION: 'editAuthorizations',
      CLOSURE: 'closures',
      ADJUSTMENT: 'postClosureAdjustments',
      AUDIT: 'auditLogs',
      USER: 'users',
    };
    return collectionMap[entityType];
  }

  /**
   * Construye la ruta de colección aislada por negocio (tenant isolation):
   * businesses/{businessId}/{collection}/{entityId}
   */
  public getFirestoreDocumentPath(item: SyncQueueItem): string {
    const collectionName = this.getCollectionName(item.entityType);
    return `businesses/${item.businessId}/${collectionName}/${item.entityId}`;
  }

  /**
   * Construye la ruta de colección de primer nivel:
   * {collection}/{entityId}
   */
  public getRootFirestoreDocumentPath(item: SyncQueueItem): string {
    const collectionName = this.getCollectionName(item.entityType);
    return `${collectionName}/${item.entityId}`;
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
   * Guarda un documento simultáneamente en la colección de primer nivel
   * y en la subcolección del negocio para máxima visibilidad y trazabilidad.
   */
  public async upsertEntityBothLevels(
    businessId: string,
    collectionName: string,
    docId: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    const [rootOk, tenantOk] = await Promise.all([
      this.upsertDocument(`${collectionName}/${docId}`, payload),
      this.upsertDocument(
        `businesses/${businessId}/${collectionName}/${docId}`,
        payload
      ),
    ]);
    return rootOk || tenantOk;
  }

  /**
   * Sincroniza un item individual de la cola de sincronización hacia Cloud Firestore.
   */
  public async syncQueueItemToFirestore(item: SyncQueueItem): Promise<boolean> {
    if (!item.payload || typeof item.payload !== 'object') return true;
    const collectionName = this.getCollectionName(item.entityType);
    return this.upsertEntityBothLevels(
      item.businessId,
      collectionName,
      item.entityId,
      item.payload as Record<string, unknown>
    );
  }

  /**
   * Obtiene todos los documentos de una colección en Cloud Firestore.
   */
  public async listCollectionDocuments<T = Record<string, unknown>>(
    collectionPath: string
  ): Promise<T[]> {
    if (typeof fetch === 'undefined') return [];
    const metaEnv = (import.meta as unknown as { env?: { MODE?: string } }).env;
    if (metaEnv?.MODE === 'test') return [];

    const keyParam = this.config.apiKey ? `&key=${this.config.apiKey}` : '';
    const url = `${this.getBaseUrl()}/${collectionPath}?pageSize=200${keyParam}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = (await response.json()) as {
        documents?: { fields?: Record<string, Record<string, unknown>> }[];
      };
      if (!data.documents) return [];
      return data.documents.map((doc) => fromFirestoreDocument<T>(doc));
    } catch {
      return [];
    }
  }

  /**
   * Descarga e hidrata el estado completo desde Cloud Firestore.
   */
  public async fetchRemoteStateFromFirestore(
    currentState: RutaBananoPersistedState
  ): Promise<RutaBananoPersistedState | null> {
    if (typeof fetch === 'undefined') return null;
    const metaEnv = (import.meta as unknown as { env?: { MODE?: string } }).env;
    if (metaEnv?.MODE === 'test') return null;

    try {
      const [
        businesses,
        users,
        products,
        suppliers,
        clients,
        shifts,
        operations,
        authorizations,
        closures,
        postClosureAdjustments,
        auditLogs,
      ] = await Promise.all([
        this.listCollectionDocuments<BusinessConfig>('businesses'),
        this.listCollectionDocuments<UserAccount>('users'),
        this.listCollectionDocuments<ProductCatalogItem>('products'),
        this.listCollectionDocuments<SupplierItem>('suppliers'),
        this.listCollectionDocuments<ClientItem>('clients'),
        this.listCollectionDocuments<RouteShift>('shifts'),
        this.listCollectionDocuments<RouteOperation>('operations'),
        this.listCollectionDocuments<EditAuthorizationRequest>(
          'editAuthorizations'
        ),
        this.listCollectionDocuments<FrozenShiftSnapshot>('closures'),
        this.listCollectionDocuments<PostClosureAdjustment>(
          'postClosureAdjustments'
        ),
        this.listCollectionDocuments<AuditLogEntry>('auditLogs'),
      ]);

      if (users.length === 0 && shifts.length === 0) {
        return null;
      }

      const businessConfig =
        businesses.find(
          (b) => b.businessId === currentState.config.businessId
        ) ?? currentState.config;

      return {
        ...currentState,
        config: businessConfig,
        users: users.length > 0 ? users : currentState.users,
        products: products.length > 0 ? products : currentState.products,
        suppliers: suppliers.length > 0 ? suppliers : currentState.suppliers,
        clients: clients.length > 0 ? clients : currentState.clients,
        shifts: shifts.length > 0 ? shifts : currentState.shifts,
        operations:
          operations.length > 0
            ? operations.sort((a, b) => b.createdAt - a.createdAt)
            : currentState.operations,
        authorizations:
          authorizations.length > 0
            ? authorizations.sort((a, b) => b.requestedAt - a.requestedAt)
            : currentState.authorizations,
        closures:
          closures.length > 0
            ? closures.sort((a, b) => b.closedAt - a.closedAt)
            : currentState.closures,
        postClosureAdjustments:
          postClosureAdjustments.length > 0
            ? postClosureAdjustments.sort((a, b) => b.createdAt - a.createdAt)
            : currentState.postClosureAdjustments,
        auditLogs:
          auditLogs.length > 0
            ? auditLogs.sort((a, b) => b.timestamp - a.timestamp)
            : currentState.auditLogs,
      };
    } catch {
      return null;
    }
  }

  /**
   * Provisiona y sincroniza todas las colecciones base, roles y datos en Cloud Firestore
   * tanto en colecciones raíz (/users, /roles, /products, /suppliers, /clients, /shifts,
   * /operations, /editAuthorizations, /closures, /postClosureAdjustments, /auditLogs)
   * como bajo /businesses/{businessId}/...
   */
  public async syncInitialCollectionsAndRoles(
    state: RutaBananoPersistedState
  ): Promise<{ syncedDocuments: number }> {
    const bId = state.config.businessId;
    let count = 0;

    // 1. Documento del negocio en /businesses/{bId}
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
        businessId: bId,
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
        businessId: bId,
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
      if (await this.upsertEntityBothLevels(bId, 'roles', r.id, r)) {
        count++;
      }
    }

    // 3. Colección de Usuarios (users)
    for (const u of state.users) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'users',
          u.id,
          u as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }

    // 4. Catálogos de Productos (products), Proveedores (suppliers) y Clientes (clients)
    for (const p of state.products) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'products',
          p.id,
          p as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const s of state.suppliers) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'suppliers',
          s.id,
          s as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const c of state.clients) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'clients',
          c.id,
          c as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }

    // 5. Jornadas (shifts), Operaciones (operations), Autorizaciones (editAuthorizations),
    //    Cierres (closures), Ajustes Post-Cierre (postClosureAdjustments) y Auditoría (auditLogs)
    for (const sh of state.shifts) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'shifts',
          sh.id,
          sh as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const op of state.operations) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'operations',
          op.id,
          op as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const auth of state.authorizations) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'editAuthorizations',
          auth.id,
          auth as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const cl of state.closures) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'closures',
          cl.closureId,
          cl as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const adj of state.postClosureAdjustments) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'postClosureAdjustments',
          adj.id,
          adj as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }
    for (const log of state.auditLogs.slice(0, 25)) {
      if (
        await this.upsertEntityBothLevels(
          bId,
          'auditLogs',
          log.id,
          log as unknown as Record<string, unknown>
        )
      ) {
        count++;
      }
    }

    return { syncedDocuments: count };
  }
}
