# Feature Documentation

One document per feature. A feature is a slice of user-visible behaviour — a page, a game
mechanic, a system like persistence or theming.

**Adding a feature means adding its doc in the same change.** This is not optional bookkeeping:
these files are how a newcomer (human or LLM) figures out _why_ the code looks the way it does,
which the code itself cannot tell them.

## Index

| Feature                    | Doc                                      | Status                             |
| -------------------------- | ---------------------------------------- | ---------------------------------- |
| Game setup and saved games | [setup.md](setup.md)                     | Shipped                            |
| Playing a turn             | [game-turn.md](game-turn.md)             | Shipped (building/trading pending) |
| Action feedback            | [action-feedback.md](action-feedback.md) | Shipped                            |
| Site ownership             | [site-ownership.md](site-ownership.md)   | Shipped (owner actions pending)    |
| Auctions                   | [auctions.md](auctions.md)               | Shipped                            |
| Persistence and resume     | [persistence.md](persistence.md)         | Shipped                            |
| Theming                    | [../theming.md](../theming.md)           | Shipped                            |
| Rules booklet              | [rules-page.md](rules-page.md)           | Shipped                            |

## Template

Copy [\_template.md](_template.md) when starting a new feature.
