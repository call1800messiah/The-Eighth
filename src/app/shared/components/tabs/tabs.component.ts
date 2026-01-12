import { AfterContentInit, Component, ContentChildren, EventEmitter, Input, Output, QueryList } from '@angular/core';
import { TabPanelComponent } from './tab-panel.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent implements AfterContentInit {
  @ContentChildren(TabPanelComponent) tabPanels: QueryList<TabPanelComponent>;

  @Input() defaultTab?: string;
  @Output() tabChange = new EventEmitter<string>();

  activeTabId: string;

  ngAfterContentInit(): void {
    if (this.tabPanels.length > 0) {
      const defaultPanel = this.defaultTab
        ? this.tabPanels.find(p => p.id === this.defaultTab)
        : null;
      this.activeTabId = defaultPanel?.id || this.tabPanels.first.id;
      this.updatePanelVisibility();
    }
  }

  selectTab(tabId: string): void {
    if (tabId !== this.activeTabId) {
      this.activeTabId = tabId;
      this.updatePanelVisibility();
      this.tabChange.emit(tabId);
    }
  }

  private updatePanelVisibility(): void {
    this.tabPanels.forEach(panel => {
      panel.isActive = panel.id === this.activeTabId;
    });
  }
}
