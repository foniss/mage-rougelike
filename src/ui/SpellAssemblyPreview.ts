// src/ui/SpellAssemblyPreview.ts

import Phaser from 'phaser';
import { Spell } from '../systems/SpellBuilder';
import { getCoreTheme } from '../visuals/CoreVisualTheme';

export class SpellAssemblyPreview {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private spellNameText!: Phaser.GameObjects.Text;
  private componentTexts: Phaser.GameObjects.Text[] = [];
  private statsText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private previewCircle!: Phaser.GameObjects.Arc;
  private previewGlow!: Phaser.GameObjects.Arc;
  private particleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setDepth(225);
    this.create();
  }

  private create(): void {
    const w = 300, h = 260;

    // Background
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x08060f, 0.9);
    bg.setStrokeStyle(1, 0x3a2f5a, 0.4);
    this.container.add(bg);

    // Preview visual area
    this.previewGlow = this.scene.add.circle(0, -50, 30, 0x333355, 0.1);
    this.container.add(this.previewGlow);
    this.previewCircle = this.scene.add.circle(0, -50, 16, 0x444466, 0.3);
    this.container.add(this.previewCircle);

    // Spell name
    this.spellNameText = this.scene.add.text(0, -8, 'Select Core + Form', {
      fontFamily: '"Courier New", monospace', fontSize: '14px',
      color: '#666677', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(this.spellNameText);

    // Component breakdown
    const compLabels = ['PREFIX:', 'CORE:', 'FORM:', 'SUFFIX:'];
    for (let i = 0; i < 4; i++) {
      const t = this.scene.add.text(-130, 18 + i * 16, `${compLabels[i]}  —`, {
        fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#555566',
      });
      this.container.add(t);
      this.componentTexts.push(t);
    }

    // Stats
    this.statsText = this.scene.add.text(-130, 90, '', {
      fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#777799', lineSpacing: 3,
    });
    this.container.add(this.statsText);

    // Error
    this.errorText = this.scene.add.text(0, 30, '', {
      fontFamily: '"Courier New", monospace', fontSize: '10px',
      color: '#ff5555', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0);
    this.container.add(this.errorText);
  }

  showSpell(spell: Spell): void {
    const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
    this.spellNameText.setText(spell.name).setColor(hex);

    this.componentTexts[0].setText(`PREFIX:  ${spell.prefix?.displayName || '—'}`).setColor(spell.prefix ? '#88cc88' : '#444455');
    this.componentTexts[1].setText(`CORE:    ${spell.core.displayName}`).setColor(hex);
    this.componentTexts[2].setText(`FORM:    ${spell.form.displayName}`).setColor('#8888dd');
    this.componentTexts[3].setText(`SUFFIX:  ${spell.suffix?.displayName || '—'}`).setColor(spell.suffix ? '#ccaa66' : '#444455');

    const cdSec = (spell.cooldown / 1000).toFixed(2);
    const effectStr = spell.statusEffect.type !== 'none' ? spell.statusEffect.type.toUpperCase() : 'None';
    this.statsText.setText(
      `Mana:     ${spell.manaCost}\n` +
      `Cooldown: ${cdSec}s\n` +
      `Damage:   ${spell.damage}\n` +
      `Target:   ${spell.targetingType}\n` +
      `Effect:   ${effectStr}`
    );

    this.errorText.setAlpha(0);

    // Visual preview
    this.previewCircle.setFillStyle(spell.visual.color, 0.6);
    this.previewGlow.setFillStyle(spell.visual.color, 0.12);

    // Themed particles
    if (this.particleTimer) this.particleTimer.destroy();
    const theme = getCoreTheme(spell.core.id);
    this.particleTimer = this.scene.time.addEvent({
      delay: 200, loop: true,
      callback: () => {
        const worldPos = this.container.getWorldTransformMatrix();
        theme.spawnAmbientParticle(this.scene,
          worldPos.tx, worldPos.ty - 50, spell.visual);
      },
    });
  }

  showError(error: string, suggestion?: string): void {
    this.spellNameText.setText('Invalid').setColor('#ff5555');
    this.statsText.setText('');
    this.errorText.setText(error + (suggestion ? '\n' + suggestion : '')).setAlpha(1);
    this.previewCircle.setFillStyle(0x442222, 0.3);
    this.previewGlow.setFillStyle(0x442222, 0.05);
    if (this.particleTimer) { this.particleTimer.destroy(); this.particleTimer = null; }
  }

  showEmpty(): void {
    this.spellNameText.setText('Select Core + Form').setColor('#666677');
    for (const t of this.componentTexts) t.setText('').setColor('#444455');
    this.statsText.setText('');
    this.errorText.setAlpha(0);
    this.previewCircle.setFillStyle(0x444466, 0.3);
    this.previewGlow.setFillStyle(0x333355, 0.1);
    if (this.particleTimer) { this.particleTimer.destroy(); this.particleTimer = null; }
  }

  destroy(): void {
    if (this.particleTimer) this.particleTimer.destroy();
    this.container.destroy();
  }
}