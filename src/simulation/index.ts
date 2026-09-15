/**
 * Public API de la simulation (tables v1).
 */
export { SIM_CONFIG, SURVEY_MULTIPLIER, DERRICK_RATE, BATTLE_FACTORS } from './config';
export type { ResourceId } from './config';

export type {
  GameState,
  PlanetRuntime,
  Factory,
  Staff,
  StaffType,
  ResearchState,
  TrainingState,
  Fleet,
  Battle,
  DayTickResult,
} from './types';

export { createRng, randInt } from './rng';
export {
  RESOURCES,
  ITEMS,
  BODIES,
  SYSTEMS,
  RESOURCE_BY_ID,
  ITEM_BY_ID,
  BODY_BY_ID,
  RESEARCHABLE_ITEMS,
  SOL_BODIES,
  getItem,
  getBody,
} from './data';
export { createInitialState, createPlanetRuntime } from './state';
export { dayTick } from './engine';
export { getLevel, rankName, startTraining, canTrain, updateTraining } from './staff';
export {
  dailyProductionValue,
  canStartItem,
  checkResources,
  consumeResources,
  updateProduction,
  switchItem,
} from './production';
export { canSelect, updateResearch, initResearchProgress } from './research';
export { canMine, updateMining } from './mining';
export { fleetPower, startBattle, battleRound, firePtl } from './combat';
export { travelDays, shuttleLandDays, shuttleTakeoffDays, shuttleRepairDays } from './travel';
export { nextEnemyBuildDay, updateEnemyBuild, scheduleAttack, onSystemRecaptured } from './enemy';
