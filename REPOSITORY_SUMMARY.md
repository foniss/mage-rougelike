# Mage Roguelike - Repository Summary

## Project Overview
**Mage Roguelike** is a browser-based dungeon roguelike game built with **Phaser 3** and **TypeScript**. The player controls a mage who builds and casts dynamic spells by combining spell components (Cores, Forms, Prefixes, Suffixes) in a grimoire UI. The game features real-time combat against enemies, mana management, status effects, and spell customization.

**Stack:** Phaser 3.87 (game framework), TypeScript 5.7, Vite 6.0

---

## Complete Directory Tree

```
mage-roguelike/
├── .git/                          # Git version control
├── .gitignore                     # Git ignore rules
├── node_modules/                  # npm dependencies (Phaser, Vite, TypeScript)
├── dist/                          # Production build output (compiled & bundled)
├── package.json                   # Project metadata, dependencies, scripts
├── package-lock.json              # Locked dependency versions
├── tsconfig.json                  # TypeScript compiler configuration
├── vite.config.ts                 # Vite build configuration
├── index.html                     # HTML entry point
├── REPOSITORY_SUMMARY.md          # This file - full codebase documentation
│
└── src/                           # Main source code directory
    ├── main.ts                    # Game initialization & Phaser config
    │
    ├── config/                    # Configuration & constants
    │   ├── balance.ts             # Game balance values (HP, damage, costs)
    │   ├── constants.ts           # Game-wide constants (viewport, player, enemy)
    │   ├── formulas.ts            # Spell stat calculations (damage, mana, cooldown)
    │   ├── spellComponents.ts     # Spell component definitions & compatibility
    │   ├── uiStyles.ts            # UI styling constants (colors, fonts, spacing)
    │   └── viewport.ts            # Browser resize handler
    │
    ├── entities/                  # Game entity classes
    │   ├── Player.ts              # Player character, movement, casting, HP/mana
    │   ├── Enemy.ts               # Enemy character, AI, pathfinding
    │   └── Projectile.ts          # Projectile/spell instance in flight
    │
    ├── scenes/                    # Phaser game scenes (game states)
    │   ├── BootScene.ts           # Game initialization scene
    │   ├── GameScene.ts           # Main gameplay scene (core loop)
    │   ├── HUDScene.ts            # Heads-up display overlay (HP, mana bars, etc)
    │   ├── GrimoireScene.ts       # Spell assembly UI (grimoire/spellbook)
    │   └── DevTestScene.ts        # Development testing arena
    │
    ├── systems/                   # Core game systems & logic
    │   ├── BalanceManager.ts      # Central balance value manager
    │   ├── CombatSystem.ts        # Collision detection & damage application
    │   ├── CoreEffectExecutor.ts  # Core effect application (burn, chill, etc)
    │   ├── FormExecutor.ts        # Form-specific behavior (blade, beam, etc)
    │   ├── GrimoireSystem.ts      # Spell slot management (save/load spells)
    │   ├── LightningChainSystem.ts# Shock effect chain mechanics
    │   ├── SpellBuilder.ts        # Spell assembly from components
    │   ├── SpellCaster.ts         # Spell casting & execution logic
    │   ├── SpellValidator.ts      # Spell component compatibility validation
    │   ├── StatusEffectSystem.ts  # Buff/debuff management (burn, chill, shock, etc)
    │   └── behaviors/             # (Empty folder - reserved for AI behaviors)
    │
    ├── ui/                        # User interface components
    │   ├── ComponentRow.ts        # Grid row of component buttons
    │   ├── DevArenaControls.ts    # Dev testing controls UI
    │   ├── DevSpellPanel.ts       # Dev spell creation panel
    │   ├── SpellAssemblyPreview.ts# Right panel - spell preview with stats
    │   └── SpellSlotBar.ts        # Bottom bar - slot selector buttons
    │
    ├── visuals/                   # Graphics & visual effects
    │   ├── BeamVisuals.ts         # Beam form visual effects
    │   ├── BladeVisuals.ts        # Blade form visual effects
    │   ├── CoreVisualTheme.ts     # Core type theme manager
    │   ├── MineVisuals.ts         # Mine form visual effects
    │   ├── NovaVisuals.ts         # Nova form visual effects
    │   ├── OrbVisuals.ts          # Orb form visual effects
    │   ├── PrefixVisuals.ts       # Prefix modifier visual effects
    │   ├── SuffixVisuals.ts       # Suffix modifier visual effects
    │   └── cores/                 # Core-specific themes
    │       ├── CosmicTheme.ts     # Cosmic core theme (pink/cyan particles)
    │       ├── FireTheme.ts       # Fire core theme (orange/red particles)
    │       ├── IceTheme.ts        # Ice core theme (blue/cyan particles)
    │       ├── StormTheme.ts      # Storm core theme (purple/yellow particles)
    │       └── WindTheme.ts       # Wind core theme (green/light blue particles)
    │
    └── utils/                     # Utility functions
        └── TextureGenerator.ts    # Runtime texture & particle generation
```

