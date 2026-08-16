import Phaser from 'phaser';
import { generateTextures } from '../utils/TextureGenerator';
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  create(): void { generateTextures(this); this.scene.start('DungeonMapScene'); }
}
