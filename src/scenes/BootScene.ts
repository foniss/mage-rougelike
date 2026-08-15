// src/scenes/BootScene.ts

import Phaser from 'phaser';
import { generateTextures } from '../utils/TextureGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Generate textures first
    generateTextures(this);

    // Start the dungeon run
    this.scene.start('DungeonMapScene');
  }
}