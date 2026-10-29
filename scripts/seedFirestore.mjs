// Script oficial de provisión de colecciones, roles y documentos iniciales en Cloud Firestore (rutasync-banano)
const PROJECT_ID = 'rutasync-banano';
const API_KEY = 'AIzaSyCdCPKIhf_LAJBeJi6UyUOVH18Skne9xsc';
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

async function upsertDoc(path, data) {
  const url = `${BASE_URL}/${path}?key=${API_KEY}`;
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (res.ok) {
      console.log(`✓ Provisionado en Firestore: ${path}`);
      return;
    }
    if (attempt === 4) {
      const errText = await res.text();
      throw new Error(`Error escribiendo ${path}: ${res.status} ${errText}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
}

async function main() {
  const businessId = 'NEGOCIO-BANANO-01';
  const now = Date.now();
  const todayIso = new Date(now).toISOString().slice(0, 10);

  // 1. Negocio principal
  await upsertDoc(`businesses/${businessId}`, {
    businessId,
    businessName: 'Distribuidora RutaBanano Don Carlos',
    defaultUnitId: 'RUTA-CAMION-01',
    editWindowMinutes: 30,
    allowedEditWindowOptions: [0, 5, 15, 30, 60, 120],
    allowResponsibleHelperCloseByDefault: false,
    requireOwnerForPastCloseAdjustments: true,
    updatedAt: now,
  });

  // 2. Colección de Roles Oficiales
  await upsertDoc(`businesses/${businessId}/roles/OWNER`, {
    id: 'OWNER',
    name: 'Administrador / Dueño',
    description:
      'Crear, activar y desactivar auxiliares; asignar responsable; configurar tiempo de edición; autorizar ediciones vencidas; configurar permisos de cierre; consultar auditoría y registrar ajustes posteriores.',
    canManageUsers: true,
    canConfigureEditWindow: true,
    canAuthorizeExpiredEdits: true,
    canConfigureClosureRoles: true,
    canRegisterPostClosureAdjustments: true,
  });

  await upsertDoc(`businesses/${businessId}/roles/HELPER`, {
    id: 'HELPER',
    name: 'Auxiliar de Ruta',
    description:
      'Registrar compras, ventas, cobros, pagos parciales, gastos, devoluciones y canastillas; editar dentro del plazo autorizado; solicitar autorización fuera del plazo; cerrar jornada solo con permiso explícito.',
    canManageUsers: false,
    canConfigureEditWindow: false,
    canAuthorizeExpiredEdits: false,
    canConfigureClosureRoles: false,
    canRegisterPostClosureAdjustments: false,
  });

  // 3. Colección de Usuarios (Dueño + Auxiliares)
  await upsertDoc(`businesses/${businessId}/users/USR-OWNER-01`, {
    id: 'USR-OWNER-01',
    businessId,
    name: 'Don Carlos (Dueño)',
    role: 'OWNER',
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
    createdAt: now,
  });

  await upsertDoc(`businesses/${businessId}/users/USR-HELPER-01`, {
    id: 'USR-HELPER-01',
    businessId,
    name: 'Pedro Gómez (Auxiliar Principal)',
    role: 'HELPER',
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
    createdAt: now,
  });

  await upsertDoc(`businesses/${businessId}/users/USR-HELPER-02`, {
    id: 'USR-HELPER-02',
    businessId,
    name: 'Luis Ramírez (Auxiliar Apoyo)',
    role: 'HELPER',
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
    createdAt: now,
  });

  // 4. Catálogo de Productos
  const products = [
    {
      id: 'PROD-BANANO-PRIMERA',
      businessId,
      name: 'Banano Primera (Caja 20 Kg)',
      unit: 'Cajas',
      defaultCostPrice: 28000,
      defaultSalePrice: 38000,
      active: true,
    },
    {
      id: 'PROD-BANANO-CRIOLLO',
      businessId,
      name: 'Banano Criollo Maduro (Canastilla)',
      unit: 'Canastillas',
      defaultCostPrice: 22000,
      defaultSalePrice: 32000,
      active: true,
    },
    {
      id: 'PROD-PLATANO-HARTON',
      businessId,
      name: 'Plátano Hartón Verde (Racimo)',
      unit: 'Racimos',
      defaultCostPrice: 35000,
      defaultSalePrice: 48000,
      active: true,
    },
  ];
  for (const p of products) {
    await upsertDoc(`businesses/${businessId}/products/${p.id}`, p);
  }

  // 5. Proveedores
  const suppliers = [
    {
      id: 'SUP-ESPERANZA',
      businessId,
      name: 'Finca La Esperanza (Don Hernando)',
      phone: '3105551020',
      creditBalanceInFavor: 0,
    },
    {
      id: 'SUP-DARIEN',
      businessId,
      name: 'Coop. Bananera El Darién',
      phone: '3114448899',
      creditBalanceInFavor: 0,
    },
  ];
  for (const s of suppliers) {
    await upsertDoc(`businesses/${businessId}/suppliers/${s.id}`, s);
  }

  // 6. Clientes
  const clients = [
    {
      id: 'CLI-DON-JOSE',
      businessId,
      name: 'Tienda Don José (Centro)',
      phone: '3128881122',
      historicalPrincipalDebt: 120000,
      agreedInterestRatePercent: 2,
      accruedAgreedInterest: 2400,
      cratesHeld: 4,
    },
    {
      id: 'CLI-DONA-MARIA',
      businessId,
      name: 'Granero Doña María (Plaza)',
      phone: '3157773344',
      historicalPrincipalDebt: 80000,
      agreedInterestRatePercent: 0,
      accruedAgreedInterest: 0,
      cratesHeld: 2,
    },
    {
      id: 'CLI-FRUVER-ESQUINA',
      businessId,
      name: 'Fruver La Esquina',
      phone: '3189995566',
      historicalPrincipalDebt: 0,
      agreedInterestRatePercent: 0,
      accruedAgreedInterest: 0,
      cratesHeld: 0,
    },
  ];
  for (const c of clients) {
    await upsertDoc(`businesses/${businessId}/clients/${c.id}`, c);
  }

  // 7. Jornada activa inicial
  await upsertDoc(`businesses/${businessId}/shifts/SHIFT-INICIAL-01`, {
    id: 'SHIFT-INICIAL-01',
    businessId,
    unitId: 'RUTA-CAMION-01',
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
  });

  // 8. Bitácora de auditoría inicial
  await upsertDoc(`businesses/${businessId}/auditLogs/AUDIT-INIT-01`, {
    id: 'AUDIT-INIT-01',
    businessId,
    shiftId: 'SHIFT-INICIAL-01',
    timestamp: now,
    actorId: 'USR-OWNER-01',
    actorName: 'Don Carlos (Dueño)',
    actorRole: 'OWNER',
    actionType: 'SHIFT_OPENED',
    reason: 'Provisión inicial de colecciones y apertura de jornada en Cloud Firestore (RutaSync)',
    result: 'SUCCESS',
  });

  console.log('\n🎉 Todas las colecciones y roles de RutaSync fueron provisionados exitosamente en Cloud Firestore.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
