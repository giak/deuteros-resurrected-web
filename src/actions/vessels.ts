/**
 * Actions transport jouable (spec §4.2) : construire un vaisseau, ravitailler,
 * expédier une cargaison. Même patron Action que mining.ts : validate → execute.
 */
import { pushBulletin } from './types';
import type { Action, ValidationResult } from './types';
import { VESSEL_BY_ID, getVessel, getItem, getBody, BODY_BY_ID } from '@/simulation/data';
import { travelDays } from '@/simulation/travel';
import {
  cargoSlotKind, cargoUnitMass, fuelCost, loadedMass, planSupplyLoad, planToolLoad, vesselArrivalDay,
} from '@/simulation/vessels';
import type { GameState, ResourceId, SlotKind, VesselRuntime } from '@/simulation';

export interface BuildVesselArgs {
  planetId: string;
  templateId: string;
  pods?: SlotKind[];
}

export interface SendCargoArgs {
  vesselId: string;
  itemId: string;
  quantity: number;
  toPlanetId: string;
}

const POD_ITEM: Record<'supply' | 'tool', string> = { supply: 'supply_pod', tool: 'tool_pod' };
const IOS_MOUNTS: SlotKind[] = ['tool', 'supply', 'supply'];

/** Garde de type : genre de pod fabriqué (cryo n'est jamais monté à la construction). */
function isPodKind(kind: SlotKind): kind is 'supply' | 'tool' {
  return kind === 'supply' || kind === 'tool';
}

function findVessel(state: GameState, id: string): VesselRuntime | undefined {
  return state.vessels.find((v) => v.id === id);
}

function nextVesselId(state: GameState, templateId: string): string {
  const n = state.vessels.filter((v) => v.templateId === templateId).length + 1;
  return `${templateId}-${n}`;
}

export const buildVessel: Action<BuildVesselArgs> = {
  label: 'buildVessel',
  validate(state, args): ValidationResult {
    const def = VESSEL_BY_ID[args.templateId];
    if (!def) return { ok: false, reason: 'vessel_not_found' };
    const planet = state.planets[args.planetId];
    if (!planet) return { ok: false, reason: 'unknown_planet' };

    const mounts: SlotKind[] = def.travel
      ? (args.pods && args.pods.length > 0 ? args.pods : ['supply'])
      : IOS_MOUNTS;
    if (mounts.length > def.slotTotal) return { ok: false, reason: 'invalid_pods' };
    for (const kind of mounts) {
      if (!isPodKind(kind) || (def.slots[kind] ?? 0) <= 0) return { ok: false, reason: 'invalid_pods' };
    }

    const needOrbit = getItem(def.build.chassis).orbitOnly;
    if (needOrbit && !planet.factory.inOrbit) return { ok: false, reason: 'orbit_required' };

    const required: string[] = [def.build.chassis, def.build.drive];
    // Tout élément de `mounts` a passé la validation ci-dessus (cryo → invalid_pods).
    for (const kind of mounts.filter(isPodKind)) required.push(POD_ITEM[kind]);
    for (const part of required) {
      if ((planet.items[part] ?? 0) < 1) return { ok: false, reason: 'missing_parts' };
    }
    return { ok: true };
  },
  execute(state, args) {
    const def = getVessel(args.templateId);
    const planet = state.planets[args.planetId];
    const mounts: SlotKind[] = def.travel
      ? (args.pods && args.pods.length > 0 ? args.pods : ['supply'])
      : IOS_MOUNTS;

    for (const part of [def.build.chassis, def.build.drive]) planet.items[part] -= 1;
    for (const kind of mounts) {
      if (isPodKind(kind)) planet.items[POD_ITEM[kind]] -= 1;
    }

    const vessel: VesselRuntime = {
      id: nextVesselId(state, args.templateId),
      templateId: args.templateId,
      planetId: args.planetId,
      inOrbit: getItem(def.build.chassis).orbitOnly,
      state: 'docked',
      slots: mounts.map((kind) => ({ kind, itemId: null, quantity: 0 })),
      fuel: 0,
      fuelType: def.fuelType,
      mission: null,
      health: 100,
    };
    state.vessels.push(vessel);
    pushBulletin(state, `${def.name} construite sur ${BODY_BY_ID[args.planetId].name}.`);
  },
};

