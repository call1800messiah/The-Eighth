import { Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2, ViewChild } from '@angular/core';

import { PopoverService } from '../../../popover/services/popover.service';



@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.scss']
})
export class BarComponent implements OnInit {
  @Input() current: number;
  @Input() type: string;
  @Input() max: number;
  @Output() barClicked = new EventEmitter();
  @ViewChild('bar', {static: true}) bar: ElementRef;

  constructor(
    private popover: PopoverService,
    private renderer: Renderer2,
  ) { }

  ngOnInit(): void {
    this.renderer.setStyle(
      this.bar.nativeElement,
      'width',
      `${this.current / this.max * 100}%`,
    );
  }



  onBarClicked() {
    this.barClicked.emit();
  }
}
