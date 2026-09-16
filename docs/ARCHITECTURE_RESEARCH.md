# ARCHITECTURE_RESEARCH — Recherche sur les meilleures pratiques (round 2, architecture)

> Date : 2026-09-15
> Statut : recherche documentaire terminée — sert de matière première au brainstorming architecture (spec à venir).
> Sources : 10 références web récupérées (patterns jeu, architecture propre/hexagonale, IoC/DI, gestion d'erreurs, tests). Hashes `source:<sha1-10-hex(url)>` pour written-back mnémo.

---

## 1. Méthode & sources

**Protocole mnemolite-mem-first** : recherche mémoire → cache miss (aucune mémoire sur l'architecture) → recherche web → write-back mnémo (obligatoire).

| # | Source | Sujet | Hash |
|---|---|---|---|
| A1 | gameprogrammingpatterns.com — *Game Programming Patterns* (Nystrom) Contents | Catalogue des patterns de jeu | `source:f7959e99d5` |
| A2 | gameprogrammingpatterns.com — *Game Loop* | Boucle de jeu, timestep, déterminisme | `source:89d66b7542` |
| A3 | blog.cleancoder.com — *The Clean Architecture* (R.C. Martin) | Couches, Dependency Rule | `source:9d9818d9cc` |
| A4 | alistair.cockburn.us — *Hexagonal Architecture* | Ports & adapters, primaires/secondaires | `source:84282904b6` |
| A5 | github.com/microsoft/tsyringe — DI container TS | IoC par décorateurs | `source:6e3498fd88` |
| A6 | github.com/supermacro/neverthrow — Result types | Erreurs typées (Ok/E) | `source:5fe89e5a44` |
| A7 | github.com/dubzzz/fast-check — property-based testing | Tests par propriétés | `source:ab7f8561dc` |
| A8 | en.wikipedia.org — *Entity Component System* | Composition vs héritage, ECS | `source:dca3d61191` |
| A9 | zod.dev — schema validation TS | Validation runtime, inférence | `source:37e6038c9a` |
| A10 | blog.ploeh.dk — *Composition Root* (Mark Seemann) | Point unique de composition | `source:28c36f97ae` |

---

## 2. Patterns de jeu (Game Programming Patterns — A1, A2)

### 2.1 Game Loop
- **Intent** : *découpler la progression du temps de jeu de l'entrée utilisateur et de la vitesse du processeur*.
- **Boucle canonique** : `processInput() → update() → render()`.
- **Timestep variable** = non-déterministe (accumulation d'erreurs d'arrondi float, instabilité physique) → à éviter pour une simulation rejouable.
- **Timestep fixe avec rattrapage** (recommandé) :
  ```
  lag += elapsed;
  while (lag >= MS_PER_UPDATE) { update(); lag -= MS_PER_UPDATE; }
  render(lag / MS_PER_UPDATE);
  ```
  → la simulation avance à pas constants ; le rendu est découplé de l'update.
- **Sécurité** : plafonner le nombre d'updates par frame (sinon « spirale de la mort » si le device est trop lent).
- **Web** : on ne possède **pas** la boucle — `requestAnimationFrame` pour le rendu ; la simulation peut tourner sur son propre cadencement (sock/alarm/idle), tick par tick.

### 2.2 ECS (A8)
- **Entité** = ID entier. **Composant** = données pures (struct/note). **Système** = logique qui agit sur tous les entités ayant les composants requis.
- **Composition sur héritage** ; idéal pour : masse d'entités homogènes, data-oriented, extensibilité.
- **Coût** : propagation de valeurs via composants difficile à déboguer ; verbosité.
- **Pertinence ici** : ~160 corps, ~46 items, flottes/vaisseaux — **nombre d'entités faible** (< 10⁴). L'ECS pur apporte surtout le « data-oriented » et le découplage système/logique. Alternative plus légère : **OO + services** ou **composition par mixins**.

### 2.3 Autres patterns pertinents (catalogue A1)
- `Command` : queued input / actions annulables (utile pour hotkeys, macros).
- `Observer` / événements : déjà au cœur du remake (`DayPassed`, `ProductionFinished`…) — adapté à notre modèle évent-driven.
- `State` : écrans/modes de jeu (Pause, combat 3D, base).
- `Service Locator` : *anti-pattern* s'il est utilisé hors Composition Root (A10) — à éviter ; DI/ctor injection à privilégier.
- `Prototype` : nemesis — non.
- `Object Pool` : pertinemment pour les sprites/projectiles à haute cadence — YAGNI en v1 (peu d'entités).

---

## 3. Architecture (A3, A4)

### 3.1 Clean Architecture (R.C. Martin — A3)
**Règle de dépendance** (la clé) : les dépendances source pointent toujours *vers l'intérieur*.
```
frameworks/UI (Vite, Canvas)  →  interface adapters (screens, renderers)
  →  use cases (mine, research, build…)   →  entities (rules du jeu)
```
- **Entités** : règles métier centrales, aucune dépendance externe.
- **Use cases** : orchestration des règles ; dépendent des interfaces des adapters (ports).
- **Adapters** : traduisent data externes → use cases.
- **Frameworks** : en périphérie (Règle de dépendance : le rendu dépend de la logique, jamais l'inverse).

**Déduction pour nous** : le config / conteneur DI n'est **pas** utilisé par les couches internes ; les use cases reçoivent leurs dépouilles via **ctor injection** (A5, A10). Le rendu ne lit que l'état projeté (principe déjà énoncé dans ARCHITECTURE.md v0.1 §1).

### 3.2 Hexagonal (A4)
- Exprime la même idée avec **ports & adapter** :
  - `ports` = interfaces définies par le domaine (ex : `ClockPort`, `PersistencePort`, `UiPort`).
  - `adapters` = implémentations concrètes (navigateur, IndexedDB, canvas).
- **Sens des dépendances** : le domaine définit les ports ; les adapters implémentent. Rien ne pointe vers les framworks.
- **Avantage direct** : la simulation est testable *sans DOM ni Canvas* — c'est exactement notre contrainte (ARCHITECTURE.md §1).
- Primary ports (appelés par nous) : `SimulationApi` (tick, actions joueur).
- Secondary ports (que nous appelons) : `PersistencePort` (save/load), `PrngPort` (générateur déterministe), `ClockPort`.

**Recommandation** : fusion Clean + Hexagonal.
- Sim = cœur pur (cas d'usage, petite entités).
- Interfaces ports à la frontière du cœur.
- Couche d'adapters = rendu + persistance + PRNG.
- Composition Root unique (A10) au boot de `main.ts` : on construit le graphe d'objets.

---

## 4. IoC / DI (A5, A10)

### 4.1 Principles (A10 — Mark Seemann)
- **Composition Root** : *un endroit (près du point d'entrée) où l'on compose le graphe d'objets*. C'est le SEUL endroit qui fait `new` à la main (ou utilise un conteneur).
- Toutes les autres classes : **constructor injection** (dépendances passées au ctor, null-guard).
- **Un conteneur DI n'est référencé que depuis le Composition Root** ; jamais depuis le domaine.
- Les modules de bibliothèque ne doivent **pas** avoir leur propre conteneur → éviter l'anti-pattern Service Locator.
- Pour les libs : patterne `Facade` si besoin de simplification.

### 4.2 Conteneurs TS
- **tsyringe** (A5) : DI par **décorateurs** (`@injectable()`, `@inject(Token)`) avec `reflect-metadata`. Léger, mature (Microsoft), zéro dépendance à part reflect-metadata.
- **InversifyJS** : plus complet (child containers, interceptors) mais plus lourd.
- **typed-inject / tinject / Awilix** : alternatives zero-decorator.
- Pour un frontend Vite : les décorateurs travaillent bien, mais **heavyweight** pour notre taille de projet.

**Recommandation entre deux options** :
1. **Pure DI / Composition Root manuel** (recommandé pour ce projet) : `main.ts` instancie le graphe à la main. Zéro dépendance, debug trivial, pas de reflect-metadata, cycle de dev simple. Le nombre d'objets est faible (une vingtaine).
2. Conteneur (tsyringe) : utile si le graphe grossit (many modules, tests automatisés de résolution). Ajoute de la magie (`@injectable`) et une dépendance.

À discuter au brainstorming (décision à trancher : « conteneur DI vs pure DI »).

---

## 5. Gestion d'erreurs avancée (A6, A9, TS)

### 5.1 Result / Either (A6 — neverthrow)
- **Principe** : ne pas `throw` pour les erreurs *récupérables/predictibles* — retourner une union `Ok(value) | Err(err)` typée.
- **API** : `ok(v)`, `err(e)`, `ResultAsync` (version Promise), `.map()`, `.mapErr()`, `.andThen()`, `.match(ok, err)`, `.unwrapOr()`, `safeTry`.
- **Avantage TS** : le type du succès *et* celui de l'erreur sont connus du compilateur ; `match` force le traitement des deux branches.
- **Plugin eslint** `eslint-plugin-neverthrow` : force `map/mapErr` (`no-unchecked-result`, `no-throw`).

### 5.2 Validation aux frontières (A9 — zod)
- Valider toute **donnée externe** (save JSON, events.json, input local storage) avec un **schema** zod.
- `z.object({…})` → inférence de type statique `.parse()` / `.safeParse()`.
- Frontière exemple : au chargement d'un save, valider la structure AVANT de la laisser entrer dans la sim → évite corruption silencieuse.
- **Ne pas** parsifier tout le domaine interne — la sim interne est « trusted » une fois construite.

### 5.3 Stratégie d'erreurs unifiée (synthèse)
1. **Erreurs prédictibles, domain** (manque de ressources, tech pas dispo, staff non qualifié…) → **Result** (they're expected by the player : UI doit les afficher).
2. **Erreurs de frontière** (save invalide, JSON corrompu) → **zod** (rejet au chargement).
3. **Erreurs inattendues / programmées** (bug interne, invariant violé) → **exception** (crash-loud) + monitoring ; jamais de `catch` global silencieux qui « heal » l'état.
4. **Contrat d'invariants** : en dev (assertions/Proxies), en prod (`ErrorBoundary` UI).

### 5.4 Pattern complémentaire
- **Guard clause** : valider les préconditions en tête de méthode (fail-fast).
- **Unions discriminées TS** (tagged unions) : une classe d'erreur par famille (`DatabaseError`, `ValidationError`, `SimulationError`) avec un champ `type` commun.

---

## 6. Tests (A7 + existing)

### 6.1 Property-based testing (A7 — fast-check)
- **fast-check** : génère des inputs de test auto (arbitrary), vérifie les **invariants** (`expect`), rétrécit automatiquement l'échec à un cas minimal.
- Diamant pour la sim : vérifier algos contre invariants (ex. `productionValue` reste dans [0,255] ; wrap = exact ; total des resources jamais négatif ; tick à tick monotone).
- **Exemple** : `fc.integer({min:0,max:255})` → vérifier l'invariant de wrap.
- Compatible Vitest (notre runner).

### 6.2 Stratégie recommandée
- **Unit tests** : algo purs (production /801, search, wrap) → no-DOM, déterministes.
- **Property-based** : invariants sur les algos et le tick.
- **Golden / snapshot tests** : un tick de référence (même seed PRNG) → état sérialisé identique (anti-régression du déterminisme).
- **Integration** : chargement d'un save fixture + re-tick → même état de référence.
- **Sim outputs for verification** : puisque déterministe (seed), on peut lire un état fixé après N ticks.

---

## 7. Synthèse pour notre projet (qu'est-ce qui est décidé vs à trancher)

### Déjà décidé (par recherche)
| Sujet | Choix |
|---|---|
| Boucle | Timestep fixe par tick de jeu (la sim avance par jours/tick), rendu découplé via rAF |
| Dépendances | Rendu dépend de la logique, jamais l'inverse (Clean + Hexagonal) |
| Frontières | Persistence/save validée par zod ; PRNG injectable (déterminisme) |
| Erreurs domaine | Result type au retour des actions use-case (le souci joueur = affichable, pas une exception) |
| Tests | unit + fast-check (invariants) + golden (seed PRNG) |

### À trancher au brainstorming
1. **IoC** : conteneur (tsyringe) vs pure DI (composition root manuelle) ? (je penche pure DI pour ce projet)
2. **Forme du cœur** : ECS pur vs « domain services + petites entités » (recs. : services OO, pas d'ECS pur — trop peu d'entités) ?
3. Ordre/abonnement des systèmes au tick (garde l'ordre RESEARCH→PRODUCTION→… de l'original) ?
4. Niveau de typage aux frontières (zod partout vs juste save) ?
5. Gestion des erreurs irrécupérables : error boundary UI + crash-loud ?
6. Où vivent les re-équilibrages (config.ts déjà décidé : SIM_CONFIG).

---

## 8. Sources consultées

Toutes les URL ci-dessous ont été récupérées le 2026-09-15 (planning web direct, cache miss mnémo).

1. Nystrom, R. — *Game Programming Patterns* (table des matières) — https://gameprogrammingpatterns.com/contents.html
2. Nystrom, R. — *Game Loop* — https://gameprogrammingpatterns.com/game-loop.html
3. Martin, R.C. — *The Clean Architecture* — https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
4. Cockburn, A. — *Hexagonal Architecture* — https://alistair.cockburn.us/hexagonal-architecture/
5. Microsoft — *tsyringe* — https://github.com/microsoft/tsyringe
6. *neverthrow* — https://github.com/supermacro/neverthrow
7. *fast-check* — https://github.com/dubzzz/fast-check
8. Wikipédia — *Entity Component System* — https://en.wikipedia.org/wiki/Entity_component_system
9. *Zod* — https://zod.dev/
10. Seemann, M. — *Composition Root* — https://blog.ploeh.dk/2011/07/28/CompositionRoot/