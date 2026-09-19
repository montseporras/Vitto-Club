import { Customer } from '../customer';


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
  abstract save(customer: Customer): Promise<Customer>;
  abstract update(customer: Customer): Promise<void>;


  abstract existsByMail(mail: string, excludeId?: number): Promise<boolean>;

  abstract list(params: CustomerListParams): Promise<CustomerListResult>;
}
