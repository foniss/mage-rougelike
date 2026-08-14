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

// --- Basic Attack (default, no spell prepared) ---
export const BASIC_ATTACK_DAMAGE = 20;
export const BASIC_ATTACK_MANA_COST = 5;
export const BASIC_ATTACK_COOLDOWN = 300;
export const PROJECTILE_SPEED = 500;
export const PROJECTILE_RADIUS = 5;
export const PROJECTILE_LIFETIME = 2000;

// --- Spell Forms ---
export const NOVA_RADIUS = 100;
export const BEAM_WIDTH = 12;
export const BEAM_RANGE = 500;
export const SPELL_CAST_COOLDOWN = 500; // ms between any spell casts

// --- Enemy ---
export const ENEMY_MAX_HP = 100;
export const ENEMY_SPEED = 80;
export const ENEMY_DAMAGE = 10;
export const ENEMY_RADIUS = 16;
export const ENEMY_ATTACK_COOLDOWN = 1000;
export const ENEMY_COUNT = 3;

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