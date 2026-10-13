import type { RegisteredCustomer } from '../../application/customer-registration.service.js';

// SCRUM-160. Respuesta del registro: sin tokens (no inicia sesión) ni nada de la cuenta.
export class RegisteredCustomerResponseDto {
  customerId: number;
  email: string;
  firstName: string;
  lastName: string;

  private constructor(registered: RegisteredCustomer) {
    this.customerId = registered.customerId;
    this.email = registered.email;
    this.firstName = registered.firstName;
    this.lastName = registered.lastName;
  }

  static from(registered: RegisteredCustomer): RegisteredCustomerResponseDto {
    return new RegisteredCustomerResponseDto(registered);
  }
}
