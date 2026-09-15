/**
 * Fabrique de l'état initial (nouvelle partie) — miroir de la setup CoreData.cs :
 * Terre usine au sol + 1 derrick, Lune base endommagée, colonies Méthanoïdes
 * (jupiter, uranus, titania, neptune, triton, pluto), réservoir 6 000.
 */
import { SOL_BODIES, getBody, RESEARCHABLE_ITEMS } from './data';
import type { GameState, PlanetRuntime, ResearchState } from './types';

/** Items débloqués au démarrage (Research.Locked = false dans CoreData.cs). */
const STARTING_UNLOCKED = new Set([
  'derrick', 's_chassis', 's_drive', 'meh_fuel', 'of_frame',
  'supply_pod', 'tool_pod', 'cryo_pod',
]);

export function createPlanetRuntime(id: string): PlanetRuntime {
  const def = getBody(id);
  return {
    id,
    deposits: def.deposits.map((resource) => ({ resource, groundAmount: 0, surveyTicks: 0 })),
    derricks: def.derricks,
    baseBuildParts: def.baseBuildParts,
    baseDamaged: def.baseDamaged,
    stores: {},
    items: {},
    factory: {
      currentItemId: null,
      productionValue: 0,
      productionComplete: 0,
      prodCycle: 0,
      builder: null,
      aoc: false,
      inOrbit: false,
    },
    activeMethanoid: def.methanoidColony,
    segment: def.segment,
    mtxInstalled: false,
    sdmInstalled: false,
  };
}

export function createInitialState(seed: number): GameState {
  const planets: Record<string, PlanetRuntime> = {};
  for (const b of SOL_BODIES) {
    planets[b.id] = createPlanetRuntime(b.id);
  }

  // Setup de départ du remake (CoreData.cs) :
  planets.earth.factory.inOrbit = false; // usine au sol
  planets.earth.derricks = 1;
  const moon = planets.the_moon;
  if (moon) moon.baseDamaged = true; // la Lune démarre endommagée

  const research: ResearchState = { currentItemId: null, progress: {} };
  for (const it of RESEARCHABLE_ITEMS) {
    research.progress[it.id] = {
      researched: false,
      researchValue: 64, // défaut ResearchItem() du remake
      percentage: 1, // ResearchPercentageComplete initial = 1
      researchOrder: 0,
      locked: !STARTING_UNLOCKED.has(it.id),
    };
  }

  return {
    version: 1,
    seed,
    day: 1,
    planets,
    research,
    training: {
      reservoir: 6_000,
      inTraining: { research: 0, production: 0, marines: 0 },
      dayStart: { research: 0, production: 0, marines: 0 },
    },
    fleets: [],
    battles: [],
    atWar: false,
    warDeclaredDay: null,
    enemyBuildDay: null,
    starSystemsCaptured: 0,
    newsFeed: [],
    flags: {},
  };
}
