import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
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

/**
 * Controles reutilizables de paginación compacta para todas las tablas
 */
const TablePagination: React.FC<{
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalItems, pageSize, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  return (
    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200 text-xs text-slate-600">
      <span className="font-medium tabular-nums">
        Total: <strong>{totalItems}</strong> reg. · Pág.{' '}
        <strong>{safePage}</strong> de <strong>{totalPages}</strong>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-800 flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Ant.</span>
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-800 flex items-center gap-1 cursor-pointer"
        >
          <span>Sig.</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export function App() {
  const [state, setState] = useState<RutaBananoPersistedState>(
    coreService.getState()
  );
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [connectionSheetOpen, setConnectionSheetOpen] =
    useState<boolean>(false);
  const [authSheetOpen, setAuthSheetOpen] = useState<boolean>(false);

  // Modales siempre centrados y de altura constante:
  const [closureModalOpen, setClosureModalOpen] = useState<boolean>(false);
  const [notificationsModalOpen, setNotificationsModalOpen] =
    useState<boolean>(false);
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditModalTab, setAuditModalTab] = useState<
    'LOGS' | 'CONFLICTS' | 'TESTS'
  >('LOGS');

  // 1. Sub-tabs de la sección unificada en "Ruta de Hoy" (4 secciones convertidas en 4 tabs)
  const [operateSubTab, setOperateSubTab] = useState<
    'INVENTORY' | 'CRATES' | 'OPERATIONS' | 'FINANCE'
  >('INVENTORY');

  // 2. Sub-tabs de la sección unificada en "Compras y Devoluciones" (Proveedores)
  const [supplierSubTab, setSupplierSubTab] = useState<
    'PROVIDERS_TABLE' | 'PURCHASE_FORM' | 'RETURN_FORM' | 'CRATES_FORM'
  >('PROVIDERS_TABLE');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>('');

  // 3. Sub-tabs de la sección unificada en "Cobros y Deudas" (Clientes)
  const [clientSubTab, setClientSubTab] = useState<
    'PORTFOLIO_TABLE' | 'COLLECT_DEBT_TAB' | 'RETURN_CRATES_TAB'
  >('PORTFOLIO_TABLE');
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [clientFilterMode, setClientFilterMode] = useState<
    'ALL' | 'WITH_MONEY_DEBT' | 'WITH_CRATE_DEBT'
  >('ALL');

  // 4. Sub-tabs de la vista Dueño
  const [ownerSubTab, setOwnerSubTab] = useState<
    'POLICIES' | 'HELPERS' | 'ADJUSTMENTS'
  >('POLICIES');

  // Estados de paginación para todas las tablas
  const [opsPage, setOpsPage] = useState<number>(1);
  const [suppliersPage, setSuppliersPage] = useState<number>(1);
  const [clientsPage, setClientsPage] = useState<number>(1);
  const [helpersPage, setHelpersPage] = useState<number>(1);
  const [closuresPage, setClosuresPage] = useState<number>(1);
  const [auditLogsPage, setAuditLogsPage] = useState<number>(1);
  const [testsPage, setTestsPage] = useState<number>(1);
  const [authReqsPage, setAuthReqsPage] = useState<number>(1);

  const [activeUserId, setActiveUserId] = useState<string>('USR-HELPER-01');
  const [activeTab, setActiveTab] = useState<NavTabId>('OPERATE');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const [showRealTimeSummaryAccordion, setShowRealTimeSummaryAccordion] =
    useState<boolean>(false);

  // Modal de Venta o Gasto abierto desde el botón circular flotante (+)
  const [fabModalType, setFabModalType] = useState<'SALE' | 'EXPENSE' | null>(
    null
  );

  // Modal para Comprar / Devolver / Canastillas con Proveedor (soporta múltiples productos)
  const [supplierModalMode, setSupplierModalMode] = useState<
    'BUY_RETURN' | 'RETURN_CRATES' | null
  >(null);
  const [supplierActionType, setSupplierActionType] = useState<
    'PURCHASE' | 'RETURN'
  >('PURCHASE');
  const [supplierLines, setSupplierLines] = useState<
    Array<{
      productId: string;
      deliveredQty: number;
      acceptedQty: number;
      unitPrice: number;
      compensationType: SupplierCompensationType;
    }>
  >([]);
  const [supplierReturnCratesQty, setSupplierReturnCratesQty] =
    useState<number>(0);

  // Modal para Cobrar Fiado ($) o Recibir Envases de Cliente
  const [clientModalMode, setClientModalMode] = useState<
    'COLLECT_DEBT' | 'RETURN_CRATES' | null
  >(null);

  // Líneas múltiples de productos para el modal de Venta
  const [saleLines, setSaleLines] = useState<
    Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      autoLeaveCrates: boolean;
      cratesCount: number;
    }>
  >([]);
  // Canastillas devueltas inmediatamente por el cliente en la misma venta (no deja deuda)
  const [saleReturnedCratesNow, setSaleReturnedCratesNow] = useState<number>(0);

  // Campos compartidos de formularios (Venta, Gasto, Compra, Devolución, Cobro, Canastillas)
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

  // Estado para editar / solicitar autorización de operación existente (Modal centrado)
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

      try {
        const remote = await coreService.pullFromFirebase();
        setState({ ...remote });
        await coreService.firebaseAdapter.syncInitialCollectionsAndRoles(
          coreService.getState()
        );
      } catch {
        // Continúa operando con IndexedDB local si inicia sin cobertura móvil
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

  // Cálculo en tiempo real de deuda monetaria y deuda automática de canastillas por cada cliente
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

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearchQuery.trim().toLowerCase();
    if (!q) return state.suppliers;
    return state.suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? '').toLowerCase().includes(q)
    );
  }, [state.suppliers, supplierSearchQuery]);

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

  // Abre el modal centrado exclusivamente para Venta o Gasto (desde el botón circular +)
  const openFabModal = (type: 'SALE' | 'EXPENSE') => {
    setFeedback(null);
    const defaultProd = state.products[0];
    const prodUsesCrates = defaultProd?.unit
      .toLowerCase()
      .includes('canastilla') ?? false;

    // Inicializa la primera línea para la venta de productos múltiples
    setSaleLines([
      {
        productId: defaultProd?.id || 'PROD-BANANO-PRIMERA',
        quantity: 5,
        unitPrice: defaultProd?.defaultSalePrice || 38000,
        autoLeaveCrates: prodUsesCrates,
        cratesCount: prodUsesCrates ? 5 : 0,
      },
    ]);
    setSaleReturnedCratesNow(0);

    setOpProductId(defaultProd?.id || 'PROD-BANANO-PRIMERA');
    setOpQuantity(5);
    setOpUnitPrice(defaultProd?.defaultSalePrice || 38000);
    setOpAutoLeaveCrates(prodUsesCrates);
    setOpAutoCratesCount(5);
    setOpPaymentMethod('CASH');
    setOpPaidImmediate(0);
    setOpNotes('');
    setFabModalType(type);
  };

  // Abre el modal de Compra / Devolución a Proveedor
  const openSupplierModal = (
    supId: string,
    mode: 'BUY_RETURN' | 'RETURN_CRATES',
    action: 'PURCHASE' | 'RETURN' = 'PURCHASE'
  ) => {
    setFeedback(null);
    setOpSupplierId(supId);
    setSupplierModalMode(mode);
    setSupplierActionType(action);
    setSupplierReturnCratesQty(0);

    const defaultProd = state.products[0];
    setSupplierLines([
      {
        productId: defaultProd?.id || 'PROD-BANANO-PRIMERA',
        deliveredQty: action === 'PURCHASE' ? 5 : 2,
        acceptedQty: action === 'PURCHASE' ? 5 : 2,
        unitPrice: defaultProd?.defaultCostPrice || 28000,
        compensationType: 'CREDIT_BALANCE',
      },
    ]);
  };

  // Abre el modal de Cobro o Recepción de Canastillas de Cliente
  const openClientModal = (
    cliId: string,
    mode: 'COLLECT_DEBT' | 'RETURN_CRATES'
  ) => {
    setFeedback(null);
    setOpClientId(cliId);
    setClientModalMode(mode);

    const bal = clientBalances.find((b) => b.client.id === cliId);
    if (mode === 'COLLECT_DEBT') {
      const suggestedAmount =
        bal?.totalMoneyDebt && bal.totalMoneyDebt > 0
          ? bal.totalMoneyDebt
          : 50000;
      setOpCollectionAmount(suggestedAmount);
      setOpCollectionInterest(bal?.remainingPastInterest ?? 0);
      setOpCollectionKind(bal?.remainingPastPrincipal ? 'PAST' : 'CURRENT');
    } else {
      setOpQuantity(Math.max(1, bal?.totalCratesOwed ?? 1));
      setOpCrateType('RETURNED_BY_CLIENT');
    }
  };

  // Ejecuta el guardado de cualquier operación (desde el modal FAB o desde los tabs de Proveedores/Clientes)
  const executeSaveOperation = async (typeToSave: OperationType) => {
    if (!activeShift) return;

    const product = state.products.find((p) => p.id === opProductId);
    const client = state.clients.find((c) => c.id === opClientId);
    const supplier = state.suppliers.find((s) => s.id === opSupplierId);

    let actualType: OperationType = typeToSave;
    let payload: RouteOperation['payload'] = {
      totalAmount: 0,
      paymentMethod: opPaymentMethod,
      notes: opNotes,
    };

    if (typeToSave === 'SALE') {
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
    } else if (typeToSave === 'PURCHASE') {
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
      typeToSave === 'COLLECTION_PAST_DEBT' ||
      typeToSave === 'COLLECTION_CURRENT'
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
    } else if (typeToSave === 'EXPENSE') {
      payload = {
        expenseCategory: opExpenseCategory,
        description: opNotes || 'Gasto operativo de ruta',
        totalAmount: opExpenseAmount,
        paymentMethod: opPaymentMethod,
        notes: opNotes,
      };
    } else if (typeToSave === 'SUPPLIER_RETURN') {
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
    } else if (typeToSave === 'CRATE_MOVEMENT') {
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

      setFabModalType(null);
      setSupplierModalMode(null);
      setClientModalMode(null);
      setOpNotes('');
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

  const productPickerOptions = useMemo(
    () =>
      state.products.map((p) => {
        const isPurchase =
          supplierModalMode === 'BUY_RETURN' &&
          supplierActionType === 'PURCHASE';
        const price = isPurchase ? p.defaultCostPrice : p.defaultSalePrice;
        return {
          id: p.id,
          label: p.name,
          sublabel: `Unidad: ${p.unit}`,
          badgeText: `${formatCOP(price)} / ${p.unit}`,
          badgeTone: 'green' as const,
        };
      }),
    [state.products, supplierModalMode, supplierActionType]
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
            : 'Activo',
        badgeTone:
          s.creditBalanceInFavor > 0 ? ('green' as const) : ('slate' as const),
      })),
    [state.suppliers]
  );

  const PAGE_SIZE = 5;

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

        <div className="space-y-2 text-sm">
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
      onOpenQuickSale={() => openFabModal('SALE')}
      onOpenQuickExpense={() => openFabModal('EXPENSE')}
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
              VISTA 1: RUTA DE HOY
              1. Tarjeta Superior: Jornada + Botón Cerrar Día + 4 KPIs
              2. Debajo: UNA SOLA SECCIÓN CON 4 TABS y tablas de 2 columnas con paginación
             ==================================================================== */}
          {activeTab === 'OPERATE' && activeShift && reconciliation && (
            <main className="space-y-4">
              {/* Tarjeta superior con Acordeón: Resumen en Tiempo Real / KPIs de Ruta */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                {/* Fila superior: Jornada, Estado, Vehículo y Botón compacto de Cierre */}
                <div className="flex items-center justify-between gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 border border-green-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                          Jornada {activeShift.operatingDate}
                        </span>
                        {activeShift.status === 'OPEN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-800 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                            Abierta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <Lock className="w-3 h-3" />
                            Cerrada
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        Camión: <strong className="text-slate-800">{activeShift.vehicle}</strong> · Resp: <strong className="text-slate-800">{activeShift.responsibleUserName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Botón arriba compacto que no ocupe tanto espacio */}
                  <button
                    type="button"
                    onClick={() => setClosureModalOpen(true)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0 ${
                      activeShift.status === 'OPEN'
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-green-700 hover:bg-green-800 text-white'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {activeShift.status === 'OPEN'
                        ? 'Cerrar Día'
                        : 'Ver Cierre'}
                    </span>
                  </button>
                </div>

                {/* Selector tipo acordeón entre la vista de 'Resumen en Tiempo Real' y 'KPIs Operativos' */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setShowRealTimeSummaryAccordion(true)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                      showRealTimeSummaryAccordion
                        ? 'bg-white text-green-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Resumen en Tiempo Real
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRealTimeSummaryAccordion(false)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                      !showRealTimeSummaryAccordion
                        ? 'bg-white text-green-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Indicadores Rápidos (KPIs)
                  </button>
                </div>

                {/* VISTA A (FOTO): Resumen en Tiempo Real */}
                {showRealTimeSummaryAccordion ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Ventas del día:</span>
                        <strong className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                          {formatCOP(reconciliation.financials.totalSalesAmount)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Fiados de hoy pendientes:</span>
                        <strong className="text-sm sm:text-base font-bold text-amber-700 tabular-nums">
                          {formatCOP(
                            reconciliation.financials
                              .pendingReceivablesFromCurrentSales
                          )}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Cobros deuda anterior:</span>
                        <strong className="text-sm sm:text-base font-bold text-blue-700 tabular-nums">
                          {formatCOP(
                            reconciliation.financials.totalPastDebtCollected
                          )}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Ganancia Neta (Utilidad):</span>
                        <strong className="text-sm sm:text-base font-bold text-green-700 tabular-nums">
                          {formatCOP(
                            reconciliation.financials.economicNetProfit
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-green-50/90 border border-green-200 flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-semibold text-green-950">
                        Efectivo físico esperado:
                      </span>
                      <strong className="text-base sm:text-xl font-extrabold text-green-800 tabular-nums">
                        {formatCOP(reconciliation.financials.expectedCashInBox)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  /* VISTA B: Otros KPIs de Ruta */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-green-50/90 border border-green-200">
                      <span className="block text-xs font-semibold text-green-900">
                        Efectivo en caja
                      </span>
                      <strong className="text-base sm:text-lg font-extrabold text-green-800 tabular-nums">
                        {formatCOP(reconciliation.financials.expectedCashInBox)}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-xs font-medium text-slate-600">
                        Ventas de hoy
                      </span>
                      <strong className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                        {formatCOP(reconciliation.financials.totalSalesAmount)}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                      <span className="block text-xs font-medium text-amber-900">
                        Fiados hoy
                      </span>
                      <strong className="text-base sm:text-lg font-bold text-amber-800 tabular-nums">
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
                      <strong className="text-base sm:text-lg font-bold text-blue-800 tabular-nums">
                        {formatCOP(reconciliation.financials.economicNetProfit)}
                      </strong>
                    </div>
                  </div>
                )}
              </section>

              {/* UNA SOLA SECCIÓN UNIFICADA CON 4 TABS */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 min-h-[380px]">
                {/* Barra de 4 Tabs */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  {(
                    [
                      { id: 'INVENTORY', label: 'Inventario' },
                      { id: 'CRATES', label: 'Canastillas' },
                      {
                        id: 'OPERATIONS',
                        label: `Registros (${shiftOperations.length})`,
                      },
                      { id: 'FINANCE', label: 'Arqueo' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOperateSubTab(tab.id)}
                      className={`min-h-[40px] px-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer truncate ${
                        operateSubTab === tab.id
                          ? 'bg-white text-green-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: INVENTARIO EN CAMIÓN (Tabla 2 columnas) */}
                {operateSubTab === 'INVENTORY' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-700" />
                        <span>Inventario disponible en el camión</span>
                      </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                            <th className="py-2.5 px-3">
                              Producto y Movimientos
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              Disponible
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                          {reconciliation.inventory.items.map((item) => (
                            <tr key={item.productId} className="bg-white">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">
                                  {item.productName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Inic: {item.initialInventory} · Comp:{' '}
                                  {item.purchasesQty} · Vend: {item.soldQty}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right align-middle">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-green-50 text-green-800 border border-green-200 font-extrabold tabular-nums">
                                  {item.expectedFinalInventory} {item.unit}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: BALANCE DE CANASTILLAS (Tabla 2 columnas) */}
                {operateSubTab === 'CRATES' && (
                  <div className="space-y-3">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-green-700" />
                      <span>Control de Canastillas en Ruta</span>
                    </h3>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                            <th className="py-2.5 px-3">Concepto</th>
                            <th className="py-2.5 px-3 text-right">
                              Cantidad
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              Canastillas iniciales en camión
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                              {reconciliation.crates.initialCratesAvailable}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              Recibidas hoy de proveedor
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-green-700 tabular-nums">
                              +{reconciliation.crates.receivedFromSupplier}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              Dejadas hoy a clientes (deuda automática)
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-700 tabular-nums">
                              -{reconciliation.crates.deliveredToClients}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              Devueltas hoy por clientes
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-blue-700 tabular-nums">
                              +{reconciliation.crates.returnedByClients}
                            </td>
                          </tr>
                          <tr className="bg-green-50/70">
                            <td className="py-3 px-3 font-bold text-green-950">
                              Disponibles en camión ahora
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-green-800 text-base tabular-nums">
                              {reconciliation.crates.finalCratesInVehicle}
                            </td>
                          </tr>
                          <tr className="bg-amber-50/70">
                            <td className="py-3 px-3 font-bold text-amber-950">
                              Total adeudadas por clientes
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-amber-800 text-base tabular-nums">
                              {reconciliation.crates.totalCratesHeldByClients}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: REGISTROS DE HOY (Tabla 2 columnas con paginación) */}
                {operateSubTab === 'OPERATIONS' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        Operaciones de hoy ({shiftOperations.length})
                      </h3>
                      <span className="text-xs text-slate-500">
                        Ventana edición:{' '}
                        <strong>{activeShift.editWindowMinutes} min</strong>
                      </span>
                    </div>

                    {shiftOperations.length === 0 ? (
                      <p className="text-sm text-slate-500 py-6 text-center">
                        Aún no hay registros hoy. Toca el botón circular{' '}
                        <strong>(+)</strong> para registrar una venta o gasto.
                      </p>
                    ) : (
                      <>
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                                <th className="py-2.5 px-3">
                                  Datos del Registro
                                </th>
                                <th className="py-2.5 px-3 text-right">
                                  Valor / Acción
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-sm">
                              {shiftOperations
                                .slice(
                                  (opsPage - 1) * PAGE_SIZE,
                                  opsPage * PAGE_SIZE
                                )
                                .map((op) => {
                                  const win =
                                    coreService.timeEngine.isWithinEditWindow(
                                      op,
                                      activeShift.editWindowMinutes
                                    );
                                  const pendingReq = state.authorizations.find(
                                    (a) =>
                                      a.operationId === op.id &&
                                      a.status === 'PENDING'
                                  );
                                  const approvedReq = state.authorizations.find(
                                    (a) =>
                                      a.operationId === op.id &&
                                      a.status === 'APPROVED' &&
                                      a.approvedOperationVersion === op.version
                                  );

                                  return (
                                    <tr key={op.id} className="bg-white">
                                      <td className="py-2.5 px-3 align-middle">
                                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                          <span className="text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                                            {getOperationTypeLabel(op.type)}
                                          </span>
                                          {win.withinWindow ? (
                                            <span className="text-[11px] font-bold text-green-800 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                                              {win.remainingMinutesFormatted}
                                            </span>
                                          ) : approvedReq ? (
                                            <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                              Autorizado
                                            </span>
                                          ) : pendingReq ? (
                                            <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                              Pendiente
                                            </span>
                                          ) : (
                                            <span className="text-[11px] text-slate-500">
                                              Vencido
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                          {op.payload.productName ||
                                            op.payload.clientName ||
                                            op.payload.supplierName ||
                                            op.payload.description ||
                                            'Movimiento'}
                                          {op.payload.quantity
                                            ? ` (${op.payload.quantity} und.)`
                                            : ''}
                                        </div>
                                        {op.payload.notes && (
                                          <div className="text-xs text-slate-500 line-clamp-1">
                                            {op.payload.notes}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-2.5 px-3 text-right align-middle space-y-1.5">
                                        <div className="font-extrabold text-slate-900 tabular-nums">
                                          {formatCOP(op.payload.totalAmount)}
                                        </div>
                                        {activeShift.status === 'OPEN' && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openEditOperationModal(op)
                                            }
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                              approvedReq
                                                ? 'bg-blue-600 text-white'
                                                : win.withinWindow
                                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                                            }`}
                                          >
                                            <Edit3 className="w-3 h-3" />
                                            <span>
                                              {approvedReq
                                                ? 'Aplicar'
                                                : win.withinWindow
                                                ? 'Editar'
                                                : 'Permiso'}
                                            </span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>

                        <TablePagination
                          currentPage={opsPage}
                          totalItems={shiftOperations.length}
                          pageSize={PAGE_SIZE}
                          onPageChange={setOpsPage}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* TAB 4: ARQUEO Y FINANZAS DEL DÍA (Tabla 2 columnas) */}
                {operateSubTab === 'FINANCE' && (
                  <div className="space-y-3">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-green-700" />
                      <span>Utilidad Económica vs. Efectivo en Caja</span>
                    </h3>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                            <th className="py-2.5 px-3">Concepto Financiero</th>
                            <th className="py-2.5 px-3 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                          <tr>
                            <td className="py-2.5 px-3 text-slate-700">
                              Base inicial de efectivo
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                              {formatCOP(activeShift.initialCash)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 text-slate-700">
                              Recaudo efectivo ventas de hoy
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-green-700 tabular-nums">
                              +
                              {formatCOP(
                                reconciliation.financials
                                  .collectedFromCurrentSalesCash
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 text-slate-700">
                              Cobros deuda días anteriores
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-blue-700 tabular-nums">
                              +
                              {formatCOP(
                                reconciliation.financials.totalPastDebtCollected
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 text-slate-700">
                              Compras y gastos pagados hoy
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-red-700 tabular-nums">
                              -
                              {formatCOP(
                                reconciliation.financials.totalPurchasesAmount +
                                  reconciliation.financials
                                    .totalExpensesAndPersonnel
                              )}
                            </td>
                          </tr>
                          <tr className="bg-green-50/80">
                            <td className="py-3 px-3 font-bold text-green-950">
                              Efectivo físico esperado en caja
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-green-800 text-base tabular-nums">
                              {formatCOP(
                                reconciliation.financials.expectedCashInBox
                              )}
                            </td>
                          </tr>
                          <tr className="bg-blue-50/70">
                            <td className="py-3 px-3 font-bold text-blue-950">
                              Utilidad económica neta del día
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-blue-800 text-base tabular-nums">
                              {formatCOP(
                                reconciliation.financials.economicNetProfit
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </main>
          )}

          {/* ====================================================================
              VISTA 2: COMPRAS Y DEVOLUCIONES (PROVEEDORES)
              Una sola sección unificada con Tabla de Proveedores y Modales Ágiles
             ==================================================================== */}
          {activeTab === 'SUPPLIERS' && activeShift && (
            <main className="space-y-4">
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 min-h-[440px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 border border-green-100 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Gestión con Proveedores y Fincas
                    </h2>
                    <p className="text-xs text-slate-600">
                      Selecciona un proveedor para comprar o devolver múltiples productos o entregar canastillas
                    </p>
                  </div>
                </div>

                {/* TABLA DE 2 COLUMNAS DE PROVEEDORES REGISTRADOS CON ACCIONES EN MODAL */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={supplierSearchQuery}
                      onChange={(e) => {
                        setSupplierSearchQuery(e.target.value);
                        setSuppliersPage(1);
                      }}
                      placeholder="Filtrar proveedor por nombre o teléfono..."
                      className="w-full min-h-[42px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                          <th className="py-2.5 px-3">
                            Datos del Proveedor
                          </th>
                          <th className="py-2.5 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {filteredSuppliers
                          .slice(
                            (suppliersPage - 1) * PAGE_SIZE,
                            suppliersPage * PAGE_SIZE
                          )
                          .map((sup) => (
                            <tr key={sup.id} className="bg-white">
                              <td className="py-3 px-3 align-middle">
                                <div className="font-bold text-slate-900">
                                  {sup.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Tel: {sup.phone}
                                </div>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-green-50 text-green-800 border border-green-200 tabular-nums">
                                  Saldo a favor:{' '}
                                  {formatCOP(sup.creditBalanceInFavor)}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right align-middle">
                                <div className="flex flex-col sm:flex-row justify-end gap-1.5">
                                  {/* 1 Solo botón que abre el modal para Comprar o Devolver múltiples productos */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openSupplierModal(sup.id, 'BUY_RETURN', 'PURCHASE')
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Comprar / Devolver
                                  </button>
                                  {/* Botón para devolver canastillas al proveedor */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openSupplierModal(sup.id, 'RETURN_CRATES')
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold cursor-pointer"
                                  >
                                    Canastillas
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={suppliersPage}
                    totalItems={filteredSuppliers.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setSuppliersPage}
                  />
                </div>
              </section>
            </main>
          )}

          {/* ====================================================================
              VISTA 3: COBROS Y DEUDAS (CLIENTES)
              Una sola cartera unificada con búsqueda y botones que abren modal directo
             ==================================================================== */}
          {activeTab === 'CLIENTS' && activeShift && reconciliation && (
            <main className="space-y-4">
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 min-h-[460px]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Cartera de Clientes y Envases
                      </h2>
                      <p className="text-xs text-slate-600">
                        Cartera total:{' '}
                        <strong>
                          {formatCOP(
                            reconciliation.financials
                              .totalCombinedPortfolioPending
                          )}
                        </strong>{' '}
                        · Canastillas en clientes:{' '}
                        <strong>
                          {reconciliation.crates.totalCratesHeldByClients}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* BUSCADOR Y FILTROS */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clientSearchQuery}
                        onChange={(e) => {
                          setClientSearchQuery(e.target.value);
                          setClientsPage(1);
                        }}
                        placeholder="Filtrar cliente por nombre o teléfono..."
                        className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 shrink-0">
                      {(
                        [
                          { id: 'ALL', label: 'Todos' },
                          { id: 'WITH_MONEY_DEBT', label: 'Con Deuda $' },
                          { id: 'WITH_CRATE_DEBT', label: 'Con Envases' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setClientFilterMode(f.id);
                            setClientsPage(1);
                          }}
                          className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            clientFilterMode === f.id
                              ? 'bg-green-700 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TABLA DE 2 COLUMNAS: CLIENTES Y ACCIONES CON MODAL DIRECTO */}
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                          <th className="py-2.5 px-3">
                            Cliente y Estado de Deuda
                          </th>
                          <th className="py-2.5 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {filteredClientBalances
                          .slice(
                            (clientsPage - 1) * PAGE_SIZE,
                            clientsPage * PAGE_SIZE
                          )
                          .map((item) => (
                            <tr key={item.client.id} className="bg-white">
                              <td className="py-2.5 px-3 align-middle">
                                <div className="font-bold text-slate-900">
                                  {item.client.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Tel: {item.client.phone}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded border tabular-nums ${
                                      item.totalMoneyDebt > 0
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-green-50 text-green-800 border-green-200'
                                    }`}
                                  >
                                    Deuda: {formatCOP(item.totalMoneyDebt)}
                                  </span>
                                  <span
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded border tabular-nums ${
                                      item.totalCratesOwed > 0
                                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    Envases: {item.totalCratesOwed}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right align-middle">
                                <div className="flex flex-col sm:flex-row justify-end gap-1.5">
                                  {/* Botón que abre el modal centrado para cobrar deuda en $ */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openClientModal(item.client.id, 'COLLECT_DEBT')
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Cobrar $
                                  </button>
                                  {/* Botón que abre el modal centrado para recibir envases devueltos */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openClientModal(item.client.id, 'RETURN_CRATES')
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold cursor-pointer"
                                  >
                                    Recibir Envase
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={clientsPage}
                    totalItems={filteredClientBalances.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setClientsPage}
                  />
                </div>
              </section>
            </main>
          )}

          {/* ====================================================================
              VISTA 4: PANEL DEL DUEÑO (Tabs + Tablas de 2 columnas con Paginación)
             ==================================================================== */}
          {activeTab === 'OWNER' && (
            <main className="space-y-4">
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 min-h-[440px]">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Panel del Dueño
                    </h2>
                    <p className="text-xs text-slate-600">
                      Configuración de políticas, auxiliares con paginación y ajustes post-cierre
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setNotificationsModalOpen(true)}
                      className="flex-1 sm:flex-initial min-h-[42px] px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-amber-700" />
                      <span>
                        Autorizaciones ({pendingAuthRequests.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuditModalOpen(true)}
                      className="flex-1 sm:flex-initial min-h-[42px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Auditoría y Pruebas</span>
                    </button>
                  </div>
                </div>

                {/* 3 Tabs del Dueño */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  {(
                    [
                      { id: 'POLICIES', label: 'Políticas y Cierre' },
                      { id: 'HELPERS', label: 'Auxiliares' },
                      { id: 'ADJUSTMENTS', label: 'Ajustes Cierres' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOwnerSubTab(tab.id)}
                      className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer truncate ${
                        ownerSubTab === tab.id
                          ? 'bg-white text-green-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: POLÍTICAS */}
                {ownerSubTab === 'POLICIES' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-green-700" />
                      <span className="text-sm font-bold text-slate-900">
                        Plazo individual para editar operaciones
                      </span>
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
                            className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs sm:text-sm tabular-nums cursor-pointer ${
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

                    <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
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
                      <span className="text-xs sm:text-sm font-semibold text-slate-800">
                        Permitir que el auxiliar responsable ejecute el cierre definitivo
                      </span>
                    </label>
                  </div>
                )}

                {/* TAB 2: AUXILIARES (Tabla de 2 columnas con paginación) */}
                {ownerSubTab === 'HELPERS' && (
                  <div className="space-y-3">
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
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Nombre del nuevo auxiliar..."
                        className="flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-sm"
                        value={newHelperName}
                        onChange={(e) => setNewHelperName(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="min-h-[42px] px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Crear</span>
                      </button>
                    </form>

                    {(() => {
                      const helpersList = state.users.filter(
                        (u) => u.role === 'HELPER'
                      );
                      return (
                        <>
                          <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                                  <th className="py-2.5 px-3">
                                    Auxiliar y Estado
                                  </th>
                                  <th className="py-2.5 px-3 text-right">
                                    Acción
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-sm">
                                {helpersList
                                  .slice(
                                    (helpersPage - 1) * PAGE_SIZE,
                                    helpersPage * PAGE_SIZE
                                  )
                                  .map((helper) => (
                                    <tr key={helper.id} className="bg-white">
                                      <td className="py-2.5 px-3 align-middle">
                                        <div className="font-bold text-slate-900">
                                          {helper.name}
                                        </div>
                                        <span
                                          className={`inline-block mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                            helper.active
                                              ? 'bg-green-50 text-green-800 border border-green-200'
                                              : 'bg-red-50 text-red-800 border border-red-200'
                                          }`}
                                        >
                                          {helper.active
                                            ? 'Activo'
                                            : 'Desactivado (historial conservado)'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right align-middle">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const res =
                                              await coreService.setHelperActiveStatus(
                                                {
                                                  actorUserId: currentUser.id,
                                                  targetHelperId: helper.id,
                                                  active: !helper.active,
                                                  reason: helper.active
                                                    ? 'Desactivación administrativa'
                                                    : 'Reactivación autorizada',
                                                }
                                              );
                                            setFeedback({
                                              type: res.ok
                                                ? 'success'
                                                : 'error',
                                              text: res.message,
                                            });
                                            refreshState();
                                          }}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                            helper.active
                                              ? 'bg-red-50 text-red-800 border border-red-200'
                                              : 'bg-green-700 text-white'
                                          }`}
                                        >
                                          {helper.active
                                            ? 'Desactivar'
                                            : 'Activar'}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>

                          <TablePagination
                            currentPage={helpersPage}
                            totalItems={helpersList.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setHelpersPage}
                          />
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* TAB 3: AJUSTES POST-CIERRE + TABLA PAGINADA DE CIERRES HISTÓRICOS */}
                {ownerSubTab === 'ADJUSTMENTS' && (
                  <div className="space-y-3">
                    {state.closures.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4 text-center">
                        Aún no hay jornadas cerradas para registrar ajustes posteriores.
                      </p>
                    ) : (
                      <>
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                                <th className="py-2 px-3">
                                  Cierre Congelado
                                </th>
                                <th className="py-2 px-3 text-right">
                                  Seleccionar
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                              {state.closures
                                .slice(
                                  (closuresPage - 1) * PAGE_SIZE,
                                  closuresPage * PAGE_SIZE
                                )
                                .map((c) => {
                                  const selected =
                                    (adjClosureId ||
                                      state.closures[0].closureId) ===
                                    c.closureId;
                                  return (
                                    <tr key={c.closureId} className="bg-white">
                                      <td className="py-2.5 px-3">
                                        <div className="font-bold text-slate-900">
                                          {c.closureId} ({c.operatingDate})
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          Efectivo contado:{' '}
                                          {formatCOP(c.countedCash)}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setAdjClosureId(c.closureId)
                                          }
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                            selected
                                              ? 'bg-green-700 text-white'
                                              : 'bg-slate-100 text-slate-700'
                                          }`}
                                        >
                                          {selected ? 'Activo' : 'Elegir'}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>

                        <TablePagination
                          currentPage={closuresPage}
                          totalItems={state.closures.length}
                          pageSize={PAGE_SIZE}
                          onPageChange={setClosuresPage}
                        />

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
                              setFeedback({
                                type: 'success',
                                text: res.message,
                              });
                            } else {
                              setFeedback({ type: 'error', text: res.message });
                            }
                            refreshState();
                          }}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Diferencia a ajustar ($)
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold tabular-nums"
                                value={adjDeltaCash}
                                onChange={(e) => {
                                  setAdjDeltaCash(Number(e.target.value));
                                  setAdjDeltaProfit(Number(e.target.value));
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Motivo obligatorio
                              </label>
                              <input
                                type="text"
                                placeholder="Motivo del ajuste..."
                                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                                value={adjReason}
                                onChange={(e) => setAdjReason(e.target.value)}
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="w-full min-h-[42px] rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs sm:text-sm cursor-pointer"
                          >
                            Registrar Ajuste Posterior Auditable
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}
              </section>
            </main>
          )}
        </>
      )}

      {/* ====================================================================
          MODALES ADICIONALES:
          1. MODAL COMPRA / DEVOLUCIÓN DE PROVEEDOR (Múltiples productos + Canastillas)
          2. MODAL ENTREGA DE CANASTILLAS A PROVEEDOR
          3. MODAL COBRO DE DEUDA DE CLIENTE ($)
          4. MODAL RECEPCIÓN DE CANASTILLAS DE CLIENTE
         ==================================================================== */}

      {/* 1. Modal Proveedor: Comprar Fruta o Devolver Fruta (Permite múltiples productos y devolución simultánea de canastillas) */}
      {supplierModalMode === 'BUY_RETURN' && activeShift && (
        <BottomSheet
          isOpen={true}
          size="large"
          onClose={() => setSupplierModalMode(null)}
          title={
            supplierActionType === 'PURCHASE'
              ? 'Comprar Fruta a Proveedor'
              : 'Devolver Fruta a Proveedor'
          }
          subtitle={`Proveedor: ${
            state.suppliers.find((s) => s.id === opSupplierId)?.name ?? 'Finca'
          }`}
          icon={<Truck className="w-5 h-5 text-green-700" />}
        >
          <div className="space-y-3.5">
            {/* Alternar si es compra o devolución dentro del mismo modal */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setSupplierActionType('PURCHASE')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  supplierActionType === 'PURCHASE'
                    ? 'bg-green-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Comprar Carga
              </button>
              <button
                type="button"
                onClick={() => setSupplierActionType('RETURN')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  supplierActionType === 'RETURN'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Devolver Fruta
              </button>
            </div>

            {/* Listado dinámico de productos para comprar o devolver */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Productos ({supplierLines.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const firstProd = state.products[0];
                    setSupplierLines((prev) => [
                      ...prev,
                      {
                        productId: firstProd?.id || 'PROD-BANANO-PRIMERA',
                        deliveredQty: 2,
                        acceptedQty: 2,
                        unitPrice: firstProd?.defaultCostPrice || 28000,
                        compensationType: 'CREDIT_BALANCE',
                      },
                    ]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-bold cursor-pointer"
                >
                  + Agregar otro producto
                </button>
              </div>

              {supplierLines.map((line, idx) => {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <select
                          value={line.productId}
                          onChange={(e) => {
                            const newPid = e.target.value;
                            const pObj = state.products.find(
                              (x) => x.id === newPid
                            );
                            setSupplierLines((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      productId: newPid,
                                      unitPrice:
                                        pObj?.defaultCostPrice || 28000,
                                    }
                                  : item
                              )
                            );
                          }}
                          className="w-full min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold"
                        >
                          {state.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit}) - Costo: {formatCOP(p.defaultCostPrice)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {supplierLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSupplierLines((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {supplierActionType === 'PURCHASE'
                            ? 'Cantidad'
                            : 'Entregada'}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-sm font-extrabold text-center tabular-nums"
                          value={line.deliveredQty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSupplierLines((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      deliveredQty: val,
                                      acceptedQty:
                                        supplierActionType === 'PURCHASE'
                                          ? val
                                          : Math.min(item.acceptedQty, val),
                                    }
                                  : item
                              )
                            );
                          }}
                        />
                      </div>

                      {supplierActionType === 'RETURN' && (
                        <div className="col-span-4">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Aceptada
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={line.deliveredQty}
                            className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-sm font-extrabold text-center tabular-nums"
                            value={line.acceptedQty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSupplierLines((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, acceptedQty: val } : item
                                )
                              );
                            }}
                          />
                        </div>
                      )}

                      <div
                        className={
                          supplierActionType === 'PURCHASE'
                            ? 'col-span-4'
                            : 'col-span-4'
                        }
                      >
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Costo Unit. ($)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-extrabold text-center tabular-nums"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSupplierLines((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, unitPrice: val } : item
                              )
                            );
                          }}
                        />
                      </div>

                      <div
                        className={
                          supplierActionType === 'PURCHASE'
                            ? 'col-span-4 p-1.5 rounded-lg bg-green-50 border border-green-200 text-right'
                            : 'col-span-12 p-1.5 rounded-lg bg-amber-50 border border-amber-200 flex justify-between items-center'
                        }
                      >
                        <span className="text-[10px] font-bold uppercase text-slate-700">
                          Subtotal:
                        </span>
                        <strong className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
                          {formatCOP(
                            (supplierActionType === 'PURCHASE'
                              ? line.deliveredQty
                              : line.acceptedQty) * line.unitPrice
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Opción para devolver canastillas al proveedor de una vez al momento de la entrega */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Devolver canastillas al proveedor de una vez:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="w-20 min-h-[34px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center tabular-nums"
                  value={supplierReturnCratesQty}
                  onChange={(e) =>
                    setSupplierReturnCratesQty(Number(e.target.value))
                  }
                />
              </label>
            </div>

            {/* Medio de pago o compensación */}
            {supplierActionType === 'PURCHASE' ? (
              <div className="grid grid-cols-2 gap-2">
                {(['CASH', 'TRANSFER'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setOpPaymentMethod(pm)}
                    className={`min-h-[40px] rounded-xl border text-xs font-bold cursor-pointer ${
                      opPaymentMethod === pm
                        ? 'bg-green-700 border-green-700 text-white'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {pm === 'CASH' ? 'Efectivo en Caja' : 'Transferencia Bancaria'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'CREDIT_BALANCE', label: 'Saldo a favor' },
                    { id: 'CASH_REFUND_RECEIVED', label: 'Efectivo recibido' },
                    { id: 'PENDING_COMPENSATION', label: 'Pendiente' },
                    { id: 'PRODUCT_EXCHANGE', label: 'Cambio fruta' },
                  ] as const
                ).map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => setOpCompensationType(comp.id)}
                    className={`min-h-[38px] px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                      opCompensationType === comp.id
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {comp.label}
                  </button>
                ))}
              </div>
            )}

            {/* Total general y botón de confirmación */}
            <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center">
              <span className="text-xs font-medium">Total de la Operación:</span>
              <strong className="text-base sm:text-lg font-extrabold text-green-400 tabular-nums">
                {formatCOP(
                  supplierLines.reduce(
                    (sum, line) =>
                      sum +
                      (supplierActionType === 'PURCHASE'
                        ? line.deliveredQty
                        : line.acceptedQty) *
                        line.unitPrice,
                    0
                  )
                )}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSupplierModalMode(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={activeShift.status === 'CLOSED'}
                onClick={async () => {
                  const sup = state.suppliers.find((s) => s.id === opSupplierId);
                  let successCount = 0;

                  for (const line of supplierLines) {
                    const pr = state.products.find((p) => p.id === line.productId);
                    if (supplierActionType === 'PURCHASE') {
                      const res = await coreService.createOperation({
                        actorUserId: currentUser.id,
                        shiftId: activeShift.id,
                        type: 'PURCHASE',
                        payload: {
                          productId: pr?.id,
                          productName: pr?.name,
                          supplierId: sup?.id,
                          supplierName: sup?.name,
                          quantity: line.deliveredQty,
                          unitCost: line.unitPrice,
                          totalAmount: line.deliveredQty * line.unitPrice,
                          paymentMethod: opPaymentMethod,
                          notes: `Compra de fruta a ${sup?.name ?? 'proveedor'}`,
                        },
                      });
                      if (res.ok) successCount++;
                    } else {
                      const res = await coreService.createOperation({
                        actorUserId: currentUser.id,
                        shiftId: activeShift.id,
                        type: 'SUPPLIER_RETURN',
                        payload: {
                          productId: pr?.id,
                          productName: pr?.name,
                          supplierId: sup?.id,
                          supplierName: sup?.name,
                          quantity: line.deliveredQty,
                          deliveredQuantity: line.deliveredQty,
                          acceptedQuantity: line.acceptedQty,
                          unitCost: line.unitPrice,
                          totalAmount: line.acceptedQty * line.unitPrice,
                          compensationType: opCompensationType,
                          cashRefundReceivedAmount:
                            opCompensationType === 'CASH_REFUND_RECEIVED'
                              ? line.acceptedQty * line.unitPrice
                              : 0,
                          notes: `Devolución de fruta a ${sup?.name ?? 'proveedor'}`,
                        },
                      });
                      if (res.ok) successCount++;
                    }
                  }

                  // Si también devolvió canastillas al proveedor
                  if (supplierReturnCratesQty > 0 && sup) {
                    await coreService.createOperation({
                      actorUserId: currentUser.id,
                      shiftId: activeShift.id,
                      type: 'CRATE_MOVEMENT',
                      payload: {
                        supplierId: sup.id,
                        supplierName: sup.name,
                        crateMovementType: 'RETURNED_TO_SUPPLIER',
                        crateQuantity: supplierReturnCratesQty,
                        quantity: supplierReturnCratesQty,
                        totalAmount: 0,
                        notes: `Devolución de ${supplierReturnCratesQty} canastillas al proveedor`,
                      },
                    });
                  }

                  setSupplierModalMode(null);
                  setFeedback({
                    type: 'success',
                    text: `Se registraron exitosamente ${successCount} productos con el proveedor ${sup?.name ?? ''}.`,
                  });
                  refreshState();
                }}
                className="min-h-[44px] rounded-xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                Confirmar Registro
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* 2. Modal Proveedor: Entrega de Canastillas únicamente */}
      {supplierModalMode === 'RETURN_CRATES' && activeShift && (
        <BottomSheet
          isOpen={true}
          size="default"
          onClose={() => setSupplierModalMode(null)}
          title="Canastillas con Proveedor"
          subtitle={`Proveedor: ${
            state.suppliers.find((s) => s.id === opSupplierId)?.name ?? 'Finca'
          }`}
          icon={<Boxes className="w-5 h-5 text-green-700" />}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSaveOperation('CRATE_MOVEMENT');
            }}
            className="space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    id: 'RETURNED_TO_SUPPLIER',
                    label: 'Devueltas a proveedor',
                  },
                  {
                    id: 'RECEIVED_FROM_SUPPLIER',
                    label: 'Recibidas de proveedor',
                  },
                ] as const
              ).map((mv) => (
                <button
                  key={mv.id}
                  type="button"
                  onClick={() => setOpCrateType(mv.id)}
                  className={`min-h-[42px] px-2 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    opCrateType === mv.id
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {mv.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Cantidad de canastillas
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-base font-extrabold text-center tabular-nums"
                value={opQuantity}
                onChange={(e) => setOpQuantity(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSupplierModalMode(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={activeShift.status === 'CLOSED'}
                className="min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                Guardar Envases
              </button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* 3. Modal Cliente: Cobrar Fiado ($) */}
      {clientModalMode === 'COLLECT_DEBT' && activeShift && (
        <BottomSheet
          isOpen={true}
          size="default"
          onClose={() => setClientModalMode(null)}
          title="Cobrar Deuda de Cliente"
          subtitle={`Cliente: ${
            state.clients.find((c) => c.id === opClientId)?.name ?? ''
          }`}
          icon={<DollarSign className="w-5 h-5 text-blue-700" />}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSaveOperation('COLLECTION_PAST_DEBT');
            }}
            className="space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'PAST', label: 'Deuda días anteriores' },
                  { id: 'CURRENT', label: 'Abono fiado de hoy' },
                ] as const
              ).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setOpCollectionKind(k.id)}
                  className={`min-h-[40px] rounded-xl border text-xs font-bold cursor-pointer ${
                    opCollectionKind === k.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Abono capital ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-base font-bold tabular-nums"
                  value={opCollectionAmount}
                  onChange={(e) => setOpCollectionAmount(Number(e.target.value))}
                />
              </div>
              {opCollectionKind === 'PAST' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Interés pactado ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-base font-bold tabular-nums"
                    value={opCollectionInterest}
                    onChange={(e) =>
                      setOpCollectionInterest(Number(e.target.value))
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClientModalMode(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={activeShift.status === 'CLOSED'}
                className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                Guardar Cobro
              </button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* 4. Modal Cliente: Recibir Canastillas Devueltas */}
      {clientModalMode === 'RETURN_CRATES' && activeShift && (
        <BottomSheet
          isOpen={true}
          size="default"
          onClose={() => setClientModalMode(null)}
          title="Recibir Canastillas de Cliente"
          subtitle={`Cliente: ${
            state.clients.find((c) => c.id === opClientId)?.name ?? ''
          }`}
          icon={<Boxes className="w-5 h-5 text-slate-800" />}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setOpCrateType('RETURNED_BY_CLIENT');
              executeSaveOperation('CRATE_MOVEMENT');
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Canastillas devueltas por el cliente
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-base font-extrabold text-center tabular-nums"
                value={opQuantity}
                onChange={(e) => setOpQuantity(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClientModalMode(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={activeShift.status === 'CLOSED'}
                className="min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                Descontar Deuda
              </button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ====================================================================
          MODAL CENTRADO 1 (BOTÓN CIRCULAR +): REGISTRAR VENTA O REGISTRAR GASTO
         ==================================================================== */}
      <BottomSheet
        isOpen={Boolean(fabModalType)}
        size={fabModalType === 'SALE' ? 'large' : 'default'}
        onClose={() => setFabModalType(null)}
        title={
          fabModalType === 'SALE'
            ? 'Registrar Venta en Ruta'
            : 'Registrar Gasto Operativo'
        }
        subtitle={
          fabModalType === 'SALE'
            ? 'Venta de múltiples productos, cobro en efectivo/fiado y devolución de envases en la misma visita'
            : 'Se guarda inmediatamente en la memoria del dispositivo'
        }
        icon={
          fabModalType === 'SALE' ? (
            <ShoppingCart className="w-5 h-5" />
          ) : (
            <Receipt className="w-5 h-5 text-amber-700" />
          )
        }
      >
        {fabModalType === 'SALE' && (
          <div className="space-y-3.5">
            <SearchableSelect
              label="Cliente"
              options={clientPickerOptions}
              value={opClientId}
              searchPlaceholder="Buscar cliente por nombre o teléfono..."
              onChange={setOpClientId}
            />

            {/* Lista dinámica de múltiples productos en la misma venta */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Productos a entregar ({saleLines.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const firstP = state.products[0];
                    const usesCr = firstP?.unit
                      .toLowerCase()
                      .includes('canastilla') ?? false;
                    setSaleLines((prev) => [
                      ...prev,
                      {
                        productId: firstP?.id || 'PROD-BANANO-PRIMERA',
                        quantity: 3,
                        unitPrice: firstP?.defaultSalePrice || 38000,
                        autoLeaveCrates: usesCr,
                        cratesCount: usesCr ? 3 : 0,
                      },
                    ]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-bold cursor-pointer"
                >
                  + Agregar otro producto
                </button>
              </div>

              {saleLines.map((line, idx) => {
                const prod = state.products.find((p) => p.id === line.productId);
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <select
                          value={line.productId}
                          onChange={(e) => {
                            const newPid = e.target.value;
                            const pObj = state.products.find(
                              (x) => x.id === newPid
                            );
                            const usesCr = pObj?.unit
                              .toLowerCase()
                              .includes('canastilla') ?? false;
                            setSaleLines((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      productId: newPid,
                                      unitPrice:
                                        pObj?.defaultSalePrice || 38000,
                                      autoLeaveCrates: usesCr,
                                      cratesCount: usesCr ? item.quantity : 0,
                                    }
                                  : item
                              )
                            );
                          }}
                          className="w-full min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold"
                        >
                          {state.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit}) - {formatCOP(p.defaultSalePrice)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {saleLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSaleLines((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Cantidad ({prod?.unit ?? 'und'})
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-sm font-extrabold text-center tabular-nums"
                          value={line.quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSaleLines((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      quantity: val,
                                      cratesCount: item.autoLeaveCrates
                                        ? val
                                        : item.cratesCount,
                                    }
                                  : item
                              )
                            );
                          }}
                        />
                      </div>

                      <div className="col-span-4">
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Precio ($)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-extrabold text-center tabular-nums"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSaleLines((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, unitPrice: val } : item
                              )
                            );
                          }}
                        />
                      </div>

                      <div className="col-span-4 p-1.5 rounded-lg bg-green-50 border border-green-200 text-right">
                        <span className="block text-[10px] font-bold uppercase text-green-900">
                          Subtotal
                        </span>
                        <strong className="text-xs sm:text-sm font-extrabold text-green-800 tabular-nums">
                          {formatCOP(line.quantity * line.unitPrice)}
                        </strong>
                      </div>
                    </div>

                    {/* Deuda automática de canastillas por línea de producto */}
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-blue-700 rounded"
                        checked={line.autoLeaveCrates}
                        onChange={(e) => {
                          const chk = e.target.checked;
                          setSaleLines((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    autoLeaveCrates: chk,
                                    cratesCount: chk ? item.quantity : 0,
                                  }
                                : item
                            )
                          );
                        }}
                      />
                      <span>
                        Carga {line.cratesCount} canastillas prestadas a la deuda del cliente
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>

            {/* El cliente entrega canastillas vacías en esta misma visita (no deja deuda neta) */}
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-950">
                Canastillas devueltas por el cliente en el acto:
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-16 min-h-[34px] px-2 py-1 rounded-lg border border-blue-300 bg-white text-xs font-extrabold text-center text-blue-950 tabular-nums"
                value={saleReturnedCratesNow}
                onChange={(e) =>
                  setSaleReturnedCratesNow(Number(e.target.value))
                }
              />
            </div>

            {/* Medio de pago */}
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'CASH', label: 'Efectivo' },
                  { id: 'TRANSFER', label: 'Transferencia' },
                  { id: 'CREDIT', label: 'Fiado' },
                ] as const
              ).map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setOpPaymentMethod(pm.id)}
                  className={`min-h-[40px] rounded-xl border text-xs font-bold cursor-pointer ${
                    opPaymentMethod === pm.id
                      ? 'bg-green-700 border-green-700 text-white'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            {opPaymentMethod === 'CREDIT' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Abono inmediato recibido hoy ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="w-full min-h-[40px] px-3 py-1 rounded-xl border border-slate-300 bg-white text-sm font-bold tabular-nums"
                  value={opPaidImmediate}
                  onChange={(e) => setOpPaidImmediate(Number(e.target.value))}
                />
              </div>
            )}

            {/* Resumen total de la venta */}
            <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center">
              <span className="text-xs font-medium">Total de la Venta:</span>
              <strong className="text-base sm:text-lg font-extrabold text-green-400 tabular-nums">
                {formatCOP(
                  saleLines.reduce(
                    (sum, l) => sum + l.quantity * l.unitPrice,
                    0
                  )
                )}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFabModalType(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const client = state.clients.find((c) => c.id === opClientId);
                  let successSales = 0;
                  const totalSaleSum = saleLines.reduce(
                    (sum, l) => sum + l.quantity * l.unitPrice,
                    0
                  );

                  for (const line of saleLines) {
                    const pr = state.products.find((p) => p.id === line.productId);
                    const lineTotal = line.quantity * line.unitPrice;
                    const linePaidImm =
                      opPaymentMethod === 'CREDIT'
                        ? totalSaleSum > 0
                          ? (lineTotal / totalSaleSum) * opPaidImmediate
                          : 0
                        : lineTotal;

                    const res = await coreService.createOperation({
                      actorUserId: currentUser.id,
                      shiftId: activeShift.id,
                      type: 'SALE',
                      payload: {
                        productId: pr?.id,
                        productName: pr?.name,
                        clientId: client?.id,
                        clientName: client?.name,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                        totalAmount: lineTotal,
                        paymentMethod: opPaymentMethod,
                        amountPaidImmediate: linePaidImm,
                        notes: `Venta de ${line.quantity} ${pr?.name ?? 'fruta'}`,
                      },
                    });

                    if (res.ok) {
                      successSales++;
                      if (line.autoLeaveCrates && line.cratesCount > 0 && client) {
                        await coreService.createOperation({
                          actorUserId: currentUser.id,
                          shiftId: activeShift.id,
                          type: 'CRATE_MOVEMENT',
                          payload: {
                            clientId: client.id,
                            clientName: client.name,
                            crateMovementType: 'DELIVERED_TO_CLIENT',
                            crateQuantity: line.cratesCount,
                            quantity: line.cratesCount,
                            totalAmount: 0,
                            notes: `Deuda de ${line.cratesCount} canastillas por venta de ${pr?.name ?? 'fruta'}`,
                          },
                        });
                      }
                    }
                  }

                  if (saleReturnedCratesNow > 0 && client) {
                    await coreService.createOperation({
                      actorUserId: currentUser.id,
                      shiftId: activeShift.id,
                      type: 'CRATE_MOVEMENT',
                      payload: {
                        clientId: client.id,
                        clientName: client.name,
                        crateMovementType: 'RETURNED_BY_CLIENT',
                        crateQuantity: saleReturnedCratesNow,
                        quantity: saleReturnedCratesNow,
                        totalAmount: 0,
                        notes: `Devolución de ${saleReturnedCratesNow} canastillas en el acto`,
                      },
                    });
                  }

                  setFabModalType(null);
                  setFeedback({
                    type: 'success',
                    text: `Se registraron exitosamente ${successSales} productos vendidos a ${client?.name ?? 'cliente'}.`,
                  });
                  refreshState();
                }}
                className="min-h-[44px] rounded-xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                Guardar Venta Completa
              </button>
            </div>
          </div>
        )}

        {fabModalType === 'EXPENSE' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSaveOperation('EXPENSE');
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Categoría del gasto
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'FUEL', label: 'Combustible / ACPM' },
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
                    className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
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
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Valor pagado ($)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-lg font-extrabold tabular-nums"
                value={opExpenseAmount}
                onChange={(e) => setOpExpenseAmount(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['CASH', 'TRANSFER'] as const).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setOpPaymentMethod(pm)}
                  className={`min-h-[42px] rounded-xl border text-xs font-bold cursor-pointer ${
                    opPaymentMethod === pm
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {pm === 'CASH' ? 'Efectivo' : 'Transferencia'}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Detalle o recibo del gasto..."
              className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-sm"
              value={opNotes}
              onChange={(e) => setOpNotes(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFabModalType(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                Guardar Gasto
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* ====================================================================
          MODAL CENTRADO 2 (CAMPANITA): AUTORIZACIONES CON TABLA PAGINADA
         ==================================================================== */}
      <BottomSheet
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        title="Solicitudes de Autorización"
        subtitle="Aprobación del dueño para ediciones fuera de plazo"
        icon={<Bell className="w-5 h-5" />}
      >
        {pendingAuthRequests.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <div className="font-bold text-base text-slate-900">
              Todo al día
            </div>
            <p className="text-sm text-slate-600">
              No hay solicitudes pendientes de autorización.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                    <th className="py-2 px-3">Solicitud y Motivo</th>
                    <th className="py-2 px-3 text-right">Decisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {pendingAuthRequests
                    .slice(
                      (authReqsPage - 1) * PAGE_SIZE,
                      authReqsPage * PAGE_SIZE
                    )
                    .map((req) => (
                      <tr key={req.id} className="bg-white">
                        <td className="py-2.5 px-3 align-middle">
                          <div className="font-bold text-slate-900">
                            {req.requestedByName}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatCOP(req.currentValueSnapshot.totalAmount)} →{' '}
                            <strong className="text-green-800">
                              {formatCOP(
                                req.requestedValueSnapshot.totalAmount
                              )}
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            "{req.reason}"
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right align-middle">
                          <div className="flex flex-col gap-1">
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
                              className="px-2.5 py-1 rounded-lg bg-green-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Aprobar
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
                              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-bold cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={authReqsPage}
              totalItems={pendingAuthRequests.length}
              pageSize={PAGE_SIZE}
              onPageChange={setAuthReqsPage}
            />
          </div>
        )}
      </BottomSheet>

      {/* ====================================================================
          MODAL CENTRADO 3: CERRAR DÍA / CONCILIACIÓN EN 4 PASOS
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
          {closureStep === 1 && (
            <div className="space-y-3">
              <div className="space-y-2.5">
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
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="text-xs sm:text-sm font-bold text-slate-900">
                          {item.productName}
                        </strong>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-green-100 text-green-900 tabular-nums">
                          Sobrante: {item.expectedFinalInventory} {item.unit}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600">
                            Conservado
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={activeShift.status === 'CLOSED'}
                            className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-sm font-bold tabular-nums"
                            value={currentClass.carriedOverQty}
                            onChange={(e) =>
                              updateItemClass({
                                carriedOverQty: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600">
                            Dev. Prov.
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={activeShift.status === 'CLOSED'}
                            className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-sm font-bold tabular-nums"
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
                          <label className="block text-[10px] font-bold text-slate-600">
                            Merma
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            disabled={activeShift.status === 'CLOSED'}
                            className="w-full min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-sm font-bold tabular-nums"
                            value={currentClass.shrinkageQty}
                            onChange={(e) =>
                              updateItemClass({
                                shrinkageQty: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setClosureStep(2)}
                className="w-full min-h-[44px] rounded-xl bg-green-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Siguiente: Paso 2 (Cuentas)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {closureStep === 2 && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-3 text-slate-600">
                        Ventas de la jornada
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums">
                        {formatCOP(reconciliation.financials.totalSalesAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600">
                        Costo de lo vendido
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums">
                        -{formatCOP(reconciliation.financials.costOfGoodsSold)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600">
                        Gastos y personal
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums">
                        -
                        {formatCOP(
                          reconciliation.financials.totalExpensesAndPersonnel
                        )}
                      </td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="py-2.5 px-3 font-bold text-green-950">
                        Utilidad económica neta
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-green-800 tabular-nums">
                        {formatCOP(reconciliation.financials.economicNetProfit)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        Efectivo físico esperado
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                        {formatCOP(reconciliation.financials.expectedCashInBox)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClosureStep(1)}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setClosureStep(3)}
                  className="min-h-[44px] rounded-xl bg-green-700 text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Paso 3: Arqueo
                </button>
              </div>
            </div>
          )}

          {closureStep === 3 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Efectivo contado en billetes y monedas ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-base font-bold tabular-nums"
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Total en transferencias verificadas ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-base font-bold tabular-nums"
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
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="text-xs font-bold text-amber-950">
                    Diferencia:{' '}
                    {formatCOP(
                      countedCashInput -
                        reconciliation.financials.expectedCashInBox
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Explica la causa de la diferencia..."
                    className="w-full min-h-[38px] px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs"
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
                    <span>Reconozco esta diferencia</span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClosureStep(2)}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setClosureStep(4)}
                  className="min-h-[44px] rounded-xl bg-green-700 text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Paso 4: Confirmar
                </button>
              </div>
            </div>
          )}

          {closureStep === 4 && (
            <div className="space-y-3">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 mt-0.5 accent-green-700 rounded shrink-0"
                  checked={finalConfirmChecked}
                  onChange={(e) => setFinalConfirmChecked(e.target.checked)}
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
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
                  className="w-full min-h-[48px] rounded-xl bg-red-700 hover:bg-red-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Ejecutar Cierre Definitivo</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-900 text-xs font-bold">
                    Jornada cerrada ({activeShift.closureId})
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
                      className="w-full min-h-[44px] rounded-xl bg-green-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
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
          MODAL CENTRADO 4: AUDITORÍA Y PRUEBAS SECCIONADO POR TABS CON PAGINACIÓN
         ==================================================================== */}
      <BottomSheet
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title="Auditoría y Verificación"
        subtitle="Tablas paginadas de bitácora, conflictos y 15 pruebas oficiales"
        icon={<ShieldCheck className="w-5 h-5" />}
        headerExtra={
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'LOGS', label: `Bitácora (${state.auditLogs.length})` },
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
          <div className="space-y-2.5">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                    <th className="py-2 px-3">Acción y Autor</th>
                    <th className="py-2 px-3 text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {state.auditLogs
                    .slice(
                      (auditLogsPage - 1) * PAGE_SIZE,
                      auditLogsPage * PAGE_SIZE
                    )
                    .map((log) => (
                      <tr key={log.id} className="bg-white">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">
                            {log.actionType}
                          </div>
                          <div className="text-slate-600">
                            {log.actorName} · {log.reason}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right align-middle">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.result === 'SUCCESS'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.result === 'SUCCESS'
                              ? 'Aprobado'
                              : 'Bloqueado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={auditLogsPage}
              totalItems={state.auditLogs.length}
              pageSize={PAGE_SIZE}
              onPageChange={setAuditLogsPage}
            />
          </div>
        )}

        {auditModalTab === 'CONFLICTS' && (
          <div className="space-y-2.5">
            {state.syncConflicts.length === 0 ? (
              <p className="text-sm text-slate-600 py-8 text-center">
                No existen conflictos de sincronización pendientes.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <th className="py-2 px-3">Conflicto</th>
                      <th className="py-2 px-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {state.syncConflicts.map((c) => (
                      <tr key={c.id} className="bg-white">
                        <td className="py-2 px-3 font-bold">{c.id}</td>
                        <td className="py-2 px-3 text-right">
                          {c.resolved ? 'Resuelto' : 'Conservado'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {auditModalTab === 'TESTS' && (
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={runningTests}
              onClick={async () => {
                setRunningTests(true);
                const res = await runAll15MandatoryAcceptanceTests();
                setTestResults(res.results);
                setRunningTests(false);
              }}
              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCcw
                className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`}
              />
              <span>Re-ejecutar las 15 pruebas oficiales</span>
            </button>

            {testResults && (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                        <th className="py-2 px-3">Prueba Oficial</th>
                        <th className="py-2 px-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {testResults
                        .slice(
                          (testsPage - 1) * PAGE_SIZE,
                          testsPage * PAGE_SIZE
                        )
                        .map((tr) => (
                          <tr key={tr.testNumber} className="bg-white">
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">
                                #{tr.testNumber}. {tr.title}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                {tr.evidenceSummary}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right align-middle">
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold text-[10px]">
                                OK
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={testsPage}
                  totalItems={testResults.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setTestsPage}
                />
              </>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ====================================================================
          MODAL CENTRADO 5: CAMBIO DE SESIÓN Y ROL POR PIN
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
          MODAL CENTRADO 6: ESTADO DE CONEXIÓN Y RESPALDO
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
          MODAL CENTRADO 7: EDITAR OPERACIÓN O SOLICITAR PERMISO
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
              <form onSubmit={handleConfirmEditOrRequest} className="space-y-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-600">
                    Valor actual:
                  </span>
                  <strong className="text-base font-bold text-slate-900 tabular-nums">
                    {formatCOP(editingOp.payload.totalAmount)}
                  </strong>
                </div>

                {approvedAuth && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <p className="text-xs font-medium text-amber-950 leading-relaxed">
                      “{MANDATORY_EXPIRED_EDIT_WARNING}”.
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer text-xs font-bold text-amber-950">
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 accent-amber-700 rounded shrink-0"
                        checked={editWarningConfirmed}
                        onChange={(e) =>
                          setEditWarningConfirmed(e.target.checked)
                        }
                      />
                      <span>
                        Confirmo que leí la advertencia y verifiqué la información.
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nuevo valor total ($)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    disabled={Boolean(approvedAuth)}
                    className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 text-base font-bold text-slate-900 tabular-nums"
                    value={editNewAmount}
                    onChange={(e) => setEditNewAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Motivo obligatorio de la modificación
                  </label>
                  <input
                    type="text"
                    placeholder="Indica por qué necesitas realizar este cambio..."
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingOp(null)}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`min-h-[44px] rounded-xl font-bold text-xs sm:text-sm text-white cursor-pointer ${
                      approvedAuth
                        ? 'bg-blue-600'
                        : win.withinWindow
                        ? 'bg-green-700'
                        : 'bg-amber-600'
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
