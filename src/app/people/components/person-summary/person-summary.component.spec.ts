import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonSummaryComponent } from './person-summary.component';

describe('PersonSummaryComponent', () => {
  let component: PersonSummaryComponent;
  let fixture: ComponentFixture<PersonSummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PersonSummaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
