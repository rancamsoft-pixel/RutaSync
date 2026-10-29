// Script de aprovisionamiento completo de colecciones y roles para RutaSync (rutasync-banano)
// Crea todas las colecciones tanto en la raíz de Cloud Firestore (/users, /roles, /products,
// /suppliers, /clients, /shifts, /operations, /editAuthorizations, /closures,
// /postClosureAdjustments, /auditLogs, /businesses) como dentro de /businesses/NEGOCIO-BANANO-01/...

const PROJECT_ID = 'rutasync-banano';
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCdCPKIhf_LAJBeJi6UyUOVH18Skne9xsc';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((v) => toFirestoreValue(v)) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDocument(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

function deterministicHash(input) {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `HASH-${combined.toString(16).toUpperCase()}`;
}

async function upsertDoc(docPath, data) {
  const url = `${BASE_URL}/${docPath}?key=${API_KEY}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFirestoreDocument(data)),
    });
    if (res.ok) {
      console.log(`[OK] ${docPath}`);
      return;
    }
    if (res.status === 403) {
      // Verificar si el documento ya existe en una colección inmutable (auditLogs, closures, postClosureAdjustments)
      const checkRes = await fetch(url);
      if (checkRes.ok) {
        console.log(`[OK - Inmutable ya existente] ${docPath}`);
        return;
      }
    }
    const txt = await res.text();
    if (attempt === 4) {
      throw new Error(`Error creando ${docPath}: ${res.status} ${txt}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
}

async function upsertBoth(bId, collectionName, docId, data) {
  await upsertDoc(`${collectionName}/${docId}`, data);
  await upsertDoc(`businesses/${bId}/${collectionName}/${docId}`, data);
}

