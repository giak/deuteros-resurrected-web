# Trace de session — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un journal texte brut de chaque partie (actions joueur avec raison d'échec + journal journalier du moteur) écrit dans la console DevTools sous `console.group` replié et dans un buffer FIFO 3000 consultable via `window.__TRACE__`.

**Architecture:** Nouveau module `src/trace/` (seul code qui touche `console`, aucun import depuis `src/simulation/`). La simulation est enrichie par retours purs : `updateResearch`/`updateProduction` retournent des objets structurés, `engine.dayTick` agrège tout dans `DayTickResult.journal: string[]` dans l'ordre des phases GameCore. `runAction` gagne un 4e paramètre optionnel `trace?: ActionTrace` (hook injecté, pas de dépendance actions→trace). Raccordement UI : `app.ts` (init + traceDay par tick), `earth-screen.ts` (passe `actionTrace` aux 6 call sites).

**Tech Stack:** TypeScript strict (ES2020, bundler resolution), DOM vanilla, vitest (environnement `node` — `console.group`/`console.groupEnd` disponibles), Vite. Alias `@/*` → `src/*` et chez vitest.

## Global Constraints

- Langue : messages de trace en **Français**.
- **Aucun** `Math.random`/`Date.now` ajouté dans `src/simulation/` ni `src/actions/`.
- La simulation **ne** touche **jamais** `console` : elle *retourne* les lignes dans `result.journal` ; l'écriture console/buffer est confinée à `src/trace/`.
- Format de ligne : texte brut, préfixé `[J<jour>]` puis une espace. Les lignes du journal moteur portent le numéro du jour **simulé** (pré-incrément, capturé au début du tick).
- `DayTickResult.day` conserve son sémantique actuelle (jour après tick = `before + 1`, contrat `state.test.ts` inchangé). Le préfixe `[J…]` du journal utilise le jour simulé (pré-incrément).
- Pas de champ ajouté à `GameState` (la trace ne fait pas partie du save). Buffer module-level dans `src/trace/`.
- Commandes de vérification : `bunx vitest run`, `bun run lint`, `bunx tsc --noEmit`, `bun run build`. Suite doit rester 81/81 + nouveaux tests.
- TDD : test ROUGE d'abord, puis implémentation minimale, suite VERTE, puis commit.
- Commits succincts en style repo (`feat(...)`, `docs(...)`), uni-thème, séparés.

---

## File Structure

- Create: `src/trace/trace.ts` — buffer, initTrace, traceDay, describeActionArgs, actionTrace, getTrace/clearTrace, exposition `window.__TRACE__`.
- Create: `src/trace/index.ts` — barrel `export * from './trace';` (imports propres `@/trace`).
- Modify: `src/simulation/types.ts` — ajouter `DayTickResult.journal: string[]`, types `ResearchDayResult`, `ProductionDayResult`.
- Modify: `src/simulation/research.ts` — `updateResearch` retourne `ResearchDayResult`.
- Modify: `src/simulation/production.ts` — `updateProduction` retourne `ProductionDayResult`.
- Modify: `src/simulation/engine.ts` — construit `journal` (recherche → production → minage → formation → ennemis → combat), capture `day` au début.
- Modify: `src/actions/types.ts` — interface `ActionTrace` + 4e paramètre optionnel dans `runAction`.
- Modify: `src/ui/app.ts` — `initTrace(state.seed)` au montage ; `traceDay(day, result.journal)` dans la boucle.
- Modify: `src/ui/earth-screen.ts` — import `actionTrace`, passé aux 6 `runAction(...)` call sites.
- Create: `tests/trace.test.ts` — trace module (+ `describeActionArgs`) + journal moteur.
- Modify: `tests/actions.test.ts` — bloc `runAction` avec hook (ok/échec, absence de hook).
- Modify: `tests/simulation.test.ts` — adapter les assertions cassées (objets de retour).
- Docs: `docs/TRACE.md` (Session 16), `docs/DECISIONS.md` (note exécution K10), `docs/DASHBOARD.md` (statistiques).

---

### Task 1: Module trace `src/trace/`

