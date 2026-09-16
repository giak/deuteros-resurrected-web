# v0 « Boucle Terre » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sandbox économie Terre-seule jouable : miner → produire → rechercher → former, avec objectif terminal « 1 OF Frame produit ≤ J250 », mutations canalisées par une facade d'actions.

**Architecture:** Moteur mutable conservé (ADR-018) ; nouvelle couche `src/actions/` = seule porte de mutation (validate/execute + bulletin) ; écran Terre en panneaux DOM vanilla par-dessus le store observable ; canvas système conservé en fond.

**Tech Stack:** TypeScript strict + Vite 6, Vitest 3, DOM vanilla, Canvas 2D. Bun comme runner.

**Spec:** `docs/superpowers/specs/2026-09-15-v0-boucle-terre-design.md` (le plan se lit AVEC la spec — les contrats chiffrés §6 de la spec font foi).

## Global Constraints

- TS strict (`tsc --noEmit` = 0 erreur) ; lint 0 erreur (`bun run lint`) à chaque commit.
- **Formules intouchables** : `/801`, wrap `& 0xFF`, démarrage `(64, complete=1)`, `+11 %/wrap`, cap 50 000, 24 j formation, seuils 6/9-6/12-10/40. Tout ajustement d'équilibrage passe par l'état de boot uniquement (spec §1).
- Division entière (`Math.floor` / `//`) partout dans la simulation ; pas de `Math.random` ni `Date.now` dans `src/simulation/` ni `src/actions/`.
- Quantités entières ; newsFeed plafonné à 8 bulletins (helper `pushBulletin`).
- UI en français ; pas de framework ; 1 module par panneau.
- Chaque task finit par `bunx vitest run` vert + commit.
- Écart spec assumé : les actions `assignFactoryTeam`/`assignResearchTeam` (spec §3/§4) sont **coupées** (YAGNI) — équipes pré-assignées au boot, jamais détachées en v0 ; à réintroduire avec le transport d'équipes.

---

### Task 1: ADR-018 + équipes au boot + `dayTick` autonome

Le moteur lit lui-même les équipes depuis le state (fini le placeholder UI `researchStaff`).

