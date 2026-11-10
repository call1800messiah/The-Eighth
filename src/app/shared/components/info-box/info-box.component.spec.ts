import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { InfoBoxComponent } from './info-box.component';
import { InfoType } from '../../../core/enums/info-type.enum';
import { AuthService } from '../../../core/services/auth.service';
import { MentionService } from '../../../core/services/mention.service';
import { MarkdownComponent } from '../markdown/markdown.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('InfoBoxComponent', () => {
  let component: InfoBoxComponent;
  let fixture: ComponentFixture<InfoBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // The real Markdown component, so clicks on links in a text behave as in the app.
      declarations: [InfoBoxComponent, MarkdownComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } },
        { provide: MentionService, useValue: { resolve: () => of(() => ({ state: 'visible', name: 'Alrik' })) } },
      ],
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

    describe('clicking inside the text', () => {
      const ID = '11111111-1111-4111-8111-111111111111';
      // A click on a link would navigate the test page; cancel its default
      // action in the capture phase, before any handler of the app runs.
      const cancelNavigation = (e: Event) => e.preventDefault();

      beforeEach(() => {
        user.isGM = true;
        document.addEventListener('click', cancelNavigation, true);
        fixture.componentRef.setInput('infos', [
          { ...info('someone-else'), content: `Siehe [Alrik](mention:person/${ID}) und [Wiki](https://example.com/wiki).` },
        ]);
        fixture.detectChanges();
      });

      afterEach(() => document.removeEventListener('click', cancelNavigation, true));

      it('follows a mention link without opening the editor', () => {
        (fixture.nativeElement.querySelector('a[data-mention-type]') as HTMLElement).click();
        expect(emitted).toEqual([]);
      });

      it('follows an external link without opening the editor', () => {
        (fixture.nativeElement.querySelector('a[href^="https:"]') as HTMLElement).click();
        expect(emitted).toEqual([]);
      });

      it('still opens the editor when the text itself is clicked', () => {
        (fixture.nativeElement.querySelector('app-markdown p') as HTMLElement).click();
        expect(emitted.length).toBe(1);
      });
    });
  });
});
