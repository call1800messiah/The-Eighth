import { HistoricEvent } from './historic-event.interface';
import { Observable } from 'rxjs';

export interface Timeline {
  id: string;
  name: string;
  events: Observable<HistoricEvent[]>;
}
