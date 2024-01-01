import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditStatesComponent } from './edit-states.component';

describe('EditStatesComponent', () => {
  let component: EditStatesComponent;
  let fixture: ComponentFixture<EditStatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditStatesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditStatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
