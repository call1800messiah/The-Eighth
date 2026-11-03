import { Pipe, PipeTransform } from '@angular/core';

import { markdownToPlainText } from '../markdown/mentions';

/** Markdown as plain text, for previews where links and formatting do not fit. */
@Pipe({
  name: 'plainText',
  standalone: false,
})
export class PlainTextPipe implements PipeTransform {
  transform(markdown: string | null | undefined): string {
    return markdownToPlainText(markdown);
  }
}
