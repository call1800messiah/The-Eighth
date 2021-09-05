import { Component, Input, OnInit } from '@angular/core';

import { Place } from '../../models/place';
import { ConfigService } from '../../../core/services/config.service';



@Component({
  selector: 'app-place-summary',
  templateUrl: './place-summary.component.html',
  styleUrls: ['./place-summary.component.scss']
})
export class PlaceSummaryComponent implements OnInit {
  @Input() place: Place;
  placeTypes = ConfigService.placeTypes;

  constructor() { }

  ngOnInit(): void {
  }

}
