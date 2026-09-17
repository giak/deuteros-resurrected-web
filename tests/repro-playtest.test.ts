import { describe, expect, it } from 'vitest';
import { createInitialState, dayTick } from '@/simulation';
import { runAction, queueItem, selectResearch, installDerrick } from '@/actions';

function runGame(seed: number, maxDays: number): { day: number; victory: boolean; trace: string[] } {
  const s = createInitialState(seed);
  runAction(selectResearch, s, { itemId: 'of_frame' });
  let ofFrameQueued = false;
  const trace: string[] = [];
  for (let day = 1; day <= maxDays; day++) {
    const earth = s.planets.earth;
    while (runAction(installDerrick, s, undefined).ok) { trace.push(`d${day}: install derrick`); }
    if (s.research.progress['of_frame'].researched && !ofFrameQueued && !earth.factory.currentItemId) {
      const r = runAction(queueItem, s, { itemId: 'of_frame' });
      if (r.ok) { ofFrameQueued = true; trace.push(`d${day}: queue of_frame`); }
      else trace.push(`d${day}: queue of_frame FAIL ${r.reason}`);
    }
    if (!earth.factory.currentItemId) {
      const r = runAction(queueItem, s, { itemId: 'derrick' });
      if (r.ok) trace.push(`d${day}: queue derrick`);
      else if (day < 200) trace.push(`d${day}: queue derrick FAIL ${r.reason}`);
    }
    dayTick(s);
    if ((earth.items['of_frame'] ?? 0) >= 1) {
      trace.push(`d${day}: VICTORY derricks=${earth.derricks} items=${JSON.stringify(earth.items)} stores=${JSON.stringify(earth.stores)}`);
      return { day, victory: true, trace };
    }
    if (day % 100 === 0) trace.push(`d${day}: derricks=${earth.derricks} current=${earth.factory.currentItemId} items=${JSON.stringify(earth.items)} stores=${JSON.stringify(earth.stores)}`);
  }
  return { day: maxDays, victory: false, trace };
}

describe('repro playtest réelle (seeds aléatoires type Date.now)', () => {
  it.each([42, 123456789, 987654321, 20260917, 7, 31337])(
    'seed %i — victoire ≤ J800 (contrat réel humain)',
    (seed) => {
      const r = runGame(seed, 800);
      console.log(`seed=${seed} -> ${r.victory ? `VICTOIRE J${r.day}` : 'PAS DE VICTOIRE'}`);
      if (!r.victory) console.log(r.trace.slice(-25).join('\n'));
      expect(r.victory).toBe(true);
      expect(r.day).toBeLessThanOrEqual(250);
    },
  );
});