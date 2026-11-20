import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageFallbackDirective } from './image-fallback.directive';

@Component({
  template: `<img appImageFallback [src]="src" alt="">`,
  standalone: false,
})
class HostComponent {
  src = 'https://host/storage/v1/render/image/public/tde5/people/p1/a.png?width=400&resize=contain&quality=80';
}

describe('ImageFallbackDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let img: HTMLImageElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HostComponent, ImageFallbackDirective],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    img = fixture.nativeElement.querySelector('img');
  });

  it('swaps a failed render URL for the stored original', () => {
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe('https://host/storage/v1/object/public/tde5/people/p1/a.png');
  });

  it('does not loop when the original fails too', () => {
    img.dispatchEvent(new Event('error'));
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe('https://host/storage/v1/object/public/tde5/people/p1/a.png');
  });

  it('falls back again when the binding gives it a new image', () => {
    img.dispatchEvent(new Event('error'));
    fixture.componentInstance.src = 'https://host/storage/v1/render/image/public/tde5/people/p1/b.png?width=400';
    fixture.detectChanges();
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe('https://host/storage/v1/object/public/tde5/people/p1/b.png');
  });

  it('leaves an image that is not a render URL alone', () => {
    img.src = 'https://host/storage/v1/object/public/tde5/a.png';
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe('https://host/storage/v1/object/public/tde5/a.png');
  });
});
