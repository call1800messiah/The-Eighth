import { Directive, ElementRef, HostListener, inject } from '@angular/core';

import { StorageService } from '../../core/services/storage.service';



/**
 * For an `<img>` showing a rendered URL from `StorageService.getImageURL()`:
 * if rendering fails (imgproxy down, source over its resolution limit), load
 * the stored original instead. Swaps once, so a missing original can't loop.
 */
@Directive({
  selector: 'img[appImageFallback]',
  standalone: false
})
export class ImageFallbackDirective {
  private element = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private swapped = false;

  @HostListener('error')
  onError(): void {
    if (this.swapped) {
      return;
    }
    const img = this.element.nativeElement;
    const original = StorageService.originalURL(img.src);
    if (original !== img.src) {
      this.swapped = true;
      img.src = original;
    }
  }
}
