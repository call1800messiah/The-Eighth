import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { OverviewModule } from './overview/overview.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PopoverModule } from './popover/popover.module';



@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    CoreModule,
    OverviewModule,
    AppRoutingModule,
    FontAwesomeModule,
    PopoverModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
