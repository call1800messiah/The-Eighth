import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { FooterComponent } from './footer.component';
import { AuthService } from '../../services/auth.service';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let user$: BehaviorSubject<any>;

  beforeEach(waitForAsync(() => {
    user$ = new BehaviorSubject<any>({ id: 'u1', isGM: false });
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ FooterComponent ],
      providers: [{ provide: AuthService, useValue: { user$ } }],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the Claude page to GMs only', async () => {
    const links = async () => (await firstValueFrom(component.navigation$)).map(entry => entry.link);
    expect(await links()).not.toContain('/drafts');
    user$.next({ id: 'u1', isGM: true });
    expect(await links()).toContain('/drafts');
  });
});
