import type { GameState } from '@/simulation';
import { notify } from '@/state/store';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export interface Action<TArgs = void> {
  label: string;
  validate(state: GameState, args: TArgs): ValidationResult;
  execute(state: GameState, args: TArgs): void;
}

/** Unique point de mutation : validate → execute → notify. */
export function runAction<T>(action: Action<T>, state: GameState, args: T): ValidationResult {
  const v = action.validate(state, args);
  if (v.ok) {
    action.execute(state, args);
    notify();
  }
  return v;
}

/** Bulletin (8 derniers conservés — interface originale). */
export function pushBulletin(state: GameState, msg: string): void {
  state.newsFeed.push(msg);
  if (state.newsFeed.length > 8) state.newsFeed.splice(0, state.newsFeed.length - 8);
}
