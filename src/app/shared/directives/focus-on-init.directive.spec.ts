import { ElementRef } from '@angular/core';
import { FocusOnInitDirective } from './focus-on-init.directive';

describe('FocusOnInitDirective', () => {
  it('should create an instance', () => {
    const mockElementRef = new ElementRef(document.createElement('input'));
    const directive = new FocusOnInitDirective(mockElementRef);
    expect(directive).toBeTruthy();
  });

  it('should focus the element on init', () => {
    const input = document.createElement('input');
    const focusSpy = spyOn(input, 'focus');
    const mockElementRef = new ElementRef(input);
    const directive = new FocusOnInitDirective(mockElementRef);
    directive.ngOnInit();
    expect(focusSpy).toHaveBeenCalled();
  });
});
