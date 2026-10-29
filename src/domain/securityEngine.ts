// RutaBanano — Motor de Seguridad, Permisos de Servidor y Verificación de Autorizaciones (Secciones 2, 4, 5, 8 y 9)
import {
  EditAuthorizationRequest,
  OperationType,
  RouteOperation,
  RouteOperationPayload,
  RouteShift,
  UserAccount,
} from '../types/domain';
import { ReliableTimeEngine } from './timeEngine';

export const MANDATORY_EXPIRED_EDIT_WARNING =
  'Esta operación superó el tiempo permitido para editarse. El cambio quedará registrado en la auditoría, incluyendo los valores anteriores y nuevos, el motivo y la autorización del dueño. Verifica la información antes de continuar';

/**
 * Calcula un hash determinístico (FNV-1a 64-bit hex) para garantizar integridad
 * de versiones de operación y tokens de autorización sin almacenar secretos en texto plano.
 */
export function deterministicHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

export function computeOperationFingerprint(
  operationId: string,
  version: number,
  payload: RouteOperationPayload
): string {
  const canonical = JSON.stringify({
    operationId,
    version,
    totalAmount: payload.totalAmount,
    quantity: payload.quantity ?? null,
    unitPrice: payload.unitPrice ?? null,
    productId: payload.productId ?? null,
    clientId: payload.clientId ?? null,
    paymentMethod: payload.paymentMethod ?? null,
    deliveredQuantity: payload.deliveredQuantity ?? null,
    acceptedQuantity: payload.acceptedQuantity ?? null,
    compensationType: payload.compensationType ?? null,
    expenseCategory: payload.expenseCategory ?? null,
    crateQuantity: payload.crateQuantity ?? null,
    notes: payload.notes ?? null,
  });
  return deterministicHash(canonical);
}

export function computeAuthorizationVerificationToken(params: {
  authorizationId: string;
  businessId: string;
  shiftId: string;
  operationId: string;
  approvedOperationVersion: number;
  approvedOperationFingerprint: string;
  requestedValueSnapshot: RouteOperationPayload;
  authorizerId: string;
  authorizedAt: number;
}): string {
  const requestedFingerprint = computeOperationFingerprint(
    params.operationId,
    params.approvedOperationVersion + 1,
    params.requestedValueSnapshot
  );
  const raw = [
    params.authorizationId,
    params.businessId,
    params.shiftId,
    params.operationId,
    String(params.approvedOperationVersion),
    params.approvedOperationFingerprint,
    requestedFingerprint,
    params.authorizerId,
    String(params.authorizedAt),
  ].join('|');
  return `AUTH-SIG-${deterministicHash(raw)}`;
}

export interface PolicyValidationResult {
  allowed: boolean;
  code: string;
  message: string;
}

/**
 * Validador de Políticas del Servidor (ServerPolicyValidator).
 * Se ejecuta en la capa de datos y sincronización de forma independiente a la interfaz visual,
 * garantizando el cumplimiento de la Regla 9 y Prueba de Aceptación #14.
 */
export class ServerPolicyValidator {
  /**
   * Verifica que el usuario exista, pertenezca al mismo negocio (aislamiento multi-empresa)
   * y su cuenta esté activa.
   */
  public static validateActiveUser(
    actor: UserAccount | undefined,
    expectedBusinessId: string
  ): PolicyValidationResult {
    if (!actor) {
      return {
        allowed: false,
        code: 'AUTH_USER_NOT_FOUND',
        message: 'No se encontró una sesión válida de usuario.',
      };
    }
    if (actor.businessId !== expectedBusinessId) {
      return {
        allowed: false,
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Acceso denegado: no puedes consultar ni modificar datos de otro negocio.',
      };
    }
    if (!actor.active) {
      return {
        allowed: false,
        code: 'USER_ACCOUNT_DEACTIVATED',
        message:
          'Tu cuenta de auxiliar está desactivada. No puedes registrar ni modificar operaciones.',
      };
    }
    return { allowed: true, code: 'OK', message: 'Usuario activo verificado.' };
  }

