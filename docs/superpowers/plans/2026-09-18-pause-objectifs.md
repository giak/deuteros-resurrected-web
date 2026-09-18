# Pause auto sur objectif atteint — Implementation Plan (K11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interrompre l'écoulement du temps dès qu'un objectif productif se termine (recherche achevée, item produit, formation à échéance) et afficher une bannière « Objectif atteint » jusqu'à la reprise.

**Architecture:** Approche A de la spec — le moteur fournit un signal pur (la formation est le seul cas sans signal structuré : on ajoute `trainingFinished` à `DayTickResult`, rempli dans le callback `updateTraining` de `dayTick`). `app.ts` lit les trois signaux (`researchFinished`, `produced`, `trainingFinished`) via des helpers purs exportés, agrège les complétions d'une même frame, puis pausé via `setSpeed(0)` + bannière DOM. Reprise → retour à la vitesse d'avant.

**Tech Stack:** TypeScript, Vite, Vitest, DOM vanilla.

## Global Constraints

- Messages UI et tests en **Français**.
- Aucun `Math.random`/`Date.now` ajouté dans `src/simulation/` ni `src/actions/`.
- La simulation ne touche jamais `console` (retours purs, ADR-002) — le `console.log` reste confiné à `src/trace/`.
- Aucun champ ajouté à `GameState` (retours purs via `DayTickResult`).
- `runAction` garde son 4e paramètre optionnel — non modifié ici.
- La trace n'est pas modifiée (spec §3.5) : la ligne `[J<n>] formation/achevée/terminée` du journal suffit.
- Vérifications à chaque fin de tâche : `npm run test:run`, `npm run lint` (eslint `src/`), `npm run build` (tsc + vite).
- Docs : `docs/DECISIONS.md` (décision K11 + ligne « Journal des révisions »), `docs/TRACE.md` (Session 17 en tête), `docs/DASHBOARD.md` (compte de tests mis à jour).

---

### Task 1: Moteur — signal `DayTickResult.trainingFinished`

**Files:**
- Modify: `src/simulation/types.ts:134-142` (interface `DayTickResult`)
- Modify: `src/simulation/engine.ts:25-32` (init du champ) et `:72-84` (push dans le callback `updateTraining`)
- Test: `tests/simulation.test.ts`

**Interfaces:**
- Consumes: `updateTraining(state, assign)` (src/simulation/staff.ts:56) — le callback reçoit `(type: StaffType, count: number)` à chaque promotion arrivée à échéance.
- Produces: `DayTickResult.trainingFinished: Array<{ type: StaffType; count: number }>` — formaté par `dayTick`, consommé par les helpers de la Task 2.

- [ ] **Step 1: Écrire le test qui échoue**

Append `tests/simulation.test.ts`, nouveau `describe` en fin de fichier :

```ts
describe('pause auto — signal moteur trainingFinished (K11)', () => {
  it('dayTick : formation à échéance (24 j) renvoie trainingFinished {type,count} + ligne journal', () => {
    const state = createInitialState(1);
    expect(startTraining(state, 'production', 100)).toBe(true);
    state.day += 24;
    const result = dayTick(state);
    expect(result.trainingFinished).toEqual([{ type: 'production', count: 100 }]);
    expect(result.journal).toContain('[J25] formation production : +100 recrues.');
    expect(state.training.inTraining.production).toBe(0);
  });

  it('dayTick : sans échéance, trainingFinished est vide', () => {
    const state = createInitialState(1);
    startTraining(state, 'production', 100);
    state.day += 23;
    expect(dayTick(state).trainingFinished).toEqual([]);
  });
});
```

Note : `startTraining` est déjà importé dans ce fichier (ligne 24), `dayTick` aussi (ligne 9). `createInitialState(1).day === 1` ; après `+= 24` le jour simulé vaut 25, préfixe journal `[J25]`.

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run tests/simulation.test.ts -t trainingFinished`
Expected: FAIL — `result.trainingFinished is undefined` (le champ n'existe pas encore sur le type)

- [ ] **Step 3: Implémentation minimale**

`src/simulation/types.ts` — dans `DayTickResult`, après `battlesResolved` (ligne 139) :

```ts
  /** Formations arrivées à échéance ce jour (type + effectif promu). */
  trainingFinished: Array<{ type: StaffType; count: number }>;
