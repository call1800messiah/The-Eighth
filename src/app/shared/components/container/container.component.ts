import { Component, Input, OnInit } from '@angular/core';
import { ContainerWidth } from '../../types/container-width';



@Component({
  selector: 'app-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
  standalone: false
})
export class ContainerComponent implements OnInit {
  @Input() width?: ContainerWidth;

  constructor() { }

  ngOnInit(): void {
  }

}
