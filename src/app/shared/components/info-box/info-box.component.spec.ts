import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { InfoBoxComponent } from './info-box.component';
import { InfoType } from '../../../core/enums/info-type.enum';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('InfoBoxComponent', () => {
  let component: InfoBoxComponent;
  let fixture: ComponentFixture<InfoBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InfoBoxComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoBoxComponent);
    component = fixture.componentInstance;
    component.key = InfoType.Appearance;
    component.infos = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
