/**
 * Écran Terre (task 9) — smoke test headless hors DOM.
 * La « recette Task 12 » (clic DOM) n'existe pas encore : on valide les helpers
 * purs de src/ui/earth-screen.ts (productionRows) — le contenu affiché du
 * panneau Production provient de ces lignes, sans document requis.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/simulation';
import { GROUND_ITEMS } from '@/simulation/data';
import { productionRows } from '@/ui/earth-screen';

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