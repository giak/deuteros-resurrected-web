/**
 * Orchestrateur de tick journalier — ordre GameCore.cs :
 * 1. Événements/scénario · 2. Recherche · 3. Production · 4. UpdateShips
 * 5. BuildDrones (ennemis) · 6. MTX · 7. Navigation · 8. Combat.
 */
import type { DayTickResult, GameState } from './types';
import type { ResourceId } from './config';
import { SIM_CONFIG } from './config';
import { RESOURCE_BY_ID, getBody, getVessel } from './data';
import { createRng } from './rng';
import { updateResearch } from './research';
import { updateProduction } from './production';
import { updateMining } from './mining';
import { updateEnemyBuild } from './enemy';
import { updateTraining } from './staff';
import { battleRound } from './combat';

/**
 * Avance la simulation d'un jour. La même instance `state` est mutée ;
 * un résultat lisible est retourné pour l'UI (news, animations, trace).
 * `journal` contient les lignes de trace, préfixées `[J<day>]` avec `<day>`
 * = jour simulé (pré-incrément). Ordre des phases : recherche, production,
 * minage, formation, ennemis, combat (GameCore.cs).
 */
export function dayTick(state: GameState): DayTickResult {
  const day = state.day; // jour simulé (pré-incrément)
  const result: DayTickResult = {
    day: state.day,
    produced: [],
    researchFinished: null,
    enemyDronesBuilt: 0,
    battlesResolved: [],
    trainingFinished: [],
    arrived: [],
    journal: [],
  };
  const journal = result.journal;

  const rng = createRng(state.seed ^ (state.day * 0x9e3779b9));

  // 2. Recherche (1 seul projet, équipe Terre)
  const research = updateResearch(state, state.planets.earth.researchTeam);
  if (research.finished) {
    result.researchFinished = research.finished;
    journal.push(`[J${day}] recherche achevée : ${research.finished}.`);
  } else if (research.blocked && research.progress) {
    journal.push(`[J${day}] recherche ${research.progress.itemId} — bloquée.`);
  } else if (research.progress) {
    journal.push(`[J${day}] recherche ${research.progress.itemId} — ${research.progress.percentage}%.`);
  }

  // 3. Production + minage : chaque corps actif
  for (const planet of Object.values(state.planets)) {
    const active = planet.factory.currentItemId !== null || planet.derricks > 0 || planet.baseBuildParts > 0;
    if (!active) continue;

    const prod = updateProduction(planet);
    if (prod.finished) {
      result.produced.push({ planetId: planet.id, itemId: prod.finished });
      journal.push(`[J${day}] production ${prod.finished} → terminée (wraps ${prod.wraps}, valeur ${prod.value}).`);
    } else if (prod.itemId) {
      if (prod.blocked) {
        journal.push(`[J${day}] production ${prod.itemId} → bloquée (pas d'équipe).`);
      } else {
        journal.push(`[J${day}] production ${prod.itemId} — valeur ${prod.value}/${SIM_CONFIG.PRODUCTION_WRAP_THRESHOLD} wrap ${prod.wraps}.`);
      }
    }

    const mined = updateMining(planet, state.day, rng);
    for (const [res, amount] of Object.entries(mined)) {
      journal.push(`[J${day}] minage ${planet.id} ${res} +${amount}.`);
    }
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
    journal.push(`[J${day}] formation ${type} : +${count} recrues.`);
    result.trainingFinished.push({ type, count });
  });

  // 5. Ennemis
  result.enemyDronesBuilt = updateEnemyBuild(state);
  if (result.enemyDronesBuilt > 0) {
    journal.push(`[J${day}] ennemis : ${result.enemyDronesBuilt} drones construits.`);
  }

  // 6. Navigation — arrivées des vaisseaux joueurs (spec transport §4.4)
  for (const vessel of state.vessels) {
    if (vessel.mission && state.day >= vessel.mission.arrivalDay) {
      const dest = state.planets[vessel.mission.toPlanetId];
      for (const slot of vessel.slots) {
        if (slot.quantity > 0 && slot.itemId) {
          if (RESOURCE_BY_ID[slot.itemId]) {
            const cur = dest.stores[slot.itemId as ResourceId] ?? 0;
            dest.stores[slot.itemId as ResourceId] = Math.min(SIM_CONFIG.MINE_STOCK_CAP, cur + slot.quantity);
          } else {
            dest.items[slot.itemId] = (dest.items[slot.itemId] ?? 0) + slot.quantity;
          }
          slot.itemId = null;
          slot.quantity = 0;
        }
      }
      vessel.state = 'docked';
      vessel.planetId = dest.id;
      vessel.mission = null;
      result.arrived.push({ vesselId: vessel.id, planetId: dest.id });
      journal.push(`[J${day}] arrivée : ${getVessel(vessel.templateId).name} sur ${getBody(dest.id).name}.`);
    }
  }

  // 8. Combat (rounds journaliers)
  for (const battle of state.battles) {
    battleRound(battle, rng);
    if (battle.ended) {
      result.battlesResolved.push(battle);
      journal.push(`[J${day}] combat terminé : ${battle.p1.fleetId} vs ${battle.p2.fleetId}.`);
    }
  }
  state.battles = state.battles.filter((b) => !b.ended);

  state.day += 1;
  result.day = state.day;
  return result;
}
