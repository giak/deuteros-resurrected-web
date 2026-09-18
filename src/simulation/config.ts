/**
 * Constantes de simulation — tables v1 (design spec 2026-09-15).
 * Toutes les valeurs sont extraites du code du remake Deuteros-Resurrected
 * (branche develop, source:f53f5ba3fa) et re-vérifiées fichier par fichier :
 *  - Factory.cs / Research.cs : diviseur 801, wrap 8 bits, +11 %/wrap
 *  - ResearchItem.cs          : défauts ResearchValue = 64, multiplier = 64, pct = 1
 *  - Staff.cs                 : seuils de rang par ActionsTaken (6/9, 6/12, 10/40)
 *  - Planet.cs                : survey rand(0,8), ground rand(0,32768) & 0x7FFF, cap 50 000
 *  - BattleLogic.cs           : Power = (level + 4) × ships, factor max 7, PTL −100 fuel,
 *                               dégâts rand(2..129) / rebond rand(64)
 *  - EnemyDroneBuilder.cs     : fréquences /100 (jours), cap 200 drones
 *  - InterStellarShip.cs      : voyage intra max(|Δorder|,1), inter |Δorder|×4 ; navette 2/5/2 j
 *  - CoreData.cs (Training)   : réservoir 6000, max 250/200/41, sim. 100/100/41, 24 j
 */

/** Identifiants des 16 ressources (enum ItemTypes 1-16 du remake). */
export type ResourceId =
  | 'iron' | 'titanium' | 'aluminium' | 'carbon' | 'copper' | 'hydrogen'
  | 'deuterium' | 'methane' | 'helium' | 'palladium' | 'platinum' | 'silver'
  | 'gold' | 'silica' | 'meh_fuel' | 'hed_fuel';

export const SIM_CONFIG = {
  // --- Production (Factory.cs IncrementCurrentProd) ---
  PRODUCTION_DIVISOR: 801,
  PRODUCTION_WRAP_THRESHOLD: 255,
  PRODUCTION_MAX_WRAPS: 4, // Production_Complete == 4 → item terminé
  AOC_RATE: 128, // usine automatisée : v fixe, sans ingénieurs ni ressources
  PROD_CYCLE_RESET: 7, // ProdCycle wrap (animation, sans effet de jeu)

  // --- Recherche (Research.cs UpdateResearch) ---
  RESEARCH_DIVISOR: 801,
  RESEARCH_WRAP_THRESHOLD: 255,
  RESEARCH_WRAP_INCREMENT: 11, // % par wrap
  RESEARCH_MAX_PERCENTAGE: 100,

  // --- Minage (Planet.cs DayTick) ---
  MINE_STOCK_CAP: 50_000,
  SURVEY_TICKS_MAX: 8, // rand(0,8) × surveyMultiplier
  SURVEY_GROUND_MAX: 32_768, // rand(0,32768) × mult, masqué & 0x7FFF
  EARTH_MINE_EVEN_DAYS_ONLY: true, // la Terre mine les jours pairs

  // --- Combat (BattleLogic.cs) ---
  BATTLE_POWER_LEVEL_BONUS: 4, // Power = (pilotLevel + 4) × droneCount
  BATTLE_FACTOR_CAP: 7, // factor1/2 plafonnés à 7
  BATTLE_FACTOR_ROWS: 8, // factor = row*8 + rand(8) → index dans battleFactors
  PTL_FUEL_COST: 100, // LaunchPTL : Fuel -= 100 (requis > 100)
  PTL_DAMAGE_MAX: 129, // r.Next(128) + 2
  PTL_SELF_DAMAGE_MAX: 64, // r.Next(64) puis halving successif

  // --- Ennemis (EnemyDroneBuilder.cs BuildDrones) ---
  ENEMY_DRONE_CAP: 200,
  ENEMY_DRONES_PER_BATCH: 2,
  ENEMY_BUILD_FREQUENCIES_DAYS: [7, 10, 9, 9, 9, 8, 7, 7, 8], // hex /100, index = systèmes capturés
  ENEMY_ATTACK_RANDOM_MAX: 63, // AttackDay = travel + rand(63) + 1

  // --- Voyage (InterStellarShip.cs TravelTimeRemain) ---
  TRAVEL_INTRA_MIN_DAYS: 1, // max(|Δorder|, 1)
  TRAVEL_INTER_SYSTEM_MULT: 4, // |Δorder| × 4
  FUEL_MASS_FACTOR: 100, // spec transport §4.5 : carburant = ceil(d × (100 + masse) / 100)
  SUPPLY_SLOT_MAX: 250,  // charge max par emplacement supply (GAMEPLAY §2.3 / ACC.cs)
  SHUTTLE_LAND_DAYS: 2,
  SHUTTLE_TAKEOFF_DAYS: 5,
  SHUTTLE_REPAIR_DAYS: 2,

  // --- Personnel (CoreData.cs Training + Staff.cs GetLevel) ---
  STAFF_RESERVOIR: 6_000,
  STAFF_MAX_RESEARCHERS: 250,
  STAFF_MAX_PRODUCTION: 200,
  STAFF_MAX_MARINES: 41,
  STAFF_TRAINING_SIMULTANEOUS: { research: 100, production: 100, marines: 41 },
  STAFF_TRAINING_DAYS: 24,
  STAFF_RANK_THRESHOLDS: {
    research: { doctor: 6, professor: 9 }, // ActionsTaken ≥ 6 → Doctor, ≥ 9 → Professor
    production: { engineer: 6, expert: 12 }, // ≥ 6 → Engineer, ≥ 12 → Expert
    marines: { captain: 10, admiral: 40 }, // ≥ 10 → Captain, ≥ 40 → Admiral
  },

  // --- Base & station (CoreData.cs) ---
  BASE_BUILD_PARTS: 2, // base planétaire pleinement érigée
  ORBITAL_FACTORY_PARTS: 8, // cadres OF à livrer (récit joueur : 8 pièces)
} as const;

