// US-28: tipo Mission del catálogo (contrato S5 §3.1.1 y §3.15). Las reglas de editar y dar de
// baja las agrega US-29.

// §2.2. DELETED ("Dada de baja") es final
export const MISSION_STATUSES = ['ACTIVE', 'DELETED'] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

// §2.3 (S5-15)
export const MISSION_OBJECTIVE_TYPES = ['CONSUMPTION_COUNT', 'CONSUMPTION_AMOUNT'] as const;
export type MissionObjectiveType = (typeof MISSION_OBJECTIVE_TYPES)[number];

// §2.2: se calcula con la fecha; no es un estado guardado
export const MISSION_PHASES = ['RUNNING', 'UPCOMING', 'FINISHED'] as const;
export type MissionPhase = (typeof MISSION_PHASES)[number];

// §3.1.1: una edición que rige desde el mes siguiente (la escribe US-29)
export type MissionPendingChanges = {
  appliesFrom: string;
  objectiveType: MissionObjectiveType;
  target: number;
  daysOfWeek: number[] | null;
  timeFrom: string | null;
  timeTo: string | null;
  rewardPoints: number | null;
};

export type Mission = {
  id: number;
  name: string;
  description: string | null;
  objectiveType: MissionObjectiveType;
  target: number;
  // 1 (lunes) a 7 (domingo), ordenados. null = todos los días
  daysOfWeek: number[] | null;
  // HH:mm, hora de Argentina. Los dos o ninguno
  timeFrom: string | null;
  timeTo: string | null;
  // null = sin recompensa (S5-4)
  rewardPoints: number | null;
  // YYYY-MM
  startMonth: string;
  // YYYY-MM. null = se repite todos los meses (S5-19)
  endMonth: string | null;
  pendingChanges: MissionPendingChanges | null;
  status: MissionStatus;
  createdAt: Date;
  updatedAt: Date;
};

// §2.2: "En curso" si el mes actual está en su vigencia, "Próxima" si empieza más adelante y
// "Finalizada" si su último mes ya pasó. Los meses son YYYY-MM: el orden de los textos es el de los
// meses.
export function missionPhase(startMonth: string, endMonth: string | null, currentMonth: string): MissionPhase {
  if (startMonth > currentMonth) return 'UPCOMING';
  if (endMonth !== null && endMonth < currentMonth) return 'FINISHED';
  return 'RUNNING';
}

// "YYYY-MM" corrido `offset` meses (US-29: "rige desde el mes siguiente")
export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

// Lo que la edición difiere al mes siguiente si la misión ya tiene clientes en el mes (S5-20) y lo que
// cada asignación copia como snapshot
export type MissionObjective = Pick<
  Mission,
  'objectiveType' | 'target' | 'daysOfWeek' | 'timeFrom' | 'timeTo' | 'rewardPoints'
>;

export function objectiveOf(source: MissionObjective): MissionObjective {
  return {
    objectiveType: source.objectiveType,
    target: source.target,
    daysOfWeek: source.daysOfWeek,
    timeFrom: source.timeFrom,
    timeTo: source.timeTo,
    rewardPoints: source.rewardPoints,
  };
}

const sameDays = (a: number[] | null, b: number[] | null): boolean =>
  a === null || b === null ? a === b : a.length === b.length && a.every((day, index) => day === b[index]);

export function sameObjective(a: MissionObjective, b: MissionObjective): boolean {
  return (
    a.objectiveType === b.objectiveType &&
    a.target === b.target &&
    sameDays(a.daysOfWeek, b.daysOfWeek) &&
    a.timeFrom === b.timeFrom &&
    a.timeTo === b.timeTo &&
    a.rewardPoints === b.rewardPoints
  );
}

// §3.1.4 a §3.1.7 y §3.3.3: una dada de baja (o una asignación ajena) tampoco existe. Sin code (§5).
export const MISSION_NOT_FOUND_MESSAGE = 'No existe la misión.';