```

`src/simulation/engine.ts` — dans le littéral `result` (lignes 25-32) :

```ts
  const result: DayTickResult = {
    day: state.day,
    produced: [],
    researchFinished: null,
    enemyDronesBuilt: 0,
    battlesResolved: [],
    trainingFinished: [],
    journal: [],
  };
```

`src/simulation/engine.ts` — dans le callback `updateTraining` (lignes 72-84), juste après le `journal.push(...)` :

```ts
    result.trainingFinished.push({ type, count });
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run tests/simulation.test.ts -t trainingFinished`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/simulation/types.ts src/simulation/engine.ts tests/simulation.test.ts && git commit -m "feat(simulation): DayTickResult.trainingFinished — signal moteur (K11)"
```

---

### Task 2: Helpers purs `completedObjectives` / `shouldAutoPause`

**Files:**
- Modify: `src/ui/app.ts` (imports + 2 helpers exportés + interface `ObjectiveCompletion`)
- Test: `tests/ui.test.ts`

**Interfaces:**
- Consumes: `DayTickResult` (type exporté par `@/simulation`), `DayTickResult.trainingFinished` (Task 1).
- Produces: `ObjectiveCompletion { kind: 'recherche' | 'production' | 'formation'; label: string }`, `completedObjectives(result) => ObjectiveCompletion[]`, `shouldAutoPause(result) => boolean` — consommés par la Task 3.

- [ ] **Step 1: Écrire le test qui échoue**

Append `tests/ui.test.ts`, nouveau `describe` en fin de fichier :

```ts
describe('pause auto — helpers purs (K11)', () => {
  const mkResult = (over: Partial<DayTickResult> = {}): DayTickResult => ({
    day: 1,
    produced: [],
    researchFinished: null,
    enemyDronesBuilt: 0,
    battlesResolved: [],
    journal: [],
    trainingFinished: [],
    ...over,
  });

  it('completedObjectives : libellés recherche / production (Terre ou id) / formation', () => {
    const r = mkResult({
      researchFinished: 'derrick',
      produced: [
        { planetId: 'earth', itemId: 'derrick' },
        { planetId: 'the_moon', itemId: 's_drive' },
      ],
      trainingFinished: [{ type: 'research', count: 100 }],
    });
    expect(completedObjectives(r)).toEqual([
      { kind: 'recherche', label: 'Recherche achevée : derrick.' },
      { kind: 'production', label: 'Production terminée : derrick (Terre).' },
      { kind: 'production', label: 'Production terminée : s_drive (the_moon).' },
      { kind: 'formation', label: 'Formation terminée : 100 chercheurs disponibles.' },
    ]);
  });

  it('shouldAutoPause : vrai sur chaque signal, faux sans signal', () => {
    expect(shouldAutoPause(mkResult({ researchFinished: 'of_frame' }))).toBe(true);
    expect(shouldAutoPause(mkResult({ produced: [{ planetId: 'earth', itemId: 'derrick' }] }))).toBe(true);
    expect(shouldAutoPause(mkResult({ trainingFinished: [{ type: 'marines', count: 10 }] }))).toBe(true);
    expect(shouldAutoPause(mkResult())).toBe(false);
  });
});
```

Update l'import en tête de `tests/ui.test.ts` :

```ts
import { productionRows, researchRows, staffRows, miningRows } from '@/ui/earth-screen';
import { victoryRankLabel, completedObjectives, shouldAutoPause } from '@/ui/app';
import type { DayTickResult } from '@/simulation';
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run tests/ui.test.ts -t pause`
Expected: FAIL — `completedObjectives is not a function`

- [ ] **Step 3: Implémentation minimale**