---

## Directory Structure & File Purposes

### **Root Level**
- **`package.json`** - Project metadata, dependencies (Phaser), dev dependencies (TypeScript, Vite)
- **`tsconfig.json`** - TypeScript compilation configuration
- **`vite.config.ts`** - Vite build tool configuration
- **`index.html`** - HTML entry point with `game-container` div

---

## `/src/` - Main Source Code

### **`main.ts`** (Entry Point)
- Creates Phaser game instance with config
- Defines game window size (responsive to browser), physics (arcade, no gravity)
- Loads all game scenes in order: BootScene → GameScene → HUDScene → GrimoireScene → DevTestScene
- Sets rendering options (antialiasing, pixel density)

---

## `/src/config/` - Configuration & Constants

### **`constants.ts`**
- Game-wide constants pulled from balance config
- Room/viewport dimensions (ROOM_WIDTH, ROOM_HEIGHT)
- Player stats: HP, mana, speed, radius
- Mana regeneration rates
- Basic attack values: damage, cost, cooldown, projectile speed
- Enemy stats: HP, speed, damage, spawn count
- Spell slots (3), grimoire time scale (0.12x slowmo)
- Particle & visual effects constants

### **`balance.ts`**
- Centralized game balance/tuning values
- Player stats (maxHp, maxMana, speed, radius, manaRegenPerSecond)
- Basic attack stats (damage, manaCost, cooldownMs, projectileSpeed/radius/lifetime)
- Enemy defaults (maxHp, speed, contactDamage, contactCooldownMs)
- Spell cost formulas parameters
- Cooldown modifiers
- Component-specific balance values

### **`formulas.ts`**
- **Spell damage calculation**: Base damage × core multiplier × form multiplier × modifiers
- **Mana cost calculation**: Based on core + form + prefix/suffix costs
- **Cooldown calculation**: Based on component values

### **`spellComponents.ts`** (Large file)
- **Core types (5)**: FIRE, ICE, WIND, STORM, COSMIC
- **Form types (5)**: BLADE, BEAM, ORB, MINE, NOVA
- **Prefix types (6)**: HOMING, SPLITTING, GREATER, EXPANDING, RETURNING, PIERCING
- **Suffix types (5)**: OF_DEVOURING, OF_BINDING, OF_REAPING, OF_DETONATION, OF_ECHOES
- **Status effect configs**: Burn, Chill, Knockback, Shock, Gravity, None
- **Component data**: Stats, targeting type, visual configs for each component
- **Compatibility rules**: Which cores/forms/prefixes/suffixes can combine
- Helper functions: `getCore()`, `getForm()`, `getPrefix()`, `getSuffix()`, `identifyWord()`, `identifySuffix()`

### **`uiStyles.ts`**
- UI styling constants (colors, fonts, spacing)
- Component preview styling
- Slot selector styling
- Button/text styling

### **`viewport.ts`**
- Handles browser window resize events
- Updates ROOM_WIDTH/ROOM_HEIGHT constants
- Centers game view

---

## `/src/entities/` - Game Objects

### **`Player.ts`**
- Player character sprite and stats
- Properties: hp, maxHp, mana, maxMana, speed, radius, alive state
- **`activeSpell`**: Currently equipped spell from grimoire slots
- **Movement**: WASD or arrow keys move in 4 directions
- **`directionIndicator`**: Sprite showing which direction player faces
- **Mana regeneration**: Ticks every interval to restore mana
- **`basicAttack(direction)`**: Costs mana, creates projectile
- **`castSpell(direction)`**: Casts active spell if enough mana + cooldown ready
- **`takeDamage(amount)`**: Reduces HP, death check
- **`update()`**: Handles movement, mana regen, attack cooldowns

