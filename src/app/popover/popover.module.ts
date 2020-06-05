import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { PopoverComponent } from './component/popover/popover.component';



@NgModule({
  declarations: [
    PopoverComponent,
  ],
  exports: [
    PopoverComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
  ]
})
export class PopoverModule { }
