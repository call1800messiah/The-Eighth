import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { AvatarComponent } from './components/avatar/avatar.component';
import { PopoverModule } from '../popover/popover.module';
import { EditImageComponent } from './components/edit-image/edit-image.component';
import { ImageCropperModule } from 'ngx-img-cropper';
import { AudioPlayerListComponent } from './components/audio-player-list/audio-player-list.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { EditInfoComponent } from './components/edit-info/edit-info.component';
import { DiceModule } from '../dice/dice.module';
import { SelectOnFocusDirective } from './directives/select-on-focus.directive';



@NgModule({
  declarations: [
    AvatarComponent,
    EditImageComponent,
    EditInfoComponent,
    AudioPlayerListComponent,
    AudioPlayerComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
    ReactiveFormsModule,
    PopoverModule,
    ImageCropperModule,
    DiceModule,
  ],
  exports: [
    AudioPlayerListComponent,
    AvatarComponent,
    DiceModule,
    EditImageComponent,
    EditInfoComponent,
    SelectOnFocusDirective,
    FontAwesomeModule,
    ReactiveFormsModule,
    PopoverModule,
  ]
})
export class SharedModule { }
