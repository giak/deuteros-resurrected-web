# Design — Architecture logicielle (après audit antagoniste 2026-09-16)

> Date : 2026-09-16 (révision majeure post-audit)
> Statut : validé (brainstorming 6 sections + audit antagoniste 6 rôles, verdicts suivis)
> Références : `docs/ARCHITECTURE_RESEARCH.md` (recherche web) ; ADR-013 à 017 (DECISIONS.md) ; recensions `docs/superpowers/recensions/2026-09-16-antagonist-report.md` et `specs/2026-09-16-antagoniste-ecs-adr-008.md`

---

## 1. Objectif

Architecture d'implémentation du jeu (spiritual successor de *Deuteros: The Next Millennium*, TypeScript/Vite/Canvas 2D) validée par un **audit antagoniste** (6 rôles dédiés, recherches web contradictoires) qui a confirmé la recherche initiale : **simplicité d'abord** (KISS), cœur pur, zéro sur-ingénierie.

- **Cœur de simulation** : records (POJO) typés + **services par domaine** (ADR-014), tick pur déterministe (ADR-002), driver **accumulateur à cap** (ADR-016).
- **IoC** : **pure DI / Composition Root manuelle** (ADR-013), zéro conteneur, zéro décorateur.
- **Erreurs** : union discriminée maison pour le domaine + zod aux frontières + **crash-loud** (ADR-015, ADR-010).
- **Modularité** : **2 modules** (cœur pur sans DOM + UI/render), frontière par convention + lint `no-restricted-imports`.
- **Tests** : unit + **double-run** déterministe + **scénarios E2E scriptés** + fast-check ciblé (ADR-017).

## 2. Décisions (ADR)

