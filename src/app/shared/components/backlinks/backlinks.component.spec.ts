import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { BacklinksComponent } from './backlinks.component';
import { MentionService } from '../../../core/services/mention.service';

describe('BacklinksComponent', () => {
  let fixture: ComponentFixture<BacklinksComponent>;
  let mentions: any;

  beforeEach(async () => {
    mentions = { getBacklinks: jasmine.createSpy('getBacklinks').and.returnValue(of([])) };
    await TestBed.configureTestingModule({
      imports: [RouterModule],
      declarations: [BacklinksComponent],
      providers: [provideRouter([]), { provide: MentionService, useValue: mentions }],
    }).compileComponents();
    fixture = TestBed.createComponent(BacklinksComponent);
  });

  function show(entityId: string) {
    fixture.componentInstance.entityType = 'person';
    fixture.componentInstance.entityId = entityId;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows nothing without backlinks', () => {
    expect(show('p1').querySelector('.backlinks')).toBeNull();
    expect(mentions.getBacklinks).toHaveBeenCalledWith('person', 'p1');
  });

  it('links each text that mentions the entity', () => {
    mentions.getBacklinks.and.returnValue(of([
      { sourceType: 'note', sourceId: 'n1', kind: 'Notiz', label: 'Plot', route: { path: '/notes', queryParams: { note: 'n1' } } },
      { sourceType: 'quest', sourceId: 'q1', kind: 'Quest', label: 'Der Schatz', route: { path: '/quests/q1' } },
    ]));
    const links = show('p1').querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/notes?note=n1');
    expect(links[1].getAttribute('href')).toBe('/quests/q1');
    expect(links[1].textContent).toBe('Der Schatz');
  });
});
