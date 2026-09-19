export class ClienteId{
    private constructor(private readonly value: number){}

    static create(value: number): ClienteId{
        if (value === undefined || value === null || !Number.isInteger(value) || value <= 0) {
        throw new Error('Customer id must be a positive integer');
        }
        return new ClienteId(value);
    }

    getValue(): number {
        return this.value;
    }

}