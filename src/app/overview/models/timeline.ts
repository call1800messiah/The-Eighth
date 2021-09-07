import { HistoricEvent } from './historic-event';
import { Observable } from 'rxjs';

export interface Timeline {
  id: string;
  name: string;
  events: Observable<HistoricEvent[]>;
}
