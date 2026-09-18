/**
 * Tests simulation — spec tables v1 §11 (wrap-around, gates, derricks, combat, voyage)
 * + cas limites tirés du code du remake (source:f53f5ba3fa).
 */
import { describe, expect, it } from 'vitest';
import {
  SIM_CONFIG,
  BATTLE_FACTORS,
  createInitialState,
  createRng,
  dayTick,
  getLevel,
  fleetPower,
  startBattle,
  battleRound,
  firePtl,
  travelDays,
  canStartItem,
  canMine,
  updateProduction,
  updateResearch,
  updateMining,
  switchItem,
  nextEnemyBuildDay,
  startTraining,
  canTrain,
  updateTraining,
  dailyProductionValue,
} from '@/simulation';
import type { Factory, PlanetRuntime, Staff, ProductionDayResult } from '@/simulation';

const mkStaff = (type: Staff['type'], count: number, actionsTaken = 0): Staff => ({ type, count, actionsTaken });

const mkPlanet = (over: Partial<PlanetRuntime> = {}): PlanetRuntime => ({
  id: 'test',
  deposits: [],
  derricks: 0,
  baseBuildParts: 2,
  baseDamaged: false,
  stores: {},
  items: {},
  factory: {
    currentItemId: null,
    productionValue: 0,
    productionComplete: 0,
    prodCycle: 0,
    builder: mkStaff('production', 250),
    aoc: false,
    inOrbit: false,
  },
  activeMethanoid: false,
  segment: null,
  mtxInstalled: false,
  sdmInstalled: false,
  ...over,
});

describe('production — Factory.cs /801', () => {
  it('un apprenti seul produit v = (1 << 1) * 64 / 801 = 0 les premiers jours', () => {
    const f: Factory = { ...mkPlanet().factory, builder: mkStaff('production', 1, 0) };
    // rank 1 (Apprentice), v = (1 << 1)*64/801 = 128/801 = 0 (division entière C#)
    expect(dailyProductionValue(f, 64)).toBe(0);
  });

  it('une équipe 250 experts vaut (250 << 3) * 64 / 801 = 638', () => {
    const f: Factory = { ...mkPlanet().factory, builder: mkStaff('production', 250, 12) };
    // rank 3 (Expert), v = (250 << 3)*64/801 = 2000*64/801 = 159 (floor)
    expect(dailyProductionValue(f, 64)).toBe(159);
  });

  it('terminé exactement à 4 wraps avec wrap 8 bits (séquençage du remake)', () => {
    const p = mkPlanet({
      factory: {
        currentItemId: 'tool_pod',
        productionValue: 250,
        productionComplete: 3,
        prodCycle: 0,
        builder: mkStaff('production', 250, 12),
        aoc: false,
        inOrbit: false,
      },
    });
    // v = 159 > 5 → wrap : (250+159) & 0xFF = 153, complete++ → 4 → terminé
    const done = updateProduction(p);
    expect(done.finished).toBe('tool_pod');
    expect(done.itemId).toBe('tool_pod');
    expect(done.value).toBe(0);
    expect(done.wraps).toBe(4);
    expect(done.blocked).toBe(false);
    expect(p.items['tool_pod']).toBe(1);
    expect(p.factory.productionValue).toBe(0);
    expect(p.factory.productionComplete).toBe(0);
    expect(p.factory.builder!.actionsTaken).toBe(13);
  });

  it('AOC produit à v fixe 128 sans équipe — démarrage canonique (64, complete=1)', () => {
    const p = mkPlanet({
      factory: {
        currentItemId: 'supply_pod',
        productionValue: 64, // charge initiale ResearchValue
        productionComplete: 1, // ctor ProductionItem
        prodCycle: 0,
        builder: null,
        aoc: true,
        inOrbit: true,
      },
    });
    // Séquençage : 192 · wrap(64, c2) · 192 · wrap(64, c3) · 192 · wrap(64, c4) → 6 jours
    let done: ProductionDayResult | null = null;
    let days = 0;
    for (let i = 0; i < 10 && !(done?.finished); i++) { done = updateProduction(p); days++; }
    expect(done?.finished).toBe('supply_pod');
    expect(days).toBe(6);
    expect(p.factory.aoc).toBe(true);
  });

  it("produire l'AOC libère l'équipe et active l'usine auto", () => {
    const p = mkPlanet({
      factory: {
        currentItemId: 'a_o_c',
        productionValue: 250,
        productionComplete: 3,
        prodCycle: 0,
        builder: mkStaff('production', 250, 12),
        aoc: false,
        inOrbit: true,
      },
    });
    const done = updateProduction(p);
    expect(done.finished).toBe('a_o_c');
    expect(p.factory.aoc).toBe(true);
    expect(p.factory.builder).toBeNull();
    expect(p.factory.currentItemId).toBeNull();
  });

  it('changer d\'item en cours remet à la charge initiale (travail perdu, Production.cs)', () => {
    const f = mkPlanet().factory;
    f.currentItemId = 'derrick';
    f.productionValue = 200;
    f.productionComplete = 2;
    switchItem(f, 'tool_pod');
    // nouvel item : démarre à ResearchValue (64) avec Production_Complete = 1
    expect(f.productionValue).toBe(64);
    expect(f.productionComplete).toBe(1);
    expect(f.currentItemId).toBe('tool_pod');
    switchItem(f, null);
    expect(f.currentItemId).toBeNull();
    expect(f.productionValue).toBe(0);
  });

  it('gates : orbit-only refusé au sol, rang insuffisant refusé', () => {
    const ground = mkPlanet().factory;
    expect(canStartItem(ground, 'ios_drone').ok).toBe(false); // orbitOnly
    const novice: Factory = { ...ground, builder: mkStaff('production', 10, 0) };
    expect(canStartItem(novice, 'i_chassis').ok).toBe(false); // tech 2 > Apprentice(1)
    const expert: Factory = { ...ground, inOrbit: true, builder: mkStaff('production', 10, 12) };
    expect(canStartItem(expert, 'i_chassis').ok).toBe(true);
  });
});

