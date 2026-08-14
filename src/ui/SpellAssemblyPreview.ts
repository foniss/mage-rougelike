// src/ui/SpellAssemblyPreview.ts

import Phaser from 'phaser';
import { Spell } from '../systems/SpellBuilder';
import { getCoreTheme } from '../visuals/CoreVisualTheme';
import { uiText, applyTextShadow, GLASS } from '../config/uiStyles';

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
    const w = 300, h = 280;

    const bg = this.scene.add.rectangle(0, 0, w, h, GLASS.panelFill, 0.55);
    bg.setStrokeStyle(1, GLASS.panelStroke, GLASS.panelStrokeAlpha);
    this.container.add(bg);

    this.previewGlow = this.scene.add.circle(0, -72, 34, 0x333355, 0.12);
    this.container.add(this.previewGlow);
    this.previewCircle = this.scene.add.circle(0, -72, 18, 0x444466, 0.45);
    this.container.add(this.previewCircle);

    this.spellNameText = this.scene.add.text(0, -28, 'Select Core + Form', uiText(16, '#aab0cc', true))
      .setOrigin(0.5, 0);
    applyTextShadow(this.spellNameText);
    this.container.add(this.spellNameText);

    const compLabels = ['Prefix', 'Core', 'Form', 'Suffix'];
    for (let i = 0; i < 4; i++) {
      const t = this.scene.add.text(-132, 8 + i * 22, `${compLabels[i]}:  —`, uiText(12, '#8899aa'));
      applyTextShadow(t);
      this.container.add(t);
      this.componentTexts.push(t);
    }

    this.statsText = this.scene.add.text(-132, 104, '', {
      ...uiText(12, '#99aacc'),
      lineSpacing: 5,
    });
    applyTextShadow(this.statsText);
    this.container.add(this.statsText);

    this.errorText = this.scene.add.text(0, 20, '', uiText(13, '#ff6666', true))
      .setOrigin(0.5, 0).setAlpha(0);
    applyTextShadow(this.errorText);
    this.container.add(this.errorText);
  }

  showSpell(spell: Spell): void {
    const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
    this.spellNameText.setText(spell.name).setColor(hex);

    this.componentTexts[0].setText(`Prefix:  ${spell.prefix?.displayName || '—'}`).setColor(spell.prefix ? '#88cc88' : '#667788');
    this.componentTexts[1].setText(`Core:    ${spell.core.displayName}`).setColor(hex);
    this.componentTexts[2].setText(`Form:    ${spell.form.displayName}`).setColor('#99aaff');
    this.componentTexts[3].setText(`Suffix:  ${spell.suffix?.displayName || '—'}`).setColor(spell.suffix ? '#ddbb77' : '#667788');

    const cdSec = (spell.cooldown / 1000).toFixed(2);
    const effectStr = spell.statusEffect.type !== 'none' ? spell.statusEffect.type.toUpperCase() : 'None';
    this.statsText.setText(
      `Mana       ${spell.manaCost}\n` +
      `Cooldown   ${cdSec}s\n` +
      `Damage     ${spell.damage}\n` +
      `Target     ${spell.targetingType}\n` +
      `Effect     ${effectStr}`
    );

    this.errorText.setAlpha(0);

    this.previewCircle.setFillStyle(spell.visual.color, 0.7);
    this.previewGlow.setFillStyle(spell.visual.color, 0.18);

    if (this.particleTimer) this.particleTimer.destroy();
    const theme = getCoreTheme(spell.core.id);
    this.particleTimer = this.scene.time.addEvent({
      delay: 200, loop: true,
      callback: () => {
        const worldPos = this.container.getWorldTransformMatrix();
        theme.spawnAmbientParticle(this.scene,
          worldPos.tx, worldPos.ty - 72, spell.visual);
      },
    });
  }

  showError(error: string, suggestion?: string): void {
    this.spellNameText.setText('Invalid').setColor('#ff6666');
    this.statsText.setText('');
    this.errorText.setText(error + (suggestion ? '\n' + suggestion : '')).setAlpha(1);
    this.previewCircle.setFillStyle(0x442222, 0.35);
    this.previewGlow.setFillStyle(0x442222, 0.08);
    if (this.particleTimer) { this.particleTimer.destroy(); this.particleTimer = null; }
  }

  showEmpty(): void {
    this.spellNameText.setText('Select Core + Form').setColor('#aab0cc');
    for (const t of this.componentTexts) t.setText('').setColor('#667788');
    this.statsText.setText('');
    this.errorText.setAlpha(0);
    this.previewCircle.setFillStyle(0x444466, 0.35);
    this.previewGlow.setFillStyle(0x333355, 0.12);
    if (this.particleTimer) { this.particleTimer.destroy(); this.particleTimer = null; }
  }

  destroy(): void {
    if (this.particleTimer) this.particleTimer.destroy();
    this.container.destroy();
  }
}
