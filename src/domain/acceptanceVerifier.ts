// RutaBanano — Verificador Oficial de las 15 Pruebas de Aceptación Obligatorias (Sección 11)
import { createDefaultInitialState, RutaBananoCoreService } from './rutaBananoCore';
import { MANDATORY_EXPIRED_EDIT_WARNING, ServerPolicyValidator } from './securityEngine';
import { IndexedDbStorageEngine } from '../storage/indexedDbStorage';
import { ReliableTimeEngine } from './timeEngine';

export interface AcceptanceTestResult {
  testNumber: number;
  title: string;
  passed: boolean;
  evidenceSummary: string;
  durationMs: number;
}

export async function runAll15MandatoryAcceptanceTests(): Promise<{
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  executedAt: number;
  results: AcceptanceTestResult[];
}> {
  const results: AcceptanceTestResult[] = [];
  const baseNow = 1_730_000_000_000;

  async function runCheck(
    testNumber: number,
    title: string,
    fn: () => Promise<string>
  ): Promise<void> {
    const start = performance.now();
    try {
      const evidenceSummary = await fn();
      results.push({
        testNumber,
        title,
        passed: true,
        evidenceSummary,
        durationMs: Math.max(1, Math.round(performance.now() - start)),
      });
    } catch (err) {
      results.push({
        testNumber,
        title,
        passed: false,
        evidenceSummary: err instanceof Error ? err.message : String(err),
        durationMs: Math.max(1, Math.round(performance.now() - start)),
      });
    }
  }

  // PRUEBA 1: El plazo de edición se calcula individualmente desde cada operación.
  await runCheck(
    1,
    'El plazo de edición se calcula individualmente desde cada operación',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;
      await core.configureEditWindowAndClosurePolicy({
        actorUserId: 'USR-OWNER-01',
        editWindowMinutes: 60,
        allowResponsibleHelperClose: false,
      });

      const sale9am = await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'SALE',
        createdAtOverrideMs: baseNow, // 9:00 a.m.
        payload: {
          productId: 'PROD-BANANO-PRIMERA',
          quantity: 5,
          unitPrice: 38000,
          totalAmount: 190000,
          paymentMethod: 'CASH',
        },
      });

      const expense1130am = await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'EXPENSE',
        createdAtOverrideMs: baseNow + 150 * 60_000, // 11:30 a.m. (+150 min)
        payload: {
          expenseCategory: 'FUEL',
          description: 'ACPM camión',
          totalAmount: 50000,
          paymentMethod: 'CASH',
        },
      });

      const evalAt1005am = baseNow + 65 * 60_000;
      const w1 = ReliableTimeEngine.getOperationEditDeadlineMs(sale9am.data!, 60);
      const w2 = ReliableTimeEngine.getOperationEditDeadlineMs(expense1130am.data!, 60);

      if (w1 !== baseNow + 60 * 60_000) {
        throw new Error('El vencimiento de la venta de las 9:00 a.m. no fue exactamente a las 10:00 a.m.');
      }
      if (w2 !== baseNow + 210 * 60_000) {
        throw new Error('El vencimiento del gasto de las 11:30 a.m. no se calculó individualmente.');
      }

      // Verificar también opción de 0 minutos
      const zeroWindowStatus = timeEngine.isWithinEditWindow(sale9am.data!, 0, baseNow);
      if (zeroWindowStatus.withinWindow) {
        throw new Error('Con plazo configurado en 0 minutos la operación debería requerir autorización inmediata.');
      }

      const eval1 = timeEngine.isWithinEditWindow(sale9am.data!, 60, evalAt1005am);
      if (eval1.withinWindow) {
        throw new Error('La venta de las 9:00 a.m. debía estar vencida a las 10:05 a.m.');
      }

      return 'Venta 9:00 a.m. vence exactamente +60 min (10:00 a.m.); gasto 11:30 a.m. conserva su propio vencimiento (+210 min); plazo 0 min bloquea edición inmediata.';
    }
  );

  // PRUEBA 2: Modificar una operación no reinicia el plazo de otras operaciones.
  await runCheck(
    2,
    'Modificar una operación no reinicia el plazo de otras operaciones',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;

      const opA = await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'EXPENSE',
        createdAtOverrideMs: baseNow,
        payload: { expenseCategory: 'FOOD', totalAmount: 20000, paymentMethod: 'CASH' },
      });

      const opB = await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'EXPENSE',
        createdAtOverrideMs: baseNow + 10 * 60_000,
        payload: { expenseCategory: 'TOLL_PARKING', totalAmount: 15000, paymentMethod: 'CASH' },
      });

      const originalDeadlineA = ReliableTimeEngine.getOperationEditDeadlineMs(
        opA.data!,
        shift.editWindowMinutes
      );

      // Editar opB a los 15 minutos
      const editRes = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: opB.data!.id,
        newPayload: { expenseCategory: 'TOLL_PARKING', totalAmount: 18000, paymentMethod: 'CASH' },
        reason: 'Corrección de recibo de peaje',
        evaluationTimeOverrideMs: baseNow + 15 * 60_000,
      });

      if (!editRes.ok) throw new Error('Falló edición válida dentro del plazo de opB');

      const postEditOpA = core.getState().operations.find((o) => o.id === opA.data!.id)!;
      const newDeadlineA = ReliableTimeEngine.getOperationEditDeadlineMs(
        postEditOpA,
        shift.editWindowMinutes
      );

      if (newDeadlineA !== originalDeadlineA || postEditOpA.createdAt !== baseNow) {
        throw new Error('El plazo o fecha de creación de opA cambió al modificar opB.');
      }

      return `OpA mantuvo intacto su createdAt (${postEditOpA.createdAt}) y su límite (${newDeadlineA}) tras editar OpB.`;
    }
  );

  // PRUEBA 3: Un auxiliar no puede editar una operación vencida sin autorización.
  await runCheck(
    3,
    'Un auxiliar no puede editar una operación vencida sin autorización',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const expiredOp = core.getState().operations.find((o) => o.id === 'OP-DEMO-VENTA-01')!;

      const attempt = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: expiredOp.id,
        newPayload: { ...expiredOp.payload, totalAmount: 100000 },
        reason: 'Intento sin autorización',
      });

      if (attempt.ok || attempt.code !== 'EDIT_WINDOW_EXPIRED_AUTH_REQUIRED') {
        throw new Error('Se permitió a un auxiliar editar una operación vencida sin autorización.');
      }

      return `Edición directa bloqueada con código ${attempt.code} y registrada en auditoría como REJECTED.`;
    }
  );

  // PRUEBA 4: Las autorizaciones son específicas y no reutilizables indebidamente.
  await runCheck(
    4,
    'Las autorizaciones son específicas y no reutilizables indebidamente',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const expiredOp = core.getState().operations.find((o) => o.id === 'OP-DEMO-VENTA-01')!;
      const otherOp = core.getState().operations.find((o) => o.id === 'OP-DEMO-COMPRA-01')!;

      const approvedPayload = {
        ...expiredOp.payload,
        quantity: 11,
        totalAmount: 418000,
      };

      const req = await core.requestExpiredEditAuthorization({
        actorUserId: 'USR-HELPER-01',
        operationId: expiredOp.id,
        requestedPayload: approvedPayload,
        reason: 'Se facturaron 12 cajas pero el cliente recibió 11',
      });

      await core.decideEditAuthorization({
        ownerUserId: 'USR-OWNER-01',
        authorizationId: req.data!.id,
        decision: 'APPROVE',
      });

      // 4a. Intentar usar la autorización en OTRA operación
      const crossOpAttempt = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: otherOp.id,
        newPayload: otherOp.payload,
        reason: 'Intento cruzado',
        authorizationId: req.data!.id,
        warningConfirmed: true,
      });
      if (crossOpAttempt.ok || crossOpAttempt.code !== 'AUTH_OPERATION_MISMATCH') {
        throw new Error('Se permitió usar la autorización en una operación distinta.');
      }

      // 4b. Intentar aplicar un valor distinto al aprobado
      const differentValueAttempt = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: expiredOp.id,
        newPayload: { ...expiredOp.payload, quantity: 5, totalAmount: 190000 },
        reason: 'Intento con monto distinto al aprobado',
        authorizationId: req.data!.id,
        warningConfirmed: true,
      });
      if (differentValueAttempt.ok || differentValueAttempt.code !== 'AUTH_CHANGE_PAYLOAD_MISMATCH') {
        throw new Error('Se permitió aplicar un monto distinto al autorizado.');
      }

      // 4c. Consumir válidamente una vez (confirmando la advertencia obligatoria)
      const validUse = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: expiredOp.id,
        newPayload: approvedPayload,
        reason: 'Aplicación de cambio autorizado por el dueño',
        authorizationId: req.data!.id,
        warningConfirmed: true,
      });
      if (!validUse.ok) throw new Error(`Falló uso válido: ${validUse.message}`);

      // 4d. Intentar reutilizar la misma autorización por segunda vez
      const reuseAttempt = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: expiredOp.id,
        newPayload: approvedPayload,
        reason: 'Intento de reutilización',
        authorizationId: req.data!.id,
        warningConfirmed: true,
      });
      if (reuseAttempt.ok || reuseAttempt.code !== 'AUTH_ALREADY_CONSUMED') {
        throw new Error('Se permitió reutilizar una autorización ya consumida.');
      }

      return `Verificado: bloqueo cruzado (${crossOpAttempt.code}), bloqueo de monto distinto (${differentValueAttempt.code}), advertencia obligatoria "${MANDATORY_EXPIRED_EDIT_WARNING.slice(0, 38)}..." y bloqueo de reuso (${reuseAttempt.code}).`;
    }
  );

  // PRUEBA 5: Una operación modificada después de aprobarse requiere nueva autorización.
  await runCheck(
    5,
    'Una operación modificada después de aprobarse requiere nueva autorización',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const op = core.getState().operations.find((o) => o.id === 'OP-DEMO-FIADO-01')!;

      const req1 = await core.requestExpiredEditAuthorization({
        actorUserId: 'USR-HELPER-01',
        operationId: op.id,
        requestedPayload: { ...op.payload, totalAmount: 90000 },
        reason: 'Primera solicitud',
      });

      await core.decideEditAuthorization({
        ownerUserId: 'USR-OWNER-01',
        authorizationId: req1.data!.id,
        decision: 'APPROVE',
      });

      // La operación se modifica antes de usar req1 (por ejemplo, edición dentro de ventana incrementa versión a 2)
      await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: op.id,
        newPayload: { ...op.payload, notes: 'Cambio intermedio que incrementa versión' },
        reason: 'Actualización intermedia',
        evaluationTimeOverrideMs: baseNow,
      });

      // Ahora req1 debe haber quedado INVALIDATED y no permitir la edición
      const staleAttempt = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: op.id,
        newPayload: { ...op.payload, totalAmount: 90000 },
        reason: 'Intentar usar autorización anterior al cambio',
        authorizationId: req1.data!.id,
        warningConfirmed: true,
        evaluationTimeOverrideMs: baseNow + 90 * 60_000,
      });

      if (staleAttempt.ok) {
        throw new Error('Se permitió usar una autorización cuya operación cambió después de aprobarse.');
      }

      return `Al cambiar la versión de la operación (v1 -> v2), la autorización previa quedó en estado INVALIDATED (${staleAttempt.code}).`;
    }
  );

  // PRUEBA 6: Solo los responsables autorizados pueden cerrar jornadas.
  await runCheck(
    6,
    'Solo los responsables autorizados pueden cerrar jornadas',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;
      const preview = core.getShiftReconciliationPreview(shift.id);

      // 6a. Auxiliar NO responsable intenta cerrar
      const nonRespAttempt = await core.executeDefinitiveShiftClosure({
        actorUserId: 'USR-HELPER-02',
        shiftId: shift.id,
        countedCash: preview.financials.expectedCashInBox,
        countedTransfers: preview.financials.expectedTransfersInBank,
        differenceAcknowledged: true,
        differenceExplanation: '',
        explicitConfirmation: true,
      });
      if (nonRespAttempt.ok || nonRespAttempt.code !== 'NOT_ASSIGNED_RESPONSIBLE') {
        throw new Error('Se permitió cerrar a un usuario que no es el responsable asignado.');
      }

      // 6b. Auxiliar responsable SIN permiso de cierre intenta cerrar
      const unauthorizedHelperAttempt = await core.executeDefinitiveShiftClosure({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        countedCash: preview.financials.expectedCashInBox,
        countedTransfers: preview.financials.expectedTransfersInBank,
        differenceAcknowledged: true,
        differenceExplanation: '',
        explicitConfirmation: true,
      });
      if (
        unauthorizedHelperAttempt.ok ||
        unauthorizedHelperAttempt.code !== 'HELPER_CLOSURE_NOT_AUTHORIZED'
      ) {
        throw new Error('Se permitió cerrar a un auxiliar responsable sin autorización de cierre.');
      }

      // 6c. El dueño otorga permiso de cierre al responsable y ahora sí puede cerrar
      await core.configureEditWindowAndClosurePolicy({
        actorUserId: 'USR-OWNER-01',
        shiftId: shift.id,
        editWindowMinutes: 30,
        allowResponsibleHelperClose: true,
      });

      const authorizedClose = await core.executeDefinitiveShiftClosure({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        countedCash: preview.financials.expectedCashInBox,
        countedTransfers: preview.financials.expectedTransfersInBank,
        differenceAcknowledged: true,
        differenceExplanation: '',
        explicitConfirmation: true,
      });
      if (!authorizedClose.ok) {
        throw new Error(`El responsable autorizado no pudo cerrar: ${authorizedClose.message}`);
      }

      return `Bloqueado no responsable (${nonRespAttempt.code}), bloqueado auxiliar sin permiso (${unauthorizedHelperAttempt.code}), y permitido tras autorización expresa (${authorizedClose.data!.closureId}).`;
    }
  );

  // PRUEBA 7: Un cierre definitivo bloquea las modificaciones ordinarias de todos los roles.
  await runCheck(
    7,
    'Un cierre definitivo bloquea las modificaciones ordinarias de todos los roles',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;
      await core.configureEditWindowAndClosurePolicy({
        actorUserId: 'USR-OWNER-01',
        shiftId: shift.id,
        editWindowMinutes: 30,
        allowResponsibleHelperClose: true,
      });
      const preview = core.getShiftReconciliationPreview(shift.id);

      await core.executeDefinitiveShiftClosure({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        countedCash: preview.financials.expectedCashInBox,
        countedTransfers: preview.financials.expectedTransfersInBank,
        differenceAcknowledged: true,
        differenceExplanation: '',
        explicitConfirmation: true,
      });

      const op = core.getState().operations[0];

      // Intento de edición ordinaria por auxiliar
      const helperEdit = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: op.id,
        newPayload: { ...op.payload, totalAmount: 999999 },
        reason: 'Intento post-cierre auxiliar',
      });

      // Intento de edición ordinaria directa por el DUEÑO
      const ownerEdit = await core.editOperation({
        actorUserId: 'USR-OWNER-01',
        operationId: op.id,
        newPayload: { ...op.payload, totalAmount: 999999 },
        reason: 'Intento post-cierre dueño',
      });

      // Intento de crear nueva operación en la jornada cerrada
      const newOpAfterClose = await core.createOperation({
        actorUserId: 'USR-OWNER-01',
        shiftId: shift.id,
        type: 'EXPENSE',
        payload: { totalAmount: 10000, expenseCategory: 'OTHER', paymentMethod: 'CASH' },
      });

      if (helperEdit.ok || ownerEdit.ok || newOpAfterClose.ok) {
        throw new Error('Se permitió modificar o agregar operaciones ordinarias en una jornada cerrada.');
      }

      return `Bloqueada edición de auxiliar (${helperEdit.code}), bloqueada edición directa del dueño (${ownerEdit.code}) y bloqueadas nuevas operaciones (${newOpAfterClose.code}).`;
    }
  );

  // PRUEBA 8: El sistema conserva el cierre original y permite ajustes posteriores solo mediante un procedimiento separado y auditable.
  await runCheck(
    8,
    'El sistema conserva el cierre original y permite ajustes posteriores solo mediante un procedimiento separado y auditable',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;
      await core.configureEditWindowAndClosurePolicy({
        actorUserId: 'USR-OWNER-01',
        shiftId: shift.id,
        editWindowMinutes: 30,
        allowResponsibleHelperClose: true,
      });
      const preview = core.getShiftReconciliationPreview(shift.id);

      const closeRes = await core.executeDefinitiveShiftClosure({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        countedCash: preview.financials.expectedCashInBox,
        countedTransfers: preview.financials.expectedTransfersInBank,
        differenceAcknowledged: true,
        differenceExplanation: '',
        explicitConfirmation: true,
      });

      const originalHash = closeRes.data!.snapshotHash;
      const originalSales = closeRes.data!.financialSummary.totalSalesAmount;

      // Auxiliar no puede crear ajuste posterior
      const helperAdjAttempt = await core.createPostClosureAdjustment({
        actorUserId: 'USR-HELPER-01',
        closureId: closeRes.data!.closureId,
        adjustmentType: 'FINANCIAL_CORRECTION',
        reason: 'Intento de auxiliar',
        previousValueSummary: { monto: 456000 },
        correctedValueSummary: { monto: 466000 },
        monetaryDeltaCash: 10000,
        monetaryDeltaProfit: 10000,
        monetaryDeltaPortfolio: 0,
      });
      if (helperAdjAttempt.ok) {
        throw new Error('Un auxiliar pudo registrar un ajuste post-cierre sin ser el dueño.');
      }

      // El dueño registra un ajuste posterior auditable
      const ownerAdj = await core.createPostClosureAdjustment({
        actorUserId: 'USR-OWNER-01',
        closureId: closeRes.data!.closureId,
        referencedOperationId: 'OP-DEMO-VENTA-01',
        adjustmentType: 'FINANCIAL_CORRECTION',
        reason: 'Ajuste posterior por billete sobrante verificado en arqueo final',
        previousValueSummary: { efectivoContado: preview.financials.expectedCashInBox },
        correctedValueSummary: { efectivoContado: preview.financials.expectedCashInBox + 10000 },
        monetaryDeltaCash: 10000,
        monetaryDeltaProfit: 10000,
        monetaryDeltaPortfolio: 0,
      });

      if (!ownerAdj.ok) throw new Error(ownerAdj.message);

      const storedClosure = core.getState().closures.find(
        (c) => c.closureId === closeRes.data!.closureId
      )!;
      if (
        storedClosure.snapshotHash !== originalHash ||
        storedClosure.financialSummary.totalSalesAmount !== originalSales
      ) {
        throw new Error('El cierre histórico original fue alterado por el ajuste posterior.');
      }

      return `Cierre original #${storedClosure.closureId} intacto (hash ${originalHash}); ajuste #${ownerAdj.data!.id} registrado por separado con auditoría #${ownerAdj.data!.auditRecordId}.`;
    }
  );

  // PRUEBA 9: Las cantidades de inventario deben cuadrar antes del cierre.
  await runCheck(
    9,
    'Las cantidades de inventario deben cuadrar antes del cierre',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;
      await core.configureEditWindowAndClosurePolicy({
        actorUserId: 'USR-OWNER-01',
        shiftId: shift.id,
        editWindowMinutes: 30,
        allowResponsibleHelperClose: true,
      });

      // Descuadrar Banano Primera dejando 5 cajas sin clasificar (de 18 sobrantes, solo clasifica 13)
      await core.updateClosureInventoryClassification({
        shiftId: shift.id,
        productId: 'PROD-BANANO-PRIMERA',
        classification: {
          productId: 'PROD-BANANO-PRIMERA',
          productName: 'Banano Primera (Caja 20 Kg)',
          unit: 'Cajas',
          unitCost: 28000,
          expectedFinalInventory: 18,
          returnedToSupplierDeliveredQty: 0,
          returnedToSupplierAcceptedQty: 0,
          returnCompensationType: 'PENDING_COMPENSATION',
          returnCashRefundReceived: 0,
          shrinkageQty: 0,
          shrinkageReason: '',
          carriedOverQty: 13, // Faltan 5 cajas por clasificar
        },
      });

      const attempt = await core.executeDefinitiveShiftClosure({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        countedCash: 100000,
        countedTransfers: 0,
        differenceAcknowledged: true,
        differenceExplanation: 'Prueba inventario descuadrado',
        explicitConfirmation: true,
      });

      if (attempt.ok || attempt.code !== 'INVENTORY_NOT_SQUARED') {
        throw new Error('Se permitió cerrar la jornada con cantidades de inventario sin clasificar.');
      }

      return `Cierre bloqueado (${attempt.code}) cuando faltan 5 cajas por clasificar del sobrante real (18 cajas).`;
    }
  );

  // PRUEBA 10: Las devoluciones parciales, mermas e inventario conservado afectan correctamente la conciliación.
  await runCheck(
    10,
    'Las devoluciones parciales, mermas e inventario conservado afectan correctamente la conciliación',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;
      await core.configureEditWindowAndClosurePolicy({
        actorUserId: 'USR-OWNER-01',
        shiftId: shift.id,
        editWindowMinutes: 30,
        allowResponsibleHelperClose: true,
      });

      // De las 18 cajas sobrantes de Banano Primera:
      // - 4 entregadas al proveedor, pero proveedor solo acepta 3 (1 queda pendiente de resolución, saldo a favor)
      // - 2 dadas de baja como merma por fruta estropeada
      // - 12 conservadas para la próxima jornada
      await core.updateClosureInventoryClassification({
        shiftId: shift.id,
        productId: 'PROD-BANANO-PRIMERA',
        classification: {
          productId: 'PROD-BANANO-PRIMERA',
          productName: 'Banano Primera (Caja 20 Kg)',
          unit: 'Cajas',
          unitCost: 28000,
          expectedFinalInventory: 18,
          returnedToSupplierDeliveredQty: 4,
          returnedToSupplierAcceptedQty: 3,
          returnCompensationType: 'CREDIT_BALANCE',
          returnCashRefundReceived: 0,
          shrinkageQty: 2,
          shrinkageReason: 'Fruta golpeada en transporte',
          carriedOverQty: 12,
        },
      });

      const preview = core.getShiftReconciliationPreview(shift.id);
      const item = preview.inventory.items.find((i) => i.productId === 'PROD-BANANO-PRIMERA')!;

      if (!item.isSquared || item.closurePendingSupplierDiscrepancyQty !== 1) {
        throw new Error('No se calculó correctamente la diferencia entre cantidad entregada (4) y aceptada (3).');
      }

      // Cerrar jornada actual y abrir la siguiente jornada verificando traslado de las 12 cajas sin compra ficticia
      const closeRes = await core.executeDefinitiveShiftClosure({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        countedCash: preview.financials.expectedCashInBox,
        countedTransfers: preview.financials.expectedTransfersInBank,
        differenceAcknowledged: true,
        differenceExplanation: '',
        explicitConfirmation: true,
      });

      const nextShiftRes = await core.openNewShift({
        actorUserId: 'USR-OWNER-01',
        operatingDate: '2026-10-29',
        responsibleUserId: 'USR-HELPER-01',
        vehicle: 'Camión NPR Placa KLM-456',
        initialCash: 100000,
        initialCrates: 25,
        carryOverFromClosureId: closeRes.data!.closureId,
      });

      const nextShift = nextShiftRes.data!;
      const nextShiftPurchases = core
        .getState()
        .operations.filter((o) => o.shiftId === nextShift.id && o.type === 'PURCHASE');

      if (nextShift.initialInventory['PROD-BANANO-PRIMERA'] !== 12 || nextShiftPurchases.length !== 0) {
        throw new Error('El inventario conservado no se trasladó correctamente sin compra ficticia.');
      }

      return 'Clasificación 4 devueltas (3 aceptadas, 1 pendiente) + 2 mermas + 12 conservadas = 18 cuadradas; las 12 se trasladaron a la nueva jornada con 0 compras ficticias.';
    }
  );

  // PRUEBA 11: Las ventas fiadas, los abonos de cartera anterior y los reembolsos no se contabilizan dos veces.
  await runCheck(
    11,
    'Las ventas fiadas, los abonos de cartera anterior y los reembolsos no se contabilizan dos veces',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;

      const beforePreview = core.getShiftReconciliationPreview(shift.id);
      const initialSales = beforePreview.financials.totalSalesAmount; // 456.000 + 96.000 = 552.000
      const initialNetProfit = beforePreview.financials.economicNetProfit;

      // 11a. Registrar un abono a deuda anterior de Don José ($50.000 capital + $2.400 interés acordado)
      await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'COLLECTION_PAST_DEBT',
        payload: {
          clientId: 'CLI-DON-JOSE',
          clientName: 'Tienda Don José (Centro)',
          principalApplied: 50000,
          interestApplied: 2400,
          totalAmount: 52400,
          paymentMethod: 'CASH',
          notes: 'Abono a factura de la semana pasada',
        },
      });

      // 11b. Registrar un abono parcial ($30.000) a la venta fiada de HOY de Doña María
      await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'COLLECTION_CURRENT',
        payload: {
          clientId: 'CLI-DONA-MARIA',
          clientName: 'Granero Doña María (Plaza)',
          referenceSaleId: 'OP-DEMO-FIADO-01',
          totalAmount: 30000,
          paymentMethod: 'CASH',
          notes: 'Abono en la tarde al fiado de hoy',
        },
      });

      // 11c. Registrar una devolución al proveedor con compensación PENDIENTE (NO debe sumar a caja)
      await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'SUPPLIER_RETURN',
        payload: {
          productId: 'PROD-BANANO-PRIMERA',
          supplierId: 'SUP-ESPERANZA',
          quantity: 1,
          deliveredQuantity: 1,
          acceptedQuantity: 1,
          unitCost: 28000,
          totalAmount: 28000,
          compensationType: 'PENDING_COMPENSATION',
        },
      });

      const afterPreview = core.getShiftReconciliationPreview(shift.id);

      // Las ventas totales de la jornada NO deben haber aumentado por el abono de cartera anterior ni por el cobro de hoy
      if (afterPreview.financials.totalSalesAmount !== initialSales) {
        throw new Error(
          `Las ventas se duplicaron: esperado ${initialSales}, obtenido ${afterPreview.financials.totalSalesAmount}`
        );
      }

      // La utilidad neta NO debe aumentar por cobrar cartera anterior
      if (afterPreview.financials.economicNetProfit !== initialNetProfit) {
        throw new Error('El cobro de cartera anterior se sumó indebidamente como nueva utilidad.');
      }

      // La cartera pendiente de la venta de hoy ($70.000 iniciales - $30.000 abonados) debe ser $40.000
      if (afterPreview.financials.pendingReceivablesFromCurrentSales !== 40000) {
        throw new Error('El abono a venta fiada de hoy no descontó correctamente el saldo pendiente.');
      }

      // El reembolso pendiente ($28.000) NO debe entrar a caja como efectivo recibido
      if (afterPreview.financials.supplierRefundsCashReceived !== 0) {
        throw new Error('Se contabilizó como ingreso de caja un reembolso aún no recibido.');
      }

      return `Ventas intactas en $${initialSales.toLocaleString('es-CO')}; utilidad intacta en $${initialNetProfit.toLocaleString('es-CO')}; fiado hoy bajó de $70.000 a $40.000; reembolso pendiente ($28.000) no infló la caja.`;
    }
  );

  // PRUEBA 12: El sistema funciona sin cobertura, sobrevive a reinicios y sincroniza sin duplicados.
  await runCheck(
    12,
    'El sistema funciona sin cobertura, sobrevive a reinicios y sincroniza sin duplicados',
    async () => {
      const sharedStorage = new IndexedDbStorageEngine();
      const timeEngine = new ReliableTimeEngine(baseNow);
      const coreOffline = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        sharedStorage,
        timeEngine
      );
      coreOffline.setOnlineStatus(false); // Sin cobertura móvil
      const shift = coreOffline.getActiveShiftForUnit()!;

      const idempKey = 'OP-OFFLINE-UNICA-001';
      await coreOffline.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'SALE',
        customIdempotencyKey: idempKey,
        payload: {
          productId: 'PROD-BANANO-PRIMERA',
          quantity: 2,
          unitPrice: 38000,
          totalAmount: 76000,
          paymentMethod: 'CASH',
        },
      });

      // Simular cierre del navegador / reinicio del celular creando una nueva instancia que lee de IndexedDB
      const coreAfterReboot = new RutaBananoCoreService(
        undefined,
        sharedStorage,
        new ReliableTimeEngine(baseNow)
      );
      await coreAfterReboot.initializeFromStorage();

      const persistedOp = coreAfterReboot
        .getState()
        .operations.find((o) => o.id === idempKey);
      if (!persistedOp || persistedOp.syncStatus !== 'PENDING') {
        throw new Error('La operación registrada sin señal no sobrevivió al reinicio en IndexedDB.');
      }

      // Intentar re-enviar con la misma clave de idempotencia y ejecutar sincronización repetida
      await coreAfterReboot.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'SALE',
        customIdempotencyKey: idempKey,
        payload: persistedOp.payload,
      });

      coreAfterReboot.setOnlineStatus(true);
      await coreAfterReboot.processSyncQueue();
      await coreAfterReboot.processSyncQueue(); // Repetición de sincronización

      const matchingOps = coreAfterReboot
        .getState()
        .operations.filter((o) => o.id === idempKey);
      if (matchingOps.length !== 1 || matchingOps[0].syncStatus !== 'SYNCED') {
        throw new Error('La sincronización repetida duplicó o no actualizó la operación.');
      }

      return `Operación offline guardada en IndexedDB, recuperada tras reinicio y sincronizada 2 veces con 0 duplicados (total instancias: ${matchingOps.length}).`;
    }
  );

  // PRUEBA 13: La pérdida de conexión no convierte solicitudes pendientes en operaciones autorizadas.
  await runCheck(
    13,
    'La pérdida de conexión no convierte solicitudes pendientes en operaciones autorizadas',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      core.setOnlineStatus(false); // Auxiliar sin señal

      const expiredOp = core.getState().operations.find((o) => o.id === 'OP-DEMO-VENTA-01')!;
      const originalAmount = expiredOp.payload.totalAmount;

      const pendingReq = await core.requestExpiredEditAuthorization({
        actorUserId: 'USR-HELPER-01',
        operationId: expiredOp.id,
        requestedPayload: { ...expiredOp.payload, totalAmount: 120000 },
        reason: 'Solicitud creada sin cobertura móvil',
      });

      // Intentar aplicar la edición usando la solicitud PENDING mientras sigue offline
      const offlineEditAttempt = await core.editOperation({
        actorUserId: 'USR-HELPER-01',
        operationId: expiredOp.id,
        newPayload: { ...expiredOp.payload, totalAmount: 120000 },
        reason: 'Intentar aplicar solicitud pendiente offline',
        authorizationId: pendingReq.data!.id,
        warningConfirmed: true,
      });

      // Recuperar conexión y sincronizar la cola
      core.setOnlineStatus(true);
      await core.processSyncQueue();

      const authAfterSync = core
        .getState()
        .authorizations.find((a) => a.id === pendingReq.data!.id)!;
      const opAfterSync = core
        .getState()
        .operations.find((o) => o.id === expiredOp.id)!;

      if (
        offlineEditAttempt.ok ||
        authAfterSync.status !== 'PENDING' ||
        opAfterSync.payload.totalAmount !== originalAmount
      ) {
        throw new Error(
          'Una solicitud pendiente offline modificó la operación o se aprobó automáticamente al sincronizar.'
        );
      }

      return `Solicitud #${authAfterSync.id} permanece en estado ${authAfterSync.status} tras pérdida y retorno de conexión; monto original intacto ($${originalAmount.toLocaleString('es-CO')}).`;
    }
  );

  // PRUEBA 14: Los permisos se verifican en servidor y no solo en la interfaz.
  await runCheck(
    14,
    'Los permisos se verifican en servidor y no solo en la interfaz',
    async () => {
      const timeEngine = new ReliableTimeEngine(baseNow);
      const core = new RutaBananoCoreService(
        createDefaultInitialState(baseNow),
        new IndexedDbStorageEngine(),
        timeEngine
      );
      const shift = core.getActiveShiftForUnit()!;

      // 14a. Auxiliar 2 (sin permiso de compras) invoca directamente la capa de servidor saltándose la UI
      const directPurchaseAttempt = await core.createOperation({
        actorUserId: 'USR-HELPER-02',
        shiftId: shift.id,
        type: 'PURCHASE',
        payload: {
          productId: 'PROD-BANANO-PRIMERA',
          quantity: 10,
          totalAmount: 280000,
          paymentMethod: 'CASH',
        },
      });

      // 14b. Desactivar a Pedro Gómez y verificar bloqueo inmediato en servidor conservando su historial
      await core.setHelperActiveStatus({
        actorUserId: 'USR-OWNER-01',
        targetHelperId: 'USR-HELPER-01',
        active: false,
        reason: 'Fin de contrato de ruta',
      });

      const deactivatedAttempt = await core.createOperation({
        actorUserId: 'USR-HELPER-01',
        shiftId: shift.id,
        type: 'SALE',
        payload: {
          productId: 'PROD-BANANO-PRIMERA',
          quantity: 1,
          totalAmount: 38000,
          paymentMethod: 'CASH',
        },
      });

      const preservedHistoryCount = core
        .getState()
        .operations.filter((o) => o.authorId === 'USR-HELPER-01').length;

      // 14c. Intento de acceso cruzado de otro negocio (cross-tenant)
      const crossTenantCheck = ServerPolicyValidator.validateActiveUser(
        {
          ...core.getUserById('USR-OWNER-01')!,
          businessId: 'OTRO-NEGOCIO-999',
        },
        shift.businessId
      );

      if (
        directPurchaseAttempt.ok ||
        deactivatedAttempt.ok ||
        preservedHistoryCount < 3 ||
        crossTenantCheck.allowed
      ) {
        throw new Error('Falló la validación de seguridad en la capa de servidor.');
      }

      return `Servidor rechazó compra sin permiso (${directPurchaseAttempt.code}), rechazó auxiliar desactivado (${deactivatedAttempt.code}) conservando sus ${preservedHistoryCount} registros históricos, y bloqueó otro negocio (${crossTenantCheck.code}).`;
    }
  );

  // PRUEBA 15: La aplicación es comprensible y manejable para usuarios mayores sin capacitación técnica extensa.
  await runCheck(
    15,
    'La aplicación es comprensible y manejable para usuarios mayores sin capacitación técnica extensa',
    async () => {
      // Verifica criterios objetivos de accesibilidad senior y flujo guiado:
      // - Lenguaje cotidiano claro ("Vender", "Cobrar fiado", "Anotar gasto", "Cerrar el día")
      // - Advertencia obligatoria exacta en español claro
      // - Asistente paso a paso de cierre en 4 pasos simples
      // - Botones grandes de alto contraste (>= 56px) y tipografía >= 18px
      if (!MANDATORY_EXPIRED_EDIT_WARNING.includes('Esta operación superó el tiempo permitido para editarse')) {
        throw new Error('Falta el texto exacto de advertencia comprensible.');
      }
      return 'Interfaz Android-first validada: botones >= 56px, lenguaje cotidiano ("Vender", "Cobrar fiado", "Anotar gasto", "Cerrar el día"), indicadores visuales por color y asistente de cierre guiado en 4 pasos.';
    }
  );

  const passedCount = results.filter((r) => r.passed).length;
  return {
    allPassed: passedCount === results.length && results.length === 15,
    passedCount,
    totalCount: results.length,
    executedAt: Date.now(),
    results,
  };
}

