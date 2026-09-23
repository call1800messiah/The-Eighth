import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FocusOnInitDirective } from './focus-on-init.directive';

describe('FocusOnInitDirective', () => {
  function createDirective(elementRef: ElementRef) {
    TestBed.configureTestingModule({ providers: [{ provide: ElementRef, useValue: elementRef }] });
    return TestBed.runInInjectionContext(() => new FocusOnInitDirective());
  }

  it('should create an instance', () => {
    const mockElementRef = new ElementRef(document.createElement('input'));
    const directive = createDirective(mockElementRef);
    expect(directive).toBeTruthy();
  });

  it('should focus the element on init', () => {
    const input = document.createElement('input');
    const focusSpy = spyOn(input, 'focus');
    const mockElementRef = new ElementRef(input);
    const directive = createDirective(mockElementRef);
    directive.ngOnInit();
    expect(focusSpy).toHaveBeenCalled();
  });
});
