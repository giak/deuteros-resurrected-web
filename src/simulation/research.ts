/**
 * Recherche — Research.cs UpdateResearch (fidèle au code du remake).
 * 1 seul projet courant ; gate par rang du chef ; v = (teamSize << level) × mult / 801 ;
 * wrap 8 bits → +11 % par wrap, plafonné 100 ; à 100 % item débloqué.
 */
import { SIM_CONFIG } from './config';
import { getItem } from './data';
import { getLevel } from './staff';
import type { GameState, ResearchDayResult, ResearchState, Staff } from './types';

/** Peut-on sélectionner cet item comme projet courant ? */
export function canSelect(research: ResearchState, itemId: string): boolean {
  const it = getItem(itemId);
  if (it.researchIndex === undefined) return false;
  const p = research.progress[itemId];
  return !!p && !p.locked && !p.researched;
}

/**
 * Un jour de recherche. `staff` = équipe de recherche de la Terre (peut être null).
 * Retour enrichi : item terminé, progression courante, blocage sans équipe/rang.
 */
export function updateResearch(state: GameState, staff: Staff | null): ResearchDayResult {
  const research = state.research;
  const id = research.currentItemId;
  if (!id) return { finished: null, progress: null, blocked: false };

  const item = getItem(id);
  if (item.researchIndex === undefined) return { finished: null, progress: null, blocked: false };
  const p = research.progress[id];
  if (!p || p.researched) return { finished: null, progress: null, blocked: false };

  // Projet actif mais non progressé : pas d'équipe / rang insuffisant
  if (!staff || staff.count === 0) {
    return { finished: null, progress: { itemId: id, percentage: p.percentage }, blocked: true };
  }
  const level = getLevel(staff);
  if (level < (item.techLevel ?? 0)) {
    return { finished: null, progress: { itemId: id, percentage: p.percentage }, blocked: true };
  }

  const v = Math.floor(((staff.count << level) * (item.researchMultiplier ?? 64)) / SIM_CONFIG.RESEARCH_DIVISOR);

  if (p.researchValue + v > SIM_CONFIG.RESEARCH_WRAP_THRESHOLD) {
    p.researchValue = (p.researchValue + v) & 0xff; // wraparound 8 bits
    if (p.percentage < SIM_CONFIG.RESEARCH_MAX_PERCENTAGE) {
      p.percentage = Math.min(100, p.percentage + SIM_CONFIG.RESEARCH_WRAP_INCREMENT);
    }
  } else {
    p.researchValue += v;
  }

  if (p.percentage >= SIM_CONFIG.RESEARCH_MAX_PERCENTAGE) {
    p.researched = true;
    p.researchOrder =
      Object.values(research.progress).filter((x) => x.researched).length;
    staff.actionsTaken += 1;
    return { finished: id, progress: null, blocked: false };
  }
  return { finished: null, progress: { itemId: id, percentage: p.percentage }, blocked: false };
}

/** Initialise les progressions de recherche pour tous les items recherchables. */
export function initResearchProgress(research: ResearchState): void {
  for (const it of Object.values(research.progress)) {
    it.researched = false;
    it.researchValue = 64; // défaut ResearchItem() du remake
    it.percentage = 1; // ResearchPercentageComplete initial = 1
    it.researchOrder = 0;
  }
}
