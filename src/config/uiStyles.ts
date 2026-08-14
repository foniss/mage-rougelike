// Shared UI typography and glass-panel styling for crisp, readable overlays.

export const UI_FONT =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

export const UI_FONT_MONO =
  '"Cascadia Code", "Consolas", "Courier New", monospace';

/** Higher resolution keeps text sharp on HiDPI displays. */
export const UI_TEXT_RESOLUTION = 2;

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
  alpha = GLASS.panelAlpha,
): Phaser.GameObjects.Rectangle {
  const panel = scene.add.rectangle(x, y, w, h, GLASS.panelFill, alpha).setDepth(depth);
  panel.setStrokeStyle(1, GLASS.panelStroke, GLASS.panelStrokeAlpha);
  return panel;
}
