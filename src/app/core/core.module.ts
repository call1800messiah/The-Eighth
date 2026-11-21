import { NgModule, inject, provideAppInitializer } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './components/header/header.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { SharedModule } from '../shared/shared.module';
import { FooterComponent } from './components/footer/footer.component';
import { DiceModule } from '../dice/dice.module';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PeopleModule } from '../people/people.module';
import { CalendarService } from './calendar/calendar.service';
import { supabaseProvider } from './providers/supabase.provider';

@NgModule({
  declarations: [
    FooterComponent,
    HeaderComponent,
    PageNotFoundComponent,
    SidebarComponent,
  ],
  exports: [
    FooterComponent,
    HeaderComponent,
    PageNotFoundComponent,
    SidebarComponent,
  ],
  imports: [
    CommonModule,
    DiceModule,
    PeopleModule,
    RouterModule,
    SharedModule,
  ],
  providers: [
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    supabaseProvider,
    provideAppInitializer(() => inject(CalendarService).load()),
  ]
})
export class CoreModule { }
