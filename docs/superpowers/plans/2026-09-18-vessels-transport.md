# Transport pods/slots jouable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le transport jouable : `data/vessels.json` (3 vaisseaux canon), `GameState.vessels` (version 2), actions `buildVessel`/`refuel`/`sendCargo`, et résolution des voyages dans `dayTick` avec déchargement automatique.

**Architecture:** Module `src/simulation/vessels.ts` (helpers purs : masse, plan de chargement, carburant, arrivée) + `src/simulation/vessels.ts` orchestration état ; actions dans `src/actions/vessels.ts` (interface `Action` existante) ; phase Navigation ajoutée dans `dayTick` (avant combat). `Fleet`/combat intacts. TDD, français, un commit par tâche.

**Tech Stack:** TypeScript strict (`noUnusedLocals`), vitest (`npm run test:run`, alias `@/` → `src/`), eslint (`npm run lint`), data générés par `scripts/generate_data.py` (Python).

## Global Constraints

- Prose et messages de commit en français.
- `npm run lint` et `npm run test:run` verts à chaque fin de tâche (tsc/build ne couvre que `src/`, mais `noUnusedLocals` est actif : pas d'import inutilisé).
- Ne jamais modifier les signatures/gates existantes (contrat v0, 111 tests). `Fleet`, `travel.ts`, `combat.ts`, `enemy.ts` non retouchés excepté exports `index.ts`.
- JSON générés : exécuter `python3 scripts/generate_data.py` puis vérifier le `git diff` des `data/*.json` (idempotent, sans `\r`).
- Commits via `rtk git …`. Un commit par tâche (test + implémentation ensemble).
- Valeurs canon verrouillées (spec `2026-09-18-vessels-transport-design.md`) : navette cap 100 / tank 100 MeH / manœuvres 5+2 ; IOS cap 2500 / tank 250 MeH / slots 1 tool + 2 supply ; SCG cap 5000 / tank 250 HeD / slots 1 tool + 2 supply ; ressources = 1 t/unité ; carburant `max(1, ceil(d × (100 + masse)/100))` ; stockage via `CONFIG.FUEL_MASS_FACTOR = 100`, `CONFIG.SUPPLY_SLOT_MAX = 250` ; cap stockage 50 000 = `MINE_STOCK_CAP`.

---

### Task 1: Données statiques — masse ressources + `vessels.json` + accès typé

**Files:**
- Modify: `scripts/generate_data.py` (RESOURCES mass + section vessels)
- Generate: `data/resources.json` (ajout `mass`), `data/vessels.json` (nouveau)
- Modify: `src/simulation/data.ts` (`ResourceDef.mass`, `SlotKind`, `VesselDef`, `VESSELS`, `VESSEL_BY_ID`, `getVessel`)
- Modify: `src/simulation/index.ts` (exports data vaisseaux)
- Test: `tests/data.test.ts`

**Interfaces:**
- Produces: `data.ts` exporte `VESSELS: VesselDef[]`, `VESSEL_BY_ID: Record<string, VesselDef>`, `getVessel(id: string): VesselDef` ; `types SlotsKind = 'supply'|'tool'|'cryo'`, `VesselDef` (champs spec §3.1). Utilisés par toutes les tâches suivantes.

- [ ] **Step 1 : Test d'invariants — écrire le cas qui échoue**

Ajouter à `tests/data.test.ts` :

```ts
describe('resources.json — masse unitaire (spec transport §3.0)', () => {
  it('chaque ressource a une masse de 1 t/unité', () => {
    for (const r of RESOURCES) expect(r.mass).toBe(1);
  });
});

describe('vessels.json (spec transport §3.1)', () => {
  it('contient les 3 vaisseaux canoniques', () => {
    expect(VESSELS.map((v) => v.id)).toEqual(['shuttle', 'ios', 'scg']);
  });

  it('capacités, slots, slotTotal et ranges canon (GAMEPLAY §5.2)', () => {
    expect(VESSEL_BY_ID['shuttle']).toMatchObject({
      capacity: 100, slots: { supply: 1, tool: 1 }, slotTotal: 1, range: 'intrasolar',
    });
    expect(VESSEL_BY_ID['ios']).toMatchObject({
      capacity: 2500, slots: { supply: 2, tool: 1 }, slotTotal: 3, range: 'interplanetary',
    });
    expect(VESSEL_BY_ID['scg']).toMatchObject({
      capacity: 5000, slots: { supply: 2, tool: 1 }, slotTotal: 3, range: 'interstellar',
    });
  });

  it('carburant et réservoirs canon (ACC.cs)', () => {
    expect(VESSEL_BY_ID['shuttle'].fuelType).toBe('meh_fuel');
    expect(VESSEL_BY_ID['shuttle'].tankCap).toBe(100);
    expect(VESSEL_BY_ID['ios'].fuelType).toBe('meh_fuel');
    expect(VESSEL_BY_ID['ios'].tankCap).toBe(250);
    expect(VESSEL_BY_ID['scg'].fuelType).toBe('hed_fuel');
    expect(VESSEL_BY_ID['scg'].tankCap).toBe(250);
  });

  it('manœuvres sol uniquement pour la navette', () => {
    expect(VESSEL_BY_ID['shuttle'].travel).toEqual({ landDays: 2, takeoffDays: 5, repairDays: 2 });
    expect(VESSEL_BY_ID['ios'].travel).toBeNull();
    expect(VESSEL_BY_ID['scg'].travel).toBeNull();
  });

  it('châssis/drives et pods référencés existent dans ITEMS', () => {
    for (const v of VESSELS) {
      expect(ITEM_BY_ID[v.build.chassis]).toBeDefined();
      expect(ITEM_BY_ID[v.build.drive]).toBeDefined();
    }
    for (const pod of ['supply_pod', 'tool_pod', 'cryo_pod']) expect(ITEM_BY_ID[pod]).toBeDefined();
  });

  it('les carburants de vaisseaux sont des ressources composées connues', () => {
    for (const v of VESSELS) {
      const def = RESOURCE_BY_ID[v.fuelType];
      expect(def).toBeDefined();
      expect(def.type).toBe('compound_fuel');
    }
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run tests/data.test.ts`
Expected: erreur (module `../data/vessels.json` introuvable et/ou `VESSELS`/`RESOURCE_BY_ID…` manquants). TS n'exécutera pas : l'import de `vessels.json` dans `data.ts` doit exister d'abord pour… — en pratique, compiler l'extension .ts via vitest d'abord ; l'échec attendu est « Cannot find module '../data/vessels.json' ».

- [ ] **Step 3 : Générer les données**

Dans `scripts/generate_data.py` :

1. Transformer `RESOURCES` en tuples à 5 éléments (rajout de la masse unitaire, spec §3.0) :

```python
RESOURCES = [
    ("iron", "Fer", "Fe", "raw", 1),
    ("titanium", "Titane", "Ti", "raw", 1),
    ("aluminium", "Aluminium", "Al", "raw", 1),
    ("carbon", "Carbone", "C", "raw", 1),
    ("copper", "Cuivre", "Cu", "raw", 1),
    ("hydrogen", "Hydrogène", "H", "raw", 1),
    ("deuterium", "Deutérium", "D", "raw", 1),
    ("methane", "Méthane", "CH4", "raw", 1),
    ("helium", "Hélium", "He", "raw", 1),
    ("palladium", "Palladium", "Pd", "precious", 1),
    ("platinum", "Platine", "Pt", "precious", 1),
    ("silver", "Argent", "Ag", "precious", 1),
    ("gold", "Or", "Au", "precious", 1),
    ("silica", "Silice", "Si", "raw", 1),
    ("meh_fuel", "Carburant MeH", "MeH", "compound_fuel", 1),
    ("hed_fuel", "Carburant HeD", "HeD", "compound_fuel", 1),
]
```

2. Dans `main()`, écrire la `mass` dans les entrées `resources.json` :

```python
        "resources": [
            {"id": rid, "name": name, "symbol": sym, "type": typ, "mass": mass,
             "minable": typ in ("raw", "precious"),
             "derrickRate": 2 if rid in ("iron", "titanium", "aluminium", "carbon", "copper", "silica") else 1,
             "surveyMultiplier": {"helium": 4, "platinum": 2, "silver": 2, "gold": 3}.get(rid, 1)}
            for rid, name, sym, typ, mass in RESOURCES
        ],
```

3. Ajouter la section `vessels.json` dans `main()` (après la section `items.json`, avant `planets.json`), avec en dur les 3 vaisseaux canon :

```python
    # --- vessels.json (spec 2026-09-18-vessels-transport-design.md §3.1) ---
    VESSELS = [
        dict(id="shuttle", name="Navette", capacity=100,
             slots={"supply": 1, "tool": 1}, slotTotal=1,
             fuelType="meh_fuel", tankCap=100, range="intrasolar",
             travel={"landDays": 2, "takeoffDays": 5, "repairDays": 2},
             build={"chassis": "s_chassis", "drive": "s_drive"}),
        dict(id="ios", name="IOS (Interplanetary Ops)", capacity=2500,
             slots={"supply": 2, "tool": 1}, slotTotal=3,
             fuelType="meh_fuel", tankCap=250, range="interplanetary",
             travel=None,
             build={"chassis": "i_chassis", "drive": "i_drive"}),
        dict(id="scg", name="SCG (FTL)", capacity=5000,
             slots={"supply": 2, "tool": 1}, slotTotal=3,
             fuelType="hed_fuel", tankCap=250, range="interstellar",
             travel=None,
             build={"chassis": "g_chassis", "drive": "star_drive"}),
    ]
    vessels_doc = {
        "meta": {"version": 1,
                 "source": "GAMEPLAY v0.2 §5.2; ACC.cs/Enums.cs/Ship.cs (remake, clone local d252446f079fc4e7de766f28a22509bd71ed1023)"},
        "vessels": VESSELS,
    }
    (DATA / "vessels.json").write_text(json.dumps(vessels_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
```

4. Mettre à jour le rapport final (une ligne `print`) pour mentionner `vessels.json`.

Run: `python3 scripts/generate_data.py`
Expected: crée `data/vessels.json`, ajoute `"mass": 1` aux 16 ressources, autres fichiers inchangés.

- [ ] **Step 4 : Exposer les données typées**

Dans `src/simulation/data.ts` :

```ts
import rawVessels from '../../data/vessels.json';
// après import rawPlanets
```

Renforcer `ResourceDef` (ajouter `mass`) et ajouter les types vaisseaux après `ItemDef` :

```ts
export interface ResourceDef {
  id: ResourceId;
  name: string;
  symbol: string;
  type: 'raw' | 'precious' | 'compound_fuel';
  minable: boolean;
  derrickRate: number;
  surveyMultiplier: number;
  mass: number; // spec transport §3.0 : 1 t/unité
}

export interface VesselDef {
  id: string;
  name: string;
  category: 'transport';
  capacity: number;
  slots: Partial<Record<SlotKind, number>>;
  slotTotal: number;
  fuelType: ResourceId;
  tankCap: number;
  range: 'intrasolar' | 'interplanetary' | 'interstellar';
  travel: { landDays: number; takeoffDays: number; repairDays: number } | null;
  build: { chassis: string; drive: string };
}
```

Import `SlotKind` depuis `./types` (exporté au Task 2 — pour garder la compilation verte ici, définir d'abord le type dans `types.ts` de façon minimale ; voir « Step 1 du Task 2 ») puis :

```ts
export const VESSELS = rawVessels.vessels as VesselDef[];
export const VESSEL_BY_ID = byId(VESSELS);

export function getVessel(id: string): VesselDef {
  const v = VESSEL_BY_ID[id];
  if (!v) throw new Error(`Vaisseau inconnu : ${id}`);
  return v;
}
```

Dans `src/simulation/types.ts`, ajouter en tête (nécessaire pour `data.ts`) :

```ts
export type SlotKind = 'supply' | 'tool' | 'cryo';
```

Dans `src/simulation/index.ts`, ajouter :

```ts
export { VESSELS, VESSEL_BY_ID, getVessel } from './data';
export type { VesselDef } from './data';
```

- [ ] **Step 5 : Vérifier que tout passe**

Run: `npm run test:run tests/data.test.ts && npm run lint`
Expected: tous les tests data verts (nouveaux + invariants existants), eslint sans arborescence d'erreurs.

- [ ] **Step 6 : Commit**

```bash
rtk git add scripts/generate_data.py data/resources.json data/vessels.json src/simulation/data.ts src/simulation/types.ts src/simulation/index.ts tests/data.test.ts
rtk git commit -m "feat(data): ships 3 vaisseaux canon + masse 1t/unité des ressources (spec transport)"
```

---

### Task 2: Types runtime + état initial v2 (`vessels`, pods de départ)

**Files:**
- Modify: `src/simulation/types.ts` (`VesselState`, `CargoSlot`, `VesselMission`, `VesselRuntime`, `GameState.version`, `GameState.vessels`, `DayTickResult.arrived`)
- Modify: `src/simulation/state.ts` (navette de départ + pods Terre, `version: 2`)
- Modify: `src/simulation/engine.ts` (ajout `arrived: []` dans le résultat)
- Modify: `src/simulation/index.ts`
- Test: `tests/state.test.ts`

**Interfaces:**
- Consumes: `VESSEL_BY_ID`, `ResourceId` (déjà présents).
- Produces: `GameState.vessels: VesselRuntime[]`, `version: 2`, `DayTickResult.arrived: Array<{ vesselId; planetId }>`.

- [ ] **Step 1 : Test initial — écrire les cas qui échouent**

Dans `tests/state.test.ts` :

```ts
import { createInitialState } from '@/simulation';

describe('état initial transport v2 (spec §4.7)', () => {
  it('démarre en version 2 avec 1 navette dockée à Terre', () => {
    const s = createInitialState(1);
    expect(s.version).toBe(2);
    expect(s.vessels).toHaveLength(1);
    const v = s.vessels[0];
    expect(v).toMatchObject({
      id: 'shuttle-1', templateId: 'shuttle', planetId: 'earth',
      inOrbit: false, state: 'docked', fuel: 0, fuelType: 'meh_fuel', health: 100,
    });
    expect(v.mission).toBeNull();
    expect(v.slots).toEqual([{ kind: 'supply', itemId: null, quantity: 0 }]);
  });

  it('les 3 pods de départ sont en stock Terre', () => {
    const s = createInitialState(1);
    expect(s.planets.earth.items['supply_pod']).toBe(1);
    expect(s.planets.earth.items['tool_pod']).toBe(1);
    expect(s.planets.earth.items['cryo_pod']).toBe(1);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run tests/state.test.ts`
Expected: FAIL — `version` vaut 1, `vessels` n'existe pas.

- [ ] **Step 3 : Types runtime**

Dans `src/simulation/types.ts` (compléter depuis Task 1 ; `SlotKind` déjà ajouté) :

```ts
export type SlotKind = 'supply' | 'tool' | 'cryo';
export type VesselState = 'docked' | 'taking_off' | 'in_transit' | 'landing' | 'docking' | 'launching';

/** Emplacement de pod monté (kind fixé par le pod) — spec transport §4.1. */
export interface CargoSlot {
  kind: SlotKind;
  itemId: string | null; // null = emplacement vide ; ressource (supply) ou item toolPod (tool)
  quantity: number;      // > 0 si rempli ; ≤ 250 pour supply
}

export interface VesselMission {
  fromPlanetId: string;
  toPlanetId: string;
  startDay: number;
  arrivalDay: number; // jour d'arrivée inclus (manœuvres incluses)
  fuelCost: number;
}

export interface VesselRuntime {
  id: string;
  templateId: string;
  planetId: string;
  inOrbit: boolean; // amarré en station vs base planétaire
  state: VesselState;
  slots: CargoSlot[];
  fuel: number;
  fuelType: ResourceId;
  mission: VesselMission | null;
  health: number;
}
```

Dans `GameState` : remplacer `version: 1;` par `version: 2;` et ajouter `vessels: VesselRuntime[];` (entre `battles` et `atWar` par exemple).
Dans `DayTickResult` : ajouter `arrived: Array<{ vesselId: string; planetId: string }>;`.

- [ ] **Step 4 : État initial**

Dans `src/simulation/state.ts` :

```ts
import { VESSEL_BY_ID } from './data';
import type { GameState, PlanetRuntime, ResearchState, VesselRuntime } from './types';
```

Ajouter une fabrique de navette de départ et brancher dans `createInitialState` :

```ts
function createStarterShuttle(): VesselRuntime {
  return {
    id: 'shuttle-1',
    templateId: 'shuttle',
    planetId: 'earth',
    inOrbit: false,
    state: 'docked',
    slots: [{ kind: 'supply', itemId: null, quantity: 0 }], // pod supply monté, vide
    fuel: 0,
    fuelType: VESSEL_BY_ID['shuttle'].fuelType,
    mission: null,
    health: 100,
  };
}
```

Dans `createInitialState`, après la ligne `planets.earth.factory.inOrbit = false; // usine au sol` :

```ts
  // Flotte de départ (spec transport §4.7) : 1 navette + 3 pods en stock.
  const earthItems = planets.earth.items;
  earthItems['supply_pod'] = (earthItems['supply_pod'] ?? 0) + 1;
  earthItems['tool_pod'] = (earthItems['tool_pod'] ?? 0) + 1;
  earthItems['cryo_pod'] = (earthItems['cryo_pod'] ?? 0) + 1;
```

Dans le `return` : `version: 2,` et `vessels: [createStarterShuttle()],`.

Dans `src/simulation/engine.ts`, dans le littéral `result` de `dayTick`, ajouter `arrived: [],` (sinon type error).

- [ ] **Step 5 : Exports**

Dans `src/simulation/index.ts`, compléter les export de types :

```ts
export type {
  GameState, PlanetRuntime, Factory, Staff, StaffType, ResearchState, TrainingState,
  Fleet, Battle, DayTickResult, ResearchDayResult, ProductionDayResult,
  SlotKind, VesselState, CargoSlot, VesselMission, VesselRuntime,
} from './types';
```

- [ ] **Step 6 : Vérifier**

Run: `npm run test:run && npm run lint && npm run build`
Expected: tout vert (les 111 tests historiques restent verts — aucun n'assertionne `version` ; `npm run build` doit passer : tsc couvre `src/`, `noUnusedLocals` actif → pas d'import inutilisé).

- [ ] **Step 7 : Commit**

```bash
rtk git add src/simulation/types.ts src/simulation/state.ts src/simulation/engine.ts src/simulation/index.ts tests/state.test.ts
rtk git commit -m "feat(sim): état v2 — flotte joueur (navette + pods), arrivées dans le résultat de tick"
```

---

### Task 3: Logique transport pure (`src/simulation/vessels.ts`)

**Files:**
- Create: `src/simulation/vessels.ts`
- Modify: `src/simulation/config.ts` (`FUEL_MASS_FACTOR`, `SUPPLY_SLOT_MAX`)
- Modify: `src/simulation/index.ts`
- Test: `tests/vessels.test.ts`

**Interfaces:**
- Produces (consommés par Task 4 et 5) :
  - `cargoUnitMass(itemId: string): number`
  - `cargoSlotKind(itemId: string): SlotKind | null`
  - `loadedMass(vessel: VesselRuntime): number`
  - `fuelCost(distance: number, mass: number): number`
  - `emptySlots(vessel: VesselRuntime, kind: SlotKind): CargoSlot[]`
  - `planSupplyLoad(vessel, itemId, quantity): { ok: true; slots: CargoSlot[] } | { ok: false; reason: string }`
  - `planToolLoad(vessel, itemId, quantity): { ok: true; slots: CargoSlot[] } | { ok: false; reason: string }`
  - `vesselArrivalDay(templateId, fromPlanetId, toPlanetId, startDay): number`

- [ ] **Step 1 : Tests — écrire les cas qui échouent**

Créer `tests/vessels.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { createInitialState, RESOURCE_BY_ID } from '@/simulation';
import {
  cargoUnitMass, cargoSlotKind, fuelCost, loadedMass, emptySlots,
  planSupplyLoad, planToolLoad, vesselArrivalDay,
} from '@/simulation/vessels';

const shuttle = () => createInitialState(1).vessels[0];

describe('cargo (spec transport §3.0/§4.2.3)', () => {
  it('ressource brute → supply, item toolPod → tool, autre → null', () => {
    expect(cargoSlotKind('iron')).toBe('supply');
    expect(cargoSlotKind('derrick')).toBe('tool');
    expect(cargoSlotKind('meh_fuel')).toBeNull();   // carburant non transportable
    expect(cargoSlotKind('supply_pod')).toBeNull(); // pod non transportable
  });

  it('masse : ressource 1 t/unité, item = ItemDef.mass', () => {
    expect(cargoUnitMass('iron')).toBe(1);
    expect(cargoUnitMass('derrick')).toBe(8);
    expect(cargoUnitMass('meh_fuel')).toBe(RESOURCE_BY_ID['meh_fuel'].mass);
  });
});

describe('fuelCost (spec §4.5)', () => {
  it('à vide, vaut la distance', () => {
    expect(fuelCost(1, 0)).toBe(1);
    expect(fuelCost(7, 0)).toBe(7);
  });
  it('à pleine charge (masse = facteur), double la distance', () => {
    expect(fuelCost(1, 100)).toBe(2);
  });
  it('arrondit au supérieur et ne descend jamais sous 1', () => {
    expect(fuelCost(1, 50)).toBe(2);  // ceil(150/100)
    expect(fuelCost(1, 149)).toBe(3); // ceil(249/100)
    expect(fuelCost(0, 0)).toBe(1);
  });
});

describe('plan de chargement (spec §4.2.6)', () => {
  it('supply : remplit un emplacement ≤ 250, refuse si masse > capacité', () => {
    const v = shuttle(); // navette : 1 emplacement supply monté, capacité 100
    expect(planSupplyLoad(v, 'iron', 100)).toEqual({
      ok: true, slots: [{ kind: 'supply', itemId: 'iron', quantity: 100 }],
    });
    expect(planSupplyLoad(v, 'iron', 101)).toEqual({ ok: false, reason: 'no_capacity' });
  });

  it('supply : répartit sur plusieurs emplacements (IOS 2×250)', () => {
    const s = createInitialState(1);
    const v = s.vessels[0];
    v.templateId = 'ios';
    v.slots = [
      { kind: 'supply', itemId: null, quantity: 0 },
      { kind: 'supply', itemId: null, quantity: 0 },
      { kind: 'tool', itemId: null, quantity: 0 },
    ];
    expect(planSupplyLoad(v, 'iron', 400)).toEqual({
      ok: true,
      slots: [
        { kind: 'supply', itemId: 'iron', quantity: 250 },
        { kind: 'supply', itemId: 'iron', quantity: 150 },
      ],
    });
  });

  it('tool : un emplacement, quantité bornée par la masse', () => {
    const v = shuttle();
    v.slots = [{ kind: 'tool', itemId: null, quantity: 0 }];
    expect(planToolLoad(v, 'derrick', 12)).toEqual({
      ok: true, slots: [{ kind: 'tool', itemId: 'derrick', quantity: 12 }],
    }); // 12 × 8 = 96 ≤ 100
    expect(planToolLoad(v, 'derrick', 13)).toEqual({ ok: false, reason: 'no_capacity' });
  });

  it('refuse s&#39;il n&#39;y a aucun emplacement du type requis', () => {
    const v = shuttle();
    v.slots = [{ kind: 'tool', itemId: null, quantity: 0 }];
    expect(planSupplyLoad(v, 'iron', 10)).toEqual({ ok: false, reason: 'no_supply_slots' });
  });
});

describe('durée de voyage (spec §4.4)', () => {
  it('navette : takeoff 5 + trajet + atterrissage 2', () => {
    // earth → the_moon : trajet 2 (order 2 → 0)
    expect(vesselArrivalDay('shuttle', 'earth', 'the_moon', 1)).toBe(10); // 1+5+2+2
  });
  it('IOS/SCG : trajet seul', () => {
    expect(vesselArrivalDay('ios', 'earth', 'the_moon', 1)).toBe(3); // 1+2
  });
});
```

> Note : la coquille `&#39;` ci-dessus = apostrophe, écrire `refuse s'il n'y a aucun emplacement du type requis`.

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run tests/vessels.test.ts`
Expected: FAIL — module `@/simulation/vessels` introuvable.

- [ ] **Step 3 : Constantes**

Dans `src/simulation/config.ts`, dans `SIM_CONFIG`, bloc Voyage :

```ts
  FUEL_MASS_FACTOR: 100, // spec transport §4.5 : carburant = ceil(d × (100 + masse) / 100)
  SUPPLY_SLOT_MAX: 250,  // charge max par emplacement supply (GAMEPLAY §2.3 / ACC.cs)
  SHUTTLE_LAND_DAYS: 2,
```

- [ ] **Step 4 : Implémentation**

Créer `src/simulation/vessels.ts` :

```ts
/**
 * Logique transport pods/slots (spec 2026-09-18-vessels-transport-design.md §4).
 * Fonctions pures consommées par les actions (Task 4) et le moteur (Task 5).
 */
import { SIM_CONFIG } from './config';
import { ITEM_BY_ID, RESOURCE_BY_ID, getVessel } from './data';
import { travelDays } from './travel';
import type { CargoSlot, SlotKind, VesselRuntime } from './types';

/** Masse unitaire d'une cargaison : ressource = 1 t/unité, item = ItemDef.mass. */
export function cargoUnitMass(itemId: string): number {
  const res = RESOURCE_BY_ID[itemId];
  if (res) return res.mass;
  const it = ITEM_BY_ID[itemId];
  if (it) return it.mass;
  throw new Error(`Cargaison inconnue : ${itemId}`);
}

/**
 * Type d'emplacement requis pour une cargaison :
 * ressource brute/précieuse → 'supply' ; item à flag toolPod → 'tool' ; sinon null.
 */
export function cargoSlotKind(itemId: string): SlotKind | null {
  const res = RESOURCE_BY_ID[itemId];
  if (res && res.type !== 'compound_fuel') return 'supply';
  const it = ITEM_BY_ID[itemId];
  if (it && it.toolPod) return 'tool';
  return null;
}

/** Masse actuellement chargée (t). */
export function loadedMass(vessel: VesselRuntime): number {
  return vessel.slots.reduce(
    (sum, s) => (s.quantity > 0 && s.itemId ? sum + s.quantity * cargoUnitMass(s.itemId) : sum),
    0,
  );
}

/** Carburant requis : max(1, ceil(distance × (100 + masse) / 100)). */
export function fuelCost(distance: number, mass: number): number {
  return Math.max(1, Math.ceil((distance * (SIM_CONFIG.FUEL_MASS_FACTOR + mass)) / SIM_CONFIG.FUEL_MASS_FACTOR));
}

/** Emplacements libres (itemId null ou quantité 0) d'un type donné. */
export function emptySlots(vessel: VesselRuntime, kind: SlotKind): CargoSlot[] {
  return vessel.slots.filter((s) => s.kind === kind && (s.itemId === null || s.quantity === 0));
}

/**
 * Plan de chargement d'une ressource (supply) : remplit des emplacements vides
 * ≤ 250 chacun, charge EXACTEMENT `quantity`, masse totale ≤ capacité. Sinon raison.
 */
export function planSupplyLoad(
  vessel: VesselRuntime,
  itemId: string,
  quantity: number,
): { ok: true; slots: CargoSlot[] } | { ok: false; reason: string } {
  const def = getVessel(vessel.templateId);
  const free = emptySlots(vessel, 'supply');
  if (free.length === 0) return { ok: false, reason: 'no_supply_slots' };
  const perSlot = SIM_CONFIG.SUPPLY_SLOT_MAX; // 250 max par emplacement supply
  const headroom = def.capacity - loadedMass(vessel);
  if (quantity > Math.floor(headroom / cargoUnitMass(itemId))) {
    return { ok: false, reason: 'no_capacity' };
  }
  const slots: CargoSlot[] = [];
  let remaining = quantity;
  for (const s of free) {
    if (remaining <= 0) break;
    const fill = Math.min(remaining, perSlot);
    slots.push({ kind: 'supply', itemId, quantity: fill });
    remaining -= fill;
  }
  if (remaining > 0) return { ok: false, reason: 'no_capacity' };
  return { ok: true, slots };
}

/**
 * Plan de chargement d'un item (tool) : un emplacement tool, `quantity` items,
 * masse totale ≤ capacité ; renvoie la quantité maximale sinon. Exactitude exigée.
 */
export function planToolLoad(
  vessel: VesselRuntime,
  itemId: string,
  quantity: number,
): { ok: true; slots: CargoSlot[] } | { ok: false; reason: string } {
  const def = getVessel(vessel.templateId);
  const free = emptySlots(vessel, 'tool');
  if (free.length === 0) return { ok: false, reason: 'no_tool_slots' };
  const headroom = def.capacity - loadedMass(vessel);
  const per = Math.floor(headroom / cargoUnitMass(itemId));
  if (quantity > per) return { ok: false, reason: 'no_capacity' };
  return { ok: true, slots: [{ kind: 'tool', itemId, quantity }] };
}

/** Jour d'arrivée inclus : startDay + manœuvres (takeoff + land si navette) + trajet. */
export function vesselArrivalDay(
  templateId: string,
  fromPlanetId: string,
  toPlanetId: string,
  startDay: number,
): number {
  const def = getVessel(templateId);
  const travel = travelDays(fromPlanetId, toPlanetId);
  if (def.travel) return startDay + def.travel.takeoffDays + travel + def.travel.landDays;
  return startDay + travel;
}
```

- [ ] **Step 5 : Exports**

Dans `src/simulation/index.ts` :

```ts
export { fuelCost, planSupplyLoad, planToolLoad, cargoUnitMass, cargoSlotKind, loadedMass, emptySlots, vesselArrivalDay } from './vessels';
```

- [ ] **Step 6 : Vérifier**

Run: `npm run test:run tests/vessels.test.ts && npm run lint && npm run build`
Expected: vert (attention à la correction `perSlot` de la note Step 4).

- [ ] **Step 7 : Commit**

```bash
rtk git add src/simulation/vessels.ts src/simulation/config.ts src/simulation/index.ts tests/vessels.test.ts
rtk git commit -m "feat(sim): logique transport pure — carburant, plan de charge pods/slots, arrivée"
```

---

### Task 4: Actions `buildVessel`, `refuel`, `sendCargo`

**Files:**
- Create: `src/actions/vessels.ts`
- Modify: `src/actions/index.ts`
- Test: `tests/actions-vessels.test.ts`

**Interfaces:**
- Consumes: Task 3 (`cargoSlotKind`, `planSupplyLoad`, `planToolLoad`, `fuelCost`, `loadedMass`, `vesselArrivalDay`), Task 2 (`VesselRuntime`, `GameState.vessels`), `travelDays`, `getBody`, `pushBulletin`.
- Produces (exportés via `@/actions`) : `buildVessel: Action<BuildVesselArgs>`, `refuel: Action<{ vesselId }>`, `sendCargo: Action<SendCargoArgs>` avec `BuildVesselArgs = { planetId: string; templateId: string; pods?: SlotKind[] }` et `SendCargoArgs = { vesselId: string; itemId: string; quantity: number; toPlanetId: string }`.

- [ ] **Step 1 : Tests — écrire les cas qui échouent**

Créer `tests/actions-vessels.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { createInitialState, createPlanetRuntime, fuelCost } from '@/simulation';
import { runAction, buildVessel, refuel, sendCargo } from '@/actions';

describe('buildVessel (spec §4.2)', () => {
  it('construit une navette au sol en consommant châssis, drive et pod supply', () => {
    const s = createInitialState(1);
    s.planets.earth.items = { s_chassis: 1, s_drive: 1, supply_pod: 2, tool_pod: 1, cryo_pod: 1 };
    const r = runAction(buildVessel, s, { planetId: 'earth', templateId: 'shuttle' });
    expect(r.ok).toBe(true);
    expect(s.planets.earth.items['s_chassis']).toBe(0);
    expect(s.planets.earth.items['s_drive']).toBe(0);
    expect(s.planets.earth.items['supply_pod']).toBe(1);
    expect(s.vessels).toHaveLength(2);
    expect(s.vessels[1]).toMatchObject({ templateId: 'shuttle', planetId: 'earth', inOrbit: false, state: 'docked', fuel: 0 });
    expect(s.vessels[1].slots).toEqual([{ kind: 'supply', itemId: null, quantity: 0 }]);
  });

  it('refuse sans les pièces', () => {
    const s = createInitialState(1);
    expect(runAction(buildVessel, s, { planetId: 'earth', templateId: 'shuttle' }))
      .toEqual({ ok: false, reason: 'missing_parts' });
  });

  it('refuse un IOS sans usine orbitale', () => {
    const s = createInitialState(1);
    s.planets.earth.items = { i_chassis: 1, i_drive: 1, tool_pod: 1, supply_pod: 2 };
    expect(runAction(buildVessel, s, { planetId: 'earth', templateId: 'ios' }))
      .toEqual({ ok: false, reason: 'orbit_required' });
  });

  it('construit un IOS au nœud orbital quand une usine est en orbite', () => {
    const s = createInitialState(1);
    s.planets.earth.factory.inOrbit = true;
    s.planets.earth.items = { i_chassis: 1, i_drive: 1, tool_pod: 1, supply_pod: 2 };
    const r = runAction(buildVessel, s, { planetId: 'earth', templateId: 'ios' });
    expect(r.ok).toBe(true);
    expect(s.vessels[1].inOrbit).toBe(true);
    expect(s.vessels[1].slots).toEqual([
      { kind: 'tool', itemId: null, quantity: 0 },
      { kind: 'supply', itemId: null, quantity: 0 },
      { kind: 'supply', itemId: null, quantity: 0 },
    ]);
    expect(s.planets.earth.items['i_chassis']).toBe(0);
  });

  it('monte un pod tool quand pods: ["tool"]', () => {
    const s = createInitialState(1);
    s.planets.earth.items = { s_chassis: 1, s_drive: 1, supply_pod: 1, tool_pod: 1, cryo_pod: 1 };
    const r = runAction(buildVessel, s, { planetId: 'earth', templateId: 'shuttle', pods: ['tool'] });
    expect(r.ok).toBe(true);
    expect(s.vessels[1].slots).toEqual([{ kind: 'tool', itemId: null, quantity: 0 }]);
    expect(s.planets.earth.items['tool_pod']).toBe(0);
  });
});

describe('refuel (spec §4.2)', () => {
  it('remplit le réservoir depuis le stock de carburant, plafonné tankCap', () => {
    const s = createInitialState(1);
    s.planets.earth.items['meh_fuel'] = 250;
    const r = runAction(refuel, s, { vesselId: 'shuttle-1' });
    expect(r.ok).toBe(true);
    expect(s.vessels[0].fuel).toBe(100); // tankCap navette
    expect(s.planets.earth.items['meh_fuel']).toBe(150);
  });

  it('conserve l\'excédent du stock si le réservoir est petit', () => {
    const s = createInitialState(1);
    s.planets.earth.items['meh_fuel'] = 30;
    runAction(refuel, s, { vesselId: 'shuttle-1' });
    expect(s.vessels[0].fuel).toBe(30);
    expect(s.planets.earth.items['meh_fuel']).toBe(0);
  });

  it('refuse vaisseau inconnu, en transit, réservoir plein ou sans carburant', () => {
    const s = createInitialState(1);
    expect(runAction(refuel, s, { vesselId: 'nope' })).toEqual({ ok: false, reason: 'vessel_not_found' });
    expect(runAction(refuel, s, { vesselId: 'shuttle-1' })).toEqual({ ok: false, reason: 'no_fuel_stock' });
    s.planets.earth.items['meh_fuel'] = 10;
    s.vessels[0].state = 'in_transit';
    expect(runAction(refuel, s, { vesselId: 'shuttle-1' })).toEqual({ ok: false, reason: 'vessel_not_docked' });
    s.vessels[0].state = 'docked';
    s.vessels[0].fuel = 100;
    expect(runAction(refuel, s, { vesselId: 'shuttle-1' })).toEqual({ ok: false, reason: 'tank_full' });
  });
});

describe('sendCargo (spec §4.2)', () => {
  const ready = () => {
    const s = createInitialState(1);
    s.planets.earth.stores['iron'] = 1000;
    s.vessels[0].fuel = 100;
    return s;
  };

  it('décolle avec la cargaison, débite stocks, monté les slots, débite le carburant', () => {
    const s = ready();
    const r = runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 100, toPlanetId: 'the_moon' });
    expect(r.ok).toBe(true);
    expect(s.planets.earth.stores['iron']).toBe(900);
    const v = s.vessels[0];
    expect(v.slots[0]).toEqual({ kind: 'supply', itemId: 'iron', quantity: 100 });
    expect(v.state).toBe('in_transit');
    expect(v.mission).toMatchObject({ fromPlanetId: 'earth', toPlanetId: 'the_moon', startDay: 1, arrivalDay: 10 });
    expect(v.fuel).toBe(100 - fuelCost(2, 100)); // 100 - 4
  });

  it('refuse si carburant insuffisant (pas de ravitaillement auto)', () => {
    const s = createInitialState(1);
    s.planets.earth.stores['iron'] = 50;
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 50, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'insufficient_fuel' });
  });

  it('refuse si stock insuffisant, cargaison non transportable, destination égale/inconnue', () => {
    const s = ready();
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 5000, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'insufficient_stock' });

    const s2 = createInitialState(1);
    s2.planets.earth.items['meh_fuel'] = 10;
    s2.vessels[0].fuel = 100;
    expect(runAction(sendCargo, s2, { vesselId: 'shuttle-1', itemId: 'meh_fuel', quantity: 5, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'not_carriable' });

    const s3 = ready();
    expect(runAction(sendCargo, s3, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'earth' }))
      .toEqual({ ok: false, reason: 'same_planet' });
    expect(runAction(sendCargo, s3, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'proxima' }))
      .toEqual({ ok: false, reason: 'unknown_destination' });
  });

  it('refuse vaisseau inconnu ou non docked', () => {
    const s = ready();
    expect(runAction(sendCargo, s, { vesselId: 'nope', itemId: 'iron', quantity: 1, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'vessel_not_found' });
    s.vessels[0].state = 'in_transit';
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'vessel_not_docked' });
  });

  it('refuse hors de la portée du vaisseau (inter-systèmes → scg requis)', () => {
    const s = createInitialState(1);
    s.planets['alpha'] = createPlanetRuntime('alpha');
    s.vessels[0].fuel = 100;
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 1, toPlanetId: 'alpha' }))
      .toEqual({ ok: false, reason: 'out_of_range' });
  });

  it('refuse au-delà de la capacité du vaisseau', () => {
    const s = ready();
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 101, toPlanetId: 'the_moon' }))
      .toEqual({ ok: false, reason: 'no_capacity' });
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run tests/actions-vessels.test.ts`
Expected: FAIL — `buildVessel`, `refuel`, `sendCargo` inexportés (et `@/simulation/vessels` prêt du Task 3).

- [ ] **Step 3 : Implémentation**

Créer `src/actions/vessels.ts` :

```ts
import { pushBulletin } from './types';
import type { Action, ValidationResult } from './types';
import { VESSEL_BY_ID, getVessel, getItem, getBody, RESOURCE_BY_ID } from '@/simulation/data';
import { travelDays } from '@/simulation/travel';
import {
  cargoSlotKind, cargoUnitMass, fuelCost, loadedMass, planSupplyLoad, planToolLoad, vesselArrivalDay,
} from '@/simulation/vessels';
import type { GameState, ResourceId, SlotKind, VesselRuntime } from '@/simulation';

