import Phaser from 'phaser';
import { CoreId, VisualConfig } from '../config/spellComponents';

export interface CoreVisualTheme {
  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void;
  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, velocityX?: number, velocityY?: number): void;
  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius?: number): void;
  renderStatusOnEnemy(scene: Phaser.Scene, enemyX: number, enemyY: number, visual: VisualConfig, intensity?: number): void;
  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void;
  /** Core-themed kill effect at death position. */
  renderKill(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius?: number): void;
  getBeamParticleConfig(): { colors: number[]; sizes: [number, number]; speed: number; alpha: number };
  getGlowConfig(): { color: number; alpha: number; radius: number; pulseSpeed: number };
}

import { FireTheme } from './cores/FireTheme';
import { IceTheme } from './cores/IceTheme';
import { WindTheme } from './cores/WindTheme';
import { StormTheme } from './cores/StormTheme';
import { CosmicTheme } from './cores/CosmicTheme';

const CORE_THEME_REGISTRY: Record<CoreId, CoreVisualTheme> = {
  [CoreId.FIRE]: new FireTheme(),
  [CoreId.ICE]: new IceTheme(),
  [CoreId.WIND]: new WindTheme(),
  [CoreId.STORM]: new StormTheme(),
  [CoreId.COSMIC]: new CosmicTheme(),
};

export function getCoreTheme(coreId: CoreId): CoreVisualTheme {
  return CORE_THEME_REGISTRY[coreId];
}
