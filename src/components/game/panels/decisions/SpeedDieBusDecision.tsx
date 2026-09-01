import { TEST_IDS, scopedTestId } from '../../../../shared/constants/testIds.constants';

interface SpeedDieBusDecisionProps {
  onChoose: (steps: number) => void;
  playerName: string;
  /** The two white dice, which are the only values on offer. */
  whiteDice: [number, number];
}

/**
 * The Bus face: move by one white die, the other, or both.
 *
 * Three buttons rather than a number field, because those three are the only
 * legal answers - offering a free choice would be a different game.
 */
export function SpeedDieBusDecision({
  onChoose,
  playerName,
  whiteDice,
}: SpeedDieBusDecisionProps) {
  const [first, second] = whiteDice;
  // Both dice showing the same number would make two identical buttons.
  const options =
    first === second ? [first, first + second] : [first, second, first + second];

  return (
    <div className="speed-die-decision" data-testid={TEST_IDS.busDecision}>
      <p className="eyebrow">Speed Die — Bus</p>
      <h2>{playerName} caught the bus</h2>
      <p className="speed-die-lede">
        Move by either white die, or by both. The dice showed {first} and {second}.
      </p>

      <div className="button-row">
        {options.map((steps) => (
          <button
            className="secondary-button"
            data-testid={scopedTestId(TEST_IDS.busChoice, steps)}
            key={steps}
            onClick={() => onChoose(steps)}
            type="button"
          >
            Move {steps}
          </button>
        ))}
      </div>
    </div>
  );
}