export interface BuildVesselArgs {
  planetId: string;
  templateId: string;
  pods?: SlotKind[];
}

export interface SendCargoArgs {
  vesselId: string;
  itemId: string;
  quantity: number;
  toPlanetId: string;
}

const POD_ITEM: Record<'supply' | 'tool', string> = { supply: 'supply_pod', tool: 'tool_pod' };
const IOS_MOUNTS: SlotKind[] = ['tool', 'supply', 'supply'];

function findVessel(state: GameState, id: string): VesselRuntime | undefined {
  return state.vessels.find((v) => v.id === id);
}

function nextVesselId(state: GameState, templateId: string): string {
  const n = state.vessels.filter((v) => v.templateId === templateId).length + 1;
  return `${templateId}-${n}`;
}

export const buildVessel: Action<BuildVesselArgs> = {
  label: 'buildVessel',
  validate(state, args): ValidationResult {
    const def = VESSEL_BY_ID[args.templateId];
    if (!def) return { ok: false, reason: 'vessel_not_found' };
    const planet = state.planets[args.planetId];
    if (!planet) return { ok: false, reason: 'unknown_planet' };

    const mounts: SlotKind[] = def.travel
      ? (args.pods && args.pods.length > 0 ? args.pods : ['supply'])
      : IOS_MOUNTS;
    if (mounts.length > def.slotTotal) return { ok: false, reason: 'invalid_pods' };
    for (const kind of mounts) {
      if ((def.slots[kind] ?? 0) <= 0 || kind === 'cryo') return { ok: false, reason: 'invalid_pods' };
    }

    const needOrbit = getItem(def.build.chassis).orbitOnly;
    if (needOrbit && !planet.factory.inOrbit) return { ok: false, reason: 'orbit_required' };

    const required: string[] = [def.build.chassis, def.build.drive];
    for (const kind of mounts) required.push(POD_ITEM[kind]);
    for (const part of required) {
      if ((planet.items[part] ?? 0) < 1) return { ok: false, reason: 'missing_parts' };
    }
    return { ok: true };
  },
  execute(state, args) {
    const def = getVessel(args.templateId);
    const planet = state.planets[args.planetId];
    const mounts: SlotKind[] = def.travel
      ? (args.pods && args.pods.length > 0 ? args.pods : ['supply'])
      : IOS_MOUNTS;

    for (const part of [def.build.chassis, def.build.drive]) planet.items[part] -= 1;
    for (const kind of mounts) planet.items[POD_ITEM[kind]] -= 1;

    const vessel: VesselRuntime = {
      id: nextVesselId(state, args.templateId),
      templateId: args.templateId,
      planetId: args.planetId,
      inOrbit: getItem(def.build.chassis).orbitOnly,
      state: 'docked',
      slots: mounts.map((kind) => ({ kind, itemId: null, quantity: 0 })),
      fuel: 0,
      fuelType: def.fuelType,
      mission: null,
      health: 100,
    };
    state.vessels.push(vessel);
    pushBulletin(state, `${def.name} construite sur ${planet.name}.`);
  },
};

