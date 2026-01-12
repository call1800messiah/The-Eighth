import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tab-panel',
  template: `
    <div class="tab-panel" [class.active]="isActive" *ngIf="isActive">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .tab-panel {
      padding: var(--item-padding) 0;
      height: 100%;
    }
  `]
})
export class TabPanelComponent {
  @Input() id: string;
  @Input() label: string;

  isActive = false;
}
