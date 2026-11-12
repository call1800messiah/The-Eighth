import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { MarkdownComponent } from './markdown.component';
import { MentionService } from '../../../core/services/mention.service';

const ID = '11111111-1111-4111-8111-111111111111';

describe('MarkdownComponent', () => {
  let fixture: ComponentFixture<MarkdownComponent>;
  let router: any;
  let mentions: any;

  beforeEach(async () => {
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    mentions = {
      resolve: jasmine.createSpy('resolve').and.returnValue(of(() => ({ state: 'visible', name: 'Alrik von Gareth' }))),
    };
    await TestBed.configureTestingModule({
      declarations: [MarkdownComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: MentionService, useValue: mentions },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MarkdownComponent);
  });

  function render(text: string): HTMLElement {
    fixture.componentInstance.text = text;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('renders Markdown', () => {
    expect(render('**fett**').querySelector('strong').textContent).toBe('fett');
  });

  it('does not resolve when there are no mentions', () => {
    render('nur Text');
    expect(mentions.resolve).not.toHaveBeenCalled();
  });

  it('shows mentions with their current name', () => {
    const link = render(`[Alrik](mention:person/${ID})`).querySelector('a.mention');
    expect(link.textContent).toBe('Alrik von Gareth');
  });

  it('navigates inside the app on a mention click and keeps the click from the parent', () => {
    const parentClick = jasmine.createSpy('parentClick');
    const el = render(`[Alrik](mention:person/${ID})`);
    el.parentElement?.addEventListener('click', parentClick);
    (el.querySelector('a.mention') as HTMLElement).click();
    expect(router.navigateByUrl).toHaveBeenCalledWith(`/people/${ID}`);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('leaves other links to the browser but keeps the click from the parent', () => {
    const el = render('[Wiki](https://example.com)');
    const parentClick = jasmine.createSpy('parentClick');
    el.parentElement?.addEventListener('click', parentClick);
    const link = el.querySelector('a') as HTMLAnchorElement;
    // Do not actually open a tab during the test.
    link.addEventListener('click', event => event.preventDefault());
    link.click();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
