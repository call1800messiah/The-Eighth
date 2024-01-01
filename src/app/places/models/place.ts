import { PlaceType } from './place-type.enum';
import { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Place extends AccessControlledItem {
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
