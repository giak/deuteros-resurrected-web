/**
 * Orchestrateur de tick journalier — ordre GameCore.cs :
 * 1. Événements/scénario · 2. Recherche · 3. Production · 4. UpdateShips
 * 5. BuildDrones (ennemis) · 6. MTX · 7. Navigation · 8. Combat.
 */
import type { DayTickResult, GameState } from './types';
import { createRng } from './rng';
import { updateResearch } from './research';
import { updateProduction } from './production';
import { updateMining } from './mining';
import { updateEnemyBuild } from './enemy';
import { updateTraining } from './staff';
import { battleRound } from './combat';

/**
 * Avance la simulation d'un jour. La même instance `state` est mutée ;
 * un résultat lisible est retourné pour l'UI (news, animations).
 */
export function dayTick(state: GameState): DayTickResult {
  const result: DayTickResult = {
    day: state.day,
    produced: [],
    researchFinished: null,
    enemyDronesBuilt: 0,
    battlesResolved: [],
  };

  const rng = createRng(state.seed ^ (state.day * 0x9e3779b9));

  // 2. Recherche (1 seul projet, équipe Terre)
  const finished = updateResearch(state, state.planets.earth.researchTeam ?? null);
  if (finished) result.researchFinished = finished;

  // 3. Production + minage : chaque corps actif
  for (const planet of Object.values(state.planets)) {
    const active = planet.factory.currentItemId !== null || planet.derricks > 0 || planet.baseBuildParts > 0;
    if (!active) continue;

    const done = updateProduction(planet);
    if (done) result.produced.push({ planetId: planet.id, itemId: done });

    updateMining(planet, state.day, rng);
  }

  // 4bis. Formation (durées 24 j — résolue au passage de jour)
  updateTraining(state, (type, count) => {
    if (type === 'production') {
      const b = state.planets.earth.factory.builder;
      if (b) b.count += count;
      else state.planets.earth.factory.builder = { type: 'production', count, actionsTaken: 0 };
    } else if (type === 'research') {
      const r = state.planets.earth.researchTeam;
      if (r) r.count += count;
      else state.planets.earth.researchTeam = { type: 'research', count, actionsTaken: 0 };
    }
    // marines : hors v0 (spec §9) — la promotion rejoint le réservoir d'affectation UI
  });

  // 5. Ennemis
  result.enemyDronesBuilt = updateEnemyBuild(state);

  // 8. Combat (rounds journaliers)
  for (const battle of state.battles) {
    battleRound(battle, rng);
    if (battle.ended) result.battlesResolved.push(battle);
  }
  state.battles = state.battles.filter((b) => !b.ended);

  state.day += 1;
  result.day = state.day;
  return result;
}
