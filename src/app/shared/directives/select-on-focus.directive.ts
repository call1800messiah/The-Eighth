import { Directive, HostListener } from '@angular/core';



@Directive({
  selector: '[appSelectOnFocus]'
})
export class SelectOnFocusDirective {

  @HostListener('click', ['$event'])
  public onClick(event: any): void {
    try {
      event.target.setSelectionRange(0, event.target.value.length);
    } catch (error) {
      event.target.select();
    }
  }

}
