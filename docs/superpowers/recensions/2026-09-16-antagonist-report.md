# Recension antagoniste — Architecture Clean + Hexagonal

> Date : 2026-09-16
> Objet : challenge du choix « Clean + Hexagonal (4 couches, ports/adapters, Composition Root tsyringe unique) » pour deuteros-resurrected-web (jeu solo web, TS/Vite/Canvas 2D, ~160 corps célestes, ~46 items, simulation par tick).
> Cas : 1 développeur (projet solo), frontend seul, save local IndexedDB, zéro serveur (ADR-001), zéro framework UI (ADR-003).
> Mémoire MnemoLite : `7d61294a-843c-420d-8b15-9fe4bb1efe25`.
> Règles : honnêteté absolue, zéro complaisance. Ce document cherche activement les faiblesses ; il n'est pas une validation.

---

## 1. Objectifs du choix

Tels que énoncés par `docs/superpowers/specs/2026-09-16-architecture-design.md` et DECISIONS.md (ADR-007 à 012) :

1. **Testabilité** : la simulation se teste sans DOM ni Canvas (« contrainte ARCHITECTURE.md §1 »).
2. **Règle de dépendance** (Clean) : tous les imports pointent vers le cœur ; le rendu dépend de la logique, jamais l'inverse.
3. **Ports & adapters** (Hexagonal) : le cœur définit les interfaces, les adapters (IndexedDB, PRNG, clock) les implémentent.
4. **IoC conteneur (tsyringe)** : graphe d'objets construit en un point unique (Composition Root, `main.ts`).
5. **Séparation des préoccupations** : cœru ECS vs présentation, données JSON statiques hors code.
6. **Anti-régression** : ordre de tick figé (golden), déterminisme seedé.

Ces objectifs sont, pour l'essentiel, légitimes — et c'est précisément là où le bât blesse : ils sont **déjà presque tous satisfaits par des décisions antérieures, sans les 4 couches**.

---

## 2. Points faibles détaillés

### 2.1 Le bénéfice central est déjà acquis par ADR-002

Le but n°1 (sim testable sans DOM) est déjà garanti par la forme pure imposée par ADR-002 : `tick(state, seed) → state`. Une fonction pure qui ne touche ni `Date.now()` ni DOM **par nature** n'a besoin d'aucun port, d'aucun adapter, d'aucun conteneur pour être testable. Les systèmes reçoivent déjà tout en paramètres (`world`, `simConfig`) — le schéma `tickPhases` les retire de la boucle. Les ports `IPrng`/`IClock` sont redondants : le seed est dans le world (sérialisé), l'horloge est le driver extérieur. Clean+Hexagonal résout un problème déjà résolu plus simplement.

### 2.2 Contradiction avec la propre recherche du projet

`docs/ARCHITECTURE_RESEARCH.md` concluait, après recherche documentaire :
- §4 : « **Pure DI / Composition Root manuel (recommandé pour ce projet)** … le nombre d'objets est faible (une vingtaine) » et « les décorateurs travaillent bien, mais **heavyweight pour notre taille de projet** ».
- §2.2 : « **Pertinence ici** : ~160 corps, ~46 items — nombre d'entités faible (<10⁴). L'ECS pur apporte surtout le data-oriented… **Alternative plus légère : OO + services ou composition par mixins** » et « recs : services OO, pas d'ECS pur — trop peu d'entités ».

Les ADR-007 (tsyringe) et ADR-008 (ECS pur) ont tranché **contre la recommandation de la recherche**, sans nouvelle justification probante dans le texte des ADR. ADR-008 « conséquences » le concède lui-même : « Risque à surveiller : verbosité/indirection pour ~160 corps + ~46 items (volume faible) ». Une décision contre sa propre recherche documentée, sans apport de preuve contraire, est le signal d'un survraffining. Le fardeau de la preuve était sur le choix ; il n'est pas acquitté.

### 2.3 « Une seule implémentation à porter » : tous les ports échouent au test du « second adapter »

Le principe récurrent des critiques (voir §3) est : un port n'a de valeur que s'il existe ou existera réellement une seconde implémentation. Cas du projet :

