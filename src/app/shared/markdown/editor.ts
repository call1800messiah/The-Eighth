import { Editor, type EditorOptions } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { exitSuggestion, type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';

import { createEditorExtensions } from './editor-extensions';
import type { MentionTarget } from '../../core/services/mention.service';

/**
 * Everything that pulls in Tiptap/ProseMirror. The editor component loads
 * this module on demand, so the editor only costs bundle size in the forms
 * that use it, not on every page that merely displays a text.
 */

export interface MentionAttrs {
  id: string;
  label: string;
  entityType: string;
}

export interface RichTextEditorConfig {
  element: HTMLElement;
  content: string;
  editable: boolean;
  inputId?: string;
  searchMentions: (query: string) => MentionTarget[];
  onSuggestion: {
    show: (props: SuggestionProps<MentionTarget, MentionAttrs>) => void;
    key: (props: SuggestionKeyDownProps) => boolean;
    hide: () => void;
  };
  onUpdate: EditorOptions['onUpdate'];
  onBlur: EditorOptions['onBlur'];
  onTransaction: EditorOptions['onTransaction'];
}

export interface RichTextEditorHandle {
  editor: Editor;
  closeMentionPicker: () => void;
}


export function createRichTextEditor(config: RichTextEditorConfig): RichTextEditorHandle {
  const pluginKey = new PluginKey('mention-picker');
  const editor = new Editor({
    element: config.element,
    extensions: createEditorExtensions({
      allowSpaces: true,
      pluginKey,
      items: ({ query }) => config.searchMentions(query),
      render: () => ({
        onStart: props => config.onSuggestion.show(props),
        onUpdate: props => config.onSuggestion.show(props),
        onKeyDown: props => config.onSuggestion.key(props),
        onExit: () => config.onSuggestion.hide(),
      }),
    }),
    content: config.content,
    contentType: 'markdown',
    editable: config.editable,
    editorProps: {
      attributes: {
        class: 'rich-text-content',
        ...(config.inputId ? { id: config.inputId } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: config.onUpdate,
    onBlur: config.onBlur,
    onTransaction: config.onTransaction,
  });

  return {
    editor,
    closeMentionPicker: () => exitSuggestion(editor.view, pluginKey),
  };
}
