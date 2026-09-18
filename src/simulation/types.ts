/**
 * Types runtime de la simulation (tables v1).
 * Le JSON de data/ est typé côté lecture (voir data.ts) ; ici : état dynamique.
 */
import type { ResourceId } from './config';

export type StaffType = 'research' | 'production' | 'marines';

/** Équipe (Staff.cs) — rang dérivé des ActionsTaken, jamais stocké. */
export interface Staff {
  type: StaffType;
  count: number;
  actionsTaken: number;
}

/** Usine (Factory.cs) — un seul item actif à la fois. */
export interface Factory {
  /** Item en cours de production (id items.json), null si ralenti. */
  currentItemId: string | null;
  /** Compteur 8 bits (wrap à 255, & 0xFF). */
  productionValue: number;
  /** Wraps effectués ; item terminé à 4. */
  productionComplete: number;
  /** Cycle d'animation (reset à 7 — sans effet de jeu). */
  prodCycle: number;
  /** Équipe productrice ; null = usine à l'arrêt. */
  builder: Staff | null;
  /** Usine automatisée par AOC (produit sans équipe ni ressources). */
  aoc: boolean;
  /** false = base planétaire, true = orbite. */
  inOrbit: boolean;
}

/** Gisement d'une matière sur un corps (PlanetResource + Material). */
export interface MaterialDeposit {
  resource: ResourceId;
  /** Quantité au sol restante ; 0 = à sonder. */
  groundAmount: number;
  /** Jours avant sondage (décompte) ; 0 = sondé ou à programmer. */
  surveyTicks: number;
}

/** Corps céleste runtime (Planet.cs). */
export interface PlanetRuntime {
  id: string;
  deposits: MaterialDeposit[];
  derricks: number;
  baseBuildParts: number;
  baseDamaged: boolean;
  /** Stocks locaux de la base (plafond 50 000 par matière). */
  stores: Partial<Record<ResourceId, number>>;
  /** Items fabriqués stockés (drones, pods, chassis…). */
  items: Record<string, number>;
  factory: Factory;
  /** Équipe de recherche de la Terre (Staff.cs) ; null = absent. */
  researchTeam: Staff | null;
  activeMethanoid: boolean;
  segment: number | null;
  mtxInstalled: boolean;
  sdmInstalled: boolean;
}

/** Recherche courante (Earth.CurrentResearchItem + ResearchItem). */
export interface ResearchState {
  currentItemId: string | null;
  /** Par item recherchable : progression. */
  progress: Record<
    string,
    {
      researched: boolean;
      researchValue: number;
      percentage: number;
      researchOrder: number;
      locked: boolean;
    }
  >;
}

/** Formation (CoreData.cs Training). */
export interface TrainingState {
  reservoir: number;
  inTraining: Record<StaffType, number>;
  dayStart: Record<StaffType, number>;
}

/** Flotte (InterStellarShip) — drone fleet joueur ou Méthanoïde. */
export interface Fleet {
  id: string;
  methanoidOwned: boolean;
  starId: string;
  locationPlanetId: string | null;
  destinationPlanetId: string | null;
  startTravelDay: number;
  droneCount: number;
  pilotLevel: number;
  hasPtl: boolean;
  fuel: number;
}

/** Instance de combat (BattleLogic.cs). */
export interface Battle {
  p1: { fleetId: string; ships: number; power: number; level: number };
  p2: { fleetId: string; ships: number; power: number; level: number };
  p1Counter: number;
  p2Counter: number;
  p1Fleeing: boolean;
  p2Fleeing: boolean;
  enemyFleeLevel: number;
  ptlFired: boolean;
  ended: boolean;
}

/** État global de la partie (DATA.md §2, adapté tables v1). */
export interface GameState {
  version: 1;
  seed: number;
  day: number;
  planets: Record<string, PlanetRuntime>;
  research: ResearchState;
  training: TrainingState;
  fleets: Fleet[];
  battles: Battle[];
  atWar: boolean;
  warDeclaredDay: number | null;
  enemyBuildDay: number | null;
  /** Index système = nombre de systèmes reconquis (fréquence de build ennemie). */
  starSystemsCaptured: number;
  /** Derniers bulletins (8 max, interface originale). */
  newsFeed: string[];
  flags: Record<string, boolean>;
}

/** Résultat d'un tick de jour. */
export interface DayTickResult {
  day: number;
  produced: Array<{ planetId: string; itemId: string }>;
  researchFinished: string | null;
  enemyDronesBuilt: number;
  battlesResolved: Battle[];
  /** Formations arrivées à échéance ce jour (type + effectif promu). */
  trainingFinished: Array<{ type: StaffType; count: number }>;
  /** Lignes de trace du jour (texte brut, préfixées `[J<jour simulé>]` — spec K10). */
  journal: string[];
}

/** Retour enrichi d'un jour de recherche (trace task 2). */
export interface ResearchDayResult {
  /** itemId terminé ce jour (100 %), sinon null. */
  finished: string | null;
  /** Progression courante du projet actif (itemId + pourcentage), null si aucun projet. */
  progress: { itemId: string; percentage: number } | null;
  /** true si un projet est sélectionné mais ne progresse pas (pas d'équipe / rang insuffisant). */
  blocked: boolean;
}

/** Retour enrichi d'un jour de production (trace task 2). */
export interface ProductionDayResult {
  /** itemId terminé ce jour (4 wraps), sinon null. */
  finished: string | null;
  /** item en cours (null si usine à l'arrêt). */
  itemId: string | null;
  /** Valeur 8 bits en fin de jour (0 après complétion). */
  value: number;
  /** Wraps effectués (PRODUCTION_MAX_WRAPS à la complétion). */
  wraps: number;
  /** true si un item est en file mais sans équipe (usine à l'arrêt). */
  blocked: boolean;
}
