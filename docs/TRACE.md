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

---

## Session 2 — 2026-09-15 (initialisation + recherche)

**Durée** : ~1 h

**Objectif** : initialiser le repo, poser le squelette Vite/TS, et amasser la matière de référence sur l'original avant de concevoir la simulation.

**Réalisé :**
- Repo git initialisé + commit initial `060a402` (docs + squelette).
- Squelette Vite 6 + TypeScript strict (bun) ; structure `src/{simulation,state,actions,ui,render}` + `data/` + `tests/` ; alias `@/*` ; Vitest, ESLint 9 (flat config), Prettier. `lint`, `typecheck`, `test`, `build` : OK.
- Recherche web multilinguistiques (EN/FR/DE) + fan sites sur *Deuteros* original → rédigé [`docs/RESEARCH.md`](RESEARCH.md) :
  - règles/fiabilité des chiffres, 16 ressources, gisements, recettes (pods, châssis, drones, TMT), écrans du jeu original, principes d'addiction (timers entrecroisés, population fixe 6 000, courbe d'automatisation, milestones).
  - **écarts identifiés** avec nos docs (ressources, transport pods vs tonnes, Hydroïdes, défaite par perte d'infra) → à trancher avant de figer DATA/GAMEPLAY.

**Points d'attention :**
- Les valeurs chiffrées de la table des recettes sont issues d'une page de fan (OCR) — re-valider sur le build du remake (password « Birdy99 »).
- Décision en attente : aligner DATA.md sur les 16 ressources originales ou garder notre liste épurée de 10.

**Prochaines étapes (TODO) :**
1. Arbitrer les écarts de RESEARCH.md §15 (ressources, transport, défaite).
2. Puis reprendre la fin de la Phase 0 : `tick()` + store, premier écran canvas + barre de temps, CI dans GH Actions.

---

## Session 3 — 2026-09-15 (round 2 : sources primaires)

**Objectif** : élever la fiabilité de `docs/RESEARCH.md` en passant des pages de fans aux sources primaires (manuel original, code source du remake, reviews intégrales, walkthrough officiel M2.2).

**Réalisé :**
- **Manuel original trouvé** (Archive.org, `amiga_games_manual`, 50 p. scannées) — après que pdftotext a échoué (scan sans couche texte), **OCR tesseract (eng)** complet → ~9 451 mots dans `/tmp/opencode/deuteros/manual/ocr/`. Extraction : crédits définitifs (Ian Bird, Jai Redman, Matt Bates, Martin Walker, Dave Cur, Marjacq Micros), chronologie (2200→3100 AD), panneaux Master/Dept/Ship Control, guide usine orbitale, Addenda A/B.
- **Code source du remake récupéré** : le repo GitHub (`tonyoddspherecom/Deuteros-Resurrected`, br. **`develop`**, 964 fichiers) n'était pas vide. `CoreData.cs` (4 141 lignes) = reconstitution des données. Parseurs écrits puis corrigés → **46 items complets** (BuildRequirements + ResearchItem tech/order + masses), 156 corps avec parents/lunes/MoonList, 8 listes de PlanetDistance, taux derrick, multiplicateurs de survey, algorithme de production.
- **Matrice gisements transcrite** (oocities/Wayback) en `deposits_matrix.csv/.md` : 160 corps / 9 systèmes / 16 ressources ; 8 corps porteurs de segment identifiés. **Vérification croisée** vs core Data : 151 corps communs concordants, écarts = carburants (non modélisés remake) + 3 minimes.
- **Reviews intégrales** (5 magazines) : scores, auteurs, pages, remarques → corrections chrono (3100 AD, pas 3000 ; 8 systèmes, pas 7).
- **Walkthrough Millennium 2.2** (GameFAQs) : interface héritée + règles carburants.

**Corrections majeures apportées à RESEARCH.md :**
- §9 Recettes : Derrick (C ≠ Cu), S Drive (Al ≠ Cu), Pods (Ti ≠ Fe), ACC/AOC (Ti), R Frame (Pt/Ag/Si), Star Drone ; items MFL/Prison/Sonic ajoutés.
- §15 : 4 arbitrages passés du statut « à décider » à « tranché » (segments, recettes, chrono, algo production).

**Accès mnémo :** refs `9ab05f95-…` et `2ce94fcc-…` mises à jour (write-back avec hash `source:<sha1-10>`), mémoire saine (health 200). EAB toujours inaccessible (Anubis).

**Points d'attention :**
- ~~`ResourceRate_Per_Derrick` tronquée~~ → **résolu** (Session 4) : la « troncature » était un artefact d'affichage ; le fichier local est complet, liste dérivée au complet dans §9.
- « MOON INDEX » de `Notes.txt` (ex. Saturn `1,2,4,6,7,8,9,10,11`) ≠ indices oocities → deux systèmes de numérotation à ne pas confondre (§8 note).
- 15 vs 16 ressources : à trancher in-game (MeH Fuel minable ou seulement craftable ?).

**Prochaines étapes (TODO) :**
1. Arbitrer les écarts restants §15 (ressources 10 vs 16, transport, défaite, Hydroïdes, TMT).
2. Puis reprendre la fin de la Phase 0 : `tick()` + store, premier écran canvas, CI GH Actions.
3. Décider du sort du lot de recherche : commiter `docs/RESEARCH.md` + README/DASHBOARD/ROADMAP/TRACE.

---

## Session 4 — 2026-09-15 (passe code : mécaniques de simulation)

**Objectif** (après validation utilisateur) : extraire du code source du remake les **mécaniques de simulation** (production, recherche, combat, minage, voyage, formation, ennemis) pour alimenter la conception des tables v1 — plutôt que de continuer une collecte de données détaillées à rendement décroissant.

**Réalisé :**
- **Fichiers du remake lus intégralement** (dans `/tmp/opencode/deuteros/remake/`, repo `develop`) : `GameCore.cs`, `Factory.cs`, `Production.cs` (screen), `Research.cs` (screen), `ResearchItem.cs`, `BattleLogic.cs` (712 l), `Planet.cs`/`Earth.cs`/`Asteroid.cs`, `InterStellarShip.cs`/`Shuttle.cs`, `ShipModule.cs`, `Staff.cs`/`Training.cs`, `Store.cs`, `MTX.cs`, `EnemyDroneBuilder.cs`, `EnemyFleets.cs` (146 l), `Unlocker.cs`, `Enums.cs` complet.
- **Algorithme de production LECTURE DÉFINITIVE** : `v = (engineers << rank) × multiplier / 801` (**et non /321** — la valeur consignée en Session 3 avant lecture complète du moteur était fausse), wrap 8 bits à 255, **Production_Complete == 4** = item terminé, **AOC = v fixe 128** (produit sans ingénieurs ni ressources, 1 seul exemplaire). Changement d'item en cours = travail perdu.
- **Recherche** : 1 seul projet à la fois sur Terre ; `v = (teamSize << level) × ResearchMultiplier / 801`, wrap 8 bits, **+11 % par wrap** ; gate par `TechLevel` du chef d'équipe.
- **Combat** (2D) : `Power = (Pilot.Level + 4) × DroneCount`, ratio de puissance vs `battleFactors` (victoire quasi certaine ≥ ratio max), fuite ennemie sous seuil, **PTL = 100 HeD fuel**, capture Méthanoïde (AOC + MTX/SDM + 50 IOS drones + perte des vaisseaux du joueur).
- **Minage** : requiert `Derricks>0 && BaseBuildParts==2 && !BaseDamaged`, Terre jours pairs, survey `rand(0,8)` × multiplicateurs, plafond stock **50 000**, astéroïdes minables (6 types) + classes de masse (8).
- **Voyage** : intra-système `max(|ΔOrdre|,1)` j, inter-planètes `|ΔOrdre|×4`, navette Land/TakeOff/repair (2/5/2 j).
- **Formation & staff** : réservoir 6 000, max 250/200/41, simultanée 100/100/41, **24 j par type**, 1 type à la fois.
- **RESEARCH.md** : correction `/321 → /801` (§9 + §15), `ResourceRate_Per_Derrick` au complet, ajout **§14c « Mécaniques de simulation extraites du code »** (production, recherche, combat, minage, voyage, staff, ennemis, MTX), source S12 élargie.
- **Mnémo write-back** : refs `2ce94fcc-…` (gameplay — passe code complète) et `9ab05f95-…` (recettes — `/801` + derrick rate complet) mises à jour. Timeouts MCP `-32001` = **artefact client** : la lecture confirme l'écriture serveur réussie (updated_at à jour), aucun fallback nécessaire ; service sain (ping + health + circuit breakers fermés).

**Points d'attention :**
- `GetLevel()` vs `GetLevelString()` marines : Captain 10-39/40+ vs 10-29/30+ — incohérence du remake à trancher côté design.
- Ref `9ab05f95-…` : tags d'état (`status:CONFIRME`, `project:deuteros-…`) **conservés** lors de l'update — contenu recettes/chrono/reviews intact.

**Prochaines étapes (TODO) :**
1. **Décision utilisateur** : que faire de ce corpus mécaniques ? → (a) enrichir encore (Production.cs déjà lu, reste `Screens/{Navigation,BaysAndDocks}`…), (b) **passer à la conception des tables v1** (DATA.md/GAMEPLAY.md avec les valeurs extraites), (c) commiter le lot de recherche en l'état.
2. Arbitrer les écarts §15 (ressources 10 vs 16, transport, défaite, Hydroïdes, TMT).
3. Reprendre la fin de la Phase 0 : `tick()` + store, premier écran canvas, CI GH Actions.