import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListEnemiesComponent } from './list-enemies.component';

describe('ListEnemiesComponent', () => {
  let component: ListEnemiesComponent;
  let fixture: ComponentFixture<ListEnemiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListEnemiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListEnemiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
