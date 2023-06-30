import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ImageCropperModule } from 'ngx-img-cropper';

import { AvatarComponent } from './components/avatar/avatar.component';
import { EditImageComponent } from './components/edit-image/edit-image.component';
import { AudioPlayerListComponent } from './components/audio-player-list/audio-player-list.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { EditInfoComponent } from './components/edit-info/edit-info.component';
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
import { TplVarDirective } from './directives/tpl-var.directive';
import { ContainerComponent } from './components/container/container.component';
import { PopoverComponent } from './components/popover/popover.component';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { EditAccessComponent } from './components/edit-access/edit-access.component';
import { EditTagsComponent } from './components/edit-tags/edit-tags.component';



@NgModule({
  declarations: [
    AudioPlayerComponent,
    AudioPlayerListComponent,
    AvatarComponent,
    BarComponent,
    BoxGridComponent,
    ContainerComponent,
    DashboardComponent,
    EditAttributeComponent,
    EditEventComponent,
    EditImageComponent,
    EditInfoComponent,
    EstimatedAgePipe,
    FocusOnInitDirective,
    InfoBoxComponent,
    PopoverComponent,
    ProgressBarComponent,
    SelectOnFocusDirective,
    TimelineComponent,
    TopBarFilterComponent,
    TplVarDirective,
    UnlockButtonComponent,
    ContextMenuComponent,
    EditAccessComponent,
    EditTagsComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
    FormsModule,
    ReactiveFormsModule,
    ImageCropperModule,
    RouterModule,
    NgOptimizedImage,
  ],
  exports: [
    AudioPlayerListComponent,
    AvatarComponent,
    BarComponent,
    BoxGridComponent,
    ContainerComponent,
    ContextMenuComponent,
    DashboardComponent,
    EditAccessComponent,
    EditAttributeComponent,
    EditImageComponent,
    EditInfoComponent,
    EditTagsComponent,
    EstimatedAgePipe,
    FocusOnInitDirective,
    FontAwesomeModule,
    FormsModule,
    InfoBoxComponent,
    NgOptimizedImage,
    PopoverComponent,
    ProgressBarComponent,
    ReactiveFormsModule,
    SelectOnFocusDirective,
    TimelineComponent,
    TopBarFilterComponent,
    TplVarDirective,
    UnlockButtonComponent,
  ],
})
export class SharedModule { }
