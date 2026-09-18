import { describe, expect, it } from 'vitest';
import { createInitialState, createPlanetRuntime, fuelCost } from '@/simulation';
import { runAction, buildVessel, refuel, sendCargo } from '@/actions';

describe('buildVessel (spec §4.2)', () => {
  it('construit une navette au sol en consommant châssis, drive et pod supply', () => {
    const s = createInitialState(1);
    s.planets.earth.items = { s_chassis: 1, s_drive: 1, supply_pod: 2, tool_pod: 1, cryo_pod: 1 };
    const r = runAction(buildVessel, s, { planetId: 'earth', templateId: 'shuttle' });
    expect(r.ok).toBe(true);
    expect(s.planets.earth.items['s_chassis']).toBe(0);
    expect(s.planets.earth.items['s_drive']).toBe(0);
    expect(s.planets.earth.items['supply_pod']).toBe(1);
    expect(s.vessels).toHaveLength(2);
    expect(s.vessels[1]).toMatchObject({ templateId: 'shuttle', planetId: 'earth', inOrbit: false, state: 'docked', fuel: 0 });
    expect(s.vessels[1].slots).toEqual([{ kind: 'supply', itemId: null, quantity: 0 }]);
  });

  it('refuse sans les pièces', () => {
    const s = createInitialState(1);
    expect(runAction(buildVessel, s, { planetId: 'earth', templateId: 'shuttle' }))
      .toEqual({ ok: false, reason: 'missing_parts' });
  });

  it('refuse un IOS sans usine orbitale', () => {
    const s = createInitialState(1);
    s.planets.earth.items = { i_chassis: 1, i_drive: 1, tool_pod: 1, supply_pod: 2 };
    expect(runAction(buildVessel, s, { planetId: 'earth', templateId: 'ios' }))
      .toEqual({ ok: false, reason: 'orbit_required' });
  });

  it('construit un IOS au nœud orbital quand une usine est en orbite', () => {
    const s = createInitialState(1);
    s.planets.earth.factory.inOrbit = true;
    s.planets.earth.items = { i_chassis: 1, i_drive: 1, tool_pod: 1, supply_pod: 2 };
    const r = runAction(buildVessel, s, { planetId: 'earth', templateId: 'ios' });
    expect(r.ok).toBe(true);
    expect(s.vessels[1].inOrbit).toBe(true);
    expect(s.vessels[1].slots).toEqual([
      { kind: 'tool', itemId: null, quantity: 0 },
      { kind: 'supply', itemId: null, quantity: 0 },
      { kind: 'supply', itemId: null, quantity: 0 },
    ]);
    expect(s.planets.earth.items['i_chassis']).toBe(0);
  });

  it('monte un pod tool quand pods: ["tool"]', () => {
    const s = createInitialState(1);
    s.planets.earth.items = { s_chassis: 1, s_drive: 1, supply_pod: 1, tool_pod: 1, cryo_pod: 1 };
    const r = runAction(buildVessel, s, { planetId: 'earth', templateId: 'shuttle', pods: ['tool'] });
    expect(r.ok).toBe(true);
    expect(s.vessels[1].slots).toEqual([{ kind: 'tool', itemId: null, quantity: 0 }]);
    expect(s.planets.earth.items['tool_pod']).toBe(0);
  });
});

