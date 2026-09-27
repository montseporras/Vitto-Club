import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Employee, EmployeeData, EmployeeUpdateData } from '../domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../domain/port/employee.repository.js';
import { EmployeeAlreadyExists } from '../domain/errors/employee-already-exists.error.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeeRepository) {}

  // --- REGISTRAR (US-01) ---
  async create(data: EmployeeData): Promise<Employee> {
    // 1. Instanciar el Employee (valida, normaliza y nace activo)
    const employee = Employee.create(data);

    // 2. Verificar que el email no esté registrado. El schema no tiene @unique en email,
    //    así que la unicidad se controla acá.
    if (await this.employeesRepository.existsByEmail(employee.getEmail())) {
      throw new ConflictException(new EmployeeAlreadyExists(employee.getEmail()).message);
    }

    // 3. Persistir
    return await this.employeesRepository.save(employee);
  }

  // --- CONSULTAR (US-03): sin filtros devuelve activos e inactivos ---
  async findAll(filters: EmployeeListFilters = {}): Promise<Employee[]> {
    return await this.employeesRepository.findAll(filters);
  }

  // --- BUSCAR POR ID (US-03) ---
  async findById(id: number): Promise<Employee> {
    const employee = await this.employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  // --- EDITAR (US-02) ---
  async update(id: number, data: EmployeeUpdateData): Promise<Employee> {
    // 1. Buscar el empleado (404 si no existe)
    const employee = await this.findById(id);

    // 2. Un empleado dado de baja no se modifica
    if (!employee.isActive()) {
      throw new ConflictException(`Employee with ID ${id} is inactive and cannot be modified`);
    }

    // 3. Aplicar los cambios (valida todo antes de modificar la entidad)
    employee.update(data);

    // 4. Persistir
    await this.employeesRepository.update(employee);

    return employee;
  }

  // --- DAR DE BAJA (US-04): baja lógica, el registro se conserva ---
  async deactivate(id: number): Promise<Employee> {
    const employee = await this.findById(id);
    if (!employee.isActive()) {
      throw new ConflictException(`Employee with ID ${id} is already inactive`);
    }
    employee.deactivate();
    await this.employeesRepository.updateStatus(employee);
    return employee;
  }
}
