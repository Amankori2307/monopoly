export interface RandomSource {
  nextInt(minInclusive: number, maxInclusive: number): number;
}

export class DefaultRandomSource implements RandomSource {
  nextInt(minInclusive: number, maxInclusive: number): number {
    const span = maxInclusive - minInclusive + 1;
    return Math.floor(Math.random() * span) + minInclusive;
  }
}

export class SeededRandomSource implements RandomSource {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  nextInt(minInclusive: number, maxInclusive: number): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    const unit = this.seed / 4294967296;
    const span = maxInclusive - minInclusive + 1;
    return Math.floor(unit * span) + minInclusive;
  }
}

export const rollDie = (randomSource: RandomSource) =>
  randomSource.nextInt(1, 6);

export const shuffle = <T,>(values: T[], randomSource: RandomSource): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomSource.nextInt(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};
