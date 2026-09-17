# TRACE — Journal de sessions

> Journal chronologique de chaque session de travail sur le projet : ce qui a été fait, décidé, et les prochaines étapes. À compléter après chaque session.

---

## Session 12 — 2026-09-16 (task 9 du plan v0 — écran Terre : coquille à onglets + panneau Production)

**Objectif** : première tâche UI — remplacer le panneau latéral statique par l'écran Terre `#earth-screen` (onglets, panneau Production queue/cancel) et poser le helper items-au-sol.

**Réalisé :**
- **`GROUND_ITEMS`** dans `src/simulation/data.ts` — filtre **sans gate de catégorie** `(i) => i.inputs && !i.orbitOnly` (correction **K3** approuvée : le filtre du brief `category === 'item'` excluait `meh_fuel` → 8 items au lieu de 9). Liste exacte des 9 vérifiée sur `data/items.json` ; exporté au barrel `@/simulation`.
- **`src/ui/earth-screen.ts`** — coquille à onglets (Bulletins/Production/Recherche/Personnel/Minage), panneau Production (table 9 items avec gate stocks, boutons Produire/Annuler), onglet Bulletins, placeholders task 10. Helper pur **`productionRows(state)` exporté** (testable hors DOM) ; `renderProduction` exporté.
- **`src/ui/app.ts`** — aside statique remplacé par `<aside class="hud-side" id="earth-screen">`, `mountEarthScreen` branché, `setupSidebar`/`bodyDotColor`/section Bulletins supprimés, double-rendu `#news-feed` de `updateHud` retiré (l'onglet news est seul propriétaire du fil). Canvas/contrôles/boucle intacts.
- **`src/style.css`** — onglets `.tabs/.tab(.active)`, `.panel-table`, `.queue-line`, `.hud-btn:disabled` ; bloc « Liste des corps » retiré (mort CSS).
- **Smoke adaptation (recette Task 12 inexistante)** — `tests/ui.test.ts` : helpers purs (GROUND_ITEMS 9 + ids exacts, productionRows = set affiché complet, gate `disabled` par stocks, K3 meh_fuel conservé). Test data `toHaveLength(9)` dans `tests/data.test.ts`.
- **Décision consignée K7** (DECISIONS.md) — filtre K3, smoke hors DOM, retraits app.ts, a11y légère (`aria-label`/`aria-pressed`).
- **Verification** : vitest **73/73** (8 files dont ui.test.ts 3), `bun run lint` 0, `bunx tsc --noEmit` 0, `bun run build` VERT (bundle 73.0 kB js). Aucun `Math.random`/`Date.now` ajouté hors `app.ts` (boot existant intact).
- **Commits** : `feat(ui): écran Terre à onglets + panneau production (queue/cancel)` puis docs — rapport `.git/sdd/task-9-report.md`.

**Verdict** : B1 (coquille onglets) et B2 (panneau production queue/cancel) livrés ; les panneaux Recherche/Personnel/Minage restent des placeholders (tasks 10). Le filtre K3 corrige bien l'écart du brief (9 items, meh_fuel inclus).

**Prochaines étapes (TODO) :**
1. Tasks 10 du plan v0 : panneaux Recherche / Personnel / Minage de l'écran Terre.
2. Réconcilier le suivi du plan `.git/sdd/` (progress ledger) avec TRACE/DECISIONS.

---

## Session 11 — 2026-09-16 (task 8 du plan v0 — boucle intégrée 250 j)

**Objectif** : dernière milestone moteur — test d'intégration « boucle Terre » (C5) : scénario scripté research of_frame → derricks en série → install → production d'OF Frame ≤ J250, déterministe, avec invariants (stocks bornés, équipes présentes).

**Réalisé :**
- **Fichier créé** `tests/integration.test.ts` (brief verbatim corrigé, 2 tests, 49 lignes).
- **Test ROUGE a priori** — `victory === false` à J300. Investigation (instrumentation) : recherche of_frame terminée **J58**, ressources de l'OF Frame disponibles dès ~J60 → ni moteur ni balance en cause. **Cause racine : ordonnancement du scénario du brief** — la ligne `queueItem(derrick)` précède la bascule OF Frame et remplit l'usine à chaque libération ; la condition `!factory.currentItemId` de la bascule reste **jamais satisfaite** (une relance boots/derricks n'aurait rien changé — Step 2 du brief non applicable). **Correction test-only minimale** : inversion des deux blocs (bascule OF Frame avant la file derrick par défaut), assertions inchangées, moteur intact. Consigné **K6** (DECISIONS.md).
- **C5 VERT** : seed 42 → **victoire J112** ; double-run strict → déterminisme ; autres seeds (1, 7, 99, 12345) victoires **J91–J112**, déterministes. Invariants sur 250 ticks : aucun throw, stocks ≤ 50 000, `builder` non-null.
- **Verification** : vitest **69/69** (7 files), `bun run lint` 0, `bunx tsc --noEmit` 0. Aucun changement de code source (production) — contrainte respectée.
- **Commit `5c89809`** `test(integration): boucle 250 j — crash + contraintes (C5)` — rapport complet `.git/sdd/task-8-report.md`.

**Verdict** : le contrat C5 (boucle intégrée jouable, déterministe, ≤ J250) est satisfait par le moteur+facade des sessions 5-9 ; le test verrouille la stratégie de référence et son garde-fou de victoire.

**Prochaines étapes (TODO) :**
1. Batch frontend (UI bulletins/écran, barre de temps branchée sur `dayTick`).
2. Réconcilier le suivi du plan `.git/sdd/` (progress ledger) avec TRACE/DECISIONS.

---

## Session 10 — 2026-09-16 (task 7 du plan v0 — contrats C1-C4)

**Objectif** : miletone contract-verification — 4 tests contrats chiffrés (C1-C4) vérifiant les régimes production/recherche/minage de bout en bout.

**Réalisé :**
- **Fichier unique** `tests/contracts.test.ts` créé (brief verbatim, 4 tests, 57 lignes).
- **C1 production** — 3 régimess 31/63/127 j+jour via `dailyProductionValue` + supply_pod bouclé 23 j via `dayTick`+`queueItem` : **VERT** (le moteur est fidèle /801+wrap).
- **C2 recherche** — vérification inline `((250 << 1) * 64) / 801 | 0 === 39` + boucle `updateResearch` 58 j → of_frame researched : **VERT**.
- **C3 minage** — 1 derrick boot, seed 42, jours pairs, `createRng(42)` déterministe : premier iron entre J2 et J18, cap 50 000 vérifié : **VERT**.
- **Verification** : vitest **67/67** (6 files), `bun run lint` 0, `bunx tsc --noEmit` 0.
- **Commit** `a62f21b` `test(contracts): C1-C4 tests chiffrés des contrats utilisateur`.

**Verdict** : les 4 contrats étaient déjà satisfaits par le moteur+facade des sessions 5-9 ; les tests verrouillent les valeurs numériques (pas de régression future).

---

## Session 9 — 2026-09-16 (task 6 du plan v0 — action `installDerrick`)

**Objectif** : implémenter l'installation de derricks produits (spec §5.2) selon le brief `.git/sdd/task-6-brief.md` — dernière action du lot « core actions ».

**Réalisé :**
- **TDD** `src/actions/mining.ts` + export au barrel `src/actions/index.ts` + tests `tests/actions.test.ts` (brief verbatim) : RED 2/2 (`installDerrick` indéfini → `runAction` crash « reading 'validate' ») → GREEN.
- **Implémentation verbatim** : `validate` lit `(state.planets.earth.items['derrick'] ?? 0) >= 1` → raison `no_derrick_in_store` ; `execute` décrémente le stock, incrémente `earth.derricks`, bulletin FR « Derrick installé (total : …) ». Boot : dérricks=1, items `{}` → le test « refuse » couvre bien le comportement de boot.
- **Écart consigné vs brief** : import `GameState` retiré (inutilisé — `tsc noUnusedLocals`/lint) — même déviation que tasks 4-5 (voir DECISIONS.md K4/K5).
- **Verification** : vitest **63/63** (5 files), `bun run lint` 0, `bunx tsc --noEmit` 0, **commit `9b143af`** `feat(actions): installDerrick`. Aucun `Math.random`/`Date.now` dans `src/actions/`.

**Prochaines étapes (TODO) :**
1. Tasks 7+ du plan v0 (UI bulletins/écran, boucle complète).
2. Réconcilier le suivi du plan `.git/sdd/` avec TRACE/DECISIONS (tasks 2-3 à rattraper).

---

## Session 8 — 2026-09-16 (task 5 du plan v0 — action `trainStaff`)

**Objectif** : implémenter la formation de personnel (spec §6.4) selon le brief `.git/sdd/task-5-brief.md`.

**Réalisé :**
- **TDD** `src/actions/staff.ts` + export au barrel `src/actions/index.ts` + tests `tests/actions.test.ts` (brief verbatim) : RED 3/3 (`trainStaff` indéfini → `runAction` crash « reading 'validate' ») → GREEN 15/15.
- **Ordre de validate imposé par le brief** : `invalid_count` → `capacity_exceeded` → `other_type_training` → `insufficient_reservoir` (les raisons exactes que les tests assertent) — suivi verbatim.
- **Écart consigné vs brief** : l'import `GameState` inutilisé retiré (tsc `noUnusedLocals`/lint) — précédent K4 (task 4), voir DECISIONS.md K5.
- **Verification** : vitest **61/61** (5 files), `bun run lint` 0, `bunx tsc --noEmit` 0, **commit `08c2949`** `feat(actions): trainStaff`. Aucun `Math.random`/`Date.now` dans `src/actions/`.

**Points d'attention :**
- Branche `insufficient_reservoir` de `validate` **inatteignable** en l'état du moteur : `canTrain` borne déjà `count ≤ reservoir`, donc si elle passe, le 4e test ne peut jamais déclencher ; les tests du brief ne l'exercent pas non plus. Conservée verbatim (brief) — à réviser si la sémantique de `canTrain` change.

**Prochaines étapes (TODO) :**
1. Tasks 6+ du plan v0 (UI bulletins/écran, boucle complète).
2. Réconcilier le suivi du plan `.git/sdd/` avec TRACE/DECISIONS (tasks 2-3 à rattraper).

---

## Session 7 — 2026-09-16 (task 4 du plan v0 — action `selectResearch`)

**Objectif** : implémenter la recherche de projet (spec §6.3) selon le brief `.git/sdd/task-4-brief.md`.

**Réalisé :**
- **TDD** `src/actions/research.ts` + export au barrel `src/actions/index.ts` + tests `tests/actions.test.ts` (brief verbatim) : RED 3/3 (import undefined) → GREEN.
- **Correction K4 (approuvée)** : garde `!ITEM_BY_ID[itemId] → not_researchable` **avant** l'appel `canSelect` — sans elle, un itemId inconnu (`'chaise'`) faisait lever `getItem` (« Item inconnu ») et le test attendu `{ ok: false, reason: 'not_researchable' }` aurait crashé. Consignée dans DECISIONS.md.
- **Écart consigné vs brief** : l'import `GameState` du brief était inutilisé → `tsc`/`lint` (contraintes liantes) hors-bleu ; retiré, le reste du code est verbatim (raisons `not_researchable`/`locked`/`already_researched`, bulletin FR, re-sélection = changement de projet sans perte de progression).
- **Verification** : vitest **58/58** (5 files), `bun run lint` 0, `bunx tsc --noEmit` 0, **commit `aa9c946`** `feat(actions): selectResearch`. Aucun `Math.random`/`Date.now` dans `src/actions/`.

**Prochaines étapes (TODO) :**
1. Tasks 5+ du plan v0 (UI bulletins/écran, boucle complète).
2. Réconcilier `docs/TRACE.md`/`DECISIONS.md` avec le suivi du plan `.git/sdd/` (consignation des tasks 2-3 à rattraper).

---

## Session 6 — 2026-09-16 (audit antagoniste du design architecture)

**Objectif** : challenger les choix du design architecture (spec `2026-09-16-architecture-design.md`, ADR-007 à 012) via **6 rôles antagoniste dédiés** dispatchés en parallèle, chacun avec recherches web contradictoires (cache miss MnemoLite préalable).

**Rôles & verdicts :**
1. **Architecture Clean+Hexagonal** (recension `docs/superpowers/recensions/2026-09-16-antagonist-report.md`, mnémo `7d61294a`) → **AMENDER** : garder cœur pur/tick pur/zod/Result/golden ; retirer tsyringe, ports formels monoclients, 4 couches → 2 modules.
2. **ECS pur** (recension `docs/superpowers/specs/2026-09-16-antagoniste-ecs-adr-008.md`, mnémo `7fe5f2e8`) → **REMPLACER** l'ECS formel par **records + services par domaine** (consensus unanime : < ~500 entités hétérogènes = aucun gain ECS ; `Map<EntityId, unknown>` = indirection sans localité mémoire) ; les frictions ADR-011/006/010 disparaissent.
3. **tsyringe** (mnémo `64c48c71`) → **REMPLACER** par **pure DI / Composition Root manuelle** : esbuild (Vite/Vitest) ne supporte pas `emitDecoratorMetadata` (#29/#240/#180, esbuild #257) → transpileur supplémentaire ; maintenance 0/10 (deps.dev, issues Archive #246/#248) ; pour ~4 adapters le conteneur est strictement équivalent à une factory manuelle + polyfill.
4. **Erreurs 3 mécanismes** (mnémo `d2628b8d`) → **AMENDER** : garder zod🟢 + crash-loud renforcé🟢 (asserts invariants ≥ 2/fct, handler `window.onerror`, arrêt du tick ; autosave frais + double slot pour tenir la promesse « partie intacte ») ; **retirer neverthrow🔴** → union discriminée maison ~20 lignes, restreinte à la couche actions (jamais dans les systèmes), `validate-then-mutate` (Wlaschin « Against ROP », doc neverthrow elle-même).
5. **Boucle/échelles temps** (mnémo `53386375`+`052eb551`) → **AMENDER** : remplacer l'interval par un **accumulateur à cap** (`MAX_TICKS_PER_FRAME` adaptatif, surplus de lag jamais rattrapé), budget sim/frame, suspension sur onglet caché, échelles = plafonds de débit (Stellaris/Factorio), interpolation de PRÉSENTATION seule ; multiplier = nombre de ticks jamais un dt (Gaffer, Nystrom, Bevy #8544).
6. **Tests §8** (mnémo `6e507180`) → **AMENDER** : supprimer le golden full-state (fige les bugs + contredit ADR-012 rebalance) → **double-run `deepEqual`** pour le déterminisme + **scénarios E2E scriptés** (record/replay d'actions) ; fast-check réduit aux maths pures (propriétés différentielles /801/wrap) ; retirer le niveau « contrat adapter » → smoke réel (fake-indexeddb).

**Convergence** : 6/6 remettent en cause le conteneur DI et/ou l'ECS ; le besoin réel d'injection = ~4 adapters (persistance, prng, clock, vue) + config.

**Arbitrage utilisateur : suivre les 6 verdicts.** ADR-007/008 révoqués ; ADR-013 (pure DI), 014 (records+services), 015 (union maison+crash-loud), 016 (accumulateur+budget), 017 (tests double-run+scénarios) approuvés. Spec architecture réécrit (2 modules). Write-back mnémo synthèse : `118f4edb`.

**Prochaines étapes (TODO) :**
1. Arbitrer chaque verdict (GARDER/AMENDER/REMPLACER) en brainstorming avec l'utilisateur.
2. Appliquer : réécrire l'ADR-007 (→ pure DI), ADR-008 (→ records/services), ADR-011 (→ union maison sans neverthrow), ADR-009/012 (→ accumulateur + budget), spec architecture (→ 2 modules), §8 tests (→ double-run + scénarios).
3. Documenter l'audit dans `docs/superpowers/audits/` (rapport de synthèse).

**(Arbitrage fait en session : les 6 verdicts sont suivis, voir les ADR-013 à 017 et le spec réécrit.)**

> **⚠️ Conflit de numérotation ADR détecté en relecture — RÉSOLU** : le spec v0 « Boucle Terre » et son plan réservaient **ADR-007** à « moteur mutable + facade d'actions », mais cette session avait attribué ADR-007/008 à tsyringe/ECS (révoqués). **Arbitrage utilisateur : ADR-018 pour la facade.** Consigné dans DECISIONS.md (ADR-018) ; le plan v0 reste exécutable tel quel (sa décision porte désormais le n° 018).

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

---

## Session 5 — 2026-09-15 (implémentation des tables v1)

**Objectif** : implémenter la spec tables v1 (commit `08107fb`) — `data/*.json`, constantes de simulation, moteur fidèle au code du remake, tests unitaires.

**Réalisé :**
- **Reconnexion contexte** : MnemoLite sain (health 200, MCP 8002 OK), mémoire `2ce94fcc` (passe code Session 4) intacte — write-back vérifié. Artéfacts `/tmp/opencode/deuteros/` conservés (matrice gisements, sources du remake).
- **Commit `0ee27d7`** : lot de recherche (RESEARCH.md + docs sessions 2-4).
- **Données générées** (`scripts/generate_data.py`, reproductible) :
  - `resources.json` — 16 ressources (derrick rates 2/1, survey He=4/Pt=2/Ag=2/Au=3).
  - `items.json` — 46 items (31 recherchables), recettes fidèles CoreData.cs.
  - `planets.json` — 164 corps / 9 systèmes (v1 = Soleil, 47 corps), 8 segments, colonies Méthanoïdes de départ (jupiter, uranus, titania, neptune, triton, pluto — extraites des flags `ActiveMethanoid = true`), Terre 1 derrick, Lune endommagée.
  - `astronomical.json` (astéroïdes : 7 types minables, 8 classes de masse), `difficulties.json`, `events.json` (timeline minimale).
- **Moteur** (`src/simulation/`) : `config.ts` (SIM_CONFIG), `types.ts`, `rng.ts` (mulberry32 déterministe), `data.ts` (loaders typés), `state.ts` (miroir setup CoreData.cs), `engine.ts` (tick journalier, ordre GameCore.cs), `production.ts`, `research.ts`, `mining.ts`, `combat.ts`, `travel.ts`, `enemy.ts`, `staff.ts`, `index.ts` (barrel).
- **Validation** : lint 0 erreur, tsc strict 0 erreur, **vitest 42/42** (data 15 + simulation 26 + skeleton), build Vite OK.
- **Mnémo write-back vérifié** : mémoire `b81d4267` (session 5, tags `project:deuteros-web`) — top hit en relecture (protocole §5.4).

**Corrections apportées à la spec (relecture du code, à répercuter sur RESEARCH.md/GAMEPLAY) :**
1. **`ResearchItem(itemType, index, techLevel)`** — la colonne « tech » de la spec §4.2 était en réalité l'**index de recherche** ; le rang requis est le 3e paramètre (derrick : index 2, tech 1 ; pulse_blaster : index 10, tech 3). 31 items recherchables (pas 32).
2. **Ctor `ProductionItem`** : `Production_Value = ResearchValue` (64) et `Production_Complete = 1` au démarrage → **3 wraps effectifs** (pas 4) ; un pod AOC = 6 jours (pas 8). Changer d'item = retour à la charge initiale, pas à zéro.
3. **8e segment = `caesius`** (ortho du remake Enums.cs, pas « césius/cesius » des fans).
4. **Bug générateur corrigé** : mapping noms enum→ids (`paladium`→`palladium`) — CoreData.cs fait foi sur les gisements (Terre 8, Lune 7) ; les carburants MeH/HeD de la matrice oocities sont des artefacts, **jamais minables** (spec §3).
5. **Fréquences de build ennemies** = hex/100 = `[7,10,9,9,9,8,7,7,8]` jours (index = systèmes reconquis).
6. **Défauts `ResearchItem()`** : ResearchValue = 64, multiplier = 64, pct initial = 1 (pas 255) — overrides uniquement s_drive (96/32) et sonic_blaster (16/16).

**Points d'attention :**
- Non implémenté v1 (documenté) : routage MTX → station orbitale, couche vaisseaux/cargo, écrans UI.
- Incohérence marines du remake (GetLevel 10-39/40+ vs GetLevelString 10-29/30+) : tranchée côté design — **GetLevel() unifié** (Captain 10-39, Admiral 40+).
- `planets.json` : 4 corps oocities hors remake (fallback, order 99) — à réconcilier en v2.

**Prochaines étapes (TODO) :**
1. Commiter les tables v1 (data + simulation + tests) après revue.
2. Premier écran : canvas + barre de temps branchée sur `dayTick()` (fin de la Phase 0).
3. Arbitrages §15 restants (transport pods vs tonnes, Hydroïdes, défaite par perte d'infra) — à couvrir dans GAMEPLAY v0.2.

---