# Spec — Transport pods/slots jouable : data `vessels.json` + sim

> Date : 2026-09-18 · Périmètre : **documents + data + simulation** (pas d'UI)
> Amont : GAMEPLAY v0.2 (spec `2026-09-18-gameplay-v0.2-design.md`, K15) — transport
> pods/slots validé en docs. Cette spec implémente la première brique transport.
> Décision projet suivante consignée : **K16** (multiplicateurs à l'issue du jalon).

## 1. Contexte et objectif

GAMEPLAY v0.2 a verrouillé le modèle transport **pods/slots hybride** :
un vaisseau = `capacité` (t) + `slots` ; un slot porte une cargaison homogène ;
masse = contrainte de charge (`Σ quantité × masse unitaire ≤ capacité`) ;
carburant consommé à chaque voyage `f(distance, masse)` (MeH au sol/intra,
HeD en orbite/FTL) ; navette : manœuvres 2/5/2 j.

La sim v1 (contrat verrouillé, 111 tests, `GameState.version = 1`) ne contient
ni vaisseau, ni navigation, ni carburant. Cette spec crée **`data/vessels.json`**
(3 vaisseaux canon) et la **logique transport jouable** : construction,
ravitaillement, envoi manuel haut niveau, voyage dans le `dayTick`, déchargement
automatique.

## 2. Objectifs / Non-objectifs

### 2.1 Objectifs
1. `data/vessels.json` généré par `scripts/generate_data.py` + invariants testés.
2. Types runtime `VesselDef`/`VesselRuntime`/`CargoSlot` + `GameState.vessels`.
3. Actions : `buildVessel`, `refuel`, `sendCargo` (haut niveau, interface `Action`).
4. Voyage résolu dans `dayTick` (phase Navigation), déchargement auto à l'arrivée.
5. Carburant consommé selon formule §4.5, réservoirs RE (§4.4).
6. État de départ : 1 navette montée sur Terre + 3 pods en stock (§4.7).
7. `GameState.version` passe à **2** (convention DATA §3.3).

### 2.2 Non-objectifs (EPIC futures, hors chantier)
- Routage ACC, routes de ravitaillement, AOC/MTX (GAMEPLAY §2.4).
- Détection de défaite (GAMEPLAY §10).
- Combat v0.3 (remodelage vaisseaux de combat) ; `Fleet` (drônes) inchangée.
- Pod swap à chaud, transport cryo/équipe (type `cryo` défini mais non jouable),
  réparation de base (`repairDays` conservé en data, aucune action), UI écrans.

## 3. Données statiques

### 3.0 Décision : masse des ressources
Les ressources de `resources.json` n'ont pas de masse unitaire (le remake non
plus). GAMEPLAY §5.2 définit pourtant la capacité en tonnes. Décision (validée
en revue de spec) : **chaque ressource reçoit `mass: 1`** (1 unité = 1 t, valeur
arbitraire documentée, sans référence RE). La masse d'une cargaison vaut donc :
- ressource → `quantité × 1` (masse de `RESOURCES`), bornée par la capacité ;
- item → `quantité × ItemDef.mass` (masse de `ITEMS`).

Ajout `mass` aux 16 ressources dans `scripts/generate_data.py` +
`data/resources.json`. Deux vérifications restent actives et indépendantes :
masse totale ≤ `capacity` ET `supply` ≤ 250/emplacement (canon).

### 3.1 Schéma `data/vessels.json`

```jsonc
{
  "meta": {
    "version": 1,
    "source": "GAMEPLAY v0.2 §5.2; ACC.cs/Enums.cs/Ship.cs (remake, clone local d252446f079fc4e7de766f28a22509bd71ed1023 — RESEARCH §3/§14)"
  },
  "vessels": [
    {
      "id": "shuttle",
      "name": "Navette",
      "category": "transport",
      "capacity": 100,                   // t — masse totale chargée max
      "slots": { "supply": 1, "tool": 1 }, // capacité par type d'emplacement
      "slotTotal": 1,                    // emplacements remplissables simultanément
      "fuelType": "meh_fuel",
      "tankCap": 100,                    // capacité réservoir (unités)
      "range": "intrasolar",             // shuttle | interplanetary | interstellar
      "travel": { "landDays": 2, "takeoffDays": 5, "repairDays": 2 },
      "build": { "chassis": "s_chassis", "drive": "s_drive" }
    },
    {
      "id": "ios",
      "name": "IOS (Interplanetary Ops)",
      "category": "transport",
      "capacity": 2500,
      "slots": { "supply": 2, "tool": 1 },
      "slotTotal": 3,
      "fuelType": "meh_fuel",
      "tankCap": 250,
      "range": "interplanetary",
      "travel": null,                    // vaisseau orbital : pas de manœuvres sol
      "build": { "chassis": "i_chassis", "drive": "i_drive" }
    },
    {
      "id": "scg",
      "name": "SCG (FTL)",
      "category": "transport",
      "capacity": 5000,
      "slots": { "supply": 2, "tool": 1 },
      "slotTotal": 3,
      "fuelType": "hed_fuel",
      "tankCap": 250,
      "range": "interstellar",
      "travel": null,
      "build": { "chassis": "g_chassis", "drive": "star_drive" }
    }
  ]
}
```

### 3.2 Sémantique `slots` / `slotTotal`
- `slots` = nombre d'emplacements de pod disponibles **par type** (canon
  GAMEPLAY §5.2) : navette 1 (`supply` **ou** `tool`, jamais les deux à la fois —
  exprimé par `slotTotal: 1`), IOS/SCG 3 dédiés (1 `tool` + 2 `supply`).
