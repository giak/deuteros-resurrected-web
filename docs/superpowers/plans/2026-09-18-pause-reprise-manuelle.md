# Reprise manuelle après pause auto — Implementation Plan (K12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de la pause automatique un arrêt net dont la reprise est un choix explicite de vitesse : fermer la bannière ne relance pas, seul un clic sur ×1/×2/×5/×20 relance.

**Architecture:** Révision ciblée de K11 dans `src/ui/app.ts` uniquement. On supprime la mémoire de vitesse (`pause.prevSpeed`), on transforme `resumeAfterPause` en `dismissPauseBanner` (ferme sans `setSpeed`), on renomme le bouton « Fermer (Espace) », et on conserve la ligne de `setSpeed` (`if (index > 0) …remove()`) qui réalise « choisir une vitesse = reprendre ». Aucun changement moteur/helpers/CSS/tests.

**Tech Stack:** TypeScript, Vite, Vitest, DOM vanilla.

## Global Constraints

- Messages UI et docs en **Français**.
- Aucun changement dans `src/simulation/`, `src/actions/`, `src/trace/`, ni sur `completedObjectives`/`shouldAutoPause`/CSS.
- Aucun `console` ajouté dans `src/ui`.
- Comportement cible exact (spec K12 §3) : auto-pause → `setSpeed(0)` + bannière ; clic vitesse ×1..×20 → ferme + relance ; clic ⏸ → bannière conservée ; bouton/Espace → ferme sans relancer ; Espace sans bannière → toggle 0↔1.
- Vérifications : `npm run test:run` (111/111), `npm run lint` (0), `npm run build` (tsc + vite verts).
- Docs : `docs/DECISIONS.md` (décision K12 + ligne Journal des révisions), `docs/TRACE.md` (Session 19 en tête), `docs/DASHBOARD.md` (Sessions, Commits).

---

### Task 1: Reprise manuelle après pause auto (K12)

**Files:**
- Modify: `src/ui/app.ts` (retrait `pause.prevSpeed`, `pauseForObjectives`, `resumeAfterPause`→`dismissPauseBanner`, handler Espace, commentaire de bloc)
- Modify: `docs/DECISIONS.md`, `docs/TRACE.md`, `docs/DASHBOARD.md`

**Interfaces:**
- Consumes: `setSpeed(index)` (src/ui/app.ts:272) — `if (index > 0)` retire déjà `#pause-banner` (conservé tel quel) ; `pauseForObjectives(labels: string[])` ; handler Espace.
- Produces: `dismissPauseBanner(): void` (remplace `resumeAfterPause`) — ferme `#pause-banner` sans changer la vitesse. Plus aucun état `pause`.

- [ ] **Step 1: Retirer l'état `pause`**

Dans `src/ui/app.ts`, supprimer la ligne 26 :

```ts
const pause = { prevSpeed: 0 };
```

- [ ] **Step 2: Mettre à jour le commentaire du bloc pause**

Remplacer le commentaire (src/ui/app.ts:135-139) :

```ts
// ---------------------------------------------------------------------------
// Pause auto sur objectif atteint (K11) — bannière jusqu'à la reprise.
// Reprise → vitesse d'avant (au sinon à ×1). Pas de conflit avec la victoire :
// si v0_victory est posé dans la frame, seule l'overlay de victoire s'affiche.
// ---------------------------------------------------------------------------
```

par :

```ts
// ---------------------------------------------------------------------------
// Pause auto sur objectif atteint (K11/K12) — arrêt net, reprise par choix de
// vitesse. La bannière se ferme (bouton/Espace) sans relancer ; cliquer une
// vitesse ×1..×20 ferme et relance (via setSpeed, index > 0). Priorité victoire :
// si v0_victory est posé dans la frame, seule l'overlay de victoire s'affiche.
// ---------------------------------------------------------------------------
```

- [ ] **Step 3: Remplacer `pauseForObjectives` et `resumeAfterPause`**

Remplacer le corps des fonctions (src/ui/app.ts:140-158) :

```ts
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

par :

```ts
function pauseForObjectives(labels: string[]): void {
  setSpeed(0);
  const list = labels.map((l) => `<li>${l}</li>`).join('');
  document.querySelector('#app')!.insertAdjacentHTML(
    'beforeend',
    `<div class="pause-banner" id="pause-banner">
       <span class="pause-title">Objectif atteint</span>
       <ul class="pause-list">${list}</ul>
       <button class="hud-btn pause-resume">Fermer (Espace)</button>
     </div>`,
  );
  document.querySelector<HTMLButtonElement>('.pause-resume')!.addEventListener('click', dismissPauseBanner);
}

