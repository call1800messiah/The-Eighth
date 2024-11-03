import type { Info } from '../../shared/models/info';

export interface Note extends Info {
  category?: string;
  title?: string;
}
