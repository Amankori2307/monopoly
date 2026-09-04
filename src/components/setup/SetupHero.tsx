import { Link } from 'react-router-dom';
import { RulesetSummary } from './RulesetSummary';

interface SetupHeroProps {
  currencySymbol: string;
  themeName: string;
}

/**
 * The masthead: what this is, and what the game about to start is like.
 *
 * Built as a title deed, because that is the game's own object - a colour band
 * across the top, a mono label, a serif name. It used to be a project README
 * pointed at the player ("a typed, resumable rebuild ... with the rules engine
 * separated from the UI") beside a "Locked v1 scope" table.
 *
 * The ruleset card follows the theme picked in the form below, so the numbers on
 * screen are always the ones the game will be started with.
 */
export function SetupHero({ currencySymbol, themeName }: SetupHeroProps) {
  return (
    <section className="setup-masthead">
      <div className="masthead-brand">
        {/* The game's own name, from the theme rather than from copy here, so
            the masthead follows whichever ruleset is selected below. */}
        <h1>{themeName}</h1>
        <p className="masthead-lede">
          Roll, buy, build, and bankrupt your friends around one board. Every game saves
          itself as you play, so you can stop mid-turn and pick it up later.
        </p>
        <Link className="secondary-button" to="/rules">
          Read the rules
        </Link>
      </div>

      <RulesetSummary currencySymbol={currencySymbol} />
    </section>
  );
}
