// RutaBanano — Motor de Conciliación de Inventario y Clasificación de Sobrantes (Sección 6)
import {
  LeftoverProductClassification,
  ProductCatalogItem,
  ProductInventoryReconciliation,
  RouteOperation,
  RouteShift,
} from '../types/domain';

export class InventoryReconciliationEngine {
  /**
   * Calcula la conciliación de inventario por cada producto activo o con movimiento en la jornada.
   * Fórmula oficial (Sección 6):
   * Inventario inicial + compras y entradas − ventas − devoluciones al proveedor − mermas autorizadas = inventario final disponible.
   * Considera por separado los traslados sin contabilizar dos veces una misma unidad.
   */
  public static computeShiftInventory(params: {
    shift: RouteShift;
    products: ProductCatalogItem[];
    operations: RouteOperation[];
    closureClassifications: Record<string, LeftoverProductClassification>;
  }): {
    items: ProductInventoryReconciliation[];
    allSquared: boolean;
    validationErrors: string[];
  } {
    const { shift, products, operations, closureClassifications } = params;
    const shiftOps = operations.filter((op) => op.shiftId === shift.id);

    const items: ProductInventoryReconciliation[] = [];
    const validationErrors: string[] = [];

    for (const product of products) {
      const initialInventory = shift.initialInventory[product.id] ?? 0;

      let purchasesQty = 0;
      let transfersInQty = 0;
      let transfersOutQty = 0;
      let soldQty = 0;
      let inRouteSupplierReturnDeliveredQty = 0;
      let inRouteSupplierReturnAcceptedQty = 0;
      let inRouteShrinkageQty = 0;
      let weightedPurchaseCostSum = 0;
      let weightedPurchaseUnits = 0;

      for (const op of shiftOps) {
        if (op.payload.productId !== product.id) continue;
        const qty = Math.max(0, op.payload.quantity ?? 0);

        switch (op.type) {
          case 'PURCHASE': {
            purchasesQty += qty;
            const unitCost = op.payload.unitCost ?? product.defaultCostPrice;
            weightedPurchaseCostSum += qty * unitCost;
            weightedPurchaseUnits += qty;
            break;
          }
          case 'INVENTORY_TRANSFER': {
            if (op.payload.transferDirection === 'IN') {
              transfersInQty += qty;
            } else {
              transfersOutQty += qty;
            }
            break;
          }
          case 'SALE': {
            soldQty += qty;
            break;
          }
          case 'SUPPLIER_RETURN': {
            const delivered = Math.max(0, op.payload.deliveredQuantity ?? qty);
            const accepted = Math.max(0, op.payload.acceptedQuantity ?? delivered);
            inRouteSupplierReturnDeliveredQty += delivered;
            inRouteSupplierReturnAcceptedQty += accepted;
            break;
          }
          case 'IN_ROUTE_SHRINKAGE': {
            inRouteShrinkageQty += qty;
            break;
          }
          default:
            break;
        }
      }

      const effectiveUnitCost =
        weightedPurchaseUnits > 0
          ? Math.round(weightedPurchaseCostSum / weightedPurchaseUnits)
          : product.defaultCostPrice;

      // Fórmula exacta sin doble contabilización
      const expectedFinalInventory =
        initialInventory +
        purchasesQty +
        transfersInQty -
        transfersOutQty -
        soldQty -
        inRouteSupplierReturnDeliveredQty -
        inRouteShrinkageQty;

      const classification = closureClassifications[product.id];
      const closureReturnedDeliveredQty = Math.max(
        0,
        classification?.returnedToSupplierDeliveredQty ?? 0
      );
      const closureReturnedAcceptedQty = Math.max(
        0,
        classification?.returnedToSupplierAcceptedQty ?? closureReturnedDeliveredQty
      );
      const closureReturnCompensationType =
        classification?.returnCompensationType ?? 'PENDING_COMPENSATION';
      const closureReturnCashRefundReceived =
        closureReturnCompensationType === 'CASH_REFUND_RECEIVED'
          ? Math.max(0, classification?.returnCashRefundReceived ?? 0)
          : 0;
      const closureShrinkageQty = Math.max(0, classification?.shrinkageQty ?? 0);
      const closureShrinkageReason = (classification?.shrinkageReason ?? '').trim();
      const carriedOverToNextShiftQty = Math.max(0, classification?.carriedOverQty ?? 0);

      const totalClassifiedQty =
        closureReturnedDeliveredQty + closureShrinkageQty + carriedOverToNextShiftQty;
      const unclassifiedDiscrepancyQty = expectedFinalInventory - totalClassifiedQty;

      // Diferencia entre cantidad entregada al proveedor y cantidad realmente aceptada (en ruta + en cierre)
      const totalDeliveredToSupplier =
        inRouteSupplierReturnDeliveredQty + closureReturnedDeliveredQty;
      const totalAcceptedBySupplier =
        inRouteSupplierReturnAcceptedQty + closureReturnedAcceptedQty;
      const closurePendingSupplierDiscrepancyQty = Math.max(
        0,
        totalDeliveredToSupplier - totalAcceptedBySupplier
      );

      let productErrors: string[] = [];

      if (expectedFinalInventory < 0) {
        productErrors.push(
          `${product.name}: El inventario calculado es negativo (${expectedFinalInventory} ${product.unit}). Revisa compras y ventas.`
        );
      }

      if (unclassifiedDiscrepancyQty !== 0) {
        productErrors.push(
          `${product.name}: Faltan por clasificar ${unclassifiedDiscrepancyQty} ${product.unit} (Sobrante real: ${expectedFinalInventory}, Clasificado: ${totalClassifiedQty}).`
        );
      }

      if (closureShrinkageQty > 0 && closureShrinkageReason.length < 3) {
        productErrors.push(
          `${product.name}: Debes indicar el motivo de las ${closureShrinkageQty} ${product.unit} dadas de baja como merma.`
        );
      }

      if (closureReturnedAcceptedQty > closureReturnedDeliveredQty) {
        productErrors.push(
          `${product.name}: La cantidad aceptada por el proveedor (${closureReturnedAcceptedQty}) no puede superar la cantidad entregada (${closureReturnedDeliveredQty}).`
        );
      }

      const isSquared = productErrors.length === 0;
      validationErrors.push(...productErrors);

      items.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        unitCost: effectiveUnitCost,
        initialInventory,
        purchasesQty,
        transfersInQty,
        transfersOutQty,
        soldQty,
        inRouteSupplierReturnDeliveredQty,
        inRouteSupplierReturnAcceptedQty,
        inRouteShrinkageQty,
        expectedFinalInventory,
        closureReturnedDeliveredQty,
        closureReturnedAcceptedQty,
        closurePendingSupplierDiscrepancyQty,
        closureReturnCompensationType,
        closureReturnCashRefundReceived,
        closureShrinkageQty,
        closureShrinkageReason,
        carriedOverToNextShiftQty,
        totalClassifiedQty,
        unclassifiedDiscrepancyQty,
        isSquared,
      });
    }

    return {
      items,
      allSquared: validationErrors.length === 0,
      validationErrors,
    };
  }
}

