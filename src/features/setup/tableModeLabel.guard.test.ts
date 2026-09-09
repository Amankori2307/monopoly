import { describe, expect, it } from 'vitest';
import { TableMode } from '../../domain/types/game.enums';
import { TABLE_MODE_LABEL } from './tableMode.constants';

/**
 * Every table mode has a word for it.
 *
 * The `soundCues.guard.test.ts` tactic: without this, a new mode ships as a
 * blank badge on the home screen and nothing fails.
 */
describe('the table mode labels', () => {
  it.each(Object.values(TableMode))('names %s', (mode) => {
    expect(TABLE_MODE_LABEL[mode]).toBeTruthy();
  });

  it('names nothing that is not a table mode', () => {
    expect(Object.keys(TABLE_MODE_LABEL).sort()).toEqual(Object.values(TableMode).sort());
  });
});
