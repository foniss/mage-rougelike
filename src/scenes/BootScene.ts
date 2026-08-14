import Phaser from 'phaser';
import { initViewport } from '../config/viewport';
import { generateTextures } from '../utils/TextureGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    initViewport(this.game);
    generateTextures(this);
    this.scene.start('GameScene');
  }
}