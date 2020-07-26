import { Component, ElementRef, Input, OnInit, Renderer2, ViewChild } from '@angular/core';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.scss']
})
export class BarComponent implements OnInit {
  @Input() current: number;
  @Input() type: string;
  @Input() max: number;
  @ViewChild('bar', {static: true}) bar: ElementRef;

  constructor(
    private renderer: Renderer2,
  ) { }

  ngOnInit(): void {
    this.renderer.setStyle(
      this.bar.nativeElement,
      'width',
      `${this.current / this.max * 100}%`,
    );
  }
}
