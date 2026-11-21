import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditTagsComponent } from './edit-tags.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditTagsComponent', () => {
  let component: EditTagsComponent;
  let fixture: ComponentFixture<EditTagsComponent>;
  let save: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditTagsComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    save = jasmine.createSpy('save').and.returnValue(Promise.resolve(true));
    fixture = TestBed.createComponent(EditTagsComponent);
    component = fixture.componentInstance;
    component.props = { tags: ['elf'], save };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a trimmed tag once and ignore empty input', () => {
    component.newTag = '  mage ';
    component.addTag();
    component.newTag = 'mage';
    component.addTag();
    component.newTag = '   ';
    component.addTag();
    expect(component.tagsList).toEqual(['elf', 'mage']);
  });

  it('should leave the tags passed in untouched until saved', () => {
    component.newTag = 'mage';
    component.addTag();
    expect(component.props.tags).toEqual(['elf']);
  });

  it('should hand the edited list to props.save and close on success', async () => {
    const dismissed = spyOn(component.dismissPopover, 'emit');
    component.newTag = 'mage';
    component.addTag();
    component.removeTag('elf');

    await component.save();

    expect(save).toHaveBeenCalledWith(['mage']);
    expect(dismissed).toHaveBeenCalledWith(true);
  });

  it('should stay open when saving fails', async () => {
    save.and.returnValue(Promise.resolve(false));
    const dismissed = spyOn(component.dismissPopover, 'emit');

    await component.save();

    expect(dismissed).not.toHaveBeenCalled();
  });
});
