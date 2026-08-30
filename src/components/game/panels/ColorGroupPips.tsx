import type { ColorGroupProgress } from '../../../domain/rules/holdings.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';

interface ColorGroupPipsProps {
  progress: ColorGroupProgress[];
}

/**
 * One swatch per colour group the player holds any of, filled when the set is
 * complete. Set progress is the strongest strategic signal in the game, so it
 * belongs on the card rather than only behind a click.
 */
export function ColorGroupPips({ progress }: ColorGroupPipsProps) {
  if (progress.length === 0) {
    return null;
  }

  return (
    <div className="group-pips" data-testid={TEST_IDS.colorGroupPips}>
      {progress.map(({ group, owned, total, isComplete }) => (
        <span
          aria-label={`${group}: ${owned} of ${total}${isComplete ? ', complete set' : ''}`}
          className={`group-pip group-${group} ${isComplete ? 'is-complete' : ''}`}
          data-testid={scopedTestId(TEST_IDS.colorGroupPip, group)}
          key={group}
          role="img"
          title={`${owned}/${total}`}
        />
      ))}
    </div>
  );
}
