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

## ADR-007 — IoC par conteneur (tsyringe) — RÉVOQUÉ 2026-09-16

**Contexte** : remplacé par ADR-013 (Pure DI / Composition Root manuelle) après audit antagoniste. L'audit a établi : esbuild (Vite/Vitest) ne supporte pas `emitDecoratorMetadata` (tsyringe #29/#240/#180, esbuild #257) → transpileur obligatoire ; maintenance 0/10 (deps.dev, issues #246/#248) ; pour ~4 adapters, un conteneur = factory manuelle + polyfill + flags tsconfig globaux, sans bénéfice.
**Remplacement** : voir ADR-013.

---

## ADR-008 — Cœur de simulation en ECS pur — RÉVOQUÉ 2026-09-16

**Contexte** : remplacé par ADR-014 (records + services par domaine) après audit antagoniste. L'audit a établi un consensus unanime : sous ~500 entités hétérogènes, l'ECS n'apporte aucun gain ; `Record<ComponentType, Map<EntityId, unknown>>` = indirection pure sans localité mémoire (pire des deux mondes) ; frictions avec ADR-011 (mutabilité vs Result), ADR-006/010 (sérialisation).
**Remplacement** : voir ADR-014.

---

## ADR-009 — Scheduler de tick : ordre original + listes configurables (approuvé 2026-09-16)

**Contexte** : avec un cœur ECS (ADR-008), l'ordre d'exécution des systèmes à chaque tick conditionne les résultats (un système voit les mutations du précédent).

**Options** :
1. Ordre original exact codé en dur (Research → Production → UpdateShips → BuildDrones → MTX → Navigation → Combat)
2. Ordre réorganisé par dépendances
3. **Ordre original comme référence + scheduler configurable** (listes de systèmes dans `simulation/config.ts`)

**Choix** : **Option 3.**

**Conséquences** :
- Le moteur énumère des **phases ordonnées** (`tickPhases` dans `SIM_CONFIG`) : chaque phase exécute les systèmes attachés (un système par domaine, cf. ADR-008 mitigation).
- L'ordre par défaut reproduit le remake ; le re-cadrage se fait en config, sans toucher au code.
- La config est testable : un test matérialise l'ordre attendu (oracle = état de référence du remake pour un scénario donné) et échoue si un développeur change l'ordre accidentellement.
- Un système peut être activé/désactivé en config (ex. `combat.disabled` pour un mode debug/scénario).

---

## ADR-010 — Validation runtime : zod aux frontières uniquement (approuvé 2026-09-16)

**Contexte** : où placer la validation runtime (zod) sans surcoût.

