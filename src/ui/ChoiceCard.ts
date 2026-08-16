import Phaser from 'phaser';
import { OC, uiText, applyTextShadow } from '../config/uiStyles';

export interface ChoiceCardConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  category: string;
  description: string;
  categoryColor: number;
  rewardText?: string;
  onClick: () => void;
  disabled?: boolean;
}

export class ChoiceCard extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private glow: Phaser.GameObjects.Rectangle;
  private selectBorder: Phaser.GameObjects.Rectangle;
  private selectedBadge: Phaser.GameObjects.Text;
  
  private _disabled: boolean;
  private _selected: boolean = false;
  private onClick: () => void;
  private config: ChoiceCardConfig;

  constructor(config: ChoiceCardConfig) {
    super(config.scene, config.x, config.y);
    this.config = config;
    this._disabled = config.disabled || false;
    this.onClick = config.onClick;
    
    const w = config.width;
    const h = config.height;

    this.glow = this.scene.add.rectangle(0, 0, w + 10, h + 10, config.categoryColor, 0).setAlpha(0);
    this.bg = this.scene.add.rectangle(0, 0, w, h, OC.panel2, 0.72);
    this.border = this.scene.add.rectangle(0, 0, w, h, 0, 0).setStrokeStyle(1, config.categoryColor, 0.3);
    
    const catTxt = this.scene.add.text(0, -h/2 + 15, config.category, uiText(10, '#' + config.categoryColor.toString(16).padStart(6, '0'), true)).setOrigin(0.5);
    const titleTxt = this.scene.add.text(0, -h/2 + 35, config.title, { ...uiText(16, '#ffffff', true), align: 'center', wordWrap: { width: w - 20 } }).setOrigin(0.5);
    const descTxt = this.scene.add.text(0, 0, config.description, { ...uiText(12, '#aaaaaa'), align: 'center', wordWrap: { width: w - 20 } }).setOrigin(0.5);
    
    applyTextShadow(catTxt);
    applyTextShadow(titleTxt);
    
    this.add([this.glow, this.bg, this.border, catTxt, titleTxt, descTxt]);
    
    if (config.rewardText) {
       const rewardTxt = this.scene.add.text(0, h/2 - 20, config.rewardText, uiText(14, '#dddddd', true)).setOrigin(0.5);
       applyTextShadow(rewardTxt);
       this.add(rewardTxt);
    }

    this.selectBorder = this.scene.add.rectangle(0, 0, w - 4, h - 4, 0, 0).setStrokeStyle(3, config.categoryColor, 1).setVisible(false);
    this.selectedBadge = this.scene.add.text(0, -h/2 - 14, 'SELECTED', uiText(10, '#' + config.categoryColor.toString(16).padStart(6, '0'), true)).setOrigin(0.5).setVisible(false);
    applyTextShadow(this.selectedBadge);
    
    this.add([this.selectBorder, this.selectedBadge]);

    this.bg.setInteractive({ useHandCursor: true });
    
    this.bg.on('pointerover', () => {
      if (this._disabled) return;
      if (!this._selected) {
        this.bg.setFillStyle(0x211932, 0.85);
        this.border.setStrokeStyle(2, config.categoryColor, 0.8);
        this.glow.setAlpha(0.15);
      }
      this.scene.tweens.add({ targets: this, scaleX: 1.03, scaleY: 1.03, duration: 120, ease: 'Sine.Out' });
    });
    
    this.bg.on('pointerout', () => {
      if (this._disabled) return;
      if (!this._selected) {
        this.bg.setFillStyle(OC.panel2, 0.72);
        this.border.setStrokeStyle(1, config.categoryColor, 0.3);
        this.glow.setAlpha(0);
      }
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.Out' });
    });
    
    this.bg.on('pointerdown', () => {
      if (!this._disabled) {
        this.scene.tweens.add({ targets: this, scaleX: 0.97, scaleY: 0.97, duration: 60, yoyo: true });
        this.onClick();
      }
    });

    this.scene.add.existing(this);
    this.updateState();
  }

  public setDisabled(disabled: boolean) {
    this._disabled = disabled;
    this.updateState();
  }
  
  public setSelected(selected: boolean) {
    this._selected = selected;
    this.selectBorder.setVisible(selected);
    this.selectedBadge.setVisible(selected);
    
    if (selected) {
      this.bg.setFillStyle(0x1a1a2e, 0.9);
      this.glow.setAlpha(0.2);
      this.scene.tweens.add({
        targets: this.selectBorder,
        scale: { from: 1, to: 1.02 },
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.bg.setFillStyle(OC.panel2, 0.72);
      this.glow.setAlpha(0);
      this.selectBorder.setScale(1);
    }
  }
  
  private updateState() {
    if (this._disabled) {
      this.bg.setFillStyle(0x09070d, 0.5);
      this.border.setStrokeStyle(1, 0x333333, 0.2);
      this.setAlpha(0.5);
      this.bg.disableInteractive();
    } else {
      this.bg.setFillStyle(OC.panel2, 0.72);
      this.border.setStrokeStyle(1, this.config.categoryColor, 0.3);
      this.setAlpha(1);
      this.bg.setInteractive({ useHandCursor: true });
    }
  }
}
