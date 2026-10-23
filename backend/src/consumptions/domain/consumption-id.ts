export class ConsumptionId {
  private constructor(private readonly value: number) {}

  static create(value: number): ConsumptionId {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Consumption id must be a positive integer');
    }
    return new ConsumptionId(value);
  }

  getValue(): number {
    return this.value;
  }
}
