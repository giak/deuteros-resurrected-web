/**
 * Logique transport pods/slots (spec 2026-09-18-vessels-transport-design.md §4).
 * Fonctions pures consommées par les actions (Task 4) et le moteur (Task 5).
 */
import { SIM_CONFIG } from './config';
import { ITEM_BY_ID, RESOURCE_BY_ID, getVessel } from './data';
import { travelDays } from './travel';
import type { CargoSlot, SlotKind, VesselRuntime } from './types';

/** Masse unitaire d'une cargaison : ressource = 1 t/unité, item = ItemDef.mass. */
export function cargoUnitMass(itemId: string): number {
  const res = RESOURCE_BY_ID[itemId];
  if (res) return res.mass;
  const it = ITEM_BY_ID[itemId];
  if (it) return it.mass;
  throw new Error(`Cargaison inconnue : ${itemId}`);
}

/**
 * Type d'emplacement requis pour une cargaison :
 * ressource brute/précieuse → 'supply' ; item à flag toolPod → 'tool' ; sinon null.
 */
export function cargoSlotKind(itemId: string): SlotKind | null {
  const res = RESOURCE_BY_ID[itemId];
  if (res && res.type !== 'compound_fuel') return 'supply';
  const it = ITEM_BY_ID[itemId];
  if (it && it.toolPod) return 'tool';
  return null;
}

/** Masse actuellement chargée (t). */
export function loadedMass(vessel: VesselRuntime): number {
  return vessel.slots.reduce(
    (sum, s) => (s.quantity > 0 && s.itemId ? sum + s.quantity * cargoUnitMass(s.itemId) : sum),
    0,
  );
}

/** Carburant requis : max(1, ceil(distance × (100 + masse) / 100)). */
export function fuelCost(distance: number, mass: number): number {
  return Math.max(1, Math.ceil((distance * (SIM_CONFIG.FUEL_MASS_FACTOR + mass)) / SIM_CONFIG.FUEL_MASS_FACTOR));
}

/** Emplacements libres (itemId null ou quantité 0) d'un type donné. */
export function emptySlots(vessel: VesselRuntime, kind: SlotKind): CargoSlot[] {
  return vessel.slots.filter((s) => s.kind === kind && (s.itemId === null || s.quantity === 0));
}

/**
 * Plan de chargement d'une ressource (supply) : remplit des emplacements vides
 * ≤ 250 chacun, charge EXACTEMENT `quantity`, masse totale ≤ capacité. Sinon raison.
 */
export function planSupplyLoad(
  vessel: VesselRuntime,
  itemId: string,
  quantity: number,
): { ok: true; slots: CargoSlot[] } | { ok: false; reason: string } {
  const def = getVessel(vessel.templateId);
  const free = emptySlots(vessel, 'supply');
  if (free.length === 0) return { ok: false, reason: 'no_supply_slots' };
  const perSlot = SIM_CONFIG.SUPPLY_SLOT_MAX; // 250 max par emplacement supply
  const headroom = def.capacity - loadedMass(vessel);
  if (quantity > Math.floor(headroom / cargoUnitMass(itemId))) {
    return { ok: false, reason: 'no_capacity' };
  }
  const slots: CargoSlot[] = [];
  let remaining = quantity;
  for (let i = 0; i < free.length && remaining > 0; i++) {
    const fill = Math.min(remaining, perSlot);
    slots.push({ kind: 'supply', itemId, quantity: fill });
    remaining -= fill;
  }
  if (remaining > 0) return { ok: false, reason: 'no_capacity' };
  return { ok: true, slots };
}

/**
 * Plan de chargement d'un item (tool) : un emplacement tool, `quantity` items,
 * masse totale ≤ capacité ; renvoie la quantité maximale sinon. Exactitude exigée.
 */
export function planToolLoad(
  vessel: VesselRuntime,
  itemId: string,
  quantity: number,
): { ok: true; slots: CargoSlot[] } | { ok: false; reason: string } {
  const def = getVessel(vessel.templateId);
  const free = emptySlots(vessel, 'tool');
  if (free.length === 0) return { ok: false, reason: 'no_tool_slots' };
  const headroom = def.capacity - loadedMass(vessel);
  const per = Math.floor(headroom / cargoUnitMass(itemId));
  if (quantity > per) return { ok: false, reason: 'no_capacity' };
  return { ok: true, slots: [{ kind: 'tool', itemId, quantity }] };
}

/** Jour d'arrivée inclus : startDay + manœuvres (takeoff + land si navette) + trajet. */
export function vesselArrivalDay(
  templateId: string,
  fromPlanetId: string,
  toPlanetId: string,
  startDay: number,
): number {
  const def = getVessel(templateId);
  const travel = travelDays(fromPlanetId, toPlanetId);
  if (def.travel) return startDay + def.travel.takeoffDays + travel + def.travel.landDays;
  return startDay + travel;
}