import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditEnemyComponent } from './edit-enemy.component';

describe('EditEnemyComponent', () => {
  let component: EditEnemyComponent;
  let fixture: ComponentFixture<EditEnemyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditEnemyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditEnemyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