| ADR | Statut | Décision |
|---|---|---|
| ADR-001 à 006 | validés 09-15 | monolithe TS front-seul, tick pur, DOM vanilla, Canvas 2D, data JSON, save versionné |
| ADR-007 (tsyringe) / ADR-008 (ECS) | **RÉVOQUÉS** 09-16 | annulés par l'audit antagoniste |
| ADR-009 (scheduler) | validé 09-16 | ordre original + `tickPhases` configurables |
| ADR-010 (zod frontières) | validé 09-16 | zod aux frontières + data/*.json au boot |
| ADR-011 (neverthrow) | amendé 09-16 | → ADR-015 (union maison, crash-loud renforcé) |
| ADR-012 (config.ts injectée) | amendé 09-16 | → ADR-016 (accumulateur + budget) |
| **ADR-013** | validé 09-16 | **IoC : pure DI / CR manuelle** (remplace ADR-007) |
| **ADR-014** | validé 09-16 | **records + services par domaine** (remplace ADR-008) |
| **ADR-015** | validé 09-16 | **erreurs : union maison + crash-loud** (amende ADR-011) |
| **ADR-016** | validé 09-16 | **driver : accumulateur à cap + budget** (amende ADR-009/012) |
| **ADR-017** | validé 09-16 | **tests : double-run + scénarios** (amende spec §8) |

---

## 3. Vue d'ensemble — 2 modules

```
┌──────────────────────────────────────────────────────────────┐
│  ENTRÉE / COMPOSITION ROOT (main.ts)                          │
│  createGame(seed) : construit le graphe en pure DI (ADR-013)  │
├──────────────────────────────────────────────────────────────┤
│  MODULE 2 — PRÉSENTATION (selon CRC-Précoce, dépend du cœur)  │
│  app.ts · ui/ (DOM vanilla, ADR-003) · render/ (Canvas ADR-004)│
│  ErrorBoundary · viewmodel (projection de lecture)            │
├──────────────────────────────────────────────────────────────┤
│  MODULE 1 — CŒUR (pur, aucun import DOM)                      │
│  records (POJO) · services par domaine · tick ordonné         │
│  config.ts (SIM_CONFIG) · errors.ts (union maison)            │
│  worldIO (SaveDto versionné, ADR-006) · drivers (port fin)    │
├──────────────────────────────────────────────────────────────┤
│  DONNÉES (JSON statiques) : resources, items, planets,        │
│  astronomical, difficulties, events — validées zod au boot    │
└──────────────────────────────────────────────────────────────┘
```

**Règle de dépendance** : le cœur n'importe jamais DOM/Canvas/IndexedDB. La frontière est une **convention** + `no-restricted-imports` eslint (pas de ports formels tant qu'un adaptateur a une seule implémentation). Les drivers (persistance, prng, clock, vue) sont des **paramètres/factories** de `createGame` — le seed est déjà partie du state (ADR-002).

---

## 4. Le cœur : records + services (ADR-014)

### 4.1 Primitives

```ts
// Entités = records typés (POJO), sérialisables nativement
interface PlanetRecord { id: BodyId; resources: Partial<Record<ResourceId, number>>; derricks: number; baseParts: number; baseDamaged: boolean; ... }
interface ShipRecord { id: FleetId; position: SystemId; destination?: SystemId; holds: HeldAsteroid[]; ... }
interface StaffRecord { id: StaffId; role: StaffRole; level: number; training: TrainingState; ... }
// … etc. par domaine

// Monde = console de records typés
interface World {
  day: number;
  prng: PrngState;                       // seed sérialisé (ADR-002)
  planets: Record<BodyId, PlanetRecord>;
  ships: Record<FleetId, ShipRecord>;
  staff: StaffRecord[];
  production: Record<SlotId, ProductionRecord>;
  research: ResearchRecord;
  enemies: Record<EnemyId, EnemyRecord>;
  flags: Set<string>;
}

type Service = (world: World, simConfig: SimConfig) => void;
```

### 4.2 Services par domaine (ordre = `tickPhases`, ADR-009)

`research` · `production` · `mining` · `survey` · `ships` · `travel` · `droneBuild` · `mtx` · `events` · `navigation` · `combat` · `methanoid` · `training` · `persistence`

Regroupés par domaine (pas d'éclatement atomique) ; fonctionnent en `world` explicitement passé, jamais d'état global.

### 4.3 Sérialisation

- `World → SaveDto` nativement (records = JSON-safe), versionnée (ADR-006).
- Recharge = reconstruction des records via zod (frontière ADR-010) → monde ; `day` et `prng` restaurés → **déterminisme intégral** (ADR-002).
- Pas de remap d'IDs : les IDs sont présents dans les records (clés stables).

---

## 5. Scheduler & driver temps (ADR-009 + ADR-016)

```ts
export type SimConfig = {
  productionDivisor: 801;
  wrapThreshold: 255;
  maxWraps: 4;
  aocRate: 128;
  researchDivisor: 801;
  researchWrapIncrement: 11;
  // … derrick rates, survey mult, staff caps, enemy freqs, PTL=100, …
  tickPhases: TickPhase[];      // ordre de référence du remake
  disabledPhases: Set<TickPhase>;
  simBudgetMs: number;          // budget sim/frame (ADR-016)
  maxTicksPerFrameFloor: number; // ex. 3
  maxTicksPerFrameCeil: number;  // ex. 64
};
```

### 5.1 Scheduler (runTick)

```ts
export function runTick(world: World, simConfig: SimConfig): void {
  for (const phase of simConfig.tickPhases) {
    const service = registry[phase];
    if (service && !simConfig.disabledPhases.has(phase)) service(world, simConfig);
  }
}
```

**Ordre de référence** : Research → Production → UpdateShips → BuildDrones → MTX → Navigation → Combat. Un test verrouille l'ordre (oracle de référence).

### 5.2 Driver accumulateur (ADR-016)

```ts
// entrée : 1 jour simulé par runTick ; échelles = plafonds de débit
function clockStep(dtMs: number, driver: SimDriver): void {
  driver.lag += dtMs / driver.msPerDay;
  let n = 0;
  const cap = adaptiveCap(driver);              // budget sim/frame mesuré
  while (driver.lag >= 1 && n < cap) {
    runTick(driver.world, driver.simConfig);
    driver.lag -= 1;
    n += 1;
  }
  // surplus de lag NON simulé (jamais de rattrapage en rafale)
  if (document.hidden) { driver.lag = 0; }      // onglet caché → arrêt sans backlog
}
```

- **Multiplicateur = nombre de ticks**, jamais un `dt` agrandi (protège /801, wrap 255, déterminisme sérialisé — invariant de test).
- **Budget** : `MAX_TICKS_PER_FRAME` adaptatif sur mesure glissante du coût réel d'un tick (plancher/plafond config) ; au-delà, la sim « ralentit » (Stellaris/Factorio).
- **Rendu** découplé (rAF), **interpolation de présentation seule** (géométrie/temps, jamais l'état simulé) entre les ticks.

---

## 6. Gestion d'erreurs (ADR-015, ADR-010)

| Classe | Exemple | Traitement |
|---|---|---|
| **Erreur de domaine** | ressources insuffisantes, tech verrouillée, staff inqualifié | union discriminée maison (couche **actions joueur uniquement**) |
| **Erreur de frontière** | save corrompu, events.json invalide | zod `safeParse` → rejet au chargement (ADR-010) |
| **Bug interne** | invariant violé, corruption | **crash-loud** : exception + asserts, arrêt du tick, Error Boundary |

```ts
// src/core/errors.ts — aucune dépendance (pas de neverthrow)
export type DomainReason =
  | { tag: 'insufficientResources'; body: BodyId; resource: ResourceId }
  | { tag: 'researchGateNotMet'; item: ItemId; requiredLevel: number }
  | { tag: 'cannotLeaveStation'; reason: string }
  | { tag: 'orbitOnlyItemOnGround'; item: ItemId };

export type ActionResult = { ok: true; world: World } | { ok: false; reason: DomainReason };
```

Règles :
- **Jamais de `ActionResult` dans les services de tick** (aucun flow conditionnel en plein tick) ; uniquement à la couche actions joueur.
- `validate-then-mutate` obligatoire pour honorer « monde inchangé sur erreur ».
- **Invariants** : asserts ≥ 2/fonction sur les services mutateurs (dev + release) ; à la première erreur → **arrêt du tick** (pas de cascade).
- **Error Boundary**: capture `window.onerror`/`unhandledrejection` + erreurs UI → écran « erreur interne — recharger la dernière sauvegarde ». La promesse « intacte » repose sur **autosave périodique + double slot** (versionné ADR-006, validé ADR-010).

---

## 7. Composition Root (pure DI, ADR-013)

```ts
// main.ts — seul endroit qui construit le graphe
function createGame(seed: number, cfg: SimConfig) {
  const world = makeInitialWorld(seed);
  const persistence = new IndexedDbPersistence();
  const clock = new AccumulatorDriver(world, cfg);   // via factory du driver
  return {
    world,
    actions: createActions(world, cfg),              // couche Result (ADR-015)
    clock,
    view: createRenderer(world),                     // projeté en viewmodel
  };
}
```

- Aucun conteneur, aucun décorateur, `reflect-metadata` absent ; ~60 lignes.
- Les services prennent `(world, simConfig)` en paramètre ; les adapters (persistance, driver) sont passés à la CR.
- Tests : les services s'appellent sans DI (`worldOf(...)` + service direct) ; les adapters ont des vrais Faus (fake-indexeddb).

---

## 8. Tests (ADR-017)

| Niveau | Outil | Couvre |
|---|---|---|
| Unit services | Vitest | chaque service `(world, cfg) → void` sur fixture `worldOf(...)`, asserts sur **composants touchés** (pas le monde entier) |
| Déterminisme | **double-run** | `worldOf(seed).afterTicks(N)` ×2 → `expect.deepEqual` (preuve directe ADR-002, zéro fichier) |
| Écheances | Vitest | driveur simulé : stall 2 s, onglet caché, x32 → « jamais > N ticks consécutifs », jours monotones, état conforme |
| Number crunching | **fast-check ciblé** | /801, wrap 255, ratios combat : propriétés **différentielles** vs oracle à forme fermée |
| Correctness | **scénarios E2E scriptés** | record/replay d'actions joueur → assertions sur jalons comportementaux (production cumulée, vaisseau arrivé, défaite par perte d'infra) |
| Intégration save | Vitest | fixture versionné (zod) → migrate → re-tick → état conforme |
| Adapters | smoke réel | IndexedDB via **fake-indexeddb** (vraie impl), pas de « contrat vs fake maison » |

**DSL** : `worldOf(fixtures, seed)` construit un état initial typé ; `afterTicks(n)` avance via `runTick` ; les configs de test sont injectées (`AOC disabled`, `wrap reinforced`) via `createGame(cfg)`.

**Pas de golden full-state** (contredirait ADR-012 rebalance + fige les bugs) ; **pas de niveau « contrat-adapter »** (IO = vrai backend).

---

## 9. Ce qui reste ouvert

- Choix du PRNG précis (mulberry32 vs xoshiro128) — tranché au driver (port fin).
- Restructuration de `ARCHITECTURE.md` v0.1 pour refléter les 2 modules et les ADR-013 à 017.
- Autosave : fréquence (ex. tous les N ticks) et double slot — à préciser au plan d'implémentation (ADR-015 l'exige pour la promesse « partie intacte »).
- Sur-architecture à réévaluer si un écran devient ingérable (ADR-003).