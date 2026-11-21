import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;
  let events: Subject<any>;

  beforeEach(() => {
    events = new Subject();
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { events, navigate: jasmine.createSpy('navigate') } }],
    });
    service = TestBed.inject(NavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('labels the page by its path, ignoring the query', () => {
    events.next(new NavigationEnd(1, '/notes?note=abc', '/notes?note=abc'));
    expect(service.pageLabel$.value).toBe('Notizen');
  });
});
