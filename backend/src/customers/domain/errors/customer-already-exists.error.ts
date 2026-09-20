export class CustomerAlreadyExists extends Error {
  constructor(
    public readonly documentType: string,
    public readonly documentNumber: string,
  ) {
    super(`Customer with ${documentType} "${documentNumber}" already exists`);
    this.name = 'CustomerAlreadyExists';
  }
}
