export class CustomerAlreadyExists extends Error {
  constructor(public readonly mail: string) {
    super(`Customer with mail "${mail}" already exists`);
    this.name = 'CustomerAlreadyExists';
  }
}
