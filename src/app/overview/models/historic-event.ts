import type { HistoricEventType } from '../../core/enums/historic-event-type.enum';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface HistoricEvent extends AccessControlledItem {
  content: string;
  created: Date;
  date: string;
  modified: Date;
  type: HistoricEventType;
}