### **`Enemy.ts`**
- Enemy character sprite, HP, position
- Properties: hp, maxHp, speed, radius, alive state
- **Spawning**: Created in waves at random positions
- **Movement**: Simple AI, chases/attacks player on contact
- **`takeDamage(amount)`**: Health reduction, death handling
- **`update(scene, player)`**: AI movement logic

### **`Projectile.ts`**
- Projectile object (spell instance in flight)
- Properties: sprite, position, velocity, lifetime, spell data
- **Creation**: Created by basicAttack() or castSpell()
- **Collision detection**: Handled by CombatSystem
- **Status effects**: Applies effects on hit
- **Lifetime**: Despawns after duration

---

## `/src/scenes/` - Phaser Scenes (Game States)

### **`BootScene.ts`**
- Initializes game on startup
- Loads assets, initializes systems
- Transitions to GameScene

### **`GameScene.ts`** (Main gameplay scene)
- **Core gameplay loop**: player, enemies, projectiles, combat
- **Entities**:
  - Player instance
  - Enemy array (spawned on scene create)
  - Projectile array (created on attacks/spells)
- **Systems**:
  - **CombatSystem**: Collision detection, damage
  - **GrimoireSystem**: Spell slot management
  - **StatusEffectSystem**: Burn, chill, shock, knockback, gravity
  - **SpellCaster**: Spell execution logic
- **Input handling**:
  - WASD/Arrows: Move player
  - Tab: Open/close grimoire (sets time scale to 0.12x)
  - 1/2/3: Select spell slots (if grimoire open)
  - Escape: Close grimoire, game over
  - Mouse click: Cast active spell in direction
- **Game state**:
  - **`gameOver`**: Player death detection
  - **`grimoireOpen`**: Pause state when grimoire visible
- **Update loop**: Handles all entity updates, collision checks, cooldowns

### **`HUDScene.ts`** (Heads-up display overlay)
- Displays UI on top of gameplay
- Shows player HP bar, mana bar, current spell info
- Feedback text (cast results, errors)
- Stays visible when grimoire opens

### **`GrimoireScene.ts`** (Spell assembly UI)
- Modal grimoire/spellbook interface
- **Left side**: Component selection grid
  - Rows: Cores (5), Forms (5), Prefixes (6), Suffixes (5)
  - Buttons show name, cost, color dot
  - Incompatible components fade to 25% opacity (disabled)
  - Selected components: white border + glow indicator
- **Right side**: Spell preview
  - Shows assembled spell name, mana cost, cooldown, damage
  - Preview orb with core-themed particles
  - Component list display
  - Stat display (damage, manaCost, cooldown)
- **Bottom bar**:
  - Spell slot buttons (3) - load saved spells on click
  - "Prepare" button (bright green when valid spell selected)
  - Controls hint text
- **Visuals**:
  - 25% transparent overlay (combat visible behind)
  - Time scale 0.12x (slow-mo effect)
  - Core-themed particles on preview orb
- **No keyboard handling**: GameScene controls open/close

### **`DevTestScene.ts`** (Development/testing scene)
- Arena for testing spells without enemies
- Dev controls panel (spawn enemies, test spells)
- Used during development iteration

---

## `/src/systems/` - Game Logic & Mechanics

### **`SpellBuilder.ts`** (Spell Assembly)
- **`Spell` interface**: Defines spell structure
  - name, displayName
  - core, form, prefix (optional), suffix (optional)
  - damage, manaCost, cooldown
  - statusEffect, targetingType
  - visual config
- **`SpellBuilder.build(coreId, formId, prefixId?, suffixId?)`**:
  - Takes component IDs
  - Validates via SpellValidator
  - Assembles spell with calculated stats (damage, mana cost, cooldown)
  - Returns BuildResult (success/error)
- **`SpellBuilder.parseAndBuild(raw: string)`**:
  - Parses text like "FIRE BLADE" or "HOMING FIRE BEAM OF DEVOURING"
  - Identifies suffix (last 2 words), then prefix, core, form
  - Handles 1-6 word spell names
  - Returns ParseResult with spell or error

### **`SpellValidator.ts`** (Spell Validation)
- Validates component combinations
- Checks compatibility rules (which cores work with which forms, etc.)
- Prevents invalid spell assembly
- Suggests compatible alternatives on error

