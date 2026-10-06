import { Customer, DocumentType } from '../customer.js';
import { CustomerStatusAction, CustomerStatusChange } from '../customer-status-change.js';

export type CustomerListParams = {
  page: number;
  limit: number;
  nameContains?: string;
  active?: boolean;
};

export type CustomerListResult = {
  items: Customer[];
  total: number;
};

export abstract class CustomerRepository {
  abstract findAll(): Promise<Customer[]>;
  abstract findById(id: number): Promise<Customer | null>;
  // Puede haber varios clientes con el mismo documento (uno activo y bajas anteriores):
  // devuelve el activo y, si no hay, la baja más reciente.
  abstract findByDocument(
    documentType: DocumentType,
    documentNumber: string,
  ): Promise<Customer | null>;
  abstract save(customer: Customer): Promise<Customer>;
  abstract update(customer: Customer): Promise<void>;

  // Guarda el nuevo estado (activo/inactivo) y registra el cambio en el historial, todo junto
  abstract updateStatus(customer: Customer, action: CustomerStatusAction): Promise<void>;
  abstract findStatusHistory(customerId: number): Promise<CustomerStatusChange[]>;

  // Documento y email son únicos solo entre clientes activos: los inactivos no cuentan
  abstract existsActiveByDocument(
    documentType: DocumentType,
    documentNumber: string,
    excludeId?: number,
  ): Promise<boolean>;
  abstract existsActiveByEmail(email: string, excludeId?: number): Promise<boolean>;

  abstract list(params: CustomerListParams): Promise<CustomerListResult>;
}
