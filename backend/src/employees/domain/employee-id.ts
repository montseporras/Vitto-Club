export class EmployeeId {
  private constructor(private readonly value: number) {}

  static create(value: number): EmployeeId {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Employee id must be a positive integer');
    }
    return new EmployeeId(value);
  }

  getValue(): number {
    return this.value;
  }
}
