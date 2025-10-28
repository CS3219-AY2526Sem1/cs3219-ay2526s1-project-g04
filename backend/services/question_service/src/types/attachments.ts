// src/types/attachments.ts

export type AttachmentInput = {
  object_key: string; // e.g. "staging/u123/01JC.../20251010/abc.png" OR "questions/two-sum/20251010/xyz.png"
  mime: string; // e.g. "image/png"
  alt?: string; // short description for <img alt=...>
};
