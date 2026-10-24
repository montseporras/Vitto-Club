import { Customer, DocumentType } from '../../domain/customer.js';

// Respuesta de GET y PATCH /customers/me (contrato §3.10.3). Es distinta de CustomerResponseDto: no
// trae active ni deactivatedAt.
export class MyProfileResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt: string;

  private constructor(customer: Customer) {
    this.id = customer.getId() as number;
    this.firstName = customer.getFirstName();
    this.lastName = customer.getLastName();
    this.documentType = customer.getDocumentType();
    this.documentNumber = customer.getDocumentNumber();
    this.email = customer.getEmail();
    this.phone = customer.getPhone();
    this.dateOfBirth = customer.getDateOfBirth()?.toISOString().slice(0, 10) ?? null;
    this.createdAt = customer.getCreatedAt().toISOString();
  }

  static fromDomain(customer: Customer): MyProfileResponseDto {
    return new MyProfileResponseDto(customer);
  }
}
