import { describe, expect, it, vi, afterEach } from 'vitest';
import { describeActionArgs, actionTrace, traceDay, getTrace, clearTrace, TRACE_BUFFER_CAP } from '@/trace';
import { createInitialState, dayTick, updateMining } from '@/simulation';
import { runAction, selectResearch, queueItem } from '@/actions';

afterEach(() => {
  clearTrace();
  vi.restoreAllMocks();
});

describe('describeActionArgs (détail args des actions)', () => {
  it('undefined → chaîne vide', () => {
    expect(describeActionArgs(undefined)).toBe('');
  });
  it('{ itemId } → " itemId"', () => {
    expect(describeActionArgs({ itemId: 'derrick' })).toBe(' derrick');
  });
  it('{ type, count } → " type count"', () => {
    expect(describeActionArgs({ type: 'production', count: 100 })).toBe(' production 100');
  });
  it('objet non-action → chaîne vide', () => {
    expect(describeActionArgs({ foo: 1 })).toBe('');
  });
});

describe('actionTrace', () => {
  it('formatte et buffer la ligne succès', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    actionTrace.log(5, 'queueItem', { itemId: 'derrick' }, 'ok');
    expect(spy).toHaveBeenCalledWith('[J5] action queueItem derrick → ok');
    expect(getTrace()).toEqual(['[J5] action queueItem derrick → ok']);
  });
  it('inclut la raison d\'échec brute', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    actionTrace.log(15, 'queueItem', { itemId: 'of_frame' }, 'échec (insufficient_resources)');
    expect(spy).toHaveBeenCalledWith('[J15] action queueItem of_frame → échec (insufficient_resources)');
  });
  it('getTrace retourne une copie (mutation sans effet)', () => {
    actionTrace.log(1, 'noop', undefined, 'ok');
    const copy = getTrace();
    copy.push('corrompu');
    expect(getTrace()).toHaveLength(1);
  });
});

describe('buffer FIFO', () => {
  it('plafonne à TRACE_BUFFER_CAP (les plus anciennes sautées)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    for (let i = 0; i < TRACE_BUFFER_CAP + 5; i++) actionTrace.log(1, 'noop', { itemId: `n: ${i}` }, 'ok');
    const t = getTrace();
    expect(t).toHaveLength(TRACE_BUFFER_CAP);
    expect(t[0]).toContain('n: 5');
    expect(t[t.length - 1]).toContain('n: 3004');
  });
});

describe('traceDay', () => {
  it('ouvre un group replié, écrit chaque ligne, ferme, bufferise', () => {
    const group = vi.spyOn(console, 'group').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const groupEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    traceDay(12, ['[J12] recherche derrick — 12%.', '[J12] minage earth iron +2.']);
    expect(group).toHaveBeenCalledWith('[J12] · 2 lignes');
    expect(log).toHaveBeenCalledTimes(2);
    expect(groupEnd).toHaveBeenCalledTimes(1);
    expect(getTrace()).toHaveLength(2);
  });
  it('jour résiduel : aucun journal, pas de group', () => {
    const group = vi.spyOn(console, 'group').mockImplementation(() => {});
    traceDay(3, []);
    expect(group).not.toHaveBeenCalled();
  });
});

describe('journal moteur (engine.dayTick)', () => {
  it('recherche en cours → ligne quotidienne avec % (jour simulé)', () => {
    const s = createInitialState(1);
    runAction(selectResearch, s, { itemId: 'of_frame' });
    const r = dayTick(s);
    expect(r.journal.some((l) => /^\[J1\] recherche of_frame — \d+%\.$/.test(l))).toBe(true);
  });

  it('minage : ligne par matière les jours pairs, aucune les jours impairs', () => {
    const s = createInitialState(1);
    s.planets.earth.deposits = [{ resource: 'iron', groundAmount: 100, surveyTicks: 0 }];
    s.planets.earth.derricks = 1;
    s.planets.earth.baseBuildParts = 2;
    const odd = dayTick(s); // J1 impair → pas de minage
    expect(odd.journal.some((l) => l.includes('minage earth'))).toBe(false);
    const even = dayTick(s); // J2 pair → iron +2 (1 derrick × rate 2)
    expect(even.journal.some((l) => l === '[J2] minage earth iron +2.')).toBe(true);
  });

  it('production bloquée → ligne "bloquée (pas d\'équipe)"', () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { iron: 3, titanium: 4, carbon: 1 };
    runAction(queueItem, s, { itemId: 'derrick' });
    s.planets.earth.factory.builder = null; // usine à l'arrêt
    const r = dayTick(s);
    expect(r.journal.some((l) => l.startsWith('[J1] production derrick → bloquée'))).toBe(true);
  });

  it('production terminée → ligne événement (wraps, valeur)', () => {
    const s = createInitialState(1);
    s.planets.earth.factory = {
      currentItemId: 'tool_pod',
      productionValue: 250,
      productionComplete: 3,
      prodCycle: 0,
      builder: { type: 'production', count: 250, actionsTaken: 12 },
      aoc: false,
      inOrbit: false,
    };
    const r = dayTick(s);
    expect(r.journal.some((l) => l === '[J1] production tool_pod → terminée (wraps 4, valeur 0).')).toBe(true);
  });

  it('ordre des phases : recherche avant production avant minage', () => {
    const s = createInitialState(1);
    runAction(selectResearch, s, { itemId: 'of_frame' });
    s.planets.earth.deposits = [{ resource: 'iron', groundAmount: 100, surveyTicks: 0 }];
    s.planets.earth.derricks = 1;
    s.planets.earth.baseBuildParts = 2;
    s.planets.earth.factory = {
      currentItemId: 'supply_pod',
      productionValue: 200,
      productionComplete: 3,
      prodCycle: 0,
      builder: { type: 'production', count: 200, actionsTaken: 6 },
      aoc: false,
      inOrbit: false,
    };
    // J1 impair → pas de minage, mais recherche puis production (finie) ordonnées
    const r = dayTick(s);
    const iResearch = r.journal.findIndex((l) => /recherche of_frame/.test(l));
    const iProd = r.journal.findIndex((l) => /production supply_pod/.test(l));
    expect(iResearch).toBeGreaterThanOrEqual(0);
    expect(iProd).toBeGreaterThan(iResearch);
  });
});