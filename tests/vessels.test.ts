import { describe, expect, it } from 'vitest';
import { createInitialState, RESOURCE_BY_ID } from '@/simulation';
import {
  cargoUnitMass, cargoSlotKind, fuelCost, loadedMass, emptySlots,
  planSupplyLoad, planToolLoad, vesselArrivalDay,
} from '@/simulation/vessels';

const shuttle = () => createInitialState(1).vessels[0];

describe('cargo (spec transport §3.0/§4.2.3)', () => {
  it('ressource brute → supply, item toolPod → tool, autre → null', () => {
    expect(cargoSlotKind('iron')).toBe('supply');
    expect(cargoSlotKind('derrick')).toBe('tool');
    expect(cargoSlotKind('meh_fuel')).toBeNull();   // carburant non transportable
    expect(cargoSlotKind('supply_pod')).toBeNull(); // pod non transportable
  });

  it('masse : ressource 1 t/unité, item = ItemDef.mass', () => {
    expect(cargoUnitMass('iron')).toBe(1);
    expect(cargoUnitMass('derrick')).toBe(8);
    expect(cargoUnitMass('meh_fuel')).toBe(RESOURCE_BY_ID['meh_fuel'].mass);
  });
});

describe('fuelCost (spec §4.5)', () => {
  it('à vide, vaut la distance', () => {
    expect(fuelCost(1, 0)).toBe(1);
    expect(fuelCost(7, 0)).toBe(7);
  });
  it('à pleine charge (masse = facteur), double la distance', () => {
    expect(fuelCost(1, 100)).toBe(2);
  });
  it('arrondit au supérieur et ne descend jamais sous 1', () => {
    expect(fuelCost(1, 50)).toBe(2);  // ceil(150/100)
    expect(fuelCost(1, 149)).toBe(3); // ceil(249/100)
    expect(fuelCost(0, 0)).toBe(1);
  });
});

describe('plan de chargement (spec §4.2.6)', () => {
  it('supply : remplit un emplacement ≤ 250, refuse si masse > capacité', () => {
    const v = shuttle(); // navette : 1 emplacement supply monté, capacité 100
    expect(planSupplyLoad(v, 'iron', 100)).toEqual({
      ok: true, slots: [{ kind: 'supply', itemId: 'iron', quantity: 100 }],
    });
    expect(planSupplyLoad(v, 'iron', 101)).toEqual({ ok: false, reason: 'no_capacity' });
  });

  it('supply : répartit sur plusieurs emplacements (IOS 2×250)', () => {
    const s = createInitialState(1);
    const v = s.vessels[0];
    v.templateId = 'ios';
    v.slots = [
      { kind: 'supply', itemId: null, quantity: 0 },
      { kind: 'supply', itemId: null, quantity: 0 },
      { kind: 'tool', itemId: null, quantity: 0 },
    ];
    expect(planSupplyLoad(v, 'iron', 400)).toEqual({
      ok: true,
      slots: [
        { kind: 'supply', itemId: 'iron', quantity: 250 },
        { kind: 'supply', itemId: 'iron', quantity: 150 },
      ],
    });
  });

  it('tool : un emplacement, quantité bornée par la masse', () => {
    const v = shuttle();
    v.slots = [{ kind: 'tool', itemId: null, quantity: 0 }];
    expect(planToolLoad(v, 'derrick', 12)).toEqual({
      ok: true, slots: [{ kind: 'tool', itemId: 'derrick', quantity: 12 }],
    }); // 12 × 8 = 96 ≤ 100
    expect(planToolLoad(v, 'derrick', 13)).toEqual({ ok: false, reason: 'no_capacity' });
  });

  it("refuse s'il n'y a aucun emplacement du type requis", () => {
    const v = shuttle();
    v.slots = [{ kind: 'tool', itemId: null, quantity: 0 }];
    expect(planSupplyLoad(v, 'iron', 10)).toEqual({ ok: false, reason: 'no_supply_slots' });
  });
});

describe('durée de voyage (spec §4.4)', () => {
  it('navette : takeoff 5 + trajet + atterrissage 2', () => {
    // earth → the_moon : trajet 2 (order 2 → 0)
    expect(vesselArrivalDay('shuttle', 'earth', 'the_moon', 1)).toBe(10); // 1+5+2+2
  });
  it('IOS/SCG : trajet seul', () => {
    expect(vesselArrivalDay('ios', 'earth', 'the_moon', 1)).toBe(3); // 1+2
  });
});