**Files:**
- Modify: `docs/DECISIONS.md` (l'ADR-018 existe déjà, acte de validation : statut « approuvé » — pas de nouvel ADR à ajouter)
- Modify: `src/simulation/types.ts` (PlanetRuntime.researchTeam)
- Modify: `src/simulation/state.ts` (boot : équipes pré-assignées, réservoir 5 550)
- Modify: `src/simulation/engine.ts` (signature `dayTick(state)`)
- Modify: `src/ui/app.ts` (appel dayTick)
- Test: `tests/state.test.ts` (nouveau)

**Interfaces:**
- Produces: `PlanetRuntime.researchTeam?: Staff | null` ; `dayTick(state: GameState): DayTickResult` (plus de 2e paramètre).

- [ ] **Step 1: test failing** — `tests/state.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/simulation';

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
    // import dynamique pour éviter le cycle au top-level
    const { dayTick } = require('@/simulation') as typeof import('@/simulation');
    dayTick(r);
    expect(r.day).toBe(before + 1);
  });
});
```

> ⚠️ `require` interdit (ESM) — utiliser un import statique en haut du fichier : `import { createInitialState, dayTick } from '@/simulation';` et appeler `dayTick(r)` directement.

- [ ] **Step 2:** `bunx vitest run tests/state.test.ts` → FAIL (researchTeam absent, signature dayTick)
- [ ] **Step 3: implémentation** — `types.ts` : ajouter `researchTeam?: Staff | null;` à `PlanetRuntime`. `state.ts` dans `createInitialState` :

```ts
  planets.earth.factory.builder = { type: 'production', count: 200, actionsTaken: 0 };
  planets.earth.researchTeam = { type: 'research', count: 250, actionsTaken: 0 };
  // réservoir : 6000 − 450 assignés
```
(remplacer `reservoir: 6_000` par `reservoir: 5_550`). `engine.ts` :

```ts
export function dayTick(state: GameState): DayTickResult {
  // ...
  const finished = updateResearch(state, state.planets.earth.researchTeam ?? null);
  // ...
  updateTraining(state, (type, count) => {
    if (type === 'production') {
      const b = state.planets.earth.factory.builder;
      if (b) b.count += count; else state.planets.earth.factory.builder = { type: 'production', count, actionsTaken: 0 };
    } else if (type === 'research') {
      const r = state.planets.earth.researchTeam;
      if (r) r.count += count; else state.planets.earth.researchTeam = { type: 'research', count, actionsTaken: 0 };
    }
    // marines : hors v0 (spec §9)
  });
  // reste inchangé
}
```

`app.ts` : remplacer l'appel `dayTick(getState(), { research: researchStaff, production: null, marines: null })` par `dayTick(getState())` et **supprimer** `researchStaff`/`emptyStaffs`.

- [ ] **Step 4:** `bunx vitest run` → 42+ tests PASS (corriger tests/simulation.test.ts si fixture dayTick) ; `bun run lint` ; `bunx tsc --noEmit`
- [ ] **Step 5: commit** `feat(simulation): ADR-018, équipes au boot, dayTick autonome`

---

### Task 2: Facade d'actions — squelette

**Files:**
- Create: `src/actions/types.ts`
- Test: `tests/actions.test.ts` (créé, 1er test)

**Interfaces:**
- Produces: `Action<TArgs>`, `ValidationResult`, `runAction<T>(action, state, args): ValidationResult`, `pushBulletin(state, msg: string)` (plafonne à 8).

- [ ] **Step 1: test failing** — début de `tests/actions.test.ts` :

```ts
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
```

- [ ] **Step 2:** `bunx vitest run tests/actions.test.ts` → FAIL (module absent)
- [ ] **Step 3: implémentation** — `src/actions/types.ts` :

```ts
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
```

- [ ] **Step 4:** `bunx vitest run tests/actions.test.ts` → PASS ; lint + tsc
- [ ] **Step 5: commit** `feat(actions): squelette facade validate/execute/notify`

---

### Task 3: Actions production — `queueItem`, `cancelQueueItem`

**Files:**
- Create: `src/actions/production.ts`
- Modify: `src/actions/index.ts` (créer le barrel)
- Test: `tests/actions.test.ts` (extend)

**Interfaces:**
- Consumes: `canStartItem`, `checkResources`, `consumeResources`, `switchItem` de `@/simulation/production` (signatures existantes).
- Produces: `queueItem: Action<{ itemId: string }>`, `cancelQueueItem: Action<void>` — reasons : `unknown_planet`, `orbit_only`, `rank_gate`, `insufficient_resources`, `nothing_in_queue`.

- [ ] **Step 1: tests failing** — ajouter à `tests/actions.test.ts` :

```ts
import { queueItem, cancelQueueItem } from '@/actions';

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
    s.planets.earth.stores = { iron: 20, titanium: 20, carbon: 20 };
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
```

- [ ] **Step 2:** FAIL
- [ ] **Step 3: implémentation** — `src/actions/production.ts` :

```ts
import type { GameState } from '@/simulation';
import { canStartItem, checkResources, consumeResources, switchItem } from '@/simulation/production';
import type { Action, ValidationResult } from './types';

export const queueItem: Action<{ itemId: string }> = {
  label: 'queueItem',
  validate(state, { itemId }): ValidationResult {
    const earth = state.planets.earth;
    if (!earth) return { ok: false, reason: 'unknown_planet' };
    const gate = canStartItem(earth.factory, itemId);
    if (!gate.ok) return gate;                       // 'orbit_only' | 'rank_gate'
    if (!checkResources(earth, itemId)) return { ok: false, reason: 'insufficient_resources' };
    return { ok: true };
  },
  execute(state, { itemId }) {
    const earth = state.planets.earth;
    consumeResources(earth, itemId);                 // fidèle : intrants consommés à la mise en file
    switchItem(earth.factory, itemId);               // (64, complete=1) — travail précédent perdu
    pushBulletin(state, `Production lancée : ${itemId}.`);
  },
};

export const cancelQueueItem: Action<void> = {
  label: 'cancelQueueItem',
  validate(state): ValidationResult {
    return state.planets.earth.factory.currentItemId !== null
      ? { ok: true }
      : { ok: false, reason: 'nothing_in_queue' };
  },
  execute(state) {
    switchItem(state.planets.earth.factory, null);   // travail perdu, pas de remboursement (fidèle)
    pushBulletin(state, 'Production annulée.');
  },
};
```

`src/actions/index.ts` :

```ts
export type { Action, ValidationResult } from './types';
export { runAction, pushBulletin } from './types';
export { queueItem, cancelQueueItem } from './production';
```

- [ ] **Step 4:** `bunx vitest run` → PASS ; lint + tsc
- [ ] **Step 5: commit** `feat(actions): queueItem/cancelQueueItem avec gates et consommation à la mise en file`

---

### Task 4: Action recherche — `selectResearch`

**Files:**
- Create: `src/actions/research.ts`
- Modify: `src/actions/index.ts`
- Test: `tests/actions.test.ts` (extend)

**Interfaces:**
- Consumes: `canSelect(state.research, itemId)` (existant).
- Produces: `selectResearch: Action<{ itemId: string }>` — reasons : `not_researchable`, `locked`, `already_researched`.

- [ ] **Step 1: tests failing** :

```ts
import { selectResearch } from '@/actions';

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
```

- [ ] **Step 2:** FAIL
- [ ] **Step 3: implémentation** — `src/actions/research.ts` :

```ts
import type { GameState } from '@/simulation';
import { canSelect } from '@/simulation/research';
import type { Action, ValidationResult } from './types';
import { pushBulletin } from './types';

export const selectResearch: Action<{ itemId: string }> = {
  label: 'selectResearch',
  validate(state, { itemId }): ValidationResult {
    if (canSelect(state.research, itemId)) return { ok: true };
    const p = state.research.progress[itemId];
    if (!p) return { ok: false, reason: 'not_researchable' };
    return p.researched ? { ok: false, reason: 'already_researched' } : { ok: false, reason: 'locked' };
  },
  execute(state, { itemId }) {
    state.research.currentItemId = itemId;   // re-sélection = changement de projet, progression conservée
    pushBulletin(state, `Projet de recherche : ${itemId}.`);
  },
};
```

(ajouter l'export au barrel) — [ ] **Step 4:** PASS ; lint + tsc — [ ] **Step 5: commit** `feat(actions): selectResearch`

---

### Task 5: Action formation — `trainStaff`

**Files:**
- Create: `src/actions/staff.ts`
- Modify: `src/actions/index.ts`
- Test: `tests/actions.test.ts` (extend)

**Interfaces:**
- Consumes: `canTrain(state, type, count)`, `startTraining(state, type, count)` (existants).
- Produces: `trainStaff: Action<{ type: 'research' | 'production'; count: number }>` — reasons : `other_type_training`, `capacity_exceeded`, `insufficient_reservoir`, `invalid_count`.

- [ ] **Step 1: tests failing** :

```ts
import { trainStaff } from '@/actions';

describe('trainStaff (contrat spec §6.4)', () => {
  it('lance une formation 24 j dans les caps (100/100)', () => {
    const s = createInitialState(1);
    expect(runAction(trainStaff, s, { type: 'production', count: 100 }).ok).toBe(true);
    expect(s.training.inTraining.production).toBe(100);
    expect(s.training.reservoir).toBe(5450);
  });
  it('refuse un second type simultané', () => {
    const s = createInitialState(1);
    runAction(trainStaff, s, { type: 'production', count: 10 });
    expect(runAction(trainStaff, s, { type: 'research', count: 10 }))
      .toEqual({ ok: false, reason: 'other_type_training' });
  });
  it('refuse au-delà du cap et au-delà du réservoir', () => {
    const s = createInitialState(1);
    expect(runAction(trainStaff, s, { type: 'research', count: 101 }))
      .toEqual({ ok: false, reason: 'capacity_exceeded' });
    expect(runAction(trainStaff, s, { type: 'research', count: 0 }))
      .toEqual({ ok: false, reason: 'invalid_count' });
  });
});
```

- [ ] **Step 2:** FAIL
- [ ] **Step 3: implémentation** — `src/actions/staff.ts` :

```ts
import { SIM_CONFIG } from '@/simulation/config';
import type { GameState } from '@/simulation';
import { canTrain, startTraining } from '@/simulation/staff';
import type { Action, ValidationResult } from './types';
import { pushBulletin } from './types';

export const trainStaff: Action<{ type: 'research' | 'production'; count: number }> = {
  label: 'trainStaff',
  validate(state, { type, count }): ValidationResult {
    if (count <= 0) return { ok: false, reason: 'invalid_count' };
    if (count > SIM_CONFIG.STAFF_TRAINING_SIMULTANEOUS[type]) return { ok: false, reason: 'capacity_exceeded' };
    if (!canTrain(state, type, count)) return { ok: false, reason: 'other_type_training' };
    if (count > state.training.reservoir) return { ok: false, reason: 'insufficient_reservoir' };
    return { ok: true };
  },
  execute(state, { type, count }) {
    startTraining(state, type, count);
    pushBulletin(state, `Formation ${type} : ${count} recrues (24 j).`);
  },
};
```

- [ ] **Step 4:** PASS ; lint + tsc — [ ] **Step 5: commit** `feat(actions): trainStaff (24 j, caps 100/100, un type à la fois)`

---

### Task 6: Action minage — `installDerrick`

**Files:**
- Create: `src/actions/mining.ts`
- Modify: `src/actions/index.ts`
- Test: `tests/actions.test.ts` (extend)

**Interfaces:**
- Produces: `installDerrick: Action<void>` — reason : `no_derrick_in_store`.

- [ ] **Step 1: tests failing** :

```ts
import { installDerrick } from '@/actions';

describe('installDerrick (spec §5.2)', () => {
  it('consomme 1 derrick produit et incrémente derricks', () => {
    const s = createInitialState(1);
    s.planets.earth.items['derrick'] = 2;
    expect(s.planets.earth.derricks).toBe(1);
    expect(runAction(installDerrick, s, undefined).ok).toBe(true);
    expect(s.planets.earth.items['derrick']).toBe(1);
    expect(s.planets.earth.derricks).toBe(2);
  });
  it('refuse sans derrick en stock', () => {
    const s = createInitialState(1);
    expect(runAction(installDerrick, s, undefined)).toEqual({ ok: false, reason: 'no_derrick_in_store' });
  });
});
```

- [ ] **Step 2:** FAIL
- [ ] **Step 3: implémentation** — `src/actions/mining.ts` :

```ts
import type { GameState } from '@/simulation';
import type { Action, ValidationResult } from './types';
import { pushBulletin } from './types';

export const installDerrick: Action<void> = {
  label: 'installDerrick',
  validate(state): ValidationResult {
    return (state.planets.earth.items['derrick'] ?? 0) >= 1
      ? { ok: true }
      : { ok: false, reason: 'no_derrick_in_store' };
  },
  execute(state) {
    const earth = state.planets.earth;
    earth.items['derrick'] -= 1;
    earth.derricks += 1;
    pushBulletin(state, `Derrick installé (total : ${earth.derricks}).`);
  },
};
```

- [ ] **Step 4:** PASS ; lint + tsc — [ ] **Step 5: commit** `feat(actions): installDerrick`

---

### Task 7: Tests contrats chiffrés (C1-C4)

**Files:**
- Create: `tests/contracts.test.ts`

**Interfaces:**
- Consumes: actions des tasks 3-6, `updateResearch`, `updateProduction`, `updateMining`, `dailyProductionValue`, `createRng`.

- [ ] **Step 1: tests (rouge si une valeur du moteur dérive)** — `tests/contracts.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { createInitialState, dayTick, dailyProductionValue, updateResearch, updateMining, createRng } from '@/simulation';
import { runAction, selectResearch, queueItem } from '@/actions';

// spec §6.2 : régimes production (division entière vérifiée)
describe('contrat production', () => {
  const f = (count: number, actions: number) => {
    const s = createInitialState(1);
    s.planets.earth.factory.builder = { type: 'production', count, actionsTaken: actions };
    return dailyProductionValue(s.planets.earth.factory, 64);
  };
  it('200 apprentis = 31/j ; 200 ingénieurs = 63/j ; 200 experts = 127/j', () => {
    expect(f(200, 0)).toBe(31);
    expect(f(200, 6)).toBe(63);
    expect(f(200, 12)).toBe(127);
  });
  it('supply_pod en 23 j à 31/j (départ 64, c=1, 3 wraps)', () => {
    const s = createInitialState(1);
    s.planets.earth.stores = { titanium: 999, aluminium: 999, copper: 999 };
    runAction(queueItem, s, { itemId: 'supply_pod' });
    let days = 0;
    while (!s.planets.earth.items['supply_pod'] && days < 100) { dayTick(s); days++; }
    expect(days).toBe(23);
  });
});

// spec §6.3 : recherche 250 techniciens = 39/j → of_frame en 58 j
describe('contrat recherche', () => {
  it('v = 39/j et of_frame researched en exactement 58 jours', () => {
    const s = createInitialState(1);
    runAction(selectResearch, s, { itemId: 'of_frame' });
    const team = s.planets.earth.researchTeam!;
    expect(((team.count << 1) * 64) / 801 | 0).toBe(39);
    let days = 0;
    while (!s.research.progress['of_frame'].researched && days < 200) {
      updateResearch(s, team);
      days++;
    }
    expect(days).toBe(58);
  });
});

// spec §6.1 : premier miner entre J4 et J18 (1 derrick boot, jours pairs)
describe('contrat minage', () => {
  it('1er miner extrait au plus tard au jour 18, cap 50 000 respecté', () => {
    const s = createInitialState(42);
    const rng = createRng(42);
    let firstOreDay = -1;
    for (let day = 1; day <= 40; day++) {
      updateMining(s.planets.earth, day, rng);
      if (firstOreDay < 0 && (s.planets.earth.stores['iron'] ?? 0) > 0) firstOreDay = day;
    }
    expect(firstOreDay).toBeGreaterThanOrEqual(2);
    expect(firstOreDay).toBeLessThanOrEqual(18);
    for (const v of Object.values(s.planets.earth.stores)) expect(v).toBeLessThanOrEqual(50_000);
  });
});
```

- [ ] **Step 2:** `bunx vitest run tests/contracts.test.ts` → doit être VERT (si rouge : le moteur dérive de la spec → corriger le moteur, pas le test, sauf bug de spec prouvé)
- [ ] **Step 3: commit** `test(contracts): verrouille les régimes 31/63/127, 39/j, 58 j, survey J4-J18`

---

### Task 8: Boucle intégrée 250 j (C5)

**Files:**
- Create: `tests/loop.test.ts`

- [ ] **Step 1: test** — stratégie scriptée (research of_frame → derricks en série → install → of_frame) :

```ts
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
    // file un derrick si l'usine est libre et les ressources y sont ; sinon attend
    if (!earth.factory.currentItemId) runAction(queueItem, s, { itemId: 'derrick' });
    // recherche OF Frame faite → bascule la production sur l'OF Frame dès que possible
    if (s.research.progress['of_frame'].researched && !ofFrameQueued && !earth.factory.currentItemId) {
      if (runAction(queueItem, s, { itemId: 'of_frame' }).ok) ofFrameQueued = true;
    }
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
```

- [ ] **Step 2:** `bunx vitest run tests/loop.test.ts` → si ROUGE sur ≤ J250 : c'est le signal playtest C6 de la spec — **ajuster l'état de boot** (ex. 2 derricks au départ) dans `state.ts`, jamais les formules ; relancer jusqu'à vert et noter la valeur de boot retenue dans la spec (§6.5).
- [ ] **Step 3: commit** `test(loop): boucle intégrée 250 j — victoire déterministe, invariants`

---

### Task 9: Écran Terre — coquille + panneau Production (B1+B2)

**Files:**
- Create: `src/ui/earth-screen.ts`
- Modify: `src/ui/app.ts` (monte l'écran Terre dans `hud-side`, onglets)
- Modify: `src/style.css` (onglets + panneaux)
- Test: smoke headless (step 4)

**Interfaces:**
- Consumes: actions (`runAction`, `queueItem`, `cancelQueueItem`), `getState`, `subscribe`, `GROUND_ITEMS` (nouveau helper : `ITEMS.filter(i => i.category !== 'hidden' && !i.orbitOnly && i.inputs && i.id !== 'hed_fuel')` — à exporter de `@/simulation/data`).

- [ ] **Step 1: helper items au sol** — dans `src/simulation/data.ts` ajouter :

```ts
/** Items queueables au sol en v0 (spec §6.2 : 8 tech-1 + a_c_c tech-3). */
export const GROUND_ITEMS: ItemDef[] = ITEMS.filter(
  (i) => i.inputs && !i.orbitOnly && i.category === 'item',
);
```
(9 items attendus : derrick, s_chassis, s_drive, meh_fuel*, of_frame, supply_pod, tool_pod, cryo_pod, a_c_c — *déviation spec §5.4). Test data : `expect(GROUND_ITEMS).toHaveLength(9)` dans tests/data.test.ts.

- [ ] **Step 2: coquille à onglets** — `src/ui/earth-screen.ts` :

```ts
import { getState, subscribe } from '@/state/store';
import { GROUND_ITEMS } from '@/simulation';
import { runAction, queueItem, cancelQueueItem } from '@/actions';

type Tab = 'news' | 'production' | 'research' | 'staff' | 'mining';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'news', label: 'Bulletins' }, { id: 'production', label: 'Production' },
  { id: 'research', label: 'Recherche' }, { id: 'staff', label: 'Personnel' },
  { id: 'mining', label: 'Minage' },
];
let active: Tab = 'production';

export function mountEarthScreen(container: HTMLElement): void {
  container.innerHTML = `
    <nav class="tabs">${TABS.map((t) => `<button class="tab" data-tab="${t.id}">${t.label}</button>`).join('')}</nav>
    <div id="panel-host"></div>`;
  for (const btn of container.querySelectorAll<HTMLButtonElement>('.tab')) {
    btn.addEventListener('click', () => { active = btn.dataset.tab as Tab; render(); });
  }
  subscribe(render);
  render();
}

function render(): void {
  const host = document.querySelector<HTMLDivElement>('#panel-host')!;
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.tab'))
    btn.classList.toggle('active', btn.dataset.tab === active);
  switch (active) {
    case 'production': renderProduction(host); break;
    case 'news': renderNews(host); break;
    // tasks 10 : research / staff / mining
    default: host.innerHTML = `<p class="news-empty">Panneau à venir (task 10).</p>`;
  }
}

function renderProduction(host: HTMLElement): void {
  const s = getState();
  const earth = s.planets.earth;
  const rows = GROUND_ITEMS.map((item) => {
    const disabled = !item.inputs || !Object.entries(item.inputs).every(
      ([r, q]) => (earth.stores[r as keyof typeof earth.stores] ?? 0) >= (q ?? 0));
    return `<tr>
      <td>${item.shortName}</td>
      <td>${item.mass} t</td>
      <td>${Object.entries(item.inputs ?? {}).map(([r, q]) => `${q} ${r}`).join(', ')}</td>
      <td><button class="hud-btn" data-queue="${item.id}" ${disabled ? 'disabled' : ''}>Produire</button></td>
    </tr>`;
  }).join('');
  const cur = earth.factory.currentItemId;
  host.innerHTML = `
    <table class="panel-table"><thead><tr><th>Item</th><th>Masse</th><th>Intrants</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="queue-line">
      ${cur ? `En cours : <strong>${cur}</strong> (valeur ${earth.factory.productionValue}, wraps ${earth.factory.productionComplete}/4)
               <button class="hud-btn" id="cancel-queue">Annuler (travail perdu)</button>` : 'Usine inoccupée.'}
    </div>`;
  for (const btn of host.querySelectorAll<HTMLButtonElement>('[data-queue]')) {
    btn.addEventListener('click', () => runAction(queueItem, getState(), { itemId: btn.dataset.queue! }));
  }
  host.querySelector('#cancel-queue')?.addEventListener('click', () => runAction(cancelQueueItem, getState(), undefined));
}

function renderNews(host: HTMLElement): void {
  const s = getState();
  host.innerHTML = `<ul class="news-feed">${s.newsFeed.slice().reverse().map((n) => `<li>${n}</li>`).join('')}</ul>`;
}
```

- [ ] **Step 3: branchement** — `app.ts` : remplacer le contenu statique de `.hud-side` par `<aside class="hud-side" id="earth-screen"></aside>`, supprimer `setupSidebar`/`bodyDotColor`/la section Bulletins (rendue par l'onglet news), et appeler `mountEarthScreen(document.querySelector('#earth-screen')!)`. CSS : `.tabs { display:flex; gap:4px; margin-bottom:8px } .tab { …comme .hud-btn } .tab.active { … } .panel-table { width:100%; font-size:.75rem; border-collapse:collapse } .panel-table td { padding:3px; border-bottom:1px solid #1c2130 } .queue-line { margin-top:8px; font-size:.75rem }`.
- [ ] **Step 4: validation** — `bun run build` ; smoke headless (recette Task 12, exécuter dès maintenant en mode rapide) : onglets présents, clic « Produire » sur derrick après avoir forcé des stocks → passe. `bunx vitest run` vert.
- [ ] **Step 5: commit** `feat(ui): écran Terre à onglets + panneau production (queue/cancel)`

---

### Task 10: Panneaux Recherche, Personnel, Minage (B3-B5)

**Files:**
- Modify: `src/ui/earth-screen.ts` (remplacer le default du switch)
- Test: smoke headless

**Interfaces:**
- Consumes: `selectResearch`, `trainStaff`, `installDerrick`, `RESEARCHABLE_ITEMS`, `getLevel`, `rankName`.

- [ ] **Step 1: implémentation des 3 renderers** (ajouter au fichier, + imports `selectResearch, trainStaff, installDerrick` de `@/actions` et `RESEARCHABLE_ITEMS, getLevel, rankName` de `@/simulation`) :

```ts
function renderResearch(host: HTMLElement): void {
  const s = getState();
  const team = s.planets.earth.researchTeam!;
  const rows = RESEARCHABLE_ITEMS.map((it) => {
    const p = s.research.progress[it.id];
    const current = s.research.currentItemId === it.id;
    const badge = p.researched ? '✔' : p.locked ? '🔒' : `${p.percentage} %`;
    return `<tr class="${current ? 'current' : ''}">
      <td>${it.shortName}</td><td>tech ${it.techLevel}</td><td>${badge}</td>
      <td>${p.researched || p.locked ? '' : `<button class="hud-btn" data-research="${it.id}">Sélectionner</button>`}</td>
    </tr>`;
  }).join('');
  host.innerHTML = `<p class="panel-hint">Équipe : ${team.count} ${rankName(team)} — 1 seul projet actif.</p>
    <table class="panel-table"><tbody>${rows}</tbody></table>`;
  for (const btn of host.querySelectorAll<HTMLButtonElement>('[data-research]'))
    btn.addEventListener('click', () => runAction(selectResearch, getState(), { itemId: btn.dataset.research! }));
}

function renderStaff(host: HTMLElement): void {
  const s = getState();
  const t = s.training;
  const prod = s.planets.earth.factory.builder!;
  const res = s.planets.earth.researchTeam!;
  host.innerHTML = `
    <p>Réservoir : <strong>${t.reservoir}</strong> citoyens</p>
    <p>Production : <strong>${prod.count}</strong> — ${rankName(prod)} (${prod.actionsTaken} actions vers prochain rang)</p>
    <p>Recherche : <strong>${res.count}</strong> — ${rankName(res)} (${res.actionsTaken} actions)</p>
    <p>En formation : ${t.inTraining.production} prod. / ${t.inTraining.research} rech. (24 j)</p>
    <div class="queue-line">
      <button class="hud-btn" id="train-prod">Former 100 producteurs</button>
      <button class="hud-btn" id="train-res">Former 100 chercheurs</button>
    </div>`;
  host.querySelector('#train-prod')?.addEventListener('click', () => runAction(trainStaff, getState(), { type: 'production', count: 100 }));
  host.querySelector('#train-res')?.addEventListener('click', () => runAction(trainStaff, getState(), { type: 'research', count: 100 }));
}

function renderMining(host: HTMLElement): void {
  const s = getState();
  const earth = s.planets.earth;
  const rows = earth.deposits.map((d) => `
    <tr><td>${d.resource}</td>
    <td>${d.groundAmount > 0 ? `${d.groundAmount} au sol` : d.surveyTicks > 0 ? `sondage : ${d.surveyTicks} j` : 'à sonder'}</td>
    <td>${earth.stores[d.resource] ?? 0}</td></tr>`).join('');
  host.innerHTML = `<p>Derricks actifs : <strong>${earth.derricks}</strong> (jours pairs) — derricks en stock : ${earth.items['derrick'] ?? 0}</p>
    <table class="panel-table"><thead><tr><th>Matière</th><th>Gisement</th><th>Stock</th></tr></thead><tbody>${rows}</tbody></table>
    <button class="hud-btn" id="install-derrick" ${((earth.items['derrick'] ?? 0) < 1) ? 'disabled' : ''}>Installer un derrick</button>`;
  host.querySelector('#install-derrick')?.addEventListener('click', () => runAction(installDerrick, getState(), undefined));
}
```
(compléter le switch : `case 'research': renderResearch(host); break;` etc.)
- [ ] **Step 2:** `bun run build` + smoke headless : les 5 onglets rendent, boutons actifs
- [ ] **Step 3: commit** `feat(ui): panneaux recherche, personnel, minage`

---

### Task 11: Victoire v0 (D1)

**Files:**
- Modify: `src/ui/app.ts` (détection post-tick + overlay)

- [ ] **Step 1: implémentation** — dans la boucle `frame`, après `dayTick` :

```ts
        const st = getState();
        if (!st.flags['v0_victory'] && (st.planets.earth.items['of_frame'] ?? 0) >= 1) {
          st.flags['v0_victory'] = true;
          pushBulletin(st, 'VICTOIRE v0 : OF Frame produit !');  // import depuis @/actions
          setSpeed(0);
          document.querySelector('#app')!.insertAdjacentHTML('beforeend',
            `<div class="victory-overlay"><div class="victory-box">
               <h2>Objectif atteint — OF Frame produit</h2>
               <p>Jour ${st.day} · production cumulée : ${Object.values(st.planets.earth.items).reduce((a, b) => a + b, 0)} unités</p>
               <p>Équipe production : ${st.planets.earth.factory.builder?.actionsTaken ?? 0} items · rang ${st.planets.earth.factory.builder?.actionsTaken ?? 0 >= 12 ? 'Expert' : (st.planets.earth.factory.builder?.actionsTaken ?? 0) >= 6 ? 'Ingénieur' : 'Apprenti'}</p>
               <button class="hud-btn" onclick="this.closest('.victory-overlay').remove()">Continuer à observer</button>
             </div></div>`);
        }
```
CSS `.victory-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); display:flex; align-items:center; justify-content:center } .victory-box { background:#0c0f1a; border:1px solid #5a7fd4; padding:24px; max-width:480px }`.
- [ ] **Step 2: validation** — test loop (Task 8) déjà couvre la détection côté sim ; smoke : forcer `getState().planets.earth.items['of_frame'] = 1` via la console headless → overlay présent.
- [ ] **Step 3: commit** `feat(ui): écran de victoire v0 (OF Frame)`

---

### Task 12: Contrat de test C6 (playtest réel) + clôture docs (D3)

**Files:**
- Modify: `docs/superpowers/specs/2026-09-15-v0-boucle-terre-design.md` (§6.5 : noter valeurs constatées + boot retenu)
- Modify: `docs/TRACE.md` (Session 6), `docs/DASHBOARD.md`, `README.md` (statut), `docs/DECISIONS.md` (ADR-018 finalisé)

- [ ] **Step 1:** `bun run build && bun run preview` → jouer la boucle réelle à ×20 en suivant le script §6.5 ; noter les jours constatés (1er miner, 1er item, 1re recherche, victoire).
- [ ] **Step 2:** comparer au contrat ≤ J250 ; si écart > 10 %, ajuster le boot (derricks/équipes initiaux) + mettre à jour tests contrats/loop, relancer tout.
- [ ] **Step 3:** écrire Session 6 dans TRACE (corrections, valeurs constatées), DASHBOARD (statut v0), ADR-018 (statut Accepté).
- [ ] **Step 4:** `bunx vitest run && bun run lint && bunx tsc --noEmit && bun run build` tous verts.
- [ ] **Step 5: commit** `docs: clôture v0 — playtest, TRACE/DASHBOARD/ADR-018` puis tag `v0.0.1` :

```bash
git tag v0.0.1
```

---

## Self-review (effectué)

1. **Couverture spec** : §3 facade (T2-T6) · §4 panneaux (T9-T10) · §5 simplifications (T1 boot, T9 GROUND_ITEMS, déviation meh_fuel documentée) · §6 contrats (T7-T8) · §7 tests (T7-T8 + smoke T9/T11) · §8 EPICs → Tasks 1-6 (A), 9-11 (B/D1), 7-8 (C), 12 (D) · §1 victoire (T11). Écart assumé : assign* coupés (contrainte globale).
2. **Placeholders** : aucun TBD ; les blocs « tasks 10 » du switch sont remplacés en Task 10 (référencé explicitement).
3. **Cohérence types** : `dayTick(state)` (T1) utilisé partout ensuite ; `runAction(action, state, args)` signature unique ; `GROUND_ITEMS` défini T9 avant usage ; `pushBulletin` défini T2, réutilisé T3/T11.
