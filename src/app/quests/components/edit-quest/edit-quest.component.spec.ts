import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditQuestComponent } from './edit-quest.component';

describe('EditQuestComponent', () => {
  let component: EditQuestComponent;
  let fixture: ComponentFixture<EditQuestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditQuestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditQuestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
