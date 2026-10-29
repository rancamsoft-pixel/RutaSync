import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  Edit3,
  FileCheck2,
  Fuel,
  History,
  KeyRound,
  Lock,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sunrise,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  NavTabId,
  ResponsivePwaShell,
} from './components/layout/ResponsivePwaShell';
import { AuthLoginSheet } from './components/ui/AuthLoginSheet';
import { BottomSheet } from './components/ui/BottomSheet';
import { PwaConnectionSheet } from './components/ui/PwaConnectionSheet';
import {
  SkeletonMetricsCard,
  SkeletonOperationList,
} from './components/ui/SkeletonLoaders';
import {
  AcceptanceTestResult,
  runAll15MandatoryAcceptanceTests,
} from './domain/acceptanceVerifier';
import { RutaBananoCoreService } from './domain/rutaBananoCore';
import { MANDATORY_EXPIRED_EDIT_WARNING } from './domain/securityEngine';
import {
  IndexedDbStorageEngine,
  RutaBananoPersistedState,
} from './storage/indexedDbStorage';
import {
  CrateMovementType,
  ExpenseCategory,
  OperationType,
  PaymentMethod,
  RouteOperation,
  SupplierCompensationType,
} from './types/domain';

const storageEngine = new IndexedDbStorageEngine();
const coreService = new RutaBananoCoreService(undefined, storageEngine);

function formatCOP(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-CO')}`;
}