### **`SpellCaster.ts`** (Spell Execution)
- **`CastContext`**: Direction, caster position, spell data
- **`castSpell(context)`**: 
  - Creates projectile with spell data
  - Applies targeting logic (melee, projectile, AOE, line, placement)
  - Triggers spell visual effects
  - Handles echo/repeat mechanics
- Integrates with **FormExecutor** for form-specific behavior
- Integrates with **CoreEffectExecutor** for core effects

### **`FormExecutor.ts`** (Form Behavior)
- Executes form-specific behavior on cast:
  - **BLADE**: Melee slash, close-range damage
  - **BEAM**: Line projectile with range
  - **ORB**: Circular projectile with aura damage
  - **MINE**: Placed object that detonates on contact
  - **NOVA**: Burst projectile with AOE explosion
- Handles projectile speed, lifetime, collision radius

### **`CoreEffectExecutor.ts`** (Core Effect Application)
- Applies core-specific status effects on hit:
  - **FIRE**: Burn damage over time
  - **ICE**: Chill/freeze slow effect
  - **WIND**: Knockback force
  - **STORM**: Shock (stun + chain lightning)
  - **COSMIC**: Gravity pull effect
- Integrates with StatusEffectSystem

### **`CombatSystem.ts`** (Collision & Damage)
- **`update()`**: Main collision detection loop
- **`checkProjectileEnemyCollisions()`**:
  - Detects when projectiles hit enemies
  - Applies damage (orb aura radius damage, direct hit)
  - Triggers status effects
  - Removes projectile on hit (or bounces if returning)
- **`checkEnemyPlayerCollisions()`**:
  - Detects enemy contact damage
  - Applies knockback, stun, burn based on enemy mods
  - Triggers player hit animations

### **`StatusEffectSystem.ts`** (Buff/Debuff Management)
- Manages active status effects on entities
- **Effect types**:
  - **Burn**: Damage per second ticks
  - **Chill**: Slow + freeze at threshold
  - **Knockback**: Force/velocity application
  - **Shock**: Stun + arc chain to nearby enemies
  - **Gravity**: Pull toward source
- **`applyEffect(target, effectConfig)`**: Add effect to entity
- **`update()`**: Tick all active effects, remove expired ones
- **`drawDebugInfo()`**: Visual debug overlay

### **`GrimoireSystem.ts`** (Spell Slot Management)
- Manages 3 spell slots
- **`saveSpell(slot, spell)`**: Save assembled spell to slot
- **`loadSpell(slot)`**: Load spell from slot into player.activeSpell
- **`getSlot(slot)`**: Retrieve saved spell data
- Persists spells during gameplay

### **`BalanceManager.ts`** (Tuning/Tweaks)
- Central manager for all balance values
- Provides getters for component stats, scaling factors
- Allows runtime tuning (for debugging/playtesting)
- Feeds into constants.ts and formulas.ts

### **`LightningChainSystem.ts`** (Shock/Chain Lightning)
- Handles shock status effect chain mechanics
- **`findChainTargets(source, range, maxTargets)`**: Finds nearby enemies
- **`chainArc(from, to, spell)`**: Creates arc projectile visual
- Applies damage to chained targets

---

## `/src/visuals/` - Graphics & Effects

### **`CoreVisualTheme.ts`**
- Defines visual properties for each core type
- Particle colors, emission rates
- Glow/bloom colors
- Texture/sprite overrides

### **Theme Files** (Fire, Ice, Wind, Storm, Cosmic)
- **`FireTheme.ts`**: Orange/red palette, fire particles
- **`IceTheme.ts`**: Blue/cyan palette, snowflake/ice particles
- **`WindTheme.ts`**: Green/light blue palette, wind effects
- **`StormTheme.ts`**: Purple/yellow palette, lightning effects
- **`CosmicTheme.ts`**: Pink/cyan palette, cosmic star particles

### **Form-Specific Visuals**
- **`BeamVisuals.ts`**: Line beam effects, hitflash
- **`BladeVisuals.ts`**: Melee slash animation, trail effects
- **`OrbVisuals.ts`**: Circular projectile, aura glow
- **`MineVisuals.ts`**: Placed object sprite, detonation explosion
- **`NovaVisuals.ts`**: Burst with expanding shockwave

