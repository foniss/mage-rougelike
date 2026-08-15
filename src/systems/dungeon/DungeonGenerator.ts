// src/systems/dungeon/DungeonGenerator.ts
//
// Generates the full 4-layer dungeon run.

import {
  RoomType, TOTAL_LAYERS, getLayerTemplate,
} from '../../config/dungeonConfig';
import { DungeonState, LayerState, RoomState } from './DungeonState';
import { PlayerProgression } from './PlayerProgression';
import { RoomGenerator } from './RoomGenerator';
import { SinGenerator } from './SinGenerator';

export class DungeonGenerator {

  static generateRun(): DungeonState {
    const progression = new PlayerProgression();
    const state = new DungeonState(progression);

    // Select 3 sins for layers 1-3
    const sins = SinGenerator.selectSinsForRun(progression);

    for (let layerIdx = 0; layerIdx < TOTAL_LAYERS; layerIdx++) {
      const template = getLayerTemplate(layerIdx);
      const isFinalLayer = layerIdx === TOTAL_LAYERS - 1;

      // Generate choice room pairs
      const choicePairs = RoomGenerator.generateChoiceRooms(layerIdx);

      const rooms: RoomState[] = [];
      let choicePairIdx = 0;

      for (let roomIdx = 0; roomIdx < template.rooms.length; roomIdx++) {
        const slot = template.rooms[roomIdx];

        if (slot.type === 'fixed') {
          rooms.push({
            roomIndex: roomIdx,
            type: slot.fixedType!,
            chosen: true,
            completed: false,
            isCurrent: layerIdx === 0 && roomIdx === 0,
          });
        } else {
          // Choice room
          const pair = choicePairs[choicePairIdx++];
          rooms.push({
            roomIndex: roomIdx,
            type: RoomType.NORMAL, // Will be set when player chooses
            choice: pair,
            chosen: false,
            completed: false,
            isCurrent: false,
          });
        }
      }

      const layer: LayerState = {
        layerIndex: layerIdx,
        sinId: isFinalLayer ? null : (sins[layerIdx] || null),
        rooms,
        completed: false,
      };

      state.layers.push(layer);
    }

    return state;
  }
}