| Port | Implémentation unique | Seconde implémentation plausible ? |
|---|---|---|
| `IPersistence` | IndexedDB | Export JSON manuel ? Un `save.ts` pur + IDB à la frontière suffit (§4). Non justifiable. |
| `IPrng` | mulberry32 | Décision déjà journalistée (« tranché à l'implémentation »). 2 lignes de test suffisent. |
| `IClock` | interval×échelle | Jamais 2. |
| `IView` | view model dérivé | C'est l'unique sortie de rendu. |

Chaque port coûte : un fichier d'interface + un adapter + l'enregistrement DI + le fake de test. Bénéfice : possibilité hypothétique de swap qui ne se produira pas dans un frontend seul avec une save locale et zéro backend.

### 2.4 Taxe d'abstraction : triple représentation des mêmes données

Le design instaure **3 formes du même état** : (a) composants ECS (data pures), (b) `SaveDto` versionné (ADR-006, seul passage vers `IPersistence`), (c) view model de lecture (`IView`). Ajouter un champ = toucher le composant, le système qui le lit, le système de persistance, le DTO, son schéma zod (ADR-010), la migration (ADR-006), le view model, et le code de rendu. La littérature mesurée en échec parle de « 5 fichiers pour un champ » en flat vs « 7 fichiers » en hexagonal (techarchitectinsights, unixy.io) — ici le comptage réel sera de l'ordre de 6 à 8. C'est la "taxe d'abstraction" : coût d'exploitation permanent, payé à chaque itération, pour un bénéfice (swap d'infra) qui n'arrivera pas.

### 2.5 tsyringe : conteneur pour une vingtaine de singletons, processus unique

La littérature empirique actuelle situe le seuil de rentabilité d'un conteneur DI au-delà de ~40-50 services, avec de vraies exigences de scope par requête ou de cycle de vie complexes (voir §3, sources DI). Ici : ~20 objets, tous singletons, un processus, un écran de jeu, une construction au boot. Le Composition Root manuel fait 50-100 lignes lisibles, et « le conteneur est dans ta tête, le fichier est le manifeste, le compilateur est le validateur ». De plus, tsyringe exige `experimentalDecorators` + `emitDecoratorMetadata` + `reflect-metadata` import + la question persistante de la migration vers les stage-3 décorateurs (proposal splité, `reflect-metadata` toujours en polyfill). C'est de la dette de configuration pour des décorateurs qui n'apportent rien ici.

### 2.6 ECS pur pour ~160 entités statiques au tick quotidien

Le bénéfice réel de l'ECS (itération chaude sur des milliers d'entités homogènes, cache locality, composition dynamique au runtime) est nul ici : ~160 corps + ~46 items, tick quotidien (pas par frame), entités quasi statiques, aucune composition dynamique en jeu. Le design lui-même le reconnaît via la mitigation « regrouper les systèmes par domaine » — ce regroupement dégénère exactement en ce que la recherche recommandait : des modules par domaine opérant sur un store typé. On paie la prédication de l'ECS (indirection composant/système, verbosité, propagation par ID difficile à déboguer — point déjà cité dans ARCHITECTURE_RESEARCH.md §2.2) pour une structure qui au final est un service OO déguisé. Nystrom (Game Programming Patterns) dit explicitement que l'ECS est *overkill* pour les jeux à peu d'entités et peu de logique de rendu massif.

### 2.7 4 couches pour un livrable solo → le payback n'arrivera pas

La condition de payback d'une architecture en couches/ports est bien documentée : règles métier véritablement complexes ET longévité multi-années ET plusieurs mécanismes de livraison ET (souvent) plusieurs équipes. Le projet coche : partie « règles métier réellement complexes » (les algos du remake : /801, wrap 255, ratios de combat, ordre de tick). Mais il décoche tout le reste : 1 développeur, 1 livrable navigateur, 1 framework (Vite) stable, zéro plan de portage multi-support. Or Clean/Hexagonal protège précisément contre ce qui n'arrivera pas (swap de la couche technique) et n'aide pas sur ce qui est dur (la justesse des règles), qui se gagne par des tests purs, pas par des couches.

### 2.8 Conséquences mesurables concrètes pour ce projet

