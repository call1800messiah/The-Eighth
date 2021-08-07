import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditAttributeComponent } from './edit-attribute.component';

describe('EditAttributeComponent', () => {
  let component: EditAttributeComponent;
  let fixture: ComponentFixture<EditAttributeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EditAttributeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditAttributeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
