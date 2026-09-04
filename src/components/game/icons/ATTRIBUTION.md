# Board icon attribution

Every glyph in [spaceGlyphs.ts](./spaceGlyphs.ts) is **Font Awesome Free 6.7.2**, used under
**CC BY 4.0**.

- Icons: <https://fontawesome.com> — CC BY 4.0
- Licence: <https://fontawesome.com/license/free>
- Copyright 2024 Fonticons, Inc.

## Why this file is here rather than beside a set of `.svg` files

It used to be two `ATTRIBUTION.md` files under `src/assets/images/`, next to eleven `.svg`s. Those
files are gone: the icons are drawn inline now so that a theme can colour them, which was impossible
while they were `<img src={url}>` with the colour baked into the file.

The licence follows the artwork, not the file extension. The path data in `spaceGlyphs.ts` **is** the
Font Awesome artwork, copied verbatim, so the CC BY attribution obligation came with it. Deleting the
`.svg` files without keeping this would have quietly dropped a licence condition.

## The glyphs

| Key               | Font Awesome source file | Used for                    |
| ----------------- | ------------------------ | --------------------------- |
| `go`              | `go.svg`                 | GO                          |
| `freeParking`     | `free-parking.svg`       | Free Parking                |
| `justVisiting`    | `just-visiting.svg`      | Jail / Just Visiting        |
| `goToJail`        | `go-to-jail.svg`         | Go To Jail                  |
| `railway`         | `railway.svg`            | all four railway stations   |
| `communityChest`  | `community-chest.svg`    | Community Chest             |
| `chance`          | `chance.svg`             | Chance                      |
| `tax`             | `tax.svg`                | Income Tax                  |
| `superTax`        | `super-tax.svg`          | Super Tax (index override)  |
| `waterWorks`      | `water-works.svg`        | Water Works                 |
| `electricCompany` | `electric-company.svg`   | Electric Company (index 12) |

Adding or replacing a glyph means adding a row here.
