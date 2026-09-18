/**
 * Fabrique de l'état initial (nouvelle partie) — miroir de la setup CoreData.cs :
 * Terre usine au sol + 1 derrick, Lune base endommagée, colonies Méthanoïdes
 * (jupiter, uranus, titania, neptune, triton, pluto), réservoir 6 000.
 */
import { SOL_BODIES, getBody, RESEARCHABLE_ITEMS, VESSEL_BY_ID } from './data';
import type { GameState, PlanetRuntime, ResearchState, VesselRuntime } from './types';

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
    researchTeam: null,
    activeMethanoid: def.methanoidColony,
    segment: def.segment,
    mtxInstalled: false,
    sdmInstalled: false,
  };
}

/** Navette de départ (spec transport §4.7) : pod supply monté, vide, à quai Terre. */
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

  // Flotte de départ (spec transport §4.7) : 1 navette + 3 pods en stock.
  const earthItems = planets.earth.items;
  earthItems['supply_pod'] = (earthItems['supply_pod'] ?? 0) + 1;
  earthItems['tool_pod'] = (earthItems['tool_pod'] ?? 0) + 1;
  earthItems['cryo_pod'] = (earthItems['cryo_pod'] ?? 0) + 1;

  // Équipes pré-assignées au boot (spec v0 §5.1) — 450 sur le réservoir.
  planets.earth.factory.builder = { type: 'production', count: 200, actionsTaken: 0 };
  planets.earth.researchTeam = { type: 'research', count: 250, actionsTaken: 0 };

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
    version: 2,
    seed,
    day: 1,
    planets,
    research,
    training: {
      reservoir: 5_550, // 6 000 − 450 assignés aux équipes de départ
      inTraining: { research: 0, production: 0, marines: 0 },
      dayStart: { research: 0, production: 0, marines: 0 },
    },
    fleets: [],
    battles: [],
    vessels: [createStarterShuttle()],
    atWar: false,
    warDeclaredDay: null,
    enemyBuildDay: null,
    starSystemsCaptured: 0,
    newsFeed: [],
    flags: {},
  };
}
