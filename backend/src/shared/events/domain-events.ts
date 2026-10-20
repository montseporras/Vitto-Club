// Contrato de los eventos de dominio que cruzan módulos. Es el único lugar donde se definen
// sus nombres y sus datos: quien publica y quien escucha importan de acá, nunca del domain/
// del otro módulo. Solo datos primitivos, sin entidades ni lógica de negocio.
//
// Reglas de uso (ver docs/ARCHITECTURE.md):
// 1. Se publica con `await eventEmitter.emitAsync(NOMBRE, datos)`, dentro de la transacción
//    abierta por el caso de uso y después de escribir lo propio.
// 2. Se escucha con `@OnEvent(NOMBRE, { suppressErrors: false })`: si el listener tira, el
//    error llega a quien publicó y se deshace toda la transacción.
// 3. Los repositorios que participan usan `client` de PrismaTransactionRunner.

// Lo emite employees cuando da de baja un empleado.
export const EMPLOYEE_DEACTIVATED = 'employee.deactivated';
export type EmployeeDeactivatedEvent = { employeeId: number };

// Lo emite employees cuando el rol de un empleado cambia (solo si realmente cambió).
export const EMPLOYEE_ROLE_CHANGED = 'employee.role-changed';
export type EmployeeRoleChangedEvent = {
  employeeId: number;
  previousRole: 'ADMIN' | 'CASHIER';
  newRole: 'ADMIN' | 'CASHIER';
};

// Lo emite accounts cuando da de baja una cuenta. Lo escucha auth para revocar sus sesiones.
export const ACCOUNT_DEACTIVATED = 'account.deactivated';
export type AccountDeactivatedEvent = { accountId: number };

// Lo emite customers cuando da de baja un cliente (CLI-ADM, contrato §3.8.3). Lo escucha accounts
// para dejar su cuenta inactiva; accounts publica account.deactivated y auth cierra las sesiones.
export const CUSTOMER_DEACTIVATED = 'customer.deactivated';
export type CustomerDeactivatedEvent = { customerId: number };

// Lo emite customers cuando reactiva un cliente. Lo escucha accounts para reactivar su cuenta.
// Sin uso desde CLI-ADM: la reactivación de clientes ya no existe (contrato §1, "se eliminan").
export const CUSTOMER_REACTIVATED = 'customer.reactivated';
export type CustomerReactivatedEvent = { customerId: number };

// Lo emite customers cuando el Cajero o el Administrador dan de alta un cliente (no en el
// autorregistro, donde el cliente elige su contraseña). Lo escucha accounts para crear la
// cuenta de acceso, con el documento como contraseña inicial y mustChangePassword = true.
// documentNumber ya viene normalizado (pasaporte en mayúsculas); es la contraseña inicial y
// no se guarda en ningún otro lado. Si el listener tira, se deshace también el cliente.
export const CUSTOMER_CREATED = 'customer.created';
export type CustomerCreatedEvent = { customerId: number; email: string; documentNumber: string };

// Lo emite customers cuando cambia el email de un cliente (solo si realmente cambió).
// Lo escucha accounts para actualizar el email de acceso; si ese email ya tiene cuenta,
// tira ConflictException y se deshace el cambio.
export const CUSTOMER_EMAIL_CHANGED = 'customer.email-changed';
export type CustomerEmailChangedEvent = { customerId: number; email: string };

// Lo emite customers cuando el Administrador corrige el número de documento de un cliente
// (CLI-ADM, CA-CLI.7; evento nuevo, decisión a pedido de Magali). Lo escucha accounts: si la cuenta
// todavía tiene la contraseña inicial (mustChangePassword = true), la contraseña pasa a ser el
// documento nuevo. documentNumber ya viene normalizado y no se guarda: solo su hash.
export const CUSTOMER_DOCUMENT_CHANGED = 'customer.document-changed';
export type CustomerDocumentChangedEvent = { customerId: number; documentNumber: string };
