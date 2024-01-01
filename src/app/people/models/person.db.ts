export interface PersonDB {
  access: string[];
  banner?: string;
  birthday: string;
  birthyear: number;
  children?: string[];
  culture: string;
  deathday: string;
  height: number;
  image: string;
  location?: string;
  name: string;
  owner: string;
  parents?: string[];
  partners?: string[];
  pc: boolean;
  profession: string;
  race: string;
  relatives?: Record<string, string[]>;
  siblings?: string[];
  tags?: string[];
  title: string;
}
