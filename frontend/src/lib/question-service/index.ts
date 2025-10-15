export interface Topic {
  slug: string;
  color_hex: string;
}

export interface TopicList {
  page: number;
  page_size: number;
  total: number;
  items: Topic[];
}

export interface Attachment {
  object_key: string;
  mime: string;
  filename: string;
}

export interface Question {
  id: string;
  title: string;
  body_md: string;
  body_html?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: Topic[];
  attachments: Attachment[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  created_at: string;
  updated_at: string;
  snippet: string;
}

export interface PaginatedQuestions {
  page: number;
  page_size: number;
  total: number;
  items: Question[];
}

export interface AttachmentUploadPayload {
  content_type: string;
  filename: string;
  suggested_prefix?: string;
}

export interface AttachmentUploadSignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  max_bytes: number;
}

// helper type guard
export function isValidS3SignResponse(obj: unknown): obj is AttachmentUploadSignResponse {
  if (
    typeof obj !== 'object' ||
    obj === null
  ) return false;

  const o = obj as Record<string, unknown>;

  return (
    typeof o.object_key === 'string' &&
    typeof o.upload_url === 'string' &&
    typeof o.expires_at === 'string' &&
    typeof o.max_bytes === 'number'
  );
}
