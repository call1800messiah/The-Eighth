export interface Enemy {
  actions: string;
  amount: string;
  attributes: {
    mu: number;
    kl: number;
    in: number;
    ch: number;
    ff: number;
    ge: number;
    ko: number;
    kk: number;
    lep: number;
    asp: number;
    kap: number;
    ini: string;
    vw: number;
    sk: number;
    zk: number;
    gs: number;
  };
  be: number;
  combatTechniques: string;
  extraRules: string;
  flight: string;
  loot: string;
  name: string;
  properties: string;
  rs: number;
  specialAbilities: string;
  skills: string;
  size: string;
  sizeCategory: string;
  type: string;
  weight: string;
}
