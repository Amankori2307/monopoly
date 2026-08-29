# <Feature name>

**Status:** Planned | In progress | Shipped
**Entry points:** `<the files a reader should open first>`

## What it does

Two or three sentences, in user terms. What can someone do that they could not before?

## How it works

The flow through the layers. Name the actual functions and files. A short diagram beats prose
when there is more than one hop.

## Key decisions

Choices that are not obvious from reading the code, and _why_ — especially ones where the
obvious alternative was rejected. This is the part the code cannot tell you.

## State and data

What it reads and writes: slice fields, `GameState` fields, storage keys. Note anything
persisted, because that pulls in `GAME_STATE_VERSION` and the zod schema.

## Tests

| Level       | File | Covers |
| ----------- | ---- | ------ |
| Unit        |      |        |
| Integration |      |        |
| E2E         |      |        |

## Known gaps

What is deliberately not done yet, and what would need to change to do it.
