import {
  extractMentions,
  formatMention,
  markdownToPlainText,
  mentionUrl,
  parseMentionHref,
} from './mentions';

const ID = '0b6f1a52-4c1e-4c3a-9a61-2f0f7d3c5e11';

describe('mentions', () => {
  it('formats a mention as a Markdown link', () => {
    expect(formatMention({ entityType: 'person', entityId: ID, label: 'Alrik' }))
      .toBe(`[Alrik](mention:person/${ID})`);
  });

  it('escapes brackets and folds whitespace in labels', () => {
    expect(formatMention({ entityType: 'place', entityId: ID, label: ' Burg  [alt]\n' }))
      .toBe(`[Burg \\[alt\\]](mention:place/${ID})`);
  });

  it('extracts mentions in order, with unescaped labels and lower-case ids', () => {
    const text = `A [Burg \\[alt\\]](mention:place/${ID.toUpperCase()}) und [Q](mention:quest/${ID}) und [x](https://e.com)`;
    expect(extractMentions(text)).toEqual([
      { entityType: 'place', entityId: ID, label: 'Burg [alt]' },
      { entityType: 'quest', entityId: ID, label: 'Q' },
    ]);
  });

  it('ignores unknown entity types and malformed ids', () => {
    expect(extractMentions(`[a](mention:project/${ID}) [b](mention:person/123)`)).toEqual([]);
  });

  it('parses mention hrefs', () => {
    expect(parseMentionHref(`mention:note/${ID}`)).toEqual({ entityType: 'note', entityId: ID });
    expect(parseMentionHref('https://example.com')).toBeNull();
    expect(parseMentionHref(null)).toBeNull();
  });

  it('links notes to the notes list, everything else to its page', () => {
    expect(mentionUrl('person', ID)).toBe(`/people/${ID}`);
    expect(mentionUrl('place', ID)).toBe(`/places/${ID}`);
    expect(mentionUrl('quest', ID)).toBe(`/quests/${ID}`);
    expect(mentionUrl('note', ID)).toBe(`/notes?note=${ID}`);
  });

  it('reduces Markdown to plain text', () => {
    const text = `### Titel\n**Fett** und *kursiv* mit [Alrik](mention:person/${ID}), [Link](https://e.com) und a\\_b &lt;x&gt;`;
    expect(markdownToPlainText(text)).toBe('Titel\nFett und kursiv mit Alrik, Link und a_b <x>');
    expect(markdownToPlainText(null)).toBe('');
  });
});
