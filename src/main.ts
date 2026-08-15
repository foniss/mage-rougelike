// src/main.ts

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { GrimoireScene } from './scenes/GrimoireScene';
import { DevTestScene } from './scenes/DevTestScene';
import { DungeonMapScene } from './scenes/DungeonMapScene';
import { ShopRestScene } from './scenes/ShopRestScene';
import { VaultScene } from './scenes/VaultScene';
import { ShrineScene } from './scenes/ShrineScene';
import { SacrificeScene } from './scenes/SacrificeScene';
import { RewardScene } from './scenes/RewardScene';

// In the scene array:

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
scene: [BootScene, GameScene, HUDScene, GrimoireScene, DevTestScene,
        DungeonMapScene, ShopRestScene, VaultScene, ShrineScene, SacrificeScene, RewardScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  resolution: Math.min(window.devicePixelRatio || 1, 2),
};

new Phaser.Game(config);