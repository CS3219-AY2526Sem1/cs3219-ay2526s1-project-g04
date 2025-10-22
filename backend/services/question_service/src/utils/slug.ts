// src/utils/slug.ts

export function slugify(title: string) {
  return (
    title
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  );
}
