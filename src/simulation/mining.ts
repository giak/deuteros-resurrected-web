/**
 * Minage — Planet.cs DayTick (fidèle au code du remake).
 * Conditions : derricks > 0 && baseBuildParts == 2 && !baseDamaged.
 * Terre : jours pairs seulement. Survey : rand(0,8)×mult puis rand(0,32768)×mult & 0x7FFF.
 * Extraction : derricks × rate × jours ; plafond 50 000 ; MTX → station, sinon base.
 */
import { DERRICK_RATE, SIM_CONFIG, SURVEY_MULTIPLIER } from './config';
import type { PlanetRuntime } from './types';
import type { Rng } from './rng';
import { randInt } from './rng';

/** La base peut-elle miner ? */
export function canMine(planet: PlanetRuntime): boolean {
  return planet.derricks > 0 && planet.baseBuildParts === SIM_CONFIG.BASE_BUILD_PARTS && !planet.baseDamaged;
}

/**
 * Un jour de minage/sondage sur un corps. Retourne les quantités extraites
 * (avant routage MTX — le stock destination est déjà mis à jour ici).
 */
export function updateMining(planet: PlanetRuntime, day: number, rng: Rng): Partial<Record<string, number>> {
  const mined: Partial<Record<string, number>> = {};
  if (SIM_CONFIG.EARTH_MINE_EVEN_DAYS_ONLY && planet.id === 'earth' && day % 2 !== 0) return mined;
  if (!canMine(planet)) return mined;

  for (const mat of planet.deposits) {
    if (mat.groundAmount < 1 && mat.surveyTicks === 0) {
      // Nouvelle matière à sonder
      mat.surveyTicks = randInt(rng, SIM_CONFIG.SURVEY_TICKS_MAX) * (SURVEY_MULTIPLIER[mat.resource] ?? 1);
    } else if (mat.groundAmount < 1 && mat.surveyTicks > 0) {
      // Décompte du sondage
      mat.surveyTicks -= 1;
      if (mat.surveyTicks === 0) {
        mat.groundAmount = (randInt(rng, SIM_CONFIG.SURVEY_GROUND_MAX) * (SURVEY_MULTIPLIER[mat.resource] ?? 1)) & 0x7fff;
      }
    } else {
      // Extraction journalière
      const amount = planet.derricks * (DERRICK_RATE[mat.resource] ?? 1);
      mat.groundAmount -= amount;
      // v1 : routage MTX → station orbitale à venir ; les stocks vivent sur la base
      const dest = planet.stores;
      const cur = dest[mat.resource] ?? 0;
      if (cur < SIM_CONFIG.MINE_STOCK_CAP) {
        dest[mat.resource] = cur + amount;
      }
      mined[mat.resource] = (mined[mat.resource] ?? 0) + amount;
    }
  }
  return mined;
}
