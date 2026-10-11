import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TabsComponent } from './tabs.component';
import { TabPanelComponent } from './tab-panel.component';

@Component({
  template: `
    <app-tabs>
      <app-tab-panel id="a" label="A">Inhalt A</app-tab-panel>
      @if (showB) {
        <app-tab-panel id="b" label="B">Inhalt B</app-tab-panel>
      }
    </app-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
class HostComponent {
  showB = true;
}

describe('TabsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let tabs: TabsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HostComponent, TabsComponent, TabPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    tabs = fixture.debugElement.query(By.directive(TabsComponent)).componentInstance;
  });

  // TestBed runs zoneless here: changes made outside a template event only
  // render once the view is marked dirty
  function render() {
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  }

  function setShowB(show: boolean) {
    fixture.componentInstance.showB = show;
    render();
  }

  it('activates the first panel', () => {
    expect(tabs.activeTabId).toBe('a');
    expect(fixture.nativeElement.textContent).toContain('Inhalt A');
  });

  it('falls back to the first panel when the active one disappears', async () => {
    tabs.selectTab('b');
    render();
    expect(fixture.nativeElement.textContent).toContain('Inhalt B');

    setShowB(false);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabs.activeTabId).toBe('a');
    expect(fixture.nativeElement.textContent).toContain('Inhalt A');
  });

  it('keeps the active panel when another one appears', async () => {
    setShowB(false);
    await fixture.whenStable();

    setShowB(true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabs.activeTabId).toBe('a');
    expect(fixture.nativeElement.textContent).not.toContain('Inhalt B');
  });
});
