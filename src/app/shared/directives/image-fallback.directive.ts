import { Directive, ElementRef, HostListener, inject } from '@angular/core';

import { StorageService } from '../../core/services/storage.service';



/**
 * For an `<img>` showing a rendered URL from `StorageService.getImageURL()`:
 * if rendering fails (imgproxy down, source over its resolution limit), load
 * the stored original instead. Only a render URL is swapped, so a missing
 * original can't loop, and an `<img>` that is given a new image later gets
 * the fallback again.
 */
@Directive({
  selector: 'img[appImageFallback]',
  standalone: false
})
export class ImageFallbackDirective {
  private element = inject<ElementRef<HTMLImageElement>>(ElementRef);

  @HostListener('error')
  onError(): void {
    StorageService.fallBackToOriginal(this.element.nativeElement);
  }
}
