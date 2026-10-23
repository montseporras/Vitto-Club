export class AccountAlreadyExists extends Error {
  constructor(public readonly employeeId: number) {
    super('El empleado ya tiene un usuario.');
    this.name = 'AccountAlreadyExists';
  }
}
