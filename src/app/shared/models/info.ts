import type { InfoType } from '../../core/enums/info-type.enum';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Info extends AccessControlledItem {
  content: string;
  created: Date;
  modified: Date;
  type: InfoType;
}
