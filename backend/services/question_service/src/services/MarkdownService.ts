// src/services/MarkdownService

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export function toSafeHtml(md: string) {
  const raw = marked.parse(md) as string;
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'h1',
      'h2',
      'code',
      'pre',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt'],
    },
  });
}