`src/ui/app.ts` — modifier l'import simulation (ligne 9) :

```ts
import { createInitialState, dayTick, rankName } from '@/simulation';
import type { DayTickResult } from '@/simulation';
```

Puis, après le bloc `time = {...}` (ligne 24) :

```ts
export interface ObjectiveCompletion {
  kind: 'recherche' | 'production' | 'formation';
  label: string;
}

/** Libellés français des objectifs terminés d'une frame (pause auto K11). */
export function completedObjectives(result: DayTickResult): ObjectiveCompletion[] {
  const out: ObjectiveCompletion[] = [];
  if (result.researchFinished) {
    out.push({ kind: 'recherche', label: `Recherche achevée : ${result.researchFinished}.` });
  }
  for (const p of result.produced) {
    const planet = p.planetId === 'earth' ? 'Terre' : p.planetId;
    out.push({ kind: 'production', label: `Production terminée : ${p.itemId} (${planet}).` });
  }
  for (const t of result.trainingFinished) {
    const role = { production: 'producteurs', research: 'chercheurs', marines: 'marines' }[t.type];
    out.push({ kind: 'formation', label: `Formation terminée : ${t.count} ${role} disponibles.` });
  }
  return out;
}

/** Vrai si au moins un objectif s'est terminé dans la frame (à pauser). */
export function shouldAutoPause(result: DayTickResult): boolean {
  return result.researchFinished !== null || result.produced.length > 0 || result.trainingFinished.length > 0;
}
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run tests/ui.test.ts -t pause`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/app.ts tests/ui.test.ts && git commit -m "feat(ui): helpers purs pause-auto completedObjectives / shouldAutoPause (K11)"
```

---

### Task 3: Bannière « Objectif atteint » + pause dans la boucle + Espace

**Files:**
- Modify: `src/ui/app.ts` (état `pause`, `pauseForObjectives`, `resumeAfterPause`, boucle `frame`, handler Espace)
- Modify: `src/style.css` (styles `.pause-banner`)
- Modify: `docs/DECISIONS.md`, `docs/TRACE.md`, `docs/DASHBOARD.md`

**Interfaces:**
- Consumes: `shouldAutoPause`, `completedObjectives` (Task 2), `setSpeed`, `time.speedIndex`, `getState().flags['v0_victory']` existants.
- Produces: comportement UI : bannière `#pause-banner` + button `.pause-resume`, Espace reprend quand bannière visible, reprise à `prevSpeed`.

- [ ] **Step 1: Écrire la modification de `src/ui/app.ts`**

État module — après la ligne `const time = { speedIndex: 0, accumulator: 0, lastFrame: 0 };` :

```ts
const pause = { prevSpeed: 0 };
```

Dans la boucle `frame` (`src/ui/app.ts:81-91`) — remplace :

```ts
      while (time.accumulator >= msPerDay && steps < 50) {
        time.accumulator -= msPerDay;
        const result = dayTick(getState());
        traceDay(result.day - 1, result.journal);
        pushNews(result);
        steps += 1;
      }
      if (steps > 0) notify();
      checkVictory();
```

par :

```ts
      let pending: string[] = [];
      while (time.accumulator >= msPerDay && steps < 50) {
        time.accumulator -= msPerDay;
        const result = dayTick(getState());
        traceDay(result.day - 1, result.journal);
        pushNews(result);
        if (shouldAutoPause(result)) {
          pending.push(...completedObjectives(result).map((o) => o.label));
        }
        steps += 1;
      }
      if (steps > 0) notify();
      checkVictory();
      if (pending.length > 0 && !getState().flags['v0_victory']) {
        pauseForObjectives(pending);
      }
```

Après la fin de `startLoop` (après la ligne 97 `requestAnimationFrame(frame);}`), ajoute :

