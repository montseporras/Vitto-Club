// Documento o email ya registrados por otro cliente, activo o no: un cliente dado de baja
// se reactiva, no se crea uno nuevo
const REACTIVATE_HINT = 'If that customer is inactive, reactivate it instead of creating a new one';

export class CustomerAlreadyExists extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerAlreadyExists';
  }

  static withDocument(documentType: string, documentNumber: string): CustomerAlreadyExists {
    return new CustomerAlreadyExists(
      `Customer with ${documentType} "${documentNumber}" already exists. ${REACTIVATE_HINT}`,
    );
  }

  static withEmail(email: string): CustomerAlreadyExists {
    return new CustomerAlreadyExists(`Customer with email "${email}" already exists. ${REACTIVATE_HINT}`);
  }
}
