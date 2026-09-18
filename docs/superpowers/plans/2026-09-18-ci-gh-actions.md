# CI GitHub Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer la vérification continue (lint → typecheck → tests → build) via un workflow GH Actions sur le dépôt nouvellement créé, avec installs reproductibles.

**Architecture:** Dépôt `giak/deuteros-resurrected-web` (public) créé depuis le dossier courant ; `package-lock.json` commité (→ `npm ci`) ; `engines` >=22 ; un seul workflow `.github/workflows/ci.yml` à un job `checks`, 4 étapes, cache npm ; premier push `main` + tag `v0.0.1` ; run surveillé.

**Tech Stack:** GitHub CLI (`gh`), GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`), npm, Vite/Vitest/eslint/TS existants.

## Global Constraints

- Messages/tests/docs en **Français**.
- CI = **vérification seule** (pas de déploiement Pages/release, pas de secrets).
- Pas du code applicatif touché : `src/`, `tests/`, `data/` intacts (aucun test nouveau exigé — chantier infra).
- Node CI : **22 LTS** ; `engines: { "node": ">=22" }` déclaratif (aucun engine-strict).
- Scripts existants utilisés verbatim : `npm run lint`, `npm run test:run`, `npm run build`.
- Workflow ÉCHOUE à la première étape défaillante ; chaque étape du plan est commitée séparément.
- Spec de référence : `docs/superpowers/specs/2026-09-18-ci-gh-actions-design.md`.

---
### Task 1: Reproductibilité — lockfile + engines

**Files:**
- Create: `package-lock.json` (généré)
- Modify: `package.json` (ajout `engines` après le champ `private`, ligne 4)
- Verify: `node_modules/` régénéré par `npm ci`

**Interfaces:**
- Consumes: rien
- Produces: `package-lock.json` (lockfileVersion 3) validant `npm ci` ; `package.json` avec `engines.node >= 22`

- [ ] **Step 1: Générer le lockfile**

Run:
```bash
cd /home/giak/projects/deuteros-resurrected-web
npm install --package-lock-only
```
Expected: `package-lock.json` créé, sans toucher à `node_modules/` ni `package.json`. Vérifier :
```bash
grep '"lockfileVersion"' package-lock.json
```
Expected: `"lockfileVersion": 3` (ou 3.x).

- [ ] **Step 2: Ajouter `engines` à package.json**

Éditer `package.json` : après la ligne `"private": true,` insérer :
```json
  "engines": { "node": ">=22" },