```ts
// ---------------------------------------------------------------------------
// Pause auto sur objectif atteint (K11) — bannière jusqu'à la reprise.
// Reprise → vitesse d'avant (au sinon à ×1). Pas de conflit avec la victoire :
// si v0_victory est posé dans la frame, seule l'overlay de victoire s'affiche.
// ---------------------------------------------------------------------------
function pauseForObjectives(labels: string[]): void {
  pause.prevSpeed = time.speedIndex;
  setSpeed(0);
  const list = labels.map((l) => `<li>${l}</li>`).join('');
  document.querySelector('#app')!.insertAdjacentHTML(
    'beforeend',
    `<div class="pause-banner" id="pause-banner">
       <span class="pause-title">Objectif atteint</span>
       <ul class="pause-list">${list}</ul>
       <button class="hud-btn pause-resume">Reprendre (Espace)</button>
     </div>`,
  );
  document.querySelector<HTMLButtonElement>('.pause-resume')!.addEventListener('click', resumeAfterPause);
}

function resumeAfterPause(): void {
  document.querySelector('#pause-banner')?.remove();
  setSpeed(pause.prevSpeed);
}
```

Dans le handler Espace (`src/ui/app.ts:200-205`) — remplace :

```ts
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setSpeed(time.speedIndex === 0 ? 1 : 0);
    }
  });
```

par :

```ts
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (document.querySelector('#pause-banner')) {
      resumeAfterPause();
      return;
    }
    setSpeed(time.speedIndex === 0 ? 1 : 0);
  });
```

- [ ] **Step 2: Ajouter les styles `src/style.css`**

Append en fin de fichier (juste après le bloc `.victory-box p`, ligne 309-310) :

```css
/* ---------- Bannière de pause sur objectif (K11) ---------- */
.pause-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 18px;
  background: rgba(8, 10, 18, 0.95);
  border-bottom: 1px solid #5a7fd4;
}

.pause-banner .pause-title {
  color: #e8d8a0;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.pause-banner .pause-list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  padding: 0;
  color: #aab;
  font-size: 0.85rem;
}

.pause-banner .pause-list li::before {
  content: '✓ ';
  color: #59c96a;
}
```

- [ ] **Step 3: Vérifier suite complète + lint + build**

Run:
```bash
npm run test:run
```
Expected: PASS (111 tests — 107 + 2 Task1 + 2 Task2)

Run:
```bash
npm run lint
```
Expected: 0 erreur (eslint `src/`)

Run:
```bash
npm run build
```
Expected: tsc sans erreur + build Vite OK

- [ ] **Step 4: Consigner la décision K11 et la session 17**

`docs/DECISIONS.md` — ajouter la décision K11 (titre `## Décision K11 — Pause auto sur objectif actif (recherche, production, formation)`), avec : périmètre (recherche+production+formation), retour visuel (bannière + bouton reprise), toujours active, approche A (signal pur `trainingFinished`), priorité victoire, reprise à la vitesse d'avant. Ajouter la ligne correspondante au « Journal des révisions » de `docs/DECISIONS.md` (révision `17-pause-auto` référençant la date 2026-09-18).

`docs/TRACE.md` — ajouter `## Session 17 — Pause auto sur objectif actif (K11)` en tête de liste, avec : objectif, décision, exécution (3 tâches), suite finale (tests/lint/build verts).

`docs/DASHBOARD.md` — mettre à jour le compte de tests (111) et les commits si le compteur y figure.

- [ ] **Step 5: Commit**

```bash
git add src/ui/app.ts src/style.css docs/DECISIONS.md docs/TRACE.md docs/DASHBOARD.md && git commit -m "feat(ui): pause auto + bannière Objectif atteint (K11), docs session 17"
```

---

## Self-Review

Passé à l'écriture : toutes les fonctions référencées (`completedObjectives`, `shouldAutoPause`, `pauseForObjectives`, `resumeAfterPause`, `trainingFinished`) sont définies dans le plan, signatures cohérentes entre tâches ; aucun placeholder ; spec §2-§6 couverte (approche A en Task 1-2, bannière/reprise/Espace en Task 3, priorité victoire Task 3, pas de trace = contrainte globale, YAGNI hors périmètre non traité).