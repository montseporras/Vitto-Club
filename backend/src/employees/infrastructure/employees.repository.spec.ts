import { buildEmployeeWhere, EmployeePrismaRepository } from './employees.repository.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Employee } from '../domain/employee.js';

// El repositorio ahora inyecta PrismaTransactionRunner y usa su getter .client en vez de
// PrismaService directo (ver docs/ARCHITECTURE.md). Este fake solo necesita exponer ese
// getter con el cliente de Prisma simulado.
function fakeTransactionRunner(prismaLike: object): PrismaTransactionRunner {
  return { client: prismaLike } as unknown as PrismaTransactionRunner;
}

// Filtro del listado (US-03), probado sin base de datos
describe('buildEmployeeWhere', () => {
  const nameTerm = (term: string) => ({
    OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
    ],
  });

  it('sin filtros no restringe nada (activos e inactivos)', () => {
    expect(buildEmployeeWhere()).toEqual({});
    expect(buildEmployeeWhere({})).toEqual({});
  });

  it('active=true filtra solo activos', () => {
    expect(buildEmployeeWhere({ active: true })).toEqual({ isActive: true });
  });

  it('active=false filtra solo inactivos', () => {
    expect(buildEmployeeWhere({ active: false })).toEqual({ isActive: false });
  });

  it('nameContains busca en nombre o apellido', () => {
    expect(buildEmployeeWhere({ nameContains: 'ana' })).toEqual({ AND: [nameTerm('ana')] });
  });

  it('con varias palabras, cada una debe aparecer en nombre o apellido', () => {
    expect(buildEmployeeWhere({ nameContains: '  ana   gomez ' })).toEqual({
      AND: [nameTerm('ana'), nameTerm('gomez')],
    });
  });

  it('combina nameContains y active', () => {
    expect(buildEmployeeWhere({ nameContains: 'ana', active: false })).toEqual({
      isActive: false,
      AND: [nameTerm('ana')],
    });
  });

  it('la búsqueda no distingue mayúsculas (mode insensitive, sin alterar el texto)', () => {
    const where = buildEmployeeWhere({ nameContains: 'ANA' });
    expect(where).toEqual({ AND: [nameTerm('ANA')] });

    const conditions = JSON.stringify(where);
    expect(conditions.match(/"mode":"insensitive"/g)).toHaveLength(2);
  });

  it('un nombre solo con espacios no filtra', () => {
    expect(buildEmployeeWhere({ nameContains: '   ' })).toEqual({});
  });
});

// Baja lógica (US-04), probada con un PrismaService falso: sin base de datos
describe('EmployeePrismaRepository.updateStatus', () => {
  let prismaEmployee: { update: jest.Mock; delete: jest.Mock; deleteMany: jest.Mock };
  let repository: EmployeePrismaRepository;

  beforeEach(() => {
    prismaEmployee = {
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    };
    repository = new EmployeePrismaRepository(fakeTransactionRunner({ employee: prismaEmployee }));
  });

  const deactivated = () => {
    const employee = Employee.reconstruct({
      id: 5,
      firstName: 'Bruno',
      lastName: 'Pérez',
      email: 'bruno.perez@vitto.club',
      role: 'CASHIER',
      phone: '3510000002',
      active: true,
    });
    employee.deactivate();
    return employee;
  };

  it('usa prisma.employee.update y nunca delete (baja lógica)', async () => {
    await repository.updateStatus(deactivated());

    expect(prismaEmployee.update).toHaveBeenCalledTimes(1);
    expect(prismaEmployee.delete).not.toHaveBeenCalled();
    expect(prismaEmployee.deleteMany).not.toHaveBeenCalled();
  });

  it('escribe solo isActive y deactivatedAt del empleado indicado', async () => {
    const employee = deactivated();

    await repository.updateStatus(employee);

    expect(prismaEmployee.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isActive: false, deactivatedAt: employee.getDeactivatedAt() },
    });
    expect(employee.getDeactivatedAt()).toBeInstanceOf(Date);
  });
});

// Listado (US-03): el orden lo resuelve la base, se verifica qué se le pide a Prisma
describe('EmployeePrismaRepository.findAll', () => {
  it('ordena por apellido ascendente, desempatando por nombre e id', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new EmployeePrismaRepository(fakeTransactionRunner({ employee: { findMany } }));

    await repository.findAll();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
