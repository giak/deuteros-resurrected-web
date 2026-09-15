/**
 * Combat — BattleLogic.cs (fidèle au code du remake).
 * Power = (pilotLevel + 4) × ships ; résolution par ratio via battleFactors
 * (factor = min(7, ratio) × 8 + rand(8)) ; PTL : −100 fuel, dégâts rand(2..129).
 */
import { BATTLE_FACTORS, SIM_CONFIG } from './config';
import type { Battle, Fleet } from './types';
import type { Rng } from './rng';
import { randInt } from './rng';

/** Power = (Pilot.Level + 4) × DroneCount (BattleLogic.cs:132-139). */
export function fleetPower(level: number, ships: number): number {
  return (level + SIM_CONFIG.BATTLE_POWER_LEVEL_BONUS) * ships;
}

/** Prépare une instance de combat (StartBattle). */
export function startBattle(player: Fleet, enemy: Fleet, enemyFleeLevel: number): Battle {
  const level = (f: Fleet) => f.pilotLevel; // rang déjà dérivé côté flotte
  const b: Battle = {
    p1: { fleetId: player.id, ships: player.droneCount, power: 0, level: level(player) },
    p2: { fleetId: enemy.id, ships: enemy.droneCount, power: 0, level: level(enemy) },
    p1Counter: 0,
    p2Counter: 0,
    p1Fleeing: false,
    p2Fleeing: false,
    enemyFleeLevel,
    ptlFired: false,
    ended: false,
  };
  b.p1.power = fleetPower(b.p1.level, b.p1.ships);
  b.p2.power = fleetPower(b.p2.level, b.p2.ships);
  return b;
}

/** Un round de combat (FleetsInBattle) — applique les compteurs et pertes. */
export function battleRound(b: Battle, rng: Rng): void {
  if (b.ended) return;

  // Traites en cours (positions animées dans l'original — sans effet ici)
  if (b.p1Fleeing || b.p2Fleeing) {
    b.ended = true;
    return;
  }

  // Tir PTL (ProcessPTL : Counter==37 → dégâts)
  if (b.ptlFired && b.p1Counter === 0 && b.p2Counter === 0) {
    const rnd = randInt(rng, 128) + 2; // rand(2..129)
    b.p2.ships = b.p2.ships < rnd ? 2 : b.p2.ships - rnd;
    let rnd2 = randInt(rng, SIM_CONFIG.PTL_SELF_DAMAGE_MAX);
    while (rnd2 > rnd) rnd2 = Math.floor(rnd2 / 2);
    b.p1.ships = b.p1.ships < rnd2 ? 2 : b.p1.ships - rnd2;
    b.p1Counter = 10;
    b.p2Counter = 10;
    b.ended = b.p1.ships <= 0 || b.p2.ships <= 0;
    return;
  }

  // Définition des compteurs de round (d'après les ratios de puissance)
  if (b.p1Counter === 0 && b.p2Counter === 0) {
    let factor1 = 0;
    let factor2 = 0;
    if (b.p2.power > b.p1.power) {
      factor1 = Math.floor((b.p2.power + 1) / (b.p1.power + 1));
      if (factor1 === 1) factor1 = 0;
    } else {
      factor2 = Math.floor((b.p1.power + 1) / (b.p2.power + 1));
      if (factor2 === 1) factor2 = 0;
    }
    factor1 = Math.min(factor1, SIM_CONFIG.BATTLE_FACTOR_CAP);
    factor2 = Math.min(factor2, SIM_CONFIG.BATTLE_FACTOR_CAP);
    const idx1 = factor1 * SIM_CONFIG.BATTLE_FACTOR_ROWS + randInt(rng, 8);
    const idx2 = factor2 * SIM_CONFIG.BATTLE_FACTOR_ROWS + randInt(rng, 8);
    b.p1Counter = BATTLE_FACTORS[idx1] ?? 1;
    b.p2Counter = BATTLE_FACTORS[idx2] ?? 1;
    // L'armée en infériorité voit son compteur réduit de moitié (+1) — plus fragile
    if (b.p2.power > b.p1.power) b.p1Counter = Math.floor(b.p1Counter / 2) + 1;
    if (b.p1.power >= b.p2.power) b.p2Counter = Math.floor(b.p2Counter / 2) + 1;
  }

  // Application des résultats de round (ApplyRoundResults)
  if (b.p1Counter > 0) {
    b.p1Counter -= 1;
    if (b.p1Counter === 0) {
      b.p1.ships -= 1;
      b.p1.power = fleetPower(b.p1.level, b.p1.ships);
    }
  }
  if (b.p2Counter > 0) {
    b.p2Counter -= 1;
    if (b.p2Counter === 0) {
      b.p2.ships -= 1;
      b.p2.power = fleetPower(b.p2.level, b.p2.ships);
      if (b.p2.ships <= b.enemyFleeLevel) b.p2Fleeing = true;
    }
  }

  b.ended = b.p1.ships <= 0 || b.p2.ships <= 0 || b.p1Fleeing || b.p2Fleeing;
}

/** Coût et effet du tir PTL (LaunchPTL + ProcessPTL). */
export function firePtl(b: Battle, fleet: Fleet): boolean {
  if (b.ended || b.ptlFired || fleet.fuel <= SIM_CONFIG.PTL_FUEL_COST) return false;
  fleet.fuel -= SIM_CONFIG.PTL_FUEL_COST;
  b.ptlFired = true;
  b.p1Counter = 100; // délai avant impact (37 ticks d'animation + 10)
  b.p2Counter = 100;
  return true;
}
