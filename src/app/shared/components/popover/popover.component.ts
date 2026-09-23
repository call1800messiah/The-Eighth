import { Component, OnInit, Type, ViewChild, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';

import type { PopoverChild } from '../../models';
import { PopoverService } from '../../../core/services/popover.service';



@Component({
  selector: 'app-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class PopoverComponent implements OnInit {
  faArrowLeft = faArrowLeft;
  pageLabel$: Observable<string>;
  visible$: Observable<boolean>;
  @ViewChild('popoverHost', { read: ViewContainerRef }) appPopoverHost: ViewContainerRef;
  private componentRef;

  constructor(
    private popover: PopoverService,
  ) {
    this.visible$ = this.popover.isPopoverVisible$;
    this.pageLabel$ = this.popover.popoverTitle$;
  }

  ngOnInit(): void {
    this.popover.popoverComponent$.subscribe(([component, data]) => {
      if (component) {
        this.initializeChildComponent(component, data);
      }
    });
  }


  dismissPopover() {
    this.appPopoverHost.clear();
    this.popover.dismissPopover();
  }


  private initializeChildComponent(component: Type<unknown>, data) {
    this.appPopoverHost.clear();
    this.componentRef = this.appPopoverHost.createComponent(component);
    (this.componentRef.instance as PopoverChild).props = data;
    (this.componentRef.instance as PopoverChild).dismissPopover.subscribe(() => {
      this.dismissPopover();
    });
  }
}
