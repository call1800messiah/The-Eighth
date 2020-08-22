import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appFocusOnInit]'
})
export class FocusOnInitDirective implements OnInit {

  constructor(
    private elementRef: ElementRef
  ) {}

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