**Files:**
- Create: `src/trace/trace.ts`
- Create: `src/trace/index.ts`
- Test: `tests/trace.test.ts` (bloc « module trace » uniquement)

**Interfaces:**
- Produces :
  - `TRACE_BUFFER_CAP: number` (= 3000)
  - `initTrace(seed: number): void`
  - `traceDay(day: number, journal: string[]): void`
  - `describeActionArgs(args: unknown): string`
  - `actionTrace: { log(day: number, label: string, args: unknown, outcome: string): void }`
  - `getTrace(): string[]`, `clearTrace(): void`

- [ ] **Step 1: Write the failing test** (`tests/trace.test.ts`)

```ts
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
    for (let i = 0; i < TRACE_BUFFER_CAP + 5; i++) actionTrace.log(1, 'noop', { n: i }, 'ok');
    const t = getTrace();
    expect(t).toHaveLength(TRACE_BUFFER_CAP);
    expect(t[0]).toContain('n: 5');
    expect(t[t.length - 1]).toContain('n: 4');
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/trace.test.ts`
Expected: FAIL — `Cannot find module '@/trace'`.

- [ ] **Step 3: Write the implementation**

`src/trace/trace.ts`:

```ts
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
 * Un journal de journée (résumé moteur) → console.group repliée + buffer.
 * Les lignes de `journal` sont déjà préfixées `[J<day>]` (produites par le moteur).
 */
export function traceDay(day: number, journal: string[]): void {
  if (journal.length === 0) return;
  console.group(`[J${day}] · ${journal.length} lignes`);
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
```

`src/trace/index.ts`:

```ts
export * from './trace';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run tests/trace.test.ts`
Expected: PASS (bloc module trace).

- [ ] **Step 5: Verify static + full suite**

Run: `bun run lint && bunx tsc --noEmit`
Expected: 0 erreur, 0 warning.

- [ ] **Step 6: Commit**

```bash
git add src/trace/trace.ts src/trace/index.ts tests/trace.test.ts
git commit -m "feat(trace): module trace console+buffer (FIFO 3000) et découplage des args"
```

---

### Task 2: Retours purs de la simulation (research + production)

**Files:**
- Modify: `src/simulation/types.ts`
- Modify: `src/simulation/research.ts`
- Modify: `src/simulation/production.ts`
- Modify: `tests/simulation.test.ts`

**Interfaces:**
- Consumes: contracts existants (formules /801, wraps, gates) — ne pas les changer.
- Produces:
  - `ResearchDayResult { finished: string | null; progress: { itemId: string; percentage: number } | null; blocked: boolean }`
  - `ProductionDayResult { finished: string | null; itemId: string | null; value: number; wraps: number; blocked: boolean }`
  - `updateResearch(state: GameState, staff: Staff | null): ResearchDayResult`
  - `updateProduction(planet: PlanetRuntime): ProductionDayResult`

- [ ] **Step 1: Write the failing tests** — adapter `tests/simulation.test.ts` aux nouveaux retours + ajouter les assertions du contrat de trace.

Remplacez dans le test « terminé exactement à 4 wraps » (ligne ~83) :

```ts
    const done = updateProduction(p);
    expect(done).toBe('tool_pod');
```
par :
```ts
    const done = updateProduction(p);
    expect(done.finished).toBe('tool_pod');
    expect(done.itemId).toBe('tool_pod');
    expect(done.value).toBe(0);
    expect(done.wraps).toBe(4);
    expect(done.blocked).toBe(false);
```

Dans le test « AOC produit à v fixe 128 » (~ligne 104), `done` est utilisé en condition de boucle (`!done`) : un objet est toujours truthy → la boucle s'arrêterait au premier tour. Remplacez tout le bloc :

```ts
    let done: string | null = null;
    let days = 0;
    for (let i = 0; i < 10 && !done; i++) { done = updateProduction(p); days++; }
    expect(done).toBe('supply_pod');
```
par :
```ts
    let done: ProductionDayResult | null = null;
    let days = 0;
    for (let i = 0; i < 10 && !(done?.finished); i++) { done = updateProduction(p); days++; }
    expect(done?.finished).toBe('supply_pod');
```

