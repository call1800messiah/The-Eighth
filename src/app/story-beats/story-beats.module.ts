import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../shared/shared.module';
import { StoryBeatBarComponent } from './components/story-beat-bar/story-beat-bar.component';


/**
 * Not routed: the bar is part of the app shell and floats over every page,
 * so AppModule imports this eagerly. It renders nothing for non-GMs.
 */
@NgModule({
  declarations: [
    StoryBeatBarComponent,
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
