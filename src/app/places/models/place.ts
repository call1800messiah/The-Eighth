import { PlaceType } from './place-type.enum';

export interface Place {
  id: string;
  image: string;
  inhabitants?: string;
  isPrivate: boolean;
  name: string;
  owner: string;
  parent?: {
    id: string,
    name?: string,
  };
  parts?: Place[];
  type: PlaceType;
}
