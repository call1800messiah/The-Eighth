import { Injectable, Type } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class PopoverService {
  isPopoverVisible$: BehaviorSubject<boolean>;
  popoverTitle$: BehaviorSubject<string>;
  popoverComponent$: Subject<any>;
  private popoverVisible = false;

  constructor() {
    this.isPopoverVisible$ = new BehaviorSubject<boolean>(this.popoverVisible);
    this.popoverTitle$ = new BehaviorSubject<string>('');
    this.popoverComponent$ = new Subject<any>();
  }


  dismissPopover() {
    this.popoverVisible = false;
    this.isPopoverVisible$.next(this.popoverVisible);
  }


  showPopover<T>(title: string, component: Type<unknown>, props: T = {} as T) {
    if (this.popoverVisible) {
      console.error('Can\'t open multiple popovers at once.');
      return;
    }

    this.popoverVisible = true;
    this.isPopoverVisible$.next(this.popoverVisible);
    this.popoverTitle$.next(title);

    this.popoverComponent$.next([component, props]);
  }
}
