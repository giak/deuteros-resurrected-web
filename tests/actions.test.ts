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

import { queueItem, cancelQueueItem, selectResearch } from '@/actions';

describe('selectResearch (spec §6.3)', () => {
  it('sélectionne un item débloqué au boot (of_frame)', () => {
    const s = createInitialState(1);
    expect(runAction(selectResearch, s, { itemId: 'of_frame' }).ok).toBe(true);
    expect(s.research.currentItemId).toBe('of_frame');
  });
  it('refuse un item verrouillé (m_t_x) ou inexistant', () => {
    const s = createInitialState(1);
    expect(runAction(selectResearch, s, { itemId: 'm_t_x' })).toEqual({ ok: false, reason: 'locked' });
    expect(runAction(selectResearch, s, { itemId: 'chaise' })).toEqual({ ok: false, reason: 'not_researchable' });
  });
  it('re-sélectionner le projet courant est un no-op ok', () => {
    const s = createInitialState(1);
    runAction(selectResearch, s, { itemId: 'of_frame' });
    expect(runAction(selectResearch, s, { itemId: 'of_frame' }).ok).toBe(true);
    expect(s.research.currentItemId).toBe('of_frame');
  });
});

describe('queueItem (contrat spec §6.2)', () => {
  it('file un item au sol si ressources suffisantes et consomme les intrants', () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { iron: 3, titanium: 4, carbon: 1 };
    expect(runAction(queueItem, s, { itemId: 'derrick' }).ok).toBe(true);
    expect(s.planets.earth.factory.currentItemId).toBe('derrick');
    expect(s.planets.earth.factory.productionValue).toBe(64);   // charge initiale
    expect(s.planets.earth.factory.productionComplete).toBe(1);
    expect(s.planets.earth.stores.iron).toBe(0);                // consommé à la mise en file
  });
  it('refuse si stock insuffisant', () => {
    const s = createInitialState(1);
    const r = runAction(queueItem, s, { itemId: 'derrick' });
    expect(r).toEqual({ ok: false, reason: 'insufficient_resources' });
  });
  it("refuse un item orbit-only au sol", () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { titanium: 999, aluminium: 999, carbon: 999, copper: 999, palladium: 999, platinum: 999 };
    const r = runAction(queueItem, s, { itemId: 'ios_drone' });
    expect(r).toEqual({ ok: false, reason: 'orbit_only' });
  });
  it("refuse si rang insuffisant (a_c_c = tech 3, apprentis r1)", () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { titanium: 999, aluminium: 999, carbon: 999, copper: 999 };
    const r = runAction(queueItem, s, { itemId: 'a_c_c' });
    expect(r).toEqual({ ok: false, reason: 'rank_gate' });
  });
  it('re-fileder un autre item = travail perdu (retour charge initiale)', () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { iron: 20, titanium: 20, carbon: 20, aluminium: 20, copper: 20 };
    runAction(queueItem, s, { itemId: 'derrick' });
    s.planets.earth.factory.productionValue = 200; // travail accumulé
    runAction(queueItem, s, { itemId: 'supply_pod' });
    expect(s.planets.earth.factory.currentItemId).toBe('supply_pod');
    expect(s.planets.earth.factory.productionValue).toBe(64);
  });
  it('cancel vide la file sans rembourser', () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { iron: 3, titanium: 4, carbon: 1 };
    runAction(queueItem, s, { itemId: 'derrick' });
    expect(runAction(cancelQueueItem, s, undefined).ok).toBe(true);
    expect(s.planets.earth.factory.currentItemId).toBeNull();
    expect(s.planets.earth.stores.iron).toBe(0); // pas de remboursement (fidèle)
    expect(runAction(cancelQueueItem, s, undefined)).toEqual({ ok: false, reason: 'nothing_in_queue' });
  });
});