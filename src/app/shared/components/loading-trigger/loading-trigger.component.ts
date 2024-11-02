import { Component, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';

@Component({
  selector: 'app-loading-trigger',
  templateUrl: './loading-trigger.component.html',
  styleUrl: './loading-trigger.component.scss'
})
export class LoadingTriggerComponent implements OnDestroy {
  @Output() onVisible = new EventEmitter<boolean>();
  private observer: IntersectionObserver;

  constructor(
    private ref: ElementRef<Element>,
  ) {
    this.observer = new IntersectionObserver((entries, observer) => {
      if (entries[0].isIntersecting === true) {
        this.onVisible.emit(true);
      }
    }, {
      root: document,
      rootMargin: '0px',
      threshold: 1,
    });
    this.observer.observe(this.ref.nativeElement);
  }

  ngOnDestroy() {
    this.observer.disconnect();
  }
}