function dismissPauseBanner(): void {
  document.querySelector('#pause-banner')?.remove();
}
```

- [ ] **Step 4: Mettre à jour le handler Espace**

Dans `setupControls` (src/ui/app.ts:264-265), remplacer :

```ts
    if (document.querySelector('#pause-banner')) {
      resumeAfterPause();
      return;
    }
```

par :

```ts
    if (document.querySelector('#pause-banner')) {
      dismissPauseBanner();
      return;
    }
```

Ne pas toucher à `setSpeed` (sa ligne `if (index > 0) document.querySelector('#pause-banner')?.remove();` reste — c'est elle qui fait qu'un clic de vitesse ferme la bannière et relance).

- [ ] **Step 5: Vérifier suite + lint + build**

Run:
```bash
npm run test:run
```
Expected: PASS (111 tests / 10 fichiers)

Run:
```bash
npm run lint
```
Expected: 0 erreur ; en particulier, plus aucune référence à `pause` ou `resumeAfterPause` (sinon erreur `no-undef`/`no-unused-vars`).

Run:
```bash
npm run build
```
Expected: tsc sans erreur + build Vite OK

- [ ] **Step 6: Consigner K12 et Session 19**

`docs/DECISIONS.md` — après la section « Décision K11 » (avant `## Journal des révisions`), ajouter :

```markdown
## Décision K12 — Reprise manuelle après pause auto (révise K11) (approuvé 2026-09-18)

**Contexte** : retour de playtest v0 (Session 18) — « quand la pause se met en place, on reset aussi les ticks en mode pause. l'utilisateur choisit l'avancement pour reprendre. » La K11 restaurait automatiquement la vitesse d'avant à la reprise, ce qui ne laisse pas le joueur choisir.

**Choix** :
- **Reprise = choix explicite de vitesse** : cliquer ×1/×2/×5/×20 ferme la bannière et relance à cette vitesse (via `setSpeed`, index > 0).
- **Le bouton « Fermer (Espace) »** ferme la bannière **sans** relancer (reste en pause) ; Espace fait de même quand la bannière est visible.
- **Suppression de la mémoire de vitesse** `pause.prevSpeed` (YAGNI) ; `resumeAfterPause` → `dismissPauseBanner` (aucun `setSpeed`).
- Toggle Espace sans bannière inchangé ; auto-pause (`setSpeed(0)` + bannière) inchangée ; moteur/helpers/CSS inchangés.

**Conséquences** : aucun nouveau test (DOM sans harnais, précédent K9/K11) ; vérification 111/111 + lint 0 + build vert ; validation d'usage par playtest manuel.
```

Et ajouter au « Journal des révisions » :

```markdown
| 2026-09-18 | K12 approuvé — reprise manuelle après pause auto (révise K11) : bannière « Fermer », reprise par choix de vitesse |
```

`docs/TRACE.md` — ajouter en tête de journal (avant Session 18) :

```markdown
## Session 19 — 2026-09-18 (K12 — reprise manuelle après pause auto)

**Objectif** : corriger le comportement de reprise issu du playtest (Session 18) — la pause auto doit être un arrêt net, la reprise un choix explicite de vitesse (spec `docs/superpowers/specs/2026-09-18-pause-reprise-manuelle-design.md`).

**Décision K12** (révise K11) : bouton renommé « Fermer (Espace) » (ferme sans relancer) ; clic ×1..×20 = ferme + relance ; Espace avec bannière = ferme sans relancer ; suppression de `pause.prevSpeed`.

**Réalisé** : `src/ui/app.ts` — `pauseForObjectives` sans capture de vitesse, `resumeAfterPause` → `dismissPauseBanner`, handler Espace mis à jour ; `setSpeed` inchangé (la fermeture sur `index > 0` réalise la reprise par choix de vitesse).

**Verification** : vitest **111/111** (10 fichiers), `npm run lint` 0, `npm run build` VERT.

**Prochaines étapes (TODO) :** playtest humain (bannière → Fermer reste en pause ; clic vitesse relance), puis clôture v0 (tag `v0.0.1`).
```

`docs/DASHBOARD.md` — incrémenter « Sessions de travail » à **19** et « Commits » à **54**, et la date « Dernière mise à jour » si besoin (mêmes valeurs que le décompte réel : `git rev-list --count HEAD` après ton commit).

- [ ] **Step 7: Commit**

```bash
git add src/ui/app.ts docs/DECISIONS.md docs/TRACE.md docs/DASHBOARD.md && git commit -m "fix(ui): reprise manuelle après pause auto (K12) — Fermer reste en pause, la vitesse relance"
```

---

## Self-Review

Spec K12 §3 couverte par la Task 1 (toutes les transitions), §4 par les Steps 1-4, §5 par le Step 5, §6 respecté (aucun test/harnais, aucun changement moteur/CSS). Aucun placeholder ; noms cohérents (`dismissPauseBanner` partout, plus de `resumeAfterPause`/`pause.prevSpeed`).