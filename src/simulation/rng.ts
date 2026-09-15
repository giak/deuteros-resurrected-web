/**
 * PRNG déterministe (mulberry32) — sérialisable via le seed dans GameState.
 * Tout appel aléatoire de la simulation passe par ici (DATA.md §3.5).
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Entier aléatoire dans [0, max) — équivalent C# Random.Next(0, max). */
export function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}
