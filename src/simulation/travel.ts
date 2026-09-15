/**
 * Voyage — InterStellarShip.cs TravelTimeRemain + Shuttle.cs.
 * Intra-système : max(|Δorder|, 1) jours ; inter-systèmes : |Δorder| × 4.
 * Navette : atterrissage 2 j, décollage 5 j, réparation 2 j.
 */
import { SIM_CONFIG } from './config';
import { getBody } from './data';

/** Durée totale d'un voyage entre deux corps (en jours). */
export function travelDays(fromId: string, toId: string): number {
  const from = getBody(fromId);
  const to = getBody(toId);
  if (from.starId !== to.starId) {
    // Inter-systèmes : |Δordre| × 4 (les étoiles portent l'ordre de leur 1er corps)
    return Math.abs(from.order - to.order) * SIM_CONFIG.TRAVEL_INTER_SYSTEM_MULT;
  }
  return Math.max(Math.abs(from.order - to.order), SIM_CONFIG.TRAVEL_INTRA_MIN_DAYS);
}

export function shuttleLandDays(): number {
  return SIM_CONFIG.SHUTTLE_LAND_DAYS;
}

export function shuttleTakeoffDays(): number {
  return SIM_CONFIG.SHUTTLE_TAKEOFF_DAYS;
}

export function shuttleRepairDays(): number {
  return SIM_CONFIG.SHUTTLE_REPAIR_DAYS;
}
