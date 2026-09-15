/**
 * Production — Factory.cs IncrementCurrentProd + Production.cs UpdateProduction.
 * v = (count << rank) × multiplier / 801 ; wrap 8 bits à 255.
 * Un item démarre à Production_Value = ResearchValue et Production_Complete = 1
 * (ctor ProductionItem) → 3 wraps effectifs pour atteindre le seuil 4.
 * AOC : v fixe 128, sans équipe ni consommation de ressources.
 */
import { SIM_CONFIG, type ResourceId } from './config';
import { getItem } from './data';
import { getLevel } from './staff';
import type { Factory, PlanetRuntime } from './types';

/** Valeur d'un jour de production (Factory.cs). Retourne 0 si l'usine est à l'arrêt. */
export function dailyProductionValue(factory: Factory, multiplier: number): number {
  if (factory.aoc) return SIM_CONFIG.AOC_RATE;
  if (!factory.builder || factory.builder.count === 0) return 0;
  const rank = getLevel(factory.builder);
  return Math.floor(((factory.builder.count << rank) * multiplier) / SIM_CONFIG.PRODUCTION_DIVISOR);
}

/** Peut-on démarrer cet item sur cette usine ? (gates OrbitOnly + rang, Production.cs) */
export function canStartItem(factory: Factory, itemId: string): { ok: boolean; reason?: string } {
  const item = getItem(itemId);
  if (item.orbitOnly && !factory.inOrbit) return { ok: false, reason: 'orbit_only' };
  if (!factory.aoc && factory.builder && item.techLevel !== undefined && getLevel(factory.builder) < item.techLevel) {
    return { ok: false, reason: 'rank_gate' };
  }
  return { ok: true };
}

/** Ressources disponibles sur le corps pour démarrer l'item ? (sol = base stores) */
export function checkResources(planet: PlanetRuntime, itemId: string): boolean {
  const item = getItem(itemId);
  if (!item.inputs) return true;
  return Object.entries(item.inputs).every(
    ([res, qty]) => (planet.stores[res as ResourceId] ?? 0) >= (qty ?? 0),
  );
}

/** Consomme les inputs de l'item dans les stocks du corps. */
export function consumeResources(planet: PlanetRuntime, itemId: string): void {
  const item = getItem(itemId);
  if (!item.inputs) return;
  for (const [res, qty] of Object.entries(item.inputs)) {
    planet.stores[res as ResourceId] = (planet.stores[res as ResourceId] ?? 0) - (qty ?? 0);
  }
}

/**
 * Un jour de production sur un corps.
 * Retourne l'itemId terminé, ou null.
 */
export function updateProduction(planet: PlanetRuntime): string | null {
  const f = planet.factory;
  if (!f.currentItemId) return null;
  if (!f.aoc && (!f.builder || f.builder.count === 0)) return null;

  const item = getItem(f.currentItemId);
  const v = dailyProductionValue(f, item.researchMultiplier ?? 64);

  f.prodCycle = (f.prodCycle + 1) % SIM_CONFIG.PROD_CYCLE_RESET;

  // Wrap 8 bits (Factory.cs : si dépasse 255 → &= 0xFF, Production_Complete++)
  if (f.productionValue + v > SIM_CONFIG.PRODUCTION_WRAP_THRESHOLD) {
    f.productionValue = (f.productionValue + v) & 0xff;
    if (f.productionComplete < SIM_CONFIG.PRODUCTION_MAX_WRAPS) f.productionComplete += 1;
  } else {
    f.productionValue += v;
  }

  // Item terminé (Production_Complete == 4 → ProductionItem.Complete)
  if (f.productionComplete >= SIM_CONFIG.PRODUCTION_MAX_WRAPS) {
    planet.items[item.id] = (planet.items[item.id] ?? 0) + 1;
    if (!f.aoc && f.builder) f.builder.actionsTaken += 1;
    f.prodCycle = 0;
    const finished = item.id;
    if (item.id === 'a_o_c') {
      // AOC produite : équipe libérée, usine automatisée, 1 seul exemplaire
      f.aoc = true;
      f.builder = null;
      f.currentItemId = null;
    } else {
      f.currentItemId = null;
    }
    f.productionValue = 0;
    f.productionComplete = 0;
    return finished;
  }
  return null;
}

/**
 * Changement d'item (Production.cs) : le travail en cours est perdu — l'item
 * précédent repart de sa charge initiale si réactivé. Le nouvel item démarre à
 * Production_Value = ResearchValue et Production_Complete = 1 (ctor ProductionItem).
 */
export function switchItem(factory: Factory, newItemId: string | null): void {
  if (newItemId !== null) {
    const item = getItem(newItemId);
    factory.currentItemId = newItemId;
    factory.productionValue = item.researchValue ?? 64; // charge initiale de recherche
    factory.productionComplete = 1; // ProductionItem() : Production_Complete = 1
  } else {
    factory.currentItemId = null;
    factory.productionValue = 0;
    factory.productionComplete = 0;
  }
  factory.prodCycle = 0;
}
