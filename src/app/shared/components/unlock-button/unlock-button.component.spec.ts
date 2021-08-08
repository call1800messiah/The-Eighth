import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnlockButtonComponent } from './unlock-button.component';

describe('UnlockButtonComponent', () => {
  let component: UnlockButtonComponent;
  let fixture: ComponentFixture<UnlockButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnlockButtonComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnlockButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
