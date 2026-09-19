import { Cliente } from "./cliente";

// La definimos como abstracta ya que servirá de base para otras clases

export abstract class ClienteRepository{
    abstract findAll(): Promise<Cliente[]>
    abstract findById(id: number): Promise<Cliente | null>
    abstract save(customer: Cliente): Promise<Cliente>
    abstract update(customer: Cliente): Promise<void>
}