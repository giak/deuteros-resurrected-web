import { describe, expect, it, vi, afterEach } from 'vitest';
import { describeActionArgs, actionTrace, traceDay, getTrace, clearTrace, TRACE_BUFFER_CAP } from '@/trace';

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