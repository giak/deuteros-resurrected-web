# TRACE — Journal de sessions

> Journal chronologique de chaque session de travail sur le projet : ce qui a été fait, décidé, et les prochaines étapes. À compléter après chaque session.

---

## Session 23 — 2026-09-18 (GAMEPLAY v0.2 : arbitrages transport / Hydroïdes / défaite)

- Brainstorming 4 sections validées → spec `docs/superpowers/specs/2026-09-18-gameplay-v0.2-design.md` (commit `e173252`).
- Réécriture `GAMEPLAY.md` v0.2 : ressources 16, transport pods/slots (Navette/IOS/SCG), routage + ACC/AOC, IA Méthanoïde (Prises de position), timeline Hydroïdes + segments, nouveau § Défaite.
- `PFD.md` §3.5/§3.7/§3.8 ; `DATA.md` §1.5/§2 (vessels/VesselRuntime) ; note détection défaite.
- Décision K15 consignée. Sim et data json inchangés (implémentation = EPIC transport/Lune).

---

## Session 22 — 2026-09-18 (CI GitHub Actions : dépôt public + workflow vérification)

**Objectif** : TODO court terme n°2 — installer la non-régression CI (lint, typecheck, tests, build) et créer le dépôt `giak/deuteros-resurrected-web` (public ; le repo était local, sans remote).

**Décision K14** (DECISIONS.md) : périmètre vérif seule (pas de déploiement), lockfile commité (`npm ci`), Node 22 LTS (`engines >=22`), approche A (workflow unique à un job).

**Réalisé** :
- **Blocage résolu** : `@eslint/js ^10.0.1` exigeait un peer eslint `^10` incompatible avec eslint 9.39.5 (typescript-eslint 8 / plugin vitest) → option A validée utilisateur : **`@eslint/js` → `^9.39.5`** (ligne eslint 9), puis lockfile générable.
- `package-lock.json` commité (`6257ea9`) + `engines >=22` ; `.github/workflows/ci.yml` commité (`e7316d4`).
- Dépôt public créé (`gh repo create --source=. --push`) : `main` + tag `v0.0.1` poussés, topics ajoutés.
- **Run CI #1 : SUCCESS** (~45 s, `35306506372`).

**Verification** : `npm ci` ok ; lint 0 ; vitest **111/111** ; build VERT — après passage à @eslint/js 9.

**Prochaines étapes (TODO) :**
1. GAMEPLAY v0.2 : arbitrer transport/Hydroïdes/défaite + répercussion tables v1.
2. Phase 1 MVP : automatisation des relances (réduire la charge manuelle).
3. (Plus tard) branch protection + required status checks ; déploiement Pages sur demande.

---

## Session 21 — 2026-09-18 (clôture v0 : playtest validé + tag `v0.0.1`)

**Objectif** : validation d'usage finale (K10 trace + K11 pause auto + K12 reprise manuelle) puis pose du tag `v0.0.1`.

**Playtest humain** (serveur dev, script Session 19) — **validé** par l'utilisateur (« tout me semble correct ») :
- Démarrage ×1 et trace `[J<n>]` ok ;
- pause auto sur objectif achevé = arrêt net + bannière (K11) ;
- « Fermer (Espace) » **reste en pause**, aucun jour ne s'écoule (K12) ;
- Espace avec bannière = ferme sans relancer ; clic vitesse ×2/×5/×20 = ferme + relance (K12) ;
- Espace hors bannière = toggle 0↔1 intact ; victoire OF Frame ok.

**Verification** : vitest 111/111, lint 0, build VERT (js 82.77 kB) — arbre propre.

**Tag** : `v0.0.1` posé (annoté) sur `2035976` — **clôture v0** 🟢. Docs : DASHBOARD (statut, 57 commits), README, présent journal.

**Prochaines étapes (TODO) :**
1. CI GH Actions (lint, typecheck, tests) — TODO court terme n°2.
2. GAMEPLAY v0.2 : arbitrer transport/Hydroïdes/défaite + répercussion tables v1.
3. Phase 1 MVP : automatisation des relances (réduire la charge manuelle).

---

## Session 20 — 2026-09-18 (recherche sources internes : clone du remake + maj docs)

