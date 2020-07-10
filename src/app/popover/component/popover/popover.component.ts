import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';

import { PopoverService } from '../../services/popover.service';
import { PopoverChild } from '../../interfaces/popover-child.model';



@Component({
  selector: 'app-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss']
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
    this.popover.popoverComponent$.subscribe(([componentResolver, data]) => {
      if (componentResolver) {
        this.initializeChildComponent(componentResolver, data);
      }
    });
  }


  dismissPopover() {
    this.appPopoverHost.clear();
    this.popover.dismissPopover();
  }


  private initializeChildComponent(componentResolver, data) {
    this.appPopoverHost.clear();
    this.componentRef = this.appPopoverHost.createComponent(componentResolver);
    (this.componentRef.instance as PopoverChild).data = data;
    (this.componentRef.instance as PopoverChild).dismissPopover.subscribe(() => {
      this.dismissPopover();
    });
  }
}
