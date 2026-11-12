import { PlainTextPipe } from './plain-text.pipe';

describe('PlainTextPipe', () => {
  it('strips Markdown', () => {
    expect(new PlainTextPipe().transform('**a** [b](https://e.com)')).toBe('a b');
  });
});
