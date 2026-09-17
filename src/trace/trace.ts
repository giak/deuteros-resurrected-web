/**
 * Trace de session — journal texte brut (actions + moteur) pour diagnostic
 * (spec 2026-09-17-trace-session-design.md, décision K10).
 * Seul code du projet qui touche `console`. La simulation ne l'importe pas :
 * elle RETOURNE ses lignes dans `DayTickResult.journal`.
 * Buffer FIFO module-level (hors GameState — pas de sauvegarde).
 */
export const TRACE_BUFFER_CAP = 3000;

const buffer: string[] = [];

function write(line: string): void {
  buffer.push(line);
  if (buffer.length > TRACE_BUFFER_CAP) {
    buffer.splice(0, buffer.length - TRACE_BUFFER_CAP);
  }
}

/** Banner de démarrage. */
export function initTrace(seed: number): void {
  const line = `[trace] DEUTEROS — seed ${seed}, trace active (buffer ${TRACE_BUFFER_CAP} lignes).`;
  console.info(line);
  write(line);
}

/**
 * Un journal de journée (résumé moteur) → `console.groupCollapsed` (group replié
 * en DevTools) + buffer.
 * Les lignes de `journal` sont déjà préfixées `[J<day>]` (produites par le moteur).
 */
export function traceDay(day: number, journal: string[]): void {
  if (journal.length === 0) return;
  console.groupCollapsed(`[J${day}] · ${journal.length} lignes`);
  for (const line of journal) {
    console.log(line);
    write(line);
  }
  console.groupEnd();
}

/** Détail lisible des args d'une action pour la ligne de trace (" itemId", " type count"). */
export function describeActionArgs(args: unknown): string {
  if (args == null || typeof args !== 'object') return '';
  const a = args as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof a.itemId === 'string') parts.push(a.itemId);
  if (typeof a.type === 'string') {
    parts.push(a.type);
    if (typeof a.count === 'number') parts.push(String(a.count));
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/** Hook injecté dans `runAction` (structure). Succès → `outcome === 'ok'` ; échec → `'échec (raison)'`. */
export const actionTrace = {
  log(day: number, label: string, args: unknown, outcome: string): void {
    const line = `[J${day}] action ${label}${describeActionArgs(args)} → ${outcome}`;
    console.log(line);
    write(line);
  },
};

/** Copie du buffer (relecture depuis la DevTools). */
export function getTrace(): string[] {
  return [...buffer];
}

export function clearTrace(): void {
  buffer.splice(0, buffer.length);
}

// Exposition DevTools (window absent en environnement de test node — garde).
if (typeof window !== 'undefined') {
  (window as unknown as { __TRACE__?: { getTrace(): string[]; clearTrace(): void } }).__TRACE__ = {
    getTrace,
    clearTrace,
  };
}