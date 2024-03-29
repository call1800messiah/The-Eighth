import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { faMask } from '@fortawesome/free-solid-svg-icons';

import { Info } from '../../models/info';
import { ConfigService } from '../../../core/services/config.service';
import { InfoType } from '../../../core/enums/info-type.enum';



@Component({
  selector: 'app-info-box',
  templateUrl: './info-box.component.html',
  styleUrls: ['./info-box.component.scss']
})
export class InfoBoxComponent implements OnInit {
  @Input() key: InfoType;
  @Input() infos: Info[];
  @Output() editDetail = new EventEmitter<Info>();
  faMask = faMask;
  infoTypes = ConfigService.infoTypes;

  constructor() { }

  ngOnInit(): void {
    this.infos.sort((a, b) => {
      if (a.created > b.created) {
        return 1;
      }
      if (a.created < b.created) {
        return -1;
      }
      return 0;
    });
  }



  detailClicked(info: Info) {
    this.editDetail.emit(info);
  }
}
