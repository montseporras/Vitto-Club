export class AccountAlreadyExists extends Error {
  constructor(public readonly employeeId: number) {
    super(`Employee with ID ${employeeId} already has an account`);
    this.name = 'AccountAlreadyExists';
  }
}
