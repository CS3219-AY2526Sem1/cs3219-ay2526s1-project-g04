export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      data?: T;
      message: string;
    };

export interface errorResponse {
  error: string;
  message: string;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Status = 'draft' | 'published' | 'archived';

export type TestCaseVisibility = 'sample' | 'hidden';

export type Topic = {
  slug: string;
  display: string;
  color_hex: string;
};

export type Attachment = {
  filename: string;
  object_key: string;
  mime: string;
  alt?: string;
  byte_size?: number;
  width?: number;
  height?: number;
};

export type Question = {
  id: string;
  title: string;
  body_md: string;
  difficulty: Difficulty;
  topics: Topic[];
  attachments: Attachment[];
  status: Status;
  version: number;
  created_at: string;
  updated_at: string;
  body_html?: string;
  starter_code?: string;
  test_cases?: TestCase[];
  snippet?: string;
};

export type TestCase = {
  name?: string;
  visibility: TestCaseVisibility;
  input_data: string;
  expected_output: string;
  ordinal?: number;
};

export interface postTopicRequest {
  display: string;
  color_hex: string;
}

export interface postTopicResponse {
  slug: string;
  display: string;
  color_hex: string;
}

export interface postAttachmentSignUploadRequest {
  content_type: string;
  filename: string;
  suggested_prefix?: string;
}

export interface postAttachmentSignUploadResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  max_bytes: number;
}

export interface postAttachmentSignViewRequest {
  object_key: string;
  as_attachment: boolean;
  filename: string;
  content_type_hint: string;
}

export interface postAttachmentSignViewResponse {
  object_key: string;
  view_url: string;
  expires_at: string;
}

export interface getAdminQuestionsRequestParams {
  page?: number;
  page_size?: number;
  difficulty?: string;
  status?: string;
  topics?: string;
  q?: string;
  highlight?: boolean;
}

export interface getQuestionsResponse {
  page: number;
  page_size: number;
  total: number;
  items: Question[];
}

export interface postAdminQuestionsRequest {
  title: string;
  body_md: string;
  difficulty: Difficulty;
  topics: string[];
  attachments?: Attachment[];
  starter_code?: string;
  test_cases?: TestCase[];
}

export interface getAdminQuestionResourcesResponse {
  question_id: string;
  status: Status;
  starter_code?: string;
  test_cases?: TestCase[];
}

export interface getTopicsResponse {
  total: number;
  items: Topic[];
}

export interface getQuestionsRequestParams {
  page?: number;
  page_size?: number;
  difficulty?: string;
  topics?: string;
  q?: string;
  highlight?: boolean;
}

export interface getQuestionResourcesResponse {
  question_id: string;
  starter_code?: string;
  test_cases?: TestCase[];
  updated_at: string;
}

// helper type guard
export function isValidS3SignResponse(
  obj: unknown,
): obj is postAttachmentSignUploadResponse {
  if (typeof obj !== 'object' || obj === null) return false;

  const o = obj as Record<string, unknown>;

  return (
    typeof o.object_key === 'string' &&
    typeof o.upload_url === 'string' &&
    typeof o.expires_at === 'string' &&
    typeof o.max_bytes === 'number'
  );
}
