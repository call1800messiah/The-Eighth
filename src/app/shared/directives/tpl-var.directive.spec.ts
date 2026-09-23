import { TemplateRef, ViewContainerRef } from '@angular/core';
import { TplVarDirective } from './tpl-var.directive';

describe('TplVarDirective', () => {
  let mockViewContainerRef: jasmine.SpyObj<ViewContainerRef>;
  let mockTemplateRef: jasmine.SpyObj<TemplateRef<any>>;

  beforeEach(() => {
    mockViewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    mockTemplateRef = jasmine.createSpyObj('TemplateRef', ['createEmbeddedView']);
  });

  it('should create an instance', () => {
    const directive = new TplVarDirective(mockViewContainerRef, mockTemplateRef);
    expect(directive).toBeTruthy();
  });

  it('should create embedded view when appTplVar is set', () => {
    const directive = new TplVarDirective(mockViewContainerRef, mockTemplateRef);
    directive.appTplVar = 'test value';
    expect(mockViewContainerRef.clear).toHaveBeenCalled();
    expect(mockViewContainerRef.createEmbeddedView).toHaveBeenCalledWith(
      mockTemplateRef,
      jasmine.objectContaining({ $implicit: 'test value', appTplVar: 'test value' }),
    );
  });
});