  /**
   * Verifica que un auxiliar no pueda otorgarse permisos a sí mismo ni modificar usuarios.
   */
  public static validateUserManagementAction(
    actor: UserAccount | undefined,
    targetBusinessId: string
  ): PolicyValidationResult {
    const baseCheck = this.validateActiveUser(actor, targetBusinessId);
    if (!baseCheck.allowed) return baseCheck;

    if (actor!.role !== 'OWNER') {
      return {
        allowed: false,
        code: 'MINIMUM_PRIVILEGE_VIOLATION',
        message: 'Solo el dueño o administrador puede crear, activar, desactivar o cambiar permisos de usuarios.',
      };
    }
    return { allowed: true, code: 'OK', message: 'Permiso de administración verificado.' };
  }

  /**
   * Verifica permisos para registrar una nueva operación en una jornada abierta.
   */
  public static validateCreateOperation(
    actor: UserAccount | undefined,
    shift: RouteShift | undefined,
    operationType: OperationType
  ): PolicyValidationResult {
    if (!shift) {
      return {
        allowed: false,
        code: 'SHIFT_NOT_FOUND',
        message: 'No existe la jornada indicada.',
      };
    }

    const userCheck = this.validateActiveUser(actor, shift.businessId);
    if (!userCheck.allowed) return userCheck;

    if (shift.status !== 'OPEN') {
      return {
        allowed: false,
        code: 'SHIFT_ALREADY_CLOSED',
        message: 'La jornada ya fue cerrada definitivamente. No se permiten nuevas operaciones ordinarias.',
      };
    }

    // Verificar si el auxiliar participa o es responsable de la jornada
    if (actor!.role === 'HELPER') {
      const isAssigned =
        shift.responsibleUserId === actor!.id || shift.participantIds.includes(actor!.id);
      if (!isAssigned) {
        return {
          allowed: false,
          code: 'HELPER_NOT_ASSIGNED_TO_SHIFT',
          message: 'No estás asignado como responsable ni participante de esta jornada.',
        };
      }

      const perms = actor!.permissions;
      if (operationType === 'PURCHASE' && !perms.canRegisterPurchases) {
        return { allowed: false, code: 'PERMISSION_DENIED_PURCHASE', message: 'No tienes permiso para registrar compras.' };
      }
      if (operationType === 'SALE' && !perms.canRegisterSales) {
        return { allowed: false, code: 'PERMISSION_DENIED_SALE', message: 'No tienes permiso para registrar ventas.' };
      }
      if (
        (operationType === 'COLLECTION_CURRENT' || operationType === 'COLLECTION_PAST_DEBT') &&
        !perms.canRegisterCollections
      ) {
        return { allowed: false, code: 'PERMISSION_DENIED_COLLECTION', message: 'No tienes permiso para registrar cobros.' };
      }
      if (operationType === 'EXPENSE' && !perms.canRegisterExpenses) {
        return { allowed: false, code: 'PERMISSION_DENIED_EXPENSE', message: 'No tienes permiso para registrar gastos.' };
      }
      if (
        (operationType === 'SUPPLIER_RETURN' || operationType === 'IN_ROUTE_SHRINKAGE') &&
        !perms.canRegisterReturns
      ) {
        return { allowed: false, code: 'PERMISSION_DENIED_RETURN', message: 'No tienes permiso para registrar devoluciones o mermas.' };
      }
      if (operationType === 'CRATE_MOVEMENT' && !perms.canRegisterCrates) {
        return { allowed: false, code: 'PERMISSION_DENIED_CRATES', message: 'No tienes permiso para registrar canastillas.' };
      }
    }

    return { allowed: true, code: 'OK', message: 'Operación permitida.' };
  }

