import { canStartItem, checkResources, consumeResources, switchItem } from '@/simulation/production';
import type { Action, ValidationResult } from './types';
import { pushBulletin } from './types';

export const queueItem: Action<{ itemId: string }> = {
  label: 'queueItem',
  validate(state, { itemId }): ValidationResult {
    const earth = state.planets.earth;
    if (!earth) return { ok: false, reason: 'unknown_planet' };
    const gate = canStartItem(earth.factory, itemId);
    if (!gate.ok) return gate as ValidationResult;   // 'orbit_only' | 'rank_gate'
    if (!checkResources(earth, itemId)) return { ok: false, reason: 'insufficient_resources' };
    return { ok: true };
  },
  execute(state, { itemId }) {
    const earth = state.planets.earth;
    consumeResources(earth, itemId);                 // fidèle : intrants consommés à la mise en file
    switchItem(earth.factory, itemId);               // (64, complete=1) — travail précédent perdu
    pushBulletin(state, `Production lancée : ${itemId}.`);
  },
};

export const cancelQueueItem: Action<void> = {
  label: 'cancelQueueItem',
  validate(state): ValidationResult {
    return state.planets.earth.factory.currentItemId !== null
      ? { ok: true }
      : { ok: false, reason: 'nothing_in_queue' };
  },
  execute(state) {
    switchItem(state.planets.earth.factory, null);   // travail perdu, pas de remboursement (fidèle)
    pushBulletin(state, 'Production annulée.');
  },
};