Dans le test « produire l'AOC libère l'équipe » (~ligne 124) :

```ts
    const done = updateProduction(p);
    expect(done).toBe('a_o_c');
```
par :
```ts
    const done = updateProduction(p);
    expect(done.finished).toBe('a_o_c');
```

Dans le test « gate par rang du chef » (~ligne 162) :

```ts
    expect(updateResearch(state, novice)).toBeNull();
```
par :
```ts
    const out = updateResearch(state, novice);
    expect(out.finished).toBeNull();
    expect(out.blocked).toBe(true);
    expect(out.progress?.itemId).toBe('m_t_x');
```

Dans le test « aucune progression sans équipe » (~ligne 188) :

```ts
    expect(updateResearch(state, null)).toBeNull();
```
par :
```ts
    const out = updateResearch(state, null);
    expect(out.finished).toBeNull();
    expect(out.blocked).toBe(true);
```

Ajoutez en fin de fichier `tests/simulation.test.ts` (avant la dernière accolade ou après le dernier `describe`) :

```ts
describe('retours enrichis (trace — task 2)', () => {
  it('updateProduction : arrêt (pas d\'équipe) → itemId null, blocked true', () => {
    const p = mkPlanet({
      factory: {
        currentItemId: 'derrick',
        productionValue: 64,
        productionComplete: 1,
        prodCycle: 0,
        builder: null,
        aoc: false,
        inOrbit: false,
      },
    });
    const out = updateProduction(p);
    expect(out.finished).toBeNull();
    expect(out.itemId).toBe('derrick');
    expect(out.blocked).toBe(true);
  });
  it('updateResearch : progression en cours → progress {itemId, percentage}, blocked false', () => {
    const state = createInitialState(42);
    state.research.progress['of_frame'] = { researched: false, researchValue: 64, percentage: 1, researchOrder: 0, locked: false };
    state.research.currentItemId = 'of_frame';
    const team = mkStaff('research', 250, 0); // Technician, v = 39
    const out = updateResearch(state, team);
    expect(out.finished).toBeNull();
    expect(out.blocked).toBe(false);
    expect(out.progress).toEqual({ itemId: 'of_frame', percentage: 1 });
    expect(out.progress?.percentage).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/simulation.test.ts`
Expected: FAIL — incompatibilités de type / `done` object truthy / `toBeNull`.

- [ ] **Step 3: Update types** (`src/simulation/types.ts`)

Ajoutez après l'interface `DayTickResult` :

```ts
/** Retour enrichi d'un jour de recherche (trace task 2). */
export interface ResearchDayResult {
  /** itemId terminé ce jour (100 %), sinon null. */
  finished: string | null;
  /** Progression courante du projet actif (itemId + pourcentage), null si aucun projet. */
  progress: { itemId: string; percentage: number } | null;
  /** true si un projet est sélectionné mais ne progresse pas (pas d'équipe / rang insuffisant). */
  blocked: boolean;
}

/** Retour enrichi d'un jour de production (trace task 2). */
export interface ProductionDayResult {
  /** itemId terminé ce jour (4 wraps), sinon null. */
  finished: string | null;
  /** item en cours (null si usine à l'arrêt). */
  itemId: string | null;
  /** Valeur 8 bits en fin de jour (0 après complétion). */
  value: number;
  /** Wraps effectués (PRODUCTION_MAX_WRAPS à la complétion). */
  wraps: number;
  /** true si un item est en file mais sans équipe (usine à l'arrêt). */
  blocked: boolean;
}
```

- [ ] **Step 4: Update `updateResearch`** (`src/simulation/research.ts`)

Remplacez le corps de la fonction (conservant la logique exacte) :

