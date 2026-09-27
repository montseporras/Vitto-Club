export class CustomerAlreadyExists extends Error {
  constructor(
    public readonly documentType: string,
    public readonly documentNumber: string,
  ) {
    super(
      `Customer with ${documentType} "${documentNumber}" already exists. ` +
        'If that customer is inactive, reactivate it instead of creating a new one',
    );

    this.name = 'CustomerAlreadyExists';
  }
}
