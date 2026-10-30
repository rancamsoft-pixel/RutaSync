// RutaBanano — Modelo de Datos Oficial y Tipos del Dominio

export type Role = 'OWNER' | 'HELPER';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT';

export type OperationType =
  | 'PURCHASE'              // Compra a proveedor
  | 'SALE'                  // Venta a cliente (contado, transferencia o fiado)
  | 'COLLECTION_CURRENT'    // Recaudo / abono a venta de la jornada actual
  | 'COLLECTION_PAST_DEBT'  // Abono a deuda anterior (cartera histórica)
  | 'EXPENSE'               // Gasto de operación o pago de personal
  | 'SUPPLIER_RETURN'       // Devolución al proveedor durante la ruta
  | 'IN_ROUTE_SHRINKAGE'    // Merma autorizada registrada durante la ruta
  | 'INVENTORY_TRANSFER'    // Traslado de inventario (entrada o salida)
  | 'CRATE_MOVEMENT';       // Movimiento de canastillas

export type SupplierCompensationType =
  | 'CASH_REFUND_RECEIVED'  // Reembolso inmediato en efectivo recibido
  | 'CREDIT_BALANCE'        // Saldo a favor con el proveedor
  | 'PRODUCT_EXCHANGE'      // Cambio por otros productos
  | 'PENDING_COMPENSATION'; // Devolución pendiente de compensación (no afecta caja)

export type ExpenseCategory =
  | 'FUEL'                  // Gasolina / ACPM
  | 'TOLL_PARKING'          // Peaje / Parqueadero
  | 'FOOD'                  // Alimentación
  | 'PERSONNEL_PAYMENT'     // Pago de personal / ayudante
  | 'OTHER';                // Otro gasto operativo

export type CrateMovementType =
  | 'DELIVERED_TO_CLIENT'   // Entregadas/prestadas a cliente
  | 'RETURNED_BY_CLIENT'    // Devueltas por cliente
  | 'RECEIVED_FROM_SUPPLIER'// Recibidas del proveedor
  | 'RETURNED_TO_SUPPLIER'; // Devueltas al proveedor

export interface UserAccount {
  id: string;
  businessId: string;
  name: string;
  role: Role;
  pinOrCredentialHash: string; // Nunca en texto plano
  active: boolean;             // Desactivar impide nuevas operaciones y conserva historial
  permissions: {
    canRegisterPurchases: boolean;
    canRegisterSales: boolean;
    canRegisterCollections: boolean;
    canRegisterExpenses: boolean;
    canRegisterReturns: boolean;
    canRegisterCrates: boolean;
    canCloseShiftByDefault: boolean;
  };
  createdAt: number;
  deactivatedAt?: number;
}

export interface ProductCatalogItem {
  id: string;
  businessId: string;
  name: string;
  shortCode?: string; // Abreviación corta para operarios en ruta (ej: "B1", "BC", "PL")
  unit: string; // Ej: "Caja", "Racimo", "Kg", "Canastilla"
  defaultCostPrice: number;
  defaultSalePrice: number;
  active: boolean;
}

export interface SupplierItem {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  creditBalanceInFavor: number; // Saldo a favor nuestro con este proveedor
}

export interface ClientItem {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  historicalPrincipalDebt: number; // Deuda de jornadas anteriores (capital)
  agreedInterestRatePercent: number; // Interés acordado aplicable (%)
  accruedAgreedInterest: number;   // Interés efectivamente acordado/devengado pendiente
  cratesHeld: number;              // Canastillas en poder del cliente
}

export interface ReliableTimestampMeta {
  localCreatedAt: number;
  monotonicOffsetMs: number;
  trustedTimestampMs: number;
  syncedAtMs?: number;
  clockTamperingDetected: boolean;
}

export interface RouteOperationPayload {
  // Campos para PURCHASE / SALE / SUPPLIER_RETURN / IN_ROUTE_SHRINKAGE / INVENTORY_TRANSFER
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  unitCost?: number;
  totalAmount: number;

