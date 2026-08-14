// src/config/constants.ts

// --- Room ---
export const ROOM_WIDTH = 1024;
export const ROOM_HEIGHT = 768;
export const WALL_THICKNESS = 32;

// --- Player ---
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_MANA = 100;
export const PLAYER_SPEED = 200;
export const PLAYER_RADIUS = 14;
export const MANA_REGEN_RATE = 8;
export const MANA_REGEN_INTERVAL = 100;

// --- Basic Attack ---
export const BASIC_ATTACK_DAMAGE = 20;
export const BASIC_ATTACK_MANA_COST = 5;
export const BASIC_ATTACK_COOLDOWN = 300;
export const PROJECTILE_SPEED = 500;
export const PROJECTILE_RADIUS = 5;
export const PROJECTILE_LIFETIME = 2000;

// --- Spell Forms (defaults used as fallbacks) ---
export const NOVA_RADIUS = 110;
export const BEAM_WIDTH = 14;
export const BEAM_RANGE = 500;
export const SPELL_CAST_COOLDOWN = 300;

// --- Status Effect Visuals ---
export const BURN_TICK_INTERVAL = 500;
export const BURN_PARTICLE_INTERVAL = 150;
export const BURN_PARTICLE_COLORS = [0xff6600, 0xff4400, 0xff8800, 0xffaa00];
export const BURN_PARTICLE_SIZE_MIN = 2;
export const BURN_PARTICLE_SIZE_MAX = 5;
export const BURN_PARTICLE_LIFETIME = 400;
export const BURN_PARTICLE_RISE = 15;

export const SLOW_TINT = 0x6699ff;
export const SLOW_RING_COLOR = 0x44ccff;
export const SLOW_RING_ALPHA = 0.2;
export const SLOW_CRYSTAL_COUNT = 4;
export const SLOW_CRYSTAL_COLOR = 0x88ddff;

export const CHAIN_ARC_SEGMENTS = 8;
export const CHAIN_ARC_OFFSET = 12;
export const CHAIN_ARC_COLOR = 0xffff00;
export const CHAIN_ARC_GLOW_COLOR = 0xffffaa;
export const CHAIN_ARC_WIDTH = 2;
export const CHAIN_ARC_GLOW_WIDTH = 6;
export const CHAIN_ARC_DURATION = 350;
export const CHAIN_DELAY_BETWEEN = 120;
export const CHAIN_HIT_FLASH_COLOR = 0xffff88;
export const CHAIN_HIT_FLASH_RADIUS = 14;

// --- Chill ---
export const CHILL_TINT = 0x88bbff;
export const FREEZE_TINT = 0x4466cc;

// --- Enemy ---
export const ENEMY_MAX_HP = 100;
export const ENEMY_SPEED = 80;
export const ENEMY_DAMAGE = 10;
export const ENEMY_RADIUS = 16;
export const ENEMY_ATTACK_COOLDOWN = 1000;
export const ENEMY_COUNT = 4;

// --- Grimoire ---
export const GRIMOIRE_SLOW_FACTOR = 0.2;

// --- Colors ---
export const COLOR_FLOOR = 0x1a1a2e;
export const COLOR_WALL = 0x16213e;
export const COLOR_WALL_TOP = 0x0f3460;
export const COLOR_PLAYER = 0x6c63ff;
export const COLOR_PLAYER_INNER = 0x9d97ff;
export const COLOR_ENEMY = 0xcc3333;
export const COLOR_ENEMY_INNER = 0xff6666;
export const COLOR_PROJECTILE = 0x00d4ff;
export const COLOR_PROJECTILE_GLOW = 0x66e8ff;
export const COLOR_MANA_BAR = 0x4488ff;
export const COLOR_HP_BAR = 0x44cc44;
export const COLOR_BAR_BG = 0x333333;
export const COLOR_DECORATION = 0x222244;