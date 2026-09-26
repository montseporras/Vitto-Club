export type CustomerStatusAction = 'DEACTIVATED' | 'ACTIVATED';

// Un registro del historial de bajas y reactivaciones de un cliente
export type CustomerStatusChange = {
  id: number;
  action: CustomerStatusAction;
  createdAt: Date;
};