  // Campos para SALE / COLLECTION_CURRENT / COLLECTION_PAST_DEBT
  clientId?: string;
  clientName?: string;
  paymentMethod?: PaymentMethod;
  amountPaidImmediate?: number; // En ventas mixtas o pagos inmediatos
  principalApplied?: number;    // En abonos a deuda anterior: capital abonado
  interestApplied?: number;     // En abonos a deuda anterior: interés efectivamente cobrado
  referenceSaleId?: string;     // En COLLECTION_CURRENT: ID de la venta de la jornada

  // Campos para SUPPLIER_RETURN
  supplierId?: string;
  supplierName?: string;
  deliveredQuantity?: number;   // Cantidad entregada al proveedor
  acceptedQuantity?: number;    // Cantidad realmente aceptada por el proveedor
  compensationType?: SupplierCompensationType;
  cashRefundReceivedAmount?: number; // Solo si CASH_REFUND_RECEIVED

  // Campos para INVENTORY_TRANSFER
  transferDirection?: 'IN' | 'OUT';

  // Campos para EXPENSE
  expenseCategory?: ExpenseCategory;
  description?: string;

  // Campos para CRATE_MOVEMENT
  crateMovementType?: CrateMovementType;
  crateQuantity?: number;

  // Motivo para mermas o notas generales
  notes?: string;
}

export interface RouteOperation {
  id: string;
  businessId: string;
  unitId: string;
  shiftId: string;
  type: OperationType;
  authorId: string;
  authorName: string;
  authorRole: Role;
  createdAt: number; // Marca temporal confiable de creación individual
  updatedAt: number;
  timeMeta: ReliableTimestampMeta;
  version: number;   // Incrementa en cada modificación para invalidar autorizaciones previas
  fingerprint: string; // Hash determinístico del estado actual de la operación
  payload: RouteOperationPayload;
  lastAuthorizationId?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'CONFLICT';
}

export type AuthorizationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONSUMED'
  | 'INVALIDATED';

export interface EditAuthorizationRequest {
  id: string;
  businessId: string;
  shiftId: string;
  operationId: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: number;
  approvedOperationVersion: number;
  approvedOperationFingerprint: string;
  currentValueSnapshot: RouteOperationPayload;
  requestedValueSnapshot: RouteOperationPayload;
  reason: string;
  status: AuthorizationStatus;
  authorizerId?: string;
  authorizerName?: string;
  authorizedAt?: number;
  rejectionReason?: string;
  verificationToken?: string; // Firma determinística verificable offline/online
  consumedAt?: number;
  invalidatedReason?: string;
  syncStatus: 'PENDING' | 'SYNCED';
}

export interface LeftoverProductClassification {
  productId: string;
  productName: string;
  unit: string;
  unitCost: number;
  expectedFinalInventory: number; // Calculado por fórmula de inventario

  // Clasificación obligatoria del sobrante:
  returnedToSupplierDeliveredQty: number; // Entregada al proveedor en cierre
  returnedToSupplierAcceptedQty: number;  // Realmente aceptada por el proveedor
  supplierId?: string;
  supplierName?: string;
  returnCompensationType: SupplierCompensationType;
  returnCashRefundReceived: number;       // Efectivo realmente recibido por la devolución

  shrinkageQty: number;                   // Dada de baja como merma
  shrinkageReason: string;                // Motivo obligatorio si shrinkageQty > 0

  carriedOverQty: number;                 // Conservada para próxima jornada (sin compra ficticia)
}

export interface ProductInventoryReconciliation {
  productId: string;
  productName: string;
  unit: string;
  unitCost: number;
  initialInventory: number;          // Incluye traslado de jornada previa sin compra ficticia
  purchasesQty: number;
  transfersInQty: number;
  transfersOutQty: number;
  soldQty: number;
  inRouteSupplierReturnDeliveredQty: number;
  inRouteSupplierReturnAcceptedQty: number;
  inRouteShrinkageQty: number;
  expectedFinalInventory: number;    // Inicial + Compras + TrasladosIn - TrasladosOut - Ventas - DevEntregadas - MermasRuta

  // Clasificación en el cierre:
  closureReturnedDeliveredQty: number;
  closureReturnedAcceptedQty: number;
  closurePendingSupplierDiscrepancyQty: number; // Diferencia entre entregado y aceptado
  closureReturnCompensationType: SupplierCompensationType;
  closureReturnCashRefundReceived: number;
  closureShrinkageQty: number;
  closureShrinkageReason: string;
  carriedOverToNextShiftQty: number;

