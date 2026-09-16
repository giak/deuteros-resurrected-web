import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/simulation';
import { runAction, pushBulletin, type Action } from '@/actions';

const noop: Action<{ n: number }> = {
  label: 'noop',
  validate: (s, a) => (a.n > 0 ? { ok: true } : { ok: false, reason: 'must_be_positive' }),
  execute: (s, a) => { s.flags['noop_ran'] = true; void s; },
};

describe('facade runAction', () => {
  it('exécute si validate ok et notifie', () => {
    const s = createInitialState(1);
    expect(runAction(noop, s, { n: 1 }).ok).toBe(true);
    expect(s.flags['noop_ran']).toBe(true);
  });
  it('refuse sans exécuter si validate ko', () => {
    const s = createInitialState(1);
    const r = runAction(noop, s, { n: 0 });
    expect(r).toEqual({ ok: false, reason: 'must_be_positive' });
    expect(s.flags['noop_ran']).toBeUndefined();
  });
  it('pushBulletin plafonne à 8', () => {
    const s = createInitialState(1);
    for (let i = 0; i < 12; i++) pushBulletin(s, `b${i}`);
    expect(s.newsFeed).toHaveLength(8);
    expect(s.newsFeed[7]).toBe('b11');
  });
});