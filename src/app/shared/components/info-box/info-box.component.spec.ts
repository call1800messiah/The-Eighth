import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { InfoBoxComponent } from './info-box.component';
import { InfoType } from '../../../core/enums/info-type.enum';
import { AuthService } from '../../../core/services/auth.service';
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

  describe('opening the editor', () => {
    const info = (owner: string) => ({ id: 'i1', owner, content: 'X', created: new Date() }) as any;
    let user: any;
    let emitted: any[];

    beforeEach(() => {
      user = TestBed.inject(AuthService).user;
      emitted = [];
      component.editDetail.subscribe(i => emitted.push(i));
    });

    it('lets the owner of the info edit it', () => {
      user.isGM = false;
      component.detailClicked(info(user.id));
      expect(emitted.length).toBe(1);
    });

    it('lets a GM edit any info', () => {
      user.isGM = true;
      component.detailClicked(info('someone-else'));
      expect(emitted.length).toBe(1);
    });

    it('does not offer editing to a player who does not own the info', () => {
      user.isGM = false;
      component.detailClicked(info('someone-else'));
      expect(emitted).toEqual([]);
    });
  });
});