  totalClassifiedQty: number;        // closureReturnedDeliveredQty + closureShrinkageQty + carriedOverToNextShiftQty
  unclassifiedDiscrepancyQty: number;// expectedFinalInventory - totalClassifiedQty (debe ser 0 para cuadrar)
  isSquared: boolean;
}

export interface ShiftFinancialSummary {
  // 1. Ventas de la jornada
  totalSalesAmount: number;
  cashSalesAmount: number;
  transferSalesAmount: number;
  creditSalesAmount: number; // Ventas fiadas originadas en la jornada

  // 2. Recaudo de ventas de la jornada
  collectedFromCurrentSalesCash: number;
  collectedFromCurrentSalesTransfer: number;
  pendingReceivablesFromCurrentSales: number; // Cartera pendiente de la jornada

  // 3. Abonos a deudas anteriores (NO cuentan como ventas nuevas ni utilidad nueva de venta)
  pastDebtPrincipalCollectedCash: number;
  pastDebtPrincipalCollectedTransfer: number;
  pastDebtInterestCollectedCash: number;
  pastDebtInterestCollectedTransfer: number;
  totalPastDebtCollected: number;

  // 4. Cartera total pendiente e intereses aplicables
  totalHistoricalPortfolioPending: number;
  totalAgreedInterestPending: number;
  totalCombinedPortfolioPending: number;

  // 5. Compras, costos y mermas (sin duplicar inventario conservado ni devoluciones)
  totalPurchasesAmount: number;
  carriedOverInitialValuation: number; // Valor informativo del inventario trasladado (no es compra nueva)
  costOfGoodsSold: number;             // Costo estricto de las unidades vendidas
  totalShrinkageLoss: number;          // Pérdida por mermas (en ruta + en cierre)

  // 6. Devoluciones y compensaciones de proveedores
  supplierRefundsCashReceived: number; // Reembolsos recibidos en efectivo (sí entran a caja)
  supplierCreditBalanceGenerated: number; // Saldos a favor (NO entran a caja como efectivo)
  supplierPendingCompensationAmount: number; // Pendiente de compensación (NO entra a caja)
  supplierUnacceptedDiscrepancyUnits: number; // Unidades entregadas pero no aceptadas aún

  // 7. Gastos de operación y pagos de personal
  operatingExpensesCash: number;
  operatingExpensesTransfer: number;
  personnelPaymentsCash: number;
  personnelPaymentsTransfer: number;
  totalExpensesAndPersonnel: number;

  // 8. Distinción estricta: Utilidad Económica vs Efectivo Disponible
  economicGrossProfit: number;         // Ventas de la jornada - Costo de productos vendidos
  economicNetProfit: number;           // Utilidad bruta + Intereses cobrados - Mermas - Gastos y personal
  expectedCashInBox: number;           // Efectivo real esperado en billetes/monedas
  expectedTransfersInBank: number;     // Transferencias esperadas
}

export interface CrateBalanceSummary {
  initialCratesAvailable: number;
  receivedFromSupplier: number;
  returnedToSupplier: number;
  deliveredToClients: number;
  returnedByClients: number;
  finalCratesInVehicle: number;
  totalCratesHeldByClients: number;
}

export interface FrozenShiftSnapshot {
  closureId: string;
  shiftId: string;
  businessId: string;
  unitId: string;
  operatingDate: string;
  closedAt: number;
  closedByUserId: string;
  closedByUserName: string;
  closedByUserRole: Role;
  responsibleUserId: string;
  responsibleUserName: string;
  participantIds: string[];
  participantNames: string[];
  vehicle: string;
  // Instantánea congelada de los 13 puntos obligatorios
  operationsSnapshot: RouteOperation[];
  inventoryReconciliation: ProductInventoryReconciliation[];
  financialSummary: ShiftFinancialSummary;
  crateSummary: CrateBalanceSummary;
  countedCash: number;
  countedTransfers: number;
  cashDifference: number;      // countedCash - expectedCashInBox
  transferDifference: number;  // countedTransfers - expectedTransfersInBank
  differenceExplanation: string;
  differenceAcknowledged: boolean;
  snapshotHash: string;
}

