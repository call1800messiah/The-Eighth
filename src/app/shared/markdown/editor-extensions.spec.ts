import { Editor } from '@tiptap/core';

import { createEditorExtensions } from './editor-extensions';

const PERSON = '0b6f1a52-4c1e-4c3a-9a61-2f0f7d3c5e11';
const PLACE = '7d1c2e3f-1111-4aaa-8bbb-123456789abc';

describe('editor extensions (Markdown round-trip)', () => {
  let editor: Editor;

  const json = (): any => editor.getJSON();

  function load(markdown: string): Editor {
    editor?.destroy();
    editor = new Editor({
      element: document.createElement('div'),
      extensions: createEditorExtensions(),
      content: markdown,
      contentType: 'markdown',
    });
    return editor;
  }

  afterEach(() => editor?.destroy());

  it('keeps plain text with single line breaks byte for byte', () => {
    const text = 'Erste Zeile\nZweite Zeile\n\nNeuer Absatz';
    expect(load(text).getMarkdown()).toBe(text);
  });

  it('reads a mention link as a mention node', () => {
    load(`Trifft [Alrik](mention:person/${PERSON}) heute.`);
    const paragraph = json().content[0];
    const mention = paragraph.content.find((node: any) => node.type === 'mention');
    expect(mention.attrs).toEqual(jasmine.objectContaining({
      id: PERSON,
      label: 'Alrik',
      entityType: 'person',
    }));
  });

  it('writes a mention back in the same syntax', () => {
    const text = `Trifft [Alrik](mention:person/${PERSON}) in [Gareth](mention:place/${PLACE}).`;
    expect(load(text).getMarkdown()).toBe(text);
  });

  it('keeps escaped brackets in a mention label', () => {
    const text = `[Alrik \\[der Alte\\]](mention:person/${PERSON})`;
    load(text);
    const mention = json().content[0].content[0];
    expect(mention.attrs['label']).toBe('Alrik [der Alte]');
    expect(editor.getMarkdown()).toBe(text);
  });

  it('leaves ordinary links as links', () => {
    load('Siehe [Wiki](https://example.com/wiki).');
    const marks = json().content[0].content
      .flatMap((node: any) => node.marks ?? [])
      .filter((mark: any) => mark.type === 'link');
    expect(marks.length).toBe(1);
    expect(editor.getMarkdown()).toBe('Siehe [Wiki](https://example.com/wiki).');
  });

  it('round-trips basic formatting', () => {
    const text = '### Titel\n\n**fett** und *kursiv*\n\n- eins\n- zwei';
    expect(load(text).getMarkdown()).toBe(text);
  });

  it('serializes an empty document as an empty string', () => {
    expect(load('').getMarkdown()).toBe('');
  });

  it('inserts a picked mention so it serializes as a link', () => {
    load('Hallo ');
    editor.commands.focus('end');
    editor.commands.insertContent({ type: 'mention', attrs: { id: PERSON, label: 'Alrik', entityType: 'person' } });
    expect(editor.getMarkdown()).toBe(`Hallo [Alrik](mention:person/${PERSON})`);
  });
});
