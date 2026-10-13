export class AccountId {
  private constructor(private readonly value: number) {}

  static create(value: number): AccountId {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Account id must be a positive integer');
    }
    return new AccountId(value);
  }

  getValue(): number {
    return this.value;
  }
}