**Options** :
1. **Zod aux frontières uniquement** (save JSON, events.json — données externes non fiables)
2. Zod frontières + data/*.json statique
3. Zod partout (chaque composant/entité)

**Choix** : **Option 1.**

**Conséquences** :
- Les entrées externes (flash de sauvegarde chargée, JSON scénario/événements) passent par `safeParse` → rejet propre avant d'entrer dans la sim.
- Le monde ECS interne **n'est pas schématisé à chaud** : TS encapsule l'accès ; une fois construit par les seuls systèmes, il est « trusted ».
- Le boot valide quand même `data/*.json` (ADR-005 le débant déjà) via **un** schéma par fichier — pas de validation hot-path.
- `zod` reste une dépendance petite (2 kb core) — export **uniquement** vers `src/validation/` + le module save.

---

## ADR-011 — Erreurs : Result + crash-loud + Error Boundary (approuvé 2026-09-16)

**Contexte** : la recherche (ARCHITECTURE_RESEARCH.md §4) distingue erreurs de domaine prédictibles vs bugs internes.

**Options** :
1. **Result (neverthrow) pour erreurs domaine ; throw (crash-loud) pour bugs internes ; Error Boundary UI
2. Idem + monitoring (beacon/log)
3. Rollback de tick + UI survit (masque les vrais bugs)**

**Choix** : **Option 1.**

**Conséquences** :
- **Erreurs domaine** (pas assez de ressources, tech manquante, staff inqualifié, interdiction début …) → retournent un `Result` typé (`Ok(état)` / `Err(DomainError)`). L'UI les affiche comme un message joueur, jamais une exception.
- **Bugs internes / invariants violés** (driver, corruption ECS, algo hors bornes) → `throw` immédiat (crash-loud) : mieux vaut un crash explicite qu'un état corrompu silencieux.
- **Error Boundary** : les exceptions remontées hors sim sont captées par un conteneur UI qui affiche un écran « une erreur interne est survenue — votre partie est intacte sauvegardée », avec bouton **Recharger la dernière sauvegarde**.
- Le save étant versionné (ADR-006) et l'état externe validé au chargement (ADR-010), l'état affiché au crash reste récupérable.
- Non retenu : monitoring prod (v1 — YAGNI ; console + Error Boundary suffisent), rollback de tick (masque les bugs, contredit le déterminisme ADR-002).

---

## ADR-012 — Configuration : `simulation/config.ts` chargée au boot + injection (approuvé 2026-09-16)

**Contexte** : où vivent `SIM_CONFIG` et `tickPhases` (ADR-009) pour permettre le re-équilibrage sans toucher au code.

**Options** :
1. **`src/simulation/config.ts`, chargée au boot, injectée (tsyringe) comme singleton dans les systèmes ECS**
2. `data/config.json` dès v1 (moddable)
3. Hybride (valères par défaut TS, surcharge JSON en Phase 2)

**Choix** : **Option 1.**

**Conséquences** :
- **Un seul module** `config.ts` exporte un objet `SIM_CONFIG` immutable (type rebalancé) : valeurs /801, wrap 255, AOC=128, derrick rates, staff caps, enemy freqs, PTL=100, + `tickPhases`.
- Chargé **une fois au boot** par le Composition Root (tsyringe) ; injecté dans les systèmes qui le déclarent (ctor injection, jamais d'accès global).
- Le scheduler (`tickPhases`) et les systèmes économiques/réflexions lisent cette injection → le rebalancing est un changement de config, pas de code.
- Le modding via JSON statique reste ouvert (ADR-005) comme future surcharge, non décidée en v1.
- Tests : transmettre des configs de test différentes (ex. AOC désactivé, PAS de wrap) via injection → comportement vérifiable par unit/integration.

## ADR-013 — IoC : pure DI / Composition Root manuelle (approuvé 2026-09-16, remplace ADR-007)

**Contexte** : l'audit antagoniste #3 a infirmé tsyringe (esbuild/Vitest incompatibles avec `emitDecoratorMetadata`, maintenance morte) et la recherche §4 recommandait pure DI pour ~20 objets.

**Choix** : **Composition Root manuelle dans `main.ts`** — une factory typée (`createGame(seed)`) construit le graphe par `new`/injection, aucun conteneur.

**Conséquences** :
- Zéro dépendance DI, zéro flag tsconfig expérimental, zéro failure runtime (défauts de câblage = erreurs de compilation).
- Ctor injection conservée ; Service Locator interdit hors du CR.
- Le besoin réel est ~4 adapters + config + moteur : ~60 lignes de composition, typées et parseables.

---

## ADR-014 — Cœur de simulation : records + services par domaine (approuvé 2026-09-16, remplace ADR-008)

**Contexte** : l'audit antagoniste #2 a montré qu'un ECS pur formel n'apporte aucun gain sous ~500 entités hétérogènes et crée de l'indirection (Map<EntityId, unknown>).

**Choix** : **entités = records (POJO) typés, services par domaine** opérant dans l'ordre `tickPhases` (ADR-009). La logique reste découplée de la donnée mais sans registre générique.

**Conséquences** :
- Sérialisation native (DTO = records), déterminisme direct (ADR-002), `Result` cohérent (ADR-011) — les frictions ECS disparaissent.
- Tick journalier ordonné par phases (scheduler ADR-009 intact).
- Réversibilité : si un profiling révèle un hot-path un jour, migrer un sous-domaine en ECS ciblé sans réécrire le cœur.

---

## ADR-015 — Erreurs : union discriminée maison + crash-loud + Error Boundary (approuvé 2026-09-16, amende ADR-011)

**Contexte** : l'audit antagoniste #4 a validé la taxonomie 3 classes mais rejeté neverthrow (lib inadaptée à un monolithe clos, auteur lui-même dit « don't take it literally »).

**Choix** :
- Erreurs domaine → **union discriminée maison** `type ActionResult = { ok: true; world: World } | { ok: false; reason: DomainReason }` (~20 lignes, zéro dépendance), **restreinte à la couche actions joueur** (jamais dans les services de tick → aucun flow conditionnel en plein tick).
- Validation externe → **zod aux frontières** (ADR-010 intact).
- Bugs internes → **crash-loud** : exceptions + `assert` d'invariants (≥ 2/fonction sur les mutateurs), arrêt du tick à la première erreur, capture `window.onerror`/`unhandledrejection` → **Error Boundary UI**.

**Conséquences** :
- Plus de neverthrow ni eslint-plugin ; union native TS, exhaustivité par `never`.
- `validate-then-mutate` obligatoire pour honorer « monde inchangé sur erreur ».
- La promesse « partie intacte » exige un **autosave périodique + double slot** (anti-corruption, cf. recommandation Horizon OS) — à porter au plan d'implémentation.

---

## ADR-016 — Driver de tick : accumulateur à cap + budget (approuvé 2026-09-16, amende ADR-009/012)

**Contexte** : l'audit antagoniste #5 a montré qu'un `setInterval` selon l'échelle (Pause/x1/x8/x32) produit la « spiral of death » sans cap à 32× (Gaffer, Unity, Bevy #8544) et que rAF est suspendu dans un onglet caché.

**Choix** : **accumulateur à cap** — le driver accumule des jours (`lag`), avance `while (lag ≥ 1 && n < MAX_TICKS_PER_FRAME) runTick()`, et **n'abandonne jamais en rattrapage** (surplus non simulé). `MAX_TICKS_PER_FRAME` adaptatif (budget sim/frame mesuré, plancher 3-4, plafond 64) ; suspension sur `document.hidden` (réarmement sans backlog) ; le rendu rAF reste découplé avec **interpolation de présentation seule** (jamais d'état simulé).

**Conséquences** :
- Les échelles sont des **plafonds de débit** (comportement Stellaris/Factorio) : x32 « ralentit gracieusement » au-delà de la capacité machine, jamais de spirale.
- Multiplicateur = **nombre de ticks par run**, jamais un `dt` agrandi (protège /801, wrap, déterminisme sérialisé).
- Budget sim exposé (`SIM_BUDGET_MS`), mesuré par performance counters, couvert par un test de driver simulé (stall 2 s, onglet caché, x32 → assert « jamais > N ticks consécutifs » + état golden).

---

## ADR-017 — Tests : double-run + scénarios, fast-check ciblé (approuvé 2026-09-16, amende §8 spec)

**Contexte** : l'audit antagoniste #6 a montré que un golden full-state fige aussi des bugs, contredit ADR-012 (rebalance = tripwire à `-u` aveugle) et que la « pyramide » n'existe pas quand tout tourne headless au même coût.

**Choix** :
- **Déterminisme** → **double-run** : `worldOf(seed).afterTicks(N)` deux fois → `expect.deepEqual` (preuve directe d'ADR-002, zéro fichier).
- **Correctness** → **scénarios E2E scriptés** (record/replay d'actions joueur, assertions sur jalons comportementaux : production cumulée, vaisseau arrivé, défaite par perte d'infra).
- **Number crunching** → **fast-check ciblé** sur les fonctions pures numériques (/801, wrap, ratios combat) avec **propriétés différentielles** (oracle à forme fermée), pas sur le monde entier.
- **Intégration save** → conservée (fixture versionné → migrate → re-tick → état conforme).
- **Adapters** → smoke réel (fake-indexeddb pour IndexedDB), pas de « contrat vs fake maison ».

**Conséquences** :
- ~60 % de la pyramide précédente éliminée (?golden full-state, contrat-adapter) ; déterminisme = test le moins cher du projet au lieu du plus fragile.

---

## ADR-018 — Facade d'actions : seule porte de mutation (Accepté — approuvé 2026-09-16, validé à la clôture v0 2026-09-18)

**Contexte** : le v0 « Boucle Terre » a besoin de canaliser toutes les mutations du jeu. Le moteur tables-v1 est **mutable** (décision documentée, tests verts) ; l'UI ne doit jamais écrire directement dans `GameState`.

**Choix** : **couche `src/actions/`** = unique porte d'entrée des mutations. Chaque action suit un contrat minimal `validate`/`execute`, exécutée par `runAction` qui fait `validate → execute → notify()`.

```ts
type ValidationResult = { ok: true } | { ok: false; reason: string };
interface Action<TArgs = void> {
  validate(state: GameState, args: TArgs): ValidationResult;
  execute(state: GameState, args: TArgs): void;
}
```

**Conséquences** :
- **ADR-013 (pure DI)** : les actions sont des objets/objets sans état ; la Composition Root les construit avec `(state, config)`.
- **ADR-014 (records+services)** : la facade contient les services ; `engine.ts` (tick journalier) reste la frontière temporelle, pas la porte d'interaction.
- **ADR-015 (union maison)** : `validate` retourne une union discriminée `{ ok } | { ok: false, reason }` (pas d'exceptions pour les refus joueur).
- **Correspondance spec v0 §3** : le plan « Boucle Terre » désignait cette décision « ADR-007 (à écrire) » — **renumérotée ADR-018** pour éviter tout conflit avec l'ADR-007 révoqué (tsyringe).
- Déviation assumée du plan : les actions `assignFactoryTeam`/`assignResearchTeam` sont coupées (YAGNI) — équipes pré-assignées au boot.

---

## Recension antagoniste — architecture Clean + Hexagonal (2026-09-16)

Recensement contradictoire indépendant du choix « Clean + Hexagonal (4 couches) + tsyringe » (ADR-007/008 et spec architecture). Verdict antagoniste : **AMENDER**.

- **Garder** : cœur de simulation pur sans DOM, tick pur et déterministe (ADR-002), zod aux frontières (ADR-010), Result pour le domaine (ADR-011), tests golden/contract.
- **Retirer** : conteneur tsyringe + reflect-metadata → composition root **manuelle** (la propre recherche ARCHITECTURE_RESEARCH.md §4 recommandait déjà pure DI) ; ports/adapters formels (IPrng, IClock, IPersistence) tant qu'une seule implémentation existe (seed déjà passé en paramètre, ADR-002) ; passage 4 couches → séparation en 2 modules (cœur pur + UI).
- **Réexaminer** : ECS pur pour ~160 corps. Le regroupement par domaine (ADR-008 mitigation) dégénère en « domain services sur store typé » — c'est-à-dire l'option 1 que la recherche recommandait.

Détail + sources (URLs) : `docs/superpowers/recensions/2026-09-16-antagonist-report.md` (mémoire MnemoLite `7d61294a-843c-420d-8b15-9fe4bb1efe25`).

---

## Décisions en attente

- Faut-il un écran de tuto in-game dans le MVP ? (probablement out, onboarding par tooltips)
- Multi-slots de sauvegarde automatisés vs unique « dernière partie » ? (tranche en Phase 2)
- Style visuel exact des écrans (palette, typo) — décision art, en Phase 5.

---

## K4 — Garde `ITEM_BY_ID` avant `canSelect` dans `selectResearch.validate` (approuvé 2026-09-16)

**Contexte** : le brief task 4 (`.git/sdd/task-4-brief.md`) appelait `canSelect(state.research, itemId)` en tête de `validate`. Pour un itemId inconnu (`'chaise'`), `canSelect` → `getItem` **lève** (« Item inconnu ») : le test attendu `{ ok: false, reason: 'not_researchable' }` aurait crashé le plan.

**Choix** : garde défensive avant l'appel — `if (!ITEM_BY_ID[itemId]) return { ok: false, reason: 'not_researchable' };` (`ITEM_BY_ID` exporté par `@/simulation/data`). Le reste de l'implémentation du brief est verbatim.

**Conséquences** :
- `not_researchable` couvre maintenant les deux cas « n'est pas un item » et « item sans progression ».
- Aucun chemin ne fait lever `getItem` depuis les actions : les exceptions restent internes au moteur (ADR-015 : pas d'exceptions pour les refus joueur).
- Écart technique : l'import `GameState` du brief, inutilisé, a été retiré pour satisfaire tsc strict/lint (contraintes liantes du plan).

---

## K5 — `trainStaff` : ordre de validate du brief + retrait d'import inutilisé (approuvé 2026-09-16)

**Contexte** : le brief task 5 (`.git/sdd/task-5-brief.md`) définit l'ordre de `validate` de `trainStaff` : `invalid_count` → `capacity_exceeded` → `other_type_training` → `insufficient_reservoir`. Les tests assertent les raisons exactes ; `canTrain` seul ne peut pas distinguer ces 3 refus.

**Choix** : implémentation verbatim du brief (raisons exactes, bulletin FR `Formation ${type} : ${count} recrues (24 j).`), avec le trade-off assumé : la branche `insufficient_reservoir` est **inatteignable** en l'état du moteur (`canTrain` borne `count ≤ reservoir`, donc valider après `canTrain` la rend morte ; invoquer `canTrain` en sens inverse brouillerait la raison `other_type_training`). Conservée — le contrat du brief prime, à réviser si `canTrain` change.

**Écart technique** : l'import `GameState` du brief, inutilisé, retiré (tsc strict `noUnusedLocals` + lint) — même précédent que K4.

**Conséquences** :
- `capacity_exceeded`/`other_type_training`/`invalid_count` couverts par les tests du brief ; `insufficient_reservoir` couvert par le code mais non exercé (raison réservée au futur).

---

## K6 — Test boucle intégrée : correction d'ordonnancement du brief (approuvé 2026-09-16)

**Contexte** : le brief task 8 (`.git/sdd/task-8-brief.md`) fournit le code du scénario boucle Terre (C5). Exécuté verbatim, le test ROUGE immédiatement : `runGame(42, 300).victory === false` — l'OF Frame n'est **jamais produit**, même à J300. Diagnostics (instrumentation) : recherche de_frame terminée à **J58** (ressources `55 Fe + 80 Ti + 50 Al + 25 C + 40 Cu` disponibles dès ~J60, stocks 65/66/76/73/80 à J67), donc ni le moteur ni la balance ne sont en cause.

**Cause racine (analyse)** : deux lignes dans cet ordre à chaque jour —
1. `if (!earth.factory.currentItemId) runAction(queueItem, s, { itemId: 'derrick' });` → remplit l'usine dès qu'elle est libre ;
2. bascule OF Frame conditionnée par `!earth.factory.currentItemId` → **jamais satisfaite** : le derrick est re-filé en priorité à chaque libération d'usine, la bascule OF Frame ne peut jamais se déclencher.

Ajuster l'état de boot (Step 2 du brief, ex. 2 derricks) n'aurait **rien changé** : le blocage est structurel dans l'ordonnancement du scénario, pas un problème de cadence de minage.

**Choix** : correction **test-only, minimale** — inversion des deux blocs (bascule OF Frame évaluée **avant** la file de derrick par défaut). Aucune assertion modifiée, aucune ligne du moteur touchée (contrainte « zéro changement prod » respectée). Le contrat C5 devient : victoire **J91–J112** selon seed (42 → J112), **déterministe** (double-run strict), invariants (stocks ≤ 50 000, builder non-null sur 250 ticks) vérifiés.

**Écart technique** : fichier nommé `tests/integration.test.ts` (consigne d'exécution de la task) alors que le brief/plan écrivaient `tests/loop.test.ts` — une seule différence de nommage, contenu « verbatim corrigé ».

**Conséquences** :
- C5 validé : boucle Terre intégrée (research → derricks → install → OF Frame) jouable et déterministe ; le playtest C6 « ajustement boot » du brief n'est **pas nécessaire** pour ce symptôme (rien à rebilanter).
- Le test verrouille la stratégie de référence qui gagne ≤ J250 — si les formules de production/minage changent, il régresse la balance (rôle de garde C5).

---

## K7 — Écran Terre (task 9) : GROUND_ITEMS sans gate de catégorie + smoke UI hors DOM (approuvé 2026-09-16)

**Contexte (correction pré-flight K3)** : le filtre du brief `(i) => i.inputs && !i.orbitOnly && i.category === 'item'` excluait `meh_fuel` (category `resource`) → **8 items**, en contradiction avec le commentaire et le test du brief qui attendent **9** (les 8 tech-1 + a_c_c tech-3). Vérifié sur `data/items.json`.

**Choix** : filtre **sans gate de catégorie** — `(i) => i.inputs && !i.orbitOnly`. Résultat exact `[derrick, s_chassis, s_drive, meh_fuel, of_frame, supply_pod, tool_pod, cryo_pod, a_c_c]` (9). Ce filtre est **équivalent** à la variante « Interfaces » du brief (`category !== 'hidden' && !orbitOnly && inputs && id !== 'hed_fuel'`) : les items `hidden` n'ont jamais d'inputs et `hed_fuel` est `orbitOnly` → gardes redondantes retirées.

**Smoke test Step 4 (recette Task 12 inexistante)** : parade approuvée en pré-flight — validation par `bun run build` + `bunx tsc --noEmit` + nouveau `tests/ui.test.ts` exerçant les **helpers purs hors DOM** de `src/ui/earth-screen.ts`, au lieu du clic DOM de la recette Task 12. Concrètement `renderProduction` délègue à un helper pur exporté `productionRows(state)` (9 lignes = l'ensemble affiché du tableau) ; la logique de disponibilité (`disabled` selon les stocks) et le set des 9 items sont couverts par les tests.

**Conséquences** :
- `GROUND_ITEMS` exporté par `@/simulation/data` **et** par le barrel `@/simulation` ; test data `toHaveLength(9)` + smoke UI couvrent la liste exacte.
- `app.ts` : `setupSidebar`/`bodyDotColor` et la section statique Bulletins supprimés (l'onglet news rend le fil) ; le double-rendu `#news-feed` de `updateHud` retiré (le node n'existe plus, éviter un rendu concurrent). Canvas/contrôles/boucle hors périmètre conservés intacts.
- Accessibilité légère (contrainte globale) : `nav[aria-label]`, onglets `aria-pressed`, boutons Produire/Annuler avec `aria-label`. Pas de `role=tablist` (imposerait la navigation clavier tablist, YAGNI en task 9).
- CSS : bloc du brief étendu de façon minime (`.panel-table th`, `.queue-line strong`, `.hud-btn:disabled`, `flex-wrap`) ; bloc « Liste des corps » retiré (mort après suppression de `setupSidebar`).
- `renderProduction` reste exporté (exigence de testabilité du brief) ; `render`/`mountEarthScreen` restent branchés sur `document`.

---

## K8 — Panneaux Recherche/Personnel/Minage (task 10) : esc() sur les nœuds texte + helpers purs miroirs (approuvé 2026-09-16)

**Contexte** : la task 10 porte les 3 renderers restants de l'écran Terre. La revue de la task 9 avait recommandé d'introduire un helper `esc()` avant toute nouvelle interpolation `innerHTML` (`newsFeed` + rows).

**Choix** :
- Helper `esc()` dans `src/ui/earth-screen.ts`, appliqué à **toutes** les interpolations de nœud texte : `renderNews` (contenu des bulletins, opaque), `renderResearch` (`shortName`), `renderMining` (`resource`, `groundLabel`). **Non appliqué aux attributs** (`data-research`, `data-queue`) : ids contrôlés par `items.json`, une échappade altérerait la sémantique (pas de changement de comportement attendu).
- **Écart vs brief** : l'import `getLevel` (brief task 10) était inutilisé — les renderers n'appellent que `rankName` → retiré pour tsc `noUnusedLocals`/lint (précédent K4/K5).
- **`it.techLevel!`** dans `researchRows` : `RESEARCHABLE_ITEMS` est annoté `ItemDef[]` (data.ts) donc `techLevel?: number` côté consommateur, mais le prédicat de construction **exige** `techLevel` pour les 31 items → assertion fondée sur le contrat de données (même justification que `researchTeam!` du brief, boot pré-assigné).
- **Smoke hors DOM** (parade K7, recette Task 12 inexistante) : helpers purs exportés `researchRows`/`staffRows`/`miningRows` **miroirs des renderers DOM** (les renderers les consomment, DRY) → le filet couvre la logique affichée sans `document`.

**Conséquences** :
- Les 3 panneaux sont testés DOM-free (31 items, sélectionnable seulement si débloqué ET non recherché, rangs dérivés, repli d'équipe absente, gisements/stock).
- `.panel-hint` ajouté au CSS ; `.panel-table tr.current td` minimal (la classe `current` était déjà émise, sans effet visuel sinon).
- Newline de fin de fichier sur `earth-screen.ts`/`ui.test.ts` (recommandation reviewer task 9).

---

## K9 — Écran de victoire v0 (task 11) : rang réutilisé via `rankName` + helper pur exporté (approuvé 2026-09-16)

**Contexte** : le brief task 11 (`.git/sdd/task-11-brief.md`) contient un bug d'opérateur dans la ligne « Équipe production » du box : `...builder?.actionsTaken ?? 0 >= 12 ? ...` — `>=` lie plus fort que `??`, produisant `actionsTaken ?? (0 >= 12)` (boolean si `undefined`, nombre sinon) → erreur de clé/type. La consigne d'exécution impose une correction : parenthèses explicites, paliers 12/6 non durcis ailleurs que le config.

**Choix** :
- **Correction de précédence** : `const b = earth.factory.builder?.actionsTaken ?? 0` puis interpolation de `b` et d'une chaîne de rang dérivée — plus aucun ternaire emboîté dans le template.
- **Rang en réutilisant `rankName` de la simulation** (DRY, pas de re-hardcodage) : le seuil production de `SIM_CONFIG.STAFF_RANK_THRESHOLDS` est déjà `≥6 Ingénieur / ≥12 Expert`, identique aux paliers du brief. Helper pur `victoryRankLabel(actionsTaken)` exporté de `src/ui/app.ts` (miroir du rendu, testable hors DOM — parade K7, recette Task 12 inexistante) ; `rankName` accepte n'importe quel objet `Staff`, on construit un `{ type: 'production', count: 0, actionsTaken }`.
- **Détection** : `checkVictory()` appelé dans `frame` après `if (steps > 0) notify()` — garde `flags['v0_victory']` (une seule occurrence), condition `(earth.items['of_frame'] ?? 0) >= 1`, puis flag + `pushBulletin` (message exact du brief) + `setSpeed(0)` (pause) + `insertAdjacentHTML` de l'overlay dans `#app`. Bouton inline `onclick` per brief.
- **CSS** : `.victory-overlay`/`.victory-box` du brief + `h2`/`p` minimaux (cohérence hud, précédent K7/K8).

**Conséquences** :
- `tests/ui.test.ts` : bloc « écran de victoire v0 » assertant `victoryRankLabel` — 12→Expert, 6-11→Ingénieur, sinon Apprenti (TDD : test ROUGE `not a function` puis VERT).
- Vitest **81/81** (ui.test.ts 11), lint 0, `tsc --noEmit` 0, build VERT (js 78.91 kB). Aucun `Math.random`/`Date.now` ajouté.
- Overlay non testé en DOM (aucun harnais DOM dans le projet) — couvert par le build + le helper pur (précédent K7).

---

## K10 — Trace de session : journal texte brut (actions + moteur) pour diagnostic (approuvé 2026-09-17)

**Contexte** : playtest v0 réel (task 12 — 800+ jours à ×20 sans victoire) : le jeu ne rapporte rien entre les grands événements et aucune trace ne permet de relire une partie. Le moteur est prouvé sain (repro 6 seeds → victoire J106-112) : l'écart est humain (le joueur doit tout relancer manuellement). Besoin : rendre la **boîte noire visible** pour diagnostiquer un blocage / comprendre une partie.

**Brainstorming complété** (questions utilisateur une à une) :

| Décision | Choix |
|---|---|
| Objectif | Diagnostiquer un blocage / comprendre une partie |
| Granularité | Actions joueur (résultat + raison) **et** journal journalier du moteur |
| Support | Console DevTools + buffer mémoire (pas de panneau in-game, pas d'export, pas de localStorage) |
| Activation | Toujours active ; buffer FIFO plafonné (~3000 lignes) |
| Format | Texte brut lisible, préfixé `[J<jour>]` |
| Échecs | Tracés avec la raison exacte (`ValidationResult.reason`) |
| Volume à ×20 | Tout tracer ; `console.group` replié par jour |
| Approche | **A — trace dédiée** (`src/trace/`) + simulation enrichie par retours purs (ADR-002 préservé : la simulation *retourne* les lignes, n'écrit jamais à la console) |
| Tracé des actions | **Option 1** — logger injecté en option dans `runAction` (4e paramètre, unique point de vérité) |

**Choix techniques (spec `docs/superpowers/specs/2026-09-17-trace-session-design.md`)** :
- **`src/trace/trace.ts`** — seul code qui touche `console` : `traceBuffer` FIFO 3000, `traceDay` (group replié par jour), `traceActionLine`, `getTrace`/`clearTrace`, `window.__TRACE__`. Aucun import depuis `src/simulation/`.
- **Simulation pure enrichie** : `updateResearch` → `ResearchDayResult { finished, progress, blocked }` ; `updateProduction` → `ProductionDayResult { finished, itemId, value, wraps }` ; `dayTick` agrège tout dans `DayTickResult.journal: string[]` dans l'ordre des phases GameCore. `updateMining`/`updateEnemyBuild`/`updateTraining` inchangés (retours déjà suffisants, formatage dans `engine`).
- **`runAction(action, state, args, trace?)`** — 4e paramètre optionnel : trace succès (`→ ok`) et échecs (`→ échec (raison)`) ; paramètre optionnel → tests et call sites existants inchangés. Pas de dépendance `actions → trace` (hook injecté).
- **Raccordement** : `traceDay(result)` dans la boucle `app.ts` à côté de `pushNews` ; hook fourni par les call sites UI (`earth-screen.ts`) ; `initTrace()` dans `mountApp`.
- **Tests** : moteur pur (journal ordonné, valeurs exactes), actions + hook (ok/échec raison, rien sans hook), trace (group ouvre/écrit/ferme, FIFO au-delà de 3000, getTrace copie), smoke UI inchangé.

**Hors périmètre** : panneau in-game, export fichier, localStorage, replay, persistance save (la trace ne fait pas partie de `GameState`), rétro-action, événements de navigation UI.

**Conséquences** :
- Spec écrite : `docs/superpowers/specs/2026-09-17-trace-session-design.md` — non commitée à ce stade (plan à écrire).
- La trace durera toute la session DevTools (volume ×20 géré par group replié + FIFO).

**Exécution (plan 2026-09-17-trace-session)** :
- Spec + plan commités (`3e3105f`, `6bbc4a2`) puis exécutés en 6 tâches TDD ; commits du chantier : `7824e97` (module trace) · `728f7aa` (fix test FIFO) · `383452b`+`b3a2d06` (retours purs + adaptation engine) · `62f94c4` (journal moteur) · `5c4a79a` (hook runAction) · `9a40058` (raccordement UI) · `21e71b5`+`c71d353` (fix review finale) + commit docs de clôture.
- **`src/trace/`** livré tel que spécifié : `TRACE_BUFFER_CAP=3000`, `initTrace(seed)`, `traceDay(day, journal)`, `describeActionArgs(args)`, `actionTrace`, `getTrace()`/`clearTrace()`, `window.__TRACE__` — seul module qui touche `console`, zéro import `simulation → trace`.
- **Retours purs enrichis** : `updateResearch` → `ResearchDayResult { finished, progress, blocked }` ; `updateProduction` → `ProductionDayResult { finished, itemId, value, wraps }` (ADR-002 préservé : la simulation *retourne* les lignes, n'écrit jamais à la console).
- **Journal moteur** : `DayTickResult.journal: string[]` agrégé dans l'ordre des phases GameCore, lignes préfixées **`[J<jour simulé>]`**.
- **`runAction(action, state, args, trace?)`** — 4e paramètre optionnel confirmé : succès `→ ok`, échecs `→ échec (raison)` ; tests et call sites existants inchangés (pas de dépendance `actions → trace`).
- **États bloqués** : distinction **`blocked`/`progress`** (recherche : `… — bloquée.` ; production : `… → bloquée (pas d'équipe).`).
- **Raccordement** : `initTrace()` dans `mountApp`, `traceDay` dans la boucle `app.ts`, hook fourni par les call sites `earth-screen.ts`.
- Volume ×20 : group **replié** par jour via `console.groupCollapsed` (retour review finale — `console.group` déplié ne répondait pas à l'intention K10 ; corrigé `21e71b5`).
- **Verification** : vitest **107/107 (10 fichiers)**, `bun run lint` 0, `bunx tsc --noEmit` 0, `bun run build` VERT.
- Hors périmètre respecté : pas de panneau in-game / export / localStorage / replay ; sondages non tracés (`updateMining` ne les expose pas — conservé « peut », hors périmètre d'exécution).

---

## Décision K11 — Pause auto sur objectif actif (recherche, production, formation) (approuvé 2026-09-18)

**Contexte** : en v0, une recherche achevée, une production terminée ou une formation à échéance passent silencieusement — le joueur doit surveiller le feed et tout relancer à la main. La trace (K10) a rendu la boîte noire visible ; on veut maintenant **interrompre l'écoulement du temps dès qu'un objectif productif se termine** et l'afficher.

**Choix** :
- **Périmètre** : recherche achevée + production terminée + formation à échéance (les 3 objectifs productifs).
- **Toujours active** (pas de toggle) — même posture que la trace (K10).
- **Approche A — signal pur** : le moteur fournit le dernier signal structuré manquant (`DayTickResult.trainingFinished`, task 1) ; `app.ts` lit les trois signaux (`researchFinished`, `produced`, `trainingFinished`) via des helpers purs exportés `completedObjectives`/`shouldAutoPause` (task 2).
- **Retour visuel** : bannière `#pause-banner` « Objectif atteint » (liste des objectifs de la frame) + bouton « Reprendre (Espace) » (task 3).
- **Priorité victoire** : si `v0_victory` est posé dans la même frame, **seule** l'overlay de victoire s'affiche — la bannière ne se superpose jamais.
- **Reprise** : retour à la vitesse d'avant (`pause.prevSpeed`).
- **Pas de fuite** : bannière supprimée à la reprise ; Espace ne boucle pas sur lui-même (bannière visible → reprise ; sinon → toggle pause).
- **Trace** : non modifiée (spec §3.5 — la ligne `[J<n>] formation…` du journal suffit).

**Écart technique (contrainte liante lint)** : le bloc du plan déclare `let pending` — jamais réassigné → eslint `prefer-const` (0 erreur exigé) ; corrigé en `const pending` (précédent K4/K5/K8). Comportement identique (mutation via `.push`).

**Conséquences** :
- UI DOM non testée (aucun harnais, précédent K9/K7) : le filet = helpers purs testés au TDD (tasks 1-2) + build/lint.
- `pauseForObjectives`/`resumeAfterPause` dans `app.ts` ; `pushNews`/`traceDay`/`checkVictory` inchangés ; aucun `console.log` ajouté hors `src/trace/`.
- Verification : vitest **111/111** (10 fichiers — 107 + 2 task 1 + 2 task 2), lint 0, build VERT (js 82.76 kB).

---

## Journal des révisions

| Date | Décision |
|---|---|
| 2026-09-15 | ADR-001 à 006 approuvés |
| 2026-09-15 | Début de session, tout le cadre documentaire créé |
| 2026-09-16 | ADR-007 approuvé (IoC — tsyringe) |
| 2026-09-16 | ADR-008 approuvé (Écœur sim — ECS pur) |
| 2026-09-16 | ADR-009 approuvé (Scheduler de tick — ordre original + configurable) |
| 2026-09-16 | ADR-010 approuvé (Validation runtime — zod aux frontières) |
| 2026-09-16 | ADR-011 approuvé (Erreurs — Result + crash-loud + Error Boundary) |
| 2026-09-16 | ADR-012 approuvé (Configuration — config.ts + injection tsyringe) |
| 2026-09-16 | **ADR-007 RÉVOQUÉ** → ADR-013 (pure DI / CR manuelle) |
| 2026-09-16 | **ADR-008 RÉVOQUÉ** → ADR-014 (records + services) |
| 2026-09-16 | ADR-013 approuvé (IoC — pure DI / Composition Root manuelle) |
| 2026-09-16 | ADR-014 approuvé (Cœur — records + services par domaine) |
| 2026-09-16 | ADR-015 approuvé (Erreurs — union maison + crash-loud, amende ADR-011) |
| 2026-09-16 | ADR-016 approuvé (Driver — accumulateur à cap + budget, amende ADR-009/012) |
| 2026-09-16 | ADR-017 approuvé (Tests — double-run + scénarios, amende spec §8) |
| 2026-09-16 | Audit antagoniste 6 rôles : 6/6 verdicts suivis |
| 2026-09-16 | ADR-018 approuvé (Facade d'actions — seule porte de mutation, renumérotation de l'« ADR-007 » du plan v0) |
| 2026-09-16 | K4 approuvé (garde `ITEM_BY_ID` avant `canSelect` dans `selectResearch`, task 4) |
| 2026-09-16 | K5 approuvé (ordre de validate `trainStaff` du brief + retrait import inutilisé, task 5) |
| 2026-09-16 | K6 approuvé (test boucle intégrée : inversion de l'ordonnancement derrick/OF-frame du brief, task 8) |
| 2026-09-16 | K7 approuvé (GROUND_ITEMS sans gate de catégorie + smoke UI hors DOM au lieu de la recette Task 12, task 9) |
| 2026-09-16 | K8 approuvé (panneaux Recherche/Personnel/Minage : helper esc() sur les nœuds texte, helpers purs miroirs, retrait `getLevel` inutilisé, task 10) |
| 2026-09-16 | K9 approuvé (écran de victoire v0 : correction de précédence `??`/`>=`, rang via `rankName`, helper pur `victoryRankLabel`, task 11) |
| 2026-09-17 | K10 approuvé (trace de session : journal texte brut actions + moteur pour diagnostic, approche A + logger injecté option 1) |
| 2026-09-17 | K10 exécuté (plan trace-session) : src/trace/, journal moteur, hook runAction, raccordement UI |
| 2026-09-18 | K11 approuvé — pause auto sur objectif actif (révision `17-pause-auto`) : approche A signal pur + bannière + reprise Espace |
| 2026-09-18 | Task 12 clôture v0 (révision `18-cloture-v0`) : contrat repro J106–J112 ≤ J250, boot inchangé, ADR-018 Accepté, tag `v0.0.1` en attente (playtest humain) |