### **Component Visuals** (Prefix/Suffix Effects)
- **`PrefixVisuals.ts`**: 
  - HOMING: Tracking lines, magnetism glow
  - SPLITTING: Projectile duplication visuals
  - GREATER: Size increase, intensity boost
  - EXPANDING: Growing aura
  - RETURNING: Boomerang trail
  - PIERCING: Through-enemy indicator
- **`SuffixVisuals.ts`**:
  - OF_DEVOURING: Sucking/drain effect
  - OF_BINDING: Chain/link visual
  - OF_REAPING: Dark swirl
  - OF_DETONATION: Explosion radius preview
  - OF_ECHOES: Duplicate projectile ghost trails

### **`TextureGenerator.ts`**
- Runtime texture generation (procedural sprites)
- Creates particle emitters
- Generates colored circles, trails, effects

---

## `/src/ui/` - User Interface

### **`SpellSlotBar.ts`**
- Bottom bar UI showing 3 spell slot buttons
- Displays currently selected slot
- Slot buttons trigger load on click in grimoire

### **`SpellAssemblyPreview.ts`**
- Right panel of grimoire
- Renders preview orb with particles
- Shows spell name, stats (damage, mana cost, cooldown)
- Lists assembled components
- Updates live as user selects components

### **`ComponentRow.ts`**
- Grid row in left panel (one component type)
- Creates buttons for all components of type
- Handles selection state (border, glow)
- Shows incompatible state (fade, disabled)

### **`DevSpellPanel.ts`**
- Development testing panel
- Allows quick spell creation/testing
- Shows available components for devtest scene

### **`DevArenaControls.ts`**
- Dev testing controls
- Spawn enemies, toggle godmode
- Quick spell casting for iteration

---

## Complete File Reference

### **Root Files**
| File | Purpose |
|------|---------|
| `package.json` | Project metadata, npm scripts (dev, build, preview), dependencies (Phaser ^3.87.0), dev dependencies (TypeScript, Vite) |
| `tsconfig.json` | TypeScript compiler settings (target, module system, strict mode) |
| `vite.config.ts` | Vite bundler configuration (HMR, plugin settings) |
| `index.html` | HTML entry point - `<div id="game-container"></div>` for Phaser to render into |
| `.gitignore` | Excludes node_modules, dist, build artifacts from git |

### **`/src/config/` - Configuration**
| File | Key Exports | Purpose |
|------|------------|---------|
| `constants.ts` | `ROOM_WIDTH`, `ROOM_HEIGHT`, `PLAYER_MAX_HP`, `PLAYER_MAX_MANA`, `SPELL_SLOT_COUNT`, etc. | Centralized constants imported by game systems |
| `balance.ts` | `BALANCE` object | All game balance values (HP, damage, mana costs, cooldowns, spawn rates) |
| `formulas.ts` | `calcDamage()`, `calcManaCost()`, `calcCooldown()` | Mathematical formulas for spell stat calculations |
| `spellComponents.ts` | `CoreId`, `FormId`, `PrefixId`, `SuffixId` enums, component registries, compatibility rules | Spell component definitions, properties, compatibility matrix |
| `uiStyles.ts` | `UI_FONT`, `GLASS`, `uiText()`, `applyTextShadow()`, `createGlassPanel()` | Shared UI styling constants and helper functions |
| `viewport.ts` | `setupViewportListener()` | Listens to window resize, updates game room dimensions |

### **`/src/entities/` - Game Objects**
| File | Classes | Purpose |
|------|---------|---------|
| `Player.ts` | `Player`, `CastResult` enum | Player character sprite, HP/mana, movement (WASD), basic attack, spell casting, damage taken |
| `Enemy.ts` | `Enemy` | Enemy character sprite, AI pathfinding, HP, contact damage, spawn/despawn |
| `Projectile.ts` | `Projectile` | Spell projectile in flight, velocity, lifetime, collision handling, status effect application |

