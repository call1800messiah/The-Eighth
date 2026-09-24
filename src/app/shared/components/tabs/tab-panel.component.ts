import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-tab-panel',
  template: `
    @if (isActive) {
      <div class="tab-panel" [class.active]="isActive">
        <ng-content></ng-content>
      </div>
    }
    `,
  styles: [`
    .tab-panel {
      padding: var(--item-padding) 0;
      height: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class TabPanelComponent {
  @Input() id: string;
  @Input() label: string;

  isActive = false;
}
