import Phaser from 'phaser';
import { generateTextures } from '../utils/TextureGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Generate all textures, then start the game
    generateTextures(this);
    this.scene.start('GameScene');
  }
}