### **`/src/scenes/` - Game States**
| File | Class | Purpose |
|------|-------|---------|
| `BootScene.ts` | `BootScene extends Phaser.Scene` | Initialization, asset loading, transitions to GameScene |
| `GameScene.ts` | `GameScene extends Phaser.Scene` | Main gameplay loop - manages player, enemies, projectiles, all systems, input handling |
| `HUDScene.ts` | `HUDScene extends Phaser.Scene` | Overlay display - HP bar, mana bar, current spell info, feedback text |
| `GrimoireScene.ts` | `GrimoireScene extends Phaser.Scene` | Spell assembly UI - component grid (left), spell preview (right), slot buttons (bottom) |
| `DevTestScene.ts` | `DevTestScene extends Phaser.Scene` | Development testing arena with dev controls, quick spell testing |

### **`/src/systems/` - Core Logic**
| File | Classes/Functions | Purpose |
|------|------------------|---------|
| `SpellBuilder.ts` | `Spell` interface, `SpellBuilder` class, `BuildResult` interface | Assembles spells from components, calculates stats, `parseAndBuild()` for text-to-spell parsing |
| `SpellValidator.ts` | `SpellValidator` class | Validates component combinations against compatibility rules, suggests fixes |
| `SpellCaster.ts` | `SpellCaster` class, `CastContext` interface | Casts spells, creates projectiles, applies targeting logic, triggers visual effects |
| `FormExecutor.ts` | `FormExecutor` class | Executes form-specific behavior (blade slash, beam line, orb aura, mine placement, nova burst) |
| `CoreEffectExecutor.ts` | `CoreEffectExecutor` class | Applies core-specific status effects on hit (fire→burn, ice→chill, wind→knockback, storm→shock, cosmic→gravity) |
| `CombatSystem.ts` | `CombatSystem` class | Detects projectile-enemy collisions, applies damage, triggers status effects |
| `StatusEffectSystem.ts` | `StatusEffectSystem` class | Manages active status effects (burn, chill, shock, knockback, gravity), ticks damage/debuffs, expires effects |
| `GrimoireSystem.ts` | `GrimoireSystem` class | Spell slot management (3 slots), save/load spells to slots, persistence during gameplay |
| `BalanceManager.ts` | `BalanceManager` class | Central balance value manager, provides getters for component stats, scaling factors |
| `LightningChainSystem.ts` | `LightningChainSystem` class | Handles shock status effect chain mechanics, finds chain targets, creates arc visuals |

### **`/src/ui/` - User Interface**
| File | Classes | Purpose |
|------|---------|---------|
| `SpellSlotBar.ts` | `SpellSlotBar` class | Bottom bar UI - 3 spell slot buttons, slot selection state, click handlers |
| `SpellAssemblyPreview.ts` | `SpellAssemblyPreview` class | Right panel - preview orb with particles, spell name, stats (damage, mana cost, cooldown), component list |
| `ComponentRow.ts` | `ComponentRow` class | Grid row in left panel - creates buttons for all components of type (core, form, prefix, suffix) |
| `DevSpellPanel.ts` | `DevSpellPanel` class | Dev testing panel - quick spell creation interface for testing |
| `DevArenaControls.ts` | `DevArenaControls` class | Dev controls - spawn enemies, toggle godmode, quick spell casting |

### **`/src/visuals/` - Graphics & Effects**
| File | Classes/Functions | Purpose |
|------|------------------|---------|
| `CoreVisualTheme.ts` | `getCoreTheme()`, theme objects | Theme manager for each core type (colors, particles, glow) |
| `BeamVisuals.ts` | Beam visual effects | Line beam rendering, hit flash effects |
| `BladeVisuals.ts` | Blade visual effects | Melee slash animation, trail effects |
| `OrbVisuals.ts` | Orb visual effects | Circular projectile, aura glow rendering |
| `MineVisuals.ts` | Mine visual effects | Placed object sprite, detonation explosion |
| `NovaVisuals.ts` | Nova visual effects | Burst with expanding shockwave |
| `PrefixVisuals.ts` | Prefix effect visuals | HOMING (tracking lines), SPLITTING (duplication), GREATER (size boost), EXPANDING (aura), RETURNING (trail), PIERCING (indicator) |
| `SuffixVisuals.ts` | Suffix effect visuals | OF_DEVOURING (drain), OF_BINDING (chain), OF_REAPING (swirl), OF_DETONATION (explosion), OF_ECHOES (ghost trail) |
| **`/src/visuals/cores/`** | | |
| `FireTheme.ts` | Fire theme object | Orange/red palette, fire particles, glow colors |
| `IceTheme.ts` | Ice theme object | Blue/cyan palette, snowflake/ice particles |
| `WindTheme.ts` | Wind theme object | Green/light blue palette, wind effects |
| `StormTheme.ts` | Storm theme object | Purple/yellow palette, lightning effects |
| `CosmicTheme.ts` | Cosmic theme object | Pink/cyan palette, cosmic star particles |

