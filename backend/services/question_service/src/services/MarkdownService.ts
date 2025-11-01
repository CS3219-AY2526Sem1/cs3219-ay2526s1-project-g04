// src/services/MarkdownService.ts

import { marked, Renderer, type Tokens } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { signViewUrl } from './AttachmentService.js';

export type AttachmentLike = {
  object_key: string;
  mime: string;
  alt?: string | null;
};

/**
 * Escape attribute values for untrusted URLs/text.
 * - Replaces & with &amp;
 * - Replaces " with &quot;
 */
function escapeAttr(v: string) {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Return last path segment of an S3 key like questions/foo/.../file.png
 */
function baseName(key: string) {
  const p = key.split('/');
  return p[p.length - 1] || key;
}

/**
 * After sanitizeHtml runs, `&` in attribute values gets encoded to `&amp;`.
 * Browsers normally decode that fine for <img>, BUT:
 *
 * - You inspect body_html manually
 * - You click image / open image in new tab using that literal URL
 * - If the URL still has `&amp;`, S3 interprets it wrong and says the auth params are missing.
 *
 * We only want to "un-amp" our own presigned S3 URLs, not arbitrary ones.
 *
 * So: find <img src="https://...amazonaws.com/..."> and replace "&amp;" back to "&"
 * inside that src attribute only.
 */
function decodePresignedAmpersands(html: string): string {
  return html.replace(
    /(<img\b[^>]*\bsrc=")(https:\/\/[^"]+amazonaws\.com\/[^"]*)(")/g,
    (_full, before, url, after) => {
      const fixedUrl = url.replace(/&amp;/g, '&');
      return `${before}${fixedUrl}${after}`;
    },
  );
}

/**
 * Legacy helper for quick debug. This is NOT the strict production path.
 */
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

/**
 * Main renderer: converts question markdown to sanitized HTML ready for clients.
 *
 * - Supports `pp://...` and bare object keys by mapping them to presigned S3 URLs.
 * - Generates <img> tags using those presigned URLs.
 * - Escapes untrusted stuff to block XSS.
 * - Runs sanitizeHtml() to enforce an allowlist.
 * - Then post-fixes the presigned S3 URLs so they contain real "&" instead of "&amp;".
 *
 * Returns HTML that you can safely embed as `dangerouslySetInnerHTML` on the frontend.
 */
export async function renderQuestionMarkdown(
  md: string,
  attachments: AttachmentLike[] = [],
): Promise<string> {
  // 1. Build map from possible markdown refs → presigned URL
  const signedMap = new Map<string, string>();

  await Promise.all(
    attachments.map(async (a) => {
      const file = baseName(a.object_key);

      const { view_url } = await signViewUrl(a.object_key, {
        asAttachment: false,
        filename: file,
        contentTypeHint: a.mime,
      });

      // Try multiple lookup keys so author can reference:
      // - exact key: "questions/slug/.../file.png"
      // - pp://questions/slug/.../file.png
      // - just "file.png"
      signedMap.set(a.object_key, view_url);
      signedMap.set(`pp://${a.object_key}`, view_url);
      signedMap.set(file, view_url);
    }),
  );

  // 2. Custom marked renderer to control <img> output
  const renderer = new Renderer();
  marked.setOptions({
    gfm: true,
    breaks: false,
    renderer,
  });

  renderer.image = ({
    href,
    title,
    text,
  }: Tokens.Image & {
    href?: string | null;
    title?: string | null;
    text?: string | null;
  }) => {
    const raw = String(href ?? '');
    const presigned = signedMap.get(raw);

    // If they wrote pp://blah but we couldn't resolve a presigned URL,
    // hide it instead of leaking internal pointer or emitting broken img.
    if (!presigned && raw.startsWith('pp://')) {
      return '';
    }

    // Decide final URL for the <img src="...">
    const finalUrl = presigned ?? raw;

    // Check if it's OUR presigned S3 URL
    const isPresignedS3 =
      typeof finalUrl === 'string' &&
      /^https:\/\/[^"']+amazonaws\.com\//.test(finalUrl);

    // Build safe src attribute:
    // - If it's presigned S3, keep '&' literally, only escape quotes.
    //   (because we WANT the raw '&' in body_html)
    // - If it's anything else (maybe untrusted external URL), escape & and "
    const safeSrc = isPresignedS3
      ? finalUrl.replace(/"/g, '&quot;')
      : escapeAttr(finalUrl);

    const altStr = String(text ?? '');
    const titleStr = title ? String(title) : '';

    const altAttr = `alt="${escapeAttr(altStr)}"`;
    const titleAttr = titleStr ? ` title="${escapeAttr(titleStr)}"` : '';

    return `<img src="${safeSrc}" ${altAttr}${titleAttr}>`;
  };

  // 3. Markdown -> HTML string
  const markedHtml = String(marked.parse(md));

  // 4. Sanitize that HTML so only allowed tags/attrs survive
  const cleanHtml = sanitizeHtml(markedHtml, {
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
    // Allowed schemes to avoid javascript: URLs
    allowedSchemes: ['http', 'https', 'data'],
    transformTags: {
      a: (tagName, attribs) => {
        // Force safe rel/target on links, and drop href if not http(s)
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

  // 5. sanitizeHtml will happily rewrite '&' to '&amp;' in src="...".
  //    That breaks copy/paste and in some debug contexts it even breaks loading.
  //    So we surgically unescape ONLY our presigned S3 image URLs.
  const finalHtml = decodePresignedAmpersands(cleanHtml);

  return finalHtml;
}
