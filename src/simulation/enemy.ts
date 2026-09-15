/**
 * Ennemis — EnemyDroneBuilder.cs BuildDrones + EnemyFleets.cs (fidèle au code).
 * Fréquences de build en jours = hex/100 (index = systèmes reconquis).
 * +2 drones par colonie active (cap 200), attaque = travel + rand(63) + 1.
 */
import { SIM_CONFIG } from './config';
import { SYSTEMS, getBody } from './data';
import type { GameState, Fleet } from './types';
import type { Rng } from './rng';
import { randInt } from './rng';

/** Prochain jour de build ennemi (EnemyBuildDay = currentDay + freq/100). */
export function nextEnemyBuildDay(state: GameState, currentDay: number): number {
  const idx = Math.min(state.starSystemsCaptured, SIM_CONFIG.ENEMY_BUILD_FREQUENCIES_DAYS.length - 1);
  return currentDay + SIM_CONFIG.ENEMY_BUILD_FREQUENCIES_DAYS[idx];
}

/**
 * Un jour de build ennemi (quand la guerre est déclarée).
 * Retourne le nombre de drones ajoutés.
 */
export function updateEnemyBuild(state: GameState): number {
  if (!state.atWar) return 0;
  if (state.enemyBuildDay === null || state.day !== state.enemyBuildDay) return 0;

  let added = 0;
  for (const star of SYSTEMS) {
    const colonies = Object.values(state.planets).filter(
      (p) => p.activeMethanoid && getBody(p.id).starId === star.id,
    );
    for (const colony of colonies) {
      const cur = colony.items['ios_drone'] ?? 0;
      if (cur < SIM_CONFIG.ENEMY_DRONE_CAP) {
        colony.items['ios_drone'] = cur + SIM_CONFIG.ENEMY_DRONES_PER_BATCH;
        added += SIM_CONFIG.ENEMY_DRONES_PER_BATCH;
      }
    }
    // La flotte ennemie du système reçoit +2 drones si des colonies sont actives (cap 200)
    const fleet = state.fleets.find((f) => f.methanoidOwned && f.starId === star.id);
    if (fleet && colonies.length > 0) {
      fleet.droneCount = Math.min(fleet.droneCount + 2, SIM_CONFIG.ENEMY_DRONE_CAP);
      added += 2;
    }
  }
  state.enemyBuildDay = nextEnemyBuildDay(state, state.day);
  return added;
}

/**
 * Planifie une attaque ennemie (EnemyFleets.ProcessAttackTrigger) :
 * AttackDay = travelTimeRemain + rand(63) + 1 — conservé dans les flags v1.
 */
export function scheduleAttack(state: GameState, fleet: Fleet, travelDaysRemain: number, rng: Rng): number {
  const attackDay = state.day + travelDaysRemain + randInt(rng, SIM_CONFIG.ENEMY_ATTACK_RANDOM_MAX) + 1;
  state.flags[`attack_day_${fleet.id}`] = true;
  state.flags[`attack_eta_${fleet.id}`] = false;
  return attackDay;
}

/** Le joueur reconquiert un système → fréquence de build suivante (plus agressive). */
export function onSystemRecaptured(state: GameState): void {
  state.starSystemsCaptured = Math.min(
    state.starSystemsCaptured + 1,
    SIM_CONFIG.ENEMY_BUILD_FREQUENCIES_DAYS.length - 1,
  );
}