export interface RouteShift {
  id: string;
  businessId: string;
  unitId: string; // Unidad operativa (ej. "RUTA-PRINCIPAL-01")
  operatingDate: string;
  status: 'OPEN' | 'CLOSED';
  responsibleUserId: string;
  responsibleUserName: string;
  responsibleUserRole: Role;
  participantIds: string[];
  participantNames: string[];
  vehicle: string;
  initialCash: number;
  initialCrates: number;
  initialInventory: Record<string, number>; // productId -> cantidad inicial disponible
  carriedOverFromShiftId?: string;          // Si viene trasladado de jornada anterior sin compra ficticia
  editWindowMinutes: number;                // Admite 0 y otros valores configurados por el dueño
  allowResponsibleHelperClose: boolean;     // Independiente de los permisos de edición
  createdAt: number;
  createdByUserId: string;
  closedAt?: number;
  closedByUserId?: string;
  closureId?: string;
}

export interface PostClosureAdjustment {
  id: string;
  businessId: string;
  shiftId: string;
  closureId: string;                // Referencia obligatoria al cierre histórico inmutable
  referencedOperationId?: string;   // Referencia al registro original
  createdAt: number;
  authorizerId: string;             // Debe ser OWNER
  authorizerName: string;
  reason: string;                   // Motivo obligatorio
  adjustmentType: 'FINANCIAL_CORRECTION' | 'INVENTORY_CORRECTION' | 'PORTFOLIO_CORRECTION';
  previousValueSummary: Record<string, unknown>;
  correctedValueSummary: Record<string, unknown>;
  monetaryDeltaCash: number;
  monetaryDeltaProfit: number;
  monetaryDeltaPortfolio: number;
  auditRecordId: string;
}

export interface AuditLogEntry {
  id: string;
  businessId: string;
  shiftId?: string;
  operationId?: string;
  closureId?: string;
  authorizationId?: string;
  adjustmentId?: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorRole: Role;
  authorizerId?: string;
  authorizerName?: string;
  actionType:
    | 'SHIFT_OPENED'
    | 'OPERATION_CREATED'
    | 'OPERATION_EDITED_WITHIN_WINDOW'
    | 'EDIT_AUTH_REQUESTED'
    | 'EDIT_AUTH_APPROVED'
    | 'EDIT_AUTH_REJECTED'
    | 'EDIT_AUTH_INVALIDATED'
    | 'OPERATION_EDITED_WITH_AUTHORIZATION'
    | 'UNAUTHORIZED_ACTION_BLOCKED'
    | 'SHIFT_CLOSED_DEFINITIVELY'
    | 'POST_CLOSURE_ADJUSTMENT_CREATED'
    | 'USER_STATUS_CHANGED'
    | 'POLICY_CONFIG_CHANGED'
    | 'SYNC_CONFLICT_DETECTED';
  reason: string;
  previousValue: unknown;
  newValue: unknown;
  result: 'SUCCESS' | 'REJECTED';
}

export interface SyncQueueItem {
  id: string;
  idempotencyKey: string;
  businessId: string;
  entityType: 'SHIFT' | 'OPERATION' | 'AUTHORIZATION' | 'CLOSURE' | 'ADJUSTMENT' | 'AUDIT' | 'USER';
  entityId: string;
  action: 'CREATE' | 'UPDATE';
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED_AUTH';
  errorMessage?: string;
}

export interface SyncConflictRecord {
  id: string;
  queueItemId: string;
  entityType: string;
  entityId: string;
  localPayload: unknown;
  remotePayload: unknown;
  detectedAt: number;
  resolved: boolean;
  resolutionStrategy?: 'KEEP_LOCAL_AS_ADJUSTMENT' | 'ACCEPT_REMOTE_PRESERVE_LOCAL_AUDIT';
  resolvedByUserId?: string;
  resolvedAt?: number;
}

export interface BusinessConfig {
  businessId: string;
  businessName: string;
  defaultUnitId: string;
  editWindowMinutes: number; // Ej: 0, 5, 15, 30, 60, 120
  allowedEditWindowOptions: number[];
  allowResponsibleHelperCloseByDefault: boolean;
  requireOwnerForPastCloseAdjustments: boolean;
}

