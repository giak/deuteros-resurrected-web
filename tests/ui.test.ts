/**
 * Écran Terre (tasks 9-10) — smoke test headless hors DOM.
 * La « recette Task 12 » (clic DOM) n'existe pas encore : on valide les helpers
 * purs de src/ui/earth-screen.ts (productionRows, researchRows, staffRows,
 * miningRows) — le contenu affiché des panneaux provient de ces lignes, sans
 * document requis.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, RESEARCHABLE_ITEMS } from '@/simulation';
import { GROUND_ITEMS } from '@/simulation/data';
import { productionRows, researchRows, staffRows, miningRows } from '@/ui/earth-screen';

const GROUND_ITEM_IDS = [
  'derrick', 's_chassis', 's_drive', 'meh_fuel', 'of_frame',
  'supply_pod', 'tool_pod', 'cryo_pod', 'a_c_c',
];

describe('écran Terre — helpers purs (hors DOM, task 9)', () => {
  it('GROUND_ITEMS : 9 items queueables au sol, dont meh_fuel (K3)', () => {
    expect(GROUND_ITEMS).toHaveLength(9);
    expect(GROUND_ITEMS.map((i) => i.id)).toEqual(GROUND_ITEM_IDS);
    expect(GROUND_ITEMS.every((i) => !i.orbitOnly && i.category !== 'hidden' && i.inputs)).toBe(true);
    expect(GROUND_ITEMS.some((i) => i.id === 'meh_fuel')).toBe(true);
  });

  it('productionRows couvre les 9 items, tous désactivés au boot (stocks vides)', () => {
    const s = createInitialState(1);
    const rows = productionRows(s);
    expect(rows).toHaveLength(9);
    expect(rows.map((r) => r.id)).toEqual(GROUND_ITEM_IDS);
    expect(rows.every((r) => r.disabled)).toBe(true);
    expect(rows.every((r) => r.shortName.length > 0 && r.inputs.length > 0)).toBe(true);
  });

  it('productionRows déverrouille un item dès que ses intrants sont en stock', () => {
    const s = createInitialState(1);
    s.planets.earth.stores.iron = 3;
    s.planets.earth.stores.titanium = 4;
    s.planets.earth.stores.carbon = 1;
    const rows = productionRows(s);
    expect(rows.find((r) => r.id === 'derrick')!.disabled).toBe(false);
    expect(rows.find((r) => r.id === 'derrick')!.inputs).toBe('3 iron, 4 titanium, 1 carbon');
    expect(rows.find((r) => r.id === 'a_c_c')!.disabled).toBe(true);
  });
});

describe('écran Terre — panneau Recherche (hors DOM, task 10)', () => {
  it('researchRows couvre tous les items recherchables ; bouton Sélectionner seulement si débloqué et non recherché', () => {
    const s = createInitialState(1);
    const rows = researchRows(s);
    expect(rows).toHaveLength(RESEARCHABLE_ITEMS.length);
    expect(rows.map((r) => r.id)).toEqual(RESEARCHABLE_ITEMS.map((i) => i.id));
    const derrick = rows.find((r) => r.id === 'derrick')!;
    expect(derrick.researched).toBe(false);
    expect(derrick.locked).toBe(false);
    expect(derrick.selectable).toBe(true);
    expect(rows.find((r) => r.id === 'pulse_blaster_laser')!.selectable).toBe(false);
  });

  it('researchRows : un item verrouillé ou déjà recherché n’est plus sélectionnable', () => {
    const s = createInitialState(1);
    s.research.progress.derrick.researched = true;
    s.research.progress.of_frame.locked = true;
    const rows = researchRows(s);
    expect(rows.find((r) => r.id === 'derrick')!.selectable).toBe(false);
    expect(rows.find((r) => r.id === 'of_frame')!.selectable).toBe(false);
  });

  it('researchRows signale le projet courant', () => {
    const s = createInitialState(1);
    s.research.currentItemId = 'of_frame';
    expect(researchRows(s).find((r) => r.id === 'of_frame')!.current).toBe(true);
  });
});

describe('écran Terre — panneau Personnel (hors DOM, task 10)', () => {
  it('staffRows : réservoir 5 550 et équipes de boot (200 producteurs Apprenti, 250 chercheurs Technicien)', () => {
    const p = staffRows(createInitialState(1));
    expect(p.reservoir).toBe(5550);
    expect(p.builderCount).toBe(200);
    expect(p.builderRank).toBe('Apprenti');
    expect(p.builderActions).toBe(0);
    expect(p.researchCount).toBe(250);
    expect(p.researchRank).toBe('Technicien');
    expect(p.inTrainingProduction).toBe(0);
    expect(p.inTrainingResearch).toBe(0);
    expect(p.trainingDays).toBe(24);
  });

  it('staffRows : rang dérivé des actions prises et repli quand une équipe est absente', () => {
    const s = createInitialState(1);
    s.planets.earth.researchTeam!.actionsTaken = 6;
    expect(staffRows(s).researchRank).toBe('Docteur');
    s.planets.earth.factory.builder = null;
    s.planets.earth.researchTeam = null;
    const p = staffRows(s);
    expect(p.builderCount).toBe(0);
    expect(p.builderRank).toBe('—');
    expect(p.researchCount).toBe(0);
  });
});

describe('écran Terre — panneau Minage (hors DOM, task 10)', () => {
  it('miningRows : 8 gisements, statut « à sonder » et stock nul au boot', () => {
    const rows = miningRows(createInitialState(1));
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.groundLabel === 'à sonder' && r.stock === 0)).toBe(true);
  });

  it('miningRows : stock reflété et libellé gisement (sol / sondage en cours)', () => {
    const s = createInitialState(1);
    s.planets.earth.stores.iron = 120;
    const iron = s.planets.earth.deposits.find((d) => d.resource === 'iron')!;
    iron.groundAmount = 5000;
    let r = miningRows(s).find((x) => x.resource === 'iron')!;
    expect(r.stock).toBe(120);
    expect(r.groundLabel).toBe('5000 au sol');
    iron.groundAmount = 0;
    iron.surveyTicks = 3;
    r = miningRows(s).find((x) => x.resource === 'iron')!;
    expect(r.groundLabel).toBe('sondage : 3 j');
  });
});
