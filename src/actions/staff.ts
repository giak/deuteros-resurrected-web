import { SIM_CONFIG } from '@/simulation/config';
import { canTrain, startTraining } from '@/simulation/staff';
import type { Action, ValidationResult } from './types';
import { pushBulletin } from './types';

export const trainStaff: Action<{ type: 'research' | 'production'; count: number }> = {
  label: 'trainStaff',
  validate(state, { type, count }): ValidationResult {
    if (count <= 0) return { ok: false, reason: 'invalid_count' };
    if (count > SIM_CONFIG.STAFF_TRAINING_SIMULTANEOUS[type]) return { ok: false, reason: 'capacity_exceeded' };
    if (!canTrain(state, type, count)) return { ok: false, reason: 'other_type_training' };
    if (count > state.training.reservoir) return { ok: false, reason: 'insufficient_reservoir' };
    return { ok: true };
  },
  execute(state, { type, count }) {
    startTraining(state, type, count);
    pushBulletin(state, `Formation ${type} : ${count} recrues (24 j).`);
  },
};
