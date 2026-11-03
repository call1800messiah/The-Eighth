import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { DraftBannerComponent } from './draft-banner.component';
import { DraftsService } from '../../../core/services/drafts.service';

describe('DraftBannerComponent', () => {
  let fixture: ComponentFixture<DraftBannerComponent>;
  let drafts: any;
  let router: any;

  beforeEach(async () => {
    drafts = {
      publish: jasmine.createSpy('publish').and.returnValue(Promise.resolve(true)),
      discard: jasmine.createSpy('discard').and.returnValue(Promise.resolve(true)),
    };
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    await TestBed.configureTestingModule({
      declarations: [DraftBannerComponent],
      providers: [{ provide: DraftsService, useValue: drafts }, { provide: Router, useValue: router }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(DraftBannerComponent);
    fixture.componentInstance.entityType = 'place';
  });

  function show(status: string) {
    fixture.componentInstance.entity = { id: 'l1', name: 'Silbersee', status };
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('is hidden for published entities', () => {
    expect(show('published').querySelector('.draft-banner')).toBeNull();
  });

  it('publishes a draft', async () => {
    (show('draft').querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(drafts.publish).toHaveBeenCalledWith('place', 'l1');
  });

  it('goes back to the list after discarding', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    (show('draft').querySelectorAll('button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(drafts.discard).toHaveBeenCalledWith('place', 'l1');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/places');
  });
});
