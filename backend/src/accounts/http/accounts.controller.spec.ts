import { BadRequestException } from '@nestjs/common';
import { AccountsController } from './accounts.controller.js';
import { AccountsService, AccountProfile } from '../application/accounts.service.js';
import { Account } from '../domain/account.js';
import { RegisterAccountDto } from './dto/register-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';

describe('AccountsController', () => {
  let service: {
    register: jest.Mock;
    updateRole: jest.Mock;
    resetPassword: jest.Mock;
    deactivate: jest.Mock;
    findProfileByEmployeeId: jest.Mock;
    findProfileById: jest.Mock;
  };
  let controller: AccountsController;

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
      findProfileByEmployeeId: jest.fn(),
      findProfileById: jest.fn(),
    };
    controller = new AccountsController(service as unknown as AccountsService);
  });

  const registerDto = (values: Partial<RegisterAccountDto> = {}): RegisterAccountDto =>
    Object.assign(new RegisterAccountDto(), {
      employeeId: 2,
      email: 'bruno.perez@vitto.club',
      password: 'secreta123',
      ...values,
    });

  describe('register() — US-05', () => {
    it('delega en el servicio y arma la respuesta a partir del profile, sin passwordHash', async () => {
      service.register.mockResolvedValue({ getId: () => 7 } as unknown as Account);
      service.findProfileById.mockResolvedValue(profile);

      const result = await controller.register(registerDto());

      expect(service.register).toHaveBeenCalledWith({
        employeeId: 2,
        email: 'bruno.perez@vitto.club',
        password: 'secreta123',
      });
      expect(service.findProfileById).toHaveBeenCalledWith(7);
      expect({ ...result }).toEqual(profile);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('update() — US-06', () => {
    it('rechaza con 400 si no viene ni role ni password', async () => {
      await expect(controller.update(7, new UpdateAccountDto())).rejects.toThrow(
        BadRequestException,
      );
      expect(service.updateRole).not.toHaveBeenCalled();
      expect(service.resetPassword).not.toHaveBeenCalled();
    });

    it('con solo role: llama updateRole y no resetPassword', async () => {
      service.findProfileById.mockResolvedValue({ ...profile, role: 'ADMIN' });
      const dto = Object.assign(new UpdateAccountDto(), { role: 'ADMIN' });

      const result = await controller.update(7, dto);

      expect(service.updateRole).toHaveBeenCalledWith(7, 'ADMIN');
      expect(service.resetPassword).not.toHaveBeenCalled();
      expect(result.role).toBe('ADMIN');
    });

    it('con solo password: llama resetPassword y no updateRole', async () => {
      service.findProfileById.mockResolvedValue(profile);
      const dto = Object.assign(new UpdateAccountDto(), { password: 'nueva456' });

      await controller.update(7, dto);

      expect(service.resetPassword).toHaveBeenCalledWith(7, 'nueva456');
      expect(service.updateRole).not.toHaveBeenCalled();
    });

    it('con ambos: llama a los dos', async () => {
      service.findProfileById.mockResolvedValue({ ...profile, role: 'ADMIN' });
      const dto = Object.assign(new UpdateAccountDto(), { role: 'ADMIN', password: 'nueva456' });

      await controller.update(7, dto);

      expect(service.updateRole).toHaveBeenCalledWith(7, 'ADMIN');
      expect(service.resetPassword).toHaveBeenCalledWith(7, 'nueva456');
    });
  });

  describe('deactivate() — US-07', () => {
    it('delega en el servicio y no devuelve body (204)', async () => {
      const result = await controller.deactivate(7);

      expect(service.deactivate).toHaveBeenCalledWith(7);
      expect(result).toBeUndefined();
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
