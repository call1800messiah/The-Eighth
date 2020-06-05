import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { AvatarComponent } from './components/avatar/avatar.component';
import { PopoverModule } from '../popover/popover.module';



@NgModule({
  declarations: [
    AvatarComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
    ReactiveFormsModule,
    PopoverModule,
  ],
  exports: [
    AvatarComponent,
    FontAwesomeModule,
    ReactiveFormsModule,
    PopoverModule,
  ]
})
export class SharedModule { }
