// src/systems/dungeon/RoomGenerator.ts
//
// Generates room pairs for choice rooms within a layer.
// ONLY decides room types. Does NOT decide rewards.

import {
  RoomType, RoomWeights,
  getWeightsForLayer, getRoomPool, getLayerConstraints,
  MAX_GENERATION_ATTEMPTS, CHOICE_ROOM_INDICES,
  LayerConstraints,
} from '../../config/dungeonConfig';

export interface RoomPair {
  cardA: RoomType;
  cardB: RoomType;
}

export class RoomGenerator {

  /**
   * Generate 4 room pairs (for rooms 2-5) that satisfy layer constraints.
   */
  static generateChoiceRooms(layerIndex: number): RoomPair[] {
    const weights = getWeightsForLayer(layerIndex);
    const pool = getRoomPool(layerIndex);
    const constraints = getLayerConstraints(layerIndex);

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const pairs: RoomPair[] = [];

      for (let i = 0; i < CHOICE_ROOM_INDICES.length; i++) {
        const cardA = RoomGenerator.weightedRandom(pool, weights);
        let cardB = RoomGenerator.weightedRandom(pool, weights);

        // Cards in same pair cannot be identical
        let safety = 0;
        while (cardB === cardA && safety < 20) {
          cardB = RoomGenerator.weightedRandom(pool, weights);
          safety++;
        }

        pairs.push({ cardA, cardB });
      }

      if (RoomGenerator.validateConstraints(pairs, constraints)) {
        return pairs;
      }
    }

    // Fallback: force-satisfy constraints
    return RoomGenerator.forceSatisfy(layerIndex);
  }

  private static weightedRandom(pool: RoomType[], weights: RoomWeights): RoomType {
    const filtered = pool.filter(t => (weights[t as keyof RoomWeights] || 0) > 0);
    const totalWeight = filtered.reduce((sum, t) => sum + (weights[t as keyof RoomWeights] || 0), 0);

    let roll = Math.random() * totalWeight;
    for (const t of filtered) {
      roll -= weights[t as keyof RoomWeights] || 0;
      if (roll <= 0) return t;
    }
    return filtered[filtered.length - 1];
  }

  private static validateConstraints(pairs: RoomPair[], constraints: LayerConstraints): boolean {
    const allTypes = new Set<RoomType>();
    for (const pair of pairs) {
      allTypes.add(pair.cardA);
      allTypes.add(pair.cardB);
    }

    if (constraints.requireNormal && !allTypes.has(RoomType.NORMAL)) return false;
    if (constraints.requireElite && !allTypes.has(RoomType.ELITE)) return false;
    if (constraints.requireVault && !allTypes.has(RoomType.VAULT)) return false;
    if (constraints.requireShrineOrSacrifice) {
      if (!allTypes.has(RoomType.SHRINE) && !allTypes.has(RoomType.SACRIFICE)) return false;
    }

    return true;
  }

  private static forceSatisfy(layerIndex: number): RoomPair[] {
    const pool = getRoomPool(layerIndex);
    const constraints = getLayerConstraints(layerIndex);

    const required: RoomType[] = [];
    if (constraints.requireNormal) required.push(RoomType.NORMAL);
    if (constraints.requireElite) required.push(RoomType.ELITE);
    if (constraints.requireVault) required.push(RoomType.VAULT);
    if (constraints.requireShrineOrSacrifice) {
      required.push(pool.includes(RoomType.SACRIFICE) ? RoomType.SACRIFICE : RoomType.SHRINE);
    }

    const pairs: RoomPair[] = [];
    for (let i = 0; i < 4; i++) {
      const cardA = i < required.length ? required[i] : pool[Math.floor(Math.random() * pool.length)];
      let cardB = pool[Math.floor(Math.random() * pool.length)];
      if (cardB === cardA) cardB = pool.find(t => t !== cardA) || cardA;
      pairs.push({ cardA, cardB });
    }
    return pairs;
  }
}