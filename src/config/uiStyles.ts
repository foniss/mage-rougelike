// Shared UI typography and glass-panel styling for crisp, readable overlays.
// src/config/uiStyles.ts
export const UI_FONT =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

export const UI_FONT_MONO =
  '"Cascadia Code", "Consolas", "Courier New", monospace';

/** Higher resolution keeps text sharp on HiDPI displays. */
export const UI_TEXT_RESOLUTION = 2;

/**
 * The core Occult Color palette used throughout the game's UI.
 */
export const OC = {
  void: 0x07050c, panel: 0x0d0915, panel2: 0x110c1b,
  purple: 0x8f6bc2, purpleBright: 0xbda1f4,
  crimson: 0x9c384c, crimsonBright: 0xe16a78,
  gold: 0xc39b58, bone: 0xd8d0c2, blue: 0x7194cc, black: 0x020106,
} as const;

/** 
 * Standardized colors for the spell components. 
 * Core colors can be dynamic based on elements, but these are the defaults.
 */
export const ASPECT_COLORS = {
  CORE: 0x8888aa,
  FORM: 0x8888dd,
  PREFIX: 0x88cc88,
  SUFFIX: 0xccaa66,
} as const;

export interface UiTextStyle extends Phaser.Types.GameObjects.Text.TextStyle {
  resolution?: number;
}

export function uiText(
  size: number,
  color: string,
  bold = false,
): UiTextStyle {
  return {
    fontFamily: UI_FONT,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
    resolution: UI_TEXT_RESOLUTION,
  };
}

export function uiMono(
  size: number,
  color: string,
  bold = false,
): UiTextStyle {
  return {
    fontFamily: UI_FONT_MONO,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
    resolution: UI_TEXT_RESOLUTION,
  };
}

/** Readable text over gameplay — subtle shadow for contrast. */
export function applyTextShadow(text: Phaser.GameObjects.Text): void {
  text.setShadow(0, 1, '#000000', 6, true, true);
}

/** Glass-style panel colors */
export const GLASS = {
  panelFill: 0x0c0a14,
  panelAlpha: 0.62,
  panelStroke: 0x6a5a8a,
  panelStrokeAlpha: 0.35,
  accentLine: 0x8a7aaa,
  accentLineAlpha: 0.25,
  overlayTint: 0x040308,
  overlayAlpha: 0.08,
} as const;

export function createGlassPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  alpha: number = GLASS.panelAlpha,
): Phaser.GameObjects.Rectangle {
  const panel = scene.add.rectangle(x, y, w, h, GLASS.panelFill, alpha).setDepth(depth);
  panel.setStrokeStyle(1, GLASS.panelStroke, GLASS.panelStrokeAlpha);
  return panel;
}

/**
 * A glass panel with a soft color-tinted glow behind it (a larger, low-alpha
 * rectangle) — used for the "premium" surfaces: reward cards, room cards,
 * vault categories. Returns { glow, panel } so callers can restyle either
 * layer on hover/interaction.
 */
export function createGlowPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  accentColor: number,
  alpha: number = GLASS.panelAlpha,
): { glow: Phaser.GameObjects.Rectangle; panel: Phaser.GameObjects.Rectangle } {
  const glow = scene.add.rectangle(x, y, w + 10, h + 10, accentColor, 0.08).setDepth(depth - 1);
  const panel = scene.add.rectangle(x, y, w, h, GLASS.panelFill, alpha).setDepth(depth);
  panel.setStrokeStyle(1, accentColor, 0.4);
  return { glow, panel };
}

/** Fade + rise entrance, staggered by index for lists of cards/rows. */
export function fadeInUp(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { y: number; alpha?: number },
  index = 0,
  distance = 14,
  baseDelay = 60,
): void {
  const obj: any = target;
  const finalY = obj.y;
  obj.y = finalY + distance;
  obj.alpha = 0;
  scene.tweens.add({
    targets: obj,
    y: finalY,
    alpha: 1,
    duration: 320,
    delay: index * baseDelay,
    ease: 'Cubic.easeOut',
  });
}

/** Gentle looping pulse — used for "current" progress dots and call-to-action buttons. */
export function pulseGlow(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    scale: 1.12,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/** Smoothly animates a bar-fill rectangle's width to a new value. */
export function tweenBarWidth(
  scene: Phaser.Scene,
  bar: Phaser.GameObjects.Rectangle,
  toWidth: number,
  duration = 350,
): void {
  scene.tweens.add({ targets: bar, width: Math.max(0, toWidth), duration, ease: 'Cubic.easeOut' });
}

export function hexColor(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}