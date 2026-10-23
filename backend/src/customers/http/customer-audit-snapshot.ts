import type { CustomerSnapshot } from '../../audit/domain/audit-entries.js';
import type { Customer } from '../domain/customer.js';

// Foto del cliente para la auditoría: datos primitivos, sin la entidad.
export function toCustomerSnapshot(customer: Customer): CustomerSnapshot {
  return {
    id: customer.getId() as number,
    firstName: customer.getFirstName(),
    lastName: customer.getLastName(),
    documentType: customer.getDocumentType(),
    documentNumber: customer.getDocumentNumber(),
    email: customer.getEmail(),
    phone: customer.getPhone(),
    dateOfBirth: customer.getDateOfBirth(),
  };
}
