import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Ban,
  Bell,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  History,
  KeyRound,
  Lock,
  Package,
  Plus,
  Receipt,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Sunrise,
  Truck,
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
import { SearchableSelect } from './components/ui/SearchableSelect';
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
  const [connectionSheetOpen, setConnectionSheetOpen] =
    useState<boolean>(false);
  const [authSheetOpen, setAuthSheetOpen] = useState<boolean>(false);

  // Modales solicitados por el usuario:
  // 1. Modal de Cerrar Día (desde Ruta de Hoy)
  const [closureModalOpen, setClosureModalOpen] = useState<boolean>(false);
  // 2. Modal de Campanita (Autorizaciones / Notificaciones)
  const [notificationsModalOpen, setNotificationsModalOpen] =
    useState<boolean>(false);
  // 3. Modal de Auditoría y Pruebas seccionado por Tabs (desde vista Dueño)
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditModalTab, setAuditModalTab] = useState<
    'LOGS' | 'CONFLICTS' | 'TESTS'
  >('LOGS');

  // Sub-tabs de la vista Dueño
  const [ownerSubTab, setOwnerSubTab] = useState<
    'POLICIES' | 'HELPERS' | 'ADJUSTMENTS'
  >('POLICIES');

  // Buscador y filtro en vista Cobros y Deudas (Clientes)
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [clientFilterMode, setClientFilterMode] = useState<
    'ALL' | 'WITH_MONEY_DEBT' | 'WITH_CRATE_DEBT'
  >('ALL');

  const [activeUserId, setActiveUserId] = useState<string>('USR-HELPER-01');
  const [activeTab, setActiveTab] = useState<NavTabId>('OPERATE');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // Estado para crear nueva operación (Bottom Sheet optimizado)
  const [newOpModalType, setNewOpModalType] = useState<OperationType | null>(
    null
  );
  // Contexto del modal de operación: 'FAB' (Venta/Gasto), 'SUPPLIER' (Compra/Devolución/Canastilla Prov), 'CLIENT' (Cobro/Devolución Canastilla Cliente)
  const [opModalContext, setOpModalContext] = useState<
    'FAB' | 'SUPPLIER' | 'CLIENT'
  >('FAB');

  const [opProductId, setOpProductId] = useState<string>('PROD-BANANO-PRIMERA');
  const [opClientId, setOpClientId] = useState<string>('CLI-DON-JOSE');
  const [opSupplierId, setOpSupplierId] = useState<string>('SUP-ESPERANZA');
  const [opQuantity, setOpQuantity] = useState<number>(5);
  const [opUnitPrice, setOpUnitPrice] = useState<number>(38000);
  const [opPaymentMethod, setOpPaymentMethod] =
    useState<PaymentMethod>('CASH');
  const [opPaidImmediate, setOpPaidImmediate] = useState<number>(0);
  // Deuda automática de canastillas al vender producto con canastilla
  const [opAutoLeaveCrates, setOpAutoLeaveCrates] = useState<boolean>(false);
  const [opAutoCratesCount, setOpAutoCratesCount] = useState<number>(5);

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
    'RETURNED_BY_CLIENT'
  );
  const [opNotes, setOpNotes] = useState<string>('');

  // Estado para editar / solicitar autorización de operación existente (Bottom Sheet)
  const [editingOp, setEditingOp] = useState<RouteOperation | null>(null);
  const [editNewAmount, setEditNewAmount] = useState<number>(0);
  const [editNewQty, setEditNewQty] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');
  const [editWarningConfirmed, setEditWarningConfirmed] =
    useState<boolean>(false);

  // Estado del asistente paso a paso de cierre (4 pasos en Modal de Cerrar Día)
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

  // Cálculo en tiempo real de deuda monetaria y deuda de canastillas por cada cliente
  const clientBalances = useMemo(() => {
    const shiftOps = activeShift
      ? state.operations.filter((o) => o.shiftId === activeShift.id)
      : [];

    return state.clients.map((client) => {
      let currentShiftCreditPending = 0;
      let pastPrincipalCollectedToday = 0;
      let pastInterestCollectedToday = 0;
      let cratesDeliveredToday = 0;
      let cratesReturnedToday = 0;

      for (const op of shiftOps) {
        if (op.payload.clientId !== client.id) continue;
        if (op.type === 'SALE' && op.payload.paymentMethod === 'CREDIT') {
          const paidImm = op.payload.amountPaidImmediate ?? 0;
          currentShiftCreditPending += Math.max(
            0,
            op.payload.totalAmount - paidImm
          );
        } else if (op.type === 'COLLECTION_CURRENT') {
          currentShiftCreditPending = Math.max(
            0,
            currentShiftCreditPending - op.payload.totalAmount
          );
        } else if (op.type === 'COLLECTION_PAST_DEBT') {
          pastPrincipalCollectedToday +=
            op.payload.principalApplied ?? op.payload.totalAmount;
          pastInterestCollectedToday += op.payload.interestApplied ?? 0;
        } else if (op.type === 'CRATE_MOVEMENT') {
          const qty = op.payload.crateQuantity ?? op.payload.quantity ?? 0;
          if (op.payload.crateMovementType === 'DELIVERED_TO_CLIENT') {
            cratesDeliveredToday += qty;
          } else if (op.payload.crateMovementType === 'RETURNED_BY_CLIENT') {
            cratesReturnedToday += qty;
          }
        }
      }

      const remainingPastPrincipal = Math.max(
        0,
        client.historicalPrincipalDebt - pastPrincipalCollectedToday
      );
      const remainingPastInterest = Math.max(
        0,
        client.accruedAgreedInterest - pastInterestCollectedToday
      );
      const totalMoneyDebt =
        remainingPastPrincipal +
        remainingPastInterest +
        currentShiftCreditPending;
      const totalCratesOwed = Math.max(
        0,
        client.cratesHeld + cratesDeliveredToday - cratesReturnedToday
      );

      return {
        client,
        remainingPastPrincipal,
        remainingPastInterest,
        currentShiftCreditPending,
        totalMoneyDebt,
        totalCratesOwed,
      };
    });
  }, [state.clients, state.operations, activeShift]);

  const filteredClientBalances = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    return clientBalances.filter((item) => {
      if (
        clientFilterMode === 'WITH_MONEY_DEBT' &&
        item.totalMoneyDebt <= 0
      ) {
        return false;
      }
      if (
        clientFilterMode === 'WITH_CRATE_DEBT' &&
        item.totalCratesOwed <= 0
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.client.name.toLowerCase().includes(q) ||
        (item.client.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [clientBalances, clientSearchQuery, clientFilterMode]);

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
        text: 'Modo sin señal activado. Todos los registros se guardan en el dispositivo y se enviarán al recuperar cobertura.',
      });
    }
    refreshState();
  };

  const openOperationModal = (
    type: OperationType,
    context: 'FAB' | 'SUPPLIER' | 'CLIENT' = 'FAB',
    options?: {
      preselectedClientId?: string;
      preselectedSupplierId?: string;
      crateMovementType?: CrateMovementType;
    }
  ) => {
    setFeedback(null);
    setOpModalContext(context);
    setNewOpModalType(type);

    const defaultProd = state.products[0];
    setOpProductId(defaultProd.id);
    setOpQuantity(5);
    setOpUnitPrice(
      type === 'PURCHASE'
        ? defaultProd.defaultCostPrice
        : defaultProd.defaultSalePrice
    );
    const prodUsesCrates = defaultProd.unit
      .toLowerCase()
      .includes('canastilla');
    setOpAutoLeaveCrates(prodUsesCrates);
    setOpAutoCratesCount(5);

    if (options?.preselectedClientId) {
      setOpClientId(options.preselectedClientId);
      const bal = clientBalances.find(
        (b) => b.client.id === options.preselectedClientId
      );
      if (bal) {
        if (type === 'COLLECTION_PAST_DEBT') {
          if (
            bal.remainingPastPrincipal <= 0 &&
            bal.currentShiftCreditPending > 0
          ) {
            setOpCollectionKind('CURRENT');
            setOpCollectionAmount(bal.currentShiftCreditPending);
            setOpCollectionInterest(0);
          } else {
            setOpCollectionKind('PAST');
            setOpCollectionAmount(bal.remainingPastPrincipal || 50000);
            setOpCollectionInterest(bal.remainingPastInterest);
          }
        }
        if (type === 'CRATE_MOVEMENT' && bal.totalCratesOwed > 0) {
          setOpQuantity(bal.totalCratesOwed);
        }
      }
    }
    if (options?.preselectedSupplierId) {
      setOpSupplierId(options.preselectedSupplierId);
    }
    if (options?.crateMovementType) {
      setOpCrateType(options.crateMovementType);
    } else if (context === 'CLIENT') {
      setOpCrateType('RETURNED_BY_CLIENT');
    } else if (context === 'SUPPLIER') {
      setOpCrateType('RECEIVED_FROM_SUPPLIER');
    }

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
      const isSupplierMove =
        opCrateType === 'RECEIVED_FROM_SUPPLIER' ||
        opCrateType === 'RETURNED_TO_SUPPLIER';
      payload = {
        clientId: isSupplierMove ? undefined : client?.id,
        clientName: isSupplierMove ? undefined : client?.name,
        supplierId: isSupplierMove ? supplier?.id : undefined,
        supplierName: isSupplierMove ? supplier?.name : undefined,
        crateMovementType: opCrateType,
        crateQuantity: opQuantity,
        quantity: opQuantity,
        totalAmount: 0,
        notes:
          opNotes ||
          (opCrateType === 'RETURNED_BY_CLIENT'
            ? `Devolución de ${opQuantity} canastillas por ${client?.name ?? 'cliente'}`
            : 'Movimiento de canastillas'),
      };
    }

    const res = await coreService.createOperation({
      actorUserId: currentUser.id,
      shiftId: activeShift.id,
      type: actualType,
      payload,
    });

    if (res.ok) {
      // DEUDA AUTOMÁTICA DE CANASTILLAS:
      // Si es una venta y el producto deja canastillas al cliente, generar automáticamente
      // el movimiento de préstamo de canastillas al cliente hasta que las devuelva.
      let autoCrateMsg = '';
      if (
        actualType === 'SALE' &&
        opAutoLeaveCrates &&
        opAutoCratesCount > 0 &&
        client
      ) {
        await coreService.createOperation({
          actorUserId: currentUser.id,
          shiftId: activeShift.id,
          type: 'CRATE_MOVEMENT',
          payload: {
            clientId: client.id,
            clientName: client.name,
            crateMovementType: 'DELIVERED_TO_CLIENT',
            crateQuantity: opAutoCratesCount,
            quantity: opAutoCratesCount,
            totalAmount: 0,
            notes: `Deuda automática de ${opAutoCratesCount} canastillas por venta de ${product?.name ?? 'fruta'}`,
          },
        });
        autoCrateMsg = ` (+${opAutoCratesCount} canastillas cargadas automáticamente a ${client.name})`;
      }

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
      setFeedback({
        type: 'success',
        text: `${res.message}${autoCrateMsg}`,
      });
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
    } else if (approvedAuth) {
      const res = await coreService.editOperation({
        actorUserId: currentUser.id,
        operationId: editingOp.id,
        newPayload: updatedPayload,
        reason: editReason,
        authorizationId: approvedAuth.id,
        warningConfirmed: editWarningConfirmed,
      });
      if (res.ok) {
        setEditingOp(null);
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } else {
      const res = await coreService.requestExpiredEditAuthorization({
        actorUserId: currentUser.id,
        operationId: editingOp.id,
        requestedPayload: updatedPayload,
        reason: editReason,
      });
      if (res.ok) {
        setEditingOp(null);
        setFeedback({ type: 'warning', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    }
    refreshState();
  };

  const shiftOperations = activeShift
    ? state.operations.filter((o) => o.shiftId === activeShift.id)
    : [];

  const getOperationTypeLabel = (type: OperationType) => {
    switch (type) {
      case 'SALE':
        return 'Venta a cliente';
      case 'PURCHASE':
        return 'Compra a proveedor';
      case 'COLLECTION_CURRENT':
        return 'Abono venta de hoy';
      case 'COLLECTION_PAST_DEBT':
        return 'Cobro deuda anterior';
      case 'EXPENSE':
        return 'Gasto operativo';
      case 'SUPPLIER_RETURN':
        return 'Devolución a proveedor';
      case 'CRATE_MOVEMENT':
        return 'Canastillas';
      default:
        return type;
    }
  };

  // Opciones formateadas para el selector con buscador (soporta 70+ clientes y 10+ productos)
  const productPickerOptions = useMemo(
    () =>
      state.products.map((p) => {
        const price =
          newOpModalType === 'PURCHASE'
            ? p.defaultCostPrice
            : p.defaultSalePrice;
        return {
          id: p.id,
          label: p.name,
          sublabel: `Unidad: ${p.unit}`,
          badgeText: `${formatCOP(price)} / ${p.unit}`,
          badgeTone: 'green' as const,
        };
      }),
    [state.products, newOpModalType]
  );

  const clientPickerOptions = useMemo(
    () =>
      clientBalances.map((b) => ({
        id: b.client.id,
        label: b.client.name,
        sublabel: `Tel: ${b.client.phone} · Canastillas: ${b.totalCratesOwed}`,
        badgeText:
          b.totalMoneyDebt > 0
            ? `Deuda: ${formatCOP(b.totalMoneyDebt)}`
            : 'Al día',
        badgeTone:
          b.totalMoneyDebt > 0 ? ('amber' as const) : ('slate' as const),
      })),
    [clientBalances]
  );

  const supplierPickerOptions = useMemo(
    () =>
      state.suppliers.map((s) => ({
        id: s.id,
        label: s.name,
        sublabel: `Tel: ${s.phone}`,
        badgeText:
          s.creditBalanceInFavor > 0
            ? `Saldo favor: ${formatCOP(s.creditBalanceInFavor)}`
            : 'Proveedor activo',
        badgeTone:
          s.creditBalanceInFavor > 0 ? ('green' as const) : ('slate' as const),
      })),
    [state.suppliers]
  );

  // Panel lateral derecho en pantallas grandes (Desktop)
  const rightSummaryPanel =
    reconciliation && activeShift ? (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-700" />
            <h3 className="font-bold text-base text-slate-900">
              Resumen en Tiempo Real
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {activeShift.operatingDate}
          </span>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-600">Ventas del día:</span>
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

        <button
          type="button"
          onClick={() => setClosureModalOpen(true)}
          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>Cerrar Día / Conciliación</span>
        </button>
      </div>
    ) : null;

  return (
    <ResponsivePwaShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      isOnline={isOnline}
      onOpenConnectionSheet={() => setConnectionSheetOpen(true)}
      onOpenAuthSheet={() => setAuthSheetOpen(true)}
      onOpenNotificationsModal={() => setNotificationsModalOpen(true)}
      onOpenQuickSale={() => openOperationModal('SALE', 'FAB')}
      onOpenQuickExpense={() => openOperationModal('EXPENSE', 'FAB')}
      pendingSyncCount={pendingSyncCount}
      pendingAuthCount={pendingAuthRequests.length}
      activeUser={currentUser}
      expectedCashFormatted={
        reconciliation
          ? formatCOP(reconciliation.financials.expectedCashInBox)
          : undefined
      }
      shiftOpen={activeShift?.status === 'OPEN'}
      firebaseProjectId={coreService.firebaseAdapter.getProjectId()}
      rightPanel={rightSummaryPanel}
    >
      {/* Avisos de estado claros y elegantes */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-950'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
            )}
            {feedback.type === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            )}
            {feedback.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            )}
            <span className="text-sm sm:text-base font-medium leading-snug">
              {feedback.text}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 px-1.5 py-0.5 cursor-pointer"
          >
            ✕
          </button>
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
              VISTA 1: RUTA DE HOY (Indicadores del día + Botón Cerrar Día + Historial)
             ==================================================================== */}
          {activeTab === 'OPERATE' && activeShift && reconciliation && (
            <main className="space-y-4">
              {/* Tarjeta principal de la Jornada + Botón directo para Cerrar Día */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 border border-green-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                          Jornada {activeShift.operatingDate}
                        </h2>
                        {activeShift.status === 'OPEN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-800 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                            Abierta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <Lock className="w-3 h-3" />
                            Cerrada
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 truncate">
                        {activeShift.vehicle} · Resp:{' '}
                        <strong className="text-slate-800">
                          {activeShift.responsibleUserName}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Botón prominente para Cerrar Día en Modal */}
                  <button
                    type="button"
                    onClick={() => setClosureModalOpen(true)}
                    className={`w-full sm:w-auto min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer ${
                      activeShift.status === 'OPEN'
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-green-700 hover:bg-green-800 text-white'
                    }`}
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      {activeShift.status === 'OPEN'
                        ? 'Cerrar Día / Arqueo'
                        : 'Ver Cierre / Abrir Nueva Jornada'}
                    </span>
                  </button>
                </div>

                {/* Indicadores clave del día (4 tarjetas claras) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-green-50/90 border border-green-200">
                    <span className="block text-xs font-semibold text-green-900">
                      Efectivo en caja
                    </span>
                    <strong className="text-lg sm:text-xl font-extrabold text-green-800 tabular-nums">
                      {formatCOP(reconciliation.financials.expectedCashInBox)}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="block text-xs font-medium text-slate-600">
                      Ventas de hoy
                    </span>
                    <strong className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
                      {formatCOP(reconciliation.financials.totalSalesAmount)}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="block text-xs font-medium text-amber-900">
                      Fiados hoy
                    </span>
                    <strong className="text-lg sm:text-xl font-bold text-amber-800 tabular-nums">
                      {formatCOP(
                        reconciliation.financials
                          .pendingReceivablesFromCurrentSales
                      )}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                    <span className="block text-xs font-medium text-blue-900">
                      Utilidad neta
                    </span>
                    <strong className="text-lg sm:text-xl font-bold text-blue-800 tabular-nums">
                      {formatCOP(reconciliation.financials.economicNetProfit)}
                    </strong>
                  </div>
                </div>
              </section>

              {/* Inventario actual en el camión y Canastillas */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-700" />
                    <h3 className="text-base font-bold text-slate-900">
                      Inventario disponible en el camión
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                    Canastillas en camión:{' '}
                    {reconciliation.crates.finalCratesInVehicle} · En clientes:{' '}
                    {reconciliation.crates.totalCratesHeldByClients}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {reconciliation.inventory.items.map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {item.productName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Inic: {item.initialInventory} · Comp:{' '}
                          {item.purchasesQty} · Vend: {item.soldQty}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <strong className="text-lg font-extrabold text-green-800 tabular-nums">
                          {item.expectedFinalInventory}
                        </strong>
                        <span className="block text-[11px] font-semibold text-slate-500">
                          {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Historial de Operaciones de la Jornada */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Registros de hoy ({shiftOperations.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Plazo de edición directa:{' '}
                      <strong>{activeShift.editWindowMinutes} min</strong> desde cada registro
                    </p>
                  </div>
                </div>

                {shiftOperations.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Aún no hay operaciones registradas hoy. Usa el botón flotante{' '}
                    <strong>"+ Anotar Venta"</strong> para empezar.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {shiftOperations.map((op) => {
                      const win = coreService.timeEngine.isWithinEditWindow(
                        op,
                        activeShift.editWindowMinutes
                      );
                      const pendingReq = state.authorizations.find(
                        (a) =>
                          a.operationId === op.id && a.status === 'PENDING'
                      );
                      const approvedReq = state.authorizations.find(
                        (a) =>
                          a.operationId === op.id &&
                          a.status === 'APPROVED' &&
                          a.approvedOperationVersion === op.version
                      );

                      return (
                        <div
                          key={op.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
                                {getOperationTypeLabel(op.type)}
                              </span>
                              {win.withinWindow ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                  <Clock className="w-3 h-3" />
                                  Editable ({win.remainingMinutesFormatted})
                                </span>
                              ) : approvedReq ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Autorizado por Dueño
                                </span>
                              ) : pendingReq ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                  <Clock className="w-3 h-3" />
                                  Esperando permiso del dueño
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  <Lock className="w-3 h-3" />
                                  Plazo vencido
                                </span>
                              )}
                            </div>

                            <div className="text-sm font-bold text-slate-900 truncate">
                              {op.payload.productName ||
                                op.payload.clientName ||
                                op.payload.supplierName ||
                                op.payload.description ||
                                'Movimiento de ruta'}
                              {op.payload.quantity
                                ? ` · ${op.payload.quantity} und.`
                                : ''}
                            </div>
                            {op.payload.notes && (
                              <div className="text-xs text-slate-500 truncate">
                                {op.payload.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/70">
                            <strong className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">
                              {formatCOP(op.payload.totalAmount)}
                            </strong>

                            {activeShift.status === 'OPEN' && (
                              <button
                                type="button"
                                onClick={() => openEditOperationModal(op)}
                                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  approvedReq
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : win.withinWindow
                                    ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {approvedReq
                                    ? 'Aplicar cambio'
                                    : win.withinWindow
                                    ? 'Corregir'
                                    : 'Pedir permiso'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </main>
          )}

          {/* ====================================================================
              VISTA 2: COMPRAS Y DEVOLUCIONES (Todo lo que se gestiona con el Proveedor)
             ==================================================================== */}
          {activeTab === 'SUPPLIERS' && activeShift && (
            <main className="space-y-4">
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 border border-green-100 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Compras y Devoluciones (Proveedores)
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Registra entradas de carga, devoluciones de fruta y canastillas con fincas proveedoras
                    </p>
                  </div>
                </div>

                {/* Botones unificados de operación con Proveedor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    disabled={activeShift.status === 'CLOSED'}
                    onClick={() => openOperationModal('PURCHASE', 'SUPPLIER')}
                    className="min-h-[60px] p-3.5 rounded-2xl bg-green-700 hover:bg-green-800 disabled:opacity-40 text-white font-bold text-left flex items-center gap-3 shadow-xs transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base leading-tight">
                        Comprar Fruta
                      </div>
                      <div className="text-xs text-green-100 font-normal">
                        Entrada de carga al camión
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={activeShift.status === 'CLOSED'}
                    onClick={() =>
                      openOperationModal('SUPPLIER_RETURN', 'SUPPLIER')
                    }
                    className="min-h-[60px] p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-950 border border-amber-300 font-bold text-left flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base leading-tight">
                        Devolver a Proveedor
                      </div>
                      <div className="text-xs text-amber-800 font-normal">
                        Entregada vs. aceptada
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={activeShift.status === 'CLOSED'}
                    onClick={() =>
                      openOperationModal('CRATE_MOVEMENT', 'SUPPLIER', {
                        crateMovementType: 'RECEIVED_FROM_SUPPLIER',
                      })
                    }
                    className="min-h-[60px] p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-900 border border-slate-300 font-bold text-left flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base leading-tight">
                        Canastillas Proveedor
                      </div>
                      <div className="text-xs text-slate-600 font-normal">
                        Recibidas o devueltas a finca
                      </div>
                    </div>
                  </button>
                </div>
              </section>

              {/* Directorio de Proveedores y Saldos a Favor */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  Proveedores registrados ({state.suppliers.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {state.suppliers.map((sup) => (
                    <div
                      key={sup.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-base text-slate-900">
                            {sup.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Tel: {sup.phone}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-800 border border-green-200 tabular-nums">
                          Saldo a favor: {formatCOP(sup.creditBalanceInFavor)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={activeShift.status === 'CLOSED'}
                          onClick={() =>
                            openOperationModal('PURCHASE', 'SUPPLIER', {
                              preselectedSupplierId: sup.id,
                            })
                          }
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Comprar</span>
                        </button>
                        <button
                          type="button"
                          disabled={activeShift.status === 'CLOSED'}
                          onClick={() =>
                            openOperationModal('SUPPLIER_RETURN', 'SUPPLIER', {
                              preselectedSupplierId: sup.id,
                            })
                          }
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Devolver</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Historial de Compras y Devoluciones de Hoy */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  Compras y devoluciones de hoy
                </h3>
                {shiftOperations.filter(
                  (o) =>
                    o.type === 'PURCHASE' ||
                    o.type === 'SUPPLIER_RETURN' ||
                    (o.type === 'CRATE_MOVEMENT' &&
                      (o.payload.crateMovementType ===
                        'RECEIVED_FROM_SUPPLIER' ||
                        o.payload.crateMovementType ===
                          'RETURNED_TO_SUPPLIER'))
                ).length === 0 ? (
                  <p className="text-sm text-slate-500 py-3">
                    No se han registrado compras ni devoluciones a proveedores en esta jornada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {shiftOperations
                      .filter(
                        (o) =>
                          o.type === 'PURCHASE' ||
                          o.type === 'SUPPLIER_RETURN' ||
                          (o.type === 'CRATE_MOVEMENT' &&
                            (o.payload.crateMovementType ===
                              'RECEIVED_FROM_SUPPLIER' ||
                              o.payload.crateMovementType ===
                                'RETURNED_TO_SUPPLIER'))
                      )
                      .map((op) => (
                        <div
                          key={op.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-green-800">
                              {getOperationTypeLabel(op.type)}
                            </span>
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {op.payload.supplierName || 'Proveedor'} ·{' '}
                              {op.payload.productName || 'Canastillas'} (
                              {op.payload.quantity} und.)
                            </div>
                          </div>
                          <strong className="text-base font-extrabold text-slate-900 tabular-nums shrink-0">
                            {formatCOP(op.payload.totalAmount)}
                          </strong>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </main>
          )}

          {/* ====================================================================
              VISTA 3: COBROS Y DEUDAS (Todo lo que se gestiona con el Cliente + Canastillas automáticas)
             ==================================================================== */}
          {activeTab === 'CLIENTS' && activeShift && reconciliation && (
            <main className="space-y-4">
              {/* Cabecera y resumen de cartera de dinero + deuda automática de canastillas */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Cobros y Deudas de Clientes
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Las ventas en canastilla cargan automáticamente la deuda del envase al cliente hasta que la devuelva
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="block text-xs font-semibold text-amber-900">
                      Total Cartera por Cobrar
                    </span>
                    <strong className="text-lg sm:text-xl font-extrabold text-amber-900 tabular-nums">
                      {formatCOP(
                        reconciliation.financials.totalCombinedPortfolioPending
                      )}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="block text-xs font-semibold text-blue-900">
                      Cobrado Hoy (Cartera)
                    </span>
                    <strong className="text-lg sm:text-xl font-extrabold text-blue-900 tabular-nums">
                      {formatCOP(
                        reconciliation.financials.totalPastDebtCollected
                      )}
                    </strong>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="block text-xs font-semibold text-slate-700">
                      Canastillas en Clientes
                    </span>
                    <strong className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                      {reconciliation.crates.totalCratesHeldByClients} canastillas
                    </strong>
                  </div>
                </div>

                {/* Botones generales rápidos para Cliente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={activeShift.status === 'CLOSED'}
                    onClick={() =>
                      openOperationModal('COLLECTION_PAST_DEBT', 'CLIENT')
                    }
                    className="min-h-[52px] px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Cobrar Fiado / Abono de Cliente</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeShift.status === 'CLOSED'}
                    onClick={() =>
                      openOperationModal('CRATE_MOVEMENT', 'CLIENT', {
                        crateMovementType: 'RETURNED_BY_CLIENT',
                      })
                    }
                    className="min-h-[52px] px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Boxes className="w-5 h-5" />
                    <span>Recibir Devolución de Canastillas</span>
                  </button>
                </div>
              </section>

              {/* Buscador y Filtros Rápidos para gestionar hasta 70+ clientes */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Buscar entre los clientes por nombre o teléfono..."
                      className="w-full min-h-[46px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 shrink-0">
                    {(
                      [
                        { id: 'ALL', label: 'Todos' },
                        { id: 'WITH_MONEY_DEBT', label: 'Con Deuda $' },
                        { id: 'WITH_CRATE_DEBT', label: 'Con Canastillas' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setClientFilterMode(f.id)}
                        className={`min-h-[42px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          clientFilterMode === f.id
                            ? 'bg-green-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Clientes con sus Deudas de Dinero y Deudas Automáticas de Canastillas */}
                <div className="space-y-2.5">
                  {filteredClientBalances.map((item) => (
                    <div
                      key={item.client.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-base text-slate-900 truncate">
                          {item.client.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Tel: {item.client.phone}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border tabular-nums ${
                              item.totalMoneyDebt > 0
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-green-50 text-green-800 border-green-200'
                            }`}
                          >
                            Deuda $: {formatCOP(item.totalMoneyDebt)}
                          </span>

                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border tabular-nums ${
                              item.totalCratesOwed > 0
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            Debe {item.totalCratesOwed} canastillas
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={activeShift.status === 'CLOSED'}
                          onClick={() =>
                            openOperationModal(
                              'COLLECTION_PAST_DEBT',
                              'CLIENT',
                              {
                                preselectedClientId: item.client.id,
                              }
                            )
                          }
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Cobrar $</span>
                        </button>

                        <button
                          type="button"
                          disabled={activeShift.status === 'CLOSED'}
                          onClick={() =>
                            openOperationModal('CRATE_MOVEMENT', 'CLIENT', {
                              preselectedClientId: item.client.id,
                              crateMovementType: 'RETURNED_BY_CLIENT',
                            })
                          }
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>Devolver Envase</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          )}

          {/* ====================================================================
              VISTA 4: PANEL DEL DUEÑO (Seccionado por Tabs + Botón Campanita + Botón Auditoría en Modal)
             ==================================================================== */}
          {activeTab === 'OWNER' && (
            <main className="space-y-4">
              {/* Cabecera del Dueño con accesos directos al Modal de Campanita y al Modal de Auditoría */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Administración del Dueño
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Configura políticas, auxiliares, autorizaciones y consulta la auditoría inmutable
                    </p>
                  </div>

                  {/* Botones de Modales del Dueño: Campanita de Autorizaciones y Auditoría por Tabs */}
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setNotificationsModalOpen(true)}
                      className="flex-1 sm:flex-initial min-h-[46px] px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Autorizaciones ({pendingAuthRequests.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuditModalOpen(true)}
                      className="flex-1 sm:flex-initial min-h-[46px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Auditoría y Pruebas</span>
                    </button>
                  </div>
                </div>

                {/* Pestañas (Tabs) para organizar las opciones del Dueño */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  {(
                    [
                      { id: 'POLICIES', label: 'Políticas y Cierre' },
                      { id: 'HELPERS', label: 'Auxiliares' },
                      { id: 'ADJUSTMENTS', label: 'Ajustes Post-Cierre' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOwnerSubTab(tab.id)}
                      className={`min-h-[42px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                        ownerSubTab === tab.id
                          ? 'bg-white text-green-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* TAB 1 DEL DUEÑO: POLÍTICAS DE EDICIÓN Y CIERRE */}
              {ownerSubTab === 'POLICIES' && (
                <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-5 h-5 text-green-700" />
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        Tiempo permitido para editar operaciones
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600">
                        El plazo se calcula individualmente desde la creación de cada operación
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                          await coreService.configureEditWindowAndClosurePolicy(
                            {
                              actorUserId: currentUser.id,
                              shiftId: activeShift?.id,
                              editWindowMinutes:
                                activeShift?.editWindowMinutes ??
                                state.config.editWindowMinutes,
                              allowResponsibleHelperClose: e.target.checked,
                            }
                          );
                        setFeedback({
                          type: res.ok ? 'success' : 'error',
                          text: res.message,
                        });
                        refreshState();
                      }}
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      Permitir que el auxiliar responsable asignado ejecute el cierre definitivo de la jornada
                    </span>
                  </label>
                </section>
              )}

              {/* TAB 2 DEL DUEÑO: GESTIÓN DE AUXILIARES */}
              {ownerSubTab === 'HELPERS' && (
                <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-green-700" />
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        Gestión de auxiliares de ruta
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Desactivar un auxiliar bloquea nuevas operaciones y conserva todo su historial
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
                                : 'Desactivado (historial intacto)'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              const res =
                                await coreService.setHelperActiveStatus({
                                  actorUserId: currentUser.id,
                                  targetHelperId: helper.id,
                                  active: !helper.active,
                                  reason: helper.active
                                    ? 'Desactivación administrativa con conservación de historial'
                                    : 'Reactivación autorizada por el dueño',
                                });
                              setFeedback({
                                type: res.ok ? 'success' : 'error',
                                text: res.message,
                              });
                              refreshState();
                            }}
                            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
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
                    className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5"
                  >
                    <input
                      type="text"
                      placeholder="Nombre del nuevo auxiliar..."
                      className="flex-1 min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                      value={newHelperName}
                      onChange={(e) => setNewHelperName(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="min-h-[46px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Crear auxiliar</span>
                    </button>
                  </form>
                </section>
              )}

              {/* TAB 3 DEL DUEÑO: AJUSTE POSTERIOR A JORNADA CERRADA */}
              {ownerSubTab === 'ADJUSTMENTS' && (
                <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Ajuste contable posterior a jornada cerrada
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Registra un ajuste separado y auditable sin modificar ni borrar el cierre original
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
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            Cierre histórico de referencia
                          </label>
                          <div className="flex flex-col gap-1.5">
                            {state.closures.map((c) => {
                              const selected =
                                (adjClosureId ||
                                  state.closures[0].closureId) === c.closureId;
                              return (
                                <button
                                  key={c.closureId}
                                  type="button"
                                  onClick={() => setAdjClosureId(c.closureId)}
                                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-left text-xs sm:text-sm font-bold flex items-center justify-between gap-2 cursor-pointer ${
                                    selected
                                      ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                                      : 'bg-white border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <span className="truncate">
                                    {c.closureId}
                                  </span>
                                  <span className="text-xs text-slate-500 shrink-0">
                                    {c.operatingDate}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            Diferencia monetaria a ajustar ($)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-900 tabular-nums"
                            value={adjDeltaCash}
                            onChange={(e) => {
                              setAdjDeltaCash(Number(e.target.value));
                              setAdjDeltaProfit(Number(e.target.value));
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Motivo obligatorio del ajuste posterior
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Recibo de peaje reportado después del cierre"
                          className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm sm:text-base text-slate-900"
                          value={adjReason}
                          onChange={(e) => setAdjReason(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm cursor-pointer"
                      >
                        Registrar ajuste posterior auditable
                      </button>
                    </form>
                  )}
                </section>
              )}
            </main>
          )}
        </>
      )}

      {/* ====================================================================
          MODAL 1 (CAMPANITA): NOTIFICACIONES Y AUTORIZACIONES DE EDICIÓN VENCIDA
         ==================================================================== */}
      <BottomSheet
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        title="Solicitudes de Autorización"
        subtitle="Aprobación específica del dueño para ediciones con plazo vencido"
        icon={<Bell className="w-5 h-5" />}
      >
        {pendingAuthRequests.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <div className="font-bold text-base text-slate-900">
              Todo al día
            </div>
            <p className="text-sm text-slate-600">
              No hay solicitudes pendientes de autorización en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAuthRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-2.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-amber-800">
                      {req.id} · Op {req.operationId} (v
                      {req.approvedOperationVersion})
                    </span>
                    <div className="font-bold text-sm sm:text-base text-slate-900">
                      Solicita: {req.requestedByName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">
                    Actual:{' '}
                    <strong className="tabular-nums text-slate-900">
                      {formatCOP(req.currentValueSnapshot.totalAmount)}
                    </strong>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-green-900">
                    Nuevo:{' '}
                    <strong className="tabular-nums font-extrabold">
                      {formatCOP(req.requestedValueSnapshot.totalAmount)}
                    </strong>
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 bg-white p-2.5 rounded-xl border border-amber-200">
                  <strong>Motivo:</strong> "{req.reason}"
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await coreService.decideEditAuthorization({
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
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprobar</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await coreService.decideEditAuthorization({
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
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* ====================================================================
          MODAL 2: CERRAR DÍA / CONCILIACIÓN EN 4 PASOS (Se abre desde Ruta de Hoy)
         ==================================================================== */}
      {activeShift && reconciliation && (
        <BottomSheet
          isOpen={closureModalOpen}
          onClose={() => setClosureModalOpen(false)}
          title="Cierre Definitivo de Jornada"
          subtitle={`Jornada ${activeShift.operatingDate} · ${activeShift.responsibleUserName}`}
          icon={<Lock className="w-5 h-5" />}
          headerExtra={
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { step: 1, label: '1. Sobrante' },
                  { step: 2, label: '2. Cuentas' },
                  { step: 3, label: '3. Arqueo' },
                  { step: 4, label: '4. Cerrar' },
                ] as const
              ).map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setClosureStep(s.step)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer ${
                    closureStep === s.step
                      ? 'bg-green-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          }
        >
          {/* PASO 1: INVENTARIO SOBRANTE */}
          {closureStep === 1 && (
            <div className="space-y-3.5">
              <p className="text-xs sm:text-sm text-slate-600">
                Verifica cómo queda clasificado el sobrante real de cada producto antes de cerrar:
              </p>

              <div className="space-y-3">
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
                      classification: {
                        ...currentClass,
                        ...patch,
                        expectedFinalInventory: item.expectedFinalInventory,
                      },
                    });
                    refreshState();
                  };

                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="text-sm font-bold text-slate-900">
                          {item.productName}
                        </strong>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-green-100 text-green-900 tabular-nums">
                          Sobrante: {item.expectedFinalInventory} {item.unit}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Conservado
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={activeShift.status === 'CLOSED'}
                            className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold tabular-nums"
                            value={currentClass.carriedOverQty}
                            onChange={(e) =>
                              updateItemClass({
                                carriedOverQty: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Dev. Prov.
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={activeShift.status === 'CLOSED'}
                            className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold tabular-nums"
                            value={currentClass.returnedToSupplierDeliveredQty}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateItemClass({
                                returnedToSupplierDeliveredQty: v,
                                returnedToSupplierAcceptedQty: v,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Merma
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={activeShift.status === 'CLOSED'}
                            className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold tabular-nums"
                            value={currentClass.shrinkageQty}
                            onChange={(e) =>
                              updateItemClass({
                                shrinkageQty: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>

                      {currentClass.shrinkageQty > 0 && (
                        <input
                          type="text"
                          placeholder="Motivo obligatorio de la merma..."
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-900"
                          value={currentClass.shrinkageReason}
                          onChange={(e) =>
                            updateItemClass({
                              shrinkageReason: e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setClosureStep(2)}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Siguiente: Paso 2 (Cuentas)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PASO 2: UTILIDAD VS EFECTIVO */}
          {closureStep === 2 && (
            <div className="space-y-3.5">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Ventas de la jornada:</span>
                  <strong className="font-bold tabular-nums">
                    {formatCOP(reconciliation.financials.totalSalesAmount)}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Costo de lo vendido:</span>
                  <strong className="font-bold tabular-nums">
                    -{formatCOP(reconciliation.financials.costOfGoodsSold)}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Gastos y personal:</span>
                  <strong className="font-bold tabular-nums">
                    -
                    {formatCOP(
                      reconciliation.financials.totalExpensesAndPersonnel
                    )}
                  </strong>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-green-50 border border-green-200">
                  <span className="font-bold text-green-950">
                    Utilidad económica neta:
                  </span>
                  <strong className="text-lg font-extrabold text-green-800 tabular-nums">
                    {formatCOP(reconciliation.financials.economicNetProfit)}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">
                  Efectivo físico esperado en caja:
                </span>
                <strong className="text-lg font-extrabold text-slate-900 tabular-nums">
                  {formatCOP(reconciliation.financials.expectedCashInBox)}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setClosureStep(1)}
                  className="min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-sm cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setClosureStep(3)}
                  className="min-h-[46px] px-3 py-2 rounded-xl bg-green-700 text-white font-bold text-sm cursor-pointer"
                >
                  Paso 3: Arqueo
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: CONTEO DE DINERO */}
          {closureStep === 3 && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Efectivo contado en billetes y monedas ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Total en transferencias verificadas ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
                  value={countedTransferInput}
                  onChange={(e) =>
                    setCountedTransferInput(Number(e.target.value))
                  }
                />
              </div>

              {(countedCashInput !==
                reconciliation.financials.expectedCashInBox ||
                countedTransferInput !==
                  reconciliation.financials.expectedTransfersInBank) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                  <div className="text-xs font-bold text-amber-950">
                    Diferencia detectada de{' '}
                    {formatCOP(
                      countedCashInput -
                        reconciliation.financials.expectedCashInBox
                    )}
                    . Explica y confirma:
                  </div>
                  <input
                    type="text"
                    placeholder="Explica la causa de la diferencia..."
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm"
                    value={diffExplanation}
                    onChange={(e) => setDiffExplanation(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-amber-700"
                      checked={diffAcknowledged}
                      onChange={(e) => setDiffAcknowledged(e.target.checked)}
                    />
                    <span>Reconozco expresamente esta diferencia</span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setClosureStep(2)}
                  className="min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-sm cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setClosureStep(4)}
                  className="min-h-[46px] px-3 py-2 rounded-xl bg-green-700 text-white font-bold text-sm cursor-pointer"
                >
                  Paso 4: Confirmar
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: CONFIRMACIÓN DEFINITIVA */}
          {closureStep === 4 && (
            <div className="space-y-3.5">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 mt-0.5 accent-green-700 rounded shrink-0"
                  checked={finalConfirmChecked}
                  onChange={(e) => setFinalConfirmChecked(e.target.checked)}
                />
                <span className="text-sm font-semibold text-slate-800 leading-snug">
                  Confirmo que revisé el resumen de inventario, cartera y efectivo, y deseo cerrar definitivamente la jornada.
                </span>
              </label>

              {activeShift.status === 'OPEN' ? (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await coreService.executeDefinitiveShiftClosure(
                      {
                        actorUserId: currentUser.id,
                        shiftId: activeShift.id,
                        countedCash: countedCashInput,
                        countedTransfers: countedTransferInput,
                        differenceAcknowledged: diffAcknowledged,
                        differenceExplanation: diffExplanation,
                        explicitConfirmation: finalConfirmChecked,
                      }
                    );
                    if (res.ok && res.data) {
                      setAdjClosureId(res.data.closureId);
                      setFeedback({ type: 'success', text: res.message });
                      setClosureModalOpen(false);
                    } else {
                      setFeedback({ type: 'error', text: res.message });
                    }
                    refreshState();
                  }}
                  className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-5 h-5" />
                  <span>Ejecutar Cierre Definitivo</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-900 text-sm font-bold">
                    Jornada cerrada definitivamente ({activeShift.closureId})
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
                          setClosureModalOpen(false);
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
                      className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sunrise className="w-4 h-4" />
                      <span>Abrir siguiente jornada</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </BottomSheet>
      )}

      {/* ====================================================================
          MODAL 3: AUDITORÍA Y PRUEBAS SECCIONADO POR TABS (Se abre desde Vista Dueño)
         ==================================================================== */}
      <BottomSheet
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title="Auditoría y Verificación"
        subtitle="Bitácora inmutable, conflictos de sincronización y 15 pruebas oficiales"
        icon={<ShieldCheck className="w-5 h-5" />}
        headerExtra={
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                {
                  id: 'LOGS',
                  label: `Bitácora (${state.auditLogs.length})`,
                },
                {
                  id: 'CONFLICTS',
                  label: `Conflictos (${state.syncConflicts.length})`,
                },
                { id: 'TESTS', label: '15 Pruebas' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAuditModalTab(t.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer ${
                  auditModalTab === t.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        {auditModalTab === 'LOGS' && (
          <div className="space-y-2">
            {state.auditLogs.slice(0, 30).map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border text-xs sm:text-sm space-y-1 ${
                  log.result === 'REJECTED'
                    ? 'bg-red-50/60 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="font-bold text-slate-900">
                    {log.actionType}
                  </strong>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
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
        )}

        {auditModalTab === 'CONFLICTS' && (
          <div className="space-y-2.5">
            {state.syncConflicts.length === 0 ? (
              <p className="text-sm text-slate-600 py-4 text-center">
                No existen conflictos de sincronización pendientes.
              </p>
            ) : (
              state.syncConflicts.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs sm:text-sm space-y-1"
                >
                  <div className="font-bold text-amber-950">
                    Conflicto {c.id} ({c.entityType})
                  </div>
                  <div className="text-amber-900">
                    Estado: {c.resolved ? 'Resuelto' : 'Conservado localmente'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {auditModalTab === 'TESTS' && (
          <div className="space-y-3">
            <button
              type="button"
              disabled={runningTests}
              onClick={async () => {
                setRunningTests(true);
                const res = await runAll15MandatoryAcceptanceTests();
                setTestResults(res.results);
                setRunningTests(false);
              }}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCcw
                className={`w-4 h-4 ${runningTests ? 'animate-spin' : ''}`}
              />
              <span>Ejecutar verificación de 15 pruebas oficiales</span>
            </button>

            {testResults && (
              <div className="space-y-2">
                {testResults.map((tr) => (
                  <div
                    key={tr.testNumber}
                    className="p-2.5 rounded-xl border border-green-200 bg-green-50/50 text-xs space-y-0.5"
                  >
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-700 shrink-0" />
                      <span>
                        #{tr.testNumber}. {tr.title}
                      </span>
                    </div>
                    <p className="text-slate-600 pl-5">{tr.evidenceSummary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

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
          MODAL OPTIMIZADO DE OPERACIONES (Botón Flotante Venta/Gasto, Proveedor y Cliente)
         ==================================================================== */}
      <BottomSheet
        isOpen={Boolean(newOpModalType)}
        onClose={() => setNewOpModalType(null)}
        title={
          newOpModalType === 'SALE'
            ? 'Anotar Venta'
            : newOpModalType === 'EXPENSE'
            ? 'Anotar Gasto o Personal'
            : newOpModalType === 'PURCHASE'
            ? 'Comprar Fruta a Proveedor'
            : newOpModalType === 'SUPPLIER_RETURN'
            ? 'Devolución a Proveedor'
            : newOpModalType === 'COLLECTION_PAST_DEBT'
            ? 'Cobrar Fiado a Cliente'
            : 'Movimiento de Canastillas'
        }
        subtitle="Selector rápido con buscador · Sin desplazamientos largos"
        icon={<Plus className="w-5 h-5" />}
        headerExtra={
          opModalContext === 'FAB' ? (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => openOperationModal('SALE', 'FAB')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  newOpModalType === 'SALE'
                    ? 'bg-green-700 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Anotar Venta
              </button>
              <button
                type="button"
                onClick={() => openOperationModal('EXPENSE', 'FAB')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  newOpModalType === 'EXPENSE'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Anotar Gasto
              </button>
            </div>
          ) : opModalContext === 'SUPPLIER' ? (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => openOperationModal('PURCHASE', 'SUPPLIER')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  newOpModalType === 'PURCHASE'
                    ? 'bg-green-700 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={() =>
                  openOperationModal('SUPPLIER_RETURN', 'SUPPLIER')
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  newOpModalType === 'SUPPLIER_RETURN'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Devolver
              </button>
              <button
                type="button"
                onClick={() =>
                  openOperationModal('CRATE_MOVEMENT', 'SUPPLIER', {
                    crateMovementType: 'RECEIVED_FROM_SUPPLIER',
                  })
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  newOpModalType === 'CRATE_MOVEMENT'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Canastillas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  openOperationModal('COLLECTION_PAST_DEBT', 'CLIENT', {
                    preselectedClientId: opClientId,
                  })
                }
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  newOpModalType === 'COLLECTION_PAST_DEBT'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Cobrar Fiado ($)
              </button>
              <button
                type="button"
                onClick={() =>
                  openOperationModal('CRATE_MOVEMENT', 'CLIENT', {
                    preselectedClientId: opClientId,
                    crateMovementType: 'RETURNED_BY_CLIENT',
                  })
                }
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  newOpModalType === 'CRATE_MOVEMENT'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Devolver Canastillas
              </button>
            </div>
          )
        }
      >
        <form onSubmit={handleSaveNewOperation} className="space-y-3">
          {/* Selector Compacto con Buscador para Producto (soporta 10+ productos en 1 sola línea) */}
          {(newOpModalType === 'SALE' ||
            newOpModalType === 'PURCHASE' ||
            newOpModalType === 'SUPPLIER_RETURN') && (
            <SearchableSelect
              label="Producto"
              options={productPickerOptions}
              value={opProductId}
              searchPlaceholder="Buscar producto..."
              onChange={(prodId) => {
                setOpProductId(prodId);
                const prod = state.products.find((p) => p.id === prodId);
                if (prod) {
                  setOpUnitPrice(
                    newOpModalType === 'PURCHASE'
                      ? prod.defaultCostPrice
                      : prod.defaultSalePrice
                  );
                  const usesCrates = prod.unit
                    .toLowerCase()
                    .includes('canastilla');
                  setOpAutoLeaveCrates(usesCrates);
                  setOpAutoCratesCount(opQuantity);
                }
              }}
            />
          )}

          {/* Selector Compacto con Buscador para Cliente (soporta 70+ clientes en 1 sola línea) */}
          {(newOpModalType === 'SALE' ||
            newOpModalType === 'COLLECTION_PAST_DEBT' ||
            (newOpModalType === 'CRATE_MOVEMENT' &&
              opModalContext === 'CLIENT')) && (
            <SearchableSelect
              label="Cliente"
              options={clientPickerOptions}
              value={opClientId}
              searchPlaceholder="Escribir nombre o teléfono del cliente..."
              onChange={(cId) => setOpClientId(cId)}
            />
          )}

          {/* Selector Compacto con Buscador para Proveedor */}
          {(newOpModalType === 'PURCHASE' ||
            newOpModalType === 'SUPPLIER_RETURN' ||
            (newOpModalType === 'CRATE_MOVEMENT' &&
              opModalContext === 'SUPPLIER')) && (
            <SearchableSelect
              label="Proveedor / Finca"
              options={supplierPickerOptions}
              value={opSupplierId}
              searchPlaceholder="Buscar proveedor..."
              onChange={(sId) => setOpSupplierId(sId)}
            />
          )}

          {/* Cantidad y Precio en una fila compacta + Total integrado */}
          {(newOpModalType === 'SALE' || newOpModalType === 'PURCHASE') && (
            <>
              <div className="grid grid-cols-12 gap-2.5 items-end">
                <div className="col-span-4">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-lg font-extrabold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={opQuantity}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      setOpQuantity(q);
                      setOpAutoCratesCount(q);
                    }}
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Unitario ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-lg font-extrabold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={opUnitPrice}
                    onChange={(e) => setOpUnitPrice(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-4 p-2.5 rounded-xl bg-green-50 border border-green-200 text-right">
                  <span className="block text-[10px] font-bold uppercase text-green-900">
                    Total
                  </span>
                  <strong className="text-base sm:text-lg font-extrabold text-green-800 tabular-nums">
                    {formatCOP(opQuantity * opUnitPrice)}
                  </strong>
                </div>
              </div>

              {/* Deuda automática de canastillas cuando el cliente lleva producto con canastilla */}
              {newOpModalType === 'SALE' && (
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-950 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-blue-700 rounded shrink-0"
                      checked={opAutoLeaveCrates}
                      onChange={(e) => setOpAutoLeaveCrates(e.target.checked)}
                    />
                    <span>
                      Deja canastillas al cliente (deuda automática)
                    </span>
                  </label>
                  {opAutoLeaveCrates && (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      className="w-16 min-h-[36px] px-2 py-1 rounded-lg border border-blue-300 bg-white text-sm font-extrabold text-center text-blue-950 tabular-nums"
                      value={opAutoCratesCount}
                      onChange={(e) =>
                        setOpAutoCratesCount(Number(e.target.value))
                      }
                    />
                  )}
                </div>
              )}
            </>
          )}

          {newOpModalType === 'COLLECTION_PAST_DEBT' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'PAST',
                      title: 'Deuda días anteriores',
                      sub: 'No suma como venta hoy',
                    },
                    {
                      id: 'CURRENT',
                      title: 'Abono fiado de hoy',
                      sub: 'Reduce saldo de hoy',
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOpCollectionKind(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      opCollectionKind === opt.id
                        ? 'bg-blue-50 border-blue-600 text-blue-950 ring-1 ring-blue-600'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold">
                      {opt.title}
                    </div>
                    <div className="text-[11px] text-slate-500">{opt.sub}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Abono capital ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
                    value={opCollectionAmount}
                    onChange={(e) =>
                      setOpCollectionAmount(Number(e.target.value))
                    }
                  />
                </div>
                {opCollectionKind === 'PAST' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                      Interés pactado ($)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
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
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Categoría del gasto
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'FUEL', label: 'Combustible' },
                      { id: 'TOLL_PARKING', label: 'Peaje / Parqueo' },
                      { id: 'FOOD', label: 'Alimentación' },
                      { id: 'PERSONNEL_PAYMENT', label: 'Pago Ayudante' },
                      { id: 'OTHER', label: 'Otro gasto' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setOpExpenseCategory(cat.id)}
                      className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        opExpenseCategory === cat.id
                          ? 'bg-amber-50 border-amber-600 text-amber-950 ring-1 ring-amber-600'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Valor pagado ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
                  value={opExpenseAmount}
                  onChange={(e) => setOpExpenseAmount(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {newOpModalType === 'SUPPLIER_RETURN' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Cant. entregada
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
                    value={opDeliveredQty}
                    onChange={(e) => setOpDeliveredQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Cant. aceptada
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={opDeliveredQty}
                    className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
                    value={opAcceptedQty}
                    onChange={(e) => setOpAcceptedQty(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Compensación del proveedor
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'CREDIT_BALANCE', label: 'Saldo a favor' },
                      { id: 'PENDING_COMPENSATION', label: 'Pendiente' },
                      {
                        id: 'CASH_REFUND_RECEIVED',
                        label: 'Efectivo recibido',
                      },
                      { id: 'PRODUCT_EXCHANGE', label: 'Cambio fruta' },
                    ] as const
                  ).map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => setOpCompensationType(comp.id)}
                      className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        opCompensationType === comp.id
                          ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {comp.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {newOpModalType === 'CRATE_MOVEMENT' && (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Movimiento de canastillas
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(opModalContext === 'SUPPLIER'
                    ? ([
                        {
                          id: 'RECEIVED_FROM_SUPPLIER',
                          label: 'Recibidas de proveedor',
                        },
                        {
                          id: 'RETURNED_TO_SUPPLIER',
                          label: 'Devueltas a proveedor',
                        },
                      ] as const)
                    : ([
                        {
                          id: 'RETURNED_BY_CLIENT',
                          label: 'Devueltas por cliente (descuenta deuda)',
                        },
                        {
                          id: 'DELIVERED_TO_CLIENT',
                          label: 'Entregadas a cliente',
                        },
                      ] as const)
                  ).map((mv) => (
                    <button
                      key={mv.id}
                      type="button"
                      onClick={() => setOpCrateType(mv.id)}
                      className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        opCrateType === mv.id
                          ? 'bg-green-50 border-green-600 text-green-950 ring-1 ring-green-600'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {mv.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Cantidad de canastillas
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-900 tabular-nums"
                  value={opQuantity}
                  onChange={(e) => setOpQuantity(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {newOpModalType !== 'CRATE_MOVEMENT' &&
            newOpModalType !== 'SUPPLIER_RETURN' && (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Medio de pago
                </label>
                <div
                  className={`grid gap-2 ${
                    newOpModalType === 'SALE' ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  {(
                    [
                      { id: 'CASH', label: 'Efectivo' },
                      { id: 'TRANSFER', label: 'Transferencia' },
                      ...(newOpModalType === 'SALE'
                        ? [{ id: 'CREDIT' as const, label: 'Fiado' }]
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
                        className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                          selected
                            ? 'bg-green-700 border-green-700 text-white shadow-2xs'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {newOpModalType === 'SALE' && opPaymentMethod === 'CREDIT' && (
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                Abono inmediato hoy en efectivo ($)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={opQuantity * opUnitPrice}
                className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-900 tabular-nums"
                value={opPaidImmediate}
                onChange={(e) => setOpPaidImmediate(Number(e.target.value))}
              />
            </div>
          )}

          <div>
            <input
              type="text"
              placeholder="Nota opcional (ej: número de recibo o detalle)..."
              className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
              value={opNotes}
              onChange={(e) => setOpNotes(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewOpModalType(null)}
              className="min-h-[48px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-3 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-sm shadow-xs cursor-pointer"
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
              <form
                onSubmit={handleConfirmEditOrRequest}
                className="space-y-3.5"
              >
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-slate-600">
                    Valor actual:
                  </span>
                  <strong className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                    {formatCOP(editingOp.payload.totalAmount)}
                  </strong>
                </div>

                {approvedAuth && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                    <p className="text-xs sm:text-sm font-medium text-amber-950 leading-relaxed">
                      “{MANDATORY_EXPIRED_EDIT_WARNING}”.
                    </p>
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-amber-950">
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 accent-amber-700 rounded shrink-0"
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
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Nuevo valor total ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    disabled={Boolean(approvedAuth)}
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 text-lg font-bold text-slate-900 tabular-nums"
                    value={editNewAmount}
                    onChange={(e) => setEditNewAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Motivo obligatorio de la modificación
                  </label>
                  <input
                    type="text"
                    placeholder="Indica por qué necesitas realizar este cambio..."
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingOp(null)}
                    className="min-h-[48px] px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-sm text-white shadow-xs cursor-pointer ${
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
export default App;
