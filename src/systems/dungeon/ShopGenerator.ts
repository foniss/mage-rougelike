// src/systems/dungeon/ShopGenerator.ts

import { SHOP_PRICES, RewardType } from '../../config/dungeonConfig';
import { PlayerProgression } from './PlayerProgression';
import { RewardGenerator, Reward } from './RewardGenerator';

export interface ShopItem {
  id: string;
  displayName: string;
  description: string;
  price: number;
  type: RewardType;
  reward: Reward;
  purchased: boolean;
}

export class ShopGenerator {

  static generateShop(progression: PlayerProgression, layerIndex: number): ShopItem[] {
    const items: ShopItem[] = [];

    // Max HP upgrade
    items.push({
      id: 'maxhp', displayName: '+15 Max HP', description: 'Increase maximum health',
      price: SHOP_PRICES.maxHpUpgrade, type: RewardType.MAX_HP,
      reward: { type: RewardType.MAX_HP, amount: 15, displayName: '+15 Max HP', description: 'Health upgrade' },
      purchased: false,
    });

    // Max Mana upgrade
    items.push({
      id: 'maxmana', displayName: '+15 Max Mana', description: 'Increase maximum mana',
      price: SHOP_PRICES.maxManaUpgrade, type: RewardType.MAX_MANA,
      reward: { type: RewardType.MAX_MANA, amount: 15, displayName: '+15 Max Mana', description: 'Mana upgrade' },
      purchased: false,
    });

    // Random component
    const comp = RewardGenerator.generateNormalRewards(progression, layerIndex)
      .find(r => r.type !== RewardType.GOLD);
    if (comp) {
      items.push({
        id: 'component', displayName: comp.displayName, description: comp.description,
        price: SHOP_PRICES.component, type: comp.type, reward: comp, purchased: false,
      });
    }

    return items;
  }
}