import { scopedTestId, TEST_IDS } from '../../shared/constants/testIds.constants';

interface DieFaceProps {
  /** Scopes the test id, so two dice on screen are separable. */
  index: number;
  isRolling: boolean;
  value: number;
}

/**
 * One die face, as pips.
 *
 * Its own file because two places roll dice: the dock, and the Jail panel - a
 * jailed player rolls for doubles from inside a modal whose backdrop covers the
 * dock entirely.
 */
export function DieFace({ index, isRolling, value }: DieFaceProps) {
  return (
    <div
      aria-label={`${value}`}
      className={`die-face face-${value} ${isRolling ? 'is-rolling' : ''}`}
      data-testid={scopedTestId(TEST_IDS.dieFace, index)}
    >
      {Array.from({ length: value }, (_, pipIndex) => (
        <span className={`pip pip-${pipIndex + 1}`} key={pipIndex} />
      ))}
    </div>
  );
}
