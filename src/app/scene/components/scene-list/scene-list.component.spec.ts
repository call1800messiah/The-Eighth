import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SceneListComponent } from './scene-list.component';

describe('SceneOverviewComponent', () => {
  let component: SceneListComponent;
  let fixture: ComponentFixture<SceneListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SceneListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SceneListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
