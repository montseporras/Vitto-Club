export class Mail{
    private constructor(private readonly value: string){}

    static create(value: string): Mail{
        const normalizedValue = value.trim().toLowerCase(); // para que todos se guarden en minusculas y sin espacios

        if(!normalizedValue){
            throw new Error('Mail cannot be empty');
        }

        // Validar el formato del correo electrónico
        const emailRegex= /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(normalizedValue)){
            throw new Error('Invalid email format');
        }

        return new Mail(normalizedValue);
    }

    getValue(): string {
        return this.value;
    }
}