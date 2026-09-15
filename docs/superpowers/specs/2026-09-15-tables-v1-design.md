# Design — Tables v1 (données + moteur, fidèle à l'original)

> Date : 2026-09-15
> Statut : validé (brainstorming complété, toutes les sections approuvées)
> Sources : `docs/RESEARCH.md` (§8 corps/gisements, §9 production/recettes, §14c mécaniques du code) — repo `develop` du remake, `source:f53f5ba3fa`.

---

## 1. Objectif

Reconstruire les **données statiques** (`data/*.json`) et les **constantes de simulation** (`src/simulation/config.ts`) de la v1, **fidèles à l'original** *Deuteros: The Next Millennium*, avec des ajustements ciblés faciles à reverser :

- 16 ressources, 46 items (dont 32 productibles), 160 corps célestes.
- Moteur : production `/801` (4 wraps, wrap 255, AOC=128), recherche `/801` (+11 %/wrap, gate par rang).
- **Périmètre v1 = Système solaire seul** (42 corps) ; la structure data accepte les systèmes extrasolaires pour v2/v3.

## 2. Décisions validées (brainstorming)

| Décision | Choix |
|---|---|
| Fidélité | **Fidèle à l'original** (16 ressources, 46 items, /801, staff ranks, combat) — pas de simplification web-first |
| Périmètre v1 | **Système solaire seul** (données pour 42 corps) ; extensible v2/v3 |
| Direction créative | **Fidèle + ajustements ciblés** : rééquilibrage via `config.ts`, guide contextuel, unification des seuils marines (unifier sur `GetLevel()` : Captain 0-39 / Admiral 40+) |
| Encodage | **Approche A** : items.json riche (researchValue/researchMultiplier) + `config.ts` où les constantes d'algorithme sont paramétrées |

---

## 3. Ressources (16)

Liste canonique (enum `ItemTypes` 1-16 du remake) :

| # | id | Nom | Symbole | Type |
|---|---|---|---|---|
| 1 | iron | Fer | Fe | matière première |
| 2 | titanium | Titane | Ti | matière première |
| 3 | aluminium | Aluminium | Al | matière première |
| 4 | carbon | Carbone | C | matière première |
| 5 | copper | Cuivre | Cu | matière première |
| 6 | hydrogen | Hydrogène | H | matière première |
| 7 | deuterium | Deutérium | D | matière première |
| 8 | methane | Méthane | CH₄ | matière première |
| 9 | helium | Hélium | He | matière première |
| 10 | palladium | Palladium | Pd | matière précieuse |
| 11 | platinum | Platine | Pt | matière précieuse |
| 12 | silver | Argent | Ag | matière précieuse |
| 13 | gold | Or | Au | matière précieuse |
| 14 | silica | Silice | Si | matière première |
| 15 | meh_fuel | Carburant MeH | MeH | carburant composé (H×2+CH₄×2) |
| 16 | hed_fuel | Carburant HeD | HeD | carburant composé (He×2+D×2) |

Règles :
- MeH : produit sur n'importe quelle base planétaire ; HeD : **orbite seule**.
- Carburants **non minables** — produits à l'usine.
- Stocks **locaux** (par planète/station), plafond 50 000 — pas de pool mondial.

---

## 4. Items (données statiques)

### 4.1 Interface

```ts
interface ItemData {
  id: string;
  name: string;
  shortName: string;
  inputs: Record<ResourceId, number>;
  mass: number;                  // tonnes (charge transportable)
  techLevel: number;             // rang requis (1=Technician, 2=Engineer, 3=Expert)
  researchOrder: number;         // ordre de déblocage recherche (0 = pas de recherche requise)
  researchValue: number;         // valeur initiale compteur wrap-around (défaut 255)
  researchMultiplier: number;    // vitesse production (défaut 64)
  orbitOnly: boolean;
  autoProduce: boolean;
  toolPod: boolean;
}
```

### 4.2 Items productibles (32) — extraits de RESEARCH.md §9

