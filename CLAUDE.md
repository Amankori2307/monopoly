# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm start` - Start development server on port 3000
- `pnpm run build` - Build optimized production bundle
- `pnpm test` - Run test suite (uses React Testing Library)
- `pnpm run deploy` - Deploy to GitHub Pages (builds first)

### Code Quality Commands

- `pnpm run lint` - Run ESLint to check for code issues
- `pnpm run lint:fix` - Run ESLint and auto-fix fixable issues
- `pnpm run format` - Format all code with Prettier
- `pnpm run format:check` - Check if code is formatted correctly
- `pnpm run check-all` - Run both linting and format checking
- `pnpm run fix-all` - Auto-fix linting issues and format code

## Code Architecture

### Technology Stack
- **Frontend**: React 17 with functional components and hooks
- **State Management**: Redux with traditional actions/reducers pattern
- **Styling**: SCSS modules with component-specific styles
- **Routing**: React Router DOM v5
- **Testing**: React Testing Library with custom Redux test utilities

### Redux State Structure
The application uses a centralized Redux store with these main slices:
- `playersData` - Player information (money, position, properties, active player)
- `dice` - Dice state (current values, rolling animation)
- `board` - Board state and game progression
- `modalData` - Modal visibility and current modal type
- `siteData` - Property ownership, mortgages, and building states
- `actionData` - Current player actions and turn state
- `card` - Card-related state for property transactions

### Game Logic Architecture
The Monopoly game implements complex board game mechanics:

1. **Turn System**: Players take turns rolling dice and moving around the board
2. **Property Interactions**: Landing on properties triggers different actions based on ownership
3. **Financial Transactions**: Money management with rent, taxes, and property purchases
4. **Special Spaces**: Chance/Chest cards, jail, taxes, and special movement spaces
5. **Building System**: Property development with houses and hotels

### Key Components Structure
- `Monopoly.js` - Main game container with game state orchestration
- `Board.js` - Visual board layout and property grid
- `DiceContainer.js` - Dice rolling logic and animation
- `PlayerContainer.js` - Player piece positioning and movement
- `ModalContainer.js` - Dynamic modal system for game interactions
- `Actions.js` - Property management actions (build, sell, mortgage, redeem)

### Data Files
- `boardData.json` - Complete board configuration with all 40 spaces
- `chanceData.json` - Chance card actions and effects
- `chestData.json` - Community Chest card actions and effects

### Game State Flow
1. Player rolls dice → `dice` reducer updates values
2. Player moves → `player` reducer updates position
3. Landing logic → `playerAppropriateActionUtils.js` determines action
4. Property interaction → Modals trigger for buy/auction/rent
5. Turn completion → Active player switches

### Testing Strategy
- Component tests use custom `testUtils.js` wrapper with Redux Provider
- Tests focus on user interactions and state changes
- Mock store testing for Redux-connected components

### Key Utility Functions
- `playerAppropriateActionUtils.js` - Core game logic for property interactions
- `playerUtility.js` - Player data management and rent calculations
- `boardUtility.js` - Board position and movement utilities
- `cardUtilities.js` - Property card display and management

### Audio Integration
Game includes audio feedback for:
- Dice rolling (`rolldice1.wav`, `rolldice2.wav`)
- Player movement (`playermove.wav`)

### Deployment
- Hosted on GitHub Pages at https://amankori2307.github.io/monopoly/
- Build process optimized for static hosting
- Assets and routing configured for subdirectory deployment