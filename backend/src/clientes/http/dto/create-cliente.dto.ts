import { Cliente } from './cliente';

export type ClienteListParams = {
  page: number;
  limit: number;
  nameContains?: string;
  active?: boolean;
};


export type ClienteListResult = {
  items: Cliente[];
  total: number;
};



export abstract class ClienteRepository {
  abstract findAll(): Promise<Cliente[]>;
  abstract findById(id: number): Promise<Cliente | null>;
  abstract save(customer: Cliente): Promise<Cliente>;
  abstract update(customer: Cliente): Promise<void>;


  abstract existsByMail(mail: string, excludeId?: number): Promise<boolean>;


  abstract list(params: ClienteListParams): Promise<ClienteListResult>;
}
