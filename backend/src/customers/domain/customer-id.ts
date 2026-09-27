export class CustomerId{
    private constructor(private readonly value: number){}

    static create(value: number): CustomerId{
        if (value === undefined || value === null || !Number.isInteger(value) || value <= 0) {
        throw new Error('Customer id must be a positive integer');
        }
        return new CustomerId(value);
    }

    getValue(): number {
        return this.value;
    }

}