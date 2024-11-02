import { Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2, ViewChild } from '@angular/core';

import type { Bar } from '../../models/bar';



@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.scss']
})
export class BarComponent implements OnInit {
  @Input() bar: Bar;
  @Output() barClicked = new EventEmitter();
  @ViewChild('barElement', {static: true}) barElement: ElementRef;
  @ViewChild('extraBar', {static: true}) extraBar: ElementRef;

  constructor(
    private renderer: Renderer2,
  ) { }

  ngOnInit(): void {
    this.renderer.setStyle(
      this.barElement.nativeElement,
      'width',
      this.bar.current > 0 ? `${this.bar.current / this.bar.max * 100}%` : '0',
    );
    let extra = 0;
    if (this.bar.current > this.bar.max) {
      extra = this.bar.current - this.bar.max;
    } else if (this.bar.current < 0) {
      extra = Math.abs(this.bar.current);
    }
    if (extra) {
      this.renderer.setStyle(
        this.extraBar.nativeElement,
        'width',
        `${extra / this.bar.max * 100}%`,
      );
    }
  }



  onBarClicked() {
    this.barClicked.emit();
  }
}