| id | inputs | mass | tech | orbit | notes |
|---|---|---|---|---|---|
| derrick | Fe3, Ti4, C1 | 8 | 2 | non | ToolPod |
| s_chassis | Fe20, Ti50, Al35, C10, Cu15 | 130 | 3 | non | |
| s_drive | Fe6, Ti10, Al4 | 20 | 4 | non | |
| meh_fuel | H2, CH4×2 | 3 | 5 | non | |
| of_frame | Fe55, Ti80, Al50, C25, Cu40 | 250 | 6 | non | ToolPod |
| supply_pod | Ti2, Al1, Cu1 | 4 | 7 | non | |
| tool_pod | Ti2, Al1, Cu1 | 4 | 8 | non | |
| cryo_pod | Ti2, Al1, Cu1 | 4 | 9 | non | |
| pulse_blaster | Pd120, Pt30, HeD600 | 750 | 10 | oui | |
| ios_chassis | Fe100, Ti250, Al175, C50, Cu75 | 650 | 11 | oui | |
| ios_drive | Fe30, Ti50, Cu15 | 95 | 12 | oui | |
| scg_chassis | Fe250, Ti600, Al400, Cu185, Pt100, Ag100, Au50 | 1685 | 13 | oui | |
| scg_drive | Fe50, Ti100, Cu30, Pd50, Pt25, Ag10 | 265 | 14 | oui | |
| hed_fuel | He2, D2 | 3 | 15 | **oui** | |
| acc | Ti2, Al1, C1, Cu1 | 8 | 16 | non | ToolPod |
| aoc | Ti4, Al1, C2, Ag1 | 8 | 17 | oui | 1 seul ; active l'auto-factory |
| bandaid | Fe30, Ti30, Al30, C30, Cu30 | 150 | 18 | oui | ToolPod |
| sdm | Al5, Cu1, Pd1, Pt2 | 9 | 19 | oui | |
| grapple | Fe2, Ti2, Cu1 | 5 | 20 | oui | ToolPod |
| dfcc | Ti2, Al1, C1, Cu1, Pt2, Au1 | 8 | 21 | oui | ToolPod |
| ama | Fe6, Ti70, Al10, C30, Cu2, Pt5, Ag1 | 124 | 22 | oui | ToolPod |
| hyperlight | (coût 0) | 124 | 23 | oui | tech-recherche |
| mtx | Ti500, Cu82, Pd100, Au40 | 722 | 24 | oui | |
| mfl | Cu5, Pd10, Pt10 | 25 | 25 | oui | |
| r_frame | Fe35, Ti50, Al20, C15, Cu30, Pt25, Ag10, Si15 | 200 | 26 | oui | ToolPod |
| ptl | Ti96, Al45, Cu10 | 151 | 27 | oui | 100 HeD/tir |
| commspod | Al2, C1, Cu1, Au1 | 5 | 28 | oui | ToolPod |
| ios_drone | Fe120, Ti120, Al120, C15, Cu55, Pd30, Pt30 | 490 | 29 | oui | |
| scg_drone | Fe300, Ti200, Al300, Cu100, Pd90, Pt80, Ag95, Au50 | 1015 | 30 | oui | |
| prison_pod | Ti2, Al1, Cu1, Pt2 | 7 | 31 | oui | ToolPod |
| sonic_blaster | Ti1000, Al1500, Cu800, Pd1200, Ag3000, Au3000 | 1065 | 32 | oui | ToolPod |

> Référence complète : RESEARCH.md §9. La table 46 items complète (incl. `unknown_item`, items de drone, etc.) est détaillée dans CoreData.cs (S12) ; les items listés ici sont les 32 productibles du scope v1.

---

## 5. Constantes de simulation (`src/simulation/config.ts`)

```ts
export const SIM_CONFIG = {
  PRODUCTION_DIVISOR: 801,
  PRODUCTION_WRAP_THRESHOLD: 255,
  PRODUCTION_MAX_WRAPS: 4,
  AOC_RATE: 128,
  PRODUCTION_RESET_CYCLE: 7,

  RESEARCH_DIVISOR: 801,
  RESEARCH_WRAP_INCREMENT: 11,
  RESEARCH_MAX_PERCENTAGE: 100,
  RESEARCH_DEFAULT_MULTIPLIER: 64,

  MINE_STOCK_CAP: 50000,
  MINE_DERRICK_RATE: { iron:2, titanium:2, aluminium:2, carbon:2, copper:2, silica:2,
    hydrogen:1, deuterium:1, methane:1, helium:1, palladium:1, platinum:1, silver:1, gold:1 },
  SURVEY_MULTIPLIER: { helium:4, platinum:2, silver:2, gold:3 }, // autres = 1

  TRAVEL_INTRA_SYSTEM_BASE: 1,
  TRAVEL_INTER_SYSTEM_MULT: 4,
  SHUTTLE_LAND_DAYS: 2,
  SHUTTLE_TAKEOFF_DAYS: 5,
  SHUTTLE_REPAIR_DAYS: 2,

  STAFF_MAX_RESEARCHERS: 250,
  STAFF_MAX_PRODUCTION: 200,
  STAFF_MAX_MARINES: 41,
  STAFF_TRAINING_DAYS: 24,
  STAFF_TRAINING_SIMULTANEOUS: { researcher: 100, production: 100, marines: 41 },

  ENEMY_DRONE_CAP: 200,
  ENEMY_BUILD_FREQUENCIES: [700, 1000, 950, 900, 900, 800, 700, 700, 800],
  ENEMY_ATTACK_RANDOM_MAX: 63,
  PTL_FUEL_COST: 100,

  BASE_BUILD_PARTS: 2,
  EARTH_MINE_EVEN_DAYS_ONLY: true,
};
```

---

## 6. Algorithme de production (cœur)