### **`/src/utils/` - Utilities**
| File | Functions | Purpose |
|------|-----------|---------|
| `TextureGenerator.ts` | `generatePlayerTexture()`, `generateEnemyTexture()`, `generateProjectileTexture()`, particle emitter creation | Runtime procedural texture generation, creates colored circles, trails, particle effects |

---

## Key Gameplay Mechanics

### **Spell System**
1. Player selects Core + Form + optional Prefix + optional Suffix in grimoire
2. SpellBuilder validates and assembles spell
3. Stats calculated: damage (core × form × modifiers), mana cost, cooldown
4. Spell saved to slot (1-3)
5. Active spell set when slot selected
6. On mouse click, castSpell() fires projectile with spell data
7. Projectile applies damage + status effects on collision

### **Status Effects**
- Applied by core types and suffixes
- Persist on target, tick damage/slow/stun
- Expire after duration
- Stack/interact (chill increases at stacks → freeze)

### **Mana System**
- Player starts with maxMana
- Basic attack costs mana, resets cooldown
- Spells cost variable mana (calculated by components)
- Mana regenerates over time at configurable rate
- Prevents spam casting

### **Enemy AI**
- Spawn in waves from random edges
- Simple pathfinding toward player
- Deal contact damage
- Defeated on HP depletion
- Respawn in waves

---

## Workflow

1. **Game starts** → BootScene loads assets → GameScene creates player/enemies
2. **Gameplay** → Player moves with WASD, clicks to basic attack or cast active spell
3. **Grimoire** → Press Tab to open spell assembly UI, select components, prepare spell
4. **Combat** → Projectiles detect collisions, apply damage & status effects
5. **Status effects** → Tick damage/debuffs over time
6. **Game over** → Player death triggers game over screen, press R to restart

---

## Summary
This is a fully-featured spell-crafting roguelike where the core mechanic is combining spell components to create custom spells with unique effects. The architecture separates concerns into entities (Player, Enemy, Projectile), systems (Combat, Spells, StatusEffects), scenes (Game UI, Grimoire), and visuals (theme-based effects). The balance and formula system allows for flexible tuning of spell power.

---

## Project Statistics

| Metric | Count |
|--------|-------|
| TypeScript Files | 45 |
| Config Files | 5 |
| Entity Classes | 3 (Player, Enemy, Projectile) |
| Game Scenes | 5 (Boot, Game, HUD, Grimoire, DevTest) |
| Core Systems | 11 (Spell, Combat, Status Effects, Casting, etc.) |
| UI Components | 5 |
| Visual Theme Files | 14 (Base + 5 cores + 2 formulas + prefix/suffix) |
| Spell Cores | 5 (Fire, Ice, Wind, Storm, Cosmic) |
| Spell Forms | 5 (Blade, Beam, Orb, Mine, Nova) |
| Spell Prefixes | 6 (Homing, Splitting, Greater, Expanding, Returning, Piercing) |
| Spell Suffixes | 5 (Of Devouring, Of Binding, Of Reaping, Of Detonation, Of Echoes) |
| Status Effects | 6 (Burn, Chill, Knockback, Shock, Gravity, None) |
| Spell Slots | 3 |
| Max Spell Components | 4 (Core + Form + Prefix + Suffix) |

---

## Development Commands

```bash
npm install              # Install all dependencies
npm run dev              # Start dev server (localhost, HMR enabled)
npm run build            # TypeScript compile + Vite bundle production
npm run preview          # Preview production build locally
```

---

## Key Technologies

- **Game Framework:** Phaser 3.87.0 - WebGL/Canvas 2D rendering, physics, input, scenes
- **Language:** TypeScript 5.7 - Type safety, OOP classes, strict compilation
- **Build Tool:** Vite 6.0 - Fast bundling, HMR dev server, production optimization
- **Target:** Modern browsers (Chrome, Firefox, Safari, Edge) - Full screen responsive
- **Physics Engine:** Arcade physics (no gravity) - Simple AABB collision detection
- **Rendering:** WebGL 2D with antialiasing, procedural particle effects
