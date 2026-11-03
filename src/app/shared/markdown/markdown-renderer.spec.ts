import { MentionResolver, renderMarkdown } from './markdown-renderer';

const ID = '0b6f1a52-4c1e-4c3a-9a61-2f0f7d3c5e11';
const MENTION = `[Alrik](mention:person/${ID})`;

function dom(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('renderMarkdown', () => {
  it('renders nothing for empty text', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(null)).toBe('');
  });

  it('keeps single line breaks of plain text', () => {
    const html = renderMarkdown('eins\nzwei');
    expect(dom(html).querySelectorAll('br').length).toBe(1);
  });

  it('renders formatting', () => {
    const el = dom(renderMarkdown('**fett** *kursiv*\n\n- a\n- b'));
    expect(el.querySelector('strong').textContent).toBe('fett');
    expect(el.querySelector('em').textContent).toBe('kursiv');
    expect(el.querySelectorAll('li').length).toBe(2);
  });

  it('shows tag-like text as text and runs no markup or script', () => {
    const el = dom(renderMarkdown('Hallo <Alrik> <img src=x onerror="alert(1)"> <script>alert(1)</script>'));
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toContain('<Alrik>');
  });

  it('drops javascript: links', () => {
    const link = dom(renderMarkdown('[x](javascript:alert(1))')).querySelector('a');
    expect(link?.getAttribute('href') ?? null).not.toMatch(/javascript/i);
  });

  it('opens ordinary links in a new tab', () => {
    const link = dom(renderMarkdown('[Wiki](https://example.com)')).querySelector('a');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not load remote images', () => {
    const el = dom(renderMarkdown('![Karte](https://example.com/map.png)'));
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('Karte');
  });

  it('links a visible mention with the current name', () => {
    const resolve: MentionResolver = () => ({ state: 'visible', name: 'Alrik von Gareth' });
    const link = dom(renderMarkdown(`Mit ${MENTION}.`, resolve)).querySelector('a.mention');
    expect(link.textContent).toBe('Alrik von Gareth');
    expect(link.getAttribute('href')).toBe(`/people/${ID}`);
    expect(link.getAttribute('data-mention-type')).toBe('person');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('shows the stored label without a link for a hidden mention', () => {
    const el = dom(renderMarkdown(MENTION, () => ({ state: 'hidden' })));
    expect(el.querySelector('a')).toBeNull();
    expect(el.querySelector('.mention-hidden').textContent).toBe('Alrik');
  });

  it('strikes through a deleted mention', () => {
    const el = dom(renderMarkdown(MENTION, () => ({ state: 'deleted' })));
    expect(el.querySelector('s.mention-deleted').textContent).toBe('Alrik');
  });

  it('shows unresolved mentions as plain labels', () => {
    const el = dom(renderMarkdown(MENTION));
    expect(el.querySelector('a')).toBeNull();
    expect(el.textContent.trim()).toBe('Alrik');
  });

  it('escapes names', () => {
    const el = dom(renderMarkdown(MENTION, () => ({ state: 'visible', name: '<b>x</b>' })));
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('a.mention').textContent).toBe('<b>x</b>');
  });
});
