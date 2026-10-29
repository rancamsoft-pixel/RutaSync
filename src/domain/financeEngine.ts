// RutaBanano — Motor Financiero: Cartera, Caja, Costos, Devoluciones y Utilidad vs Efectivo (Sección 7)
import {
  ClientItem,
  CrateBalanceSummary,
  ProductInventoryReconciliation,
  RouteOperation,
  RouteShift,
  ShiftFinancialSummary,
} from '../types/domain';

export class FinanceReconciliationEngine {
  /**
   * Calcula el resumen financiero y de cartera de una jornada diferenciando estrictamente:
   * - Ventas de la jornada vs Recaudo de la jornada vs Abonos a cartera anterior
   * - Costo de lo vendido vs Mermas vs Inventario conservado vs Reembolsos de proveedor
   * - Utilidad económica de la jornada vs Efectivo físico disponible en caja
   */
  public static computeShiftFinancials(params: {
    shift: RouteShift;
    operations: RouteOperation[];
    inventoryReconciliation: ProductInventoryReconciliation[];
    clients: ClientItem[];
  }): ShiftFinancialSummary {
    const { shift, operations, inventoryReconciliation, clients } = params;
    const shiftOps = operations.filter((op) => op.shiftId === shift.id);

    let cashSalesAmount = 0;
    let transferSalesAmount = 0;
    let creditSalesAmount = 0;

    // Recaudos posteriores sobre ventas fiadas de la misma jornada (COLLECTION_CURRENT)
    let subsequentCurrentSalesCollectedCash = 0;
    let subsequentCurrentSalesCollectedTransfer = 0;

    // Abonos a deudas anteriores (COLLECTION_PAST_DEBT) — NO son ventas nuevas ni utilidad nueva de venta
    let pastDebtPrincipalCollectedCash = 0;
    let pastDebtPrincipalCollectedTransfer = 0;
    let pastDebtInterestCollectedCash = 0;
    let pastDebtInterestCollectedTransfer = 0;

    // Compras de la jornada
    let totalPurchasesAmount = 0;
    let cashPurchasesAmount = 0;
    let transferPurchasesAmount = 0;

    // Gastos de operación y pagos de personal
    let operatingExpensesCash = 0;
    let operatingExpensesTransfer = 0;
    let personnelPaymentsCash = 0;
    let personnelPaymentsTransfer = 0;

    // Devoluciones a proveedores registradas durante la ruta
    let inRouteSupplierRefundsCash = 0;
    let inRouteSupplierCreditBalance = 0;
    let inRouteSupplierPendingComp = 0;

    for (const op of shiftOps) {
      const amount = Math.max(0, op.payload.totalAmount ?? 0);
      const method = op.payload.paymentMethod ?? 'CASH';

      switch (op.type) {
        case 'SALE': {
          if (method === 'CASH') {
            cashSalesAmount += amount;
          } else if (method === 'TRANSFER') {
            transferSalesAmount += amount;
          } else if (method === 'CREDIT') {
            // Si hubo pago parcial inmediato en la venta a crédito, separar la parte pagada y la fiada
            const paidNow = Math.min(amount, Math.max(0, op.payload.amountPaidImmediate ?? 0));
            const financed = amount - paidNow;
            cashSalesAmount += paidNow;
            creditSalesAmount += financed;
          }
          break;
        }

        case 'COLLECTION_CURRENT': {
          // Abono a una venta fiada de la jornada actual: reduce la cartera de la jornada y entra a caja/banco,
          // pero NO vuelve a sumarse a totalSalesAmount (evita doble contabilización).
          if (method === 'TRANSFER') {
            subsequentCurrentSalesCollectedTransfer += amount;
          } else {
            subsequentCurrentSalesCollectedCash += amount;
          }
          break;
        }

        case 'COLLECTION_PAST_DEBT': {
          // Abono a cartera anterior: separa capital e intereses acordados.
          // Regla 7: "Los cobros de cartera anterior no deben contarse como ventas nuevas ni como nueva utilidad."
          const interest = Math.max(0, op.payload.interestApplied ?? 0);
          const principal = Math.max(0, op.payload.principalApplied ?? Math.max(0, amount - interest));

          if (method === 'TRANSFER') {
            pastDebtPrincipalCollectedTransfer += principal;
            pastDebtInterestCollectedTransfer += interest;
          } else {
            pastDebtPrincipalCollectedCash += principal;
            pastDebtInterestCollectedCash += interest;
          }
          break;
        }

        case 'PURCHASE': {
          totalPurchasesAmount += amount;
          if (method === 'CASH') {
            cashPurchasesAmount += amount;
          } else if (method === 'TRANSFER') {
            transferPurchasesAmount += amount;
          }
          break;
        }

        case 'EXPENSE': {
          const isPersonnel = op.payload.expenseCategory === 'PERSONNEL_PAYMENT';
          if (isPersonnel) {
            if (method === 'TRANSFER') {
              personnelPaymentsTransfer += amount;
            } else {
              personnelPaymentsCash += amount;
            }
          } else {
            if (method === 'TRANSFER') {
              operatingExpensesTransfer += amount;
            } else {
              operatingExpensesCash += amount;
            }
          }
          break;
        }

        case 'SUPPLIER_RETURN': {
          const compType = op.payload.compensationType ?? 'PENDING_COMPENSATION';
          const acceptedQty = Math.max(0, op.payload.acceptedQuantity ?? op.payload.deliveredQuantity ?? 0);
          const unitCost = Math.max(0, op.payload.unitCost ?? 0);
          const acceptedValue = acceptedQty * unitCost || amount;

          if (compType === 'CASH_REFUND_RECEIVED') {
            const cashReceived = Math.max(
              0,
              op.payload.cashRefundReceivedAmount ?? acceptedValue
            );
            inRouteSupplierRefundsCash += cashReceived;
          } else if (compType === 'CREDIT_BALANCE') {
            inRouteSupplierCreditBalance += acceptedValue;
          } else if (compType === 'PENDING_COMPENSATION') {
            inRouteSupplierPendingComp += acceptedValue;
          }
          break;
        }

        default:
          break;
      }
    }

    const totalSalesAmount = cashSalesAmount + transferSalesAmount + creditSalesAmount;

    const collectedFromCurrentSalesCash =
      cashSalesAmount + subsequentCurrentSalesCollectedCash;
    const collectedFromCurrentSalesTransfer =
      transferSalesAmount + subsequentCurrentSalesCollectedTransfer;

    const totalSubsequentCurrentCollections =
      subsequentCurrentSalesCollectedCash + subsequentCurrentSalesCollectedTransfer;

    const pendingReceivablesFromCurrentSales = Math.max(
      0,
      creditSalesAmount - totalSubsequentCurrentCollections
    );

    const totalPastDebtPrincipalCollected =
      pastDebtPrincipalCollectedCash + pastDebtPrincipalCollectedTransfer;
    const totalPastDebtInterestCollected =
      pastDebtInterestCollectedCash + pastDebtInterestCollectedTransfer;
    const totalPastDebtCollected =
      totalPastDebtPrincipalCollected + totalPastDebtInterestCollected;

    // Costo de productos vendidos, mermas, inventario conservado y devoluciones en cierre
    let costOfGoodsSold = 0;
    let totalShrinkageLoss = 0;
    let carriedOverInitialValuation = 0;
    let closureSupplierRefundsCash = 0;
    let closureSupplierCreditBalance = 0;
    let closureSupplierPendingComp = 0;
    let supplierUnacceptedDiscrepancyUnits = 0;

    for (const item of inventoryReconciliation) {
      carriedOverInitialValuation += item.initialInventory * item.unitCost;
      costOfGoodsSold += item.soldQty * item.unitCost;

      const totalProductShrinkageUnits =
        item.inRouteShrinkageQty + item.closureShrinkageQty;
      totalShrinkageLoss += totalProductShrinkageUnits * item.unitCost;

      supplierUnacceptedDiscrepancyUnits += item.closurePendingSupplierDiscrepancyQty;

      const closureAcceptedValue = item.closureReturnedAcceptedQty * item.unitCost;
      if (item.closureReturnCompensationType === 'CASH_REFUND_RECEIVED') {
        closureSupplierRefundsCash += item.closureReturnCashRefundReceived;
      } else if (item.closureReturnCompensationType === 'CREDIT_BALANCE') {
        closureSupplierCreditBalance += closureAcceptedValue;
      } else if (item.closureReturnCompensationType === 'PENDING_COMPENSATION') {
        closureSupplierPendingComp += closureAcceptedValue;
      }
      // Si existen unidades entregadas pero no aceptadas por el proveedor, quedan pendientes de resolución
      if (item.closurePendingSupplierDiscrepancyQty > 0) {
        closureSupplierPendingComp += item.closurePendingSupplierDiscrepancyQty * item.unitCost;
      }
    }

    const supplierRefundsCashReceived =
      inRouteSupplierRefundsCash + closureSupplierRefundsCash;
    const supplierCreditBalanceGenerated =
      inRouteSupplierCreditBalance + closureSupplierCreditBalance;
    const supplierPendingCompensationAmount =
      inRouteSupplierPendingComp + closureSupplierPendingComp;

    // Cartera acumulada de clientes
    const rawHistoricalDebt = clients.reduce(
      (acc, c) => acc + Math.max(0, c.historicalPrincipalDebt),
      0
    );
    const rawAgreedInterest = clients.reduce(
      (acc, c) => acc + Math.max(0, c.accruedAgreedInterest),
      0
    );

    const totalHistoricalPortfolioPending = Math.max(
      0,
      rawHistoricalDebt - totalPastDebtPrincipalCollected
    );
    const totalAgreedInterestPending = Math.max(
      0,
      rawAgreedInterest - totalPastDebtInterestCollected
    );
    const totalCombinedPortfolioPending =
      totalHistoricalPortfolioPending +
      totalAgreedInterestPending +
      pendingReceivablesFromCurrentSales;

    const totalExpensesAndPersonnel =
      operatingExpensesCash +
      operatingExpensesTransfer +
      personnelPaymentsCash +
      personnelPaymentsTransfer;

    // Regla 7: "Los cobros de cartera anterior no deben contarse como ventas nuevas ni como nueva utilidad."
    // La utilidad económica proviene exclusivamente de la operación de la jornada:
    // Ventas de la jornada - Costo de los productos vendidos - Pérdida por mermas - Gastos y pagos de personal.
    const economicGrossProfit = totalSalesAmount - costOfGoodsSold;
    const economicNetProfit =
      economicGrossProfit - totalShrinkageLoss - totalExpensesAndPersonnel;

    // Efectivo físico esperado en caja (distinto de la utilidad económica):
    // Base inicial + recaudos en efectivo de ventas hoy + recaudos en efectivo de cartera anterior +
    // reembolsos de proveedor efectivamente recibidos en efectivo - compras en efectivo - gastos/personal en efectivo.
    const expectedCashInBox =
      shift.initialCash +
      collectedFromCurrentSalesCash +
      pastDebtPrincipalCollectedCash +
      pastDebtInterestCollectedCash +
      supplierRefundsCashReceived -
      cashPurchasesAmount -
      operatingExpensesCash -
      personnelPaymentsCash;

    const expectedTransfersInBank =
      collectedFromCurrentSalesTransfer +
      pastDebtPrincipalCollectedTransfer +
      pastDebtInterestCollectedTransfer -
      transferPurchasesAmount -
      operatingExpensesTransfer -
      personnelPaymentsTransfer;

    return {
      totalSalesAmount,
      cashSalesAmount,
      transferSalesAmount,
      creditSalesAmount,
      collectedFromCurrentSalesCash,
      collectedFromCurrentSalesTransfer,
      pendingReceivablesFromCurrentSales,
      pastDebtPrincipalCollectedCash,
      pastDebtPrincipalCollectedTransfer,
      pastDebtInterestCollectedCash,
      pastDebtInterestCollectedTransfer,
      totalPastDebtCollected,
      totalHistoricalPortfolioPending,
      totalAgreedInterestPending,
      totalCombinedPortfolioPending,
      totalPurchasesAmount,
      carriedOverInitialValuation,
      costOfGoodsSold,
      totalShrinkageLoss,
      supplierRefundsCashReceived,
      supplierCreditBalanceGenerated,
      supplierPendingCompensationAmount,
      supplierUnacceptedDiscrepancyUnits,
      operatingExpensesCash,
      operatingExpensesTransfer,
      personnelPaymentsCash,
      personnelPaymentsTransfer,
      totalExpensesAndPersonnel,
      economicGrossProfit,
      economicNetProfit,
      expectedCashInBox,
      expectedTransfersInBank,
    };
  }

