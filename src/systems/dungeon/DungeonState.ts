import { RoomType, SinId, TOTAL_LAYERS, ROOMS_PER_LAYER } from '../../config/dungeonConfig';
import { PlayerProgression } from './PlayerProgression';
import { GrimoireSystem } from '../GrimoireSystem';
import type { ShopItem } from './ShopGenerator';

export interface RoomChoice { cardA: RoomType; cardB: RoomType; }
export interface LayerState { layerIndex: number; sinId: SinId | null; rooms: RoomState[]; completed: boolean; }
export interface RoomState { roomIndex: number; type: RoomType; choice?: RoomChoice; chosen: boolean; completed: boolean; isCurrent: boolean; shopState?: { items: ShopItem[]; hasRested: boolean; }; }

export class DungeonState {
  public layers: LayerState[] = [];
  public currentLayerIndex: number = 0;
  public currentRoomIndex: number = 0;
  public progression: PlayerProgression;
  public runActive: boolean = true;
  public runWon: boolean = false;

  /** Persists spell slots across combat rooms within a run. */
  public grimoireSystem: GrimoireSystem;

  constructor(progression: PlayerProgression) {
    this.progression = progression;
    this.grimoireSystem = new GrimoireSystem();
    this.grimoireSystem.setProgression(progression);
  }

  getCurrentLayer(): LayerState { return this.layers[this.currentLayerIndex]; }
  getCurrentRoom(): RoomState { return this.getCurrentLayer().rooms[this.currentRoomIndex]; }

  advanceRoom(): boolean {
    const layer = this.getCurrentLayer();
    layer.rooms[this.currentRoomIndex].completed = true;
    layer.rooms[this.currentRoomIndex].isCurrent = false;
    if (this.currentRoomIndex < ROOMS_PER_LAYER - 1) {
      this.currentRoomIndex++;
      layer.rooms[this.currentRoomIndex].isCurrent = true;
      return true;
    }
    layer.completed = true;
    return false;
  }

  advanceLayer(): boolean {
    if (this.currentLayerIndex < TOTAL_LAYERS - 1) {
      this.currentLayerIndex++;
      this.currentRoomIndex = 0;
      this.layers[this.currentLayerIndex].rooms[0].isCurrent = true;
      return true;
    }
    this.runWon = true;
    this.runActive = false;
    return false;
  }

  resolveChoice(chosenType: RoomType): void {
    const room = this.getCurrentRoom();
    room.type = chosenType;
    room.chosen = true;
  }

  endRun(won: boolean): void {
    this.runActive = false;
    this.runWon = won;
  }
}
