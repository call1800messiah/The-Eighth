import { Component, EventEmitter, Input, OnChanges, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { faMask } from '@fortawesome/free-solid-svg-icons';

import { Info } from '../../models/info';
import { ConfigService } from '../../../core/services/config.service';
import { InfoType } from '../../../core/enums/info-type.enum';
import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-info-box',
  templateUrl: './info-box.component.html',
  styleUrls: ['./info-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class InfoBoxComponent implements OnChanges {
  private auth = inject(AuthService);

  @Input() key: InfoType;
  @Input() infos: Info[];
  @Output() editDetail = new EventEmitter<Info>();
  faMask = faMask;
  infoTypes = ConfigService.infoTypes;

  constructor() { }

  // On every change, not just the first: the box stays in place (tracked by
  // its type) when a reload hands it a new, unsorted list.
  ngOnChanges(): void {
    this.infos?.sort((a, b) => {
      if (a.created > b.created) {
        return 1;
      }
      if (a.created < b.created) {
        return -1;
      }
      return 0;
    });
  }



  /** Mirrors info_boxes_update_policy: only the info's owner or a GM may change it. */
  canEdit(info: Info): boolean {
    const user = this.auth.user;
    return !!user && (user.isGM || user.id === info.owner);
  }


  detailClicked(info: Info) {
    if (this.canEdit(info)) {
      this.editDetail.emit(info);
    }
  }
}
