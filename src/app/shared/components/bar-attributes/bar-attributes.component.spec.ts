import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarAttributesComponent } from './bar-attributes.component';

describe('BarAttributesComponent', () => {
  let component: BarAttributesComponent;
  let fixture: ComponentFixture<BarAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarAttributesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
