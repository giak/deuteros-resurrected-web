# DASHBOARD — État d'avancement

> Dernière mise à jour : 2026-09-18
> Source de vérité pour « où en est le projet ? ». Mettre à jour après chaque session.

---

## 1. Statut global

🟢 **Phase 0 — Fondations** *(en cours, ~80 % — reste écran + CI)*

| Domaine | Statut |
|---|---|
| Documentation cadrage | 🟢 Réalisée |
| Recherche de référence (original) | 🟢 `RESEARCH.md` (commit `0ee27d7`) |
| Repo / git | 🟢 4 commits (`060a402` → `59b6157`) |
| Build Vite + TS | 🟢 Squelette OK (bun) |
| Spec tables v1 | 🟢 commit `08107fb` |
| Tables v1 (data + moteur + tests) | 🟢 commit `59b6157`, 42/42 tests |
| Simulation squelettique | ✅ couvert par tables v1 (`src/simulation/`) |
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
| Data model | `docs/DATA.md` | 🟢 v0.1 (§1.3/§2 à aligner sur items.json) |
| Spec tables v1 | `docs/superpowers/specs/2026-09-15-tables-v1-design.md` | 🟢 validée |
| Roadmap | `docs/ROADMAP.md` | 🟢 v0.1 |
| Tech stack | `docs/TECH_STACK.md` | 🟢 v0.1 |
| ADR | `docs/DECISIONS.md` | 🟢 |
| Dashboard | `docs/DASHBOARD.md` | 🟢 |
| Trace (journal) | `docs/TRACE.md` | 🟢 |
| Trace de session (spec K10) | `docs/superpowers/specs/2026-09-17-trace-session-design.md` | 🟢 exécutée (`src/trace/`) |
| Recherche original Deuteros | `docs/RESEARCH.md` | 🟢 v0.1 |

---

## 4. Statistiques projet (suivi)

| Métrique | Valeur |
|---|---|
| Sessions de travail | 17 |
| Tickets ouverts | 0 |
| Commits | 42 |
| Tests | 111 |
| Build jouable | oui (v0, playtest réel effectué) |

*(colonnes à alimenter au fil du projet)*

---

## 5. Liens utiles

- **Original** : https://fr.wikipedia.org/wiki/Deuteros:_The_Next_Millennium
- **Fan remake de référence (C++)** : https://github.com/tonyoddspherecom/Deuteros-Resurrected/
- **Discord community remake** : https://discord.gg/SwmR4MFJpG

---

## 6. Prochains pas (TODO court terme)

1. Commiter les tables v1 (data + simulation + tests) après revue.
2. Rendre le premier écran : canvas + barre de statut branchée sur `dayTick()`.
3. CI GH Actions (lint, typecheck, tests).
4. GAMEPLAY v0.2 : arbitrer transport/Hydroïdes/défaite + répercuter les corrections tables v1.