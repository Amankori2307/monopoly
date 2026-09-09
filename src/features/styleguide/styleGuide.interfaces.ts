/** One custom property the active palette defines, as a swatch can paint it. */
export interface PaletteSwatch {
  /** The full property name, `--accent-hover`. */
  name: string;
  /** Its computed value: a colour, or a gradient of them. */
  value: string;
}