- `CargoSlot.kind` ne peut excéder la capacité du type correspondant, et le
  nombre de slots remplis ne dépasse jamais `slotTotal`.
- Signatures types :

```ts
type SlotKind = 'supply' | 'tool' | 'cryo';
type FuelResourceId = 'meh_fuel' | 'hed_fuel';

interface VesselDef {
  id: 'shuttle' | 'ios' | 'scg';
  name: string;
  category: 'transport';
  capacity: number;
  slots: Partial<Record<SlotKind, number>>;
  slotTotal: number;
  fuelType: FuelResourceId;
  tankCap: number;
  range: 'intrasolar' | 'interplanetary' | 'interstellar';
  travel: { landDays: number; takeoffDays: number; repairDays: number } | null;
  build: { chassis: string; drive: string };
}
```

### 3.3 Génération
Ajout d'une section `vessels` dans `scripts/generate_data.py` (les autres data
y sont produites) : le tableau des 3 vaisseaux ci-dessus. Invariants vérifiés
par `tests/data.test.ts` (§7.1).

## 4. Simulation

### 4.1 Types runtime (`src/simulation/vessels.ts`, exportés par `index.ts`)

```ts
type VesselState = 'docked' | 'taking_off' | 'in_transit' | 'landing' | 'docking' | 'launching';

interface CargoSlot {
  kind: SlotKind;
  itemId: string | null;  // null si emplacement monté vide ; ressource (supply) ou item à flag toolPod (tool)
  quantity: number;       // > 0 si rempli ; ≤ 250 pour supply ; ≥ 1 pour tool
}

interface VesselMission {
  fromPlanetId: string;
  toPlanetId: string;
  startDay: number;
  arrivalDay: number;   // jour d'arrivée inclus (manœuvres incluses)
  fuelCost: number;     // carburant débité au départ
}

interface VesselRuntime {
  id: string;
  templateId: string;
  planetId: string;      // position courante
  inOrbit: boolean;      // amarré à la station (orbite) vs base planétaire (sol)
  state: VesselState;
  slots: CargoSlot[];    // emplacements montés (0..slotTotal)
  fuel: number;
  fuelType: FuelResourceId;
  mission: VesselMission | null;
  health: number;
}
```

`GameState` reçoit `vessels: VesselRuntime[]` ; **`version: 2`**. Pas de
`save.ts` existant : la « migration » est la recréation d'état
(`createInitialState`).

### 4.2 Actions (`src/actions/vessels.ts`, interface `Action` de `actions/types.ts`)

- **`buildVessel(state, { planetId, templateId })`**
  - valide : vaisseau inconnu ; items `build.chassis` + `build.drive` + pods
    requis présents dans `planets[planetId].items` ; orbite : un châssis
    `orbitOnly` (IOS/SCG) n'est produit qu'en orbite — exiger une factory
    `inOrbit: true` sur la planète (station) et créer le vaisseau
    `inOrbit: true` ; sinon (navette) `inOrbit: false` au sol ;
  - exécute : consomme les items (châssis, drive, pods — voir §4.3), crée
    l'instance `docked`, `slots` montées selon §4.3, `fuel: 0`.
- **`refuel(state, { vesselId })`**
  - valide : vaisseau existant, `state === 'docked'` ;
  - exécute : consomme `fuelType` des stocks planétaires (base planétaire si
    `inOrbit: false`, sinon station) dans le réservoir jusqu'à `tankCap`
    (consomme le stock quelle que soit sa taille ; le surplus reste en stock).
