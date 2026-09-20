import { Customer, DocumentType } from '../../domain/customer.js';

export class CustomerResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  active: boolean;

  private constructor(customer: Customer) {
    this.id = customer.getId() as number;
    this.firstName = customer.getFirstName();
    this.lastName = customer.getLastName();
    this.documentType = customer.getDocumentType();
    this.documentNumber = customer.getDocumentNumber();
    this.email = customer.getEmail();
    this.phone = customer.getPhone();
    this.dateOfBirth = customer.getDateOfBirth()?.toISOString().slice(0, 10) ?? null;
    this.active = customer.isActive();
  }

  static fromDomain(customer: Customer): CustomerResponseDto {
    return new CustomerResponseDto(customer);
  }
}
