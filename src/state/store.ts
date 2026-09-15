/**
 * Store minimaliste (DOM vanilla, ARCHITECTURE §2.2) — une seule source de vérité :
 * le GameState muté par la simulation. Les abonnés (HUD, renderer) relisent au notify.
 */
import type { GameState } from '@/simulation';

let state: GameState | null = null;
const listeners = new Set<() => void>();

export function initGame(initial: GameState): void {
  state = initial;
  emit();
}

export function getState(): GameState {
  if (!state) throw new Error('Game non initialisé');
  return state;
}

export function isGameReady(): boolean {
  return state !== null;
}

/** Notifie tous les abonnés après une mutation du state (tick, action). */
export function notify(): void {
  emit();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}
