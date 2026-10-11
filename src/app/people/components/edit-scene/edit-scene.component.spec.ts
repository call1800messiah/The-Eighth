import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import type { Scene } from '../../models';
import { EditSceneComponent } from './edit-scene.component';
import { SceneService } from '../../services/scene.service';
import { PeopleService } from '../../services/people.service';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditSceneComponent', () => {
  let component: EditSceneComponent;
  let fixture: ComponentFixture<EditSceneComponent>;
  let sceneService: jasmine.SpyObj<SceneService>;

  const scene: Scene = {
    id: 'scene-1', image: 'url', caption: 'Alt', owner: 'user-1', people: ['p1', 'hidden'],
  };
  const image = new File(['x'], 'bild.png', { type: 'image/png' });

  function fileEvent(file: File): Event {
    return { target: { files: [file] } } as unknown as Event;
  }

  async function setup(props: any) {
    sceneService = jasmine.createSpyObj('SceneService', ['create', 'update']);
    sceneService.create.and.returnValue(Promise.resolve());
    sceneService.update.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [EditSceneComponent],
      imports: [FormsModule],
      providers: [
        ...createComponentTestProviders(),
        { provide: SceneService, useValue: sceneService },
        {
          provide: PeopleService,
          useValue: { getPeople: () => of([{ id: 'p2', name: 'Zora' }, { id: 'p1', name: 'Alrik' }]) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditSceneComponent);
    component = fixture.componentInstance;
    component.props = props;
    spyOn(component.dismissPopover, 'emit');
    fixture.detectChanges();
  }

  describe('creating', () => {
    beforeEach(() => setup({ personId: 'p1' }));

    it('preselects the person the popover was opened from', () => {
      expect([...component.selected]).toEqual(['p1']);
    });

    it('lists people sorted by name', () => {
      const labels = Array.from(fixture.nativeElement.querySelectorAll('.people label'))
        .map((label: any) => label.textContent.trim());
      expect(labels).toEqual(['Alrik', 'Zora']);
    });

    it('cannot save without an image', () => {
      expect(component.canSave).toBeFalse();
    });

    it('rejects files that are not images', () => {
      component.fileChanged(fileEvent(new File(['x'], 'notizen.txt', { type: 'text/plain' })));

      expect(component.file).toBeNull();
      expect(component.fileInvalid).toBeTrue();
      expect(component.canSave).toBeFalse();
    });

    it('cannot save without any tagged person', () => {
      component.fileChanged(fileEvent(image));
      component.toggle('p1', false);

      expect(component.canSave).toBeFalse();
    });

    it('creates the scene and closes', async () => {
      component.fileChanged(fileEvent(image));
      component.caption = 'Am Fluss';
      component.toggle('p2', true);

      await component.save();

      expect(sceneService.create).toHaveBeenCalledWith(image, 'Am Fluss', ['p1', 'p2']);
      expect(component.dismissPopover.emit).toHaveBeenCalledWith(true);
    });

    it('stays open and can retry when saving fails', async () => {
      spyOn(console, 'error');
      sceneService.create.and.returnValue(Promise.reject(new Error('upload failed')));
      component.fileChanged(fileEvent(image));

      await component.save();

      expect(component.dismissPopover.emit).not.toHaveBeenCalled();
      expect(component.saving).toBeFalse();
      expect(component.canSave).toBeTrue();
    });
  });

  describe('editing', () => {
    beforeEach(() => setup({ scene }));

    it('starts from the scene caption and tags', () => {
      expect(component.caption).toBe('Alt');
      expect(component.selected.has('p1')).toBeTrue();
    });

    it('shows no file input', () => {
      expect(fixture.nativeElement.querySelector('input[type=file]')).toBeNull();
      expect(component.canSave).toBeTrue();
    });

    it('keeps tags on people the editor cannot see', async () => {
      component.toggle('p2', true);

      await component.save();

      expect(sceneService.update).toHaveBeenCalledWith(scene, 'Alt', ['p1', 'hidden', 'p2']);
    });
  });
});
