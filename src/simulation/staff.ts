/**
 * Personnel & formation — Staff.cs (GetLevel) + CoreData.cs (Training).
 */
import { SIM_CONFIG } from './config';
import type { GameState, Staff, StaffType } from './types';

export type StaffRank = 1 | 2 | 3;

/** Rang courant d'une équipe (Staff.cs GetLevel) — jamais stocké, toujours dérivé. */
export function getLevel(staff: Staff): StaffRank {
  const t = SIM_CONFIG.STAFF_RANK_THRESHOLDS;
  const a = staff.actionsTaken;
  switch (staff.type) {
    case 'research':
      return a >= t.research.professor ? 3 : a >= t.research.doctor ? 2 : 1;
    case 'production':
      return a >= t.production.expert ? 3 : a >= t.production.engineer ? 2 : 1;
    case 'marines':
      return a >= t.marines.admiral ? 3 : a >= t.marines.captain ? 2 : 1;
  }
}

const RANK_NAMES: Record<StaffType, [string, string, string]> = {
  research: ['Technicien', 'Docteur', 'Professeur'],
  production: ['Apprenti', 'Ingénieur', 'Expert'],
  marines: ['Pilote', 'Capitaine', 'Amiral'],
};

export function rankName(staff: Staff): string {
  return RANK_NAMES[staff.type][getLevel(staff) - 1];
}

/**
 * Démarre la formation d'un lot. Un seul type à la fois (Training.cs) :
 * le caller vérifie via `canTrain`.
 */
export function startTraining(state: GameState, type: StaffType, count: number): boolean {
  const t = state.training;
  const max = SIM_CONFIG.STAFF_TRAINING_SIMULTANEOUS[type];
  const capped = Math.min(count, max, t.reservoir);
  if (capped <= 0) return false;
  t.reservoir -= capped;
  t.inTraining[type] += capped;
  t.dayStart[type] = state.day;
  return true;
}

export function canTrain(state: GameState, type: StaffType, count: number): boolean {
  const t = state.training;
  const busy = (t.inTraining.research > 0 ? 1 : 0) + (t.inTraining.production > 0 ? 1 : 0) + (t.inTraining.marines > 0 ? 1 : 0);
  const otherTypeBusy = Object.entries(t.inTraining).some(([k, v]) => k !== type && v > 0);
  return !otherTypeBusy && busy === 0 && count <= SIM_CONFIG.STAFF_TRAINING_SIMULTANEOUS[type] && count <= t.reservoir;
}

/** Résout la formation : termine les promotions arrivées à échéance (24 j). */
export function updateTraining(state: GameState, assign: (type: StaffType, count: number) => void): void {
  const t = state.training;
  for (const type of ['research', 'production', 'marines'] as const) {
    const n = t.inTraining[type];
    if (n > 0 && state.day - t.dayStart[type] >= SIM_CONFIG.STAFF_TRAINING_DAYS) {
      t.inTraining[type] = 0;
      assign(type, n);
    }
  }
}
