/** The randomness seam. Implementations live in rng.ts. */

export interface RandomSource {
  nextInt(minInclusive: number, maxInclusive: number): number;
}
