export interface Quest {
  id: string;
  description: string;
  name: string;
  type: string;
  owner?: string;
  isPrivate?: boolean;
}
