import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressBarComponent } from './progress-bar.component';

describe('ProgressBarComponent', () => {
  let component: ProgressBarComponent;
  let fixture: ComponentFixture<ProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProgressBarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProgressBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders one marker per milestone when milestones share a position', () => {
    const warn = spyOn(console, 'warn');
    const shared = TestBed.createComponent(ProgressBarComponent);
    shared.componentInstance.markers = [50, 50, 100];
    shared.detectChanges();

    expect(shared.nativeElement.querySelectorAll('.marker').length).toBe(3);
    const duplicateKeys = warn.calls.allArgs().filter(args => String(args[0]).includes('NG0955'));
    expect(duplicateKeys).toEqual([]);
  });
});
