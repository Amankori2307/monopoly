/** Shapes for the game setup form. See setupValidation.utils.ts. */

export interface SetupDraft {
  playerNames: string[];
  /** Which seats the machine plays, by the same index as `playerNames`. */
  playerIsBot: boolean[];
}
