// Dynamic viewport size — game fills the browser window.

import { setRoomDimensions } from './constants';

let width = window.innerWidth;
let height = window.innerHeight;

export function getViewportWidth(): number {
  return width;
}

export function getViewportHeight(): number {
  return height;
}

export function initViewport(game: Phaser.Game): void {
  width = game.scale.width;
  height = game.scale.height;
  setRoomDimensions(width, height);

  game.scale.on('resize', (size: Phaser.Structs.Size) => {
    width = size.width;
    height = size.height;
    setRoomDimensions(width, height);
    game.events.emit('viewport-resize', width, height);
  });
}
