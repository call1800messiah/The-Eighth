import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ImageCropperModule } from 'ngx-img-cropper';

import { AvatarComponent } from './components/avatar/avatar.component';
import { PopoverModule } from '../popover/popover.module';
import { EditImageComponent } from './components/edit-image/edit-image.component';
import { AudioPlayerListComponent } from './components/audio-player-list/audio-player-list.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { EditInfoComponent } from './components/edit-info/edit-info.component';
import { DiceModule } from '../dice/dice.module';
import { SelectOnFocusDirective } from './directives/select-on-focus.directive';
import { BarComponent } from './components/bar/bar.component';
import { EditAttributeComponent } from './components/edit-attribute/edit-attribute.component';
import { InfoBoxComponent } from './components/info-box/info-box.component';
import { EstimatedAgePipe } from './pipes/estimated-age.pipe';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FocusOnInitDirective } from './directives/focus-on-init.directive';
import { TimelineComponent } from './components/timeline/timeline.component';
import { EditEventComponent } from './components/edit-event/edit-event.component';
import { UnlockButtonComponent } from './components/unlock-button/unlock-button.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { BoxGridComponent } from './components/box-grid/box-grid.component';
import { TopBarFilterComponent } from './components/top-bar-filter/top-bar-filter.component';



@NgModule({
  declarations: [
    AudioPlayerComponent,
    AudioPlayerListComponent,
    AvatarComponent,
    BarComponent,
    BoxGridComponent,
    DashboardComponent,
    EditAttributeComponent,
    EditEventComponent,
    EditImageComponent,
    EditInfoComponent,
    EstimatedAgePipe,
    FocusOnInitDirective,
    InfoBoxComponent,
    SelectOnFocusDirective,
    TimelineComponent,
    UnlockButtonComponent,
    ProgressBarComponent,
    TopBarFilterComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
    FormsModule,
    ReactiveFormsModule,
    PopoverModule,
    ImageCropperModule,
    DiceModule,
    RouterModule,
  ],
  exports: [
    AudioPlayerListComponent,
    AvatarComponent,
    BarComponent,
    BoxGridComponent,
    DashboardComponent,
    DiceModule,
    EditAttributeComponent,
    EditImageComponent,
    EditInfoComponent,
    EstimatedAgePipe,
    FocusOnInitDirective,
    FontAwesomeModule,
    FormsModule,
    InfoBoxComponent,
    PopoverModule,
    ProgressBarComponent,
    ReactiveFormsModule,
    SelectOnFocusDirective,
    TimelineComponent,
    TopBarFilterComponent,
    UnlockButtonComponent,
  ],
})
export class SharedModule { }
