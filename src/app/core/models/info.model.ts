import { InfoType } from '../enums/info-type.enum';

export class Info {
  constructor(
    public id: string,
    public content: string,
    public parent: string,
    public type: InfoType,
  ) {}
}
