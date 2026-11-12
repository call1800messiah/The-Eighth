import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../shared/shared.module';
import { DraftsRoutingModule } from './drafts-routing.module';
import { DraftsComponent } from './components/drafts/drafts.component';

/** GM page for Claude's drafts and MCP connections. */
@NgModule({
  declarations: [DraftsComponent],
  imports: [CommonModule, SharedModule, DraftsRoutingModule],
})
export class DraftsModule { }
