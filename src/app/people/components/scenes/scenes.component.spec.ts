import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import type { Scene } from '../../models';
import { ScenesComponent } from './scenes.component';
import { SceneService } from '../../services/scene.service';
import { AuthService } from '../../../core/services/auth.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
import { EditAccessComponent } from '../../../shared/components/edit-access/edit-access.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('ScenesComponent', () => {
  let component: ScenesComponent;
  let fixture: ComponentFixture<ScenesComponent>;
  let auth: any;
  let popover: any;
  let sceneService: jasmine.SpyObj<SceneService>;

  const own: Scene = { id: 's1', image: 'https://example.com/1.jpg', caption: 'Eigene', owner: 'user-1', people: ['p1'] };
  const shared: Scene = { id: 's2', image: 'https://example.com/2.jpg', caption: '', owner: 'user-2', people: ['p1'] };

  beforeEach(async () => {
    sceneService = jasmine.createSpyObj('SceneService', ['delete']);
    sceneService.delete.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [ScenesComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: SceneService, useValue: sceneService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    popover = TestBed.inject(PopoverService);
    fixture = TestBed.createComponent(ScenesComponent);
    component = fixture.componentInstance;
    component.scenes = [own, shared];
    fixture.detectChanges();
  });

  it('renders one linked thumbnail per scene', () => {
    const links = fixture.nativeElement.querySelectorAll('.scene a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe(own.image);
    expect(fixture.nativeElement.textContent).toContain('Eigene');
  });

  it('shows actions only on scenes the user owns', () => {
    const scenes = fixture.nativeElement.querySelectorAll('.scene');
    expect(scenes[0].querySelector('.actions')).not.toBeNull();
    expect(scenes[1].querySelector('.actions')).toBeNull();
  });

  it('shows actions on every scene for a GM', () => {
    auth.user.isGM = true;
    // Zoneless TestBed: state changed outside an event needs the view marked dirty
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.scene .actions').length).toBe(2);
  });

  it('opens the edit popover with the scene', () => {
    component.edit(own);

    expect(popover.showPopover).toHaveBeenCalledWith('Szene bearbeiten', EditSceneComponent, { scene: own });
  });

  it('opens access management for the scene', () => {
    component.editAccess(own);

    expect(popover.showPopover).toHaveBeenCalledWith('Zugriff regeln', EditAccessComponent, {
      collection: 'scenes',
      documentId: 's1',
      ownerId: 'user-1',
    });
  });

  it('deletes only after confirmation', async () => {
    spyOn(window, 'confirm').and.returnValues(false, true);

    await component.remove(own);
    expect(sceneService.delete).not.toHaveBeenCalled();

    await component.remove(own);
    expect(sceneService.delete).toHaveBeenCalledWith(own);
  });
});
