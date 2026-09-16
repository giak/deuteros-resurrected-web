import type { Action, ValidationResult } from './types';
import { pushBulletin } from './types';

export const installDerrick: Action<void> = {
  label: 'installDerrick',
  validate(state): ValidationResult {
    return (state.planets.earth.items['derrick'] ?? 0) >= 1
      ? { ok: true }
      : { ok: false, reason: 'no_derrick_in_store' };
  },
  execute(state) {
    const earth = state.planets.earth;
    earth.items['derrick'] -= 1;
    earth.derricks += 1;
    pushBulletin(state, `Derrick installé (total : ${earth.derricks}).`);
  },
};
