import { describe, expect, it } from 'vitest';
import { createInitialState, dayTick } from '@/simulation';

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
  });
});
