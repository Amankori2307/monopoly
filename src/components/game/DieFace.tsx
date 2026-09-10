import { scopedTestId, TEST_IDS } from '../../shared/constants/testIds.constants';

interface DieFaceProps {
  /** Scopes the test id, so two dice on screen are separable. */
  index: number;
  isRolling: boolean;
  /**
   * True for the second mount, in the phone HUD's middle column. The dock keeps
   * `die-face-0` and `die-face-1` so every existing query still works; this one
   * takes its own ids, because two elements answering one test id is a
   * Playwright strict-mode failure even when one is `display: none`.
   */
  isHud?: boolean;
  value: number;
}

/**
 * One die face, as pips.
 *
 * Its own file because two places roll dice: the dock, and the Jail panel - a
 * jailed player rolls for doubles from inside a modal whose backdrop covers the
 * dock entirely.
 */
export function DieFace({ index, isHud = false, isRolling, value }: DieFaceProps) {
  const testId = scopedTestId(isHud ? TEST_IDS.dieFaceHud : TEST_IDS.dieFace, index);

  return (
    <div
      aria-label={`${value}`}
      className={`die-face face-${value} ${isRolling ? 'is-rolling' : ''}`}
      data-testid={testId}
    >
      {Array.from({ length: value }, (_, pipIndex) => (
        <span className={`pip pip-${pipIndex + 1}`} key={pipIndex} />
      ))}
    </div>
  );
}
