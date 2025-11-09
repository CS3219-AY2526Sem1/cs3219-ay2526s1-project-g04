import * as Types from '@/lib/question-service';
import { fetchWithAuth } from '@/lib/utils/apiClient';

const QUESTION_SERVICE_URL = process.env.NEXT_PUBLIC_API_QUESTION_SERVICE!;
// const QUESTION_SERVICE_URL = 'http://localhost:3001';

/** ========================================================================
 * ADMIN
 * =========================================================================
 */

/**
 * POST /admin/topics
 * create a new topic (with display name) and get back the slug from the response
 */
export async function postAdminTopics(
  data: Types.postTopicRequest,
): Promise<Types.ApiResponse<Types.Topic>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/topics`;

    const res = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage =
        (resData as Types.errorResponse).message ??
        `Request failed with status ${res.status} ${res.statusText}`;
      return {
        success: false,
        message: errorMessage,
      };
    }

    return {
      success: true,
      data: resData as Types.postTopicResponse,
      message: res.statusText,
    };
  } catch (error) {
    console.error(`Error posting to /admin/topics: ${error}`);
    return {
      success: false,
      message: 'Server-side or an unexpected error occured.',
    };
  }
}

/**
 * POST /admin/attachments/sign-upload
 * Get a presigned PUT URL for direct S3 upload
 */
export async function postAdminAttachmentsSignUpload(
  data: Types.postAttachmentSignUploadRequest,
): Promise<Types.ApiResponse<Types.postAttachmentSignUploadResponse>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/attachments/sign-upload`;

    const res = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    const resData =
      (await res.json()) as Types.postAttachmentSignUploadResponse;
    return {
      success: true,
      data: resData,
    };
  } catch (error) {
    console.error(`Error posting to /admin/attachments/sign-upload: ${error}`);
    return {
      success: false,
      message: 'Server-side or an unexpected error occurred.',
    };
  }
}

/**
 * POST /admin/attachments/sign-view
 * Get a short-lived view URL for an object key
 */
export async function postAdminAttachmentsSignView(
  data: Types.postAttachmentSignViewRequest,
): Promise<Types.ApiResponse<Types.postAttachmentSignViewResponse>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/attachments/sign-view`;

    const res = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    const resData = (await res.json()) as Types.postAttachmentSignViewResponse;
    return {
      success: true,
      data: resData,
    };
  } catch (error) {
    console.error(`Error posting to /admin/attachments/sign-view: ${error}`);
    return {
      success: false,
      message: 'Server-side or an unexpected error occurred.',
    };
  }
}

/**
 * GET /admin/questions
 * List questions with filters:
 * * page
 * * page_size
 * * difficulty
 * * status
 * * topics
 * * q: full-text search (title/body)
 * * highlight: boolean (Include short snippet highlighting matches (only applies if q is provided)
 */
export async function getAdminQuestions(
  params: Types.getAdminQuestionsRequestParams,
): Promise<Types.ApiResponse<Types.getQuestionsResponse>> {
  try {
    const url = new URL(`${QUESTION_SERVICE_URL}/admin/questions`);

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'topics' && value === 'All Topics') return;
      url.searchParams.set(key, String(value));
    });

    const res = await fetchWithAuth(url.toString(), {
      method: 'GET',
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    return {
      success: true,
      data: (await res.json()) as Types.getQuestionsResponse,
    };
  } catch (error) {
    console.error(`Error getting from /admin/questions: ${error}`);
    return {
      success: false,
      message: 'Server-side or an unexpected error occurred.',
    };
  }
}

/**
 * POST /admin/questions
 * Create a new draft question
 */
export async function postAdminQuestions(
  data: Types.postAdminQuestionsRequest,
): Promise<Types.ApiResponse<Types.Question>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/questions`;

    const res = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage =
        (resData as Types.errorResponse)?.message ??
        `Request failed with status ${res.status} ${res.statusText}`;
      return {
        success: false,
        message: errorMessage,
      };
    }

    return {
      success: true,
      data: resData as Types.Question,
    };
  } catch (error) {
    console.error(`Error posting to /admin/questions: ${error}`);
    return {
      success: false,
      message: 'Server-side or an unexpected error occurred.',
    };
  }
}

/**
 * GET /admin/questions/{id}
 * Get full question (draft/published/archived)
 */