**Objectif** : inventorier les PDF/docs/git/projets détaillant le fonctionnement interne du jeu (autres remakes inclus).

**Résultat** : **un seul remake public** — `tonyoddspherecom/Deuteros-Resurrected` (Godot/C#), à l'origine du « PC remake in beta » cité par Wikipedia EN. Le repo contient le code complet par écran (CoreData.cs + Production/Research/Training/ShipBay/MTX/ACC/BattleLogic…), `SourceMaterials/Notes.txt` (algo production `/ $321` = /801, AOC = 128, MOON INDEX) et les manuels originaux en PDF (Git LFS). Aucune autre réimplémentation (candidats écartés : `deuteros76.itch.io`, `destec-2026`, `deusXmachina-dev/DEStiny`). Manuel alternatif : archive.org `amiga_games_manual`.

**Réalisé** :
- Clone de référence hors dépôt : `/home/giak/projects/Deuteros-Resurrected` (br. `develop`, HEAD `d252446f`, 2026-09-16, ~31 Mo). Les PDF manuels sont des pointeurs **Git LFS** (pas de `git-lfs` → non téléchargés ; archive.org reste la source primaire S10).
- `docs/DASHBOARD.md` §5 : « remake (C++) » → « Godot / C# » (+ lien manuel archive.org).
- `docs/RESEARCH.md` §16 : ajout des sources **S14** (clone local), **S15** (`Notes.txt`), **S16** (manuels PDF LFS) + complément daté.
- Décision K13 consignée (DECISIONS.md, journal à jour).
- Mémoire : `b85cca89-c254-4aae-995a-226d9399d4fc` (write-back).

**Prochaines étapes (TODO) :** playtest humain K12 (bannière → Fermer reste en pause ; clic vitesse relance), puis clôture v0 (tag `v0.0.1`).

---

## Session 19 — 2026-09-18 (K12 — reprise manuelle après pause auto)

**Objectif** : corriger le comportement de reprise issu du playtest (Session 18) — la pause auto doit être un arrêt net, la reprise un choix explicite de vitesse (spec `docs/superpowers/specs/2026-09-18-pause-reprise-manuelle-design.md`).

**Décision K12** (révise K11) : bouton renommé « Fermer (Espace) » (ferme sans relancer) ; clic ×1..×20 = ferme + relance ; Espace avec bannière = ferme sans relancer ; suppression de `pause.prevSpeed`.

**Réalisé** : `src/ui/app.ts` — `pauseForObjectives` sans capture de vitesse, `resumeAfterPause` → `dismissPauseBanner`, handler Espace mis à jour ; `setSpeed` inchangé (la fermeture sur `index > 0` réalise la reprise par choix de vitesse).

**Verification** : vitest **111/111** (10 fichiers), `npm run lint` 0, `npm run build` VERT.

**Prochaines étapes (TODO) :** playtest humain (bannière → Fermer reste en pause ; clic vitesse relance), puis clôture v0 (tag `v0.0.1`).

---

## Session 18 — 2026-09-18 (Task 12 — clôture v0 : contrat repro, docs, ADR-018)

**Objectif** : clore la v0 (Task 12 du plan « Boucle Terre ») — vérifier le contrat chiffré, consigner les valeurs constatées, finaliser ADR-018 et les docs, préparer le tag `v0.0.1`.

**Contrat C6 (playtest)** — la validation mécanisée remplace/encadre le playtest humain :
- **Repro déterministe** `tests/repro-playtest.test.ts` (6 seeds, stratégie raisonnable scriptée) : victoire **J106–J112**, toutes **≤ J250** (contrat §1). Aucun ajustement de boot requis.
- **Boot retenu** : 1 derrick + 200 production / 250 recherche (CoreData, inchangé) — consigné en spec §6.5 (valeurs constatées).
- **Écart playtest humain** (Session 15) : la stagnation réelle venait de l'absence d'automatisation/signal, pas du moteur. Outils livrés : K10 (trace) + K11 (pause auto sur objectif). **Playtest humain avec ces outils = validation d'usage restante** avant/avec le tag.

**Verification finale** : vitest **111/111 (10 fichiers)** — skeleton 1, data 16, state 4, simulation 30, contracts 4, actions 20, repro-playtest 6, trace 15, integration 2, ui 13 ; `npm run lint` 0 (eslint `src/`), `npm run build` VERT (tsc + vite, js 82.84 kB).

**Docs clôturés** : spec v0 §6.5 (valeurs constatées + boot), ADR-018 (facade — statut Accepté, validé par la clôture), README (statut v0 jouable), DASHBOARD (stats/phase), présent journal.

**Commits du chantier K11 (rappel)** : `86258eb` T1 signal moteur · `d4b1a8a` T2 helpers purs · `edda47b` T3 bannière+pause+docs · `7194d07` fix review finale (fermeture bannière sur vitesse > 0).

**Tag** : `v0.0.1` **en attente de décision** — contrat repro acquis ; playtest humain d'usage recommandé avant de poser le tag.

**Prochaines étapes (TODO) :**
1. Playtest humain réel à ×20 avec trace + pause auto (valider l'usage après K10/K11) — si stagnation persistante, décider boot/gameplay.
2. Post-v0 : CI GH Actions (lint, typecheck, tests), puis Phase 1 MVP.

---

## Session 17 — 2026-09-18 (Pause auto sur objectif actif — K11)

**Objectif** : interrompre l'écoulement du temps dès qu'un objectif productif se termine (recherche achevée, production terminée, formation à échéance) et afficher la bannière « Objectif atteint » jusqu'à la reprise — plan `docs/superpowers/plans/2026-09-18-pause-objectifs.md`.

**Décision K11** (DECISIONS.md) : périmètre recherche+production+formation, retour visuel bannière + bouton reprise, toujours active, approche A (signal pur `trainingFinished`), priorité victoire, reprise à la vitesse d'avant.

**Réalisé (3 tâches) :**
- **T1 — signal moteur** : `DayTickResult.trainingFinished: Array<{ type, count }>` rempli dans le callback `updateTraining` de `dayTick` (+ ligne journal) — commit `86258eb`.
- **T2 — helpers purs** : `completedObjectives` / `shouldAutoPause` dans `src/ui/app.ts` (labels français, 3 signaux agrégés) + tests TDD — commit `d4b1a8a`.
- **T3 — raccordement UI** : état `pause.prevSpeed`, accumulation `pending` dans la boucle `frame` (pause seulement si `!flags['v0_victory']` → priorité victoire), `pauseForObjectives` (bannière `#pause-banner` + bouton `.pause-resume`), `resumeAfterPause` (bannière supprimée + reprise à la vitesse d'avant), Espace sans boucle (bannière visible → reprise ; sinon → toggle), CSS `.pause-banner` (append après `.victory-box p`).

**Écart technique consigné** : `let pending` du plan → `const pending` (eslint `prefer-const`, contrainte liante, précédent K4/K5/K8) — comportement identique.

**Verification finale** : vitest **111/111 (10 fichiers)** — skeleton 1, data 16, state 4, simulation 30, contracts 4, actions 20, repro-playtest 6, trace 15, integration 2, ui 13 ; `npm run lint` 0 (eslint `src/`), `npm run build` VERT (tsc + vite, js 82.76 kB).

**Prochaines étapes (TODO) :**
1. Retour sur task 12 : playtest avec trace + pause auto — comprendre pourquoi la partie réelle stagne, décider de l'ajustement boot/gameplay.
2. Clôture v0 : relecture docs finales, tag `v0.0.1`.

---

## Session 16 — 2026-09-17 (plan trace de session K10 — exécution des 6 tâches)

**Objectif** : exécuter le plan « trace de session » (K10, `docs/superpowers/specs/2026-09-17-trace-session-design.md`) — rendre la boîte noire visible : trace console + buffer (FIFO 3000) des actions joueur (succès + raison d'échec) et du journal journalier du moteur, sans dépendance `simulation → trace`.

**Réalisé (6 tâches, TDD) :**
- **T1 — module `src/trace/`** (`trace.ts` + `index.ts`) : `TRACE_BUFFER_CAP=3000`, `initTrace(seed)`, `traceDay(day, journal)`, `describeActionArgs(args)`, `actionTrace`, `getTrace()`/`clearTrace()`, `window.__TRACE__`. Seul module qui touche `console`, aucun import depuis `src/simulation/`.
- **T2 — retours purs enrichis** : `updateResearch` → `ResearchDayResult { finished, progress, blocked }` ; `updateProduction` → `ProductionDayResult { finished, itemId, value, wraps }` ; `engine.dayTick` adapté.
- **T3 — journal moteur** : `DayTickResult.journal: string[]`, lignes préfixées `[J<jour simulé>]`, ordre des phases GameCore (recherche → production → minage → formation → ennemis → combat).
- **T4 — hook actions** : `runAction(action, state, args, trace?)` — 4e paramètre optionnel : trace succès (`→ ok`) et échecs (`→ échec (raison)` avec `ValidationResult.reason`) ; états bloqués distingués `blocked`/`progress`.
- **T5 — raccordement UI** : `initTrace()` dans `mountApp`, `traceDay(result)` dans la boucle `app.ts` à côté de `pushNews`, hook fourni par les call sites `earth-screen.ts`.
- **T6 — clôture** : présent session (TRACE 16), note d'exécution K10 (DECISIONS.md), dashboard.

**Signatures changées** : `ResearchDayResult`/`ProductionDayResult` (retours purs de `updateResearch`/`updateProduction`), `DayTickResult.journal: string[]` (ordre des phases), `runAction(…, trace?)` (hook injecté).

**Verification finale** : vitest **107/107 (10 fichiers)** — skeleton 1, data 16, state 4, simulation 28, contracts 4, actions 20, trace 15, repro-playtest 6, integration 2, ui 11 ; `bun run lint` 0, `bunx tsc --noEmit` 0, `bun run build` VERT (js 81.39 kB).

**Commits du chantier (ordre)** : `7824e97` T1 module trace · `728f7aa` docs(plans) fix test FIFO · `383452b`+`b3a2d06` T2 retours purs + adaptation engine · `62f94c4` T3 journal moteur · `5c4a79a` T4 hook runAction · `9a40058` T5 raccordement UI · `21e71b5`+`c71d353` fix review finale (group replié via `console.groupCollapsed`, titre test, import) · `ffec602` clôture (docs).

**Fix review finale (whole-branch)** : la spec K10 exigeait un group **replié** ; le plan-implémentation avait livré `console.group` (déplié) — corrigé en `console.groupCollapsed` (`21e71b5`, +1 témoignage test), titre de test « arrêt → itemId derrick » et import `updateMining` inutile (`c71d353`). Re-review approuvé. Minor backlog accepté : lignes formation/ennemis/combat non testées, branche item-absent non testée, `state.day` lu après `execute`, `tsconfig` ne couvre que `src/` (voir suggestions task 12).

**Prochaines étapes (TODO) :**
1. Retour sur task 12 : playtest avec trace — comprendre pourquoi la partie réelle stagne, décider de l'ajustement boot/gameplay.
2. Clôture v0 : relecture docs finales, ADR-018 (facade), tag `v0.0.1`.

---

## Session 15 — 2026-09-17 (diagnostic playtest + brainstrom trace/log)

**Objectif** : comprendre pourquoi le playtest v0 réel (task 12) a échoué (800+ jours à ×20 sans « objectifs atteints »), puis concevoir un outil pour relire une partie.

**Playtest & diagnostic :**
- **Fait établi** : le moteur est sain — repro `tests/repro-playtest.test.ts` sur 6 seeds (42, 123456789, 987654321, 20260917, 7, 31337) → victoire systématique J106-J112 ≤ J250. Le dist était frais (HEAD `e1cd71b`, code victoire présent).
- **Écart observé** : la partie réelle de l'utilisateur ne progresse pas car **rien n'est automatisé** : le joueur doit relancer manuellement recherche, production, installation. Feed réel constaté : formation production → production derrick → recherche derrick → production 1 unité → recherche achevée derrick → formation recherche → derrick installé (total 2) → **plus aucun bulletin**. Le jeu ne rapporte rien entre les grands événements (minage, recherche/production en cours silencieux).
- **Décision utilisateur** : concevoir un **trace/log** pour étudier le fonctionnement du jeu / d'une partie de joueur.

**Brainstorming K10 (skill brainstorming, questions une à une) :**
- Objectif : diagnostiquer un blocage / comprendre une partie (choisi).
- Granularité : actions joueur (résultat + raison) **et** journal journalier complet du moteur.
- Support : **console DevTools + buffer mémoire** (ni panneau, ni export, ni localStorage). Toujours active, buffer FIFO ~3000.
- Format : texte brut, `[J<jour>] …`. Volume à ×20 : tout tracer, `console.group` repliée.
- Approche retenue : **A — trace dédiée `src/trace/` + simulation enrichie par retours purs** (rejeté : B logger callback propagé dans les services — fragilise ADR-002 ; C diff d'état — ne dit pas _pourquoi_). Tracé des actions : **option 1** — logger injecté optionnel dans `runAction`.
- Spec écrite : `docs/superpowers/specs/2026-09-17-trace-session-design.md` ; Décision K10 consignée (DECISIONS.md).

**Prochaines étapes (TODO) :**
1. Écrire le plan d'implémentation (writing-plans) à partir de la spec K10.
2. Exécuter le plan (TDD, tâches) puis clôture : retour sur task 12 (playtest avec trace — voir pourquoi la partie réelle stagne, décider de l'ajustement boot/gameplay), finalisation docs v0 + tag `v0.0.1`.

---

## Session 14 — 2026-09-16 (task 11 du plan v0 — écran de victoire v0, OF Frame)

**Objectif** : détecter la victoire v0 (OF Frame produit) dans la boucle d'affichage — flag unique, bulletin FR, pause, overlay récap (D1).

**Réalisé :**
- **`src/ui/app.ts`** — `checkVictory()` appelé dans `frame` après `if (steps > 0) notify()` (après les ticks) : garde `!flags['v0_victory']` ET `(earth.items['of_frame'] ?? 0) >= 1` → flag, `pushBulletin(st, 'VICTOIRE v0 : OF Frame produit !')`, `setSpeed(0)` (pause + bouton actif), `insertAdjacentHTML` de l'overlay dans `#app` (`victory-overlay`/`victory-box`, bouton inline « Continuer à observer » per brief).
- **Bug de précédence du brief corrigé** (consigne d'exécution) : `builder?.actionsTaken ?? 0 >= 12 ? …` → `?? (0 >= 12)` (boolean si undefined). Remplacé par `const builderActions = … ?? 0` + helper pur. Aucun ternaire emboîté dans le template.
- **`victoryRankLabel(actionsTaken)` exporté de `src/ui/app.ts`** — helper pur testable hors DOM (parade K7) qui réutilise `rankName` de `@/simulation` (`{ type: 'production', count: 0, actionsTaken }`) : pas de re-hardcodage des paliers, `SIM_CONFIG` reste la source unique (≥6 Ingénieur / ≥12 Expert).
- **`src/style.css`** — `.victory-overlay`/`.victory-box` (brief) + `h2`/`p` minimaux.
- **`tests/ui.test.ts`** — bloc « écran de victoire v0 » : `victoryRankLabel` 0/5→Apprenti, 6/11→Ingénieur, 12/30→Expert. TDD : ROUGE (`victoryRankLabel is not a function`) → VERT.
- **Décision K9** consignée (DECISIONS.md).
- **Verification** : vitest **81/81** (8 files, ui.test.ts 11), `bun run lint` 0, `bunx tsc --noEmit` 0, `bun run build` VERT (js 78.91 kB). Aucun `Math.random`/`Date.now` ajouté.
- **Commits** : `feat(ui): écran de victoire v0 (OF Frame)` puis docs — rapport `.git/sdd/task-11-report.md`.

**Verdict** : la condition de victoire v0 (1 OF Frame) est détectée une seule fois en jeu, consignée au bulletin et à l'overlay, partie mise en pause. Overlay non testé en DOM (aucun harnais) : filet = build + helper pur, conformément à la parade K7.

**Prochaines étapes (TODO) :**
1. Task 12 du plan v0 (recette d'interaction DOM) puis clôture v0 (D2/D3 : smoke étendu, docs, tag).
2. Réconcilier le suivi du plan `.git/sdd/` (progress ledger) avec TRACE/DECISIONS.

---

## Session 13 — 2026-09-16 (task 10 du plan v0 — écran Terre : panneaux Recherche, Personnel, Minage)

**Objectif** : deuxième tâche UI — rendre les 3 panneaux restants de l'écran Terre (switch B3-B5), boutons actifs (Sélectionner un projet, Former des producteurs/chercheurs, Installer un derrick).

**Réalisé :**
- **`src/ui/earth-screen.ts`** — renderers `renderResearch`/`renderStaff`/`renderMining` portés verbatim (brief task 10) et branchés au switch (`case 'research'/'staff'/'mining'` ; le default placeholder est supprimé — le switch couvre désormais les 5 onglets). Imports `selectResearch`/`trainStaff`/`installDerrick` de `@/actions`, `RESEARCHABLE_ITEMS`/`rankName`/`SIM_CONFIG` de `@/simulation`. Badges `✔`/`🔒`/`%`, ligne `panel-hint` d'équipe, panneau Personnel (réservoir, effectifs, rangs, formation en cours, boutons 100 prod./rech.), panneau Minage (rows par gisement, derricks actifs/stock, bouton installer désactivé sans derrick en stock).
- **Approved additions (recommandation reviewer task 9)** : helper `esc()` appliqué à **toutes** les interpolations de nœud texte (`renderNews` mis à jour, `shortName`, `resource`, `groundLabel`) ; attributs (`data-research`, `data-queue`) laissés hors esc (ids contrôlés, esc altérerait la sémantique) ; newline de fin de fichier sur `src/ui/earth-screen.ts` et `tests/ui.test.ts`.
- **Écart vs brief consigné (K8)** : l'import `getLevel` du brief était **inutilisé** (les renderers n'utilisent que `rankName`) → retiré pour tsc `noUnusedLocals`/lint (précédent K4/K5) ; `it.techLevel!` dans `researchRows` assumé — le prédicat de `RESEARCHABLE_ITEMS` (data.ts) exige `techLevel`, l'assertion est fondée sur le contrat de données (même type de justification que `researchTeam!`).
- **Smoke hors DOM** — `tests/ui.test.ts` étendu (recette Task 12 toujours inexistante, parade K7) : helpers purs exportés `researchRows`/`staffRows`/`miningRows` miroirs des renderers DOM. Recherche : 31 items couverts, bouton Sélectionner seulement si débloqué ET non recherché, projet courant signalé ; Personnel : réservoir 5 550, équipes de boot (200 Apprenti / 250 Technicien), rang dérivé des actions (6 → Docteur), repli `—` quand une équipe est absente ; Minage : 8 gisements, statut « à sonder » au boot, libellés sol/sondage et stock reflétés après mutation.
- **`src/style.css`** — `.panel-hint` ajouté (brief) + `.panel-table tr.current td` minimal pour le projet de recherche courant (la classe `current` était déjà émise par le renderer).
- **Verdict K8 dans DECISIONS.md** — helper esc + helpers purs testables + retrait `getLevel` inutilisé (précédent K4/K5).
- **Verification** : vitest **80/80** (8 files, ui.test.ts 10), `bun run lint` 0, `bunx tsc --noEmit` 0, `bun run build` VERT (bundle 78.1 kB js). Aucun `Math.random`/`Date.now` ajouté (UI pure).
- **Commits** : `feat(ui): panneaux recherche, personnel, minage` puis docs — rapport `.git/sdd/task-10-report.md`.

**Verdict** : B3 (recherche), B4 (personnel) et B5 (minage) livrés — l'écran Terre (B1-B5) est complet. Le clic DOM réel reste couvert par la recette Task 12 (inexistante) ; le filet se compose ici du build + helpers purs.

**Prochaines étapes (TODO) :**
1. Tasks 11+ du plan v0 (R&D restante hors écran Terre ; la recette d'interaction DOM Task 12 écrire).
2. Réconcilier le suivi du plan `.git/sdd/` (progress ledger) avec TRACE/DECISIONS.

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