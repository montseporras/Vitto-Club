export class EmployeeAlreadyExists extends Error {
  constructor(public readonly email: string) {
    super('Ya existe un empleado registrado con ese mail.');
    this.name = 'EmployeeAlreadyExists';
  }
}
