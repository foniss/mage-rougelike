// src/systems/dungeon/ShopGenerator.ts

import { SHOP_PRICES, RewardType } from '../../config/dungeonConfig';
import { PlayerProgression } from './PlayerProgression';
import { RewardGenerator, Reward, RewardChoice } from './RewardGenerator';

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
      reward: { type: RewardType.MAX_HP, amount: 15, displayName: '+15 Max HP', description: 'Health upgrade', isNew: false },
      purchased: false,
    });

    // Max Mana upgrade
    items.push({
      id: 'maxmana', displayName: '+15 Max Mana', description: 'Increase maximum mana',
      price: SHOP_PRICES.maxManaUpgrade, type: RewardType.MAX_MANA,
      reward: { type: RewardType.MAX_MANA, amount: 15, displayName: '+15 Max Mana', description: 'Mana upgrade', isNew: false },
      purchased: false,
    });

    // Random component: one Core/Form slot, one Prefix/Suffix slot.
    // (Previously the shop only ever offered Core/Form via generateNormalRewards,
    // meaning Prefixes/Suffixes could never be bought — this adds the missing slot.)
    const foundationBundle = RewardGenerator.generateCoreOrFormChoices(progression, 1);
    if (foundationBundle.choices.length > 0) {
      const choice = foundationBundle.choices[0];
      const reward: Reward = {
        type: choice.type,
        id: choice.id as string,
        displayName: choice.displayName,
        description: choice.description,
        isNew: true,
      };
      items.push({
        id: 'component-foundation', displayName: choice.displayName, description: choice.description,
        price: SHOP_PRICES.component, type: choice.type, reward, purchased: false,
      });
    }

    const arsenalBundle = RewardGenerator.generatePrefixOrSuffixChoices(progression, 1);
    if (arsenalBundle.choices.length > 0) {
      const choice = arsenalBundle.choices[0];
      const reward: Reward = {
        type: choice.type,
        id: choice.id as string,
        displayName: choice.displayName,
        description: choice.description,
        isNew: true,
      };
      items.push({
        id: 'component-arsenal', displayName: choice.displayName, description: choice.description,
        price: SHOP_PRICES.component, type: choice.type, reward, purchased: false,
      });
    }

    return items;
  }
}
