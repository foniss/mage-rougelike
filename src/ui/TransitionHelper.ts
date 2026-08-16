import Phaser from 'phaser';
export class TransitionHelper {
  static fadeSceneOut(scene: Phaser.Scene, targetScene: string, data?: any, duration = 250): void { if (!scene.cameras || !scene.cameras.main) { scene.scene.start(targetScene, data); return; } scene.cameras.main.fadeOut(duration, 0, 0, 0); scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => { scene.scene.start(targetScene, data); }); }
  static fadeSceneIn(scene: Phaser.Scene, duration = 250): void { if (!scene.cameras || !scene.cameras.main) return; scene.cameras.main.fadeIn(duration, 0, 0, 0); }
}
