# RutaBanano — Reporte Oficial de Ejecución de Pruebas de Aceptación (Sección 11)

**Estado general:** ✅ **18 / 18 Pruebas Aprobadas (100%)**  
**Comando de verificación reproducible:** `npm.cmd test -- --reporter=verbose`  
**Build de producción verificado:** `npm.cmd run build` (`tsc -b && vite build` sin errores)

---

## Resultados Documentados de las 15 Pruebas Obligatorias

| # | Prueba de Aceptación Oficial | Estado | Evidencia Verificada en Ejecución | Módulo Responsable |
|---|---|---|---|---|
| **1** | El plazo de edición se calcula individualmente desde cada operación | ✅ **APROBADA** | Venta registrada a las 9:00 a. m. con plazo de 60 min vence exactamente a las 10:00 a. m.; gasto registrado a las 11:30 a. m. conserva su propio vencimiento individual (+210 min); plazo configurado en `0` minutos bloquea la edición ordinaria inmediata. | `src/domain/timeEngine.ts` (`ReliableTimeEngine.getOperationEditDeadlineMs`) |
| **2** | Modificar una operación no reinicia el plazo de otras operaciones | ✅ **APROBADA** | Al editar `OpB` dentro de su ventana, `OpA` mantuvo intacto su `createdAt` original y su límite de vencimiento individual. | `src/domain/rutaBananoCore.ts` (`editOperation`) |
| **3** | Un auxiliar no puede editar una operación vencida sin autorización | ✅ **APROBADA** | Intento de edición directa por auxiliar sobre operación vencida es rechazado con código `EDIT_WINDOW_EXPIRED_AUTH_REQUIRED` y queda registrado en auditoría como `REJECTED`. | `src/domain/securityEngine.ts` (`ServerPolicyValidator.validateEditOperation`) |
| **4** | Las autorizaciones son específicas y no reutilizables indebidamente | ✅ **APROBADA** | Bloqueado uso en otra operación (`AUTH_OPERATION_MISMATCH`), bloqueado monto distinto al aprobado (`AUTH_CHANGE_PAYLOAD_MISMATCH`), exigida confirmación expresa de advertencia obligatoria y bloqueado segundo uso (`AUTH_ALREADY_CONSUMED`). | `src/domain/securityEngine.ts` (`computeAuthorizationVerificationToken`) |
| **5** | Una operación modificada después de aprobarse requiere nueva autorización | ✅ **APROBADA** | Cuando la operación incrementa su `version` o cambia su `fingerprint` después de haberse emitido una aprobación, la autorización previa pasa automáticamente a `INVALIDATED` (`AUTH_STALE_OPERATION_CHANGED`). | `src/domain/rutaBananoCore.ts` (`editOperation`) |
| **6** | Solo los responsables autorizados pueden cerrar jornadas | ✅ **APROBADA** | Rechazado auxiliar no responsable (`NOT_ASSIGNED_RESPONSIBLE`), rechazado auxiliar responsable sin permiso de cierre (`HELPER_CLOSURE_NOT_AUTHORIZED`), y permitido únicamente cuando el dueño otorga permiso vigente o ejecuta el cierre como responsable. | `src/domain/securityEngine.ts` (`validateDefinitiveClosure`) y `firestore.rules` |
| **7** | Un cierre definitivo bloquea las modificaciones ordinarias de todos los roles | ✅ **APROBADA** | Tras ejecutar `executeDefinitiveShiftClosure`, se rechazan ediciones ordinarias del auxiliar (`SHIFT_CLOSED_IMMUTABLE`), ediciones directas del propio dueño (`SHIFT_CLOSED_IMMUTABLE`) y nuevas operaciones (`SHIFT_ALREADY_CLOSED`). | `src/domain/securityEngine.ts` y `firestore.rules` |
| **8** | El sistema conserva el cierre original y permite ajustes posteriores solo mediante un procedimiento separado y auditable | ✅ **APROBADA** | El `FrozenShiftSnapshot` conserva intacto su `snapshotHash` e importes originales; el ajuste posterior se registra en la colección separada `postClosureAdjustments` únicamente con autorización del dueño, motivo obligatorio y referencia al cierre y registro original. | `src/domain/rutaBananoCore.ts` (`createPostClosureAdjustment`) |
| **9** | Las cantidades de inventario deben cuadrar antes del cierre | ✅ **APROBADA** | Si existen unidades sobrantes sin clasificar (`unclassifiedDiscrepancyQty !== 0`), el cierre definitivo es bloqueado con código `INVENTORY_NOT_SQUARED`. | `src/domain/inventoryEngine.ts` (`InventoryReconciliationEngine.computeShiftInventory`) |
| **10** | Las devoluciones parciales, mermas e inventario conservado afectan correctamente la conciliación | ✅ **APROBADA** | De 18 cajas sobrantes: 4 devueltas al proveedor (3 aceptadas, 1 pendiente de resolución), 2 mermas con motivo obligatorio y 12 conservadas cuadran exactamente (18/18); al abrir la siguiente jornada, las 12 cajas se trasladan al inventario inicial con `0` compras ficticias. | `src/domain/inventoryEngine.ts` y `openNewShift` |
| **11** | Las ventas fiadas, los abonos de cartera anterior y los reembolsos no se contabilizan dos veces | ✅ **APROBADA** | Abono a deuda anterior ($50.000 capital + $2.400 interés) y abono a venta fiada de hoy ($30.000) no inflan las ventas del día ($552.000 intactos) ni duplican la utilidad; reembolso de proveedor pendiente ($28.000) no se suma al efectivo de caja. | `src/domain/financeEngine.ts` (`FinanceReconciliationEngine.computeShiftFinancials`) |
| **12** | El sistema funciona sin cobertura, sobrevive a reinicios y sincroniza sin duplicados | ✅ **APROBADA** | Operación creada en modo offline se persiste en `IndexedDB`, se recupera tras reinicio de instancia y al reconectar y ejecutar `processSyncQueue()` múltiples veces se sincroniza con `0` duplicados mediante `idempotencyKey`. | `src/storage/indexedDbStorage.ts` y `src/domain/rutaBananoCore.ts` |
| **13** | La pérdida de conexión no convierte solicitudes pendientes en operaciones autorizadas | ✅ **APROBADA** | Solicitud creada sin señal permanece en estado `PENDING` tanto en desconexión como tras reconectar y sincronizar; el intento de aplicarla como cambio autorizado es rechazado (`AUTH_STILL_PENDING`). | `src/domain/rutaBananoCore.ts` (`processSyncQueue` / `editOperation`) |
| **14** | Los permisos se verifican en servidor y no solo en la interfaz | ✅ **APROBADA** | Invocaciones directas al motor de servidor y reglas `firestore.rules` bloquean compras sin permiso (`PERMISSION_DENIED_PURCHASE`), bloquean auxiliares desactivados (`USER_ACCOUNT_DEACTIVATED`) conservando su historial íntegro, y bloquean accesos de otra empresa (`CROSS_TENANT_ACCESS_DENIED`). | `src/domain/securityEngine.ts` y `firestore.rules` |
| **15** | La aplicación es comprensible y manejable para usuarios mayores sin capacitación técnica extensa | ✅ **APROBADA** | Diseño Android-first con botones grandes (`>= 62px`), tipografía legible (`19px–24px`), lenguaje cotidiano ("Vender Fruta", "Cobrar Fiado", "Anotar Gasto", "Cerrar Día"), advertencia exacta obligatoria y asistente de cierre guiado en 4 pasos. | `src/App.tsx` y `src/styles.css` |

---

## Pruebas Adicionales de Seguridad y Resiliencia

| # | Prueba Adicional | Estado | Evidencia Verificada |
|---|---|---|---|
| **16** | Prevención de jornadas activas duplicadas por unidad operativa (Sección 3) | ✅ **APROBADA** | Bloqueada apertura de segunda jornada mientras exista una abierta (`DUPLICATE_ACTIVE_SHIFT_BLOCKED`). |
| **17** | Protección contra atraso del reloj del celular (Sección 4) | ✅ **APROBADA** | Si se atrasa el reloj del dispositivo por debajo del ancla monotónica o marca de agua máxima (`highWaterMarkMs`), se bloquea con `CLOCK_TAMPERING_DETECTED` sin conceder tiempo extra. |
| **18** | Conservación de conflictos de sincronización y respaldo/recuperación (Secciones 8 y 9) | ✅ **APROBADA** | Los conflictos se conservan en `syncConflicts` sin descartar cambios locales y el respaldo exportado verifica su suma de comprobación (`checksumHex`) al restaurarse. |

