export enum RoomType { NORMAL='NORMAL',ELITE='ELITE',SHRINE='SHRINE',VAULT='VAULT',SACRIFICE='SACRIFICE',SHOP_REST='SHOP_REST',SIN_BOSS='SIN_BOSS',DEVIL='DEVIL' }
export const TOTAL_LAYERS=4;export const ROOMS_PER_LAYER=7;export const CHOICE_ROOM_INDICES=[1,2,3,4];
export interface LayerTemplate{rooms:RoomSlot[]}
export interface RoomSlot{type:'fixed'|'choice';fixedType?:RoomType}
export function getLayerTemplate(layerIndex:number):LayerTemplate{const f=layerIndex===TOTAL_LAYERS-1;return{rooms:[{type:'fixed',fixedType:RoomType.NORMAL},{type:'choice'},{type:'choice'},{type:'choice'},{type:'choice'},{type:'fixed',fixedType:RoomType.SHOP_REST},{type:'fixed',fixedType:f?RoomType.DEVIL:RoomType.SIN_BOSS}]}}
export interface RoomWeights{[RoomType.NORMAL]:number;[RoomType.ELITE]:number;[RoomType.SHRINE]:number;[RoomType.VAULT]:number;[RoomType.SACRIFICE]:number}
export const LAYER_1_WEIGHTS:RoomWeights={[RoomType.NORMAL]:35,[RoomType.ELITE]:25,[RoomType.SHRINE]:15,[RoomType.VAULT]:25,[RoomType.SACRIFICE]:0};
export const LAYER_2_PLUS_WEIGHTS:RoomWeights={[RoomType.NORMAL]:25,[RoomType.ELITE]:25,[RoomType.SHRINE]:15,[RoomType.VAULT]:20,[RoomType.SACRIFICE]:15};
export function getWeightsForLayer(i:number):RoomWeights{return i===0?{...LAYER_1_WEIGHTS}:{...LAYER_2_PLUS_WEIGHTS}}
export function getRoomPool(i:number):RoomType[]{return i===0?[RoomType.NORMAL,RoomType.ELITE,RoomType.SHRINE,RoomType.VAULT]:[RoomType.NORMAL,RoomType.ELITE,RoomType.SHRINE,RoomType.VAULT,RoomType.SACRIFICE]}
export interface LayerConstraints{requireNormal:boolean;requireElite:boolean;requireVault:boolean;requireShrineOrSacrifice:boolean}
export function getLayerConstraints(i:number):LayerConstraints{return{requireNormal:true,requireElite:true,requireVault:true,requireShrineOrSacrifice:i>=1}}
export const MAX_GENERATION_ATTEMPTS=50;
export interface RoomCombatConfig{enemyCount:number;enemyHpMultiplier:number;enemySpeedMultiplier:number;enemyDamageMultiplier:number}
export function getCombatConfig(rt:RoomType,li:number):RoomCombatConfig{const s=1+li*0.25;switch(rt){case RoomType.NORMAL:return{enemyCount:3+li,enemyHpMultiplier:1*s,enemySpeedMultiplier:1,enemyDamageMultiplier:1*s};case RoomType.ELITE:return{enemyCount:2+li,enemyHpMultiplier:2*s,enemySpeedMultiplier:1.15,enemyDamageMultiplier:1.5*s};case RoomType.SIN_BOSS:case RoomType.DEVIL:return{enemyCount:1,enemyHpMultiplier:5*s,enemySpeedMultiplier:1.1,enemyDamageMultiplier:2*s};default:return{enemyCount:3,enemyHpMultiplier:1,enemySpeedMultiplier:1,enemyDamageMultiplier:1}}}
export enum RewardType{GOLD='GOLD',CORE='CORE',FORM='FORM',PREFIX='PREFIX',SUFFIX='SUFFIX',SIN_RELIC='SIN_RELIC',MAX_HP='MAX_HP',MAX_MANA='MAX_MANA',CONSUMABLE='CONSUMABLE'}
export interface GoldRewardConfig{normal:{min:number;max:number};elite:{min:number;max:number};sinBoss:{min:number;max:number};devil:{min:number;max:number};sacrifice:{min:number;max:number}}
export const GOLD_REWARDS:GoldRewardConfig={normal:{min:15,max:30},elite:{min:30,max:55},sinBoss:{min:50,max:80},devil:{min:0,max:0},sacrifice:{min:10,max:20}};
export interface SacrificeTierWeights{common:number;rare:number;epic:number}
export const SACRIFICE_TIER_WEIGHTS:SacrificeTierWeights={common:3,rare:2,epic:1};
export enum VaultCategory{FOUNDATION='FOUNDATION',ARSENAL='ARSENAL',FORTUNE='FORTUNE'}
export interface VaultRewardConfig{[VaultCategory.FOUNDATION]:{types:RewardType[]};[VaultCategory.ARSENAL]:{types:RewardType[]};[VaultCategory.FORTUNE]:{goldMin:number;goldMax:number}}
export const VAULT_REWARDS:VaultRewardConfig={[VaultCategory.FOUNDATION]:{types:[RewardType.CORE,RewardType.FORM]},[VaultCategory.ARSENAL]:{types:[RewardType.PREFIX,RewardType.SUFFIX]},[VaultCategory.FORTUNE]:{goldMin:40,goldMax:75}};
export interface ShopPriceConfig{maxHpUpgrade:number;maxManaUpgrade:number;component:number;consumable:number}
export const SHOP_PRICES:ShopPriceConfig={maxHpUpgrade:40,maxManaUpgrade:35,component:50,consumable:20};
export const REST_HEAL_PERCENT=0.30;export const MANA_PER_NEW_COMPONENT=25;export const STARTING_GOLD=0;
export const STARTING_COMPONENTS={cores:1,forms:1,prefixes:0,suffixes:0,sinRelics:0};
export const TARGET_COMPONENTS={cores:{min:3,max:5},forms:{min:3,max:5},prefixes:{min:3,max:5},suffixes:{min:3,max:5},sinRelics:3};
export enum SinId{PRIDE='PRIDE',GREED='GREED',LUST='LUST',ENVY='ENVY',GLUTTONY='GLUTTONY',WRATH='WRATH',SLOTH='SLOTH'}
export interface SinDefinition{id:SinId;displayName:string;description:string;color:number;relicName:string;relicDescription:string}
export const SIN_DEFINITIONS:Record<SinId,SinDefinition>={[SinId.PRIDE]:{id:SinId.PRIDE,displayName:'Pride',description:'The Sin of Pride',color:0xffcc00,relicName:'Crown of Pride',relicDescription:'Active ability from Pride.'},[SinId.GREED]:{id:SinId.GREED,displayName:'Greed',description:'The Sin of Greed',color:0x44cc44,relicName:'Coin of Greed',relicDescription:'Active ability from Greed.'},[SinId.LUST]:{id:SinId.LUST,displayName:'Lust',description:'The Sin of Lust',color:0xff44aa,relicName:'Heart of Lust',relicDescription:'Active ability from Lust.'},[SinId.ENVY]:{id:SinId.ENVY,displayName:'Envy',description:'The Sin of Envy',color:0x44aaff,relicName:'Eye of Envy',relicDescription:'Active ability from Envy.'},[SinId.GLUTTONY]:{id:SinId.GLUTTONY,displayName:'Gluttony',description:'The Sin of Gluttony',color:0xaa6622,relicName:'Maw of Gluttony',relicDescription:'Active ability from Gluttony.'},[SinId.WRATH]:{id:SinId.WRATH,displayName:'Wrath',description:'The Sin of Wrath',color:0xff2222,relicName:'Fist of Wrath',relicDescription:'Active ability from Wrath.'},[SinId.SLOTH]:{id:SinId.SLOTH,displayName:'Sloth',description:'The Sin of Sloth',color:0x8866cc,relicName:'Chains of Sloth',relicDescription:'Active ability from Sloth.'}};
export function getAllSinIds():SinId[]{return Object.keys(SIN_DEFINITIONS) as SinId[]}
export interface BalanceRatioEntry{difference:number;moreProbability:number}
export const COMPONENT_BALANCE_RATIOS:BalanceRatioEntry[]=[{difference:0,moreProbability:0.50},{difference:1,moreProbability:0.30},{difference:2,moreProbability:0.05},{difference:3,moreProbability:0.00}];
export function getBalancedProbability(difference:number):number{let result=COMPONENT_BALANCE_RATIOS[0].moreProbability;for(const entry of COMPONENT_BALANCE_RATIOS){if(difference>=entry.difference)result=entry.moreProbability}return result}
export const REWARD_DISPLAY:Record<RewardType,{label:string;color:number}>={[RewardType.GOLD]:{label:'Gold',color:0xffcc44},[RewardType.CORE]:{label:'Core',color:0xff8844},[RewardType.FORM]:{label:'Form',color:0x8888ff},[RewardType.PREFIX]:{label:'Prefix',color:0x88cc88},[RewardType.SUFFIX]:{label:'Suffix',color:0xccaa66},[RewardType.SIN_RELIC]:{label:'Sin Relic',color:0xff4466},[RewardType.MAX_HP]:{label:'Max HP',color:0x44cc66},[RewardType.MAX_MANA]:{label:'Max Mana',color:0x4488ff},[RewardType.CONSUMABLE]:{label:'Consumable',color:0xaa88cc}};
export const MAX_REWARD_REROLL=20;
