import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessIndicatorComponent } from './access-indicator.component';

describe('AccessIndicatorComponent', () => {
  let component: AccessIndicatorComponent;
  let fixture: ComponentFixture<AccessIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccessIndicatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
