# DATA — Modèle de données

> Version 0.2 — 2026-09-18
> Ce document définit la **forme des données** statiques (dans `data/`) et **dynamiques** (le `GameState`).

---

## 1. Données statiques (fichiers JSON dans `data/`)

> ⚠️ Les IDs des exemples §1.1-§1.4 (ex. « titane », « helium3 ») sont **illustratifs** (format cible v1) et ne constituent pas l'ensemble canonique : les IDs canoniques de ressources sont ceux de `data/resources.json` (anglais : `titanium`, `helium`, `meh_fuel`…).

### 1.1 `planets.json`

```jsonc
{
  "id": "luna",
  "name": "Lune",
  "parentId": "earth",          // orbite autour de… null = soleil
  "orbitRadius": 0.38,          // UA
  "type": "moon",               // planet | moon | asteroid | gaplanet
  "radius": 1737,               // km (cosmétique)
  "atmosphere": 0,              // 0..1
  "gravity": 0.16,              // g
  "temperature": -20,           // °C
  "habitability": 0.1,          // 0..1
  "gisements": [                // {(res}"/"quantity"
    { "resource": "titane", "quantity": 8000 },
    { "resource": "helium3", "quantity": 200 }
  ],
  "prospected": false,          // à explorer pour révéler les gisements
  "faction": null               // null | "humains" | "methanoides" | "hydroides" | "neutre"
}
```

### 1.2 `technologies.json`

```jsonc
{
  "id": "station_orbitale",
  "name": "Station orbitale",
  "category": "construction",
  "cost": 500,
  "prerequisites": [],
  "effects": ["unlock_structure:station_orbital"],
  "flavour": "Une plateforme en orbite. Premier pas vers les étoiles.",
  "capturable": false
}
```

### 1.3 `recipes.json`

```jsonc
{
  "id": "coque_vaisseau",
  "name": "Coque de vaisseau",
  "inputs": { "titane": 4, "carbone": 2 },
  "outputs": { "coque": 1 },
  "time": 6,                    // jours
  "requiresStructure": "chantier_spatial"
}
```

### 1.4 `structures.json`

```jsonc
{
  "id": "station_orbitale",
  "name": "Station orbitale",
  "cost": { "titane": 50, "carbone": 20, "palladium": 10 },
  "buildTime": 30,              // jours
  "storage": 5000,              // t — capacité de stockage de la structure (exemple) ; le plafond 50 000 t (GAMEPLAY §2.2) est par ressource, pas par bâtiment
  "energyProduction": 0,        // ou consommation
  "defense": 100,
  "humanSlots": 4,              // logement
  "autoSlots": 0
}
```

### 1.5 `vessels.json`

```jsonc
{
  "id": "ios",
  "name": "IOS (Interplanetary Ops)",
  "category": "transport",
  "capacity": 2500,               // t — masse maximale transportable
  "slots": { "tool": 1, "supply": 2, "cryo": 0 },
  "fuelType": "meh_fuel",         // meh_fuel (sol/intra) | hed_fuel (orbite/FTL)
  "fuelCostPerMassDay": 0.01,     // → coût = f(distance, masse)
  "range": "interplanetary",      // shuttle | intra | interplanetary | interstellar
  "travel": { "landDays": 2, "takeoffDays": 5, "repairDays": 2 }   // navette seulement
}
```

> Note : `data/vessels.json` n'existe pas encore ; ce bloc documente le format **cible** (v2 des data, implémentation sim future).

### 1.6 `events.json`

```jsonc
{
  "id": "contact_colonie",
  "idScript": "timeline",       // ou "dynamic"
  "trigger": { "day": 15 },
  "title": "Premier contact",
  "body": "…",
  "effects": [ { "type": "message", "value": "colonies_lointaines" } ],
  "choices": [                  // options possibles (si applicables)
    { "label": "Répondre", "effect": { "type": "threatMod", "value": -5 } }
  ]
}
```

### 1.7 `difficulties.json`

| id | label | startBonus | iaMult |
|---|---|---|---|
| discovery | Découverte | 0.5 | 0.6 |
| commander | Commandant | 0.2 | 1.0 |
| veteran | Vétéran | 0 | 1.4 |
| methanoid | Méthanoïde | -0.2 | 1.8 |

---

## 2. État dynamique (GameState)

```ts
interface GameState {
  version: number;
  seed: string;
  difficulty: DifficultyId;
  day: number;
  rng: RngState;                    // état du PRNG pour le déterminisme
  resources: Record<ResourceId, number>;          // pool mondial
  planets: PlanetRuntime[];         // état par corps (gisements restants, prospection…)
  structures: StructureRuntime[];
  vessels: VesselRuntime[];
  queues: ManufacturingQueue[];
  research: ResearchRuntime;        // pool, projets actifs, techs débloquées
  personnel: PersonnelRecord[];
  fleetPlan: FleetOrder[];
  combats: CombatInstance[];
  newsFeed: NewsItem[];
  threat: number;                   // niveau menace Méthanoïde
  flags: Record<string, boolean>;   // drapeaux scénario
  autosave: number;                 // prochain jour de save
}
```

Exemples de types runtime :
```ts
type StructureRuntime = {
  id: string;
  templateId: string;         // référence data/structures.json
  site: { planetId: string; surface: boolean };
  health: number;
  automaton: boolean;
  queue: { list: RecipeRef[] };
  storage: Record<ResourceId, number>;   // stock local
  activeMine?: { resource: ResourceId; daily: number };
};

type VesselRuntime = {
  id: string;
  templateId: string;         // référence data/vessels.json (cible)
  position: Position;         // { kind: "orbiting", planetId } | { kind: "transit", from, to, progress }
  modules: CargoSlot[];       // slots : 1 cargaison homogène par slot
  fuel: number;               // niveau de carburant restant (MeH/HeD)
  fuelType: "meh_fuel" | "hed_fuel";
  orders: Order[];            // envoi manuel ou routes de ravitaillement
  health: number;
};

type CargoSlot = {
  kind: "supply" | "tool" | "cryo";
  itemId?: string;            // ressource (supply) ou item (tool)
  quantity: number;           // max 250/chargement pour supply ; 1 équipe pour cryo
  crewTeamId?: string;        // si cryo
};
```

> **Détection de défaite** (GameState) : les conditions GAMEPLAY §10 se lisent dans l'état — `flags` (Terre-Ville perdue, segments endommagés), état des installations de production (`caution` des structures), unités de combat opérationnelles (flotte). L'implémentation exacte relève de la sim (EPIC future).

---

## 3. Contraintes de cohérence

1. **Chaque ID est unique** (uuid local) pour les entités runtime.
2. **Les templates sont immutables** — jamais copiés dans le state.
3. **Le versionnage** : tout changement de structure de state incrémente `version` et exige une migration dans `src/simulation/save.ts`.
4. **Les quantités** sont des entiers (pas de virgule flottante — évite les bugs d'arrondi économie).
5. **Le RNG** est sérialisé dans le state pour pouvoir rejouer exactement.

---

## 4. Roadmap de données (ordre de création)

1. **v1 (MVP)** : planètes du système solaire, 6 ressources, 10 techs, 8 recettes, 3 structures, 4 vaisseaux, timeline minimale.
2. **v2** : ceinture d'astéroïdes détaillée, gaz géants, techs FTL, rétro-ingénierie.
3. **v3** : systèmes extrasolaires, factions secondaires (Hydroïdes), événements dynamiques riches.