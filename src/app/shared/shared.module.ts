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



@NgModule({
  declarations: [
    AvatarComponent,
    EditImageComponent,
    AudioPlayerListComponent,
    AudioPlayerComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
    ReactiveFormsModule,
    PopoverModule,
    ImageCropperModule,
  ],
  exports: [
    AudioPlayerListComponent,
    AvatarComponent,
    EditImageComponent,
    FontAwesomeModule,
    ReactiveFormsModule,
    PopoverModule,
  ]
})
export class SharedModule { }
