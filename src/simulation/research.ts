/**
 * Recherche — Research.cs UpdateResearch (fidèle au code du remake).
 * 1 seul projet courant ; gate par rang du chef ; v = (teamSize << level) × mult / 801 ;
 * wrap 8 bits → +11 % par wrap, plafonné 100 ; à 100 % item débloqué.
 */
import { SIM_CONFIG } from './config';
import { getItem } from './data';
import { getLevel } from './staff';
import type { GameState, ResearchState, Staff } from './types';

/** Peut-on sélectionner cet item comme projet courant ? */
export function canSelect(research: ResearchState, itemId: string): boolean {
  const it = getItem(itemId);
  if (it.researchIndex === undefined) return false;
  const p = research.progress[itemId];
  return !!p && !p.locked && !p.researched;
}

/**
 * Un jour de recherche. `staff` = équipe de recherche de la Terre (peut être null).
 * Retourne l'itemId terminé, ou null.
 */
export function updateResearch(state: GameState, staff: Staff | null): string | null {
  const research = state.research;
  const id = research.currentItemId;
  if (!id) return null;

  const item = getItem(id);
  if (item.researchIndex === undefined) return null;
  const p = research.progress[id];
  if (!p || p.researched) return null;

  // Pas d'équipe au démarrage du jeu : rien (Research.cs)
  if (!staff || staff.count === 0) return null;

  const level = getLevel(staff);
  if (level < (item.techLevel ?? 0)) return null; // gate « Team Leader Is Not Qualified »

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
    return id;
  }
  return null;
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
