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
import { RunOverScene } from './scenes/RunOverScene';
import { ROOM_WIDTH, ROOM_HEIGHT } from './config/constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: ROOM_WIDTH,
  height: ROOM_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#06050a',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [
    BootScene, GameScene, HUDScene, GrimoireScene, DevTestScene,
    DungeonMapScene, ShopRestScene, VaultScene, ShrineScene,
    SacrificeScene, RewardScene, RunOverScene,
  ],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false, roundPixels: false },
};

new Phaser.Game(config);