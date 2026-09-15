/**
 * Tests données — invariants de structure (items, corps, ressources).
 * Source : data/*.json générés par scripts/generate_data.py depuis le remake
 * (source:f53f5ba3fa) — cf. docs/RESEARCH.md §8/§9 et spec tables v1 §3-4.
 */
import { describe, expect, it } from 'vitest';
import { BODIES, ITEMS, RESOURCES, RESEARCHABLE_ITEMS, SOL_BODIES, getItem } from '@/simulation/data';

describe('resources.json', () => {
  it('contient les 16 ressources canoniques', () => {
    expect(RESOURCES).toHaveLength(16);
  });

  it('les deux carburants composés ne sont pas minables', () => {
    for (const id of ['meh_fuel', 'hed_fuel'] as const) {
      const r = RESOURCES.find((x) => x.id === id)!;
      expect(r.minable).toBe(false);
      expect(r.type).toBe('compound_fuel');
    }
  });

  it('les taux de derrick sont conformes au remake (2 ou 1)', () => {
    for (const r of RESOURCES) {
      if (r.minable) {
        expect([1, 2]).toContain(r.derrickRate);
      }
    }
    expect(RESOURCES.find((x) => x.id === 'iron')!.derrickRate).toBe(2);
    expect(RESOURCES.find((x) => x.id === 'helium')!.derrickRate).toBe(1);
  });

  it('les multiplicateurs de survey sont He=4, Pt=2, Ag=2, Au=3', () => {
    const sm = Object.fromEntries(RESOURCES.map((r) => [r.id, r.surveyMultiplier]));
    expect(sm).toMatchObject({ helium: 4, platinum: 2, silver: 2, gold: 3 });
  });
});

describe('items.json', () => {
  it('contient 46 items dont 31 recherchables', () => {
    expect(ITEMS).toHaveLength(46);
    expect(RESEARCHABLE_ITEMS).toHaveLength(31);
  });

  it('les recettes clés sont fidèles à CoreData.cs', () => {
    expect(getItem('derrick').inputs).toEqual({ iron: 3, titanium: 4, carbon: 1 });
    expect(getItem('s_drive').inputs).toEqual({ iron: 6, titanium: 10, aluminium: 4 });
    expect(getItem('supply_pod').inputs).toEqual({ titanium: 2, aluminium: 1, copper: 1 });
    expect(getItem('a_c_c').inputs).toEqual({ titanium: 2, aluminium: 1, carbon: 1, copper: 1 });
    expect(getItem('r_frame').inputs).toEqual({
      iron: 35, titanium: 50, aluminium: 20, carbon: 15, copper: 30,
      platinum: 25, silver: 10, silica: 15,
    });
  });

  it('les carburants ont les bonnes recettes et le bon périmètre', () => {
    const meh = getItem('meh_fuel');
    const hed = getItem('hed_fuel');
    expect(meh.inputs).toEqual({ hydrogen: 2, methane: 2 });
    expect(meh.orbitOnly).toBe(false);
    expect(meh.autoProduce).toBe(true);
    expect(hed.inputs).toEqual({ helium: 2, deuterium: 2 });
    expect(hed.orbitOnly).toBe(true);
  });

  it('AOC unique, Hyperlight sans coût, Sonic Blaster avec overrides', () => {
    expect(getItem('a_o_c').unique).toBe(true);
    expect(getItem('hyperlight').inputs).toBeUndefined();
    const sonic = getItem('sonic_blaster');
    expect(sonic.researchMultiplier).toBe(16);
    expect(sonic.researchValue).toBe(16);
    expect(getItem('s_drive').researchMultiplier).toBe(96);
  });

  it('les gros châssis/drives/drone sont orbit-only', () => {
    for (const id of ['pulse_blaster_laser', 'i_chassis', 'g_chassis', 'm_t_x', 'ios_drone', 'star_drone']) {
      expect(getItem(id).orbitOnly).toBe(true);
    }
  });
});

describe('planets.json', () => {
  it('contient 160+ corps répartis en 9 systèmes', () => {
    expect(BODIES.length).toBeGreaterThanOrEqual(160);
    const stars = new Set(BODIES.map((b) => b.starId));
    expect(stars.size).toBe(9);
  });

  it('le périmètre v1 (Soleil) couvre 40+ corps avec la Terre et la Lune', () => {
    expect(SOL_BODIES.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(SOL_BODIES.map((b) => b.id));
    expect(ids.has('earth')).toBe(true);
    expect(ids.has('the_moon')).toBe(true);
  });

  it('les 8 segments Hydroïdes sont portés par les bons corps', () => {
    const expected: Record<string, number> = {
      atlantic: 1, chloe: 2, babylon: 3, hadrian: 4,
      romulus: 5, caesius: 6, pliocene: 7, alpha: 8,
    };
    for (const [id, seg] of Object.entries(expected)) {
      expect(BODIES.find((b) => b.id === id)?.segment).toBe(seg);
    }
  });

  it('chaque corps du Soleil a des gisements cohérents (16 ressources max)', () => {
    const valid = new Set(RESOURCES.map((r) => r.id));
    for (const b of SOL_BODIES) {
      for (const d of b.deposits) {
        expect(valid.has(d)).toBe(true);
      }
      expect(b.deposits.length).toBeLessThanOrEqual(16);
    }
  });

  it('Terre : gisements complets du remake (8 matières)', () => {
    const earth = BODIES.find((b) => b.id === 'earth')!;
    expect(earth.deposits).toEqual(
      expect.arrayContaining(['iron', 'titanium', 'aluminium', 'carbon', 'copper', 'hydrogen', 'deuterium', 'methane']),
    );
    expect(earth.deposits).toHaveLength(8);
  });

  it('les colonies Méthanoïdes de départ sont posées (scénario CoreData.cs)', () => {
    const start = BODIES.filter((b) => b.methanoidColony).map((b) => b.id);
    expect(start).toEqual(expect.arrayContaining(['jupiter', 'uranus', 'titania', 'neptune', 'triton', 'pluto']));
  });
});