```
Résultat attendu (début de fichier) :
```json
{
  "name": "deuteros-resurrected-web",
  "private": true,
  "engines": { "node": ">=22" },
  "version": "0.1.0",
  "type": "module",
  ...
```

- [ ] **Step 3: Vérifier que `npm ci` + les 4 commandes passent**

Run (réinstalle proprement depuis le lockfile) :
```bash
npm ci
```
Expected: exit 0, `node_modules/` régénéré.

Puis :
```bash
npm run lint
npm run test:run
npm run build
```
Expected: lint 0 erreur ; vitest **111/111** ; tsc + vite build VERT (js ~82.78 kB).

- [ ] **Step 4: Commit**

```bash
git add package-lock.json package.json
git commit -m "build: lockfile npm + engines >=22 — installs reproductibles (CI)"
```

---
### Task 2: Workflow CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/.gitkeep` (optionnel — cible l'arborescence)

**Interfaces:**
- Consumes: `package-lock.json` (Task 1) — utilisé par `cache: npm`
- Produces: workflow `CI` déclenché sur push/PR `main`, job `checks`

- [ ] **Step 1: Créer `.github/workflows/ci.yml`**

Contenu exact :
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
```

- [ ] **Step 2: Valider la syntaxe YAML**

Run:
```bash
node -e "const s=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!s.startsWith('name: CI')) process.exit(1); console.log('header ok,', s.split('\n').length, 'lignes')"
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML ok')"
```
Expected: `header ok` / `YAML ok` (le YAML est valide).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: workflow GH Actions — vérification seul (lint, test, build)"
```

---
### Task 3: Dépôt GitHub + premier push + vérification + consignation

**Files:**
- Modify: `docs/TRACE.md` (Session 22)
- Modify: `docs/DECISIONS.md` (Décision K14 + ligne journal)
- Modify: `docs/DASHBOARD.md` (ligne CI §1)
- Modify: `README.md` (badge CI, si run vert)

**Interfaces:**
- Consumes: commits Tasks 1-2 sur `main` (local), tag `v0.0.1` existant
- Produces: dépôt public `giak/deuteros-resurrected-web`, remote `origin`, run CI vert

- [ ] **Step 1: Créer le dépôt et pousser**

Run :
```bash
cd /home/giak/projects/deuteros-resurrected-web
gh repo create giak/deuteros-resurrected-web --public --source=. --remote=origin --push \
  --description "Spiritual successor web de Deuteros: The Next Millennium (remake web du jeu de gestion 1991)" \
  --add-topic game --add-topic deuteros --add-topic typescript --add-topic vite
```
Expected: dépôt créé, `origin` ajouté, branche `main` poussée. Puis :
```bash
git push origin v0.0.1
```
Expected: tag poussé. Vérifier :
```bash
git remote -v
gh repo view giak/deuteros-resurrected-web --json url,visibility,defaultBranchRef
```
Expected: `url https://github.com/giak/deuteros-resurrected-web`, `visibility PUBLIC`, `defaultBranchRef main`.

- [ ] **Step 2: Suivre le premier run CI**

Run :
```bash
gh run watch --repo giak/deuteros-resurrected-web --exit-status
```
Expected: run `CI` **succès** (succès < 2 min). En cas d'échec, lire les logs (`gh run view --log-failed`), corriger, recommitter, re-pousser.

- [ ] **Step 3: Consigner (docs)**

`docs/TRACE.md` — nouvelle session en tête :
```markdown
## Session 22 — 2026-09-18 (CI GitHub Actions : dépôt public + workflow vérification)

**Objectif** : TODO court terme n°2 — installer la non-régression CI (lint, typecheck, tests, build) et créer le dépôt `giak/deuteros-resurrected-web` (public, jusqu'ici aucun remote).

**Décision K14** (DECISIONS.md) : périmètre vérif seule (pas de déploiement), lockfile commité (`npm ci`), Node 22 LTS (`engines >=22`), approche A (workflow unique à un job).

**Réalisé** : `package-lock.json` commité + `engines` ; `.github/workflows/ci.yml` (push/PR main, cache npm, concurrency cancel-in-progress) ; dépôt créé + push `main` + tag `v0.0.1` ; premier run CI **vert**.

**Verification** : `npm ci` ok ; lint 0 ; vitest 111/111 ; build VERT ; GH Actions run #1 succès.

**Prochaines étapes (TODO) :** GAMEPLAY v0.2 (transport/Hydroïdes/défaite) puis Phase 1 MVP (automatisation des relances).
```

`docs/DECISIONS.md` — avant `## Journal des révisions` :
```markdown
## Décision K14 — CI GitHub Actions : dépôt public + vérification continue (approuvé 2026-09-18)

**Contexte** : TODO court terme n°2 (DASHBOARD) — verrouiller la non-régression ; le repo est local sans remote depuis l'init.

**Choix** :
- Créer `giak/deuteros-resurrected-web` (**public**) via `gh repo create` (remote `origin`, push `main` + tag `v0.0.1`).
- **Vérification seule** : workflow unique `.github/workflows/ci.yml` (approche A), job `checks` = `npm ci` → `lint` → `test:run` → `build` (typecheck via tsc dans build), triggers push/PR `main`, `cache: npm`, `concurrency` cancel-in-progress, `permissions: contents: read`.
- **Reproductibilité** : `package-lock.json` commité et `engines: { "node": ">=22" }` (Node 22 LTS en CI).

**Conséquences** : chaque commit/PR `main` est vérifié (échec à la première étape défaillante) ; aucun secret, aucun déploiement ; branch protection à activer plus tard (hors périmètre).
```

Plus la ligne de journal (après la clôture v0) :
```markdown
| 2026-09-18 | K14 approuvé — CI GH Actions : dépôt public `giak/deuteros-resurrected-web`, workflow vérif seule (npm ci → lint → test → build), lockfile + engines >=22 |
```

`docs/DASHBOARD.md` — remplacer la ligne §1 :
```markdown
| CI (lint, typecheck, tests) | 🟡 Scripts OK, pipeline GH à créer |
```
par :
```markdown
| CI (lint, typecheck, tests) | 🟢 `.github/workflows/ci.yml` — run vert 2026-09-18 |
```

- [ ] **Step 4: Commit + push de la consignation**

```bash
git add docs/TRACE.md docs/DECISIONS.md docs/DASHBOARD.md
git commit -m "docs: consignation CI (K14) — TRACE Session 22, DECISIONS, DASHBOARD"
git push origin main
```
Expected: push OK, run CI déclenché (vert attendu, doc-only).

- [ ] **Step 5: Badge + push final**

Après run vert confirmé, ajouter en tête de `README.md` (après le titre) :
```markdown
[![CI](https://github.com/giak/deuteros-resurrected-web/actions/workflows/ci.yml/badge.svg)](https://github.com/giak/deuteros-resurrected-web/actions/workflows/ci.yml)
```
Commit + push :
```bash
git add README.md
git commit -m "docs: badge CI dans le README"
git push origin main
```
Expected: badge visible (un fois le run passé), repo à jour.