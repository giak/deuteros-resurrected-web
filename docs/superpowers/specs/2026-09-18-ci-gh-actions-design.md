# Design — CI GitHub Actions (vérification seule) — 2026-09-18

> Statut : validé (brainstorming, sections 1-3 approuvées)
> Références : TODO court terme DASHBOARD n°2 « CI GH Actions (lint, typecheck, tests) » ; TECH_STACK.md ; package.json

## 1. Objectif

Verrouiller la non-régression à chaque commit/PR de `main` : **lint, typecheck, tests, build** exécutés par GitHub Actions. Vérification seule — **rien n'est publié**. Objectif secondaire : installer le dépôt sur GitHub (il était local, sans remote).

## 2. Décisions validées (brainstorming, une question à la fois)

| Décision | Choix |
|---|---|
| Hébergement | Créer `giak/deuteros-resurrected-web` **public** (n'existe pas) |
| Périmètre CI | **Vérification seule** (pas de déploiement Pages/release) |
| Reproductibilité | **Committer `package-lock.json`** → `npm ci` en CI (aucun lockfile commité à ce jour) |
| Versions Node | **Node 22 LTS** pour `setup-node` ; ajout `engines: { node: ">=22" }` (local v24.19 satisfait) |
| Structure | **Approche A** — un seul workflow `.github/workflows/ci.yml`, un job, étapes séquentielles |

## 3. Architecture

### 3.1 Dépôt GitHub (une fois)

Création depuis le dossier courant :

```bash
gh repo create giak/deuteros-resurrected-web --public --source=. --remote=origin \
  --description "Spiritual successor web de Deuteros: The Next Millennium (remake web du jeu de gestion 1991)" \
  --add-topic game --add-topic deuteros --add-topic typescript --add-topic vite
```

- `--source=.` : ajoute `origin`, **pousse `main` + le tag `v0.0.1`** (premier push).
- Aucun secret nécessaire (vérif seule).

### 3.2 Reproductibilité

- Générer et commiter `package-lock.json` (épinglage des dépendances → `npm ci` déterministe, cache npm basé sur le lockfile).
- Ajouter `"engines": { "node": ">=22" }` à `package.json` (déclaratif ; aucune action engine-strict configurée).
- Pas de champ `packageManager` (npm est le seul gestionnaire utilisé).

### 3.3 Workflow `.github/workflows/ci.yml`

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

Points clés :
- **Triggers** : push `main` + PR vers `main` (seule branche existante).
- **Typecheck couvert par `build`** (`tsc --noEmit` + `vite build`) — 4 étapes de vérif seulement.
- `cache: npm` s'appuie sur le lockfile ; `permissions: contents: read` (moindre privilège) ; `concurrency` annule un run en cours sur le même ref.

## 4. Contrat de vérification

Sur chaque push/PR `main` :

| Étape | Commande | But |
|---|---|---|
| Setup | `npm ci` | deps exactes (lockfile) |
| Lint | `npm run lint` | eslint `src/`, 0 erreur |
| Tests | `npm run test:run` | vitest, 111 tests verts |
| Build | `npm run build` | typecheck `tsc` + bundle Vite OK |

Le job échoue à la **première** étape défaillante → commit rouge, PR non mergeable en surface. Aucune branch protection configurée dans ce chantier (à activer plus tard).

## 5. Vérification avant push

1. `npm ci` s'exécute localement (lockfile valide).
2. Les 4 étapes passent en local (déjà le cas : 111/111, lint 0, build vert).
3. Après le premier push : `gh run watch` pour suivre le run, succès attendu < 2 min.

## 6. Hors périmètre (explicite)

- Déploiement GitHub Pages / release (progressera avec un workflow dédié quand demandé).
- Branch protection, règles de revue requise, `required status checks`.
- Matrice de versions, `act` en local, schedules/cron, badges de statut.
- Secrets (aucun consommé).

## 7. Risques

| Risque | Mitigation |
|---|---|
| Node 22 vs local 24 : comportement divergent | Vite/Vitest 3 supportent `^18 \|\| ^20 \|\| >=22` ; divergence non attendue (tests pur Node, pas de natif) |
| Premier push rejette mal (history, hooks) | Push simple de `main` existant ; pas de force, pas de secret dans l'historique à ce jour |
| Le cache npm ralentit la toute première fois | Normal ; cache peuplé après le premier run vert |