export async function getAdminQuestionById(
  id: string,
): Promise<Types.ApiResponse<Types.Question>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}`;

    const res = await fetchWithAuth(url);

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage =
        (resData as Types.errorResponse)?.message ??
        `Request failed with status ${res.status} ${res.statusText}`;
      return {
        success: false,
        message: errorMessage,
      };
    }

    return {
      success: true,
      data: resData as Types.Question,
    };
  } catch (error) {
    console.error(`Error getting from /admin/questions/{id}: ${error}`);
    return {
      success: false,
      message: 'Server-side or an unexpected error occurred.',
    };
  }
}

/**
 * PATCH /admin/questions/{id}
 * Update an existing question (any status)
 */
export async function patchAdminQuestions(
  id: string,
  data: Partial<Types.postAdminQuestionsRequest>,
): Promise<Types.ApiResponse<Types.Question>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}`;

    const res = await fetchWithAuth(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage =
        (resData as Types.errorResponse)?.message ??
        `Request failed with status ${res.status} ${res.statusText}`;
      return {
        success: false,
        message: errorMessage,
      };
    }

    return {
      success: true,
      data: resData as Types.Question,
    };
  } catch (error) {
    console.error(`Error patching /admin/questions/${id}:`, error);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/**
 * DELETE /admin/questions/{id}
 * Archive a published question
 */
export async function deleteAdminQuestions(
  id: string,
): Promise<Types.ApiResponse<Types.Question>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}`;

    const res = await fetchWithAuth(url, {
      method: 'DELETE',
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    return {
      success: true,
      data: (await res.json()) as Types.Question,
    };
  } catch (error) {
    console.error(`Error deleting /admin/questions/${id}:`, error);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/**
 * POST /admin/questions/{id}/publish
 * Publish the current head
 */
export async function postAdminQuestionsPublish(
  id: string,
): Promise<Types.ApiResponse<Types.Question>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}/publish`;

    const res = await fetchWithAuth(url, {
      method: 'POST',
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    return {
      success: true,
      data: (await res.json()) as Types.Question,
    };
  } catch (error) {
    console.error(`Error posting to /admin/questions/${id}/publish:`, error);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/**
 * GET /admin/questions/{id}/resources
 * Get full execution resources for a question (any status)
 */
export async function getAdminQuestionsResources(
  id: string,
): Promise<Types.ApiResponse<Types.getAdminQuestionResourcesResponse>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}/resources`;

    const res = await fetchWithAuth(url);
    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage =
        (resData as Types.errorResponse)?.message ??
        `Request failed with status ${res.status} ${res.statusText}`;
      return {
        success: false,
        message: errorMessage,
      };
    }

    return {
      success: true,
      data: resData as Types.getAdminQuestionResourcesResponse,
    };
  } catch (error) {
    console.error(
      `Error getting from /admin/questions/${id}/resources: ${error}`,
    );
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/** =============================================================
 * NON-ADMIN
 * ==============================================================
 */

/**
 * GET /topics
 * List all known topic tags
 */
export async function getTopics(): Promise<
  Types.ApiResponse<Types.getTopicsResponse>
> {
  try {
    const url = `${QUESTION_SERVICE_URL}/topics`;

    const res = await fetchWithAuth(url);

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    return {
      success: true,
      data: (await res.json()) as Types.getTopicsResponse,
    };
  } catch (error) {
    console.error(`Error getting from /topics: ${error}`);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/**
 * GET /questions/topics
 * List topics that appear in published questions
 */
export async function getTopicsByDifficulty(
  difficulty: string,
): Promise<Types.ApiResponse<Types.getTopicsResponse>> {
  try {
    const url = new URL(`${QUESTION_SERVICE_URL}/questions/topics`);

    if (difficulty) {
      url.searchParams.set('difficulty', difficulty);
    }

    const res = await fetchWithAuth(url.toString(), {
      method: 'GET',
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    return {
      success: true,
      data: (await res.json()) as Types.getTopicsResponse,
    };
  } catch (error) {
    console.error(`Error getting from /questions/topics: ${error}`);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/**
 * GET /questions (with filters)
 * List published questions
 */
export async function getQuestions(
  params: Types.getQuestionsRequestParams,
): Promise<Types.ApiResponse<Types.getQuestionsResponse>> {
  try {
    const url = new URL(`${QUESTION_SERVICE_URL}/questions`);

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'topics' && value === 'All Topics') return;
      url.searchParams.set(key, String(value));
    });

    const res = await fetchWithAuth(url.toString(), {
      method: 'GET',
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Request failed with status ${res.status} ${res.statusText}`,
      };
    }

    return {
      success: true,
      data: (await res.json()) as Types.getQuestionsResponse,
    };
  } catch (error) {
    console.error(`Error getting from /questions: ${error}`);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/**
 * GET /questions/{id}
 * Get a published question by ID
 */
export async function getQuestionById(
  id: string,
): Promise<Types.ApiResponse<Types.Question>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/questions/${id}`;
    const res = await fetchWithAuth(url);

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        (resData as Types.errorResponse)?.message ??
        `Request failed with status ${res.status} ${res.statusText}`;
      return {
        success: false,
        message: message,
      };
    }

    return {
      success: true,
      data: resData as Types.Question,
    };
  } catch (error) {
    console.error('Error fetching /questions/{id}:', error);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}

/**
 * GET /questions/{id}/resources
 * Get execution resources for a published question
 */
export async function getQuestionsResources(
  id: string,
): Promise<Types.ApiResponse<Types.getQuestionResourcesResponse>> {
  try {
    const url = `${QUESTION_SERVICE_URL}/questions/${id}/resources`;

    const res = await fetchWithAuth(url);

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        (resData as Types.errorResponse)?.message ??
        `Request failed with status ${res.status} ${res.statusText}`;
      return {
        success: false,
        message: message,
      };
    }

    return {
      success: true,
      data: resData as Types.getQuestionResourcesResponse,
    };
  } catch (error) {
    console.error(`Error fetching /questions/${id}/resources: ${error}`);
    return {
      success: false,
      message: 'Server-side or unexpected error occurred.',
    };
  }
}