export const refuel: Action<{ vesselId: string }> = {
  label: 'refuel',
  validate(state, args): ValidationResult {
    const vessel = findVessel(state, args.vesselId);
    if (!vessel) return { ok: false, reason: 'vessel_not_found' };
    if (vessel.state !== 'docked') return { ok: false, reason: 'vessel_not_docked' };
    const def = getVessel(vessel.templateId);
    if (vessel.fuel >= def.tankCap) return { ok: false, reason: 'tank_full' };
    if ((state.planets[vessel.planetId].items[vessel.fuelType] ?? 0) < 1) {
      return { ok: false, reason: 'no_fuel_stock' };
    }
    return { ok: true };
  },
  execute(state, args) {
    const vessel = findVessel(state, args.vesselId)!;
    const def = getVessel(vessel.templateId);
    const items = state.planets[vessel.planetId].items;
    const stock = items[vessel.fuelType] ?? 0;
    const amount = Math.min(def.tankCap - vessel.fuel, stock);
    items[vessel.fuelType] = stock - amount;
    vessel.fuel += amount;
    pushBulletin(state, `${getVessel(vessel.templateId).name} ravitaillée : +${amount} ${vessel.fuelType}.`);
  },
};

export const sendCargo: Action<SendCargoArgs> = {
  label: 'sendCargo',
  validate(state, args): ValidationResult {
    const vessel = findVessel(state, args.vesselId);
    if (!vessel) return { ok: false, reason: 'vessel_not_found' };
    if (vessel.state !== 'docked') return { ok: false, reason: 'vessel_not_docked' };
    if (!state.planets[args.toPlanetId]) return { ok: false, reason: 'unknown_destination' };
    if (args.toPlanetId === vessel.planetId) return { ok: false, reason: 'same_planet' };

    const kind = cargoSlotKind(args.itemId);
    if (!kind) return { ok: false, reason: 'not_carriable' };

    const here = state.planets[vessel.planetId];
    const stock = kind === 'supply'
      ? (here.stores[args.itemId as ResourceId] ?? 0)
      : (here.items[args.itemId] ?? 0);
    if (args.quantity <= 0) return { ok: false, reason: 'invalid_quantity' };
    if (stock < args.quantity) return { ok: false, reason: 'insufficient_stock' };

    const fromBody = getBody(vessel.planetId);
    const toBody = getBody(args.toPlanetId);
    const def = getVessel(vessel.templateId);
    if (fromBody.starId !== toBody.starId && def.range !== 'interstellar') {
      return { ok: false, reason: 'out_of_range' };
    }

    const plan = kind === 'supply'
      ? planSupplyLoad(vessel, args.itemId, args.quantity)
      : planToolLoad(vessel, args.itemId, args.quantity);
    if (!plan.ok) return plan;

    const distance = travelDays(vessel.planetId, args.toPlanetId);
    const totalMass = loadedMass(vessel)
      + plan.slots.reduce((m, s) => {
        if (s.quantity > 0 && s.itemId) m += s.quantity * cargoUnitMass(s.itemId);
        return m;
      }, 0);
    const cost = fuelCost(distance, totalMass);
    if (vessel.fuel < cost) return { ok: false, reason: 'insufficient_fuel' };
    return { ok: true };
  },
  execute(state, args) {
    const vessel = findVessel(state, args.vesselId)!;
    const here = state.planets[vessel.planetId];
    const kind = cargoSlotKind(args.itemId)!;

    if (kind === 'supply') here.stores[args.itemId as ResourceId] = (here.stores[args.itemId as ResourceId] ?? 0) - args.quantity;
    else here.items[args.itemId] = (here.items[args.itemId] ?? 0) - args.quantity;

    const plan = kind === 'supply'
      ? planSupplyLoad(vessel, args.itemId, args.quantity)
      : planToolLoad(vessel, args.itemId, args.quantity);
    if (plan.ok) {
      let idx = 0;
      for (const ps of plan.slots) {
        const candidates = vessel.slots.filter((s) => s.kind === ps.kind && (s.itemId === null || s.quantity === 0));
        const slot = candidates[idx];
        slot.itemId = ps.itemId;
        slot.quantity = ps.quantity;
        idx++;
      }
    }

    const distance = travelDays(vessel.planetId, args.toPlanetId);
    const totalMass = loadedMass(vessel);
    const cost = fuelCost(distance, totalMass);
    vessel.fuel -= cost;
    vessel.state = 'in_transit';
    vessel.mission = {
      fromPlanetId: vessel.planetId,
      toPlanetId: args.toPlanetId,
      startDay: state.day,
      arrivalDay: vesselArrivalDay(vessel.templateId, vessel.planetId, args.toPlanetId, state.day),
      fuelCost: cost,
    };
    pushBulletin(state, `${getVessel(vessel.templateId).name} en route vers ${BODY_BY_ID[args.toPlanetId].name} (arrivée J${vessel.mission.arrivalDay}).`);
  },
};