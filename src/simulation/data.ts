/**
 * Accès typé aux données statiques (data/*.json générés par scripts/generate_data.py).
 */
import rawResources from '../../data/resources.json';
import rawItems from '../../data/items.json';
import rawPlanets from '../../data/planets.json';
import type { ResourceId } from './config';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  symbol: string;
  type: 'raw' | 'precious' | 'compound_fuel';
  minable: boolean;
  derrickRate: number;
  surveyMultiplier: number;
}

export type ItemCategory = 'resource' | 'item' | 'hidden';

export interface ItemDef {
  id: string;
  name: string;
  shortName: string;
  category: ItemCategory;
  mass: number;
  orbitOnly: boolean;
  toolPod: boolean;
  autoProduce: boolean;
  unique: boolean;
  researchIndex?: number;
  techLevel?: number;
  researchMultiplier?: number;
  researchValue?: number;
  inputs?: Partial<Record<ResourceId, number>>;
}

export interface BodyDef {
  id: string;
  name: string;
  starId: string;
  order: number;
  type: 'planet' | 'moon';
  moonParentId: string | null;
  deposits: ResourceId[];
  baseBuildParts: number;
  baseDamaged: boolean;
  derricks: number;
  segment: number | null;
  methanoidColony: boolean;
}

export const RESOURCES = rawResources.resources as ResourceDef[];
export const ITEMS = rawItems.items as ItemDef[];
export const BODIES = rawPlanets.bodies as BodyDef[];
export const SYSTEMS = rawPlanets.systems as Array<{ id: string; name: string; index: number }>;

const byId = <T extends { id: string }>(list: T[]): Record<string, T> =>
  Object.fromEntries(list.map((x) => [x.id, x]));

export const RESOURCE_BY_ID = byId(RESOURCES);
export const ITEM_BY_ID = byId(ITEMS);
export const BODY_BY_ID = byId(BODIES);

/**
 * Items queueables à l'usine au sol en v0 (spec §6.2 : 8 tech-1 + a_c_c tech-3).
 * K3 : PAS de gate de catégorie — meh_fuel (category 'resource') est queueable
 * au sol ; 'hidden' n'a jamais d'inputs et hed_fuel est orbitOnly (redondants).
 */
export const GROUND_ITEMS: ItemDef[] = ITEMS.filter(
  (i) => i.inputs && !i.orbitOnly,
);

/** Items avec chaîne de recherche (31), ordonnés par researchIndex. */
export const RESEARCHABLE_ITEMS: ItemDef[] = ITEMS.filter(
  (i): i is ItemDef & Required<Pick<ItemDef, 'researchIndex' | 'techLevel' | 'researchMultiplier' | 'researchValue'>> =>
    i.researchIndex !== undefined,
).sort((a, b) => a.researchIndex - b.researchIndex);

/** Corps du système solaire seul (périmètre v1). */
export const SOL_BODIES: BodyDef[] = BODIES.filter((b) => b.starId === 'the_sun');

export function getItem(id: string): ItemDef {
  const it = ITEM_BY_ID[id];
  if (!it) throw new Error(`Item inconnu : ${id}`);
  return it;
}

export function getBody(id: string): BodyDef {
  const b = BODY_BY_ID[id];
  if (!b) throw new Error(`Corps inconnu : ${id}`);
  return b;
}