export function App() {
  const [state, setState] = useState<RutaBananoPersistedState>(
    coreService.getState()
  );
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [connectionSheetOpen, setConnectionSheetOpen] = useState<boolean>(false);
  const [authSheetOpen, setAuthSheetOpen] = useState<boolean>(false);

  const [activeUserId, setActiveUserId] = useState<string>('USR-HELPER-01');
  const [activeTab, setActiveTab] = useState<NavTabId>('OPERATE');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // Estado para crear nueva operación (Bottom Sheet)
  const [newOpModalType, setNewOpModalType] = useState<OperationType | null>(
    null
  );
  const [opProductId, setOpProductId] = useState<string>('PROD-BANANO-PRIMERA');
  const [opClientId, setOpClientId] = useState<string>('CLI-DON-JOSE');
  const [opSupplierId, setOpSupplierId] = useState<string>('SUP-ESPERANZA');
  const [opQuantity, setOpQuantity] = useState<number>(5);
  const [opUnitPrice, setOpUnitPrice] = useState<number>(38000);
  const [opPaymentMethod, setOpPaymentMethod] =
    useState<PaymentMethod>('CASH');
  const [opPaidImmediate, setOpPaidImmediate] = useState<number>(0);
  const [opCollectionKind, setOpCollectionKind] = useState<'CURRENT' | 'PAST'>(
    'PAST'
  );
  const [opCollectionAmount, setOpCollectionAmount] = useState<number>(50000);
  const [opCollectionInterest, setOpCollectionInterest] =
    useState<number>(2400);
  const [opExpenseCategory, setOpExpenseCategory] =
    useState<ExpenseCategory>('FUEL');
  const [opExpenseAmount, setOpExpenseAmount] = useState<number>(35000);
  const [opDeliveredQty, setOpDeliveredQty] = useState<number>(2);
  const [opAcceptedQty, setOpAcceptedQty] = useState<number>(2);
  const [opCompensationType, setOpCompensationType] =
    useState<SupplierCompensationType>('CREDIT_BALANCE');
  const [opCrateType, setOpCrateType] = useState<CrateMovementType>(
    'DELIVERED_TO_CLIENT'
  );
  const [opNotes, setOpNotes] = useState<string>('');

  // Estado para editar / solicitar autorización de operación existente (Bottom Sheet)
  const [editingOp, setEditingOp] = useState<RouteOperation | null>(null);
  const [editNewAmount, setEditNewAmount] = useState<number>(0);
  const [editNewQty, setEditNewQty] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');
  const [editWarningConfirmed, setEditWarningConfirmed] =
    useState<boolean>(false);

  // Estado del asistente paso a paso de cierre (4 pasos)
  const [closureStep, setClosureStep] = useState<1 | 2 | 3 | 4>(1);
  const [countedCashInput, setCountedCashInput] = useState<number>(0);
  const [countedTransferInput, setCountedTransferInput] = useState<number>(0);
  const [diffAcknowledged, setDiffAcknowledged] = useState<boolean>(false);
  const [diffExplanation, setDiffExplanation] = useState<string>('');
  const [finalConfirmChecked, setFinalConfirmChecked] =
    useState<boolean>(false);

  // Estado para Ajuste Posterior sobre cierre congelado
  const [adjClosureId, setAdjClosureId] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjDeltaCash, setAdjDeltaCash] = useState<number>(10000);
  const [adjDeltaProfit, setAdjDeltaProfit] = useState<number>(10000);

  // Estado para nuevo auxiliar
  const [newHelperName, setNewHelperName] = useState<string>('');
  const [newHelperPin] = useState<string>('1122');

  // Estado para las 15 pruebas obligatorias
  const [testResults, setTestResults] = useState<AcceptanceTestResult[] | null>(
    null
  );
  const [runningTests, setRunningTests] = useState<boolean>(false);
  const [, setClockTick] = useState<number>(0);

  const refreshState = () => {
    setState({ ...coreService.getState() });
  };

  useEffect(() => {
    coreService.initializeFromStorage().then(async (loaded) => {
      setState({ ...loaded });
      const activeShift = coreService.getActiveShiftForUnit();
      if (activeShift) {
        const preview = coreService.getShiftReconciliationPreview(
          activeShift.id
        );
        setCountedCashInput(preview.financials.expectedCashInBox);
        setCountedTransferInput(preview.financials.expectedTransfersInBank);
      }
      setIsHydrating(false);

      // Hidratar y sincronizar todas las colecciones con Cloud Firestore (rutasync-banano)
      try {
        const remote = await coreService.pullFromFirebase();
        setState({ ...remote });
        await coreService.firebaseAdapter.syncInitialCollectionsAndRoles(
          coreService.getState()
        );
      } catch {
        // Si inicia sin cobertura móvil, continúa operando con IndexedDB local
      }
    });

    runAll15MandatoryAcceptanceTests().then((res) => {
      setTestResults(res.results);
    });

    const timer = setInterval(() => {
      setClockTick((t) => t + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const currentUser =
    state.users.find((u) => u.id === activeUserId) ?? state.users[0];
  const activeShift =
    state.shifts.find((s) => s.status === 'OPEN') ?? state.shifts[0];
  const reconciliation = activeShift
    ? coreService.getShiftReconciliationPreview(activeShift.id)
    : null;

  const pendingSyncCount = state.syncQueue.filter(
    (q) => q.status === 'PENDING'
  ).length;
  const pendingAuthRequests = state.authorizations.filter(
    (a) => a.status === 'PENDING'
  );

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    coreService.setOnlineStatus(next);
    if (next) {
      const res = await coreService.processSyncQueue();
      setFeedback({
        type: 'success',
        text: `Conexión restablecida. Se sincronizaron ${res.syncedCount} operaciones pendientes sin duplicados.`,
      });
    } else {
      setFeedback({
        type: 'warning',
        text: 'Modo sin señal activado. Todos los registros se guardan en la memoria del dispositivo y se enviarán al recuperar cobertura.',
      });
    }
    refreshState();
  };

  const handleAdvanceClock = (minutes: number) => {
    coreService.timeEngine.advanceSimulatedTimeMs(minutes * 60_000);
    setClockTick((t) => t + 1);
    setFeedback({
      type: 'warning',
      text: `Reloj adelantado +${minutes} minutos para comprobar el vencimiento individual de edición.`,
    });
  };

  const openOperationModal = (type: OperationType) => {
    setFeedback(null);
    setNewOpModalType(type);
    const defaultProd = state.products[0];
    setOpProductId(defaultProd.id);
    setOpQuantity(5);
    setOpUnitPrice(
      type === 'PURCHASE'
        ? defaultProd.defaultCostPrice
        : defaultProd.defaultSalePrice
    );
    setOpPaymentMethod('CASH');
    setOpPaidImmediate(0);
    setOpNotes('');
  };

  const handleSaveNewOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !newOpModalType) return;

    const product = state.products.find((p) => p.id === opProductId);
    const client = state.clients.find((c) => c.id === opClientId);
    const supplier = state.suppliers.find((s) => s.id === opSupplierId);

    let actualType: OperationType = newOpModalType;
    let payload: RouteOperation['payload'] = {
      totalAmount: 0,
      paymentMethod: opPaymentMethod,
      notes: opNotes,
    };

    if (newOpModalType === 'SALE') {
      payload = {
        productId: product?.id,
        productName: product?.name,
        clientId: client?.id,
        clientName: client?.name,
        quantity: opQuantity,
        unitPrice: opUnitPrice,
        totalAmount: opQuantity * opUnitPrice,
        paymentMethod: opPaymentMethod,
        amountPaidImmediate:
          opPaymentMethod === 'CREDIT'
            ? opPaidImmediate
            : opQuantity * opUnitPrice,
        notes: opNotes || 'Venta en ruta',
      };
    } else if (newOpModalType === 'PURCHASE') {
      payload = {
        productId: product?.id,
        productName: product?.name,
        supplierId: supplier?.id,
        supplierName: supplier?.name,
        quantity: opQuantity,
        unitCost: opUnitPrice,
        totalAmount: opQuantity * opUnitPrice,
        paymentMethod: opPaymentMethod,
        notes: opNotes || 'Compra a proveedor',
      };
    } else if (
      newOpModalType === 'COLLECTION_PAST_DEBT' ||
      newOpModalType === 'COLLECTION_CURRENT'
    ) {
      actualType =
        opCollectionKind === 'CURRENT'
          ? 'COLLECTION_CURRENT'
          : 'COLLECTION_PAST_DEBT';
      payload = {
        clientId: client?.id,
        clientName: client?.name,
        totalAmount:
          actualType === 'COLLECTION_PAST_DEBT'
            ? opCollectionAmount + opCollectionInterest
            : opCollectionAmount,
        principalApplied: opCollectionAmount,
        interestApplied:
          actualType === 'COLLECTION_PAST_DEBT' ? opCollectionInterest : 0,
        paymentMethod: opPaymentMethod,
        notes:
          opNotes ||
          (actualType === 'COLLECTION_CURRENT'
            ? 'Abono a venta fiada de hoy'
            : 'Abono a deuda de días anteriores'),
      };
    } else if (newOpModalType === 'EXPENSE') {
      payload = {
        expenseCategory: opExpenseCategory,
        description: opNotes || 'Gasto operativo de ruta',
        totalAmount: opExpenseAmount,
        paymentMethod: opPaymentMethod,
        notes: opNotes,
      };
    } else if (newOpModalType === 'SUPPLIER_RETURN') {
      const unitCost = product?.defaultCostPrice ?? 28000;
      payload = {
        productId: product?.id,
        productName: product?.name,
        supplierId: supplier?.id,
        supplierName: supplier?.name,
        quantity: opDeliveredQty,
        deliveredQuantity: opDeliveredQty,
        acceptedQuantity: opAcceptedQty,
        unitCost,
        totalAmount: opAcceptedQty * unitCost,
        compensationType: opCompensationType,
        cashRefundReceivedAmount:
          opCompensationType === 'CASH_REFUND_RECEIVED'
            ? opAcceptedQty * unitCost
            : 0,
        notes: opNotes || 'Devolución de fruta al proveedor',
      };
    } else if (newOpModalType === 'CRATE_MOVEMENT') {
      payload = {
        clientId: client?.id,
        clientName: client?.name,
        crateMovementType: opCrateType,
        crateQuantity: opQuantity,
        quantity: opQuantity,
        totalAmount: 0,
        notes: opNotes || 'Movimiento de canastillas',
      };
    }

    const res = await coreService.createOperation({
      actorUserId: currentUser.id,
      shiftId: activeShift.id,
      type: actualType,
      payload,
    });

    if (res.ok) {
      setNewOpModalType(null);
      const updatedPreview = coreService.getShiftReconciliationPreview(
        activeShift.id
      );
      for (const item of updatedPreview.inventory.items) {
        await coreService.updateClosureInventoryClassification({
          shiftId: activeShift.id,
          productId: item.productId,
          classification: {
            productId: item.productId,
            productName: item.productName,
            unit: item.unit,
            unitCost: item.unitCost,
            expectedFinalInventory: item.expectedFinalInventory,
            returnedToSupplierDeliveredQty: item.closureReturnedDeliveredQty,
            returnedToSupplierAcceptedQty: item.closureReturnedAcceptedQty,
            returnCompensationType: item.closureReturnCompensationType,
            returnCashRefundReceived: item.closureReturnCashRefundReceived,
            shrinkageQty: item.closureShrinkageQty,
            shrinkageReason: item.closureShrinkageReason,
            carriedOverQty: Math.max(
              0,
              item.expectedFinalInventory -
                item.closureReturnedDeliveredQty -
                item.closureShrinkageQty
            ),
          },
        });
      }
      const nextPreview = coreService.getShiftReconciliationPreview(
        activeShift.id
      );
      setCountedCashInput(nextPreview.financials.expectedCashInBox);
      setCountedTransferInput(nextPreview.financials.expectedTransfersInBank);
      setFeedback({ type: 'success', text: res.message });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
    refreshState();
  };

  const openEditOperationModal = (op: RouteOperation) => {
    setFeedback(null);
    const approvedAuth = state.authorizations.find(
      (a) =>
        a.operationId === op.id &&
        a.status === 'APPROVED' &&
        a.approvedOperationVersion === op.version
    );

    setEditingOp(op);
    if (approvedAuth) {
      setEditNewAmount(approvedAuth.requestedValueSnapshot.totalAmount);
      setEditNewQty(approvedAuth.requestedValueSnapshot.quantity ?? 0);
      setEditReason(approvedAuth.reason);
    } else {
      setEditNewAmount(op.payload.totalAmount);
      setEditNewQty(op.payload.quantity ?? 0);
      setEditReason('');
    }
    setEditWarningConfirmed(false);
  };

  const handleConfirmEditOrRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOp || !activeShift) return;

    const windowStatus = coreService.timeEngine.isWithinEditWindow(
      editingOp,
      activeShift.editWindowMinutes
    );

    const approvedAuth = state.authorizations.find(
      (a) =>
        a.operationId === editingOp.id &&
        a.status === 'APPROVED' &&
        a.approvedOperationVersion === editingOp.version
    );

    const updatedPayload = {
      ...editingOp.payload,
      quantity: editNewQty > 0 ? editNewQty : editingOp.payload.quantity,
      totalAmount: editNewAmount,
    };

    if (windowStatus.withinWindow && !approvedAuth) {
      const res = await coreService.editOperation({
        actorUserId: currentUser.id,
        operationId: editingOp.id,
        newPayload: updatedPayload,
        reason: editReason,
      });
      if (res.ok) {
        setEditingOp(null);
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
      refreshState();
      return;
    }

    if (approvedAuth) {
      const res = await coreService.editOperation({
        actorUserId: currentUser.id,
        operationId: editingOp.id,
        newPayload: approvedAuth.requestedValueSnapshot,
        reason: editReason || approvedAuth.reason,
        authorizationId: approvedAuth.id,
        warningConfirmed: editWarningConfirmed,
      });
      if (res.ok) {
        setEditingOp(null);
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
      refreshState();
      return;
    }

    const reqRes = await coreService.requestExpiredEditAuthorization({
      actorUserId: currentUser.id,
      operationId: editingOp.id,
      requestedPayload: updatedPayload,
      reason: editReason,
    });

    if (reqRes.ok) {
      setEditingOp(null);
      setFeedback({ type: 'warning', text: reqRes.message });
    } else {
      setFeedback({ type: 'error', text: reqRes.message });
    }
    refreshState();
  };

  const handleRunAcceptanceTests = async () => {
    setRunningTests(true);
    const summary = await runAll15MandatoryAcceptanceTests();
    setTestResults(summary.results);
    setRunningTests(false);
    setFeedback({
      type: summary.allPassed ? 'success' : 'error',
      text: `Ejecutadas las ${summary.totalCount} pruebas obligatorias: ${summary.passedCount}/${summary.totalCount} aprobadas.`,
    });
  };

  const getOperationMeta = (type: OperationType) => {
    switch (type) {
      case 'SALE':
        return {
          label: 'Venta a cliente',
          icon: <ShoppingBag className="w-5 h-5 text-green-700" />,
          badgeBg: 'bg-green-50 border-green-100',
        };
      case 'PURCHASE':
        return {
          label: 'Compra a proveedor',
          icon: <ShoppingCart className="w-5 h-5 text-amber-700" />,
          badgeBg: 'bg-amber-50 border-amber-100',
        };
      case 'COLLECTION_CURRENT':
        return {
          label: 'Abono a fiado de hoy',
          icon: <Banknote className="w-5 h-5 text-blue-700" />,
          badgeBg: 'bg-blue-50 border-blue-100',
        };
      case 'COLLECTION_PAST_DEBT':
        return {
          label: 'Abono a deuda anterior',
          icon: <Receipt className="w-5 h-5 text-indigo-700" />,
          badgeBg: 'bg-indigo-50 border-indigo-100',
        };
      case 'EXPENSE':
        return {
          label: 'Gasto / Personal',
          icon: <Fuel className="w-5 h-5 text-orange-700" />,
          badgeBg: 'bg-orange-50 border-orange-100',
        };
      case 'SUPPLIER_RETURN':
        return {
          label: 'Devolución a proveedor',
          icon: <RotateCcw className="w-5 h-5 text-slate-700" />,
          badgeBg: 'bg-slate-100 border-slate-200',
        };
      case 'CRATE_MOVEMENT':
      default:
        return {
          label: 'Movimiento de canastillas',
          icon: <Package className="w-5 h-5 text-slate-700" />,
          badgeBg: 'bg-slate-100 border-slate-200',
        };
    }
  };

  // Panel lateral derecho en Desktop (Balance financiero e inventario en vivo)
  const rightSummaryPanel =
    activeShift && reconciliation ? (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border border-green-100">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Balance de la Jornada
            </h3>
            <p className="text-xs text-slate-500">
              Utilidad económica vs. efectivo en mano
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-600">Ventas de hoy:</span>
            <strong className="text-base font-bold text-slate-900 tabular-nums">
              {formatCOP(reconciliation.financials.totalSalesAmount)}
            </strong>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-600">Fiados de hoy pendientes:</span>
            <strong className="text-base font-bold text-amber-700 tabular-nums">
              {formatCOP(
                reconciliation.financials.pendingReceivablesFromCurrentSales
              )}
            </strong>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-600">Cobros deuda anterior:</span>
            <strong className="text-base font-bold text-blue-700 tabular-nums">
              {formatCOP(reconciliation.financials.totalPastDebtCollected)}
            </strong>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-600">Ganancia Neta (Utilidad):</span>
            <strong className="text-base font-bold text-green-700 tabular-nums">
              {formatCOP(reconciliation.financials.economicNetProfit)}
            </strong>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-green-50/80 border border-green-200 flex justify-between items-center">
          <span className="text-sm font-semibold text-green-950">
            Efectivo físico esperado:
          </span>
          <strong className="text-xl font-extrabold text-green-800 tabular-nums">
            {formatCOP(reconciliation.financials.expectedCashInBox)}
          </strong>
        </div>

        <div className="pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Inventario disponible en camión
          </h4>
          <div className="space-y-2">
            {reconciliation.inventory.items.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between items-center text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"
              >
                <span className="text-slate-700 font-medium truncate pr-2">
                  {item.productName}
                </span>
                <strong className="text-slate-900 font-bold tabular-nums shrink-0">
                  {item.expectedFinalInventory} {item.unit}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <ResponsivePwaShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      isOnline={isOnline}
      onOpenConnectionSheet={() => setConnectionSheetOpen(true)}
      onOpenAuthSheet={() => setAuthSheetOpen(true)}
      pendingSyncCount={pendingSyncCount}
      pendingAuthCount={pendingAuthRequests.length}
      activeUser={currentUser}
      firebaseProjectId={coreService.firebaseAdapter.getProjectId()}
      rightPanel={rightSummaryPanel}
    >
      {/* Avisos de estado claros y elegantes */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border flex items-start gap-3 shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-950'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}
        >
          {feedback.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
          )}
          {feedback.type === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          {feedback.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          )}
          <span className="text-base font-medium leading-snug">
            {feedback.text}
          </span>
        </div>
      )}

      {isHydrating ? (
        <>
          <SkeletonMetricsCard />
          <SkeletonOperationList rows={3} />
        </>
      ) : (
        <>
          {/* ====================================================================
              PESTAÑA 1: RUTA DE HOY
             ==================================================================== */}
          {activeTab === 'OPERATE' && activeShift && reconciliation && (
            <main className="space-y-5">
              {/* Tarjeta de estado de la jornada */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 border border-green-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Jornada del {activeShift.operatingDate}
                      </h2>
                      <p className="text-sm text-slate-600">
                        {activeShift.vehicle} · Responsable:{' '}
                        <strong className="text-slate-800">
                          {activeShift.responsibleUserName}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {activeShift.status === 'OPEN' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-800 border border-green-200">
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                      Jornada abierta
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
                      <Lock className="w-3.5 h-3.5 text-red-700" />
                      Jornada cerrada
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Plazo para corregir apuntes:{' '}
                      <strong className="text-slate-900">
                        {activeShift.editWindowMinutes === 0
                          ? '0 min (siempre requiere autorización)'
                          : `${activeShift.editWindowMinutes} min individuales por registro`}
                      </strong>
                    </span>
                  </div>
                  {activeShift.carriedOverFromShiftId && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      <Package className="w-3.5 h-3.5" />
                      Inventario inicial trasladado sin compra ficticia
                    </span>
                  )}
                </div>
              </section>

              {/* Botones táctiles amplios de acción principal */}
              {activeShift.status === 'OPEN' ? (
                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Registrar movimiento en ruta
                    </h2>
                    <p className="text-sm text-slate-600">
                      Toca una opción para anotar rápidamente
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => openOperationModal('SALE')}
                      className="min-h-[78px] p-4 rounded-2xl border border-slate-200 bg-white hover:border-green-400 hover:bg-green-50/40 active:bg-green-50 transition-all flex items-center gap-4 text-left shadow-2xs cursor-pointer group"
                    >
                      <div className="w-13 h-13 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900">
                          Anotar Venta
                        </div>
                        <div className="text-sm text-slate-600">
                          Contado, transferencia o fiado
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openOperationModal('COLLECTION_PAST_DEBT')}
                      className="min-h-[78px] p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 active:bg-blue-50 transition-all flex items-center gap-4 text-left shadow-2xs cursor-pointer group"
                    >
                      <div className="w-13 h-13 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900">
                          Cobrar Fiado
                        </div>
                        <div className="text-sm text-slate-600">
                          De hoy o deuda de días anteriores
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openOperationModal('EXPENSE')}
                      className="min-h-[78px] p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 active:bg-amber-50 transition-all flex items-center gap-4 text-left shadow-2xs cursor-pointer group"
                    >
                      <div className="w-13 h-13 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900">
                          Anotar Gasto
                        </div>
                        <div className="text-sm text-slate-600">
                          Combustible, peaje o ayudante
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openOperationModal('PURCHASE')}
                      className="min-h-[78px] p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 active:bg-emerald-50 transition-all flex items-center gap-4 text-left shadow-2xs cursor-pointer group"
                    >
                      <div className="w-13 h-13 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900">
                          Comprar Fruta
                        </div>
                        <div className="text-sm text-slate-600">
                          Entrada de carga de proveedor
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openOperationModal('SUPPLIER_RETURN')}
                      className="min-h-[74px] p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 active:bg-slate-200/60 transition-all flex items-center gap-4 text-left cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                        <RotateCcw className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-slate-900">
                          Devolver a Proveedor
                        </div>
                        <div className="text-sm text-slate-600">
                          Cantidad entregada vs. aceptada
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openOperationModal('CRATE_MOVEMENT')}
                      className="min-h-[74px] p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 active:bg-slate-200/60 transition-all flex items-center gap-4 text-left cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-slate-900">
                          Canastillas
                        </div>
                        <div className="text-sm text-slate-600">
                          Prestadas o devueltas
                        </div>
                      </div>
                    </button>
                  </div>
                </section>
              ) : (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-red-700 shrink-0" />
                  <span className="text-base font-medium">
                    Esta jornada fue cerrada definitivamente. No se permiten modificaciones ordinarias para ningún rol.
                  </span>
                </div>
              )}

              {/* Resumen Financiero Visible en Móvil (< 1280px) */}
              <section className="xl:hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  Resumen del día (Utilidad vs. Efectivo)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-xs font-medium text-slate-600 block">
                      Ventas de hoy
                    </span>
                    <strong className="text-lg font-bold text-slate-900 tabular-nums">
                      {formatCOP(reconciliation.financials.totalSalesAmount)}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <span className="text-xs font-medium text-amber-900 block">
                      Fiado pendiente hoy
                    </span>
                    <strong className="text-lg font-bold text-amber-800 tabular-nums">
                      {formatCOP(
                        reconciliation.financials
                          .pendingReceivablesFromCurrentSales
                      )}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-xs font-medium text-slate-600 block">
                      Ganancia neta hoy
                    </span>
                    <strong className="text-lg font-bold text-green-700 tabular-nums">
                      {formatCOP(reconciliation.financials.economicNetProfit)}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-green-50 border border-green-200">
                    <span className="text-xs font-semibold text-green-900 block">
                      Efectivo esperado
                    </span>
                    <strong className="text-lg font-extrabold text-green-800 tabular-nums">
                      {formatCOP(reconciliation.financials.expectedCashInBox)}
                    </strong>
                  </div>
                </div>
              </section>

              {/* Lista de operaciones registradas hoy */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Movimientos registrados hoy (
                      {
                        state.operations.filter(
                          (o) => o.shiftId === activeShift.id
                        ).length
                      }
                      )
                    </h2>
                    <p className="text-sm text-slate-600">
                      El plazo de edición se calcula individualmente para cada registro
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {state.operations
                    .filter((op) => op.shiftId === activeShift.id)
                    .map((op) => {
                      const meta = getOperationMeta(op.type);
                      const win = coreService.timeEngine.isWithinEditWindow(
                        op,
                        activeShift.editWindowMinutes
                      );
                      const approvedAuth = state.authorizations.find(
                        (a) =>
                          a.operationId === op.id &&
                          a.status === 'APPROVED' &&
                          a.approvedOperationVersion === op.version
                      );
                      const pendingAuth = state.authorizations.find(
                        (a) => a.operationId === op.id && a.status === 'PENDING'
                      );

                      return (
                        <article
                          key={op.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.badgeBg}`}
                              >
                                {meta.icon}
                              </div>
                              <div>
                                <div className="font-bold text-base text-slate-900">
                                  {meta.label}
                                </div>
                                <div className="text-sm text-slate-600 space-y-0.5 mt-0.5">
                                  {op.payload.productName && (
                                    <div>
                                      <span className="font-medium text-slate-800">
                                        {op.payload.productName}
                                      </span>{' '}
                                      · {op.payload.quantity} und
                                    </div>
                                  )}
                                  {op.payload.clientName && (
                                    <div>Cliente: {op.payload.clientName}</div>
                                  )}
                                  {op.payload.supplierName && (
                                    <div>
                                      Proveedor: {op.payload.supplierName}
                                    </div>
                                  )}
                                  {op.payload.notes && (
                                    <div className="text-slate-500 italic">
                                      "{op.payload.notes}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xl font-bold text-slate-900 tabular-nums">
                                {formatCOP(op.payload.totalAmount)}
                              </div>
                              <div className="text-xs font-medium text-slate-500">
                                {op.payload.paymentMethod === 'CASH' &&
                                  'Efectivo'}
                                {op.payload.paymentMethod === 'TRANSFER' &&
                                  'Transferencia'}
                                {op.payload.paymentMethod === 'CREDIT' &&
                                  'Crédito / Fiado'}
                              </div>
                            </div>
                          </div>

                          {/* Pie de tarjeta: estado de edición y botón de acción */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {activeShift.status === 'CLOSED' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  <Lock className="w-3.5 h-3.5" />
                                  Jornada cerrada
                                </span>
                              ) : approvedAuth ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                                  Permiso aprobado (1 uso)
                                </span>
                              ) : pendingAuth ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                                  Esperando aprobación del dueño
                                </span>
                              ) : win.withinWindow ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-800 border border-green-200 tabular-nums">
                                  <Clock className="w-3.5 h-3.5 text-green-700" />
                                  Editable ({win.remainingMinutesFormatted})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                  Plazo vencido · Requiere autorización
                                </span>
                              )}

                              <span className="text-xs text-slate-400">
                                v{op.version} · {op.authorName}
                              </span>
                            </div>

                            {activeShift.status === 'OPEN' && (
                              <button
                                type="button"
                                onClick={() => openEditOperationModal(op)}
                                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                                  approvedAuth
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : win.withinWindow
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                                }`}
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>
                                  {approvedAuth
                                    ? 'Aplicar cambio autorizado'
                                    : win.withinWindow
                                    ? 'Corregir registro'
                                    : 'Solicitar permiso al dueño'}
                                </span>
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            </main>
          )}

          {/* ====================================================================
              PESTAÑA 2: CIERRE DEL DÍA GUIADO PASO A PASO
             ==================================================================== */}
          {activeTab === 'CLOSE' && activeShift && reconciliation && (
            <main className="space-y-5">
              {/* Selector de pasos limpio */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Asistente de Cierre de Jornada
                    </h2>
                    <p className="text-sm text-slate-600">
                      Responsable asignado:{' '}
                      <strong className="text-slate-900">
                        {activeShift.responsibleUserName}
                      </strong>{' '}
                      · Permiso de cierre a auxiliar:{' '}
                      <strong className="text-slate-900">
                        {activeShift.allowResponsibleHelperClose
                          ? 'Habilitado'
                          : 'Requiere al dueño'}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { step: 1, title: '1. Inventario' },
                    { step: 2, title: '2. Cuentas' },
                    { step: 3, title: '3. Efectivo' },
                    { step: 4, title: '4. Cerrar' },
                  ].map((s) => {
                    const active = closureStep === s.step;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => setClosureStep(s.step as 1 | 2 | 3 | 4)}
                        className={`min-h-[46px] px-2 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-green-700 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {s.title}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* PASO 1: INVENTARIO */}
              {closureStep === 1 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Paso 1: Conciliación de inventario sobrante
                    </h3>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Inicial + Compras − Ventas − Devoluciones − Mermas = Sobrante real. Clasifica todas las unidades antes de cerrar.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {reconciliation.inventory.items.map((item) => {
                      const currentClass = state.closureClassificationsByShift[
                        activeShift.id
                      ]?.[item.productId] ?? {
                        productId: item.productId,
                        productName: item.productName,
                        unit: item.unit,
                        unitCost: item.unitCost,
                        expectedFinalInventory: item.expectedFinalInventory,
                        returnedToSupplierDeliveredQty:
                          item.closureReturnedDeliveredQty,
                        returnedToSupplierAcceptedQty:
                          item.closureReturnedAcceptedQty,
                        returnCompensationType:
                          item.closureReturnCompensationType,
                        returnCashRefundReceived:
                          item.closureReturnCashRefundReceived,
                        shrinkageQty: item.closureShrinkageQty,
                        shrinkageReason: item.closureShrinkageReason,
                        carriedOverQty: item.carriedOverToNextShiftQty,
                      };

                      const updateItemClass = async (
                        patch: Partial<typeof currentClass>
                      ) => {
                        await coreService.updateClosureInventoryClassification({
                          shiftId: activeShift.id,
                          productId: item.productId,
                          classification: { ...currentClass, ...patch },
                        });
                        refreshState();
                      };

                      return (
                        <div
                          key={item.productId}
                          className={`p-4 rounded-2xl border space-y-4 ${
                            item.isSquared
                              ? 'bg-slate-50/60 border-slate-200'
                              : 'bg-red-50/40 border-red-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <h4 className="text-base font-bold text-slate-900">
                                {item.productName}
                              </h4>
                              <p className="text-sm text-slate-600">
                                Inicial ({item.initialInventory}) + Compras (
                                {item.purchasesQty}) − Ventas ({item.soldQty}) −
                                Dev. ({item.inRouteSupplierReturnDeliveredQty})
                                ={' '}
                                <strong className="text-slate-900">
                                  Sobrante: {item.expectedFinalInventory}{' '}
                                  {item.unit}
                                </strong>
                              </p>
                            </div>

                            {item.isSquared ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-800 border border-green-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                                Cuadrado ({item.totalClassifiedQty}/
                                {item.expectedFinalInventory})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                                <AlertCircle className="w-3.5 h-3.5 text-red-700" />
                                Faltan {item.unclassifiedDiscrepancyQty}{' '}
                                {item.unit} por clasificar
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Conservada para mañana ({item.unit})
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                disabled={activeShift.status === 'CLOSED'}
                                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                                value={currentClass.carriedOverQty}
                                onChange={(e) =>
                                  updateItemClass({
                                    carriedOverQty: Number(e.target.value),
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Baja por merma ({item.unit})
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                disabled={activeShift.status === 'CLOSED'}
                                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                                value={currentClass.shrinkageQty}
                                onChange={(e) =>
                                  updateItemClass({
                                    shrinkageQty: Number(e.target.value),
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Devuelta al proveedor ({item.unit})
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                disabled={activeShift.status === 'CLOSED'}
                                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                                value={
                                  currentClass.returnedToSupplierDeliveredQty
                                }
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  updateItemClass({
                                    returnedToSupplierDeliveredQty: val,
                                    returnedToSupplierAcceptedQty: Math.min(
                                      val,
                                      currentClass.returnedToSupplierAcceptedQty
                                    ),
                                  });
                                }}
                              />
                            </div>
                          </div>

                          {currentClass.shrinkageQty > 0 && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Motivo obligatorio de la merma:
                              </label>
                              <input
                                type="text"
                                disabled={activeShift.status === 'CLOSED'}
                                placeholder="Ej: Fruta estropeada en el transporte"
                                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                                value={currentClass.shrinkageReason}
                                onChange={(e) =>
                                  updateItemClass({
                                    shrinkageReason: e.target.value,
                                  })
                                }
                              />
                            </div>
                          )}

                          {currentClass.returnedToSupplierDeliveredQty > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                  Cantidad que el proveedor aceptó ({item.unit})
                                </label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={
                                    currentClass.returnedToSupplierDeliveredQty
                                  }
                                  disabled={activeShift.status === 'CLOSED'}
                                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                                  value={
                                    currentClass.returnedToSupplierAcceptedQty
                                  }
                                  onChange={(e) =>
                                    updateItemClass({
                                      returnedToSupplierAcceptedQty: Number(
                                        e.target.value
                                      ),
                                    })
                                  }
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                  Tipo de compensación del proveedor
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(
                                    [
                                      {
                                        id: 'PENDING_COMPENSATION',
                                        label: 'Pendiente de compensar',
                                        sub: 'No entra a caja hoy',
                                      },
                                      {
                                        id: 'CREDIT_BALANCE',
                                        label: 'Saldo a favor nuestro',
                                        sub: 'No entra a caja hoy',
                                      },
                                      {
                                        id: 'PRODUCT_EXCHANGE',
                                        label: 'Cambio por producto',
                                        sub: 'Reposición física',
                                      },
                                      {
                                        id: 'CASH_REFUND_RECEIVED',
                                        label: 'Efectivo recibido',
                                        sub: 'Suma a caja hoy',
                                      },
                                    ] as const
                                  ).map((opt) => {
                                    const selected =
                                      currentClass.returnCompensationType ===
                                      opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        disabled={
                                          activeShift.status === 'CLOSED'
                                        }
                                        onClick={() =>
                                          updateItemClass({
                                            returnCompensationType: opt.id,
                                          })
                                        }
                                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                                          selected
                                            ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                                        }`}
                                      >
                                        <div className="text-sm font-bold leading-snug">
                                          {opt.label}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {opt.sub}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setClosureStep(2)}
                    className="w-full min-h-[54px] px-5 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Continuar al Paso 2: Revisar cuentas</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </section>
              )}

              {/* PASO 2: CUENTAS CLARAS */}
              {closureStep === 2 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Paso 2: Utilidad económica vs. Efectivo disponible
                    </h3>
                    <p className="text-sm text-slate-600">
                      Los cobros de cartera anterior no se suman como ventas nuevas ni como nueva utilidad.
                    </p>
                  </div>

                  <div className="space-y-2 text-base">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">
                        Ventas totales de la jornada:
                      </span>
                      <strong className="font-bold text-slate-900 tabular-nums">
                        {formatCOP(reconciliation.financials.totalSalesAmount)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">
                        Costo de productos vendidos:
                      </span>
                      <strong className="font-bold text-slate-900 tabular-nums">
                        -{formatCOP(reconciliation.financials.costOfGoodsSold)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">
                        Pérdida por mermas:
                      </span>
                      <strong className="font-bold text-slate-900 tabular-nums">
                        -
                        {formatCOP(
                          reconciliation.financials.totalShrinkageLoss
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">
                        Gastos operativos y pagos de personal:
                      </span>
                      <strong className="font-bold text-slate-900 tabular-nums">
                        -
                        {formatCOP(
                          reconciliation.financials.totalExpensesAndPersonnel
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-green-50 border border-green-200 mt-2">
                      <span className="font-bold text-green-950">
                        Utilidad económica neta del día:
                      </span>
                      <strong className="text-xl font-extrabold text-green-800 tabular-nums">
                        {formatCOP(reconciliation.financials.economicNetProfit)}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2 text-base">
                    <h4 className="font-bold text-slate-900">
                      Arqueo de efectivo esperado en caja
                    </h4>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">
                        Base inicial de la mañana:
                      </span>
                      <strong className="tabular-nums">
                        {formatCOP(activeShift.initialCash)}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">
                        Recaudo en efectivo de ventas de hoy:
                      </span>
                      <strong className="tabular-nums">
                        {formatCOP(
                          reconciliation.financials
                            .collectedFromCurrentSalesCash
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">
                        Cobros en efectivo de deudas anteriores:
                      </span>
                      <strong className="tabular-nums">
                        {formatCOP(
                          reconciliation.financials
                            .pastDebtPrincipalCollectedCash +
                            reconciliation.financials
                              .pastDebtInterestCollectedCash
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-100 border border-slate-200 mt-2">
                      <span className="font-bold text-slate-900">
                        Efectivo físico esperado en caja:
                      </span>
                      <strong className="text-xl font-extrabold text-slate-900 tabular-nums">
                        {formatCOP(reconciliation.financials.expectedCashInBox)}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setClosureStep(1)}
                      className="min-h-[52px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base cursor-pointer"
                    >
                      Volver al Paso 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setClosureStep(3)}
                      className="min-h-[52px] px-4 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-base cursor-pointer"
                    >
                      Paso 3: Contar dinero
                    </button>
                  </div>
                </section>
              )}

              {/* PASO 3: CONTEO DE DINERO */}
              {closureStep === 3 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Paso 3: Dinero real contado y conciliación
                    </h3>
                    <p className="text-sm text-slate-600">
                      Ingresa el total de billetes/monedas y el total recibido por transferencias.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-base font-bold text-slate-800 mb-1">
                        Efectivo contado en billetes y monedas ($)
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        Esperado según registros:{' '}
                        <strong className="tabular-nums">
                          {formatCOP(
                            reconciliation.financials.expectedCashInBox
                          )}
                        </strong>
                      </p>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="w-full min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                        value={countedCashInput}
                        onChange={(e) =>
                          setCountedCashInput(Number(e.target.value))
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-base font-bold text-slate-800 mb-1">
                        Total en transferencias verificadas ($)
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        Esperado según registros:{' '}
                        <strong className="tabular-nums">
                          {formatCOP(
                            reconciliation.financials.expectedTransfersInBank
                          )}
                        </strong>
                      </p>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="w-full min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                        value={countedTransferInput}
                        onChange={(e) =>
                          setCountedTransferInput(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  {(countedCashInput !==
                    reconciliation.financials.expectedCashInBox ||
                    countedTransferInput !==
                      reconciliation.financials.expectedTransfersInBank) && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                      <div className="flex items-start gap-2.5 text-amber-950">
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-sm font-medium">
                          Existe una diferencia de{' '}
                          <strong className="tabular-nums">
                            {formatCOP(
                              countedCashInput -
                                reconciliation.financials.expectedCashInBox
                            )}
                          </strong>{' '}
                          en efectivo. Explica su origen y confirma su reconocimiento:
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Explica la causa de la diferencia..."
                        className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-amber-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                        value={diffExplanation}
                        onChange={(e) => setDiffExplanation(e.target.value)}
                      />

                      <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-amber-950 pt-1">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-amber-700 rounded"
                          checked={diffAcknowledged}
                          onChange={(e) =>
                            setDiffAcknowledged(e.target.checked)
                          }
                        />
                        <span>
                          Reconozco expresamente esta diferencia de conciliación
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setClosureStep(2)}
                      className="min-h-[52px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base cursor-pointer"
                    >
                      Volver al Paso 2
                    </button>
                    <button
                      type="button"
                      onClick={() => setClosureStep(4)}
                      className="min-h-[52px] px-4 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-base cursor-pointer"
                    >
                      Paso 4: Confirmar cierre
                    </button>
                  </div>
                </section>
              )}

              {/* PASO 4: CONFIRMACIÓN DEFINITIVA */}
              {closureStep === 4 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Paso 4: Confirmación de cierre definitivo
                    </h3>
                    <p className="text-sm text-slate-600">
                      Una vez confirmado el cierre, todos los registros de la jornada quedarán congelados e inmodificables.
                    </p>
                  </div>

                  {!reconciliation.inventory.allSquared && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-700" />
                        <span>El inventario aún tiene unidades sin clasificar:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {reconciliation.inventory.validationErrors.map(
                          (err, i) => (
                            <li key={i}>{err}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  <label className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-6 h-6 mt-0.5 accent-green-700 rounded shrink-0"
                      checked={finalConfirmChecked}
                      onChange={(e) => setFinalConfirmChecked(e.target.checked)}
                    />
                    <span className="text-base font-semibold text-slate-800 leading-snug">
                      Confirmo que revisé el resumen completo de inventario, cartera y efectivo, y deseo cerrar definitivamente la jornada.
                    </span>
                  </label>

                  {activeShift.status === 'OPEN' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const res =
                          await coreService.executeDefinitiveShiftClosure({
                            actorUserId: currentUser.id,
                            shiftId: activeShift.id,
                            countedCash: countedCashInput,
                            countedTransfers: countedTransferInput,
                            differenceAcknowledged: diffAcknowledged,
                            differenceExplanation: diffExplanation,
                            explicitConfirmation: finalConfirmChecked,
                          });
                        if (res.ok && res.data) {
                          setAdjClosureId(res.data.closureId);
                          setFeedback({ type: 'success', text: res.message });
                        } else {
                          setFeedback({ type: 'error', text: res.message });
                        }
                        refreshState();
                      }}
                      className="w-full min-h-[56px] px-5 py-3.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-lg flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Lock className="w-5 h-5" />
                      <span>Ejecutar Cierre Definitivo</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl bg-green-50 border border-green-200 space-y-3">
                      <div className="flex items-center gap-2 text-green-900 font-bold">
                        <CheckCircle2 className="w-5 h-5 text-green-700" />
                        <span>
                          Jornada cerrada definitivamente ({activeShift.closureId})
                        </span>
                      </div>
                      {currentUser.role === 'OWNER' && (
                        <button
                          type="button"
                          onClick={async () => {
                            const nextDate = new Date(Date.now() + 86_400_000)
                              .toISOString()
                              .slice(0, 10);
                            const openRes = await coreService.openNewShift({
                              actorUserId: currentUser.id,
                              operatingDate: nextDate,
                              responsibleUserId: 'USR-HELPER-01',
                              vehicle: activeShift.vehicle,
                              initialCash: 150000,
                              initialCrates:
                                reconciliation.crates.finalCratesInVehicle,
                              carryOverFromClosureId: activeShift.closureId,
                            });
                            if (openRes.ok) {
                              setClosureStep(1);
                              setFinalConfirmChecked(false);
                              setFeedback({
                                type: 'success',
                                text: openRes.message,
                              });
                            } else {
                              setFeedback({
                                type: 'error',
                                text: openRes.message,
                              });
                            }
                            refreshState();
                          }}
                          className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Sunrise className="w-5 h-5" />
                          <span>
                            Abrir siguiente jornada (trasladar inventario conservado)
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Cierres históricos congelados */}
              {state.closures.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Cierres históricos congelados ({state.closures.length})
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {state.closures.map((c) => (
                      <div
                        key={c.closureId}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm space-y-1"
                      >
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{c.closureId}</span>
                          <span>{c.operatingDate}</span>
                        </div>
                        <div className="text-slate-600">
                          Ejecutado por: {c.closedByUserName} · Ventas:{' '}
                          <strong className="tabular-nums">
                            {formatCOP(c.financialSummary.totalSalesAmount)}
                          </strong>{' '}
                          · Efectivo contado:{' '}
                          <strong className="tabular-nums">
                            {formatCOP(c.countedCash)}
                          </strong>
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          Hash inmutable: {c.snapshotHash}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </main>
          )}

          {/* ====================================================================
              PESTAÑA 3: PANEL DEL DUEÑO
             ==================================================================== */}
          {activeTab === 'OWNER' && (
            <main className="space-y-5">
              {/* 1. Solicitudes pendientes */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Solicitudes de edición fuera de plazo (
                    {pendingAuthRequests.length} pendientes)
                  </h2>
                </div>

                {pendingAuthRequests.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No hay solicitudes pendientes de autorización en este momento.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingAuthRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-3"
                      >
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                              {req.id}
                            </span>
                            <div className="font-bold text-base text-slate-900">
                              Solicitado por: {req.requestedByName}
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-900">
                            Operación {req.operationId} (v
                            {req.approvedOperationVersion})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-base">
                          <span className="text-slate-600">
                            Actual:{' '}
                            <strong className="tabular-nums text-slate-900">
                              {formatCOP(req.currentValueSnapshot.totalAmount)}
                            </strong>
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span className="text-green-900">
                            Solicitado:{' '}
                            <strong className="tabular-nums font-bold">
                              {formatCOP(
                                req.requestedValueSnapshot.totalAmount
                              )}
                            </strong>
                          </span>
                        </div>

                        <p className="text-sm text-slate-700 bg-white/80 p-2.5 rounded-lg border border-amber-100">
                          <strong>Motivo:</strong> "{req.reason}"
                        </p>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const res =
                                await coreService.decideEditAuthorization({
                                  ownerUserId: currentUser.id,
                                  authorizationId: req.id,
                                  decision: 'APPROVE',
                                });
                              setFeedback({
                                type: res.ok ? 'success' : 'error',
                                text: res.message,
                              });
                              refreshState();
                            }}
                            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Aprobar cambio</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const res =
                                await coreService.decideEditAuthorization({
                                  ownerUserId: currentUser.id,
                                  authorizationId: req.id,
                                  decision: 'REJECT',
                                });
                              setFeedback({
                                type: res.ok ? 'warning' : 'error',
                                text: res.message,
                              });
                              refreshState();
                            }}
                            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-200 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 2. Configuración de tiempo de edición y cierre */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-green-700" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Política de edición y permiso de cierre
                    </h2>
                    <p className="text-sm text-slate-600">
                      Define cuántos minutos tiene el auxiliar para editar un registro recién creado
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {state.config.allowedEditWindowOptions.map((mins) => {
                    const selected =
                      (activeShift?.editWindowMinutes ??
                        state.config.editWindowMinutes) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={async () => {
                          const res =
                            await coreService.configureEditWindowAndClosurePolicy(
                              {
                                actorUserId: currentUser.id,
                                shiftId: activeShift?.id,
                                editWindowMinutes: mins,
                                allowResponsibleHelperClose:
                                  activeShift?.allowResponsibleHelperClose ??
                                  state.config
                                    .allowResponsibleHelperCloseByDefault,
                              }
                            );
                          setFeedback({
                            type: res.ok ? 'success' : 'error',
                            text: res.message,
                          });
                          refreshState();
                        }}
                        className={`min-h-[48px] px-3 py-2 rounded-xl font-bold text-sm tabular-nums transition-colors cursor-pointer ${
                          selected
                            ? 'bg-green-700 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {mins === 0 ? '0 min' : `${mins} min`}
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-green-700 rounded shrink-0"
                    checked={
                      activeShift?.allowResponsibleHelperClose ??
                      state.config.allowResponsibleHelperCloseByDefault
                    }
                    onChange={async (e) => {
                      const res =
                        await coreService.configureEditWindowAndClosurePolicy({
                          actorUserId: currentUser.id,
                          shiftId: activeShift?.id,
                          editWindowMinutes:
                            activeShift?.editWindowMinutes ??
                            state.config.editWindowMinutes,
                          allowResponsibleHelperClose: e.target.checked,
                        });
                      setFeedback({
                        type: res.ok ? 'success' : 'error',
                        text: res.message,
                      });
                      refreshState();
                    }}
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Autorizar al auxiliar responsable asignado para ejecutar el cierre definitivo
                  </span>
                </label>
              </section>

              {/* 3. Gestión de auxiliares */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-green-700" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Gestión de auxiliares
                    </h2>
                    <p className="text-sm text-slate-600">
                      Desactivar un auxiliar revoca sus accesos futuros y conserva íntegramente su historial
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {state.users
                    .filter((u) => u.role === 'HELPER')
                    .map((helper) => (
                      <div
                        key={helper.id}
                        className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div>
                          <div className="font-bold text-base text-slate-900">
                            {helper.name}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ${
                              helper.active
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            {helper.active
                              ? 'Activo'
                              : 'Desactivado (historial conservado)'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const res = await coreService.setHelperActiveStatus(
                              {
                                actorUserId: currentUser.id,
                                targetHelperId: helper.id,
                                active: !helper.active,
                                reason: helper.active
                                  ? 'Desactivación administrativa con conservación de historial'
                                  : 'Reactivación autorizada por el dueño',
                              }
                            );
                            setFeedback({
                              type: res.ok ? 'success' : 'error',
                              text: res.message,
                            });
                            refreshState();
                          }}
                          className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                            helper.active
                              ? 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
                              : 'bg-green-700 hover:bg-green-800 text-white'
                          }`}
                        >
                          {helper.active
                            ? 'Desactivar cuenta'
                            : 'Activar cuenta'}
                        </button>
                      </div>
                    ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await coreService.createHelperAccount({
                      actorUserId: currentUser.id,
                      name: newHelperName,
                      pin: newHelperPin,
                    });
                    if (res.ok) {
                      setNewHelperName('');
                      setFeedback({ type: 'success', text: res.message });
                    } else {
                      setFeedback({ type: 'error', text: res.message });
                    }
                    refreshState();
                  }}
                  className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3"
                >
                  <input
                    type="text"
                    placeholder="Nombre del nuevo auxiliar..."
                    className="flex-1 min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={newHelperName}
                    onChange={(e) => setNewHelperName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Crear auxiliar</span>
                  </button>
                </form>
              </section>

              {/* 4. Ajuste posterior a jornada cerrada */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Ajuste posterior a jornada cerrada
                  </h2>
                  <p className="text-sm text-slate-600">
                    Procedimiento separado y auditable que no altera ni elimina el cierre histórico original
                  </p>
                </div>

                {state.closures.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Aún no hay jornadas cerradas para registrar ajustes posteriores.
                  </p>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const targetClosure =
                        adjClosureId || state.closures[0].closureId;
                      const res =
                        await coreService.createPostClosureAdjustment({
                          actorUserId: currentUser.id,
                          closureId: targetClosure,
                          adjustmentType: 'FINANCIAL_CORRECTION',
                          reason: adjReason,
                          previousValueSummary: {
                            nota: 'Cierre histórico inmutable',
                          },
                          correctedValueSummary: {
                            deltaCaja: adjDeltaCash,
                            deltaUtilidad: adjDeltaProfit,
                          },
                          monetaryDeltaCash: adjDeltaCash,
                          monetaryDeltaProfit: adjDeltaProfit,
                          monetaryDeltaPortfolio: 0,
                        });
                      if (res.ok) {
                        setAdjReason('');
                        setFeedback({ type: 'success', text: res.message });
                      } else {
                        setFeedback({ type: 'error', text: res.message });
                      }
                      refreshState();
                    }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Cierre histórico de referencia
                        </label>
                        <div className="flex flex-col gap-2">
                          {state.closures.map((c) => {
                            const selected =
                              (adjClosureId || state.closures[0].closureId) ===
                              c.closureId;
                            return (
                              <button
                                key={c.closureId}
                                type="button"
                                onClick={() => setAdjClosureId(c.closureId)}
                                className={`min-h-[46px] px-3.5 py-2 rounded-xl border text-left text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                                    : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <span className="truncate">{c.closureId}</span>
                                <span className="text-xs text-slate-500 shrink-0">
                                  {c.operatingDate}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Diferencia monetaria a ajustar ($)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-900 tabular-nums"
                          value={adjDeltaCash}
                          onChange={(e) => {
                            setAdjDeltaCash(Number(e.target.value));
                            setAdjDeltaProfit(Number(e.target.value));
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Motivo obligatorio del ajuste posterior
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Diferencia de recibo conciliada con cliente al día siguiente"
                        className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base text-slate-900"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="min-h-[48px] px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm cursor-pointer"
                    >
                      Registrar ajuste posterior auditable
                    </button>
                  </form>
                )}
              </section>
            </main>
          )}

          {/* ====================================================================
              PESTAÑA 4: AUDITORÍA Y 15 PRUEBAS DE ACEPTACIÓN
             ==================================================================== */}
          {activeTab === 'AUDIT' && (
            <main className="space-y-5">
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 border border-green-100 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        15 Pruebas de Aceptación Obligatorias
                      </h2>
                      <p className="text-sm text-slate-600">
                        Verificación automatizada en tiempo real de todas las reglas del sistema
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={runningTests}
                    onClick={handleRunAcceptanceTests}
                    className="min-h-[46px] px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {runningTests
                        ? 'Ejecutando pruebas...'
                        : 'Ejecutar las 15 pruebas'}
                    </span>
                  </button>
                </div>

                {testResults && (
                  <div className="space-y-2.5">
                    {testResults.map((tr) => (
                      <div
                        key={tr.testNumber}
                        className={`p-3.5 rounded-xl border text-sm ${
                          tr.passed
                            ? 'bg-green-50/50 border-green-200 text-slate-900'
                            : 'bg-red-50 border-red-200 text-red-950'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-base">
                          <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                          <span>
                            Prueba #{tr.testNumber}: {tr.title}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 pl-6">
                          {tr.evidenceSummary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-slate-700" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Bitácora inmutable de auditoría ({state.auditLogs.length}{' '}
                      registros)
                    </h2>
                    <p className="text-sm text-slate-600">
                      Valores anteriores, nuevos, autor, autorizador, fecha y motivo
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {state.auditLogs.slice(0, 25).map((log) => (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border text-sm space-y-1 ${
                        log.result === 'REJECTED'
                          ? 'bg-red-50/50 border-red-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="font-bold text-slate-900">
                          {log.actionType}
                        </strong>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            log.result === 'SUCCESS'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.result === 'SUCCESS' ? 'Aprobado' : 'Bloqueado'}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Autor: <strong>{log.actorName}</strong>
                        {log.authorizerName && (
                          <span>
                            {' '}
                            · Autorizó: <strong>{log.authorizerName}</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600">Motivo: {log.reason}</div>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          )}
        </>
      )}

      {/* ====================================================================
          HOJA INFERIOR (BOTTOM SHEET): CAMBIO DE SESIÓN Y ROL POR PIN
         ==================================================================== */}
      <AuthLoginSheet
        isOpen={authSheetOpen}
        onClose={() => setAuthSheetOpen(false)}
        users={state.users}
        activeUser={currentUser}
        onAuthenticateUser={(userId) => {
          setActiveUserId(userId);
          const u = state.users.find((usr) => usr.id === userId);
          setFeedback({
            type: 'success',
            text: `Sesión iniciada como ${u?.name ?? userId}.`,
          });
        }}
      />

      {/* ====================================================================
          HOJA INFERIOR (BOTTOM SHEET): ESTADO DE CONEXIÓN Y RESPALDO
         ==================================================================== */}
      <PwaConnectionSheet
        isOpen={connectionSheetOpen}
        onClose={() => setConnectionSheetOpen(false)}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        syncQueue={state.syncQueue}
        syncConflicts={state.syncConflicts}
        onForceSync={async () => {
          await coreService.processSyncQueue();
          await coreService.firebaseAdapter.syncInitialCollectionsAndRoles(
            coreService.getState()
          );
          await coreService.pullFromFirebase();
          refreshState();
        }}
        onExportBackup={() =>
          storageEngine.exportEncryptedBackupBundle(coreService.getState())
        }
        onRestoreBackup={async (json) => {
          await storageEngine.restoreFromBackupBundle(json);
          await coreService.initializeFromStorage();
          refreshState();
        }}
      />

      {/* ====================================================================
          HOJA INFERIOR (BOTTOM SHEET): REGISTRAR NUEVA OPERACIÓN
         ==================================================================== */}
      <BottomSheet
        isOpen={Boolean(newOpModalType)}
        onClose={() => setNewOpModalType(null)}
        title={
          newOpModalType === 'SALE'
            ? 'Anotar Venta'
            : newOpModalType === 'PURCHASE'
            ? 'Comprar Fruta a Proveedor'
            : newOpModalType === 'COLLECTION_PAST_DEBT'
            ? 'Cobrar Fiado'
            : newOpModalType === 'EXPENSE'
            ? 'Anotar Gasto o Personal'
            : newOpModalType === 'SUPPLIER_RETURN'
            ? 'Devolución al Proveedor'
            : 'Movimiento de Canastillas'
        }
        subtitle="Se guarda inmediatamente en la memoria del dispositivo"
        icon={<Plus className="w-5 h-5" />}
      >
        <form onSubmit={handleSaveNewOperation} className="space-y-4">
          {(newOpModalType === 'SALE' ||
            newOpModalType === 'PURCHASE' ||
            newOpModalType === 'SUPPLIER_RETURN') && (
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                Producto
              </label>
              <div className="grid grid-cols-1 gap-2">
                {state.products.map((p) => {
                  const selected = opProductId === p.id;
                  const refPrice =
                    newOpModalType === 'PURCHASE'
                      ? p.defaultCostPrice
                      : p.defaultSalePrice;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setOpProductId(p.id);
                        setOpUnitPrice(refPrice);
                      }}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                          : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-semibold truncate">
                        {p.name}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 tabular-nums ${
                          selected
                            ? 'bg-green-700 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {formatCOP(refPrice)} / {p.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(newOpModalType === 'SALE' ||
            newOpModalType === 'COLLECTION_PAST_DEBT' ||
            newOpModalType === 'CRATE_MOVEMENT') && (
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                Cliente
              </label>
              <div className="grid grid-cols-1 gap-2">
                {state.clients.map((c) => {
                  const selected = opClientId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setOpClientId(c.id)}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                          : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-semibold truncate">
                        {c.name}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 tabular-nums ${
                          c.historicalPrincipalDebt > 0
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Deuda: {formatCOP(c.historicalPrincipalDebt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(newOpModalType === 'PURCHASE' ||
            newOpModalType === 'SUPPLIER_RETURN') && (
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                Proveedor
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {state.suppliers.map((s) => {
                  const selected = opSupplierId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setOpSupplierId(s.id)}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                          : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="text-sm font-bold truncate">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        Tel: {s.phone}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(newOpModalType === 'SALE' || newOpModalType === 'PURCHASE') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={opQuantity}
                    onChange={(e) => setOpQuantity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                    Precio unitario ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={opUnitPrice}
                    onChange={(e) => setOpUnitPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-green-50 border border-green-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-green-950">
                  Total de la operación:
                </span>
                <strong className="text-xl font-extrabold text-green-800 tabular-nums">
                  {formatCOP(opQuantity * opUnitPrice)}
                </strong>
              </div>
            </>
          )}

          {newOpModalType === 'COLLECTION_PAST_DEBT' && (
            <>
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                  Origen de la deuda que estás cobrando
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    [
                      {
                        id: 'PAST',
                        title: 'Deuda de jornadas anteriores',
                        sub: 'No se suma como venta nueva ni utilidad nueva',
                      },
                      {
                        id: 'CURRENT',
                        title: 'Abono a venta fiada de hoy',
                        sub: 'Reduce el saldo pendiente de la jornada actual',
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = opCollectionKind === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOpCollectionKind(opt.id)}
                        className={`w-full p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-sm font-bold">{opt.title}</div>
                        <div className="text-xs text-slate-600">{opt.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                    Abono a capital ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={opCollectionAmount}
                    onChange={(e) =>
                      setOpCollectionAmount(Number(e.target.value))
                    }
                  />
                </div>

                {opCollectionKind === 'PAST' && (
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                      Interés acordado cobrado ($)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                      value={opCollectionInterest}
                      onChange={(e) =>
                        setOpCollectionInterest(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {newOpModalType === 'EXPENSE' && (
            <>
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                  Categoría del gasto
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'FUEL', label: 'Combustible / ACPM' },
                      { id: 'TOLL_PARKING', label: 'Peaje / Parqueo' },
                      { id: 'FOOD', label: 'Alimentación' },
                      { id: 'PERSONNEL_PAYMENT', label: 'Pago Ayudante' },
                      { id: 'OTHER', label: 'Otro gasto' },
                    ] as const
                  ).map((cat) => {
                    const selected = opExpenseCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setOpExpenseCategory(cat.id)}
                        className={`min-h-[46px] px-3 py-2 rounded-xl border text-left text-sm font-bold transition-colors cursor-pointer ${
                          selected
                            ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                  Valor pagado ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                  value={opExpenseAmount}
                  onChange={(e) => setOpExpenseAmount(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {newOpModalType === 'SUPPLIER_RETURN' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                    Cantidad entregada
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={opDeliveredQty}
                    onChange={(e) => setOpDeliveredQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                    Cantidad aceptada
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={opDeliveredQty}
                    className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={opAcceptedQty}
                    onChange={(e) => setOpAcceptedQty(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                  Compensación del proveedor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: 'CREDIT_BALANCE',
                        label: 'Saldo a favor nuestro',
                        sub: 'No suma a efectivo hoy',
                      },
                      {
                        id: 'PENDING_COMPENSATION',
                        label: 'Pendiente de compensar',
                        sub: 'No suma a efectivo hoy',
                      },
                      {
                        id: 'CASH_REFUND_RECEIVED',
                        label: 'Efectivo recibido hoy',
                        sub: 'Suma a efectivo en caja',
                      },
                      {
                        id: 'PRODUCT_EXCHANGE',
                        label: 'Cambio por producto',
                        sub: 'Reposición de fruta',
                      },
                    ] as const
                  ).map((comp) => {
                    const selected = opCompensationType === comp.id;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => setOpCompensationType(comp.id)}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-sm font-bold">{comp.label}</div>
                        <div className="text-xs text-slate-500">{comp.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {newOpModalType === 'CRATE_MOVEMENT' && (
            <>
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                  Tipo de movimiento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: 'DELIVERED_TO_CLIENT',
                        label: 'Prestadas al cliente',
                      },
                      {
                        id: 'RETURNED_BY_CLIENT',
                        label: 'Devueltas por cliente',
                      },
                      {
                        id: 'RECEIVED_FROM_SUPPLIER',
                        label: 'Recibidas de proveedor',
                      },
                      {
                        id: 'RETURNED_TO_SUPPLIER',
                        label: 'Devueltas a proveedor',
                      },
                    ] as const
                  ).map((mv) => {
                    const selected = opCrateType === mv.id;
                    return (
                      <button
                        key={mv.id}
                        type="button"
                        onClick={() => setOpCrateType(mv.id)}
                        className={`min-h-[46px] px-3 py-2 rounded-xl border text-left text-sm font-bold transition-colors cursor-pointer ${
                          selected
                            ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {mv.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                  Cantidad de canastillas
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                  value={opQuantity}
                  onChange={(e) => setOpQuantity(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {newOpModalType !== 'CRATE_MOVEMENT' &&
            newOpModalType !== 'SUPPLIER_RETURN' && (
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-1.5">
                  Medio de pago
                </label>
                <div
                  className={`grid gap-2 ${
                    newOpModalType === 'SALE' ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  {(
                    [
                      { id: 'CASH', label: 'Efectivo', sub: 'Billetes' },
                      {
                        id: 'TRANSFER',
                        label: 'Transferencia',
                        sub: 'Banco / Nequi',
                      },
                      ...(newOpModalType === 'SALE'
                        ? [
                            {
                              id: 'CREDIT' as const,
                              label: 'Fiado',
                              sub: 'Crédito',
                            },
                          ]
                        : []),
                    ] as const
                  ).map((pm) => {
                    const selected = opPaymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() =>
                          setOpPaymentMethod(pm.id as PaymentMethod)
                        }
                        className={`min-h-[52px] px-2.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center transition-colors cursor-pointer ${
                          selected
                            ? 'bg-green-700 border-green-700 text-white shadow-2xs'
                            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="text-sm font-bold leading-tight">
                          {pm.label}
                        </span>
                        <span
                          className={`text-[11px] leading-tight mt-0.5 ${
                            selected ? 'text-green-100' : 'text-slate-500'
                          }`}
                        >
                          {pm.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {newOpModalType === 'SALE' && opPaymentMethod === 'CREDIT' && (
            <div>
              <label className="block text-base font-bold text-slate-800 mb-1.5">
                Abono inmediato recibido hoy en efectivo ($)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={opQuantity * opUnitPrice}
                className="w-full min-h-[52px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                value={opPaidImmediate}
                onChange={(e) => setOpPaidImmediate(Number(e.target.value))}
              />
            </div>
          )}

          <div>
            <label className="block text-base font-bold text-slate-800 mb-1.5">
              Nota u observación (opcional)
            </label>
            <input
              type="text"
              placeholder="Escribe un detalle breve..."
              className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              value={opNotes}
              onChange={(e) => setOpNotes(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewOpModalType(null)}
              className="min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[54px] px-4 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-base shadow-xs cursor-pointer"
            >
              Guardar registro
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* ====================================================================
          HOJA INFERIOR (BOTTOM SHEET): EDITAR OPERACIÓN O SOLICITAR PERMISO
         ==================================================================== */}
      {editingOp && activeShift && (
        <BottomSheet
          isOpen={Boolean(editingOp)}
          onClose={() => setEditingOp(null)}
          title={(() => {
            const win = coreService.timeEngine.isWithinEditWindow(
              editingOp,
              activeShift.editWindowMinutes
            );
            const approvedAuth = state.authorizations.find(
              (a) =>
                a.operationId === editingOp.id &&
                a.status === 'APPROVED' &&
                a.approvedOperationVersion === editingOp.version
            );
            if (approvedAuth) return 'Aplicar cambio autorizado';
            if (win.withinWindow) return 'Corregir registro';
            return 'Solicitar autorización al dueño';
          })()}
          subtitle={`Operación ${editingOp.id} · Versión #${editingOp.version}`}
          icon={<ShieldAlert className="w-5 h-5" />}
        >
          {(() => {
            const win = coreService.timeEngine.isWithinEditWindow(
              editingOp,
              activeShift.editWindowMinutes
            );
            const approvedAuth = state.authorizations.find(
              (a) =>
                a.operationId === editingOp.id &&
                a.status === 'APPROVED' &&
                a.approvedOperationVersion === editingOp.version
            );

            return (
              <form onSubmit={handleConfirmEditOrRequest} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">
                    Valor registrado actualmente:
                  </span>
                  <strong className="text-lg font-bold text-slate-900 tabular-nums">
                    {formatCOP(editingOp.payload.totalAmount)}
                  </strong>
                </div>

                {approvedAuth && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                    <p className="text-sm font-medium text-amber-950 leading-relaxed">
                      “{MANDATORY_EXPIRED_EDIT_WARNING}”.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer text-sm font-bold text-amber-950">
                      <input
                        type="checkbox"
                        className="w-5 h-5 mt-0.5 accent-amber-700 rounded shrink-0"
                        checked={editWarningConfirmed}
                        onChange={(e) =>
                          setEditWarningConfirmed(e.target.checked)
                        }
                      />
                      <span>
                        Confirmo que leí la advertencia y verifiqué la información antes de continuar.
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1.5">
                    Nuevo valor total ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    disabled={Boolean(approvedAuth)}
                    className="w-full min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 text-xl font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={editNewAmount}
                    onChange={(e) => setEditNewAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 mb-1.5">
                    Motivo obligatorio de la modificación
                  </label>
                  <input
                    type="text"
                    placeholder="Indica por qué necesitas realizar este cambio..."
                    className="w-full min-h-[52px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingOp(null)}
                    className="min-h-[54px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`min-h-[54px] px-4 py-3 rounded-xl font-bold text-base text-white shadow-xs cursor-pointer ${
                      approvedAuth
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : win.withinWindow
                        ? 'bg-green-700 hover:bg-green-800'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {approvedAuth
                      ? 'Confirmar cambio'
                      : win.withinWindow
                      ? 'Guardar corrección'
                      : 'Enviar solicitud'}
                  </button>
                </div>
              </form>
            );
          })()}
        </BottomSheet>
      )}
    </ResponsivePwaShell>
  );
}
