# DECISIONS — Registre des décisions architecturales (ADR)

> Chaque ADR documente une décision structurante : contexte, options, choix, conséquences.
> Le format est léger : pas besoin de formalisme ADR complet.

---

## ADR-001 — Monolithe TypeScript frontend-seul (approuvé 2026-09-15)

**Contexte** : Deuteros est un jeu solo à temps discret. Les exigences (solo, offline, save locale) ne demandent aucun serveur.

**Options** :
1. TypeScript + Vite, 100 % client
2. Rust → WASM + TS
3. Python FastAPI backend + JS front

**Choix** : **Option 1.**

**Conséquences** :
- Simulation pure et déterministe, testable sans navigateur.
- Zero ops, zero auth, zero réseau → déploiement trivial (static).
- Reprogrammer vers WASM plus tard possible sans casser l'UI (Architecture §2).

---

## ADR-002 — Simulation par tick discret, fonctions pures (approuvé 2026-09-15)

**Contexte** : besoin de rejouabilité, de testabilité, d'absence de drift entre UI et monde.

**Choix** : la simulation avance par pas de « jour », `tick(state, seed) → state`, sans `Date.now()` ni `Math.random()` non-seedé.

**Conséquences** :
- Le RNG est partie du state (sérialisé).
- Pas de concurrence/async dans la sim.
- Les ordres en pause sont résolus au tick suivant.

---

## ADR-003 — PAS de framework UI en v1 (DOM vanilla + helpers) (approuvé 2026-09-15)

**Contexte** : l'UI est dense et exigeante en style propre (rétro), mais le volume reste gérable.

**Choix** : DOM vanilla + petits helpers (`el()`, `bind()`, `reactive()`).

**Conséquences** :
- Bundle petit, zéro dépendance framework, apprentissage nul.
- Risque : réinventer des composants. Budget réserver : si un écran devient ingérable, réévaluer (React/Preact) en ADR dédié.

---

## ADR-004 — Canvas 2D procédural pour la vue système (approuvé 2026-09-15)

**Contexte** : un rendu spatial fluide et scalable, sans assets.

**Choix** : Canvas 2D natif + sprites procéduraux (draw code), pas de Three.js en v1.

**Conséquences** : rapide, cohérent, léger ; compensations esthétiques acceptées (pas de 3D).

---

## ADR-005 — Données du jeu en JSON statiques (moddable) (approuvé 2026-09-15)

**Contexte** : {planètes, techs, recettes, vaisseaux, événements} = beaucoup de données.

**Choix** : fichiers JSON séparés dans `data/`, chargés au boot, immutables en runtime.

**Conséquences** :
- Sépare contenu et code, permet un futur modding.
- Validation au boot (schéma) ; toute donnée invalide → refus de chargement.

---

## ADR-006 — Save versionnée + migrations (approuvé 2026-09-15)

**Contexte** : l'évolution du jeu cassera le format de save.

**Choix** : champ `version`, pipeline de migrations `migrate(save): Save`.

**Conséquences** : compat ascendante avec les anciennes sauvegardes (jusqu'à un seuil défini), sauvegarde toujours sonnante corrompue.

---

## Décisions en attente

- Faut-il un écran de tuto in-game dans le MVP ? (probablement out, onboarding par tooltips)
- Multi-slots de sauvegarde automatisés vs unique « dernière partie » ? (tranche en Phase 2)
- Style visuel exact des écrans (palette, typo) — décision art, en Phase 5.

---

## Journal des révisions

| Date | Décision |
|---|---|
| 2026-09-15 | ADR-001 à 006 approuvés |
| 2026-09-15 | Début de session, tout le cadre documentaire créé |