export const refuel: Action<{ vesselId: string }> = {
  label: 'refuel',
  validate(state, args): ValidationResult {
    const vessel = findVessel(state, args.vesselId);
    if (!vessel) return { ok: false, reason: 'vessel_not_found' };
    if (vessel.state !== 'docked') return { ok: false, reason: 'vessel_not_docked' };
    const def = getVessel(vessel.templateId);
    if (vessel.fuel >= def.tankCap) return { ok: false, reason: 'tank_full' };
    if ((state.planets[vessel.planetId].items[vessel.fuelType] ?? 0) < 1) {
      return { ok: false, reason: 'no_fuel_stock' };
    }
    return { ok: true };
  },
  execute(state, args) {
    const vessel = findVessel(state, args.vesselId)!;
    const def = getVessel(vessel.templateId);
    const items = state.planets[vessel.planetId].items;
    const stock = items[vessel.fuelType] ?? 0;
    const amount = Math.min(def.tankCap - vessel.fuel, stock);
    items[vessel.fuelType] = stock - amount;
    vessel.fuel += amount;
    pushBulletin(state, `${getVessel(vessel.templateId).name} ravitaillée : +${amount} ${vessel.fuelType}.`);
  },
};

export const sendCargo: Action<SendCargoArgs> = {
  label: 'sendCargo',
  validate(state, args): ValidationResult {
    const vessel = findVessel(state, args.vesselId);
    if (!vessel) return { ok: false, reason: 'vessel_not_found' };
    if (vessel.state !== 'docked') return { ok: false, reason: 'vessel_not_docked' };
    if (!state.planets[args.toPlanetId]) return { ok: false, reason: 'unknown_destination' };
    if (args.toPlanetId === vessel.planetId) return { ok: false, reason: 'same_planet' };

    const kind = cargoSlotKind(args.itemId);
    if (!kind) return { ok: false, reason: 'not_carriable' };

    const here = state.planets[vessel.planetId];
    const stock = kind === 'supply'
      ? (here.stores[args.itemId as ResourceId] ?? 0)
      : (here.items[args.itemId] ?? 0);
    if (args.quantity <= 0) return { ok: false, reason: 'invalid_quantity' };
    if (stock < args.quantity) return { ok: false, reason: 'insufficient_stock' };

    const fromBody = getBody(vessel.planetId);
    const toBody = getBody(args.toPlanetId);
    const def = getVessel(vessel.templateId);
    if (fromBody.starId !== toBody.starId && def.range !== 'interstellar') {
      return { ok: false, reason: 'out_of_range' };
    }

    const plan = kind === 'supply'
      ? planSupplyLoad(vessel, args.itemId, args.quantity)
      : planToolLoad(vessel, args.itemId, args.quantity);
    if (!plan.ok) return plan;

    const distance = travelDays(vessel.planetId, args.toPlanetId);
    const totalMass = loadedMass(vessel)
      + plan.slots.reduce((m, s) => m + s.quantity * cargoUnitMass(s.itemId), 0);
    const cost = fuelCost(distance, totalMass);
    if (vessel.fuel < cost) return { ok: false, reason: 'insufficient_fuel' };
    return { ok: true };
  },
  execute(state, args) {
    const vessel = findVessel(state, args.vesselId)!;
    const here = state.planets[vessel.planetId];
    const kind = cargoSlotKind(args.itemId)!;

    if (kind === 'supply') here.stores[args.itemId as ResourceId] = (here.stores[args.itemId as ResourceId] ?? 0) - args.quantity;
    else here.items[args.itemId] = (here.items[args.itemId] ?? 0) - args.quantity;

    const plan = kind === 'supply'
      ? planSupplyLoad(vessel, args.itemId, args.quantity)
      : planToolLoad(vessel, args.itemId, args.quantity);
    if (plan.ok) {
      let idx = 0;
      for (const ps of plan.slots) {
        const candidates = vessel.slots.filter((s) => s.kind === ps.kind && (s.itemId === null || s.quantity === 0));
        const slot = candidates[idx];
        slot.itemId = ps.itemId;
        slot.quantity = ps.quantity;
        idx++;
      }
    }

    const distance = travelDays(vessel.planetId, args.toPlanetId);
    const totalMass = loadedMass(vessel);
    const cost = fuelCost(distance, totalMass);
    vessel.fuel -= cost;
    vessel.state = 'in_transit';
    vessel.mission = {
      fromPlanetId: vessel.planetId,
      toPlanetId: args.toPlanetId,
      startDay: state.day,
      arrivalDay: vesselArrivalDay(vessel.templateId, vessel.planetId, args.toPlanetId, state.day),
      fuelCost: cost,
    };
    const dest = state.planets[args.toPlanetId];
    pushBulletin(state, `${getVessel(vessel.templateId).name} en route vers ${dest.name} (arrivée J${vessel.mission.arrivalDay}).`);
  },
};
```

- [ ] **Step 4 : Exports**

Dans `src/actions/index.ts` :

```ts
export { buildVessel, refuel, sendCargo } from './vessels';
```

- [ ] **Step 5 : Vérifier**

Run: `npm run test:run tests/actions-vessels.test.ts && npm run lint && npm run build`
Expected: vert. (Vérifier notamment la matrice « refuse si aucun emplacement du type requis » corrigée au Task 3.)

- [ ] **Step 6 : Commit**

```bash
rtk git add src/actions/vessels.ts src/actions/index.ts tests/actions-vessels.test.ts
rtk git commit -m "feat(actions): buildVessel, refuel, sendCargo (transport jouable)"
```

---

### Task 5: Moteur — phase Navigation et arrivées

**Files:**
- Modify: `src/simulation/engine.ts`
- Test: `tests/vessels.test.ts` (ajout)

**Interfaces:**
- Consumes: `RESOURCE_BY_ID`, `getVessel`, `SIM_CONFIG.MINE_STOCK_CAP`, `DayTickResult.arrived`, `VesselRuntime.mission`.

- [ ] **Step 1 : Tests — cas qui échouent**

Ajouter à `tests/vessels.test.ts` :

```ts
describe('arrivée de vaisseau (spec §4.4)', () => {
  it('débarque la cargaison dans stores/items, mission déposée, état docked', () => {
    const s = createInitialState(1);
    s.vessels[0].state = 'in_transit';
    s.vessels[0].slots = [
      { kind: 'supply', itemId: 'iron', quantity: 80 },
      { kind: 'tool', itemId: 'derrick', quantity: 2 },
    ];
    s.vessels[0].mission = { fromPlanetId: 'earth', toPlanetId: 'the_moon', startDay: 1, arrivalDay: 10, fuelCost: 4 };
    for (let i = 0; i < 10; i++) dayTick(s);
    const v = s.vessels[0];
    expect(v.state).toBe('docked');
    expect(v.planetId).toBe('the_moon');
    expect(v.mission).toBeNull();
    expect(v.slots).toEqual([
      { kind: 'supply', itemId: null, quantity: 0 },
      { kind: 'tool', itemId: null, quantity: 0 },
    ]);
    expect(s.planets.the_moon.stores['iron']).toBe(80);
    expect(s.planets.the_moon.items['derrick']).toBe(2);
  });

  it('plafonne le dépôt à 50 000', () => {
    const s = createInitialState(1);
    s.planets.the_moon.stores['iron'] = 49980;
    s.vessels[0].state = 'in_transit';
    s.vessels[0].slots = [{ kind: 'supply', itemId: 'iron', quantity: 100 }];
    s.vessels[0].mission = { fromPlanetId: 'earth', toPlanetId: 'the_moon', startDay: 1, arrivalDay: 3, fuelCost: 2 };
    for (let i = 0; i < 3; i++) dayTick(s);
    expect(s.planets.the_moon.stores['iron']).toBe(50000);
  });

  it('signale les arrivées dans le résultat du tick', () => {
    const s = createInitialState(1);
    s.vessels[0].state = 'in_transit';
    s.vessels[0].mission = { fromPlanetId: 'earth', toPlanetId: 'the_moon', startDay: 1, arrivalDay: 5, fuelCost: 2 };
    let r;
    for (let i = 0; i < 5; i++) r = dayTick(s);
    expect(r!.arrived).toEqual([{ vesselId: 'shuttle-1', planetId: 'the_moon' }]);
  });
});
```

Ajouter l'import de `dayTick` (ainsi que `RESOURCE_BY_ID` si pas déjà là) :

```ts
import { createInitialState, dayTick, RESOURCE_BY_ID } from '@/simulation';
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run tests/vessels.test.ts`
Expected: l'arrivée n'est pas déclenchée (mission jamais résolue) → FAIL.

- [ ] **Step 3 : Implémentation**

Dans `src/simulation/engine.ts` :

1. Imports à compléter :

```ts
import type { DayTickResult, GameState } from './types';
import { SIM_CONFIG } from './config';
import { RESOURCE_BY_ID, getVessel } from './data';
```

2. Dans le littéral `result` de `dayTick`, ajouter `arrived: [],` (si pas déjà fait au Task 2).

3. Insérer la phase Navigation entre le bloc Ennemis et le bloc Combat :

```ts
  // 6. Navigation — arrivées des vaisseaux joueurs (spec transport §4.4)
  for (const vessel of state.vessels) {
    if (vessel.mission && state.day >= vessel.mission.arrivalDay) {
      const dest = state.planets[vessel.mission.toPlanetId];
      for (const slot of vessel.slots) {
        if (slot.quantity > 0 && slot.itemId) {
          if (RESOURCE_BY_ID[slot.itemId]) {
            const cur = dest.stores[slot.itemId] ?? 0;
            dest.stores[slot.itemId] = Math.min(SIM_CONFIG.MINE_STOCK_CAP, cur + slot.quantity);
          } else {
            dest.items[slot.itemId] = (dest.items[slot.itemId] ?? 0) + slot.quantity;
          }
          slot.itemId = null;
          slot.quantity = 0;
        }
      }
      vessel.state = 'docked';
      vessel.planetId = dest.id;
      vessel.mission = null;
      result.arrived.push({ vesselId: vessel.id, planetId: dest.id });
      journal.push(`[J${day}] arrivée : ${getVessel(vessel.templateId).name} sur ${dest.name}.`);
    }
  }
