import { describe, expect, it } from 'vitest';
import { createInitialState, dayTick } from '@/simulation';

describe('état initial transport v2 (spec §4.7)', () => {
  it('démarre en version 2 avec 1 navette dockée à Terre', () => {
    const s = createInitialState(1);
    expect(s.version).toBe(2);
    expect(s.vessels).toHaveLength(1);
    const v = s.vessels[0];
    expect(v).toMatchObject({
      id: 'shuttle-1', templateId: 'shuttle', planetId: 'earth',
      inOrbit: false, state: 'docked', fuel: 0, fuelType: 'meh_fuel', health: 100,
    });
    expect(v.mission).toBeNull();
    expect(v.slots).toEqual([{ kind: 'supply', itemId: null, quantity: 0 }]);
  });

  it('les 3 pods de départ sont en stock Terre', () => {
    const s = createInitialState(1);
    expect(s.planets.earth.items['supply_pod']).toBe(1);
    expect(s.planets.earth.items['tool_pod']).toBe(1);
    expect(s.planets.earth.items['cryo_pod']).toBe(1);
  });
});

describe('boot v0 (spec §5.1)', () => {
  const s = createInitialState(42);
  it('équipe production pré-assignée : 200 apprentis', () => {
    expect(s.planets.earth.factory.builder).toEqual({ type: 'production', count: 200, actionsTaken: 0 });
  });
  it('équipe recherche pré-assignée : 250 techniciens', () => {
    expect(s.planets.earth.researchTeam).toEqual({ type: 'research', count: 250, actionsTaken: 0 });
  });
  it('réservoir = 6000 − 450 = 5550', () => {
    expect(s.training.reservoir).toBe(5550);
  });
  it('dayTick(state) avance sans paramètre équipes', () => {
    const r = createInitialState(1);
    const before = r.day;
    dayTick(r);
    expect(r.day).toBe(before + 1);
    expect(r.planets.earth.researchTeam).toEqual({ type: 'research', count: 250, actionsTaken: 0 });
    expect(r.planets.earth.factory.builder).toEqual({ type: 'production', count: 200, actionsTaken: 0 });
  });
});
