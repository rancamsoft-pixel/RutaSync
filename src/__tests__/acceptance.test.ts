import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { runAll15MandatoryAcceptanceTests } from '../domain/acceptanceVerifier';
import { createDefaultInitialState, RutaBananoCoreService } from '../domain/rutaBananoCore';
import { IndexedDbStorageEngine } from '../storage/indexedDbStorage';
import { ReliableTimeEngine } from '../domain/timeEngine';

describe('RutaBanano — 15 Pruebas de Aceptación Obligatorias (Sección 11)', () => {
  for (let i = 1; i <= 15; i++) {
    it(`Prueba Obligatoria #${i}: verificación oficial automatizada`, async () => {
      const summary = await runAll15MandatoryAcceptanceTests();
      const result = summary.results.find((r) => r.testNumber === i);
      expect(result).toBeDefined();
      expect(
        result!.passed,
        `Prueba #${i} (${result?.title}) falló: ${result?.evidenceSummary}`
      ).toBe(true);
    });
  }

  it('Prueba Adicional #16: Impide abrir una segunda jornada duplicada en la misma unidad operativa (Sección 3)', async () => {
    const core = new RutaBananoCoreService(createDefaultInitialState());
    const dupAttempt = await core.openNewShift({
      actorUserId: 'USR-OWNER-01',
      operatingDate: '2026-10-28',
      responsibleUserId: 'USR-HELPER-01',
      vehicle: 'Camión NPR',
      initialCash: 50000,
      initialCrates: 10,
    });

    expect(dupAttempt.ok).toBe(false);
    expect(dupAttempt.code).toBe('DUPLICATE_ACTIVE_SHIFT_BLOCKED');
  });

  it('Prueba Adicional #17: Detecta y bloquea alteraciones del reloj del celular hacia atrás sin conceder tiempo adicional (Sección 4)', async () => {
    const baseNow = 1_730_000_000_000;
    const timeEngine = new ReliableTimeEngine(baseNow);
    const core = new RutaBananoCoreService(
      createDefaultInitialState(baseNow),
      new IndexedDbStorageEngine(),
      timeEngine
    );
    const op = core.getState().operations.find((o) => o.id === 'OP-DEMO-FIADO-01')!;

    // Simular que el usuario atrasó el reloj del celular 2 horas hacia atrás
    const rolledBackClock = baseNow - 120 * 60_000;
    const attempt = await core.editOperation({
      actorUserId: 'USR-HELPER-01',
      operationId: op.id,
      newPayload: { ...op.payload, totalAmount: 50000 },
      reason: 'Intento atrasando el reloj del celular',
      evaluationTimeOverrideMs: rolledBackClock,
    });

    expect(attempt.ok).toBe(false);
    expect(attempt.code).toBe('CLOCK_TAMPERING_DETECTED');
  });

  it('Prueba Adicional #18: Conserva conflictos de sincronización y permite copia de seguridad y recuperación verificada (Secciones 8 y 9)', async () => {
    const storage = new IndexedDbStorageEngine();
    const core = new RutaBananoCoreService(createDefaultInitialState(), storage);

    const conflict = await core.registerSyncConflict({
      entityType: 'OPERATION',
      entityId: 'OP-DEMO-VENTA-01',
      localPayload: { totalAmount: 456000 },
      remotePayload: { totalAmount: 450000 },
    });

    expect(core.getState().syncConflicts.length).toBe(1);
    expect(conflict.resolved).toBe(false);

    const resolveRes = await core.resolveSyncConflict({
      actorUserId: 'USR-OWNER-01',
      conflictId: conflict.id,
      strategy: 'KEEP_LOCAL_AS_ADJUSTMENT',
    });
    expect(resolveRes.ok).toBe(true);

    // Probar exportación y restauración de respaldo
    const backupJson = storage.exportEncryptedBackupBundle(core.getState());
    const restoredState = await storage.restoreFromBackupBundle(backupJson);
    expect(restoredState.config.businessId).toBe('NEGOCIO-BANANO-01');
    expect(restoredState.syncConflicts[0].resolved).toBe(true);
  });

  it('Prueba Adicional #19: Autenticación profesional de usuario con PIN y actualización de PIN seguro', async () => {
    const storage = new IndexedDbStorageEngine();
    const core = new RutaBananoCoreService(createDefaultInitialState(), storage);

    // 1. Dueño ingresa con PIN válido
    const authOwner = core.authenticateUserWithPin({
      userId: 'USR-OWNER-01',
      pin: '1234',
    });
    expect(authOwner.ok).toBe(true);
    expect(authOwner.user?.role).toBe('OWNER');

    // 2. Auxiliar ingresa con PIN incorrecto
    const authHelperBad = core.authenticateUserWithPin({
      userId: 'USR-HELPER-01',
      pin: '0000',
    });
    expect(authHelperBad.ok).toBe(false);

    // 3. Auxiliar ingresa con PIN correcto
    const authHelperOk = core.authenticateUserWithPin({
      userId: 'USR-HELPER-01',
      pin: '5678',
    });
    expect(authHelperOk.ok).toBe(true);
    expect(authHelperOk.user?.name).toContain('Pedro');

    // 4. Cambio de PIN del auxiliar y verificación con el nuevo PIN
    const updatePinRes = await core.updateUserPin({
      actorUserId: 'USR-HELPER-01',
      targetUserId: 'USR-HELPER-01',
      newPin: '9988',
    });
    expect(updatePinRes.ok).toBe(true);

    const authHelperNewPin = core.authenticateUserWithPin({
      userId: 'USR-HELPER-01',
      pin: '9988',
    });
    expect(authHelperNewPin.ok).toBe(true);
  });
});
