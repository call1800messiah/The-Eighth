import { Marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';

import { MENTION_LINK_START, MentionEntityType, mentionUrl, unescapeMentionLabel } from './mentions';

/**
 * How a mention is shown to the current viewer:
 * - `visible`: they can see the target; link with its current name
 * - `hidden`:  the target exists but is not theirs to see; the stored label as plain text
 * - `deleted`: the target is gone; the stored label, struck through
 * - `pending`: not known yet; shown like `hidden` so nothing flashes as a link
 */
export type MentionResolution =
  | { state: 'visible'; name: string }
  | { state: 'hidden' }
  | { state: 'deleted' }
  | { state: 'pending' };

export type MentionResolver = (entityType: MentionEntityType, entityId: string) => MentionResolution;

interface MentionToken {
  type: 'mention';
  raw: string;
  entityType: MentionEntityType;
  entityId: string;
  label: string;
}

const INLINE_TAG = /^<\/?(em|strong|s|del|code)>$/i;

const pendingResolver: MentionResolver = () => ({ state: 'pending' });
let activeResolver: MentionResolver = pendingResolver;


export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


function renderMention(token: MentionToken): string {
  const resolution = activeResolver(token.entityType, token.entityId);
  const label = escapeHtml(token.label);
  const data = `data-mention-type="${token.entityType}" data-mention-id="${token.entityId}"`;
  switch (resolution.state) {
    case 'visible':
      return `<a class="mention" href="${escapeHtml(mentionUrl(token.entityType, token.entityId))}" ${data}>${escapeHtml(resolution.name)}</a>`;
    case 'deleted':
      return `<s class="mention mention-deleted" title="Gelöscht">${label}</s>`;
    default:
      return `<span class="mention mention-hidden">${label}</span>`;
  }
}


/**
 * One parser for everything the app displays. Existing texts were written as
 * plain text with single line breaks, so `breaks` keeps those as line breaks.
 * The editor uses the same setting when it reads and writes Markdown.
 */
const marked = new Marked({
  async: false,
  breaks: true,
  gfm: true,
  extensions: [{
    name: 'mention',
    level: 'inline',
    start: (src: string) => {
      const index = src.indexOf('](mention:');
      return index < 0 ? undefined : src.lastIndexOf('[', index);
    },
    tokenizer: (src: string): MentionToken | undefined => {
      const match = MENTION_LINK_START.exec(src);
      if (!match) {
        return undefined;
      }
      return {
        type: 'mention',
        raw: match[0],
        label: unescapeMentionLabel(match[1]),
        entityType: match[2] as MentionEntityType,
        entityId: match[3].toLowerCase(),
      };
    },
    renderer: (token) => renderMention(token as unknown as MentionToken),
  }],
  renderer: {
    // Text that looks like a tag ("<Name>") is text here, not markup. The
    // editor's serializer falls back to these few inline tags when Markdown
    // delimiters cannot express overlapping bold/italic, so they pass.
    html: (token: Tokens.HTML | Tokens.Tag) =>
      INLINE_TAG.test(token.text) ? token.text.toLowerCase() : escapeHtml(token.text),
    // No remote images: they would load from wherever the author pointed them.
    image: (token: Tokens.Image) => escapeHtml(token.text),
  },
});


const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'a', 'p', 'br', 'strong', 'em', 's', 'del', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'span',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input',
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'data-mention-type', 'data-mention-id', 'type', 'checked', 'disabled', 'start'],
};

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) {
    return;
  }
  hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && !node.hasAttribute('data-mention-type')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}


/**
 * Markdown to sanitized HTML. `resolve` decides how each mention appears for
 * the current viewer; see {@link MentionResolution}.
 */
export function renderMarkdown(markdown: string | null | undefined, resolve: MentionResolver = pendingResolver): string {
  if (!markdown) {
    return '';
  }
  installHooks();
  activeResolver = resolve;
  try {
    const html = marked.parse(markdown) as string;
    return DOMPurify.sanitize(html, { ...PURIFY_CONFIG, ADD_ATTR: ['target', 'rel'] }) as string;
  } finally {
    activeResolver = pendingResolver;
  }
}