describe('refuel (spec §4.2)', () => {
  it('remplit le réservoir depuis le stock de carburant, plafonné tankCap', () => {
    const s = createInitialState(1);
    s.planets.earth.items['meh_fuel'] = 250;
    const r = runAction(refuel, s, { vesselId: 'shuttle-1' });
    expect(r.ok).toBe(true);
    expect(s.vessels[0].fuel).toBe(100); // tankCap navette
    expect(s.planets.earth.items['meh_fuel']).toBe(150);
  });

  it('conserve l\'excédent du stock si le réservoir est petit', () => {
    const s = createInitialState(1);
    s.planets.earth.items['meh_fuel'] = 30;
    runAction(refuel, s, { vesselId: 'shuttle-1' });
    expect(s.vessels[0].fuel).toBe(30);
    expect(s.planets.earth.items['meh_fuel']).toBe(0);
  });

  it('refuse vaisseau inconnu, en transit, réservoir plein ou sans carburant', () => {
    const s = createInitialState(1);
    expect(runAction(refuel, s, { vesselId: 'nope' })).toEqual({ ok: false, reason: 'vessel_not_found' });
    expect(runAction(refuel, s, { vesselId: 'shuttle-1' })).toEqual({ ok: false, reason: 'no_fuel_stock' });
    s.planets.earth.items['meh_fuel'] = 10;
    s.vessels[0].state = 'in_transit';
    expect(runAction(refuel, s, { vesselId: 'shuttle-1' })).toEqual({ ok: false, reason: 'vessel_not_docked' });
    s.vessels[0].state = 'docked';
    s.vessels[0].fuel = 100;
    expect(runAction(refuel, s, { vesselId: 'shuttle-1' })).toEqual({ ok: false, reason: 'tank_full' });
  });
});

describe('sendCargo (spec §4.2)', () => {
  const ready = () => {
    const s = createInitialState(1);
    s.planets.earth.stores['iron'] = 1000;
    s.vessels[0].fuel = 100;
    return s;
  };

  it('décolle avec la cargaison, débite stocks, monté les slots, débite le carburant', () => {
    const s = ready();
    const r = runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 100, toPlanetId: 'the_moon' });
    expect(r.ok).toBe(true);
    expect(s.planets.earth.stores['iron']).toBe(900);
    const v = s.vessels[0];
    expect(v.slots[0]).toEqual({ kind: 'supply', itemId: 'iron', quantity: 100 });
    expect(v.state).toBe('in_transit');
    expect(v.mission).toMatchObject({ fromPlanetId: 'earth', toPlanetId: 'the_moon', startDay: 1, arrivalDay: 10 });
    expect(v.fuel).toBe(100 - fuelCost(2, 100)); // 100 - 4
  });

  it('refuse si carburant insuffisant (pas de ravitaillement auto)', () => {
    const s = createInitialState(1);
    s.planets.earth.stores['iron'] = 50;
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 50, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'insufficient_fuel' });
  });

  it('refuse si stock insuffisant, cargaison non transportable, destination égale/inconnue', () => {
    const s = ready();
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 5000, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'insufficient_stock' });

    const s2 = createInitialState(1);
    s2.planets.earth.items['meh_fuel'] = 10;
    s2.vessels[0].fuel = 100;
    expect(runAction(sendCargo, s2, { vesselId: 'shuttle-1', itemId: 'meh_fuel', quantity: 5, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'not_carriable' });

    const s3 = ready();
    expect(runAction(sendCargo, s3, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'earth' }))
      .toEqual({ ok: false, reason: 'same_planet' });
    expect(runAction(sendCargo, s3, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'proxima' }))
      .toEqual({ ok: false, reason: 'unknown_destination' });
  });

  it('refuse vaisseau inconnu ou non docked', () => {
    const s = ready();
    expect(runAction(sendCargo, s, { vesselId: 'nope', itemId: 'iron', quantity: 1, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'vessel_not_found' });
    s.vessels[0].state = 'in_transit';
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'vessel_not_docked' });
  });

  it('refuse hors de la portée du vaisseau (inter-systèmes → scg requis)', () => {
    const s = createInitialState(1);
    s.planets.earth.stores['iron'] = 1000;
    s.planets['alpha'] = createPlanetRuntime('alpha');
    s.vessels[0].fuel = 100;
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'alpha' }))
      .toEqual({ ok: false, reason: 'out_of_range' });
  });

  it('refuse au-delà de la capacité du vaisseau', () => {
    const s = ready();
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 101, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'no_capacity' });
  });
});