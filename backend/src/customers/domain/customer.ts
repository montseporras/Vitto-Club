import { CustomerId } from './customer-id';
import { Mail } from './mail';

export class Customer {
  private constructor(
    private readonly _id: CustomerId | null,
    private _name: string,
    private _lastName: string,
    private _phone: string,
    private _mail: Mail,
    private _active: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    
  ) {}
// OPERATIONS 

  // CREATE
    static create(
    name: string,
    lastName: string,
    phone: string,
    mail: string,
  ): Customer {
    if (!name.trim()){
      throw new Error('Customer name cannot be empty');
    }

    if (!lastName.trim()){
      throw new Error('Customer lastName cannot be empty');
    }

    if (!phone.trim()){
      throw new Error('Customer phone cannot be empty');
    }

    const now = new Date();

    return new Customer(
      null,
      name.trim(),
      lastName.trim(),
      phone.trim(),
      Mail.create(mail),
      true,
      now,
      now,
    );
  }


    static reconstruct(
    id: number,
    name: string,
    lastName: string,
    phone: string,
    mail: string,
    active: boolean,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ): Customer {
    return new Customer(
      CustomerId.create(id),
      name,
      lastName,
      phone,
      Mail.create(mail),
      active,
      createdAt,
      updatedAt,
    );
  }


  // UPDATE
    update(
    name: string,
    lastName: string,
    phone: string,
    mail: string,
  ): void {
    this.setName(name);
    this.setLastName(lastName);
    this.setPhone(phone);
    this.setMail(mail);
    this._updatedAt = new Date();
  }

  deactivate(): void {
    if(!this._active){
      throw new Error('Customer is already inactive');
    };
    this._active = false
    this._updatedAt = new Date();
  }

  // Reactivar (alta logica)
  activate(): void {
    if(this._active){
      throw new Error('Customer is already active');
    }
    this._active = true;
    this._updatedAt = new Date();
  }


// CHANGE METHODS

  setName(name:string): void {
    const normalizedName = name.trim();

    if(!normalizedName){ // el trim es para eliminar los espacios vacios
      throw new Error('Customer name cannot be empty');
    }
    this._name = normalizedName;
  }

  setLastName(lastName: string): void {
    const normalizedLastName = lastName.trim();

    if (!normalizedLastName) {
      throw new Error('Customer lastName cannot be empty');
    }

    this._lastName = normalizedLastName;
    }

  setMail(mail: string): void {
    this._mail = Mail.create(mail);
  }

  setPhone(phone:string): void {
    const normalizedPhone = phone.trim();

    if(!normalizedPhone){
      throw new Error('Customer phone cannot be empty');
    }
    this._phone = normalizedPhone;
  }



  getId(): number | null {
    return this._id ? this._id.getValue() : null;
  }
  getName(): string { return this._name; }
  getLastName(): string { return this._lastName; }
  getPhone(): string { return this._phone; }
  getMail(): string { return this._mail.getValue(); }
  isActive(): boolean { return this._active; }
  getCreatedAt(): Date { return this._createdAt; }
  getUpdatedAt(): Date { return this._updatedAt; }




}
