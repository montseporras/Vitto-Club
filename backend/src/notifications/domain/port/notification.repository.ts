import type { DocumentType } from '../../../customers/domain/customer.js';
import type { MovementDateRange } from '../../../points/domain/movement-filters.js';
import type { NotificationRecord, NotificationStatus, NotificationType } from '../notification.js';

// Lo que se guarda al registrar una notificación. `id` solo viene en un reenvío, que reserva el número
// antes de mandar el correo (contrato S5 §3.8.5)
export type NewNotification = {
  id?: number;
  type: NotificationType;
  recipient: string;
  customerId: number;
  subject: string;
  body: string;
  status: NotificationStatus;
  error: string | null;
  dedupeKey: string;
  promotionSendId: number | null;
  resentFromId: number | null;
};

// Del cliente solo lo que hace falta para mandarle un correo
export type NotificationCustomer = { id: number; firstName: string; email: string };

// Del cliente que cumple años, lo que hace falta para regalarle y auditar (US-48)
export type BirthdayCustomer = {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
};

export type NotificationListFilters = {
  type?: NotificationType;
  status?: NotificationStatus;
  // El tipo de documento ya viene resuelto (DNI por defecto) y solo si hay número
  document?: { type: DocumentType; number: string };
  range: MovementDateRange;
  page: number;
  limit: number;
};

// Fila del historial (contrato S5 §3.8.4): la notificación, su cliente y si ya se reenvió
export type NotificationListItem = NotificationRecord & {
  customer: { id: number; firstName: string; lastName: string; documentType: DocumentType; documentNumber: string };
  resent: boolean;
};

// BASE-5 (contrato S5 §8.4) y US-14: historial de notificaciones. Solo inserción: nunca se modifica ni se
// borra una fila.
export abstract class NotificationRepository {
  abstract create(data: NewNotification): Promise<NotificationRecord>;

  abstract findById(id: number): Promise<NotificationRecord | null>;

  // ¿Ya hay una notificación de ese tipo, a ese cliente, por ese motivo? (índice único de §3.15)
  abstract existsForReason(type: NotificationType, customerId: number, dedupeKey: string): Promise<boolean>;

  // ¿Ya se reenvió esta notificación? (otra fila con resent_from_id = id)
  abstract existsResendOf(id: number): Promise<boolean>;

  // Reserva el próximo número de notificación, para poder responder el id antes de mandar el correo
  abstract reserveId(): Promise<number>;

  // null si el cliente no existe. Se lee de `customers` por Prisma, sin importar el módulo
  abstract findCustomer(customerId: number): Promise<NotificationCustomer | null>;

  // US-48: clientes ACTIVOS nacidos en alguno de esos (mes, día), del que tiene el id más bajo al más alto
  abstract findBirthdayCustomers(dates: { month: number; day: number }[]): Promise<BirthdayCustomer[]>;

  abstract list(filters: NotificationListFilters): Promise<{ items: NotificationListItem[]; total: number }>;
}
