import { Component, Input, OnInit } from '@angular/core';
import type { Scene } from '../../models/scene';

@Component({
  selector: 'app-scene-summary',
  templateUrl: './scene-summary.component.html',
  styleUrls: ['./scene-summary.component.scss']
})
export class SceneSummaryComponent implements OnInit {
  @Input() scene: Scene;

  constructor() {}

  ngOnInit(): void {}
}