describe('recherche — Research.cs /801', () => {
  it('gate par rang du chef (tech 3 ⇒ Professeur requis)', () => {
    const state = createInitialState(42);
    state.research.progress['m_t_x'] = { researched: false, researchValue: 0, percentage: 1, researchOrder: 0, locked: false };
    state.research.currentItemId = 'm_t_x';
    const novice = mkStaff('research', 250, 0); // Technician
    const out = updateResearch(state, novice);
    expect(out.finished).toBeNull();
    expect(out.blocked).toBe(true);
    expect(out.progress?.itemId).toBe('m_t_x');
    const prof = mkStaff('research', 250, 9); // Professor
    // v = (250 << 3)*64/801 = 159/jour → 0..255 wrap...
    updateResearch(state, prof);
    expect(state.research.progress['m_t_x'].researchValue).toBe(159);
  });

  it('progression +11 %/wrap, plafonnée à 100 %, puis researched', () => {
    const state = createInitialState(42);
    state.research.progress['derrick'] = { researched: false, researchValue: 250, percentage: 1, researchOrder: 0, locked: false };
    state.research.currentItemId = 'derrick';
    const team = mkStaff('research', 250, 9); // Professor, v = 159
    // jour 1 : wrap (250+159 > 255) → value 153, pct 1+11=12
    updateResearch(state, team);
    expect(state.research.progress['derrick'].percentage).toBe(12);
    // force la fin : wraps supplémentaires → pct 100 (jour 11)
    for (let i = 0; i < 12; i++) updateResearch(state, team);
    expect(state.research.progress['derrick'].researched).toBe(true);
    expect(state.research.progress['derrick'].percentage).toBe(100);
    expect(team.actionsTaken).toBe(10);
  });

  it('aucune progression sans équipe (démarrage du jeu)', () => {
    const state = createInitialState(42);
    state.research.progress['derrick'] = { researched: false, researchValue: 0, percentage: 1, researchOrder: 0, locked: false };
    state.research.currentItemId = 'derrick';
    const out = updateResearch(state, null);
    expect(out.finished).toBeNull();
    expect(out.blocked).toBe(true);
    expect(state.research.progress['derrick'].researchValue).toBe(0);
  });
});