- Chaque feature (new item, nouvelle ressource, nouveau système) passe par 4-5 artefacts cérémoniels de plus que la baseline « module pur + tests ».
- L'ordre de sens des imports (5 fichiers de test, lint boundary) s'ajoute à la discipline manuelle — avec un seul dev, la contrainte est de toute façon une convention, pas une contrainte de build.
- Le nombre de fichiers est multiplié (~x2 à x3 sur coeur+save+view), ce qui chiffre déjà en charge de navigation et de débogage.
- La spec elle-même indexe déjà un « sur-architecture à réévaluer » (§9) — indice que la dette de complexité est pressentie par le design lui-même.

---

## 3. Arguments contre — sources exactes

> Sources récupérées le 2026-09-16 (recherche web). Les « pro » honnêtes sont citées pour être contredites, pas sélectionnées en chambre.

**Sur la décision « quand ne PAS utiliser Clean/Hexagonal » :**
- Milan Jovanović, *When to Use Clean Architecture — Decision Framework* : les conditions de fitting = règles métier complexes, projet multi-années, **plusieurs équipes**, testabilité exigée ; à skiper pour prototypes/MVP/outils internes. — https://milanjovanovic.tech/blog/when-to-use-clean-architecture
- Evelyn Taylor, *Clean Architecture Is Overkill for 80% of Projects* : « repository interfaces for a database that would never be swapped, use-case classes wrapping single-line operations… every change touched four files instead of one ». — https://blog.startupstash.com/clean-architecture-is-overkill-for-80-of-projects-1dc3d5b22877
- *Clean Architecture: When It Works, When It's Theater* (Howdy) : CA = un investissement avec un payback ; 3 conditions (complexité du domaine, topologie d'équipes, longévité) ; voie médiane = « un seul module de service pur qui prend des données plates » ; « la plupart des équipes qui l'appliquent ne remplissent pas ces conditions ». — https://www.howdylatam.com/blog/clean-architecture-when-it-works-when-its-theater
- Valentina Jemuović, *Clean Architecture is Overhead* (LE pro-clinique) : « L'overhead est réel, je ne vais pas prétendre le contraire »… « sur un très petit projet, l'argument du doublon entité/ORM est dur à combattre ». Elle défend CA pour le mid-size+. C'est la réfutation la plus honnête, et elle concède exactement la zone où se situe ce projet. — https://journal.optivem.com/p/clean-architecture-is-overhead
- *Stop Overengineering in the Name of Clean Architecture* (dev.to/criscmd) : « interfaces for everything : don't use it when you only have one implementation ». — https://dev.to/criscmd/stop-overengineering-in-the-name-of-clean-architecture-b8h
- *The Abstraction Tax* (techarchitectinsights) : « un champ = 7 fichiers, deux jours de review » ; « chaque couche est un passif tant qu'elle n'a pas prouvé être un actif ». — https://www.techarchitectinsights.com/p/the-abstraction-tax-when-clean-architecture-creates-operational-complexity

