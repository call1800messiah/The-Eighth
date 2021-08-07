import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditInfoComponent } from './edit-info.component';

describe('EditInfoComponent', () => {
  let component: EditInfoComponent;
  let fixture: ComponentFixture<EditInfoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EditInfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
