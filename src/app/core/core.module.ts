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



@NgModule({
  declarations: [
    HeaderComponent,
    PageNotFoundComponent,
    FooterComponent,
  ],
  exports: [
    FooterComponent,
    HeaderComponent,
    PageNotFoundComponent,
  ],
  imports: [
    CommonModule,
    DiceModule,
    RouterModule,
    SharedModule,
    AngularFireModule.initializeApp(environment.tenantData[environment.tenant].firebase),
    AngularFirestoreModule,
    AngularFireStorageModule
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi())
  ]
})
export class CoreModule { }
