import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../shared/shared.module';
import { StoryBeatBarComponent } from './components/story-beat-bar/story-beat-bar.component';
import { StoryBeatSettingsComponent } from './components/story-beat-settings/story-beat-settings.component';


/**
 * Not routed: FlowModule imports this for the bar on the flow view.
 * The bar renders nothing for non-GMs.
 */
@NgModule({
  declarations: [
    StoryBeatBarComponent,
    StoryBeatSettingsComponent,
  ],
  exports: [
    StoryBeatBarComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
  ]
})
export class StoryBeatsModule { }
