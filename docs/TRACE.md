# TRACE — Journal de sessions

> Journal chronologique de chaque session de travail sur le projet : ce qui a été fait, décidé, et les prochaines étapes. À compléter après chaque session.

---

## Session 1 — 2026-09-15 (cadrage)

**Durée** : ~30 min

**Objectif** : poser les fondations documentaires du projet.

**Réalisé :**
- Choix stratégiques validés avec l'utilisateur :
  - **Spiritual successor** (pas un remake pixel pour pixel)
  - **Stack** : TypeScript + Vite + Canvas 2D + DOM vanilla
  - **Frontend seul** (pas de backend, save locale) — « JS sûr, on a besoin de plus ? » → non
  - **Rendu 2D** (pas de WebGL 3D en v1)
  - Nom du projet : `deuteros-resurrected-web`
  - Documentation en **français**
- Créé `/home/giak/projects/deuteros-resurrected-web/` avec la structure docs.
- Écrit 11 documents de cadrage (VISION, PFD, GAMEPLAY, ARCHITECTURE, DATA, ROADMAP, TECH_STACK, DECISIONS, DASHBOARD, TRACE + README).

**Décisions prises (voir DECISIONS.md)** : ADR-001 à ADR-006.

**Points d'attention / à valider plus tard :**
- Valeurs chiffrées du GAMEPLAY (coûts, vitesses, difficultés) : **itérations provisoires**, à valider par playtests.
- Choix « DOM vanilla vs framework » revalidés en Phase 1 si l'UI devient lourde.

**Prochaines étapes (TODO) :**
1. Init repo git + commit des docs.
2. Squelette Vite + TS + Vitest.
3. Squelette state/tick.
4. Premier écran : canvas + barre de temps.

---

## Sessions suivantes

*(à compléter…)*