async function main() {
  const bId = 'NEGOCIO-BANANO-01';
  const unitId = 'RUTA-CAMION-01';
  const now = Date.now();
  const todayIso = new Date(now).toISOString().slice(0, 10);
  const yesterdayIso = new Date(now - 86_400_000).toISOString().slice(0, 10);

  console.log('Iniciando aprovisionamiento de las 12 colecciones en Cloud Firestore (RutaSync)...');

  // 1. Colección: businesses
  await upsertDoc(`businesses/${bId}`, {
    businessId: bId,
    businessName: 'Distribuidora RutaSync Banano Don Carlos',
    defaultUnitId: unitId,
    editWindowMinutes: 30,
    allowedEditWindowOptions: [0, 5, 15, 30, 60, 120],
    allowResponsibleHelperCloseByDefault: false,
    requireOwnerForPastCloseAdjustments: true,
    updatedAt: now,
  });

  // 2. Colección: roles
  const roles = [
    {
      id: 'OWNER',
      businessId: bId,
      name: 'Administrador / Dueño',
      description:
        'Crear/activar/desactivar auxiliares, configurar plazos, aprobar ediciones vencidas, ejecutar cierres definitivos y ajustes post-cierre.',
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
        'Registrar compras, ventas, cobros, gastos, devoluciones y canastillas; editar dentro del plazo; solicitar autorización fuera del plazo.',
      canManageUsers: false,
      canConfigurePolicies: false,
      canApproveExpiredEdits: false,
      canCreatePostClosureAdjustments: false,
    },
  ];
  for (const r of roles) {
    await upsertBoth(bId, 'roles', r.id, r);
  }

  // 3. Colección: users
  const users = [
    {
      id: 'USR-OWNER-01',
      businessId: bId,
      name: 'Don Carlos (Dueño)',
      role: 'OWNER',
      pinOrCredentialHash: deterministicHash('OWNER_PIN_1234'),
      active: true,
      permissions: {
        canRegisterPurchases: true,
        canRegisterSales: true,
        canRegisterCollections: true,
        canRegisterExpenses: true,
        canRegisterReturns: true,
        canRegisterCrates: true,
        canCloseShiftByDefault: true,
      },
      createdAt: now - 86400000 * 30,
    },
    {
      id: 'USR-HELPER-01',
      businessId: bId,
      name: 'Pedro Gómez (Auxiliar Principal)',
      role: 'HELPER',
      pinOrCredentialHash: deterministicHash('HELPER_PIN_5678'),
      active: true,
      permissions: {
        canRegisterPurchases: true,
        canRegisterSales: true,
        canRegisterCollections: true,
        canRegisterExpenses: true,
        canRegisterReturns: true,
        canRegisterCrates: true,
        canCloseShiftByDefault: false,
      },
      createdAt: now - 86400000 * 15,
    },
    {
      id: 'USR-HELPER-02',
      businessId: bId,
      name: 'Luis Ramírez (Auxiliar Apoyo)',
      role: 'HELPER',
      pinOrCredentialHash: deterministicHash('HELPER_PIN_9012'),
      active: true,
      permissions: {
        canRegisterPurchases: false,
        canRegisterSales: true,
        canRegisterCollections: true,
        canRegisterExpenses: true,
        canRegisterReturns: true,
        canRegisterCrates: true,
        canCloseShiftByDefault: false,
      },
      createdAt: now - 86400000 * 10,
    },
  ];
  for (const u of users) {
    await upsertBoth(bId, 'users', u.id, u);
  }

  // 4. Colección: products
  const products = [
    {
      id: 'PROD-BANANO-PRIMERA',
      businessId: bId,
      name: 'Banano Primera (Caja 20 Kg)',
      unit: 'Cajas',
      defaultCostPrice: 28000,
      defaultSalePrice: 38000,
      active: true,
    },
    {
      id: 'PROD-BANANO-CRIOLLO',
      businessId: bId,
      name: 'Banano Criollo Maduro (Canastilla)',
      unit: 'Canastillas',
      defaultCostPrice: 22000,
      defaultSalePrice: 32000,
      active: true,
    },
    {
      id: 'PROD-PLATANO-HARTON',
      businessId: bId,
      name: 'Plátano Hartón Verde (Racimo)',
      unit: 'Racimos',
      defaultCostPrice: 35000,
      defaultSalePrice: 48000,
      active: true,
    },
  ];
  for (const p of products) {
    await upsertBoth(bId, 'products', p.id, p);
  }

  // 5. Colección: suppliers
  const suppliers = [
    {
      id: 'SUP-ESPERANZA',
      businessId: bId,
      name: 'Finca La Esperanza (Don Hernando)',
      phone: '3105551020',
      creditBalanceInFavor: 0,
    },
    {
      id: 'SUP-DARIEN',
      businessId: bId,
      name: 'Coop. Bananera El Darién',
      phone: '3114448899',
      creditBalanceInFavor: 0,
    },
  ];
  for (const s of suppliers) {
    await upsertBoth(bId, 'suppliers', s.id, s);
  }

  // 6. Colección: clients
  const clients = [
    {
      id: 'CLI-DON-JOSE',
      businessId: bId,
      name: 'Tienda Don José (Centro)',
      phone: '3128881122',
      historicalPrincipalDebt: 120000,
      agreedInterestRatePercent: 2,
      accruedAgreedInterest: 2400,
      cratesHeld: 4,
    },
    {
      id: 'CLI-DONA-MARIA',
      businessId: bId,
      name: 'Granero Doña María (Plaza)',
      phone: '3157773344',
      historicalPrincipalDebt: 80000,
      agreedInterestRatePercent: 0,
      accruedAgreedInterest: 0,
      cratesHeld: 2,
    },
    {
      id: 'CLI-FRUVER-ESQUINA',
      businessId: bId,
      name: 'Fruver La Esquina',
      phone: '3189995566',
      historicalPrincipalDebt: 0,
      agreedInterestRatePercent: 0,
      accruedAgreedInterest: 0,
      cratesHeld: 0,
    },
  ];
  for (const c of clients) {
    await upsertBoth(bId, 'clients', c.id, c);
  }

  // 7. Colección: shifts (Jornada activa de hoy + Jornada histórica cerrada de ayer)
  const shifts = [
    {
      id: 'SHIFT-INICIAL-01',
      businessId: bId,
      unitId,
      operatingDate: todayIso,
      status: 'OPEN',
      responsibleUserId: 'USR-HELPER-01',
      responsibleUserName: 'Pedro Gómez (Auxiliar Principal)',
      responsibleUserRole: 'HELPER',
      participantIds: ['USR-HELPER-02'],
      participantNames: ['Luis Ramírez (Auxiliar Apoyo)'],
      vehicle: 'Camión NPR Placa KLM-456',
      initialCash: 150000,
      initialCrates: 30,
      initialInventory: {
        'PROD-BANANO-PRIMERA': 10,
        'PROD-BANANO-CRIOLLO': 5,
        'PROD-PLATANO-HARTON': 0,
      },
      editWindowMinutes: 30,
      allowResponsibleHelperClose: false,
      createdAt: now - 15 * 60000,
      createdByUserId: 'USR-OWNER-01',
    },
    {
      id: 'SHIFT-HIST-CERRADA-00',
      businessId: bId,
      unitId,
      operatingDate: yesterdayIso,
      status: 'CLOSED',
      responsibleUserId: 'USR-OWNER-01',
      responsibleUserName: 'Don Carlos (Dueño)',
      responsibleUserRole: 'OWNER',
      participantIds: ['USR-HELPER-01'],
      participantNames: ['Pedro Gómez (Auxiliar Principal)'],
      vehicle: 'Camión NPR Placa KLM-456',
      initialCash: 100000,
      initialCrates: 25,
      initialInventory: {
        'PROD-BANANO-PRIMERA': 15,
        'PROD-BANANO-CRIOLLO': 5,
        'PROD-PLATANO-HARTON': 0,
      },
      editWindowMinutes: 30,
      allowResponsibleHelperClose: true,
      createdAt: now - 86400000 - 3600000 * 8,
      createdByUserId: 'USR-OWNER-01',
      closedAt: now - 86400000,
      closedByUserId: 'USR-OWNER-01',
      closureSnapshotId: 'CLOSURE-HIST-00',
    },
  ];
  for (const sh of shifts) {
    await upsertBoth(bId, 'shifts', sh.id, sh);
  }

  // 8. Colección: operations (Compras, Ventas de contado y Ventas fiadas)
  const operations = [
    {
      id: 'OP-DEMO-COMPRA-01',
      businessId: bId,
      unitId,
      shiftId: 'SHIFT-INICIAL-01',
      type: 'PURCHASE',
      authorId: 'USR-HELPER-01',
      authorName: 'Pedro Gómez (Auxiliar Principal)',
      authorRole: 'HELPER',
      createdAt: now - 10 * 60000,
      updatedAt: now - 10 * 60000,
      timeMeta: {
        localCreatedAt: now - 10 * 60000,
        monotonicOffsetMs: 0,
        trustedTimestampMs: now - 10 * 60000,
        clockTamperingDetected: false,
      },
      version: 1,
      fingerprint: 'FP-OP-DEMO-COMPRA-01-V1',
      payload: {
        productId: 'PROD-BANANO-PRIMERA',
        productName: 'Banano Primera (Caja 20 Kg)',
        supplierId: 'SUP-ESPERANZA',
        supplierName: 'Finca La Esperanza (Don Hernando)',
        quantity: 20,
        unitCost: 28000,
        totalAmount: 560000,
        paymentMethod: 'CASH',
        notes: 'Compra de la mañana en finca',
      },
      syncStatus: 'SYNCED',
    },
    {
      id: 'OP-DEMO-VENTA-01',
      businessId: bId,
      unitId,
      shiftId: 'SHIFT-INICIAL-01',
      type: 'SALE',
      authorId: 'USR-HELPER-01',
      authorName: 'Pedro Gómez (Auxiliar Principal)',
      authorRole: 'HELPER',
      createdAt: now - 45 * 60000,
      updatedAt: now - 45 * 60000,
      timeMeta: {
        localCreatedAt: now - 45 * 60000,
        monotonicOffsetMs: 0,
        trustedTimestampMs: now - 45 * 60000,
        clockTamperingDetected: false,
      },
      version: 1,
      fingerprint: 'FP-OP-DEMO-VENTA-01-V1',
      payload: {
        productId: 'PROD-BANANO-PRIMERA',
        productName: 'Banano Primera (Caja 20 Kg)',
        clientId: 'CLI-DON-JOSE',
        clientName: 'Tienda Don José (Centro)',
        quantity: 12,
        unitPrice: 38000,
        totalAmount: 456000,
        paymentMethod: 'CASH',
        notes: 'Entrega temprano en plaza (plazo ordinario vencido para probar autorización)',
      },
      syncStatus: 'SYNCED',
    },
    {
      id: 'OP-DEMO-FIADO-01',
      businessId: bId,
      unitId,
      shiftId: 'SHIFT-INICIAL-01',
      type: 'SALE',
      authorId: 'USR-HELPER-01',
      authorName: 'Pedro Gómez (Auxiliar Principal)',
      authorRole: 'HELPER',
      createdAt: now - 5 * 60000,
      updatedAt: now - 5 * 60000,
      timeMeta: {
        localCreatedAt: now - 5 * 60000,
        monotonicOffsetMs: 0,
        trustedTimestampMs: now - 5 * 60000,
        clockTamperingDetected: false,
      },
      version: 1,
      fingerprint: 'FP-OP-DEMO-FIADO-01-V1',
      payload: {
        productId: 'PROD-BANANO-CRIOLLO',
        productName: 'Banano Criollo Maduro (Canastilla)',
        clientId: 'CLI-DONA-MARIA',
        clientName: 'Granero Doña María (Plaza)',
        quantity: 3,
        unitPrice: 32000,
        totalAmount: 96000,
        paymentMethod: 'CREDIT',
        amountPaidImmediate: 26000,
        notes: 'Pagó $26.000 en efectivo y dejó $70.000 fiados',
      },
      syncStatus: 'SYNCED',
    },
  ];
  for (const op of operations) {
    await upsertBoth(bId, 'operations', op.id, op);
  }

  // 9. Colección: editAuthorizations (Solicitudes de edición fuera de plazo)
  const authorizations = [
    {
      id: 'AUTH-HIST-01',
      businessId: bId,
      shiftId: 'SHIFT-HIST-CERRADA-00',
      operationId: 'OP-DEMO-VENTA-01',
      operationVersionAtRequest: 1,
      operationFingerprintAtRequest: 'FP-OP-DEMO-VENTA-01-V1',
      requestedBy: 'USR-HELPER-01',
      requestedByName: 'Pedro Gómez (Auxiliar Principal)',
      requestedAt: now - 86400000 - 1800000,
      reason: 'Corrección de cantidad pesada en báscula de plaza',
      currentValueSummary: '12 Cajas × $38.000 = $456.000',
      requestedPayload: {
        productId: 'PROD-BANANO-PRIMERA',
        productName: 'Banano Primera (Caja 20 Kg)',
        clientId: 'CLI-DON-JOSE',
        clientName: 'Tienda Don José (Centro)',
        quantity: 12,
        unitPrice: 38000,
        totalAmount: 456000,
        paymentMethod: 'CASH',
        notes: 'Entrega verificada en báscula',
      },
      requestedChangeSummary: 'Confirmación de peso en báscula ($456.000)',
      status: 'CONSUMED',
      authorizedBy: 'USR-OWNER-01',
      authorizedByName: 'Don Carlos (Dueño)',
      decidedAt: now - 86400000 - 1200000,
      consumedAt: now - 86400000 - 900000,
      verificationToken: 'TOKEN-AUTH-HIST-01',
      syncStatus: 'SYNCED',
    },
  ];
  for (const auth of authorizations) {
    await upsertBoth(bId, 'editAuthorizations', auth.id, auth);
  }

  // 10. Colección: closures (Cierres definitivos congelados)
  const closures = [
    {
      closureId: 'CLOSURE-HIST-00',
      shiftId: 'SHIFT-HIST-CERRADA-00',
      businessId: bId,
      unitId,
      operatingDate: yesterdayIso,
      closedAt: now - 86400000,
      closedByUserId: 'USR-OWNER-01',
      closedByUserName: 'Don Carlos (Dueño)',
      closedByUserRole: 'OWNER',
      responsibleUserId: 'USR-OWNER-01',
      responsibleUserName: 'Don Carlos (Dueño)',
      participantNames: ['Pedro Gómez (Auxiliar Principal)'],
      vehicle: 'Camión NPR Placa KLM-456',
      financialSummary: {
        initialCash: 100000,
        totalShiftSales: 570000,
        cashReceivedFromCurrentSales: 500000,
        transferReceivedFromCurrentSales: 70000,
        pendingReceivablesFromCurrentSales: 0,
        pastDebtPrincipalCollectedCash: 40000,
        pastDebtPrincipalCollectedTransfer: 0,
        pastDebtAgreedInterestCollectedCash: 0,
        pastDebtAgreedInterestCollectedTransfer: 0,
        totalPastDebtCollected: 40000,
        totalPurchasesCash: 420000,
        totalPurchasesTransfer: 0,
        totalPurchasesCost: 420000,
        supplierCashRefundsReceived: 0,
        supplierCreditBalanceInFavor: 0,
        supplierPendingCompensationValue: 0,
        expensesByCategory: {
          FUEL: 35000,
          TOLLS: 0,
          FOOD: 15000,
          HELPER_PAY: 40000,
          OTHER: 0,
        },
        totalCashExpenses: 90000,
        totalTransferExpenses: 0,
        totalOperatingExpenses: 90000,
        shrinkageEconomicLossCost: 0,
        economicGrossMargin: 150000,
        economicNetProfit: 60000,
        expectedCashInBox: 130000,
        countedCashInBox: 130000,
        cashDifference: 0,
        expectedTransfersInBank: 70000,
        countedTransfersInBank: 70000,
        transferDifference: 0,
      },
      inventoryReconciliation: {
        allBalanced: true,
        allLeftoverClassified: true,
        totalEconomicShrinkageCost: 0,
        items: [],
      },
      crateSummary: {
        initialCrates: 25,
        deliveredToClients: 4,
        returnedByClients: 4,
        receivedFromSuppliers: 0,
        returnedToSuppliers: 0,
        lostOrDamaged: 0,
        expectedFinalCratesInTruck: 25,
      },
      frozenOperationsCount: 5,
      immutableSignatureHash: deterministicHash('CLOSURE-HIST-00-IMMUTABLE'),
    },
  ];
  for (const cl of closures) {
    await upsertBoth(bId, 'closures', cl.closureId, cl);
  }

  // 11. Colección: postClosureAdjustments (Ajustes posteriores a jornadas cerradas)
  const postClosureAdjustments = [
    {
      id: 'ADJ-HIST-00',
      businessId: bId,
      closedShiftId: 'SHIFT-HIST-CERRADA-00',
      closureId: 'CLOSURE-HIST-00',
      createdAt: now - 43200000,
      authorId: 'USR-OWNER-01',
      authorName: 'Don Carlos (Dueño)',
      authorizerId: 'USR-OWNER-01',
      authorizerName: 'Don Carlos (Dueño)',
      reason: 'Reintegro de peaje reportado con recibo físico posterior al cierre de ayer',
      adjustmentCategory: 'EXPENSE_CORRECTION',
      amountDelta: -12000,
      description: 'Soporte de peaje #8841 anexado a contabilidad sin alterar el cierre original CLOSURE-HIST-00',
      previousSnapshotSummary: 'Efectivo final congelado: $130.000',
      newAdjustedSummary: 'Ajuste contable post-cierre: -$12.000 (Cierre original intacto)',
      syncStatus: 'SYNCED',
    },
  ];
  for (const adj of postClosureAdjustments) {
    await upsertBoth(bId, 'postClosureAdjustments', adj.id, adj);
  }

  // 12. Colección: auditLogs (Bitácora inmutable de auditoría)
  const auditLogs = [
    {
      id: 'AUDIT-INIT-01',
      businessId: bId,
      shiftId: 'SHIFT-INICIAL-01',
      timestamp: now - 15 * 60000,
      actorId: 'USR-OWNER-01',
      actorName: 'Don Carlos (Dueño)',
      actorRole: 'OWNER',
      actionType: 'SHIFT_OPENED',
      reason: 'Apertura oficial de jornada en Cloud Firestore (RutaSync)',
      previousValue: null,
      newValue: { shiftId: 'SHIFT-INICIAL-01', status: 'OPEN' },
      result: 'SUCCESS',
    },
    {
      id: 'AUDIT-VENTA-01',
      businessId: bId,
      shiftId: 'SHIFT-INICIAL-01',
      operationId: 'OP-DEMO-VENTA-01',
      timestamp: now - 45 * 60000,
      actorId: 'USR-HELPER-01',
      actorName: 'Pedro Gómez (Auxiliar Principal)',
      actorRole: 'HELPER',
      actionType: 'OPERATION_CREATED',
      reason: 'Registro inicial de venta en ruta sincronizado con Firebase',
      previousValue: null,
      newValue: { operationId: 'OP-DEMO-VENTA-01', totalAmount: 456000 },
      result: 'SUCCESS',
    },
  ];
  for (const log of auditLogs) {
    await upsertBoth(bId, 'auditLogs', log.id, log);
  }

  console.log('\n¡Las 12 colecciones de RutaSync fueron creadas y pobladas exitosamente en Cloud Firestore!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
