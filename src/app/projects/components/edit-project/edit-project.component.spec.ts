import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditProjectComponent } from './edit-project.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project';

describe('EditProjectComponent', () => {
  let component: EditProjectComponent;
  let fixture: ComponentFixture<EditProjectComponent>;
  let projectService: ProjectService;

  function create(props: Partial<Project>) {
    fixture = TestBed.createComponent(EditProjectComponent);
    component = fixture.componentInstance;
    component.props = props as Project;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    projectService = jasmine.createSpyObj('ProjectService', { store: Promise.resolve({ success: true, id: 'new-id' }) });
    await TestBed.configureTestingModule({
      declarations: [EditProjectComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: ProjectService, useValue: projectService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create', () => {
    create({});
    expect(component).toBeTruthy();
  });

  describe('save', () => {
    const milestoneId = 'a75d850c-4ec2-402d-87da-99d8c4b7e7c8';
    const requirementId = 'b1c2d3e4-0000-4000-8000-000000000001';
    const existing: Partial<Project> = {
      id: 'project-1',
      owner: 'owner-1',
      name: 'Schmiede',
      benefit: 'Bessere Waffen',
      interval: 'Woche',
      milestones: [{ id: milestoneId, description: 'Esse', requiredPoints: 5 }],
      requirements: [{ id: requirementId, skill: 'Schmieden', currentPoints: 2, requiredPoints: 10, threshold: 1 }],
    };

    it('stores milestones and requirements as arrays, not as form keys', () => {
      create(existing);
      component.projectForm.get(`req-${requirementId}-cur`).setValue(7);
      component.projectForm.get(`mile-${milestoneId}-desc`).setValue('Große Esse');

      component.save();

      const [stored, id] = (projectService.store as jasmine.Spy).calls.mostRecent().args;
      expect(id).toBe('project-1');
      expect(stored).toEqual({
        name: 'Schmiede',
        benefit: 'Bessere Waffen',
        interval: 'Woche',
        owner: 'owner-1',
        milestones: [{ id: milestoneId, description: 'Große Esse', requiredPoints: 5 }],
        requirements: [{ id: requirementId, skill: 'Schmieden', currentPoints: 7, requiredPoints: 10, threshold: 1 }],
      } as any);
    });

    it('includes added and leaves out removed entries', () => {
      create(existing);
      component.removeMilestone(existing.milestones[0]);
      component.addRequirement();
      const added = component.requirements[1];
      component.projectForm.get(`req-${added.id}-skill`).setValue('Feuer');

      component.save();

      const [stored] = (projectService.store as jasmine.Spy).calls.mostRecent().args;
      expect(stored.milestones).toEqual([]);
      expect(stored.requirements.map((r) => r.skill)).toEqual(['Schmieden', 'Feuer']);
      expect(Object.keys(stored).some((key) => key.startsWith('req-') || key.startsWith('mile-'))).toBeFalse();
    });

    it('closes the popover after a successful save', async () => {
      create(existing);
      spyOn(component.dismissPopover, 'emit');

      await component.save();

      expect(component.dismissPopover.emit).toHaveBeenCalledWith(true);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('stays open and shows an error when saving fails', async () => {
      create(existing);
      (projectService.store as jasmine.Spy).and.resolveTo({ success: false });
      spyOn(component.dismissPopover, 'emit');

      await component.save();
      // Zoneless TestBed: state changed outside an event needs the view marked dirty
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(component.dismissPopover.emit).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('nicht gespeichert');
    });

    it('saves once while a save is running and disables the button meanwhile', async () => {
      create(existing);
      let finish: (value: { success: boolean }) => void;
      (projectService.store as jasmine.Spy).and.returnValue(new Promise((resolve) => finish = resolve));

      const first = component.save();
      const second = component.save();
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();

      finish({ success: false });
      await Promise.all([first, second]);
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(projectService.store).toHaveBeenCalledTimes(1);
      expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeFalse();
    });

  });

  describe('validation', () => {
    const milestoneId = 'm1';
    const requirementId = 'r1';
    const existing: Partial<Project> = {
      id: 'project-1',
      owner: 'owner-1',
      name: 'Schmiede',
      benefit: 'Bessere Waffen',
      interval: 'Woche',
      milestones: [{ id: milestoneId, description: 'Esse', requiredPoints: 5 }],
      requirements: [{ id: requirementId, skill: 'Schmieden', currentPoints: 2, requiredPoints: 10, threshold: 1 }],
    };

    it('accepts a complete project', () => {
      create(existing);
      expect(component.projectForm.valid).toBeTrue();
    });

    ([
      [`req-${requirementId}-skill`, ''],
      [`req-${requirementId}-thr`, null],
      [`req-${requirementId}-cur`, null],
      [`req-${requirementId}-cur`, -1],
      [`req-${requirementId}-req`, null],
      [`req-${requirementId}-req`, -1],
      [`req-${requirementId}-req`, 2.5],
      [`mile-${milestoneId}-req`, null],
      [`mile-${milestoneId}-req`, 0],
      [`mile-${milestoneId}-req`, 2147483648],
      [`req-${requirementId}-thr`, -2147483649],
    ] as [string, string | number | null][]).forEach(([control, value]) => {
      it(`rejects ${value === '' ? 'an empty' : value} ${control.replace(/-r1|-m1/, '')} and does not save`, async () => {
        create(existing);
        component.projectForm.get(control).setValue(value);

        expect(component.projectForm.valid).toBeFalse();
        await component.save();
        expect(projectService.store).not.toHaveBeenCalled();
      });
    });

    it('validates rows added in the form', () => {
      create(existing);
      component.addMilestone();
      const added = component.milestones[1];

      component.projectForm.get(`mile-${added.id}-req`).setValue(null);

      expect(component.projectForm.valid).toBeFalse();
    });
  });
});
