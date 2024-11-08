import { BrowserModule } from '@angular/platform-browser';
import { LOCALE_ID, NgModule } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDE from '@angular/common/locales/de';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { OverviewModule } from './overview/overview.module';
import { SharedModule } from './shared/shared.module';


// Locales
registerLocaleData(localeDE, 'de');


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    CoreModule,
    OverviewModule,
    FontAwesomeModule,
    SharedModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'de' },
  ],

  bootstrap: [AppComponent]
})
export class AppModule { }
