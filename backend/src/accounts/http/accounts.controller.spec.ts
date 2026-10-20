import { BadRequestException } from '@nestjs/common';
import { AccountsController } from './accounts.controller.js';
import { AccountsService, AccountProfile } from '../application/accounts.service.js';
import { Account } from '../domain/account.js';
import { RegisterAccountDto } from './dto/register-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { Employee } from '../../employees/domain/employee.js';
import { createCapturingAuditService } from '../../audit/testing/capturing-audit-service.js';
import type { AuditEntryInput } from '../../audit/domain/audit-entry.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';

describe('AccountsController', () => {
  let service: {
    register: jest.Mock;
    updateRole: jest.Mock;
    resetPassword: jest.Mock;
    deactivate: jest.Mock;
    reactivate: jest.Mock;
    findAll: jest.Mock;
    findProfileByEmployeeId: jest.Mock;
    findProfileById: jest.Mock;
  };
  let employees: { findById: jest.Mock };
  let audit: AuditEntryInput[];
  let controller: AccountsController;

  const admin: CurrentUserData = { accountId: 1, role: 'ADMIN', employeeId: 1 };
  const employee = Employee.reconstruct({
    id: 2,
    firstName: 'Bruno',
    lastName: 'Pérez',
    email: 'bruno.perez@vitto.club',
    role: 'CASHIER',
    phone: null,
    active: true,
  });

  const profile: AccountProfile = {
    accountId: 7,
    employeeId: 2,
    email: 'bruno.perez@vitto.club',
    role: 'CASHIER',
    active: true,
  };

  beforeEach(() => {
    service = {
      register: jest.fn(),
      updateRole: jest.fn(),
      resetPassword: jest.fn(),
      deactivate: jest.fn(),
      reactivate: jest.fn(),
      findAll: jest.fn(),
      findProfileByEmployeeId: jest.fn(),
      findProfileById: jest.fn(),
    };
    employees = { findById: jest.fn().mockResolvedValue(employee) };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    controller = new AccountsController(
      service as unknown as AccountsService,
      employees as unknown as EmployeesService,
      capturing.service,
    );
  });

  const registerDto = (values: Partial<RegisterAccountDto> = {}): RegisterAccountDto =>
    Object.assign(new RegisterAccountDto(), {
      employeeId: 2,
      email: 'bruno.perez@vitto.club',
      password: 'secreta123',
      ...values,
    });

  describe('findAll() — SCRUM-27', () => {
    it('delega en el servicio y arma la respuesta a partir de los profiles', async () => {
      const secondProfile: AccountProfile = { ...profile, accountId: 8, employeeId: 5, active: false };
      service.findAll.mockResolvedValue([profile, secondProfile]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith();
      expect(result.map((r) => ({ ...r }))).toEqual([profile, secondProfile]);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });

    it('[] si no hay cuentas', async () => {
      service.findAll.mockResolvedValue([]);

      await expect(controller.findAll()).resolves.toEqual([]);
    });
  });

  describe('register() — US-05', () => {
    it('delega en el servicio y arma la respuesta a partir del profile, sin passwordHash', async () => {
      service.register.mockResolvedValue({ getId: () => 7 } as unknown as Account);
      service.findProfileById.mockResolvedValue(profile);

      const result = await controller.register(registerDto(), admin);

      expect(service.register).toHaveBeenCalledWith({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });
      expect(service.findProfileById).toHaveBeenCalledWith(7);
      expect({ ...result }).toEqual(profile);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('audita USER_ACCOUNT_CREATED con el mail y sin la contraseña', async () => {
      service.register.mockResolvedValue({ getId: () => 7 } as unknown as Account);
      service.findProfileById.mockResolvedValue(profile);

      await controller.register(registerDto(), admin);

      expect(audit).toEqual([
        {
          actor: { type: 'EMPLOYEE', accountId: 1 },
          module: 'EMPLOYEES',
          action: 'USER_ACCOUNT_CREATED',
          description: 'Creó el usuario de Bruno Pérez',
          details: [{ label: 'Usuario', value: 'bruno.perez@vitto.club' }],
        },
      ]);
      expect(JSON.stringify(audit)).not.toContain('secreta123');
    });
  });

  describe('update() — US-06', () => {
    it('rechaza con 400 si no viene ni role ni password', async () => {
      await expect(controller.update(7, new UpdateAccountDto(), admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.updateRole).not.toHaveBeenCalled();
      expect(service.resetPassword).not.toHaveBeenCalled();
    });

    it('con solo role: llama updateRole y no resetPassword', async () => {
      service.findProfileById
        .mockResolvedValueOnce(profile)
        .mockResolvedValueOnce({ ...profile, role: 'ADMIN' });
      const dto = Object.assign(new UpdateAccountDto(), { role: 'ADMIN' });

      const result = await controller.update(7, dto, admin);

      expect(service.updateRole).toHaveBeenCalledWith(7, 'ADMIN');
      expect(service.resetPassword).not.toHaveBeenCalled();
      expect(result.role).toBe('ADMIN');
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: 'USER_ACCOUNT_UPDATED',
        description: 'Cambió el rol de Bruno Pérez',
        details: [{ label: 'Rol', value: 'Cajero → Administrador' }],
      });
    });

    it('con el mismo role y sin password no cambia nada: no audita', async () => {
      service.findProfileById.mockResolvedValue(profile);
      const dto = Object.assign(new UpdateAccountDto(), { role: 'CASHIER' });

      await controller.update(7, dto, admin);

      expect(audit).toEqual([]);
    });

    it('con solo password: llama resetPassword y no updateRole', async () => {
      service.findProfileById.mockResolvedValue(profile);
      const dto = Object.assign(new UpdateAccountDto(), { password: 'nueva456' });

      await controller.update(7, dto, admin);

      expect(service.resetPassword).toHaveBeenCalledWith(7, 'nueva456');
      expect(service.updateRole).not.toHaveBeenCalled();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: 'USER_ACCOUNT_UPDATED',
        description: 'Cambió la contraseña de Bruno Pérez',
        details: [{ label: 'Contraseña', value: 'Modificada' }],
      });
      expect(JSON.stringify(audit)).not.toContain('nueva456');
    });

    it('con ambos: llama a los dos', async () => {
      service.findProfileById
        .mockResolvedValueOnce(profile)
        .mockResolvedValueOnce({ ...profile, role: 'ADMIN' });
      const dto = Object.assign(new UpdateAccountDto(), { role: 'ADMIN', password: 'nueva456' });

      await controller.update(7, dto, admin);

      expect(service.updateRole).toHaveBeenCalledWith(7, 'ADMIN');
      expect(service.resetPassword).toHaveBeenCalledWith(7, 'nueva456');
      expect(audit[0]).toMatchObject({
        description: 'Editó el usuario de Bruno Pérez',
        details: [
          { label: 'Rol', value: 'Cajero → Administrador' },
          { label: 'Contraseña', value: 'Modificada' },
        ],
      });
    });
  });

  describe('deactivate() — US-07', () => {
    it('delega en el servicio y no devuelve body (204)', async () => {
      service.findProfileById.mockResolvedValue(profile);

      const result = await controller.deactivate(7, admin);

      expect(service.deactivate).toHaveBeenCalledWith(7);
      expect(result).toBeUndefined();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: 'USER_ACCOUNT_DEACTIVATED',
        description: 'Dio de baja el usuario de Bruno Pérez',
        details: [{ label: 'Estado del usuario', value: 'Activo → Inactivo' }],
      });
    });
  });

  describe('reactivate() — SCRUM-27 (reversible)', () => {
    it('delega en el servicio y no devuelve body (204)', async () => {
      service.findProfileById.mockResolvedValue({ ...profile, active: false });

      const result = await controller.reactivate(7, admin);

      expect(service.reactivate).toHaveBeenCalledWith(7);
      expect(result).toBeUndefined();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: 'USER_ACCOUNT_REACTIVATED',
        description: 'Reactivó el usuario de Bruno Pérez',
        details: [{ label: 'Estado del usuario', value: 'Inactivo → Activo' }],
      });
    });
  });

  describe('findByEmployeeId() — US-08', () => {
    it('delega en el servicio y devuelve el profile sin passwordHash', async () => {
      service.findProfileByEmployeeId.mockResolvedValue(profile);

      const result = await controller.findByEmployeeId(2);

      expect(service.findProfileByEmployeeId).toHaveBeenCalledWith(2);
      expect({ ...result }).toEqual(profile);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