```
1. Si builder null et AOC inactif → skip.
2. v = (Builder.Count << Builder.GetLevel()) * item.researchMultiplier / PRODUCTION_DIVISOR
   (si AOC → v = AOC_RATE)
3. productionValue += v
4. Si productionValue > PRODUCTION_WRAP_THRESHOLD :
   productionValue &= 0xFF ; productionComplete++
5. Si productionComplete == PRODUCTION_MAX_WRAPS → item terminé :
   · ProdCycle = 0 ; actionsTaken++
   · si item == aoc → builder libéré, AOC activé sur l'usine
   · sinon → item sorti de la queue
6. Changement d'item en cours → productionValue remis à researchValue (travail perdu)
```

**Ordre de tick (GameCore.cs)** :
1. Événements/scénarii · 2. Research · 3. **Production** · 4. UpdateShips · 5. BuildDrones · 6. MTX · 7. Navigation · 8. Combat

---

## 7. Algorithme de recherche

```
1. Earth.ResearchStaff requis ; 1 seul projet courant (Earth.CurrentResearchItem)
2. Si ResearchStaff.GetLevel() < item.techLevel → pas de progression
3. v = (teamSize << level) * item.researchMultiplier / RESEARCH_DIVISOR
4. Si (researchValue + v) > 255 → researchValue &= 0xFF ; percentage += 11 (plafonné 100)
   sinon researchValue += v
5. À 100 % → researched=true, item unlocket, ResearchOrder = n° d'ordre du déblocage
```

---

## 8. Autres mécaniques (transcrites §14c)

- **Minage** : conditions `derricks>0 && baseBuildParts==2 && !baseDamaged` ; Terre jours pairs ; survey `rand(0,8)×mult` ; derrick rate ; cap 50 000.
- **Astéroïdes** : 6 minables (Ti, Al, C, Pd, Pt, Ag, Si) — classes 50/100/250/1000/5000/10000/25000/60000.
- **Combat** : `Power = (Pilot.Level + 4) × DroneCount` ; ratio vs table `battleFactors` (victoire certaine ≥ min 7) ; fuite ennemie ; PTL (100 HeD).
- **Voyage** : intra `max(|Δordre|,1)` j ; inter `|Δordre|×4` ; navette Land 2/TakeOff 5/réparation 2.
- **Staff** : rangs unifiés (Captain 0-39 / Admiral 40+) ; capacités 250/200/41 ; formation 24 j, 1 type à la fois.
- **Ennemis** : fréquences `[700,1000,950,900,900,800,700,700,800]` j ; cap 200 ; capture → AOC+MTX+SDM, 50 IOS drones, staff éliminé, vaisseaux détruits.
- **Chrono/victoire** : 3100 AD fin Terre-Ville ; 8 segments ; guerre déclenchée par les actes du joueur.

---

## 9. Structure des fichiers data

```
data/
  resources.json      // 16 ressources (id, nom, symbole, type, densité)
  items.json          // 46 items (interface §4.1)
  planets.json        // corps (v1 : système solaire complet) — cf. deposits_matrix
  astronomical.json   // étoiles, lunes, astéroïdes (classes de masse, minables)
  difficulties.json   // 4 difficultés (extinction) — idem actuel
  events.json         // timeline (jour, titre, body, effects, choices)
```

> `ships` / `structures` font partie de la v1 GAMEPLAY et seront alignés sur les items (châssis/propulseurs = composants).

---

## 10. Alignement des docs (conséquences)

- **DATA.md §1.1** : `planets.json` conserve la forme générale mais passe **gisements** sur la nomenclature 16 ressources + `derricks`/`mined` (état runtime).
- **DATA.md §1.3** : `recipes.json` est **remplacé** par `items.json` (item = recette + caractéristiques). Les recettes « carburant » (MeH/HeD) vivent dans items.json.
- **GAMEPLAY.md §2.1** : ressources 10 → **16** (retirer Iridium, Eau, Uranium, Terres rares ; ajouter Fe, Al, Cu, H, CH₄, He, Pt, Au, Si, MeH, HeD).
- **GAMEPLAY.md §3** : recherche → algorithme /801 + 1 projet à la fois, gates par rang.
- **GAMEPLAY.md §4** : production → algorithme /801 + AOC, changer d'item = perte.
- **GAMEPLAY.md §6** : combat → Power + ratio + PTL ; « statut élimination 66 % » remplacé par la table battleFactors.
- **GAMEPLAY.md §7** : IA Méthanoïde → capture complète (§14c).

---

## 11. Tests

- Unitaires `src/simulation/__tests__/` :
  - wrap-around production (v, 255, 4 wraps, AOC=128).
  - recherche gate par rang, +11 %/wrap.
  - maths derrick (pairs/im pairs, cap 50 000).
  - combat Power + ratio → issue.
  - voyage durées.
- Fixtures JSON de test minimales (3-5 items).