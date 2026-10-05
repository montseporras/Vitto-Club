import type { AccountProfile } from '../../application/accounts.service.js';
import type { EmployeeRole } from '../../../employees/domain/employee.js';

// US-05/06/07/08. Forma exacta de la respuesta HTTP. Nunca incluye passwordHash,
// identifier, session ni ningún campo interno — AccountProfile ya los excluye por diseño.
export class AccountResponseDto {
  accountId: number;
  employeeId: number;
  email: string;
  role: EmployeeRole;
  active: boolean;

  private constructor(profile: AccountProfile) {
    this.accountId = profile.accountId;
    this.employeeId = profile.employeeId;
    this.email = profile.email;
    this.role = profile.role;
    this.active = profile.active;
  }

  static fromProfile(profile: AccountProfile): AccountResponseDto {
    return new AccountResponseDto(profile);
  }
}
