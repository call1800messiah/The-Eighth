import { RollType } from '../enums/roll-type.enum';
import { Die } from '../enums/die.enum';

export interface Roll {
  isPrivate: boolean;
  owner: string;
  created: Date;
  type: RollType;
}

export interface AttributeRoll extends Roll {
  attribute: number;
  modifier: number;
  name?: string;
  roll: number;
}

export interface DamageRoll extends Roll {
  rolls: [];
  diceType: Die;
  modifier: number;
}

export interface DiceRoll extends Roll {
  rolls: number[];
  diceType: Die;
}

export interface SkillRoll extends Roll {
  attributes: [number, number, number];
  modifier: number;
  name?: string;
  rolls: [number, number, number];
  skillPoints: number;
}
