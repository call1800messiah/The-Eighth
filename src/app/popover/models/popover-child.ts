import { EventEmitter } from '@angular/core';

export interface PopoverChild {
  props: any;
  dismissPopover: EventEmitter<boolean>;
}
