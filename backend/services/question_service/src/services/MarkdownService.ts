// src/services/MarkdownService

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { signViewUrl } from './AttachmentService.js';

export type AttachmentLike = {
  object_key: string;
  mime: string;
  alt?: string | null;
};

/**
 * Replaces & with &amp; and " with &quot; in the given string.
 * @param {string} v - the string to escape.
 * @returns {string} the escaped string.
 */
function escapeAttr(v: string) {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Returns the last part of a path-like string.
 * @example
 * baseName('a/b/c') // 'c'
 * baseName('a') // 'a'
 */
function baseName(key: string) {
  const p = key.split('/');
  return p[p.length - 1] || key;
}

/** Legacy helper */
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

export async function renderQuestionMarkdown(
  md: string,
  attachments: AttachmentLike[] = [],
): Promise<string> {
  // presign known attachments and build a lookup
  const signedMap = new Map<string, string>();
  await Promise.all(
    attachments.map(async (a) => {
      const file = baseName(a.object_key);
      const { view_url } = await signViewUrl(a.object_key, {
        asAttachment: false,
        filename: file,
        contentTypeHint: a.mime,
      });

      // match by:
      // 1. exact s3 key in md: (questions/.../file.png)
      // 2. pp:// scheme pointer in md
      // 3. basename only
      signedMap.set(a.object_key, view_url);
      signedMap.set(`pp://${a.object_key}`, view_url);
      signedMap.set(file, view_url);
    }),
  );

  const renderer = new marked.Renderer();
  marked.setOptions({
    gfm: true,
    breaks: false,
    renderer,
  });

  /**
   * A callback function to render an image from markdown.
   * @param {string} href - The original href attribute of the image.
   * @param {string} title - The original title attribute of the image.
   * @param {string} text - The original alt text of the image.
   * @returns {string} A string containing the rendered HTML image tag.
   */
  renderer.image = (href, title, text) => {
    const raw = String(href ?? '');
    const signed = signedMap.get(raw);

    // if author used pp:// and don't have a matching attachment, drop the image.
    // (prevents leaking internal pointers and avoids broken images.)
    if (!signed && raw.startsWith('pp://')) {
      return '';
    }

    const src = escapeAttr(signed ?? raw);
    const altAttr = `alt="${escapeAttr(String(text ?? ''))}"`;
    const titleAttr = title ? ` title="${escapeAttr(String(title))}"` : '';
    return `<img src="${src}" ${altAttr}${titleAttr}>`;
  };

  const rawHtml = String(marked.parse(md));
  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'h1',
      'h2',
      'code',
      'pre',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title'],
      a: ['href', 'title', 'rel', 'target'],
    },
    // Only http/https/data make it through; any leftover pp:// would have its src stripped.
    allowedSchemes: ['http', 'https', 'data'],
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs['href'] || '';
        const safe = { ...attribs };
        safe['rel'] = 'noopener noreferrer nofollow';
        safe['target'] = '_blank';
        if (!/^https?:\/\//i.test(href)) delete safe['href'];
        return { tagName, attribs: safe };
      },
    },
    enforceHtmlBoundary: true,
  });
}