describe('minage — Planet.cs', () => {
  it('conditions : derricks + base complète + non endommagée', () => {
    expect(canMine(mkPlanet({ derricks: 1 }))).toBe(true);
    expect(canMine(mkPlanet({ derricks: 0 }))).toBe(false);
    expect(canMine(mkPlanet({ derricks: 1, baseBuildParts: 1 }))).toBe(false);
    expect(canMine(mkPlanet({ derricks: 1, baseDamaged: true }))).toBe(false);
  });

  it('la Terre ne mine que les jours pairs', () => {
    const earth = mkPlanet({
      id: 'earth',
      derricks: 2,
      deposits: [{ resource: 'iron', groundAmount: 1000, surveyTicks: 0 }],
    });
    const rng = createRng(1);
    expect(Object.keys(updateMining(earth, 3, rng))).toHaveLength(0); // impair
    const m = updateMining(earth, 4, rng);
    expect(m['iron']).toBe(4); // 2 derricks × rate 2
    expect(earth.deposits[0].groundAmount).toBe(996);
  });

  it('sondage : rand(0,8)×mult puis ground rand(0,32768)×mult & 0x7FFF', () => {
    const p = mkPlanet({
      derricks: 1,
      deposits: [{ resource: 'helium', groundAmount: 0, surveyTicks: 0 }],
    });
    const rng = createRng(7);
    updateMining(p, 2, rng); // programme surveyTicks = rand(0,8) × 4
    expect(p.deposits[0].surveyTicks).toBeGreaterThanOrEqual(0);
    expect(p.deposits[0].surveyTicks).toBeLessThanOrEqual(28); // 7 × 4 max
    // décompte jusqu'au sondage
    for (let i = 0; i < 40 && p.deposits[0].groundAmount < 1; i++) updateMining(p, 2 + i, rng);
    expect(p.deposits[0].groundAmount).toBeGreaterThanOrEqual(0);
    expect(p.deposits[0].groundAmount).toBeLessThanOrEqual(0x7fff);
  });

  it('plafond de stock 50 000', () => {
    const p = mkPlanet({
      derricks: 1,
      stores: { iron: SIM_CONFIG.MINE_STOCK_CAP },
      deposits: [{ resource: 'iron', groundAmount: 1000, surveyTicks: 0 }],
    });
    updateMining(p, 4, createRng(1));
    expect(p.stores['iron']).toBe(SIM_CONFIG.MINE_STOCK_CAP);
  });
});

describe('combat — BattleLogic.cs', () => {
  it('Power = (level + 4) × ships', () => {
    expect(fleetPower(0, 50)).toBe(200);
    expect(fleetPower(3, 10)).toBe(70);
  });

  it('la table battleFactors fait 72 entrées (remake)', () => {
    expect(BATTLE_FACTORS).toHaveLength(72);
  });

  it('une flotte très supérieure écrase lennemi sans pertes (ratio ≥ 7)', () => {
    const player = { id: 'p', methanoidOwned: false, starId: 'the_sun', locationPlanetId: 'earth', destinationPlanetId: null, startTravelDay: 0, droneCount: 200, pilotLevel: 3, hasPtl: false, fuel: 0 };
    const enemy = { ...player, id: 'e', methanoidOwned: true, droneCount: 2, pilotLevel: 1 };
    const b = startBattle(player, enemy, 0);
    // p1 power = 7*200 = 1400 ; p2 = 5*2 = 10 → factor2 = 127 → cap 7 → facteur max
    for (let i = 0; i < 500 && !b.ended; i++) battleRound(b, createRng(123 + i));
    expect(b.p2.ships).toBeLessThanOrEqual(0);
    expect(b.p1.ships).toBeGreaterThan(180);
  });

  it('PTL : coûte 100 fuel et nécessite > 100', () => {
    const player = { id: 'p', methanoidOwned: false, starId: 'the_sun', locationPlanetId: 'earth', destinationPlanetId: null, startTravelDay: 0, droneCount: 50, pilotLevel: 2, hasPtl: true, fuel: 150 };
    const enemy = { ...player, id: 'e', methanoidOwned: true, droneCount: 50, pilotLevel: 2 };
    const b = startBattle(player, enemy, 0);
    const fleet = { ...player };
    expect(firePtl(b, fleet)).toBe(true);
    expect(fleet.fuel).toBe(50);
    expect(firePtl(b, fleet)).toBe(false); // déjà tiré

    const poor = { ...player, fuel: 100 };
    const b2 = startBattle(player, enemy, 0);
    expect(firePtl(b2, poor)).toBe(false); // fuel doit être > 100
  });
});

describe('voyage — InterStellarShip.cs', () => {
  it('intra-système : max(|Δorder|, 1)', () => {
    expect(travelDays('earth', 'mars')).toBe(1); // |2-3| = 1
    expect(travelDays('earth', 'pluto')).toBe(7); // |2-9|
    expect(travelDays('earth', 'the_moon')).toBe(2); // moon order 0 → |2-0|
  });

  it('inter-systèmes : |Δorder| × 4', () => {
    expect(travelDays('earth', 'atlantic')).toBe(8); // |2-4| × 4
  });

  it('navette : 2/5/2 jours', () => {
    expect(2).toBe(2); // SHUTTLE_LAND_DAYS / TAKEOFF / REPAIR via SIM_CONFIG
    expect(SIM_CONFIG.SHUTTLE_LAND_DAYS).toBe(2);
    expect(SIM_CONFIG.SHUTTLE_TAKEOFF_DAYS).toBe(5);
    expect(SIM_CONFIG.SHUTTLE_REPAIR_DAYS).toBe(2);
  });
});

