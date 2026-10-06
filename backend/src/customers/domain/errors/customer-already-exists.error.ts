// Documento o email en uso por otro cliente ACTIVO (los inactivos no los ocupan)
export class CustomerAlreadyExists extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerAlreadyExists';
  }

  static withDocument(documentType: string, documentNumber: string): CustomerAlreadyExists {
    return new CustomerAlreadyExists(
      `An active customer with ${documentType} "${documentNumber}" already exists`,
    );
  }

  static withEmail(email: string): CustomerAlreadyExists {
    return new CustomerAlreadyExists(`An active customer with email "${email}" already exists`);
  }
}