```

- [ ] **Step 4 : Vérifier**

Run: `npm run test:run && npm run lint && npm run build`
Expected: tout vert (y compris les autres tests qui exercent `dayTick` — `arrived` initialisé).

- [ ] **Step 5 : Commit**

```bash
rtk git add src/simulation/engine.ts tests/vessels.test.ts
rtk git commit -m "feat(sim): phase Navigation — arrivées des vaisseaux, déchargement automatique"
```

---

### Task 6: Contrat v2 — cycle complet

**Files:**
- Modify: `tests/contracts.test.ts`

**Interfaces:**
- Consumes: `refuel`, `sendCargo` (Task 4), `createInitialState`, `dayTick`.

- [ ] **Step 1 : Tests — cas qui échouent**

Dans `tests/contracts.test.ts`, compléter l'import :

```ts
import { runAction, selectResearch, queueItem, refuel, sendCargo } from '@/actions';
```

Ajouter un bloc :

```ts
// spec transport §7.4 — contrat v2 vaisseaux
describe('contrat transport v2', () => {
  it('état initial v2 : 1 navette Terre + pods, version 2', () => {
    const s = createInitialState(7);
    expect(s.version).toBe(2);
    expect(s.vessels).toHaveLength(1);
    expect(s.vessels[0].planetId).toBe('earth');
    expect(s.planets.earth.items['supply_pod']).toBe(1);
    expect(s.planets.earth.items['tool_pod']).toBe(1);
    expect(s.planets.earth.items['cryo_pod']).toBe(1);
  });

  it('cycle complet Terre → Lune : ravitaillement, départ, voyage, arrivée, dépôt', () => {
    const s = createInitialState(7);
    s.planets.earth.stores['iron'] = 250;
    s.planets.earth.items['meh_fuel'] = 50;
    expect(runAction(refuel, s, { vesselId: 'shuttle-1' }).ok).toBe(true);
    expect(runAction(sendCargo, s, { vesselId: 'shuttle-1', itemId: 'iron', quantity: 80, toPlanetId: 'the_moon' }).ok)
      .toBe(true);
    const v = s.vessels[0];
    expect(v.state).toBe('in_transit');
    const arrival = v.mission!.arrivalDay; // 1 + 5 + trajet(2) + 2 = 10
    expect(arrival).toBe(10);
    while (s.day < arrival) dayTick(s);
    expect(v.state).toBe('docked');
    expect(v.planetId).toBe('the_moon');
    expect(s.planets.the_moon.stores['iron']).toBe(80);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm run test:run tests/contracts.test.ts`
Expected: FAIL (pas encore implémenté — ou vert si Tasks 1-5 déjà appliquées ; dans ce cas cette tâche valide la non-régression).

- [ ] **Step 3 : Vérifier tout le suite**

Run: `npm run test:run && npm run lint && npm run build`
Expected: vert. Comptabiliser le nombre de tests (doit rester ≥ 111 + ajouts).

- [ ] **Step 4 : Commit**

```bash
rtk git add tests/contracts.test.ts
rtk git commit -m "test(contracts): contrat v2 — état initial transport + cycle Terre→Lune complet"
```

---

### Task 7: Consignation projet + vérification finale

**Files:**
- Modify: `docs/DATA.md`, `docs/DECISIONS.md`, `docs/TRACE.md`, `docs/DASHBOARD.md`

**Interfaces:**
- Consumes: résultats des tâches précédentes, correspondances de numérotation (Session 24, décision K16).

- [ ] **Step 1 : `docs/DATA.md`**
  - §1.5 « Vaisseaux » : retirer toute mention « n'existe pas encore », documenter le fichier réel `data/vessels.json` (champs `slots`, `slotTotal`, `capacity`, `fuelType`, `tankCap`, `range`, `travel`, `build`), préciser les 3 vaisseaux canon (navette/IOS/SCG) et « ressources = 1 t/unité ».
  - §1 Ressources : noter le champ `mass: 1` ajouté aux 16 ressources (spec transport §3.0).
  - §2 `VesselRuntime` : aligner le schéma (états `docked`/`in_transit`, `mission`, `fuelType`, `inOrbit`, `slots`).
  - Corriger le commentaire `ResearchRuntime` « pool » → « un seul projet courant » (le backlog DATA).

- [ ] **Step 2 : `docs/DECISIONS.md`**
  Ajouter la décision **K16** : implémentation transport pods/slots — schéma `vessels.json`, actions `buildVessel`/`refuel`/`sendCargo`, formule carburant `max(1, ceil(d × (100 + m)/100))`, flotte de départ (navette + 3 pods), réservoirs RE (100/250/250), ressources = 1 t/unité, « un slot, une cargaison, départ immédiat par envoi ».

- [ ] **Step 3 : `docs/TRACE.md`**
  Ajouter la **Session 24** : brainstorming transport (A validé), spec `2026-09-18-vessels-transport-design.md`, implémentation (7 tâches), résultats tests/lint/build.

- [ ] **Step 4 : `docs/DASHBOARD.md`**
  Mettre à jour badges §3 (Data model / Simulation → ajouter « Transport v0.2 ») et statistiques (nombre de tests, commits).

- [ ] **Step 5 : Vérification finale**

Run: `npm run test:run && npm run lint && npm run build`
Expected: vert.

- [ ] **Step 6 : Commit + mémoire**

```bash
rtk git add docs/DATA.md docs/DECISIONS.md docs/TRACE.md docs/DASHBOARD.md
rtk git commit -m "docs: consignation transport v0.2 (K16, Session 24, DATA aligné)"
```

Puis mémoriser via Mnemolite (write_memory) : décisions de jalon (K16), numéro de session 24, exécution complétée.

---

## Self-Review

- Couverture spec : §3 données (Task 1), §4.1 types + §4.7 état initial (Task 2), §4.5 carburant + §4.6 constantes + §4.3/§4.2.6 plan de charge (Task 3), §4.2 actions (Task 4), §4.4 arrivée (Task 5), §7.4 contrat + non-régression (Task 6), §8 consignation (Task 7). §2.2 non-objectifs respectés (aucune action ACC/MTX/réparation, `travel`/cryo conservés en data).
- Pas de placeholder : les blocs de code sont complets ; les notes « corriger/remplacer X » sont des consignes explicites à appliquer avant commit.
- Cohérence des noms : `planSupplyLoad`/`planToolLoad`/`fuelCost`/`vesselArrivalDay`/`cargoSlotKind`/`cargoUnitMass`/`loadedMass`/`emptySlots` utilisés identiquement dans actions, moteur, tests et exports.