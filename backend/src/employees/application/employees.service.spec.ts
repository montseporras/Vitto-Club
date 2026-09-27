import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { Employee, EmployeeData, EmployeeUpdateData } from '../domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../domain/port/employee.repository.js';
import { DomainError } from '../domain/errors/domain.error.js';

// Repositorio en memoria solo para los tests (no toca la base de datos)
class FakeEmployeeRepository implements EmployeeRepository {
  readonly items = new Map<number, Employee>();
  private nextId = 1;
  readonly update_ = jest.fn();
  readonly findAll_ = jest.fn();
  readonly updateStatus_ = jest.fn();

  async save(employee: Employee): Promise<Employee> {
    const id = this.nextId++;
    const saved = Employee.reconstruct({
      id,
      firstName: employee.getFirstName(),
      lastName: employee.getLastName(),
      email: employee.getEmail(),
      role: employee.getRole(),
      phone: employee.getPhone(),
      active: employee.isActive(),
      deactivatedAt: employee.getDeactivatedAt(),
      createdAt: employee.getCreatedAt(),
      updatedAt: employee.getUpdatedAt(),
    });
    this.items.set(id, saved);
    return saved;
  }

  async findById(id: number): Promise<Employee | null> {
    return this.items.get(id) ?? null;
  }

  // El filtrado real lo hace Prisma (ver employees.repository.spec.ts); acá solo el estado
  async findAll(filters: EmployeeListFilters = {}): Promise<Employee[]> {
    this.findAll_(filters);
    return [...this.items.values()].filter(
      (e) => filters.active === undefined || e.isActive() === filters.active,
    );
  }

  async update(employee: Employee): Promise<void> {
    this.update_(employee);
    this.items.set(employee.getId() as number, employee);
  }

  async updateStatus(employee: Employee): Promise<void> {
    this.updateStatus_(employee);
    this.items.set(employee.getId() as number, employee);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return [...this.items.values()].some((e) => e.getEmail() === email.toLowerCase());
  }
}

