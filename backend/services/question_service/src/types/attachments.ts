// src/types/attachments.ts

export type AttachmentInput = {
  filename: string;
  object_key: string; // e.g. "staging/u123/01JC.../20251010/abc.png" OR "questions/two-sum/20251010/xyz.png"
  mime: string; // e.g. "image/png"
  alt?: string; // short description for <img alt=...>
  byte_size?: number | null; // optional, display-only
  width?: number | null;
  height?: number | null;
};
