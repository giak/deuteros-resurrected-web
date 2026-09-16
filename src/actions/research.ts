import { ITEM_BY_ID } from '@/simulation/data';
import { canSelect } from '@/simulation/research';
import type { Action, ValidationResult } from './types';
import { pushBulletin } from './types';

export const selectResearch: Action<{ itemId: string }> = {
  label: 'selectResearch',
  validate(state, { itemId }): ValidationResult {
    if (!ITEM_BY_ID[itemId]) return { ok: false, reason: 'not_researchable' };
    if (canSelect(state.research, itemId)) return { ok: true };
    const p = state.research.progress[itemId];
    if (!p) return { ok: false, reason: 'not_researchable' };
    return p.researched ? { ok: false, reason: 'already_researched' } : { ok: false, reason: 'locked' };
  },
  execute(state, { itemId }) {
    state.research.currentItemId = itemId;   // re-sélection = changement de projet, progression conservée
    pushBulletin(state, `Projet de recherche : ${itemId}.`);
  },
};