describe('EmployeesService', () => {
  let repo: FakeEmployeeRepository;
  let service: EmployeesService;

  const validData: EmployeeData = {
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana.gomez@vitto.club',
    role: 'ADMIN',
    phone: '3510000001',
  };

  beforeEach(() => {
    repo = new FakeEmployeeRepository();
    service = new EmployeesService(repo);
  });

  describe('create()', () => {
    it('registra un empleado activo y le asigna id', async () => {
      const employee = await service.create(validData);

      expect(employee.getId()).toBe(1);
      expect(employee.isActive()).toBe(true);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(repo.items.size).toBe(1);
    });

    it('registra un empleado sin teléfono', async () => {
      const employee = await service.create({ ...validData, phone: undefined });
      expect(employee.getPhone()).toBeNull();
    });

    it('lanza 409 si el email ya está registrado', async () => {
      await service.create(validData);

      await expect(service.create({ ...validData, firstName: 'Otra' })).rejects.toThrow(
        ConflictException,
      );
      expect(repo.items.size).toBe(1);
    });

    it('detecta el email duplicado sin distinguir mayúsculas ni espacios', async () => {
      await service.create(validData);

      await expect(
        service.create({ ...validData, email: '  ANA.Gomez@Vitto.Club ' }),
      ).rejects.toThrow('already exists');
    });

    it('lanza 409 aunque el empleado con ese email esté dado de baja', async () => {
      repo.items.set(
        99,
        Employee.reconstruct({ ...validData, id: 99, active: false, deactivatedAt: new Date() }),
      );

      await expect(service.create(validData)).rejects.toThrow(ConflictException);
    });

    it('no persiste nada si los datos son inválidos', async () => {
      await expect(service.create({ ...validData, firstName: '  ' })).rejects.toThrow(DomainError);
      expect(repo.items.size).toBe(0);
    });
  });

  describe('findAll()', () => {
    it('devuelve un array vacío si no hay empleados', async () => {
      expect(await service.findAll()).toEqual([]);
    });

    it('sin filtros devuelve activos e inactivos', async () => {
      await service.create(validData);
      repo.items.set(
        50,
        Employee.reconstruct({ ...validData, email: 'baja@vitto.club', id: 50, active: false }),
      );

      const employees = await service.findAll();

      expect(employees).toHaveLength(2);
      expect(employees.map((e) => e.isActive())).toEqual([true, false]);
      expect(repo.findAll_).toHaveBeenCalledWith({});
    });

    it('pasa los filtros al repositorio', async () => {
      await service.findAll({ nameContains: 'ana', active: true });

      expect(repo.findAll_).toHaveBeenCalledWith({ nameContains: 'ana', active: true });
    });
  });

  describe('findById()', () => {
    it('devuelve el empleado existente', async () => {
      const created = await service.create(validData);
      const found = await service.findById(created.getId() as number);
      expect(found.getEmail()).toBe('ana.gomez@vitto.club');
    });

    it('lanza 404 si el empleado no existe', async () => {
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    let id: number;

    const updateData: EmployeeUpdateData = {
      firstName: 'Ana María',
      lastName: 'Gómez Paz',
      role: 'CASHIER',
      phone: '3519999999',
    };

    beforeEach(async () => {
      id = (await service.create(validData)).getId() as number;
    });

    it('actualiza los datos editables y devuelve el empleado', async () => {
      const employee = await service.update(id, updateData);

      expect(employee.getFirstName()).toBe('Ana María');
      expect(employee.getLastName()).toBe('Gómez Paz');
      expect(employee.getRole()).toBe('CASHIER');
      expect(employee.getPhone()).toBe('3519999999');
      expect(repo.update_).toHaveBeenCalledTimes(1);
    });

    it('conserva el email, el id y el estado activo', async () => {
      const employee = await service.update(id, updateData);

      expect(employee.getId()).toBe(id);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(employee.isActive()).toBe(true);
    });

    it('deja al empleado sin teléfono si phone no se envía', async () => {
      const { phone: _phone, ...withoutPhone } = updateData;

      const employee = await service.update(id, withoutPhone);

      expect(employee.getPhone()).toBeNull();
      expect((await service.findById(id)).getPhone()).toBeNull();
    });

    it('lanza 404 si el empleado no existe', async () => {
      await expect(service.update(999, updateData)).rejects.toThrow(NotFoundException);
      expect(repo.update_).not.toHaveBeenCalled();
    });

    it('lanza 409 si el empleado está inactivo y no lo modifica', async () => {
      repo.items.set(
        50,
        Employee.reconstruct({
          ...validData,
          email: 'baja@vitto.club',
          id: 50,
          active: false,
          deactivatedAt: new Date(),
        }),
      );

      await expect(service.update(50, updateData)).rejects.toThrow(ConflictException);
      await expect(service.update(50, updateData)).rejects.toThrow('inactive');

      const employee = await service.findById(50);
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getRole()).toBe('ADMIN');
      expect(repo.update_).not.toHaveBeenCalled();
    });

    it('no persiste nada si los datos son inválidos', async () => {
      await expect(service.update(id, { ...updateData, role: 'X' as never })).rejects.toThrow(
        DomainError,
      );

      expect(repo.update_).not.toHaveBeenCalled();
      expect((await service.findById(id)).getFirstName()).toBe('Ana');
    });
  });

  describe('deactivate()', () => {
    let id: number;

    beforeEach(async () => {
      id = (await service.create(validData)).getId() as number;
    });

    it('da de baja al empleado y devuelve el empleado inactivo con fecha de baja', async () => {
      const employee = await service.deactivate(id);

      expect(employee.isActive()).toBe(false);
      expect(employee.getDeactivatedAt()).toBeInstanceOf(Date);
      expect(repo.updateStatus_).toHaveBeenCalledTimes(1);
    });

    it('conserva el registro y todos sus datos (baja lógica, no física)', async () => {
      await service.deactivate(id);

      const employee = await service.findById(id);
      expect(employee.isActive()).toBe(false);
      expect(employee.getId()).toBe(id);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getLastName()).toBe('Gómez');
      expect(employee.getPhone()).toBe('3510000001');
      expect(employee.getRole()).toBe('ADMIN');
      expect(repo.items.size).toBe(1);
    });

    it('lanza 404 si el empleado no existe', async () => {
      await expect(service.deactivate(999)).rejects.toThrow(NotFoundException);
      expect(repo.updateStatus_).not.toHaveBeenCalled();
    });

    it('lanza 409 si ya está inactivo, sin persistir ni cambiar la fecha de baja', async () => {
      const first = await service.deactivate(id);
      const deactivatedAt = first.getDeactivatedAt();
      repo.updateStatus_.mockClear();

      await expect(service.deactivate(id)).rejects.toThrow(ConflictException);
      await expect(service.deactivate(id)).rejects.toThrow('already inactive');

      expect(repo.updateStatus_).not.toHaveBeenCalled();
      expect((await service.findById(id)).getDeactivatedAt()).toBe(deactivatedAt);
    });

    it('después de la baja no se puede editar (US-02)', async () => {
      await service.deactivate(id);

      await expect(
        service.update(id, { firstName: 'Otra', lastName: 'Persona', role: 'CASHIER' }),
      ).rejects.toThrow(ConflictException);
    });

    it('después de la baja sigue apareciendo en la consulta (US-03)', async () => {
      await service.deactivate(id);

      expect((await service.findAll()).map((e) => e.getId())).toEqual([id]);
      expect(await service.findAll({ active: false })).toHaveLength(1);
      expect(await service.findAll({ active: true })).toHaveLength(0);
    });

    it('después de la baja el email no se puede volver a registrar (US-01)', async () => {
      await service.deactivate(id);

      await expect(service.create(validData)).rejects.toThrow(ConflictException);
    });
  });
});
