import { describe, expect, it } from 'vitest';
import { indiaEditionBoard } from '../board/indiaEditionBoard';
import { SpaceKind } from '../types/game.enums';
import { isOwnableSpace, isStreetSpace } from './space.utils';

const spaceOfKind = (kind: SpaceKind) => {
  const space = indiaEditionBoard.find((candidate) => candidate.kind === kind);
  if (!space) {
    throw new Error(`No ${kind} on the board`);
  }
  return space;
};

describe('isOwnableSpace', () => {
  it.each([SpaceKind.Street, SpaceKind.Railway, SpaceKind.Utility])(
    'treats %s as ownable',
    (kind) => {
      expect(isOwnableSpace(spaceOfKind(kind))).toBe(true);
    }
  );

  it.each([
    SpaceKind.Go,
    SpaceKind.Tax,
    SpaceKind.Chance,
    SpaceKind.CommunityChest,
    SpaceKind.Jail,
    SpaceKind.FreeParking,
    SpaceKind.GoToJail,
  ])('treats %s as not ownable', (kind) => {
    expect(isOwnableSpace(spaceOfKind(kind))).toBe(false);
  });

  it('matches the count of title deeds on the board', () => {
    // 22 streets + 4 railways + 2 utilities per the India Edition ruleset.
    expect(indiaEditionBoard.filter(isOwnableSpace)).toHaveLength(28);
  });
});

describe('isStreetSpace', () => {
  it('narrows to streets only', () => {
    expect(indiaEditionBoard.filter(isStreetSpace)).toHaveLength(22);
  });
});
