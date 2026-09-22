import { DomainError } from './errors/domain.error.js';

export class Mail{
    private constructor(private readonly value: string){}

    static create(value: string): Mail{
        const normalizedValue = value.trim().toLowerCase(); // para que todos se guarden en minusculas y sin espacios

        if(!normalizedValue){
            throw new DomainError('Mail cannot be empty', 'email');
        }

        // Validar el formato del correo electrónico
        const emailRegex= /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(normalizedValue)){
            throw new DomainError('Invalid email format', 'email');
        }

        return new Mail(normalizedValue);
    }

    getValue(): string {
        return this.value;
    }
}
