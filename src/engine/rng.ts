/**
 * The seeded random generator (ADR-0001, spec §2 principle 3). A Session's
 * seed and a Turn's index give that Turn's roll, so a Replay with the same
 * seed reproduces every death roll, whatever happened in between. Pure.
 */

/** One round of mulberry32: a 32-bit state to a float in [0, 1). */
function mulberry32(state: number) {
  let t = (state + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** The death roll for Turn `turnIdx` of a Session seeded with `seed`: a number in [0, 1). */
export function deathRollFor(seed: number, turnIdx: number): number {
  const mixed =
    Math.imul(seed | 0, 0x85ebca6b) ^ Math.imul((turnIdx + 1) | 0, 0xc2b2ae35)
  // Two rounds, so neighbouring seeds and Turns do not give neighbouring rolls.
  return mulberry32(Math.floor(mulberry32(mixed) * 4294967296))
}
