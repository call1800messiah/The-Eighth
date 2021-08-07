import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditInitiativeComponent } from './edit-initiative.component';

describe('EditInitiativeComponent', () => {
  let component: EditInitiativeComponent;
  let fixture: ComponentFixture<EditInitiativeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EditInitiativeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditInitiativeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
