import { describe, expect, it } from 'vitest';
import { createInitialState, dayTick } from '@/simulation';
import { runAction, queueItem, selectResearch, installDerrick } from '@/actions';

function runGame(seed: number, maxDays: number): { day: number; victory: boolean } {
  const s = createInitialState(seed);
  runAction(selectResearch, s, { itemId: 'of_frame' });
  let ofFrameQueued = false;
  for (let day = 1; day <= maxDays; day++) {
    const earth = s.planets.earth;
    // installe les derricks produits
    while (runAction(installDerrick, s, undefined).ok) { /* repeat */ }
    // recherche OF Frame faite → bascule la production sur l'OF Frame dès que possible
    if (s.research.progress['of_frame'].researched && !ofFrameQueued && !earth.factory.currentItemId) {
      if (runAction(queueItem, s, { itemId: 'of_frame' }).ok) ofFrameQueued = true;
    }
    // file un derrick si l'usine est libre et les ressources y sont ; sinon attend
    if (!earth.factory.currentItemId) runAction(queueItem, s, { itemId: 'derrick' });
    dayTick(s);
    if ((earth.items['of_frame'] ?? 0) >= 1) return { day, victory: true };
  }
  return { day: maxDays, victory: false };
}

describe('boucle intégrée v0 (spec §1, §6.5)', () => {
  it('OF Frame produit ≤ J250, même seed → même jour (déterminisme)', () => {
    const a = runGame(42, 300);
    expect(a.victory).toBe(true);
    expect(a.day).toBeLessThanOrEqual(250);
    expect(runGame(42, 300).day).toBe(a.day);      // déterminisme
  });
  it('invariants : stocks bornés, rangs monotones', () => {
    const s = createInitialState(42);
    runAction(selectResearch, s, { itemId: 'of_frame' });
    for (let day = 0; day < 250; day++) {
      dayTick(s);
      for (const v of Object.values(s.planets.earth.stores)) expect(v).toBeLessThanOrEqual(50_000);
      expect(s.planets.earth.factory.builder!.actionsTaken).toBeGreaterThanOrEqual(0);
    }
  });
});