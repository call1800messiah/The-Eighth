import { HistoricEventType } from '../enums/historic-event-type.enum';

export interface HistoricEvent {
  id: string;
  content: string;
  created: Date;
  date: string;
  isPrivate: boolean;
  modified: Date;
  owner: string;
  type: HistoricEventType;
}
