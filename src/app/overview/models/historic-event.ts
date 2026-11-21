import type { InGameDate } from '@the-eighth/fantasy-calendar';
import type { HistoricEventType } from '../../core/enums/historic-event-type.enum';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface HistoricEvent extends AccessControlledItem {
  content: string;
  created: Date;
  date: InGameDate | null;
  /** Old free-text date that was not converted; read-only, cleared by saving a real date. */
  dateLegacy: string | null;
  modified: Date;
  type: HistoricEventType;
}
