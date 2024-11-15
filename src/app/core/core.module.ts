import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

import { HeaderComponent } from './components/header/header.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';
import { FooterComponent } from './components/footer/footer.component';
import { DiceModule } from '../dice/dice.module';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PeopleModule } from '../people/people.module';



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
    AngularFireModule.initializeApp(environment.tenantData[environment.tenant].firebase),
    AngularFirestoreModule,
    AngularFireStorageModule,
    CommonModule,
    DiceModule,
    PeopleModule,
    RouterModule,
    SharedModule,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi())
  ]
})
export class CoreModule { }
