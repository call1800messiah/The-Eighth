
export interface ProjectDB {
  access: string[];
  benefit: string;
  interval: string;
  mDesc?: Record<string, string | null>;
  mReq?: Record<string, number | null>;
  name: string;
  owner: string;
  rCur: Record<string, number | null>;
  rReq: Record<string, number | null>;
  rSkill: Record<string, string | null>;
  rThresh: Record<string, number | null>;
}
