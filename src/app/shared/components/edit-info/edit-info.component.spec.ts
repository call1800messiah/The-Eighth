import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditInfoComponent } from './edit-info.component';
import { DataService } from '../../../core/services/data.service';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditInfoComponent', () => {
  let component: EditInfoComponent;
  let fixture: ComponentFixture<EditInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditInfoComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditInfoComponent);
    component = fixture.componentInstance;
    component.props = { collection: 'people', documentId: 'p1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when the database refuses the change', () => {
    let data: any;
    let dismissed: boolean;

    beforeEach(() => {
      data = TestBed.inject(DataService);
      data.storeInfo = jasmine.createSpy('storeInfo').and.resolveTo({ success: false });
      data.deleteInfo = jasmine.createSpy('deleteInfo').and.resolveTo(false);
      fixture = TestBed.createComponent(EditInfoComponent);
      component = fixture.componentInstance;
      component.props = { collection: 'people', parentId: 'p1', info: { id: 'i1', content: 'X', type: 0 } } as any;
      fixture.detectChanges();
      dismissed = false;
      component.dismissPopover.subscribe(() => dismissed = true);
    });

    it('stays open and says the save failed', async () => {
      await component.save();
      fixture.detectChanges();

      expect(dismissed).toBeFalse();
      expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('nicht gespeichert');
    });

    it('stays open and says the delete failed', async () => {
      await component.delete();
      fixture.detectChanges();

      expect(dismissed).toBeFalse();
      expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('nicht gelöscht');
    });
  });
});
