import { Directive, ElementRef, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appFocusOnInit]',
  standalone: false
})
export class FocusOnInitDirective implements OnInit {
  private elementRef = inject(ElementRef);


  ngOnInit() {
    const elem = this.elementRef.nativeElement;
    elem.focus();
    try {
      elem.setSelectionRange(0, elem.value.length);
    } catch (error) {
      elem.select();
    }
  }

}
