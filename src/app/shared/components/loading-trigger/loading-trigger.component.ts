import { Component, ElementRef, EventEmitter, OnDestroy, Output, ChangeDetectionStrategy, inject } from '@angular/core';

@Component({
  selector: 'app-loading-trigger',
  templateUrl: './loading-trigger.component.html',
  styleUrl: './loading-trigger.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class LoadingTriggerComponent implements OnDestroy {
  private ref = inject<ElementRef<Element>>(ElementRef);

  @Output() onVisible = new EventEmitter<boolean>();
  private observer: IntersectionObserver;

  constructor() {
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