**Sur hexagonal / ports & adapters :**
- *The Hexagonal Arc: The Promise Nobody Kept* (unixy.io) : « Show me the adapter you plan to swap. If the answer is 'none right now', YAGNI » ; cas réel : 65 fichiers + zéro test vs 20 fichiers + 94 % de couverture ; « plus d'interfaces que de tests, vous l'avez *performée*, pas tenue ». — https://unixy.io/blog/hexagonal-architecture-promise-nobody-kept/
- *Hexagonal Architecture in the Real World: trade-offs, pitfalls, when not to use it* (dev.to/elpic) : « ajouter promo_code = domaine + port + adapter SQL + adapter mémoire + fixtures → 5 fichiers » ; signal « une seule adapter jamais swappée » ; signal « domaine encore en cours de découverte » ; « start flat, extract a port when you feel the second adapter ». — https://dev.to/elpic/hexagonal-architecture-in-the-real-world-trade-offs-pitfalls-and-when-not-to-use-it-4a2p
- *Hexagon of Doom* (jointhefreeworld) : le P&A « inutile complexité et indirection, surtout petits projets » ; « c'est de l'astronautique d'architecture — concevoir pour une complexité future qui ne se matérialise jamais ». — https://jointhefreeworld.org/blog/articles/development/hexagon-of-doom/index.html
- Zakirullin, discussion publique sur *cognitive-load* : « pour les petits services (<1k LoC) l'hexagonal est un overkill même s'il a l'air pro » ; « le nombre de fichiers est presque triplé » ; « le DIP suffit — les dérivés Clean/Hexagonal/Onion ajoutent une taxonomie non justifiée ». — https://github.com/zakirullin/cognitive-load/discussions/24
- *Hexagonal Architecture is Not a Layered Architecture* (dev.to/bing_yu) : « petit projet → pas besoin ; l'indirection est un coût concret, le bénéfice (futur-proof) est spéculatif ». — https://dev.to/bing_yu/hexagonal-architecture-is-not-a-layered-architecture-topology-safety-and-when-to-walk-away-4dln
- *Are You Using Hexagonal Architecture, or Just Dependency Injection?* (Lucent Owl) : la pratique « hexagonale » moderne n'exécute jamais le swap d'adapters ; « la plupart des systèmes n'ont pas besoin de ce niveau d'abstraction ». — https://lucentowl.com/blog/2025/09/29/hexagonal-architecture-modern-development.html
- Victor Rentea, *Overengineering in Onion/Hexagonal Architectures* : les « Input Ports » ont une seule implémentation (= l'Application) → inutiles ; l'interface « juste au cas où » = Speculative Generality ; extraire une interface avec l'IDE prend « quelques secondes sans risque ». — https://victorrentea.ro/blog/overengineering-in-onion-hexagonal-architectures/
- Mark Seemann, *Ports and fat adapters* (blog officiel du Composition Root, source A10 du design) : « je déconseille volontairement les use-case layers/mediators » ; adapters « gras » + Imputed Sandwich ; « remplacer SQL Server par une doc DB ne se produit presque jamais, et ce n'est pas la vraie raison du pattern ». — https://blog.ploeh.dk/2025/04/01/ports-and-fat-adapters/

**Sur le conteneur DI / tsyringe :**
- David Mkrtchian, *Eighty Lines Instead of a Container* : ~20 services tiennent dans un fichier lire-en-30s ; « une centaine d'interfaces avec exactement un implémenteur » = la pire variante ; le conteneur pour IL2CPP/browser = friction réelle (bundle). — https://www.davidmcarati.info/blog/eighty-lines-instead-of-a-container/
- *Build a Tiny Dependency Injection Container in TypeScript* (dev.to/gabrielanhaia) : les conteneurs à décorateurs sont « overkill pour presque chaque service TS expédié » ; la dette de config de tsyringe/inversify (`experimentalDecorators`, `reflect-metadata`, questionrecurante de la migration stage-3) ; « <30 dépendances = wirer à la main ». — https://dev.to/gabrielanhaia/build-a-tiny-dependency-injection-container-in-typescript-185
- *Dependency Injection Without a Framework* (codesnatch) : les « creaks » qui justifient un conteneur = >40 services, cycle de vie, scope par requête ; « pour un service mono-équipe, la réponse est presque toujours 'wirer à la main jusqu'à ce que tu ne puisses plus' ». — https://codesnatch.io/community/articles/dependency-injection-without-a-framework
- *You (probably) don't need dependency injection* (brucefelt) : pour beaucoup d'applis, la DI manuelle + composition root suffit et reste plus debuggeable. — https://brucefelt.com/blog/posts/2026-01-13-you-probably-dont-need-dependency-injection
- Romain C., *You Probably Don't Need Dependency Injection in React* : « DI layers si complexes qu'ils exigeaient une documentation » ; « l'objectif est un couplage lâche, pas de l'architecture ». — https://romaincoupey.com/posts/250324-di-react/
- Sergey Radzishevskii, *Do We Really Need Dependency Injection in JavaScript* : frontend = souvent inutile (une implémentation par classe, objets JS pas chers). — https://radzserg.medium.com/do-we-really-need-dependency-injection-in-javascript-aacd4d18a9d0

**Sur l'ECS pour un volume faible :**
- *Entity-Component-System for Humans: When You Actually Need It* (mojolabs) : « 50-200 entités → vous n'avez presque certainement pas besoin d'ECS pour la perf » ; « Level 2 : system-style managers sur composants — beaucoup de petites équipes peuvent s'arrêter là » ; « si vous répondez 'petit, unique, tâche précoce, peu de programmeurs' → ECS par défaut = 'pas encore' ». — https://mojolabs.nz/entity-component-system-for-humans-when-you-actually-need-it/
- Bob Nystrom, keynote *Roguelike Celebration* (résumé Steemit) : l'ECS « est un overkill pour un jeu qui a peu de physique, peu de logique d'affichage, et beaucoup d'IA » ; alternatives capabilités/type-object/command. — https://steemit.com/roguelikecel/@markgritter/roguelike-celebration-bob-nystrom-on-architecture
- *Should I implement ECS in all my projects?* (GameDev StackExchange) : « si le nombre de types d'objets distincts est faible, le boilerplate d'un moteur à composants dépasse les bénéfices ». — https://gamedev.stackexchange.com/questions/114301/should-i-implement-entity-component-system-in-all-my-projects
- Roger Schoellgen, *Skip the ECS* (Cultist Astronaut) : megastruct + hot-data packing ≈ toute la perf utile sans ECS framework. — https://infinitivecode.substack.com/p/skip-the-ecs
- Dennis Gustafsson, *Thoughts on ECS* (voxagon) : « une grande partie de ce qu'apporte l'ECS peut être implémentée de façon bien plus simple » ; composition statique par type d'entité + fonctions sur composants. — https://blog.voxagon.se/2025/03/28/thoughts-on-ecs.html
- Hacker News (threads 28878264 / 28866732) : seuils empiriques « 10 entités → autre chose ; dizaines de milliers + centaines de composants → ECS ». — https://news.ycombinator.com/item?id=28878264

**Sur les jeux en général :**
- Dalerank, *Architectural trade-offs in game development* : « les layers marchent très mal sur les petits projets d'1-2 personnes — le temps passé à designer des couches mange le budget avant la première frame » ; questions à se poser avant de coucher des couches. — https://dalerank.github.io/en/articles/architecture-tradeoffs.html
- Yan Kalbaska, *Clean Architecture in Game Development* puis *How “clean” should your architecture be?* : Lesson #1 « ne pas isoler le framework UI du code du jeu au départ » ; le mapper ajouté « n'a pas apporté de valeur réelle quand implémenté — je l'ai supprimé ». — https://medium.com/better-programming/clean-architecture-in-game-development-e57542a96e5e et https://medium.com/@yankalbaska/how-clean-should-your-architecture-be-b2157eeea737
- *Clean Game Architecture* (studio Unity) : PRO-CA pour les grands codebases Unity. Contraste utile : leur restructuration a pris **2 ans sur un projet existant à plusieurs**, après que la dette était devenue intenable — pas un investissement *ex ante* sur un projet solo neuf. — https://cleangamearchitecture.com/
- SnappGames, *Unity C# Clean Architecture* : liste explicitement « over-engineering small projects » parmi les erreurs communes ; CA pour mid-to-large, live-service, équipes >3. — https://cricsnapp.com/2026/02/17/unity-c-clean-architecture-for-scalable-game-projects/

---

## 4. Alternatives réellement crédibles

1. **Module cœur pur + UI mince (recommandée)** — ce que devenait de facto ARCHITECTURE.md v0.1 :
   - `src/simulation/` : fonctions pures par domaine sur un store typé (pas un moteur ECS générique), `runTick(world, SIM_CONFIG)` comme aujourd'hui sur le squelette validé (vitest 42/42, Session 5).
   - `src/save/` : sérialisation/version/migrations pures + un thin adapter IndexedDB de ~50 lignes à la frontière.
   - `src/ui/` + `src/render/` : lisent le state (selecteurs purs), n'écrivent jamais dans le monde.
   - La **frontière** est une convention + un import-boundary en lint (eslint `no-restricted-imports` : `src/simulation` n'importe jamais `ui/render/canvas/idb`). Zéro port, zéro conteneur.
   - Testabilité : strictement égale — Vitest sans DOM sur des fonctions pures. Le golden/déterminisme/Property-based existants (ADR-009/ADR-010/ADR-011) restent intacts.
   - Coût évité : tsyringe + reflect-metadata, interfaces de ports ×5, adapters ×5, fakes ×5, triple mapping, décisions de placement à chaque feature.

2. **Composition root manuelle (pure DI)** — si l'on tient à l'injection ctor pour tester les systèmes individuels : `main.ts` qui écrit `new ProductionSystem(...), new ResearchSystem(...)` dans l'ordre, ~50 lignes. C'est exactement ce que recommandait la propre recherche ARCHITECTURE_RESEARCH.md §4. Le conteneur s'ajoutera quand (et si) le graphe en aura besoin ; l'IDE permet d'introduire une interface « en quelques secondes, sans risque » (Rentea).

3. **Composants 'capability' légers (option ECS allégée, à défaut de garder l'ECS)** — si le projet veut conserver la composition (ajouter `Mineable`/`Habitable`/`Targetable`), c'est faisable en « Level 2 » (managers système sur objets composés) ou en « capability components » (Nystrom), sans World/EntityId/registre générique. Réversible vers du full-ECS seulement si un futur content l'exige — ce qui n'est pas le cas au tick quotidien.

4. **Vertical slicing (option complémentaire de structure)** : dossier par feature (production/, research/, combat/…) contenant règle + tests, plutôt que par couche. Les horizontaux (cœur vs UI) restent la seule vraie séparation à ce stade.

---

## 5. Verdict : AMENDER

**Garder (sans couches formelles)** :
- Cœur de simulation pur TS sans DOM — satisfait par convention + lint (ADR-002 l'établit déjà) ; c'est la seule boundary qui compte ici.
- Tick pur, seedé, ordre de référence + `tickPhases` configurables (ADR-009), tests golden.
- zod aux frontières du save/events (ADR-010), Result neverthrow pour erreurs domaine (ADR-011), Error Boundary UI.
- Save versionné + migrations (ADR-006).

**Retirer ou amender précisément** :
- **tsyringe → composition root manuelle** (and reversal ADR-007). Supprime reflect-metadata, `experimentalDecorators` et ~0 bénéfice pour ~20 singletons.
- **Ports/adapters formels (IPrng, IClock, IPersistence, IView) → supprimer.** Seed en paramètre (fait), clock = driver extérieur, save = module pur + adapter IDB fin. Un port ne naîtra qu'au moment où une seconde implémentation apparaît.
- **4 couches → 2 modules** (cœur pur / application-UI). Pas de couche Use case ni de couche Adapters transversale.
- **ECS pur → modules par domaine sur store typé** (le regroupement déjà prévu en ADR-008 §4.3 le préfigure). Garder l'esprit « data pures + systèmes » mais sans indirection World/EntityId/registre : c'est strictement moins encombrant, à comportement identique, et c'est ce que la recherche avait recommandé.
- Multi-représentations : **converger SaveDto et viewmodel** tant que les formes sont identiques (n'obtenir un mapping séparé que quand une forme diverge réellement — règle dérivée de Seemann/Jemuović).

**Pourquoi pas GARDER** : l'architecture 4 couches + conteneur + ports a un coût permanent et mesurable (taxe d'abstraction §2.4, x2-x3 fichiers, configuration DI) et aucun bénéfice atteignable pour un jeu solo frontend-seul dont la complexité réelle est dans les règles, pas dans l'infrastructure. Même la défense la plus honnête disponible (Jemuović) concède que l'overhead est indéfendable sur les petits projets — et le seul serveur « switcheable » ici est un navigateur.

**Pourquoi pas REMPLACER tout en bloc** : le noyau dur (pur, déterministe, ordre de tick figé, save versionné, erreurs typées) est correct et doit être préservé tel quel ; ADR-001 à 006 + 009 à 011 ne sont pas en cause. Le coût est concentré sur ADR-007, ADR-008 (forme) et l'empilement 4 couches de la spec.

Conditions de levée du verdict (si le projet décide de continuer quand même) :
1. Justifier contre la propre recherche (quelles nouvelles contraintes vs 2026-09-15 ?).
2. Nommer au moins **un** port qui aura 2 implémentations, avec un horizon.
3. Chiffrer la taxe (files/donnée) et accepter le plafond (1 dev, 1 livrable, 1 framework).