```ts
export function updateResearch(state: GameState, staff: Staff | null): ResearchDayResult {
  const research = state.research;
  const id = research.currentItemId;
  if (!id) return { finished: null, progress: null, blocked: false };

  const item = getItem(id);
  if (item.researchIndex === undefined) return { finished: null, progress: null, blocked: false };
  const p = research.progress[id];
  if (!p || p.researched) return { finished: null, progress: null, blocked: false };

  // Projet actif mais non progressé : pas d'équipe / rang insuffisant
  if (!staff || staff.count === 0) {
    return { finished: null, progress: { itemId: id, percentage: p.percentage }, blocked: true };
  }
  const level = getLevel(staff);
  if (level < (item.techLevel ?? 0)) {
    return { finished: null, progress: { itemId: id, percentage: p.percentage }, blocked: true };
  }

  const v = Math.floor(((staff.count << level) * (item.researchMultiplier ?? 64)) / SIM_CONFIG.RESEARCH_DIVISOR);

  if (p.researchValue + v > SIM_CONFIG.RESEARCH_WRAP_THRESHOLD) {
    p.researchValue = (p.researchValue + v) & 0xff; // wraparound 8 bits
    if (p.percentage < SIM_CONFIG.RESEARCH_MAX_PERCENTAGE) {
      p.percentage = Math.min(100, p.percentage + SIM_CONFIG.RESEARCH_WRAP_INCREMENT);
    }
  } else {
    p.researchValue += v;
  }

  if (p.percentage >= SIM_CONFIG.RESEARCH_MAX_PERCENTAGE) {
    p.researched = true;
    p.researchOrder =
      Object.values(research.progress).filter((x) => x.researched).length;
    staff.actionsTaken += 1;
    return { finished: id, progress: null, blocked: false };
  }
  return { finished: null, progress: { itemId: id, percentage: p.percentage }, blocked: false };
}
```

- [ ] **Step 5: Update `updateProduction`** (`src/simulation/production.ts`)

Remplacez le corps de la fonction (logique inchangée, retour enrichi) :

```ts
export function updateProduction(planet: PlanetRuntime): ProductionDayResult {
  const f = planet.factory;
  if (!f.currentItemId) return { finished: null, itemId: null, value: 0, wraps: 0, blocked: false };
  if (!f.aoc && (!f.builder || f.builder.count === 0)) {
    return { finished: null, itemId: f.currentItemId, value: f.productionValue, wraps: f.productionComplete, blocked: true };
  }

  const item = getItem(f.currentItemId);
  const v = dailyProductionValue(f, item.researchMultiplier ?? 64);

  f.prodCycle = (f.prodCycle + 1) % SIM_CONFIG.PROD_CYCLE_RESET;

  // Wrap 8 bits (Factory.cs : si dépasse 255 → &= 0xFF, Production_Complete++)
  if (f.productionValue + v > SIM_CONFIG.PRODUCTION_WRAP_THRESHOLD) {
    f.productionValue = (f.productionValue + v) & 0xff;
    if (f.productionComplete < SIM_CONFIG.PRODUCTION_MAX_WRAPS) f.productionComplete += 1;
  } else {
    f.productionValue += v;
  }

  // Item terminé (Production_Complete == 4 → ProductionItem.Complete)
  if (f.productionComplete >= SIM_CONFIG.PRODUCTION_MAX_WRAPS) {
    const finished = item.id;
    planet.items[item.id] = (planet.items[item.id] ?? 0) + 1;
    if (!f.aoc && f.builder) f.builder.actionsTaken += 1;
    f.prodCycle = 0;
    if (item.id === 'a_o_c') {
      // AOC produite : équipe libérée, usine automatisée, 1 seul exemplaire
      f.aoc = true;
      f.builder = null;
      f.currentItemId = null;
    } else {
      f.currentItemId = null;
    }
    f.productionValue = 0;
    f.productionComplete = 0;
    return { finished, itemId: finished, value: 0, wraps: SIM_CONFIG.PRODUCTION_MAX_WRAPS, blocked: false };
  }
  return { finished: null, itemId: item.id, value: f.productionValue, wraps: f.productionComplete, blocked: false };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bunx vitest run tests/simulation.test.ts tests/contracts.test.ts tests/actions.test.ts tests/state.test.ts`
Expected: PASS (adaptations + nouveaux tests verts).

- [ ] **Step 7: Verify static + full suite**

Run: `bun run lint && bunx tsc --noEmit && bunx vitest run`
Expected: 0 erreur, suite complète verte.

