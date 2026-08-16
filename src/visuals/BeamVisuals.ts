import Phaser from 'phaser';
import { VisualConfig, CoreId } from '../config/spellComponents';
import { getCoreTheme } from './CoreVisualTheme';
import { Player } from '../entities/Player';

export interface BeamVisualParams {
  scene: Phaser.Scene;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  castDuration: number;
  visual: VisualConfig;
  sizeMultiplier: number;
  coreId: CoreId;
  /** If provided, beam visual tracks player position + mouse aim each frame. */
  player?: Player;
}

export class BeamVisuals {
  static render(params: BeamVisualParams): void {
    const { scene, visual, castDuration, coreId, player } = params;
    const bw = params.width * params.sizeMultiplier;
    const beamRange = Math.sqrt((params.endX - params.startX) ** 2 + (params.endY - params.startY) ** 2);
    const theme = getCoreTheme(coreId);
    const pc = theme.getBeamParticleConfig();

    // Create line objects
    const outerGlow = scene.add.line(0, 0, params.startX, params.startY, params.endX, params.endY, visual.color, 0.15)
      .setOrigin(0, 0).setLineWidth(bw * 1.8).setDepth(18);
    const mainBeam = scene.add.line(0, 0, params.startX, params.startY, params.endX, params.endY, visual.color, 0.6)
      .setOrigin(0, 0).setLineWidth(bw / 2).setDepth(20);
    const coreBeam = scene.add.line(0, 0, params.startX, params.startY, params.endX, params.endY, visual.glowColor, 0.7)
      .setOrigin(0, 0).setLineWidth(bw / 5).setDepth(21);
    const centerLine = scene.add.line(0, 0, params.startX, params.startY, params.endX, params.endY, 0xffffff, 0.35)
      .setOrigin(0, 0).setLineWidth(1.5).setDepth(22);

    const muzzle = scene.add.circle(params.startX, params.startY, bw * 0.8, visual.glowColor, 0.5).setDepth(23);
    const muzzleInner = scene.add.circle(params.startX, params.startY, bw * 0.3, 0xffffff, 0.6).setDepth(24);
    const endFlare = scene.add.circle(params.endX, params.endY, bw * 0.6, visual.color, 0.4).setDepth(23);

    const allObjects: Phaser.GameObjects.GameObject[] = [outerGlow, mainBeam, coreBeam, centerLine, muzzle, muzzleInner, endFlare];

    // Pulsing effects
    scene.tweens.add({ targets: outerGlow, alpha: { from: 0.1, to: 0.25 }, duration: 150, yoyo: true, repeat: Math.floor(castDuration / 300) });
    scene.tweens.add({ targets: centerLine, alpha: { from: 0.2, to: 0.5 }, duration: 80, yoyo: true, repeat: Math.floor(castDuration / 160) });
    scene.tweens.add({ targets: [muzzle, muzzleInner], scaleX: { from: 0.5, to: 1.2 }, scaleY: { from: 0.5, to: 1.2 }, alpha: { from: 0.3, to: 0.6 }, duration: 120, yoyo: true, repeat: Math.floor(castDuration / 240) });
    scene.tweens.add({ targets: endFlare, scaleX: { from: 0.8, to: 1.4 }, scaleY: { from: 0.8, to: 1.4 }, duration: 200, yoyo: true, repeat: Math.floor(castDuration / 400) });

    // Per-frame update timer — moves beam visual to follow player + mouse
    const updateTimer = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (!player || !player.sprite.active) return;
        const sx = player.sprite.x;
        const sy = player.sprite.y;
        const pointer = scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(sx, sy, pointer.worldX, pointer.worldY);
        const ex = sx + Math.cos(angle) * beamRange;
        const ey = sy + Math.sin(angle) * beamRange;

        // Update all line endpoints
        outerGlow.setTo(sx, sy, ex, ey);
        mainBeam.setTo(sx, sy, ex, ey);
        coreBeam.setTo(sx, sy, ex, ey);
        centerLine.setTo(sx, sy, ex, ey);

        // Update muzzle and end flare positions
        muzzle.setPosition(sx, sy);
        muzzleInner.setPosition(sx, sy);
        endFlare.setPosition(ex, ey);
      },
    });

    // Particle shimmer along beam
    const shimmerTimer = scene.time.addEvent({
      delay: 50, repeat: Math.floor(castDuration / 50),
      callback: () => {
        // Use live positions if player available
        let sx = params.startX, sy = params.startY, ex = params.endX, ey = params.endY;
        if (player && player.sprite.active) {
          sx = player.sprite.x; sy = player.sprite.y;
          const pointer = scene.input.activePointer;
          const angle = Phaser.Math.Angle.Between(sx, sy, pointer.worldX, pointer.worldY);
          ex = sx + Math.cos(angle) * beamRange;
          ey = sy + Math.sin(angle) * beamRange;
        }
        const dx = ex - sx, dy = ey - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / (dist || 1), perpY = dx / (dist || 1);
        const t = Math.random();
        const px = sx + dx * t, py = sy + dy * t;
        const offset = (Math.random() - 0.5) * bw * 1.2;
        theme.spawnTrailParticle(scene, px + perpX * offset, py + perpY * offset, visual, perpX * pc.speed, perpY * pc.speed);
      },
    });

    // Ambient particles at muzzle and end
    const ambientTimer = scene.time.addEvent({
      delay: 100, repeat: Math.floor(castDuration / 100),
      callback: () => {
        if (player && player.sprite.active) {
          theme.spawnAmbientParticle(scene, player.sprite.x, player.sprite.y, visual);
          const pointer = scene.input.activePointer;
          const angle = Phaser.Math.Angle.Between(player.sprite.x, player.sprite.y, pointer.worldX, pointer.worldY);
          theme.spawnAmbientParticle(scene, player.sprite.x + Math.cos(angle) * beamRange, player.sprite.y + Math.sin(angle) * beamRange, visual);
        } else {
          theme.spawnAmbientParticle(scene, params.startX, params.startY, visual);
          theme.spawnAmbientParticle(scene, params.endX, params.endY, visual);
        }
      },
    });

    // Cleanup after cast duration
    scene.time.delayedCall(castDuration, () => {
      // Impact at end position
      let fx = params.endX, fy = params.endY;
      if (player && player.sprite.active) {
        const pointer = scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(player.sprite.x, player.sprite.y, pointer.worldX, pointer.worldY);
        fx = player.sprite.x + Math.cos(angle) * beamRange;
        fy = player.sprite.y + Math.sin(angle) * beamRange;
      }
      theme.renderImpact(scene, fx, fy, visual, bw * 2);

      updateTimer.destroy();
      shimmerTimer.destroy();
      ambientTimer.destroy();

      scene.tweens.add({
        targets: allObjects, alpha: 0, duration: 200, ease: 'Power2',
        onComplete: () => { for (const obj of allObjects) obj.destroy(); },
      });
    });
  }
}
