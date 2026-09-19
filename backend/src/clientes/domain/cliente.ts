import { ClienteId } from "./cliente-id";
import { Mail } from './mail';

export class Cliente {
  private constructor(
    private readonly _id: ClienteId | null,
    private _nombre: string,
    private _apellido: string,
    private _telefono: string,
    private _mail: Mail,
    private _active: boolean,
    private readonly _creadoA: Date,
    private _actualizadoA: Date,
    
  ) {}
// OPERATIONS 

  // CREATE
    static create(
    nombre: string,
    apellido: string,
    telefono: string,
    mail: string,
  ): Cliente {
    if (!nombre.trim()){
      throw new Error('Customer name cannot be empty');
    }

    if (!apellido.trim()){
      throw new Error('Customer lastName cannot be empty');
    }

    if (!telefono.trim()){
      throw new Error('Customer phone cannot be empty');
    }

    const now = new Date();

    return new Cliente(
      null,
      nombre.trim(),
      apellido.trim(),
      telefono.trim(),
      Mail.create(mail),
      true,
      now,
      now,
    );
  }


    static reconstruct(
    id: number,
    nombre: string,
    apellido: string,
    telefono: string,
    mail: string,
    active: boolean,
    creadoA: Date = new Date(),
    actualizadoA: Date = new Date(),
  ): Cliente {
    return new Cliente(
      ClienteId.create(id),
      nombre,
      apellido,
      telefono,
      Mail.create(mail),
      active,
      creadoA,
      actualizadoA,
    );
  }


  // UPDATE
    update(
    nombre: string,
    apellido: string,
    telefono: string,
    mail: string,
  ): void {
    this.setName(nombre);
    this.setLastName(apellido);
    this.setPhone(telefono);
    this.setMail(mail);
    this._actualizadoA = new Date();
  }

  deactivate(): void {
    if(!this._active){
      throw new Error('Customer is already inactive');
    };
    this._active = false
    this._actualizadoA = new Date();
  }

  // Reactivar (alta logica)
  activate(): void {
    if(this._active){
      throw new Error('Customer is already active');
    }
    this._active = true;
    this._actualizadoA = new Date();
  }


// CHANGE METHODS

  setName(name:string): void {
    const normalizedName = name.trim();

    if(!normalizedName){ // el trim es para eliminar los espacios vacios
      throw new Error('Customer name cannot be empty');
    }
    this._nombre = normalizedName;
  }

  setLastName(lastName: string): void {
    const normalizedLastName = lastName.trim();

    if (!normalizedLastName) {
      throw new Error('Customer lastName cannot be empty');
    }

    this._apellido = normalizedLastName;
    }

  setMail(mail: string): void {
    this._mail = Mail.create(mail);
  }

  setPhone(phone:string): void {
    const normalizedPhone = phone.trim();

    if(!normalizedPhone){
      throw new Error('Customer phone cannot be empty');
    }
    this._telefono = normalizedPhone;
  }


  getId(): number | null {
    return this._id ? this._id.getValue() : null;
  }
  getName(): string { return this._nombre; }
  getLastName(): string { return this._apellido; }
  getPhone(): string { return this._telefono; }
  getMail(): string { return this._mail.getValue(); }
  isActive(): boolean { return this._active; }
  getCreatedAt(): Date { return this._creadoA; }
  getUpdatedAt(): Date { return this._actualizadoA; }




}