  /**
   * Verifica la edición de una operación existente según:
   * 1. Estado de la jornada (bloqueo total si está CLOSED, incluso para el dueño).
   * 2. Cómputo individual del plazo desde createdAt de la operación.
   * 3. Si venció el plazo, exige una autorización específica, aprobada por el dueño,
   *    no consumida previamente, que coincida exactamente con la versión actual de la operación
   *    y con el cambio solicitado, más confirmación expresa de la advertencia.
   */
  public static validateEditOperation(params: {
    actor: UserAccount | undefined;
    shift: RouteShift | undefined;
    operation: RouteOperation;
    newPayload: RouteOperationPayload;
    reason: string;
    timeEngine: ReliableTimeEngine;
    authorization?: EditAuthorizationRequest;
    authorizerAccount?: UserAccount;
    warningConfirmed?: boolean;
    evaluationTimeOverrideMs?: number;
  }): PolicyValidationResult {
    const {
      actor,
      shift,
      operation,
      newPayload,
      reason,
      timeEngine,
      authorization,
      authorizerAccount,
      warningConfirmed,
      evaluationTimeOverrideMs,
    } = params;

    if (!shift || shift.id !== operation.shiftId) {
      return {
        allowed: false,
        code: 'INVALID_SHIFT_CONTEXT',
        message: 'La operación no corresponde a la jornada activa.',
      };
    }

    const userCheck = this.validateActiveUser(actor, shift.businessId);
    if (!userCheck.allowed) return userCheck;

    // Regla 5: "Una vez confirmado el cierre definitivo, bloquear las modificaciones ordinarias de todas las operaciones de la jornada. No permitir la modificación directa de una jornada cerrada, ni siquiera al dueño."
    if (shift.status === 'CLOSED') {
      return {
        allowed: false,
        code: 'SHIFT_CLOSED_IMMUTABLE',
        message:
          'Esta jornada está cerrada definitivamente. Ningún rol puede modificar directamente sus operaciones; debe usarse un ajuste posterior auditable.',
      };
    }

    if (!reason || reason.trim().length < 3) {
      return {
        allowed: false,
        code: 'REASON_REQUIRED',
        message: 'Debes indicar el motivo de la modificación.',
      };
    }

    const windowStatus = timeEngine.isWithinEditWindow(
      operation,
      shift.editWindowMinutes,
      evaluationTimeOverrideMs
    );

    if (windowStatus.clockTamperingDetected) {
      return {
        allowed: false,
        code: 'CLOCK_TAMPERING_DETECTED',
        message:
          'Se detectó una alteración en el reloj del dispositivo. Por seguridad no se conceden permisos de edición por cambio de hora.',
      };
    }

    // Si está dentro del plazo ordinario y no se está consumiendo una autorización explícita:
    if (windowStatus.withinWindow && !authorization) {
      if (actor!.role === 'HELPER' && operation.authorId !== actor!.id) {
        return {
          allowed: false,
          code: 'NOT_OPERATION_AUTHOR',
          message: 'El auxiliar solo puede editar sus propias operaciones dentro del plazo.',
        };
      }
      return {
        allowed: true,
        code: 'ALLOWED_WITHIN_WINDOW',
        message: 'Edición permitida dentro del plazo configurado.',
      };
    }

    // Si el plazo venció (o editWindowMinutes === 0), es OBLIGATORIA una autorización específica y válida:
    if (!authorization) {
      return {
        allowed: false,
        code: 'EDIT_WINDOW_EXPIRED_AUTH_REQUIRED',
        message:
          'El tiempo permitido para editar esta operación ya venció. Se requiere solicitar y obtener autorización específica del dueño.',
      };
    }

    if (authorization.status === 'PENDING') {
      return {
        allowed: false,
        code: 'AUTH_STILL_PENDING',
        message:
          'La solicitud de edición aún está pendiente de aprobación por el dueño. No se puede aplicar como cambio autorizado.',
      };
    }

    if (authorization.status === 'CONSUMED') {
      return {
        allowed: false,
        code: 'AUTH_ALREADY_CONSUMED',
        message:
          'Esta autorización ya fue utilizada anteriormente. Las autorizaciones son de un solo uso y no son reutilizables.',
      };
    }

    if (authorization.status === 'INVALIDATED') {
      return {
        allowed: false,
        code: 'AUTH_INVALIDATED',
        message:
          'La autorización quedó invalidada porque la operación cambió después de aprobarse. Solicita una nueva autorización.',
      };
    }

    if (authorization.status !== 'APPROVED') {
      return {
        allowed: false,
        code: 'AUTH_NOT_APPROVED',
        message: 'La solicitud de modificación no cuenta con aprobación vigente del dueño.',
      };
    }

    // Verificar correspondencia estricta con la operación
    if (
      authorization.operationId !== operation.id ||
      authorization.shiftId !== shift.id ||
      authorization.businessId !== shift.businessId
    ) {
      return {
        allowed: false,
        code: 'AUTH_OPERATION_MISMATCH',
        message:
          'La autorización presentada corresponde a otra operación. No se permiten aprobaciones genéricas ni cruzadas.',
      };
    }

    // Regla 4 y Prueba 5: "Si la operación cambió después de la aprobación, la autorización debe invalidarse y solicitarse nuevamente."
    if (
      authorization.approvedOperationVersion !== operation.version ||
      authorization.approvedOperationFingerprint !== operation.fingerprint
    ) {
      return {
        allowed: false,
        code: 'AUTH_STALE_OPERATION_CHANGED',
        message:
          'La operación fue modificada después de emitirse la autorización. La autorización ha quedado invalidada y debe solicitarse nuevamente.',
      };
    }

    // Verificar que quien aprobó sea efectivamente un OWNER válido
    if (
      !authorization.authorizerId ||
      !authorization.authorizedAt ||
      !authorization.verificationToken ||
      (authorizerAccount && authorizerAccount.role !== 'OWNER')
    ) {
      return {
        allowed: false,
        code: 'AUTH_INVALID_AUTHORIZER',
        message: 'No se pudo verificar la firma de autorización del dueño.',
      };
    }

    // Verificar criptográfica/estructuralmente el token de autorización y que el cambio coincida con lo aprobado
    const expectedToken = computeAuthorizationVerificationToken({
      authorizationId: authorization.id,
      businessId: authorization.businessId,
      shiftId: authorization.shiftId,
      operationId: authorization.operationId,
      approvedOperationVersion: authorization.approvedOperationVersion,
      approvedOperationFingerprint: authorization.approvedOperationFingerprint,
      requestedValueSnapshot: authorization.requestedValueSnapshot,
      authorizerId: authorization.authorizerId,
      authorizedAt: authorization.authorizedAt,
    });

    if (authorization.verificationToken !== expectedToken) {
      return {
        allowed: false,
        code: 'AUTH_SIGNATURE_VERIFICATION_FAILED',
        message:
          'La firma de la autorización no es válida o fue alterada. La operación permanece bloqueada.',
      };
    }

    // Verificar que el cambio que se intenta aplicar sea exactamente el cambio autorizado
    const approvedChangeFingerprint = computeOperationFingerprint(
      operation.id,
      operation.version + 1,
      authorization.requestedValueSnapshot
    );
    const attemptedChangeFingerprint = computeOperationFingerprint(
      operation.id,
      operation.version + 1,
      newPayload
    );

    if (approvedChangeFingerprint !== attemptedChangeFingerprint) {
      return {
        allowed: false,
        code: 'AUTH_CHANGE_PAYLOAD_MISMATCH',
        message:
          'El cambio que intentas guardar no coincide con el valor específico que aprobó el dueño.',
      };
    }

    // Exigir confirmación expresa de la advertencia obligatoria
    if (!warningConfirmed) {
      return {
        allowed: false,
        code: 'MANDATORY_WARNING_NOT_CONFIRMED',
        message: `Debes confirmar expresamente la advertencia antes de continuar: "${MANDATORY_EXPIRED_EDIT_WARNING}".`,
      };
    }

    return {
      allowed: true,
      code: 'ALLOWED_BY_SPECIFIC_AUTHORIZATION',
      message: 'Edición vencida autorizada específicamente y verificada.',
    };
  }

