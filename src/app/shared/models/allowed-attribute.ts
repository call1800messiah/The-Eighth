export interface AllowedAttribute {
  displayStyle: 'bar' | 'number';
  name: string;
  order?: number;
  rollType?: 'attribute' | 'skill';
  shortCode: string;
}