/** Multiplicateurs de survey par ressource (CoreData.cs, autres = 1). */
export const SURVEY_MULTIPLIER: Partial<Record<ResourceId, number>> = {
  helium: 4,
  platinum: 2,
  silver: 2,
  gold: 3,
};

/** Rendu journalier par derrick (CoreData.cs ResourceRate_Per_Derrick). */
export const DERRICK_RATE: Record<ResourceId, number> = {
  iron: 2, titanium: 2, aluminium: 2, carbon: 2, copper: 2, silica: 2,
  hydrogen: 1, deuterium: 1, methane: 1, helium: 1,
  palladium: 1, platinum: 1, silver: 1, gold: 1,
  meh_fuel: 0, hed_fuel: 0, // carburants non minables
};

/** Table battleFactors du remake (BattleLogic.cs — 72 octets). */
export const BATTLE_FACTORS: readonly number[] = [
  0x10, 0x1e, 0x0c, 0x0f, 0x05, 0x12, 0x17, 0x1e, 0x09, 0x0b, 0x07, 0x09, 0x0e, 0x09, 0x0c, 0x10,
  0x06, 0x08, 0x32, 0x07, 0x0a, 0x07, 0x09, 0x0d, 0x05, 0x06, 0x04, 0x05, 0x08, 0x06, 0x07, 0x0a,
  0x04, 0x05, 0x03, 0x04, 0x06, 0x04, 0x05, 0x07, 0x03, 0x04, 0x02, 0x03, 0x04, 0x03, 0x04, 0x05,
  0x02, 0x03, 0x01, 0x02, 0x03, 0x02, 0x0c, 0x03, 0x01, 0x02, 0x01, 0x02, 0x02, 0x02, 0x0c, 0x04,
  0x0a, 0x28, 0x03, 0x05, 0x1a, 0x01, 0x14, 0x01,
];
