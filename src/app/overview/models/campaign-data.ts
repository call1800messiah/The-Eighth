import type { InGameDate } from '@the-eighth/fantasy-calendar';

export interface CampaignData {
  captain?: string;
  crewcount?: number;
  date: InGameDate | null;
  /** Old free-text date that was not converted; read-only, cleared by saving a real date. */
  dateLegacy: string | null;
  id: string;
  isPrivate: boolean;
  name: string;
  owner: string;
  ship?: string;
  staminaReduction?: number;
  timelineId?: string;
  xp?: number;
}
