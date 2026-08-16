// src/systems/InteractionSystem.ts
//
// Lightweight proximity-based interaction for non-combat rooms.
// Player walks near an interactive object → prompt appears → E to interact.
// Purely presentation — no physics bodies, no collision.

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { uiText, applyTextShadow, OC } from '../config/uiStyles';

export interface Interactable {
  x: number;
  y: number;
  radius: number;
  prompt: string;
  onInteract: () => void;
  enabled: boolean;
}

export class InteractionSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private interactables: Interactable[] = [];
  private interactKey!: Phaser.Input.Keyboard.Key;
  private promptContainer: Phaser.GameObjects.Container;
  private promptText: Phaser.GameObjects.Text;
  private promptBg: Phaser.GameObjects.Rectangle;
  private activeTarget: Interactable | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    if (scene.input.keyboard) {
      this.interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    // Build prompt UI
    this.promptContainer = scene.add.container(0, 0).setDepth(80).setAlpha(0);

    this.promptBg = scene.add.rectangle(0, 0, 140, 28, OC.panel, 0.85).setStrokeStyle(1, OC.purple, 0.5);
    this.promptText = scene.add.text(0, 0, '', uiText(12, '#ccbbee', true)).setOrigin(0.5);
    applyTextShadow(this.promptText);

    const keyHint = scene.add.text(-50, 0, '[E]', uiText(12, '#ffcc44', true)).setOrigin(0.5);
    applyTextShadow(keyHint);

    this.promptContainer.add([this.promptBg, keyHint, this.promptText]);
  }

  addInteractable(interactable: Interactable): void {
    this.interactables.push(interactable);
  }

  update(): void {
    if (!this.player.alive || !this.player.sprite.active) return;

    const px = this.player.sprite.x, py = this.player.sprite.y;
    let closest: Interactable | null = null;
    let closestDist = Infinity;

    for (const obj of this.interactables) {
      if (!obj.enabled) continue;
      const dist = Phaser.Math.Distance.Between(px, py, obj.x, obj.y);
      if (dist <= obj.radius && dist < closestDist) {
        closestDist = dist;
        closest = obj;
      }
    }

    if (closest) {
      if (this.activeTarget !== closest) {
        this.activeTarget = closest;
        this.promptText.setText(closest.prompt);
        // Resize bg to fit text
        const tw = Math.max(140, this.promptText.width + 80);
        this.promptBg.setSize(tw, 28);
      }
      // Position prompt above the interactable
      this.promptContainer.setPosition(closest.x, closest.y - 40);
      this.promptContainer.setAlpha(1);

      // Check E key
      if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        closest.onInteract();
      }
    } else {
      this.activeTarget = null;
      this.promptContainer.setAlpha(0);
    }
  }

  destroy(): void {
    this.promptContainer.destroy();
  }
}
