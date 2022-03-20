import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxGridComponent } from './box-grid.component';

describe('BoxGridComponent', () => {
  let component: BoxGridComponent;
  let fixture: ComponentFixture<BoxGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxGridComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BoxGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
