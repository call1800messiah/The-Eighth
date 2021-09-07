import { InfoType } from '../../core/enums/info-type.enum';

export interface Info {
  content: string;
  created: Date;
  id: string;
  isPrivate: boolean;
  modified: Date;
  owner: string;
  type: InfoType;
}
