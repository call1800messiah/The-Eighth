import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appTplVar]'
})
export class TplVarDirective {
  @Input()
  set appTplVar(context: any) {
    this.context.$implicit = this.context.appTplVar = context;
    this.updateView();
  }

  context: any = {};

  constructor(
    private vcRef: ViewContainerRef,
    private templateRef: TemplateRef<any>
  ) {}

  updateView() {
    this.vcRef.clear();
    this.vcRef.createEmbeddedView(this.templateRef, this.context);
  }
}
