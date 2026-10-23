import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from '../application/employees.service.js';
import { Employee } from '../domain/employee.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto.js';
import { createCapturingAuditService } from '../../audit/testing/capturing-audit-service.js';
import type { AuditEntryInput } from '../../audit/domain/audit-entry.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';

describe('EmployeesController', () => {
  let service: {
    create: jest.Mock;
    update: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    deactivate: jest.Mock;
  };
  let audit: AuditEntryInput[];
  let controller: EmployeesController;

  const admin: CurrentUserData = { accountId: 1, role: 'ADMIN', employeeId: 1 };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      deactivate: jest.fn(),
    };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    controller = new EmployeesController(service as unknown as EmployeesService, capturing.service);
  });

  const dto = (values: Partial<CreateEmployeeDto> = {}): CreateEmployeeDto =>
    Object.assign(new CreateEmployeeDto(), {
      firstName: 'Bruno',
      lastName: 'Pérez',
      email: 'bruno.perez@vitto.club',
      role: 'CASHIER',
      ...values,
    });

  describe('create()', () => {
    it('delega el alta en el servicio y devuelve el contrato del frontend', async () => {
      service.create.mockResolvedValue(
        Employee.reconstruct({
          id: 4,
          firstName: 'Bruno',
          lastName: 'Pérez',
          email: 'bruno.perez@vitto.club',
          role: 'CASHIER',
          phone: '3510000002',
          active: true,
        }),
      );

      const result = await controller.create(dto({ phone: '3510000002' }), admin);

      expect(service.create).toHaveBeenCalledWith({
        firstName: 'Bruno',
        lastName: 'Pérez',
        email: 'bruno.perez@vitto.club',
        role: 'CASHIER',
        phone: '3510000002',
      });
      expect({ ...result }).toEqual({
        id: 4,
        firstName: 'Bruno',
        lastName: 'Pérez',
        phone: '3510000002',
        email: 'bruno.perez@vitto.club',
        role: 'CASHIER',
        isActive: true,
      });
      expect(audit).toEqual([
        {
          actor: { type: 'EMPLOYEE', accountId: 1 },
          module: 'EMPLOYEES',
          action: 'EMPLOYEE_CREATED',
          description: 'Registró al empleado Bruno Pérez',
          details: [
            { label: 'Mail', value: 'bruno.perez@vitto.club' },
            { label: 'Rol', value: 'Cajero' },
          ],
        },
      ]);
    });

    it('devuelve phone null si el empleado no tiene teléfono', async () => {
      service.create.mockResolvedValue(
        Employee.reconstruct({
          id: 5,
          firstName: 'Bruno',
          lastName: 'Pérez',
          email: 'bruno.perez@vitto.club',
          role: 'CASHIER',
          active: true,
        }),
      );

      const result = await controller.create(dto(), admin);

      expect(result.phone).toBeNull();
    });
  });

  describe('findAll()', () => {
    const query = (values: Partial<ListEmployeesQueryDto> = {}): ListEmployeesQueryDto =>
      Object.assign(new ListEmployeesQueryDto(), values);

    const ana = Employee.reconstruct({
      id: 1,
      firstName: 'Ana',
      lastName: 'Gómez',
      email: 'ana.gomez@vitto.club',
      role: 'ADMIN',
      phone: '3510000001',
      active: true,
    });

    it('sin parámetros no filtra y devuelve un array con el contrato del frontend', async () => {
      service.findAll.mockResolvedValue([ana]);

      const result = await controller.findAll(query());

      expect(service.findAll).toHaveBeenCalledWith({ nameContains: undefined, active: undefined });
      expect(Array.isArray(result)).toBe(true);
      expect(result.map((r) => ({ ...r }))).toEqual([
        {
          id: 1,
          firstName: 'Ana',
          lastName: 'Gómez',
          phone: '3510000001',
          email: 'ana.gomez@vitto.club',
          role: 'ADMIN',
          isActive: true,
        },
      ]);
    });

    it('sin resultados devuelve un array vacío', async () => {
      service.findAll.mockResolvedValue([]);

      expect(await controller.findAll(query({ name: 'nadie' }))).toEqual([]);
    });

    it('convierte active de texto a booleano', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(query({ active: 'true' }));
      expect(service.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ active: true }));

      await controller.findAll(query({ active: 'false' }));
      expect(service.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }));
    });

    it('recorta el nombre y lo ignora si está vacío', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(query({ name: '  ana  ' }));
      expect(service.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ nameContains: 'ana' }),
      );

      await controller.findAll(query({ name: '   ' }));
      expect(service.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ nameContains: undefined }),
      );
    });
  });

  describe('findById()', () => {
    it('delega en el servicio con el id y devuelve el empleado', async () => {
      service.findById.mockResolvedValue(
        Employee.reconstruct({
          id: 3,
          firstName: 'Carla',
          lastName: 'Martínez',
          email: 'carla.martinez@vitto.club',
          role: 'CASHIER',
          active: false,
        }),
      );

      const result = await controller.findById(3);

      expect(service.findById).toHaveBeenCalledWith(3);
      expect(result).toMatchObject({ id: 3, firstName: 'Carla', phone: null, isActive: false });
    });
  });

  describe('deactivate()', () => {
    it('delega la baja en el servicio y devuelve el empleado con isActive false', async () => {
      service.deactivate.mockResolvedValue(
        Employee.reconstruct({
          id: 3,
          firstName: 'Carla',
          lastName: 'Martínez',
          email: 'carla.martinez@vitto.club',
          role: 'CASHIER',
          phone: '3510000003',
          active: false,
          deactivatedAt: new Date(),
        }),
      );

      const result = await controller.deactivate(3, admin);

      expect(service.deactivate).toHaveBeenCalledWith(3);
      expect({ ...result }).toEqual({
        id: 3,
        firstName: 'Carla',
        lastName: 'Martínez',
        phone: '3510000003',
        email: 'carla.martinez@vitto.club',
        role: 'CASHIER',
        isActive: false,
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: 'EMPLOYEE_DEACTIVATED',
        description: 'Dio de baja al empleado Carla Martínez',
        details: [{ label: 'Estado', value: 'Activo → Inactivo' }],
      });
    });
  });

  describe('update()', () => {
    it('delega la edición en el servicio con el id y devuelve el contrato del frontend', async () => {
      service.findById.mockResolvedValue(
        Employee.reconstruct({
          id: 2,
          firstName: 'Bruno',
          lastName: 'Pérez',
          email: 'bruno.perez@vitto.club',
          role: 'CASHIER',
          active: true,
        }),
      );
      service.update.mockResolvedValue(
        Employee.reconstruct({
          id: 2,
          firstName: 'Bruno',
          lastName: 'Pérez',
          email: 'bruno.perez@vitto.club',
          role: 'ADMIN',
          active: true,
        }),
      );
      const body = Object.assign(new UpdateEmployeeDto(), {
        firstName: 'Bruno',
        lastName: 'Pérez',
        role: 'ADMIN',
      });

      const result = await controller.update(2, body, admin);

      expect(service.update).toHaveBeenCalledWith(2, {
        firstName: 'Bruno',
        lastName: 'Pérez',
        role: 'ADMIN',
        phone: undefined,
      });
      expect({ ...result }).toEqual({
        id: 2,
        firstName: 'Bruno',
        lastName: 'Pérez',
        phone: null,
        email: 'bruno.perez@vitto.club',
        role: 'ADMIN',
        isActive: true,
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: 'EMPLOYEE_UPDATED',
        description: 'Editó al empleado Bruno Pérez',
        details: [{ label: 'Rol', value: 'Cajero → Administrador' }],
      });
    });
  });
});
