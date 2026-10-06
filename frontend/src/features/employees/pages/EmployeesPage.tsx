// Sección "Empleados y usuarios": listado y búsqueda (RF-01/RF-03), alta
// (RF-01), edición (RF-02) y baja lógica (RF-04) de empleados, y el usuario
// con el que el empleado entra al sistema: alta (SCRUM-21), cambio de
// contraseña (SCRUM-24), baja y reactivación (SCRUM-27).
// Es la pantalla del prototipo dentro del modal de Configuración del Administrador;
// el título y la descripción los muestra el encabezado de ese modal.
import { useState } from 'react';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Modal } from '@/shared/components/ui/Modal';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useEmployees } from '../api/employees.queries';
import { EmployeeSearch } from '../components/EmployeeSearch';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { ConfirmAccountStatusChange } from '../components/ConfirmAccountStatusChange';
import { ConfirmEmployeeDeactivation } from '../components/ConfirmEmployeeDeactivation';
import { CreateAccountForm } from '../components/CreateAccountForm';
import { EditEmployeeForm } from '../components/EditEmployeeForm';
import type { AccountAction } from '../components/EmployeeAccountSection';
import { CreateEmployeeForm } from '../components/CreateEmployeeForm';
import { EmployeesTable } from '../components/EmployeesTable';
import type { Employee } from '../types/employee';

// Mismo máximo que acepta el backend en ?name= (más largo responde 400).
const MAX_SEARCH_LENGTH = 80;

// Qué muestra el modal del empleado seleccionado
type EmployeeModalView = 'edit' | 'deactivate' | AccountAction;

const MODAL_TITLES: Record<Exclude<EmployeeModalView, 'edit'>, string> = {
  deactivate: 'Dar de baja empleado',
  createAccount: 'Crear usuario',
  changePassword: 'Cambiar contraseña',
  deactivateAccount: 'Dar de baja usuario',
  reactivateAccount: 'Reactivar usuario',
};

export function EmployeesPage() {
  const [creating, setCreating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);
  const [modalView, setModalView] = useState<EmployeeModalView>('edit');
  const [search, setSearch] = useState('');

  // La búsqueda la resuelve el backend (GET /empleados?name=): se espera a que
  // el usuario deje de tipear para no pedir en cada tecla.
  const term = useDebounce(search.trim(), 300);
  const {
    data: employees,
    isLoading,
    isError,
    refetch,
  } = useEmployees(term);

  const closeEdit = () => {
    setSelectedEmployee(null);
    setModalView('edit');
  };

  const hasSearch = term !== '';

  // Contenido del modal del empleado según la vista elegida. Las vistas del
  // usuario necesitan que tenga uno; si no, se vuelve a la edición.
  const renderEmployeeModal = (employee: Employee) => {
    const backToEdit = () => setModalView('edit');
    const { account } = employee;

    switch (modalView) {
      case 'deactivate':
        return (
          <ConfirmEmployeeDeactivation
            employee={employee}
            onSuccess={closeEdit}
            onCancel={backToEdit}
          />
        );
      case 'createAccount':
        return (
          <CreateAccountForm
            employee={employee}
            onDone={closeEdit}
            onCancel={backToEdit}
          />
        );
      case 'changePassword':
        if (!account) break;
        return (
          <ChangePasswordForm
            employee={employee}
            account={account}
            onDone={closeEdit}
            onCancel={backToEdit}
          />
        );
      case 'deactivateAccount':
      case 'reactivateAccount':
        if (!account) break;
        return (
          <ConfirmAccountStatusChange
            change={modalView === 'deactivateAccount' ? 'deactivate' : 'reactivate'}
            employee={employee}
            account={account}
            onSuccess={closeEdit}
            onCancel={backToEdit}
          />
        );
    }
    return (
      <EditEmployeeForm
        employee={employee}
        onSuccess={closeEdit}
        onCancel={closeEdit}
        onRequestDeactivation={() => setModalView('deactivate')}
        onAccountAction={setModalView}
      />
    );
  };

  return (
    <div>
      {(hasSearch || search !== '' || (employees?.length ?? 0) > 0) && (
        <div className="mb-6">
          <EmployeeSearch
            value={search}
            onChange={(value) => setSearch(value.slice(0, MAX_SEARCH_LENGTH))}
          />
        </div>
      )}

      {isLoading && <StatusText>Cargando empleados…</StatusText>}

      {isError && (
        <Alert variant="error">
          <p>
            No se pudieron cargar los empleados.{' '}
            <button
              type="button"
              onClick={() => void refetch()}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </p>
        </Alert>
      )}

      {employees &&
        !isError &&
        (employees.length > 0 ? (
          <EmployeesTable
            employees={employees}
            onSelectEmployee={setSelectedEmployee}
          />
        ) : hasSearch ? (
          <StatusText>
            No se encontraron empleados que coincidan con la búsqueda.
          </StatusText>
        ) : (
          <StatusText>Todavía no hay empleados registrados.</StatusText>
        ))}

      <Button
        type="button"
        size="lg"
        onClick={() => setCreating(true)}
        className="mt-6 w-full sm:w-auto"
      >
        <Icon d={ICONS.plus} />
        Registrar empleado
      </Button>

      {creating && (
        <Modal title="Crear empleado">
          <CreateEmployeeForm
            onSuccess={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {selectedEmployee && (
        <Modal
          title={
            modalView !== 'edit'
              ? MODAL_TITLES[modalView]
              : selectedEmployee.isActive
                ? 'Editar empleado'
                : 'Empleado dado de baja'
          }
        >
          {renderEmployeeModal(selectedEmployee)}
        </Modal>
      )}
    </div>
  );
}
