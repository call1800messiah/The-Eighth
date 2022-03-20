import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopBarFilterComponent } from './top-bar-filter.component';

describe('TopBarFilterComponent', () => {
  let component: TopBarFilterComponent;
  let fixture: ComponentFixture<TopBarFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopBarFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TopBarFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
