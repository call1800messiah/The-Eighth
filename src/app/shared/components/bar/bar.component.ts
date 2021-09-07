import { Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2, ViewChild } from '@angular/core';

import { PopoverService } from '../../../popover/services/popover.service';
import { Bar } from '../../models/bar';



@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.scss']
})
export class BarComponent implements OnInit {
  @Input() bar: Bar;
  @Output() barClicked = new EventEmitter();
  @ViewChild('barElement', {static: true}) barElement: ElementRef;

  constructor(
    private popover: PopoverService,
    private renderer: Renderer2,
  ) { }

  ngOnInit(): void {
    this.renderer.setStyle(
      this.barElement.nativeElement,
      'width',
      `${this.bar.current / this.bar.max * 100}%`,
    );
  }



  onBarClicked() {
    this.barClicked.emit();
  }
}
