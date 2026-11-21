import type { AnyExtension, MarkdownToken } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import HardBreak from '@tiptap/extension-hard-break';
import Mention, { MentionOptions } from '@tiptap/extension-mention';
import { Markdown } from '@tiptap/markdown';
import { Marked, marked as globalMarked } from 'marked';

import { MENTION_LINK_START, MentionEntityType, formatMention, unescapeMentionLabel } from './mentions';

/**
 * A mention as an inline node that reads and writes the
 * `[Label](mention:type/uuid)` link syntax. It has its own tokenizer, which
 * marked runs before the built-in link one, so ordinary links stay links.
 */
export const MarkdownMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      entityType: {
        default: 'person',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-mention-type'),
        renderHTML: (attributes: { entityType: string }) => ({ 'data-mention-type': attributes.entityType }),
      },
    };
  },

  markdownTokenName: 'mention',

  markdownTokenizer: {
    name: 'mention',
    level: 'inline',
    start: (src: string) => {
      const index = src.indexOf('](mention:');
      return index < 0 ? -1 : src.lastIndexOf('[', index);
    },
    tokenize: (src: string) => {
      const match = MENTION_LINK_START.exec(src);
      if (!match) {
        return undefined;
      }
      return {
        type: 'mention',
        raw: match[0],
        label: unescapeMentionLabel(match[1]),
        entityType: match[2],
        entityId: match[3].toLowerCase(),
      };
    },
  },

  parseMarkdown: (token: MarkdownToken, helpers) => helpers.createNode('mention', {
    id: token['entityId'],
    label: token['label'],
    entityType: token['entityType'],
  }),

  renderMarkdown: (node) => formatMention({
    entityType: node.attrs?.['entityType'] as MentionEntityType,
    entityId: node.attrs?.['id'] ?? '',
    label: node.attrs?.['label'] ?? '',
  }),
});


/**
 * Stored text keeps single line breaks as plain newlines, which is what the
 * texts written before the editor contain. The renderer treats them as line
 * breaks (`breaks: true`), so no trailing-space syntax is needed.
 */
const PlainHardBreak = HardBreak.extend({
  renderMarkdown: () => '\n',
});


export function createEditorExtensions(suggestion?: Partial<MentionOptions['suggestion']>): AnyExtension[] {
  return [
    StarterKit.configure({
      hardBreak: false,
      heading: { levels: [1, 2, 3] },
      link: {
        autolink: true,
        openOnClick: false,
        protocols: [],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      },
      // No Markdown for underline; the stored text would lose it.
      underline: false,
    }),
    PlainHardBreak,
    MarkdownMention.configure({
      HTMLAttributes: { class: 'mention' },
      renderText: ({ node }) => node.attrs['label'] ?? '',
      renderHTML: ({ options, node }) => ['span', options.HTMLAttributes, node.attrs['label'] ?? ''],
      suggestion: { char: '@', ...suggestion },
    }),
    Markdown.configure({
      // A private instance: the extension registers its tokenizers on
      // whatever instance it gets, and every editor would add them again to
      // the global one.
      marked: new Marked() as unknown as typeof globalMarked,
      markedOptions: { breaks: true, gfm: true },
    }),
  ];
}
