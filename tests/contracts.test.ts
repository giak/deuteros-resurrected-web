import { describe, expect, it } from 'vitest';
import { createInitialState, dayTick, dailyProductionValue, updateResearch, updateMining, createRng } from '@/simulation';
import { runAction, selectResearch, queueItem } from '@/actions';

// spec §6.2 : régimes production (division entière vérifiée)
describe('contrat production', () => {
  const f = (count: number, actions: number) => {
    const s = createInitialState(1);
    s.planets.earth.factory.builder = { type: 'production', count, actionsTaken: actions };
    return dailyProductionValue(s.planets.earth.factory, 64);
  };
  it('200 apprentis = 31/j ; 200 ingénieurs = 63/j ; 200 experts = 127/j', () => {
    expect(f(200, 0)).toBe(31);
    expect(f(200, 6)).toBe(63);
    expect(f(200, 12)).toBe(127);
  });
  it('supply_pod en 23 j à 31/j (départ 64, c=1, 3 wraps)', () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { titanium: 999, aluminium: 999, copper: 999 };
    runAction(queueItem, s, { itemId: 'supply_pod' });
    let days = 0;
    while (!s.planets.earth.items['supply_pod'] && days < 100) { dayTick(s); days++; }
    expect(days).toBe(23);
  });
});

// spec §6.3 : recherche 250 techniciens = 39/j → of_frame en 58 j
describe('contrat recherche', () => {
  it('v = 39/j et of_frame researched en exactement 58 jours', () => {
    const s = createInitialState(1);
    runAction(selectResearch, s, { itemId: 'of_frame' });
    const team = s.planets.earth.researchTeam!;
    expect(((team.count << 1) * 64) / 801 | 0).toBe(39);
    let days = 0;
    while (!s.research.progress['of_frame'].researched && days < 200) {
      updateResearch(s, team);
      days++;
    }
    expect(days).toBe(58);
  });
});

// spec §6.1 : premier miner entre J4 et J18 (1 derrick boot, jours pairs)
describe('contrat minage', () => {
  it('1er miner extrait au plus tard au jour 18, cap 50 000 respecté', () => {
    const s = createInitialState(42);
    const rng = createRng(42);
    let firstOreDay = -1;
    for (let day = 1; day <= 40; day++) {
      updateMining(s.planets.earth, day, rng);
      if (firstOreDay < 0 && (s.planets.earth.stores['iron'] ?? 0) > 0) firstOreDay = day;
    }
    expect(firstOreDay).toBeGreaterThanOrEqual(2);
    expect(firstOreDay).toBeLessThanOrEqual(18);
    for (const v of Object.values(s.planets.earth.stores)) expect(v).toBeLessThanOrEqual(50_000);
  });
});
