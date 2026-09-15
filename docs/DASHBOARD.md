# DASHBOARD — État d'avancement

> Dernière mise à jour : 2026-09-15
> Source de vérité pour « où en est le projet ? ». Mettre à jour après chaque session.

---

## 1. Statut global

🟢 **Phase 0 — Fondations documentaires** *(en cours, ~50 %)*

| Domaine | Statut |
|---|---|
| Documentation cadrage | 🟢 Réalisée |
| Recherche de référence (original) | 🟢 `RESEARCH.md` |
| Repo / git | 🟢 init + commit `060a402` |
| Build Vite + TS | 🟢 Squelette OK (bun) |
| Simulation squelettique | 🔲 À créer |
| CI (lint, typecheck, tests) | 🟡 Scripts OK, pipeline GH à créer |

---

## 2. Phases ROADMAP

| Phase | Statut | Notes |
|---|---|---|
| 0 — Fondations | 🟨 en cours | docs écrites |
| 1 — MVP jouable | 🔲 | |
| 2 — Expansion & logistique | 🔲 | |
| 3 — Recherche complète & industrie | 🔲 | |
| 4 — Combat & menace | 🔲 | |
| 5 — Contenu & polish | 🔲 | |
| 6 — Post-v1 | 🔲 | |

---

## 3. Documents produits

| Document | Fichier | Statut |
|---|---|---|
| README | `README.md` | 🟢 |
| Vision | `docs/VISION.md` | 🟢 v0.1 |
| PFD (Plan Fonctionnel Détaillé) | `docs/PFD.md` | 🟢 v0.1 |
| Gameplay (règles chiffrées) | `docs/GAMEPLAY.md` | 🟢 v0.1 valeurs à valider |
| Architecture | `docs/ARCHITECTURE.md` | 🟢 v0.1 |
| Data model | `docs/DATA.md` | 🟢 v0.1 |
| Roadmap | `docs/ROADMAP.md` | 🟢 v0.1 |
| Tech stack | `docs/TECH_STACK.md` | 🟢 v0.1 |
| ADR | `docs/DECISIONS.md` | 🟢 |
| Dashboard | `docs/DASHBOARD.md` | 🟢 |
| Trace (journal) | `docs/TRACE.md` | 🟢 |
| Recherche original Deuteros | `docs/RESEARCH.md` | 🟢 v0.1 |

---

## 4. Statistiques projet (suivi)

| Métrique | Valeur |
|---|---|
| Sessions de travail | 2 |
| Tickets ouverts | 0 |
| Commits | 1 |
| Tests | 1 |
| Build jouable | non |

*(colonnes à alimenter au fil du projet)*

---

## 5. Liens utiles

- **Original** : https://fr.wikipedia.org/wiki/Deuteros:_The_Next_Millennium
- **Fan remake de référence (C++)** : https://github.com/tonyoddspherecom/Deuteros-Resurrected/
- **Discord community remake** : https://discord.gg/SwmR4MFJpG

---

## 6. Prochains pas (TODO court terme)

1. Initialiser le repo git + premier commit des docs.
2. Créer le squelette Vite + TS (`npm create vite`, install Vitest/ESLint/Prettier).
3. Implémenter `tick()` et le store vide (Phase 0 du ROADMAP).
4. Rendre le premier écran : canvas + barre de statut avec le temps qui tourne.