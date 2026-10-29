// RutaBanano — Motor de Marcas Temporales Confiables y Cómputo Individual de Plazos (Sección 4)
import { ReliableTimestampMeta, RouteOperation } from '../types/domain';

export class ReliableTimeEngine {
  private bootWallClockMs: number;
  private bootMonotonicMs: number;
  private highWaterMarkMs: number;
  private simulatedOffsetMs: number = 0;
  private hasCustomEpoch: boolean = false;

  constructor(initialHighWaterMarkMs?: number) {
    this.hasCustomEpoch = initialHighWaterMarkMs !== undefined;
    const startWall = initialHighWaterMarkMs ?? Date.now();
    this.bootWallClockMs = startWall;
    this.bootMonotonicMs = typeof performance !== 'undefined' ? performance.now() : 0;
    this.highWaterMarkMs = startWall;
  }

  /**
   * Permite avanzar el reloj en pruebas o simulador sin alterar la protección monotónica.
   */
  public advanceSimulatedTimeMs(deltaMs: number): void {
    if (deltaMs > 0) {
      this.simulatedOffsetMs += deltaMs;
    }
  }

  public getSimulatedOffsetMs(): number {
    return this.simulatedOffsetMs;
  }

  /**
   * Registra una marca temporal observada (ej. de operaciones previas o del servidor)
   * para impedir que atrasar el reloj del celular conceda tiempo adicional.
   */
  public observeTimestamp(timestampMs: number): void {
    if (timestampMs > this.highWaterMarkMs) {
      this.highWaterMarkMs = timestampMs;
    }
  }

  /**
   * Obtiene el tiempo confiable actual combinando ancla monotónica, reloj del sistema
   * y marca de agua máxima observada (high-water mark).
   */
  public nowMeta(currentWallClockOverrideMs?: number): ReliableTimestampMeta {
    const baseClock = this.hasCustomEpoch ? this.bootWallClockMs : Date.now();
    const rawWallClock = (currentWallClockOverrideMs ?? baseClock) + this.simulatedOffsetMs;
    const elapsedMonotonic =
      currentWallClockOverrideMs !== undefined || this.hasCustomEpoch
        ? 0
        : (typeof performance !== 'undefined' ? performance.now() : 0) - this.bootMonotonicMs;
    const monotonicDerivedTime = Math.round(this.bootWallClockMs + elapsedMonotonic + this.simulatedOffsetMs);

    // Si el reloj del sistema fue atrasado por debajo del tiempo monotónico o del máximo histórico observado
    const referenceFloor = Math.max(monotonicDerivedTime, this.highWaterMarkMs);
    const clockTamperingDetected = rawWallClock + 5000 < referenceFloor;

    // Nunca retrocedemos el tiempo efectivo: si atrasan el reloj del celular, usamos referenceFloor
    const trustedTimestampMs = Math.max(rawWallClock, referenceFloor);
    this.observeTimestamp(trustedTimestampMs);

    return {
      localCreatedAt: rawWallClock,
      monotonicOffsetMs: Math.round(elapsedMonotonic),
      trustedTimestampMs,
      clockTamperingDetected,
    };
  }

  /**
   * Calcula la fecha límite de edición ordinaria de una operación individual.
   * Regla 4: "El plazo se calcula individualmente desde la creación de cada operación.
   * Registrar una operación nueva o modificar otra no reinicia ni extiende el plazo."
   */
  public static getOperationEditDeadlineMs(
    operation: Pick<RouteOperation, 'createdAt'>,
    editWindowMinutes: number
  ): number {
    const safeMinutes = Math.max(0, editWindowMinutes);
    return operation.createdAt + safeMinutes * 60_000;
  }

  /**
   * Determina si una operación individual sigue dentro del plazo ordinario de edición.
   * Si editWindowMinutes === 0, el plazo vence inmediatamente (requiere autorización siempre).
   */
  public isWithinEditWindow(
    operation: Pick<RouteOperation, 'createdAt'>,
    editWindowMinutes: number,
    evaluationWallClockOverrideMs?: number
  ): {
    withinWindow: boolean;
    remainingMs: number;
    remainingMinutesFormatted: string;
    deadlineMs: number;
    clockTamperingDetected: boolean;
  } {
    const meta = this.nowMeta(evaluationWallClockOverrideMs);
    const deadlineMs = ReliableTimeEngine.getOperationEditDeadlineMs(operation, editWindowMinutes);

    if (editWindowMinutes <= 0) {
      return {
        withinWindow: false,
        remainingMs: 0,
        remainingMinutesFormatted: '0 min (edición inmediata bloqueada)',
        deadlineMs,
        clockTamperingDetected: meta.clockTamperingDetected,
      };
    }

    // Si se detecta alteración hacia atrás del reloj del dispositivo, no se concede permiso extra
    const effectiveNow = meta.trustedTimestampMs;
    const remainingMs = Math.max(0, deadlineMs - effectiveNow);
    const withinWindow = effectiveNow <= deadlineMs && !meta.clockTamperingDetected;

    const totalSec = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;

    return {
      withinWindow,
      remainingMs,
      remainingMinutesFormatted: withinWindow
        ? `${mins}m ${secs}s restantes`
        : 'Plazo vencido',
      deadlineMs,
      clockTamperingDetected: meta.clockTamperingDetected,
    };
  }
}
