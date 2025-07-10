# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context & History

### Project Overview
This is a Zelda-themed Monopoly board game implementation built with React, TypeScript, and Redux. The project was migrated from Create React App to NX + Vite + TypeScript for better performance and development experience.

### Major Migrations Completed

#### 1. Package Manager Migration (✅ Complete)
- **From**: npm with package-lock.json
- **To**: pnpm with pnpm-lock.yaml
- **Status**: All packages now managed with pnpm

#### 2. Package Updates (✅ Complete)
- **Action**: Updated all packages to latest versions
- **Key Updates**:
  - React 19 with modern features
  - React Router v7 (breaking changes handled)
  - ESLint 8.57.1 (downgraded from v9 for compatibility)
  - Web Vitals v5 (API changes handled)
  - Vite 6.3.5 (downgraded from v7 for NX compatibility)

#### 3. TypeScript Migration (✅ Infrastructure Complete)
- **Strategy**: Gradual migration approach
- **Current State**: All .js files renamed to .ts/.tsx
- **TypeScript Config**: Strict mode disabled for gradual transition
- **Type Declarations**: Added for CSS modules and assets
- **Next Steps**: Continue adding proper types throughout codebase

#### 4. Code Quality Tools (✅ Complete)
- **ESLint**: Configured with React best practices
- **Prettier**: Set up with project standards
- **Auto-fix capabilities**: Both ESLint and Prettier support auto-fixing

#### 5. Build System Migration (✅ Complete)
- **From**: Create React App
- **To**: NX + Vite + TypeScript
- **Benefits**: Faster builds, better caching, modern tooling

### Known Issues & Fixes Applied

#### React Router v7 Breaking Changes
- **Issue**: `Switch` component removed, route syntax changed
- **Fix**: Replaced with `Routes` and updated `component={Component}` to `element={<Component />}`

#### React 19 Changes
- **Issue**: `ReactDOM.render` deprecated
- **Fix**: Updated to `ReactDOM.createRoot().render()`

#### Web Vitals v5 API Changes
- **Issue**: Function names changed from `getCLS` to `onCLS`
- **Fix**: Updated reportWebVitals.ts accordingly

#### ESLint Version Compatibility
- **Issue**: ESLint 9 incompatible with React Scripts
- **Fix**: Downgraded to ESLint 8.57.1

#### Vite v7 Compatibility
- **Issue**: Vite 7 had crypto.hash errors with NX
- **Fix**: Downgraded to Vite 6.3.5

## Game Implementation Details

### Zelda-Themed Monopoly Rules
This implementation follows standard Monopoly rules with Zelda theming:

#### Board Layout (40 spaces)
- **Corner Spaces**: GO, Jail, Free Parking, Go to Jail
- **Property Groups** (8 groups):
  - Brown: Minish Woods, Ordon Village
  - Green: Kokiri Forest, Lost Woods, Forest Temple
  - Pink: Graveyard, Kakariko Village, Shadow Temple
  - Orange: Haunted Westeland, Gerudo Fortress, Spirit Temple
  - Red: Death Mountain, Goron City, Fire Temple
  - Yellow: Lon Lon Ranch, Hyrule Castle, Temple of Time
  - Sky Blue: Lake Hylia, Zora's Domain, Water Temple
  - Blue: Skyloft, City in the sky
- **Railroads**: Forest, Send, Fire, Ocean Realm Rails
- **Utilities**: Windmill Hut, Waterfall Cave
- **Taxes**: Income Tax ($200), Super Tax ($100)

#### Game Mechanics
- **Starting Money**: $1000 per player
- **Rent Calculation**: Matches standard Monopoly with monopoly doubling
- **Building System**: 5 levels (rentWithHouse array)
- **Mortgage System**: All properties can be mortgaged
- **Card System**: 11 Chance cards, 11 Community Chest cards

### Player State Structure
```typescript
{
  site: number,           // Current board position (0-39)
  previousSite: number,   // Previous position
  playerId: number,       // Player identifier
  money: number,          // Current money (starts at 1000)
  isMoving: boolean,      // Animation state
  direction: string       // FORWARD/BACKWARD movement
}
```

### Property State Structure
```typescript
{
  id: number,
  type: string,          // site, realm_rails, utility, special, etc.
  color: string,         // Property group color
  name: string,          // Zelda-themed name
  sellingPrice: number,  // Purchase price
  rent: number,          // Base rent
  rentWithHouse: array,  // Rent with 1-5 buildings
  mortgage: number,      // Mortgage value
  construction: number,  // Building cost
  isMortgaged: boolean,
  built: number         // Number of buildings (0-5)
}
```

### Important File Locations
- `src/assets/data/boardData.json` - Complete board configuration
- `src/assets/data/chanceData.json` - Chance card actions
- `src/assets/data/chestData.json` - Community Chest card actions
- `src/redux/reducers/` - State management
- `src/utility/playerUtility.tsx` - Game logic utilities

## Development Commands

### Core Development
- `pnpm start` or `pnpm dev` - Start Vite development server on port 3000
- `pnpm run build` - Build optimized production bundle with Vite
- `pnpm test` - Run test suite with Vitest
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run preview` - Preview production build locally
- `pnpm run deploy` - Deploy to GitHub Pages (builds first)

### NX-Specific Commands
- `pnpm run graph` - View dependency graph of the project
- `nx serve` - Start development server (direct NX command)
- `nx build` - Build the project (direct NX command)
- `nx test` - Run tests (direct NX command)

### Code Quality Commands
- `pnpm run lint` - Run ESLint via NX
- `pnpm run lint:fix` - Run ESLint with auto-fix via NX
- `pnpm run format` - Format all code with Prettier via NX
- `pnpm run format:check` - Check if code is formatted correctly via NX
- `pnpm run check-all` - Run linting and format checking
- `pnpm run fix-all` - Auto-fix linting issues and format code

## Code Architecture

### Technology Stack
- **Build System**: NX 21.2+ with Vite 6.3+ for fast development and builds
- **Frontend**: React 19 with functional components and hooks
- **TypeScript**: Full TypeScript support with strict mode disabled for gradual migration
- **State Management**: Redux with traditional actions/reducers pattern
- **Styling**: SCSS modules with component-specific styles
- **Routing**: React Router DOM v7
- **Testing**: Vitest with React Testing Library
- **Package Manager**: pnpm for efficient dependency management

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

### Build System Details
- **NX Workspace**: Configured as single-project workspace with build caching
- **Vite Configuration**: Optimized for React with TypeScript, SCSS support
- **Build Output**: Optimized bundles with asset hashing and compression
- **Development Server**: Hot Module Replacement (HMR) for fast development
- **Testing**: Vitest with jsdom environment and global test utilities

### Project Structure
- `project.json` - NX project configuration with build, serve, test, lint targets
- `vite.config.mjs` - Vite configuration with React plugin and NX integration
- `nx.json` - NX workspace configuration with caching and task dependencies
- `tsconfig.json` - TypeScript configuration with strict mode disabled

### Deployment
- Hosted on GitHub Pages at https://amankori2307.github.io/monopoly/
- Build process uses Vite for optimal performance
- Assets and routing configured for subdirectory deployment
- Production builds include asset optimization and compression