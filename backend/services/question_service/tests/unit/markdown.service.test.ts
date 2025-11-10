import { jest, describe, it, expect } from '@jest/globals';

await jest.unstable_mockModule(
  '../../src/services/AttachmentService.js',
  () => ({
    // match your prod signature: returns { view_url }
    signViewUrl: async (key: string) => ({
      view_url: `https://signed.example/${key}?ttl=900`,
    }),
  }),
);

const { toSafeHtml, renderQuestionMarkdown } = await import(
  '../../src/services/MarkdownService.js'
);

describe('MarkdownService', () => {
  it('toSafeHtml sanitizes <script> and preserves expected tags', () => {
    const html = toSafeHtml('# T\n\n**b** <script>alert(1)</script>');
    expect(html).toContain('<h1>T</h1>');
    expect(html).toContain('<strong>b</strong>');
    expect(html).not.toContain('<script>');
  });

  it('toSafeHtml strips non-http(s) image src (pp://)', () => {
    const html = toSafeHtml('![alt](pp://questions/reverse-string/diag.png)');
    expect(html).toContain('<img alt="alt"');
    expect(html).not.toContain('pp://');
    expect(html).not.toContain('src=');
  });

  it('renderQuestionMarkdown rewrites pp:// image links to signed URLs', async () => {
    const md = '![alt](pp://questions/reverse-string/diag.png)';
    const attachments = [
      {
        object_key: 'questions/reverse-string/diag.png',
        mime: 'image/png',
        alt: 'diagram',
      },
    ];

    const html = await renderQuestionMarkdown(md, attachments);

    expect(html).toContain(
      'https://signed.example/questions/reverse-string/diag.png?ttl=900',
    );
    expect(html).toContain('<img');
    expect(html).toContain('alt="alt"');
  });
});
