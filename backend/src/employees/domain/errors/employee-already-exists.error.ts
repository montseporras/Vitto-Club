export class EmployeeAlreadyExists extends Error {
  constructor(public readonly email: string) {
    super(`Employee with email "${email}" already exists`);
    this.name = 'EmployeeAlreadyExists';
  }
}
