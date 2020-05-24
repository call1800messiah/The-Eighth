import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AvatarComponent } from './components/avatar/avatar.component';



@NgModule({
  declarations: [
    AvatarComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
  exports: [
    AvatarComponent,
    FontAwesomeModule
  ]
})
export class SharedModule { }