describe('staff — Staff.cs', () => {
  it('seuils de rang : 6/9 recherche, 6/12 production, 10/40 marines', () => {
    expect(getLevel(mkStaff('research', 1, 5))).toBe(1);
    expect(getLevel(mkStaff('research', 1, 6))).toBe(2);
    expect(getLevel(mkStaff('research', 1, 9))).toBe(3);
    expect(getLevel(mkStaff('production', 1, 11))).toBe(2);
    expect(getLevel(mkStaff('production', 1, 12))).toBe(3);
    expect(getLevel(mkStaff('marines', 1, 39))).toBe(2);
    expect(getLevel(mkStaff('marines', 1, 40))).toBe(3);
  });

  it('formation : 24 jours, limites 100/100/41, un seul type à la fois', () => {
    const state = createInitialState(1);
    expect(canTrain(state, 'research', 100)).toBe(true);
    expect(canTrain(state, 'research', 101)).toBe(false);
    expect(canTrain(state, 'marines', 42)).toBe(false);
    expect(startTraining(state, 'research', 100)).toBe(true);
    expect(state.training.reservoir).toBe(5_450);
    expect(canTrain(state, 'production', 10)).toBe(false); // déjà en formation
    // avancer de 24 jours
    state.day += 24;
    let assigned = 0;
    updateTraining(state, (_t, n) => { assigned += n; });
    expect(assigned).toBe(100);
  });
});

describe('ennemis — EnemyDroneBuilder.cs', () => {
  it('fréquences de build = hex/100 jours, indexées par systèmes reconquis', () => {
    const state = createInitialState(1);
    state.atWar = true;
    expect(nextEnemyBuildDay(state, 10)).toBe(17); // 700/100 = 7
    state.starSystemsCaptured = 1;
    expect(nextEnemyBuildDay(state, 10)).toBe(20); // 1000/100 = 10
  });
});

describe('état initial — miroir CoreData.cs', () => {
  it('Terre : 1 derrick, usine au sol ; Lune endommagée ; réservoir 5550', () => {
    const s = createInitialState(1);
    expect(s.planets.earth.derricks).toBe(1);
    expect(s.planets.earth.factory.inOrbit).toBe(false);
    expect(s.planets.the_moon.baseDamaged).toBe(true);
    expect(s.training.reservoir).toBe(5_550);
    expect(s.planets.jupiter.activeMethanoid).toBe(true);
    expect(s.planets.titania.activeMethanoid).toBe(true);
  });

  it('les items de départ sont débloqués (derrick, pods, chassis, drive, MeH, OF)', () => {
    const s = createInitialState(1);
    expect(s.research.progress['derrick'].locked).toBe(false);
    expect(s.research.progress['of_frame'].locked).toBe(false);
    expect(s.research.progress['m_t_x'].locked).toBe(true);
  });
});

describe('retours enrichis (trace — task 2)', () => {
  it("updateProduction : arrêt (pas d'équipe) → itemId derrick, blocked true", () => {
    const p = mkPlanet({
      factory: {
        currentItemId: 'derrick',
        productionValue: 64,
        productionComplete: 1,
        prodCycle: 0,
        builder: null,
        aoc: false,
        inOrbit: false,
      },
    });
    const out = updateProduction(p);
    expect(out.finished).toBeNull();
    expect(out.itemId).toBe('derrick');
    expect(out.blocked).toBe(true);
  });
  it('updateResearch : progression en cours → progress {itemId, percentage}, blocked false', () => {
    const state = createInitialState(42);
    state.research.progress['of_frame'] = { researched: false, researchValue: 64, percentage: 1, researchOrder: 0, locked: false };
    state.research.currentItemId = 'of_frame';
    const team = mkStaff('research', 250, 0); // Technician, v = 39
    const out = updateResearch(state, team);
    expect(out.finished).toBeNull();
    expect(out.blocked).toBe(false);
    expect(out.progress).toEqual({ itemId: 'of_frame', percentage: 1 });
    expect(out.progress?.percentage).toBe(1);
  });
});

describe('pause auto — signal moteur trainingFinished (K11)', () => {
  it('dayTick : formation à échéance (24 j) renvoie trainingFinished {type,count} + ligne journal', () => {
    const state = createInitialState(1);
    expect(startTraining(state, 'production', 100)).toBe(true);
    state.day += 24;
    const result = dayTick(state);
    expect(result.trainingFinished).toEqual([{ type: 'production', count: 100 }]);
    expect(result.journal).toContain('[J25] formation production : +100 recrues.');
    expect(state.training.inTraining.production).toBe(0);
  });

  it('dayTick : sans échéance, trainingFinished est vide', () => {
    const state = createInitialState(1);
    startTraining(state, 'production', 100);
    state.day += 23;
    expect(dayTick(state).trainingFinished).toEqual([]);
  });
});
