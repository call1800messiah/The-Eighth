import { AfterContentInit, ChangeDetectorRef, Component, ContentChildren, DestroyRef, EventEmitter, Input, Output, QueryList, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TabPanelComponent } from './tab-panel.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class TabsComponent implements AfterContentInit {
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @ContentChildren(TabPanelComponent) tabPanels: QueryList<TabPanelComponent>;

  @Input() defaultTab?: string;
  @Output() tabChange = new EventEmitter<string>();

  activeTabId: string;

  ngAfterContentInit(): void {
    this.activateDefaultTab();

    // Panels behind @if come and go (e.g. Szenen once the last scene is gone).
    // The query updates while the parent view is checked, so the switch is
    // deferred to avoid ExpressionChangedAfterItHasBeenChecked.
    this.tabPanels.changes.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      if (!this.tabPanels.some(panel => panel.id === this.activeTabId)) {
        Promise.resolve().then(() => {
          this.activateDefaultTab();
          this.changeDetector.markForCheck();
        });
      }
    });
  }

  selectTab(tabId: string): void {
    if (tabId !== this.activeTabId) {
      this.activeTabId = tabId;
      this.updatePanelVisibility();
      this.tabChange.emit(tabId);
    }
  }

  private activateDefaultTab(): void {
    if (this.tabPanels.length > 0) {
      const defaultPanel = this.defaultTab
        ? this.tabPanels.find(p => p.id === this.defaultTab)
        : null;
      this.activeTabId = defaultPanel?.id || this.tabPanels.first.id;
      this.updatePanelVisibility();
    }
  }

  private updatePanelVisibility(): void {
    this.tabPanels.forEach(panel => {
      panel.isActive = panel.id === this.activeTabId;
    });
  }
}
