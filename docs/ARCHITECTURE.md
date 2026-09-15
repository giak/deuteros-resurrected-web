# ARCHITECTURE — Structure technique

> Version 0.1 — 2026-09-15
> Décision ADR-001 : **Monolithe TypeScript, frontend seul, data-driven.**

---

## 1. Vue d'ensemble

```txt
┌────────────────────────── WEB (navigateur) ──────────────────────────┐
│                                                                    │
│   ┌───────────────────────────┐                                    │
│   │         APP (Vite)        │                                    │
│   │  ┌───────┐  ┌──────────┐  │                                    │
│   │  │ UI DOM│  │ CANVAS 2D│  │  (2 écrans de rendu distincts)    │
│   │  └───┬───┘  └────┬─────┘  │                                    │
│   │      └─────┬─────┘         │                                    │
│   │        ┌───▼───┐           │                                    │
│   │        │ STATE │ (store)   │  observable, immutable par tick   │
│   │        └───┬───┘           │                                    │
│   │      ┌─────▼─────┐         │                                    │
│   │      │ SIMULATION │        │  pure, déterministe, tick-driven  │
│   │      └─────┬─────┘         │                                    │
│   │      ┌─────▼─────┐         │                                    │
│   │      │  SAVE /   │         │  sérialisation JSON → IndexedDB   │
│   │      │  LOAD     │         │                                    │
│   │      └───────────┘         │                                    │
│   └───────────────────────────┘                                    │
│                                                                    │
│   Données statiques : JSON (data/) — planètes, techs, recettes,    │
│   événements. Chargées au boot, figées en runtime (immutables).    │
└────────────────────────────────────────────────────────────────────┘
```

**Principe directeur** : la *simulation* ne sait rien du *rendu*. Le rendu lit le state et projette. On peut donc tester la simulation sans DOM ni Canvas.

---

## 2. Modules

### 2.1 `src/simulation/`
Cœur du jeu. Pur TypeScript, aucune dépendance DOM.

| Fichier | Responsabilité |
|---|---|
| `tick.ts` | orchestration de l'ordre des systèmes (§1 de GAMEPLAY) |
| `economy.ts` | ressources, production, épuisement des gisements |
| `research.ts` | pool de points, projets, arbre tech, découvertes |
| `manufacturing.ts` | recettes, files, ateliers/automates |
| `navigation.ts` | mouvements, distances, carburant, FTL |
| `combat.ts` | résolution de bataille, captures, MAD |
| `events.ts` | timeline scénarisée + événements dynamiques |
| `methanoid.ts` | IA de menace, raids, invasions |
| `time.ts` | gestion des ticks et vitesses |
| `save.ts` | sérialisation/deserialisation, versioning |

### 2.2 `src/state/`
- `store.ts` : état global (un objet `GameState` immutable, mis à jour par tick ou par actions utilisateur).
- `selectors.ts` : fonctions pures de lecture (ex: `totalTitanium(state)`, `visibleBodies(state)`).
- `types.ts` : les types du jeu (`Planet`, `Structure`, `Vessel`, `Tech`, `Recipe`, `EventInstance`…).

### 2.3 `src/actions/`
- `actions.ts` : les intentions du joueur (ordonnances pures, validées contre l'état) :
  `buildMine`, `researchTech`, `queueRecipe`, `sendVessel`, `launchRaid`, `saveGame`…

### 2.4 `src/ui/`
- `app.ts` : montage, routes/onglets.
- Écrans (1 fichier par écran du PFD §2) : `systems-view.ts`, `planet-view.ts`, `research-view.ts`, `manufacturing-view.ts`, `bay-dock.ts`, `fleets.ts`, `combat.ts`, `news.ts`, `global.ts`.
- Composants : `tooltip.ts`, `modal.ts`, `notifications.ts`, `tables.ts`, `progress-bar.ts`.

### 2.5 `src/render/`
- `canvas-renderer.ts` : rendu 2D du système solaire (planètes, orbites, vaisseaux, zoom/pan).
- `sprites.ts` : dessin procédural des sprites (pas de fichiers image lourds en v1).
- `camera.ts` : position, zoom, clic→coordonnées monde.

### 2.6 `data/` (hors `src/`, statique)
- `planets.json` : corps célestes, gisements.
- `technologies.json` : arbre tech + coûts.
- `recipes.json` : recettes de fabrication.
- `structures.json` / `vessels.json` : stats.
- `events.json` : scénario + pool d'événements.
- `difficulties.json`.

---

## 3. Flux de données

1. **Boot** : charge les JSON de `data/` → construit les tables statiques → charge la save (ou nouvelle partie) → rendu initial.
2. **Tick** (toutes les `ms` définies par la vitesse) :
   `tick(state) → newState` (fonction pure) → store met à jour → UI et Canvas re-réaffichés seulement sur les parties *diffuses*.
3. **Action utilisateur** : `dispatch(action)` → `reducer(state, action) → newState` → même chemin de rendu.
4. **Save** : `serialize(state)` → IndexedDB (trusted autosave) + export JSON manuel.

---

## 4. Déterminisme & testabilité

- La simulation est **pure** : `tick(state, seed) → state`.
- Le RNG est seedé (PRNG), injecté dans la simulation → **rejouabilité/vision identique avec même seed**.
- Pas d'`Date.now()`, pas de `Math.random()` dans la simulation.
- Les tests (Vitest) testent la simulation sans navigateur.

---

## 5. Persistance

- **IndexedDB** pour les saves (200 KB max visés).
- Format de save : `{ version, seed, difficulty, stateJson }`.
- **Versioning** : migrations décrément les saves d'anciennes versions vers les nouvelles (fonction `migrate(save)`).

---

## 6. Frontend

- **Vite** + **TypeScript** strict.
- Pas de framework UI lourd en v1 : DOM vanilla + petits helpers (fast, léger, aucun lock-in). Réévaluable.
- Canvas 2D natif pour la vue système.
- CSS custom (design system minimal : palettes, espacements, typo).

---

## 7. Arborescence cible

```txt
deuteros-resurrected-web/
├── docs/                    ← cette documentation
├── data/                    ← JSON du jeu (moddable)
├── src/
│   ├── simulation/
│   ├── state/
│   ├── actions/
│   ├── ui/
│   ├── render/
│   └── main.ts
├── tests/                   ← tests unitaires (Vitest) + fixtures
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 8. Performance

- Canvas : rendu par **diffing** (seules les parties visibles changent).
- Pas de re-rendu DOM global : chaque composant écoute les *fragments* du state.
- Object pooling pour les sprites de vaisseaux.
- Budget : 60 fps en vue systeme avec 500+ entités, <10 s de bootstrap sur connexion moyenne.

---

## 9. Risques techniques & mitigations

| Risque | Mitigation |
|---|---|
| Simulation trop lourde | tick discret, fonctions pures, benchmark régulier |
| Spaghetti UI | modules isolés, pas de framework → helpers UI testés |
| Saves corrompues | validateurs de schéma + migrations versionnées |
| Canvas pas assez expressif | sprites procéduraux + particules légères |
| Scope trop gros | ROADMAP par MVP, joueur jouable le plus tôt possible |