  public static computeCrateBalance(params: {
    shift: RouteShift;
    operations: RouteOperation[];
    clients: ClientItem[];
  }): CrateBalanceSummary {
    const { shift, operations, clients } = params;
    const shiftOps = operations.filter(
      (op) => op.shiftId === shift.id && op.type === 'CRATE_MOVEMENT'
    );

    let receivedFromSupplier = 0;
    let returnedToSupplier = 0;
    let deliveredToClients = 0;
    let returnedByClients = 0;

    for (const op of shiftOps) {
      const qty = Math.max(0, op.payload.crateQuantity ?? op.payload.quantity ?? 0);
      switch (op.payload.crateMovementType) {
        case 'RECEIVED_FROM_SUPPLIER':
          receivedFromSupplier += qty;
          break;
        case 'RETURNED_TO_SUPPLIER':
          returnedToSupplier += qty;
          break;
        case 'DELIVERED_TO_CLIENT':
          deliveredToClients += qty;
          break;
        case 'RETURNED_BY_CLIENT':
          returnedByClients += qty;
          break;
        default:
          break;
      }
    }

    const finalCratesInVehicle =
      shift.initialCrates +
      receivedFromSupplier -
      returnedToSupplier -
      deliveredToClients +
      returnedByClients;

    const baseClientCrates = clients.reduce((sum, c) => sum + Math.max(0, c.cratesHeld), 0);
    const totalCratesHeldByClients = Math.max(
      0,
      baseClientCrates + deliveredToClients - returnedByClients
    );

    return {
      initialCratesAvailable: shift.initialCrates,
      receivedFromSupplier,
      returnedToSupplier,
      deliveredToClients,
      returnedByClients,
      finalCratesInVehicle,
      totalCratesHeldByClients,
    };
  }
}

