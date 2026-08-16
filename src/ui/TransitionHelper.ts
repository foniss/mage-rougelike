import Phaser from 'phaser';

/**
 * A central helper for consistent scene transitions across the game.
 */
export class TransitionHelper {
  /**
   * Fades out the current scene, and starts the target scene upon completion.
   */
  static fadeSceneOut(scene: Phaser.Scene, targetScene: string, data?: any, duration = 250): void {
    if (!scene.cameras || !scene.cameras.main) {
      scene.scene.start(targetScene, data);
      return;
    }
    
    scene.cameras.main.fadeOut(duration, 0, 0, 0);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      scene.scene.start(targetScene, data);
    });
  }

  /**
   * Fades in the current scene. Call this in the `create()` method.
   */
  static fadeSceneIn(scene: Phaser.Scene, duration = 250): void {
    if (!scene.cameras || !scene.cameras.main) return;
    scene.cameras.main.fadeIn(duration, 0, 0, 0);
  }
}