- [ ] **Step 8: Commit**

```bash
git add src/simulation/types.ts src/simulation/research.ts src/simulation/production.ts tests/simulation.test.ts
git commit -m "feat(simulation): retours purs enrichis research/production pour la trace"
```

---

### Task 3: Journal moteur dans `engine.dayTick`

**Files:**
- Modify: `src/simulation/engine.ts`
- Modify: `src/simulation/index.ts` (exporter les nouveaux types)
- Test: `tests/trace.test.ts` (bloc « journal moteur »)

**Interfaces:**
- Consumes: `ResearchDayResult`, `ProductionDayResult` (Task 2), `updateMining` (retour déjà `Partial<Record<string, number>>`), `updateEnemyBuild` (`number`), NULL.
- Produces: `DayTickResult.journal: string[]` — lignes préfixées `[J<day simulé>] …`, dans l'ordre des phases.

- [ ] **Step 1: Write the failing tests** — ajoutez en fin de `tests/trace.test.ts` :

```ts
import { createInitialState, dayTick, updateMining } from '@/simulation';
import { runAction, selectResearch, queueItem } from '@/actions';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/trace.test.ts`
Expected: FAIL — `r.journal` n'existe pas.

- [ ] **Step 3: Add `journal` to `DayTickResult`** (`src/simulation/types.ts`)

Dans l'interface `DayTickResult`, ajoutez après `battlesResolved` :

```ts
  /** Lignes de trace du jour (texte brut, préfixées `[J<jour simulé>]` — spec K10). */
  journal: string[];
```

- [ ] **Step 4: Update `engine.dayTick`** (`src/simulation/engine.ts`)

Remplacez la fonction entière :