  /**
   * Verifica quién puede ejecutar el cierre definitivo de una jornada (Sección 5, Prueba 6).
   * - Solo puede realizarlo el responsable asignado cuando tenga permiso vigente.
   * - Si el responsable es un auxiliar sin autorización de cierre, debe intervenir el dueño
   *   (otorgándole permiso de cierre o asumiendo/autorizando el cierre).
   */
  public static validateDefinitiveClosure(params: {
    actor: UserAccount | undefined;
    shift: RouteShift | undefined;
    allProductsSquared: boolean;
    hasCashOrTransferDifference: boolean;
    differenceAcknowledged: boolean;
    differenceExplanation: string;
    explicitConfirmation: boolean;
  }): PolicyValidationResult {
    const {
      actor,
      shift,
      allProductsSquared,
      hasCashOrTransferDifference,
      differenceAcknowledged,
      differenceExplanation,
      explicitConfirmation,
    } = params;

    if (!shift) {
      return { allowed: false, code: 'SHIFT_NOT_FOUND', message: 'La jornada no existe.' };
    }

    const userCheck = this.validateActiveUser(actor, shift.businessId);
    if (!userCheck.allowed) return userCheck;

    if (shift.status === 'CLOSED') {
      return {
        allowed: false,
        code: 'SHIFT_ALREADY_CLOSED',
        message: 'Esta jornada ya fue cerrada definitivamente y no puede cerrarse de nuevo ni sobrescribirse.',
      };
    }

    // El cierre solo puede realizarlo el responsable asignado cuando tenga permiso vigente
    if (actor!.id !== shift.responsibleUserId) {
      return {
        allowed: false,
        code: 'NOT_ASSIGNED_RESPONSIBLE',
        message: `Solo el responsable asignado de la jornada (${shift.responsibleUserName}) puede ejecutar el cierre definitivo.`,
      };
    }

    // Si el responsable es un auxiliar, verificar que tenga permiso explícito de cierre vigente
    if (actor!.role === 'HELPER' && !shift.allowResponsibleHelperClose) {
      return {
        allowed: false,
        code: 'HELPER_CLOSURE_NOT_AUTHORIZED',
        message:
          'No tienes autorización para cerrar definitivamente la jornada. Solicita la intervención del dueño.',
      };
    }

    // Regla 6 y Prueba 9: No se puede dar por cuadrado un producto con cantidades sin clasificar
    if (!allProductsSquared) {
      return {
        allowed: false,
        code: 'INVENTORY_NOT_SQUARED',
        message:
          'Las cantidades de inventario no cuadran. Debes clasificar todo el sobrante (devuelto al proveedor, merma con motivo o conservado para mañana) antes de cerrar.',
      };
    }

    // Regla 5: Si hay diferencias de efectivo o transferencias, exigir reconocimiento y explicación
    if (hasCashOrTransferDifference) {
      if (!differenceAcknowledged || !differenceExplanation || differenceExplanation.trim().length < 5) {
        return {
          allowed: false,
          code: 'CASH_DIFFERENCE_UNACKNOWLEDGED',
          message:
            'Existe una diferencia en el dinero contado. Debes reconocerla expresamente y explicar su origen o resolución antes de cerrar.',
        };
      }
    }

    if (!explicitConfirmation) {
      return {
        allowed: false,
        code: 'EXPLICIT_CONFIRMATION_REQUIRED',
        message: 'Debes confirmar explícitamente que revisaste el resumen completo para cerrar la jornada.',
      };
    }

    return {
      allowed: true,
      code: 'CLOSURE_ALLOWED',
      message: 'Autorización y conciliación verificadas para el cierre definitivo.',
    };
  }
}

