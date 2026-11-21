import { ChangeDetectionStrategy, Component, HostListener, Input, OnChanges, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription, concat, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { MentionService } from '../../../core/services/mention.service';
import { renderMarkdown } from '../../markdown/markdown-renderer';
import { extractMentions } from '../../markdown/mentions';

/**
 * Displays a stored Markdown text: sanitized HTML, with each mention shown
 * as the viewer may see it (current name as a link, the stored label as plain
 * text, or struck through when deleted).
 */
@Component({
  selector: 'app-markdown',
  template: '<div class="markdown" [innerHTML]="html"></div>',
  styleUrls: ['./markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  // The HTML is inserted at runtime, so encapsulated styles would not reach it.
  // Every rule in the stylesheet is scoped to app-markdown instead.
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class MarkdownComponent implements OnChanges, OnDestroy {
  private mentions = inject(MentionService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  @Input() text: string | null | undefined;
  html: SafeHtml = '';

  private text$ = new BehaviorSubject<string>('');
  private subscription: Subscription;

  constructor() {
    this.subscription = this.text$.pipe(
      distinctUntilChanged(),
      switchMap(text => {
        const refs = extractMentions(text);
        const plain$ = of(renderMarkdown(text));
        if (refs.length === 0) {
          return plain$;
        }
        return concat(plain$, this.mentions.resolve(refs).pipe(map(resolve => renderMarkdown(text, resolve))));
      }),
    ).subscribe(html => {
      // Already sanitized by DOMPurify in renderMarkdown(); Angular's own
      // sanitizer would strip the data attributes mentions rely on.
      this.html = this.sanitizer.bypassSecurityTrustHtml(html);
    });
  }

  ngOnChanges() {
    this.text$.next(this.text ?? '');
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  /**
   * Links inside a text must not trigger the click handler of whatever the
   * text sits in (info boxes open their editor on click). Mention links
   * navigate inside the app instead of reloading it.
   */
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const link = (event.target as HTMLElement | null)?.closest?.('a');
    if (!link) {
      return;
    }
    event.stopPropagation();
    const isMention = link.hasAttribute('data-mention-type');
    const plainClick = event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
    if (isMention && plainClick) {
      event.preventDefault();
      this.router.navigateByUrl(link.getAttribute('href'));
    }
  }
}