- **`sendCargo(state, { vesselId, itemId: string, quantity: number, toPlanetId: string })`**
  - **valide** (échec → `ValidationResult` avec raison claire) :
    1. vaisseau existant et `state === 'docked'` ;
    2. `toPlanetId` valide et `≠ planetId` ;
    3. item connu : une **ressource** (`id` ∈ `RESOURCES`, catégorie `raw`/minable
       etc. de `resources.json`) est transportée dans un emplacement `supply` ;
       un **item à flag `toolPod`** (`id` ∈ `ITEMS`, `toolPod: true`) dans un
       emplacement `tool` ; tout autre (carburants `meh_fuel`/`hed_fuel`,
       pods, châssis/drives, équipements sans `toolPod`) → refus ;
    4. **range** : trajet inter-systèmes (`starId` différent) réservé au `scg`
       (range `interstellar`) ; sinon intra-système (shuttle/ios suffisent) ;
    5. stock suffisant : ressource → `stores` de la planète source ; item tool →
       `items` (le stock d'une planète n'est pas séparé sol/orbite) ;
    6. capacité emplacements : montage possible dans les emplacements vides du
       bon type (≤ 250 par emplacement pour supply, tout entier pour tool) et
       **masse totale après chargement ≤ `capacity`** — ressource = `quantité`,
       item = `quantité × ItemDef.mass` (§3.0) ;
    7. carburant : `fuel ≥ fuelCost(route, masse chargée)` (§4.5) — PAS de
       ravitaillement automatique (l'action `refuel` est explicite) ;
  - **exécute** : débite les stocks, monte les slots, déduit le carburant,
    pose `mission = { fromPlanetId, toPlanetId, startDay: state.day,
    arrivalDay, fuelCost }`, journal de départ (navette : décollage tailleur
    5 j, trajet, atterrissage 2 j).
- Pas d'action de déchargement manuel : le cargo est versé automatiquement à
  l'arrivée (§4.4). Actions refusées si `state !== 'docked'`.

### 4.3 Montage des emplacements à la construction
- Navette : 1 pod au choix (le pod de départ est `supply_pod` — §4.7) monté sur
  l'unique emplacement. IOS/SCG : 1 `tool_pod` + 2 `supply_pod` montés.
- Les pods (`supply_pod`, `tool_pod`, `cryo_pod`, items) sont **consommés** à la
  construction. Le `kind` d'un emplacement est fixé par le pod monté.

### 4.4 Voyage & arrivée (`dayTick`)
- La navigation ne stocke aucun état par étape : une mission part le jour du
  `sendCargo` et arrive le jour `arrivalDay` inclus.
- `arrivalDay = startDay + takeoff + travelDays + land` pour la navette
  (`travel` non null) ; `startDay + travelDays` pour IOS/SCG (pas de manœuvres).
- Phase Navigation dans `dayTick` (avant combat, après minage/formation/ennemis) :
  pour chaque vaisseau `mission ≠ null` et `day ≥ arrivalDay` : passage à
  `docked`, `planetId = toPlanetId`, **versement automatique** du cargo
  (ressource → `stores` de la destination, plafonné 50 000/ressource ;
  item → `items`), `mission = null` ; ligne journal + `DayTickResult.arrived`
  (`Array<{ vesselId, planetId }>`).
- `travelDays(a, b)` existant (`travel.ts`) reste la pure fonction de durée
  (intra/inter). La durée **inter-systèmes** (SCG FTL) n'est pas définie :
  hors périmètre (v1 = système du Soleil) — la validation de range refuse toute
  route inter-systèmes tant que le SCG n'est pas opérationnel/codé.

### 4.5 Carburant — formule concrète
```
fuelCost = max(1, ceil(distance × (100 + masseChargée) / 100))
```
- `distance` = jours de trajet : intra `max(|Δordre|, 1)`, inter `|Δordre|×4` ;
- `masseChargée` = masse totale des slots après chargement (t) : ressource =
  `quantité`, item = `quantité × ItemDef.mass` (§3.0) ;
- à vide `= distance` ; à pleine charge `= 2×distance` ;
- constante de 100 dans `SIM_CONFIG` (`FUEL_MASS_FACTOR: 100`) — tunable.

### 4.6 Constantes (`SIM_CONFIG`)
- `FUEL_MASS_FACTOR: 100`
- `SUPPLY_SLOT_LOAD_MAX: 250` (canon GAMEPLAY §2.3 / ACC.cs)
- arrivée/décollage : réutiliser `SHUTTLE_LAND_DAYS: 2`, `SHUTTLE_TAKEOFF_DAYS: 5`.

### 4.7 État initial
`createInitialState` :
- 1 navette sur Terre : `vessels = [{ templateId: 'shuttle', planetId: 'earth',
  inOrbit: false, state: 'docked', slots: [{ kind: 'supply', itemId: null,
  quantity: 0 }] (emplacement monté vide), fuel: 0, fuelType: 'meh_fuel',
  mission: null, health: 100 }]` ;
- Terre reçoit les pods de départ en `items` : `supply_pod`, `tool_pod`,
  `cryo_pod` (1 chacun) ;
- `version: 2`.

## 5. Décisions d'implémentation notables
1. `slotTotal` complète `slots` pour exprimer « 1 emplacement au choix » de la
   navette (le canon interdit supply ET tool simultanés).
2. Carburant : le remake ne consomme pas de carburant par trajet (seulement
   `Fuel > 0` requis) ; GAMEPLAY §2.3 impose la consommation → formule §4.5.
3. Réservoirs RE : navette 100, IOS/SCG 250 (`ACC.RefuelMax`).
4. `cryo` présent dans les types mais non jouable (transport d'équipe = EPIC).
5. Pas d'unification avec `Fleet` (combat) — scission assumée jusqu'au v0.3.
6. Masse universelle des cargaisons : ressources = 1 t/unité (arbitraire
   documenté), items = `ItemDef.mass` (RE fidèle).

## 6. Non-régression
- Les 111 tests existants restent verts : aucune signature ni gate existante
  modifiée ; `Fleet`, `travel.ts`, `combat.ts`, `enemy.ts` non retouchés
  (sauf exports `index.ts`).
- `state.version` passe 1 → 2 : aucun test ne doit asserter `1` (vérifier,
  sinon mettre à jour).

## 7. Tests (vitest, TDD)

### 7.1 `tests/data.test.ts`
- `vessels.json` : 3 vaisseaux ; capacités/slots/`slotTotal`/`range`/`fuelType`
  canon ; `build.chassis`/`drive` existent dans `ITEMS` ; pods requis existent ;
  `fuelType` ∈ `RESOURCES` ; `travel` non null pour navette, null pour IOS/SCG.

### 7.2 `tests/vessels.test.ts` (sim)
- allocation : montage supply ≤ 250 ; navette 1 emplacement max ; masse ≤ capacité ;
  emplacement vide requis par type.
- formule carburant : à vide `= distance` ; à pleine charge `= 2×distance` ;
  `ceil` et `max(1, …)`.
- `arrivalDay` navette (takeoff + trajet + land) vs IOS/SCG (trajet seul).
- arrivée : déchargement auto (ressource dans `stores` plafonné 50 000 ; item
  dans `items` ; `mission = null` ; `DayTickResult.arrived`).
- refuel : plafond `tankCap`, consommation du stock, surplus conservé.

### 7.3 `tests/actions.test.ts` (ou `tests/actions-vessels.test.ts`)
- `sendCargo` : matrice de validation (vaisseau non docked, carburant insuffisant,
  stock insuffisant, pas d'emplacement libre, type incompatible, destination =
  position, hors range SCG pour inter-systèmes) ; exécution (débit stocks,
  slots montées, carburant débité, mission posée).
- `buildVessel` : items manquants, orbite (châssis `orbitOnly` → `inOrbit: true`).
- `refuel` : validation + consommation.

### 7.4 `tests/contracts.test.ts`
- v2 : état initial (1 navette Terre + pods, `version: 2`) ; un cycle
  Terre→Lune complet (aller, arrivée, stock déposé).

## 8. Consignation & livrables docs
- `docs/DATA.md` : §1.5 retirer la note « n'existe pas encore », aligner le
  schéma (`slotTotal`, `tankCap`, `build`, catégorie `transport`) ; §2
  `VesselRuntime` aligné (état `docked`, `mission`) ; corriger le commentaire
  `ResearchRuntime` (§2, backlog : « pool » → « un seul projet courant »).
- `docs/DECISIONS.md` : **K16** (implémentation transport : schéma vessels,
  actions, formule carburant, flotte de départ, réservoirs RE).
- `docs/TRACE.md` : **Session 24**.
- `docs/DASHBOARD.md` : badges §3 (Data model/sim v0.2), stats.
- Spec + plan dans `docs/superpowers/` (flux déjà en place).
- Un commit par fichier, français, `rtk git`, docs consignés à la fin du jalon
  (tâche consignation).

## 9. Périmètre de cette spec
Un seul jalon : data + types + actions + engine + tests + consignation.
Plan d'exécution détaillé via `docs/superpowers/plans/2026-09-18-vessels-transport.md`
(writing-plans), exécution subagent-driven sur `main` (consentement), portant
`data/vessels.json` (généré), `src/simulation/vessels.ts`, `state.ts`,
`engine.ts`, `src/actions/vessels.ts`, tests, docs.