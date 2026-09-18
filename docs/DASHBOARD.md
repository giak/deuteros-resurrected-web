# DASHBOARD — État d'avancement

> Dernière mise à jour : 2026-09-18
> Source de vérité pour « où en est le projet ? ». Mettre à jour après chaque session.

---

## 1. Statut global

🟢 **v0 — Boucle Terre jouable — `v0.0.1` posé** *(clôture v0, playtest validé 2026-09-18)*

| Domaine | Statut |
|---|---|
| Documentation cadrage | 🟢 Réalisée |
| Recherche de référence (original) | 🟢 `RESEARCH.md` (commit `0ee27d7`) |
| Repo / git | 🟢 80 commits — tag `v0.0.1` posé |
| Build Vite + TS | 🟢 OK (npm) |
| Spec tables v1 | 🟢 commit `08107fb` |
| Tables v1 (data + moteur + tests) | 🟢 `src/simulation/`, contrat v0 verrouillé (111 tests) |
| Simulation squelettique | ✅ couvert par tables v1 (`src/simulation/`) |
| Facade d'actions (ADR-018) | 🟢 `src/actions/`, seule porte de mutation |
| Écran Terre (panneaux + victoire) | 🟢 v0 jouable |
| Trace de session (K10) | 🟢 `src/trace/` |
| Pause auto sur objectif (K11) | 🟢 bannière + reprise |
| CI (lint, typecheck, tests) | 🟢 `.github/workflows/ci.yml` — run vert 2026-09-18 |

---

## 2. Phases ROADMAP

| Phase | Statut | Notes |
|---|---|---|
| 0 — Fondations | 🟢 terminée | docs + tables + UI v0 |
| 1 — MVP jouable | 🟨 en cours | v0 « Boucle Terre » **v0.0.1 posé** ; playtest humain validé (2026-09-18) |
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
| PFD (Plan Fonctionnel Détaillé) | `docs/PFD.md` | 🟢 v0.2 |
| Gameplay (règles chiffrées) | `docs/GAMEPLAY.md` | 🟢 v0.2 |
| Architecture | `docs/ARCHITECTURE.md` | 🟢 v0.1 |
| Data model | `docs/DATA.md` | 🟢 v0.2 (§1.3/§2 à aligner sur items.json) |
| Spec tables v1 | `docs/superpowers/specs/2026-09-15-tables-v1-design.md` | 🟢 validée |
| Roadmap | `docs/ROADMAP.md` | 🟢 v0.1 |
| Tech stack | `docs/TECH_STACK.md` | 🟢 v0.1 |
| ADR | `docs/DECISIONS.md` | 🟢 |
| Dashboard | `docs/DASHBOARD.md` | 🟢 |
| Trace (journal) | `docs/TRACE.md` | 🟢 |
| Trace de session (spec K10) | `docs/superpowers/specs/2026-09-17-trace-session-design.md` | 🟢 exécutée (`src/trace/`) |
| Pause auto sur objectif (spec K11) | `docs/superpowers/specs/2026-09-18-pause-objectifs-design.md` | 🟢 exécutée |
| Recherche original Deuteros | `docs/RESEARCH.md` | 🟢 v0.1 |

---

## 4. Statistiques projet (suivi)

| Métrique | Valeur |
|---|---|
| Sessions de travail | 23 |
| Tickets ouverts | 0 |
| Commits | 80 |
| Tests | 111 |
| Build jouable | oui — tag `v0.0.1` posé (2026-09-18) |

*(colonnes à alimenter au fil du projet)*

---

## 5. Liens utiles

- **Original** : https://fr.wikipedia.org/wiki/Deuteros:_The_Next_Millennium
- **Fan remake de référence (Godot / C#)** : https://github.com/tonyoddspherecom/Deuteros-Resurrected/ (clone local de référence : `/home/giak/projects/Deuteros-Resurrected`, br. `develop`, HEAD `d252446f`)
- **Manuel original (scan PDF)** : https://archive.org/download/amiga_games_manual/Deuteros%20-%20The%20next%20Millennium%20-%20Manual-ENG.zip
- **Discord community remake** : https://discord.gg/SwmR4MFJpG

---

## 6. Prochains pas (TODO court terme)

1. Playtest humain réel à ×20 avec trace + pause auto (valider l'usage après K10/K11).
2. CI GH Actions (lint, typecheck, tests).
3. ~~GAMEPLAY v0.2 — arbitrages posés (spec + docs v0.2)~~ ✅.
4. Phase 1 MVP : automatisation des relances (réduire la charge manuelle constatée en playtest).