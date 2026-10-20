import { Customer, DocumentType } from '../customer.js';
import { CustomerStatusAction, CustomerStatusChange } from '../customer-status-change.js';
import type { Level } from '../../../points/domain/level.js';

export type CustomerListSort = 'id' | 'lastName';

export type CustomerListParams = {
  page: number;
  limit: number;
  nameContains?: string;
  // q: nombre, apellido o documento normalizado, coincidencia parcial (CLI-ADM)
  search?: string;
  level?: Level;
  // 'id' por defecto; 'lastName' ordena por apellido, nombre e id
  sort?: CustomerListSort;
  active?: boolean;
};

// Cada ítem trae lo que el contrato agrega en §3.8.1 (saldo, acumulados y nivel calculado)
export type CustomerListItem = {
  customer: Customer;
  balance: number;
  lifetimePoints: number;
  level: Level;
};

export type CustomerListResult = {
  items: CustomerListItem[];
  total: number;
};

export abstract class CustomerRepository {
  abstract findAll(): Promise<Customer[]>;
  abstract findById(id: number): Promise<Customer | null>;
  // Puede haber varios clientes con el mismo documento (uno activo y bajas anteriores):
  // devuelve el activo y, si no hay, el inactivo más reciente.
  abstract findByDocument(
    documentType: DocumentType,
    documentNumber: string,
  ): Promise<Customer | null>;
  abstract save(customer: Customer): Promise<Customer>;
  abstract update(customer: Customer): Promise<void>;

  // Guarda el nuevo estado (activo/inactivo) y registra el cambio en el historial, todo junto
  abstract updateStatus(customer: Customer, action: CustomerStatusAction): Promise<void>;
  abstract findStatusHistory(customerId: number): Promise<CustomerStatusChange[]>;

  // Unicidad: solo cuentan los clientes ACTIVOS. Un cliente dado de baja no ocupa su
  // documento ni su email (decisión del PO, 2026-10-08).
  abstract existsByDocument(
    documentType: DocumentType,
    documentNumber: string,
    excludeId?: number,
  ): Promise<boolean>;

  // El email se compara sin distinguir mayúsculas (mismo criterio que
  // EmployeeRepository.existsByEmail). Usado para la unicidad global de email entre
  // customers y employees (ver accounts.service.ts).
  // Con onlyActive solo cuentan los clientes activos: es la unicidad entre clientes, porque
  // un cliente dado de baja no ocupa su email (decisión del PO, 2026-10-08).
  abstract existsByEmail(email: string, options?: { onlyActive?: boolean }): Promise<boolean>;

  abstract list(params: CustomerListParams): Promise<CustomerListResult>;

  // Saldo actual del cliente (customer_points). 0 si nunca tuvo movimientos. Se usa para el
  // "Saldo perdido" de la baja (CLI-ADM).
  abstract findBalance(customerId: number): Promise<number>;
}
