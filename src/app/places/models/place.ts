import { PlaceType } from './place-type.enum';
import { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Place extends AccessControlledItem {
  /** 'draft' until a GM publishes what Claude created (migration 013). */
  status?: 'draft' | 'published';
  image: string;
  inhabitants?: string;
  name: string;
  parent?: {
    id: string,
    name?: string,
  };
  parts?: Place[];
  type: PlaceType;
}
