// src/systems/dungeon/SinGenerator.ts

import { SinId, SIN_DEFINITIONS, TOTAL_LAYERS } from '../../config/dungeonConfig';
import { PlayerProgression, SinRelic } from './PlayerProgression';

export class SinGenerator {

  /**
   * Select 3 unique sins for layers 1-3.
   */
  static selectSinsForRun(progression: PlayerProgression): SinId[] {
    const available = progression.getAvailableSins();
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, TOTAL_LAYERS - 1); // 3 sins for 3 layers
  }

  /**
   * Create a Sin Relic reward for defeating a sin.
   */
  static createSinRelic(sinId: SinId): SinRelic {
    const def = SIN_DEFINITIONS[sinId];
    return {
      sinId,
      name: def.relicName,
      description: def.relicDescription,
    };
  }
}