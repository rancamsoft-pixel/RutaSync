# RutaBanano — Reglas oficiales de operación, edición, cierre y auditoría

## 1. Objetivo

Implementar una aplicación PWA instalable, diseñada prioritariamente para celulares Android, con interfaz extremadamente sencilla para personas mayores, operación offline real y control seguro de compras, ventas, cartera, pagos, gastos, devoluciones, inventario y cierre de rutas.

La aplicación debe mantener la integridad de los datos incluso cuando no exista cobertura móvil, se reinicie el dispositivo o se interrumpa una sincronización.

## 2. Roles y responsabilidades

### Administrador / dueño
- Crear, activar y desactivar auxiliares.
- Asignar el responsable de cada jornada: dueño o auxiliar.
- Configurar el tiempo permitido para editar operaciones.
- Autorizar excepcionalmente ediciones vencidas mientras la jornada permanezca abierta.
- Configurar qué roles pueden cerrar definitivamente una jornada.
- Consultar operaciones, cartera, gastos, inventario, canastillas y cierres.
- Consultar auditoría y diferencias de conciliación.
- Configurar productos, proveedores, clientes, precios, métodos de pago y demás parámetros del negocio.

### Auxiliar
- Consultar la información necesaria para la ruta asignada.
- Registrar compras, ventas, cobros, pagos parciales, gastos, devoluciones y movimientos de canastillas según sus permisos.
- Editar sus operaciones mientras estén dentro del plazo autorizado.
- Solicitar autorización para modificar operaciones vencidas.
- Cerrar una jornada únicamente cuando tenga permiso explícito del dueño.

Desactivar un auxiliar debe impedir nuevas operaciones autenticadas cuando se valide el estado de su cuenta, revocar sus accesos futuros y conservar íntegramente su historial.

## 3. Asignación de responsable y apertura de jornada

Antes de iniciar una ruta, el dueño o un usuario autorizado debe definir:
- Fecha operativa.
- Responsable de la jornada.
- Auxiliares participantes, si aplica.
- Vehículo, cuando corresponda.
- Inventario inicial disponible.
- Compras y proveedores.
- Configuración de cierre y permisos aplicables.

Debe existir una sola jornada activa por unidad operativa, según las reglas de configuración del negocio. Evitar jornadas duplicadas y movimientos asignados a una jornada incorrecta.

## 4. Política configurable de edición

El dueño configura el tiempo permitido para editar operaciones mediante una interfaz sencilla.

La configuración debe admitir un valor de cero minutos y otros valores válidos definidos por el sistema. Debe mostrarse claramente el tiempo seleccionado y su efecto.

### Cómputo del plazo

El plazo se calcula individualmente desde la creación de cada operación.

El tiempo se calculará usando marcas temporales confiables, no únicamente el reloj modificable del celular. Cuando el dispositivo esté offline, conservar la hora local del registro, los metadatos de tiempo disponibles y el momento de sincronización. No conceder permisos adicionales por una alteración del reloj del dispositivo.

### Dentro del plazo

El auxiliar podrá editar las operaciones propias permitidas por su rol, siempre que la jornada permanezca abierta.

Toda modificación relevante debe conservar el registro de auditoría.

### Después del plazo

El auxiliar no podrá modificar directamente la operación. Debe solicitar autorización al dueño indicando:
- Operación afectada.
- Valor actual.
- Cambio solicitado.
- Motivo de la modificación.

Después de la aprobación, la aplicación debe mostrar una advertencia explícita al usuario que realizará el cambio:

“Esta operación superó el tiempo permitido para editarse. El cambio quedará registrado en la auditoría, incluyendo los valores anteriores y nuevos, el motivo y la autorización del dueño. Verifica la información antes de continuar”.

Si la operación cambió después de la aprobación, la autorización debe invalidarse y solicitarse nuevamente.

## 5. Política de cierre definitivo

- El cierre solo puede realizarlo el responsable asignado cuando tenga permiso vigente.
- Si el responsable es un auxiliar sin autorización de cierre, deberá solicitar intervención del dueño.
- El sistema debe verificar las autorizaciones tanto en la interfaz como en las operaciones del servidor.
- Una vez confirmado el cierre definitivo, bloquear las modificaciones ordinarias de todas las operaciones de la jornada.
- Ningún rol podrá reabrir o alterar directamente una jornada cerrada mediante la interfaz normal.
- Los cierres no deben borrarse ni sobrescribirse.
- Correcciones posteriores: procedimiento separado de ajuste, con autorización, motivo obligatorio, referencia al registro original y auditoría, sin modificar ni eliminar el cierre histórico.

## 6. Reglas del cierre de inventario

Inventario inicial + compras y entradas − ventas − devoluciones al proveedor − mermas autorizadas = inventario final disponible.

Para cada producto sobrante, clasificar en:
- Devuelta al proveedor (cantidad entregada vs. cantidad aceptada).
- Dada de baja como merma, con motivo.
- Conservada para una próxima jornada (se traslada sin registrar compra ficticia).

## 7. Cartera, caja y utilidad

Diferenciar estrictamente ventas de la jornada, recaudo de ventas de la jornada, abonos a deudas anteriores, cartera pendiente, intereses aplicables, compras y costos de lo vendido, gastos, reembolsos de proveedores, saldos a favor y utilidad económica vs. efectivo disponible.

## 8. Operación offline y sincronización

Persistencia local en IndexedDB, cola persistente idempotente con reintentos, conservación ante conflictos y verificación estricta de autorizaciones offline/online.

## 9. Seguridad y auditoría

Mínimo privilegio, validación en servidor (`firestore.rules` y motor de validación), auditoría inmutable de valores anteriores y nuevos, autor, autorizador, motivo, fecha y operación.

## 10. Usabilidad para personas mayores

Diseño prioritario para Android con botones grandes, textos legibles, lenguaje cotidiano y asistente paso a paso para el cierre.

## 11. Pruebas de aceptación obligatorias

Suite de 15 pruebas obligatorias verificadas automatizadamente y documentadas.