```ts
/**
 * Avance la simulation d'un jour. La même instance `state` est mutée ;
 * un résultat lisible est retourné pour l'UI (news, animations, trace).
 * `journal` contient les lignes de trace, préfixées `[J<day>]` avec `<day>`
 * = jour simulé (pré-incrément). Ordre des phases : recherche, production,
 * minage, formation, ennemis, combat (GameCore.cs).
 */
export function dayTick(state: GameState): DayTickResult {
  const day = state.day; // jour simulé (pré-incrément)
  const result: DayTickResult = {
    day: state.day,
    produced: [],
    researchFinished: null,
    enemyDronesBuilt: 0,
    battlesResolved: [],
    journal: [],
  };
  const journal = result.journal;

  const rng = createRng(state.seed ^ (state.day * 0x9e3779b9));

  // 2. Recherche (1 seul projet, équipe Terre)
  const research = updateResearch(state, state.planets.earth.researchTeam);
  if (research.finished) {
    result.researchFinished = research.finished;
    journal.push(`[J${day}] recherche achevée : ${research.finished}.`);
  } else if (research.blocked && research.progress) {
    journal.push(`[J${day}] recherche ${research.progress.itemId} — bloquée.`);
  } else if (research.progress) {
    journal.push(`[J${day}] recherche ${research.progress.itemId} — ${research.progress.percentage}%.`);
  }

  // 3. Production + minage : chaque corps actif
  for (const planet of Object.values(state.planets)) {
    const active = planet.factory.currentItemId !== null || planet.derricks > 0 || planet.baseBuildParts > 0;
    if (!active) continue;

    const prod = updateProduction(planet);
    if (prod.finished) {
      result.produced.push({ planetId: planet.id, itemId: prod.finished });
      journal.push(`[J${day}] production ${prod.finished} → terminée (wraps ${prod.wraps}, valeur ${prod.value}).`);
    } else if (prod.itemId) {
      if (prod.blocked) {
        journal.push(`[J${day}] production ${prod.itemId} → bloquée (pas d'équipe).`);
      } else {
        journal.push(`[J${day}] production ${prod.itemId} — valeur ${prod.value}/${SIM_CONFIG.PRODUCTION_WRAP_THRESHOLD} wrap ${prod.wraps}.`);
      }
    }

    const mined = updateMining(planet, state.day, rng);
    for (const [res, amount] of Object.entries(mined)) {
      journal.push(`[J${day}] minage ${planet.id} ${res} +${amount}.`);
    }
  }

  // 4bis. Formation (durées 24 j — résolue au passage de jour)
  updateTraining(state, (type, count) => {
    if (type === 'production') {
      const b = state.planets.earth.factory.builder;
      if (b) b.count += count;
      else state.planets.earth.factory.builder = { type: 'production', count, actionsTaken: 0 };
    } else if (type === 'research') {
      const r = state.planets.earth.researchTeam;
      if (r) r.count += count;
      else state.planets.earth.researchTeam = { type: 'research', count, actionsTaken: 0 };
    }
    // marines : hors v0 (spec §9) — la promotion rejoint le réservoir d'affectation UI
    journal.push(`[J${day}] formation ${type} : +${count} recrues.`);
  });

  // 5. Ennemis
  result.enemyDronesBuilt = updateEnemyBuild(state);
  if (result.enemyDronesBuilt > 0) {
    journal.push(`[J${day}] ennemis : ${result.enemyDronesBuilt} drones construits.`);
  }

  // 8. Combat (rounds journaliers)
  for (const battle of state.battles) {
    battleRound(battle, rng);
    if (battle.ended) {
      result.battlesResolved.push(battle);
      journal.push(`[J${day}] combat terminé : ${battle.p1.fleetId} vs ${battle.p2.fleetId}.`);
    }
  }
  state.battles = state.battles.filter((b) => !b.ended);

  state.day += 1;
  result.day = state.day;
  return result;
}
```

- [ ] **Step 5: Export the new types** (`src/simulation/index.ts`)

Dans le bloc `export type { ... }`, ajoutez `ResearchDayResult, ProductionDayResult` :

```ts
export type {
  GameState,
  PlanetRuntime,
  Factory,
  Staff,
  StaffType,
  ResearchState,
  TrainingState,
  Fleet,
  Battle,
  DayTickResult,
  ResearchDayResult,
  ProductionDayResult,
} from './types';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bunx vitest run tests/trace.test.ts tests/integration.test.ts tests/repro-playtest.test.ts`
Expected: PASS (journal vert, boucle 250 j + playtest toujours déterministes).

- [ ] **Step 7: Verify static + full suite**

Run: `bun run lint && bunx tsc --noEmit && bunx vitest run`
Expected: 0 erreur, suite complète verte (81 + nouveaux).

- [ ] **Step 8: Commit**

```bash
git add src/simulation/types.ts src/simulation/engine.ts src/simulation/index.ts tests/trace.test.ts
git commit -m "feat(simulation): journal de tick dans DayTickResult (ordre des phases)"
```

---

### Task 4: Hook de trace dans `runAction`

**Files:**
- Modify: `src/actions/types.ts`
- Modify: `tests/actions.test.ts`

**Interfaces:**
- Consumes: `ActionTrace` structural = `{ log(day, label, args, outcome) }` (le module trace exporte `actionTrace` qui s'y conforme).
- Produces: `runAction<T>(action, state, args, trace?: ActionTrace): ValidationResult` — trace émise succès ET échec, paramètre optionnel (aucun impact sur les call sites existants).

- [ ] **Step 1: Write the failing tests** — ajoutez en fin de `tests/actions.test.ts` (dans `describe('facade runAction')` ou un nouveau describe) :

```ts
describe('runAction + trace (task 4)', () => {
  const capture = () => {
    const lines: string[] = [];
    const trace = {
      log: (day: number, label: string, args: unknown, outcome: string) => {
        lines.push(JSON.stringify({ day, label, args, outcome }));
      },
    };
    return { lines, trace };
  };

  it('émet une ligne sur succès avec args et "ok"', () => {
    const s = createInitialState(1);
    const { lines, trace } = capture();
    runAction(noop, s, { n: 1 }, trace);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({ day: 1, label: 'noop', args: { n: 1 }, outcome: 'ok' });
  });

  it('émet une ligne sur échec avec la raison brute', () => {
    const s = createInitialState(1);
    const { lines, trace } = capture();
    runAction(noop, s, { n: 0 }, trace);
    expect(JSON.parse(lines[0]).outcome).toBe('échec (must_be_positive)');
  });

  it('sans hook, aucun appel (régression signature optionnelle)', () => {
    const s = createInitialState(1);
    expect(() => runAction(noop, s, { n: 1 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/actions.test.ts`
Expected: FAIL — `runAction` n'accepte pas 4 arguments.

- [ ] **Step 3: Update `runAction`** (`src/actions/types.ts`)

Ajoutez après la définition de `ValidationResult` :

```ts
/** Hook de trace injectable (module trace) — la trace n'est jamais importée par actions. */
export interface ActionTrace {
  log(day: number, label: string, args: unknown, outcome: string): void;
}
```

Remplacez la fonction `runAction` :

```ts
/** Unique point de mutation : validate → execute → notify → trace (succès ET échec). */
export function runAction<T>(
  action: Action<T>,
  state: GameState,
  args: T,
  trace?: ActionTrace,
): ValidationResult {
  const v = action.validate(state, args);
  if (v.ok) {
    action.execute(state, args);
    notify();
  }
  trace?.log(state.day, action.label, args, v.ok ? 'ok' : `échec (${v.reason})`);
  return v;
}
```

Exportez le type : dans `src/actions/index.ts`, remplacez la première ligne par :

```ts
export type { Action, ActionTrace, ValidationResult } from './types';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run tests/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify static + full suite**

Run: `bun run lint && bunx tsc --noEmit && bunx vitest run`
Expected: 0 erreur, suite verte.

- [ ] **Step 6: Commit**

```bash
git add src/actions/types.ts src/actions/index.ts tests/actions.test.ts
git commit -m "feat(actions): hook de trace injectable dans runAction (succès + échecs)"
```

---

### Task 5: Raccordement UI (app + earth-screen)

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/ui/earth-screen.ts`

**Interfaces:**
- Consumes: `initTrace`, `traceDay`, `actionTrace` from `@/trace`.

- [ ] **Step 1: Wire `app.ts`**

Ajoutez à l'import (`src/ui/app.ts:10`) :

```ts
import { initTrace, traceDay } from '@/trace';
```

Dans `mountApp`, juste après `initGame(state);` :

```ts
  initTrace(state.seed);
```

Dans `startLoop`, remplacez le cœur de la boucle (lignes ~82-87) :

```ts
      const result = dayTick(getState());
      traceDay(result.day - 1, result.journal);
      pushNews(result);
```

(Note : `result.day` est le jour après tick ; `result.day - 1` = jour simulé du journal, cohérent avec `traceDay` dans les tests.)

- [ ] **Step 2: Wire `earth-screen.ts`**

Ajoutez à l'import des actions (ligne 8) :

```ts
import { actionTrace } from '@/trace';
```

Puis passez `actionTrace` aux 6 call sites `runAction` :

- ligne 193 (`queueItem`) :
```ts
    btn.addEventListener('click', () => runAction(queueItem, getState(), { itemId: btn.dataset.queue! }, actionTrace));
```
- ligne 197 (`cancelQueueItem`) :
```ts
    ?.addEventListener('click', () => runAction(cancelQueueItem, getState(), undefined, actionTrace));
```
- ligne 220 (`selectResearch`) :
```ts
    btn.addEventListener('click', () => runAction(selectResearch, getState(), { itemId: btn.dataset.research! }, actionTrace));
```
- ligne 234 (`trainStaff` production) :
```ts
  host.querySelector('#train-prod')?.addEventListener('click', () => runAction(trainStaff, getState(), { type: 'production', count: 100 }, actionTrace));
```
- ligne 235 (`trainStaff` recherche) :
```ts
  host.querySelector('#train-res')?.addEventListener('click', () => runAction(trainStaff, getState(), { type: 'research', count: 100 }, actionTrace));
```
- ligne 249 (`installDerrick`) :
```ts
  host.querySelector('#install-derrick')?.addEventListener('click', () => runAction(installDerrick, getState(), undefined, actionTrace));
```

- [ ] **Step 3: Verify build + suite**

Run: `bun run lint && bunx tsc --noEmit && bunx vitest run && bun run build`
Expected: 0 erreur, 81/81 + nouveaux tests verts, build Vite vert.

- [ ] **Step 4: Commit**

```bash
git add src/ui/app.ts src/ui/earth-screen.ts
git commit -m "feat(ui): trace branchée — init au montage, traceDay dans la boucle, hook actions"
```

---

### Task 6: Docs de clôture

**Files:**
- Modify: `docs/TRACE.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/DASHBOARD.md`

- [ ] **Step 1: Session 16 dans `docs/TRACE.md`**

Insérez en tête (après le bloc d'en-tête) une nouvelle `## Session 16 — 2026-09-17 (trace de session K10)` décrivant succinctement : objectif, les 6 tâches, les signatures changées (`ResearchDayResult`, `ProductionDayResult`, `DayTickResult.journal`, `runAction(…, trace?)`), le nouveau module `src/trace/`, la suite de tests finale (count exact après exécution), les commits, et « Prochaines étapes : retour sur task 12 (playtest avec trace) + clôture v0 + tag ».

- [ ] **Step 2: Note d'exécution dans `docs/DECISIONS.md`**

Étendez la section `## K10` (paragraphe « Conséquences ») avec une sous-section `**Exécution (plan 2026-09-17-trace-session)**` listant : les retours purs enrichis, `runAction(…, trace?)` (4e paramètre optionnel), le journal préfixé `[J<jour simulé>]`, et le choix `blocked`/`progress` pour les états « bloqués ». Ajoutez une ligne au `Journal des révisions` :

```
| 2026-09-17 | K10 exécuté (plan trace-session) : src/trace/, journal moteur, hook runAction, raccordement UI |
```

- [ ] **Step 3: Mise à jour `docs/DASHBOARD.md`**

Statistiques : mettez à jour « Tests » avec le compte final de la suite et « Commits » ; ajoutez une ligne « Trace de session » si un tableau de documents existe, sinon laissez la section 5/6 cohérente.

- [ ] **Step 4: Verify suite complète une dernière fois**

Run: `bunx vitest run && bun run lint && bunx tsc --noEmit && bun run build`
Expected: tout vert.

- [ ] **Step 5: Commit**

```bash
git add docs/TRACE.md docs/DECISIONS.md docs/DASHBOARD.md
git commit -m "docs(trace): clôture de session — TRACE 16, exécution K10, dashboard"
```

---

## Self-Review

**Spec coverage :**
- §1/§2 (objectif, granularité actions+moteur, console+buffer, FIFO 3000, format texte brut, échecs+raison, group replié) → Task 1 (module), Task 3 (journal moteur), Task 4 (actions+raison), Task 5 (raccordement).
- §3.1 (`src/trace/trace.ts`, `window.__TRACE__`, cap 3000, aucune dépendance simulation) → Task 1.
- §3.2 (retours purs : `updateResearch`/`updateProduction` enrichis, `DayTickResult.journal`, ordre des phases) → Task 2, Task 3.
- §3.3 (hook injecté optionnel, succès ET échec, pas de dépendance actions→trace) → Task 4.
- §3.4 (init au montage, traceDay dans la boucle, hook dans les call sites UI) → Task 5.
- §4 (format `[J<n>]`, recherche chaque jour/production/minage/mat, événements) → Task 3 (sondages volontairement non tracés : `updateMining` ne les expose pas — conservé « peut », hors périmètre d'exécution).
- §5 (stratégie tests : moteur pur, actions+hook, trace, smoke inchangé) → Tasks 1-5.
- §6 hors périmètre respecté (pas de panel in-game/export/localStorage/replay).

**Placeholder scan :** aucune valeur « TBD/TODO » ; chaque étape contient le code complet ou l'édition exacte.

**Type consistency :** `ResearchDayResult`/`ProductionDayResult` définis en Task 2 et consommés en Task 3 ; `DayTickResult.journal` ajouté en Task 3 ; `ActionTrace` défini en Task 4, `actionTrace` (Task 1) structurellement conforme ; `traceDay(day, journal)` signé en Task 1, appelé avec `result.day - 1` en Task 5 (documenté). `result.day` pré-incrément vs simulé : cohérent partout.