import { ComponentFactoryResolver, Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class PopoverService {
  isPopoverVisible$: BehaviorSubject<boolean>;
  popoverTitle$: BehaviorSubject<string>;
  popoverComponent$: Subject<any>;
  private popoverVisible = false;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
  ) {
    this.isPopoverVisible$ = new BehaviorSubject<boolean>(this.popoverVisible);
    this.popoverTitle$ = new BehaviorSubject<string>('');
    this.popoverComponent$ = new Subject<any>();
  }


  dismissPopover() {
    this.popoverVisible = false;
    this.isPopoverVisible$.next(this.popoverVisible);
  }


  showPopover<T>(title: string, component, props: T = {} as T) {
    if (this.popoverVisible) {
      console.error('Can\'t open multiple popovers at once.');
      return;
    }

    this.popoverVisible = true;
    this.isPopoverVisible$.next(this.popoverVisible);
    this.popoverTitle$.next(title);

    const resolver = this.componentFactoryResolver.resolveComponentFactory(component);
    this.popoverComponent$.next([resolver, props]);
  }
}
