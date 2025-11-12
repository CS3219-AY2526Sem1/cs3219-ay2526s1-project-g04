import {
  GetActiveSessionResponse,
  RawSession,
} from '@/lib/collaboration-service';
import { fetchWithAuth } from '@/lib/utils/apiClient';

/**
 * A utility function to handle API responses and throw errors
 */
async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = `An API error occurred: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Response was not JSON
    }
    throw new Error(errorMessage);
  }

  // Handle successful but empty responses
  const contentType = response.headers.get('content-type');
  if (
    response.status === 204 ||
    !contentType ||
    !contentType.includes('application/json')
  ) {
    return null;
  }

  return response.json();
}

const COLLAB_SERVICE_URL = process.env.NEXT_PUBLIC_API_COLLAB_SERVICE!;

export async function getMySessions(): Promise<RawSession[]> {
  const response = await fetchWithAuth(`${COLLAB_SERVICE_URL}/sessions/me`);
  return handleResponse(response);
}

export async function getMyActiveSession(): Promise<GetActiveSessionResponse> {
  const response = await fetchWithAuth(
    `${COLLAB_SERVICE_URL}/sessions/me/active`,
  );
  return handleResponse(response);
}

export async function getQuestionIdBySessId(
  sessId: string,
): Promise<string | null> {
  try {
    console.log(COLLAB_SERVICE_URL);
    const url = `${COLLAB_SERVICE_URL}/question/${sessId}`;
    console.log(url);
    const res = await fetch(url);

    if (!res.ok) {
      console.log(url);
      throw new Error(
        `Failed to fetch from /question/{id}: ${res.status} ${res.statusText}`,
      );
    }

    const data: Record<string, string> = await res.json();
    return data['question_id'];
  } catch (err) {
    console.error('Error fetching from /question/{id}: ', err);
    return null;
  }
}

export async function terminateSessionIsSuccess(
  sessId: string,
  userId: string,
): Promise<boolean> {
  try {
    const url = `${COLLAB_SERVICE_URL}/sessions/${sessId}/user/${userId}`;
    console.log('Terminate session URL:', url);
    console.log('Making DELETE request...');

    const res = await fetch(url, { method: 'DELETE' });

    console.log('Response status:', res.status);
    console.log('Response ok:', res.ok);

    if (!res.ok) {
      const errorText = await res.text();
      console.log('Error response body:', errorText);
      throw new Error(
        `Failed to terminateSession: ${res.status} ${res.statusText}`,
      );
    }

    console.log('Session terminated successfully');
    return true;
  } catch (err) {
    console.error('terminateSessionIsSuccess error:', err);
    return false;
  }
}

export async function sessionIsReady(
  matchId: string,
): Promise<{ sessionId?: string; created: boolean; ready: boolean }> {
  try {
    const url = `${COLLAB_SERVICE_URL}/sessions/status/matched/${matchId}`;
    console.log('Get session status URL:', url);
    console.log('Making request...');

    const res = await fetch(url);

    console.log('Response status:', res.status);
    console.log('Response ok:', res.ok);

    if (!res.ok) {
      const errorText = await res.text();
      console.log('Error response body:', errorText);
      throw new Error(
        `Failed to get sessions state: ${res.status} ${res.statusText}`,
      );
    }

    const jsonRes = await res.json();

    console.log('Get session state successfully', jsonRes['sessionState']);
    const ready = jsonRes.sessionState === 'active';
    const created = jsonRes.sessionState === 'created';
    return {
      sessionId: jsonRes.sessionId,
      created: created,
      ready: ready,
    };
  } catch (err) {
    console.error('getSessionState error:', err);
    return {
      ready: false,
      created: false,
    };
  }
}

export async function sessionIsAlive(sessId: string): Promise<boolean> {
  try {
    const url = `${COLLAB_SERVICE_URL}/sessions/status/session/${sessId}`;
    console.log('Get session status URL:', url);
    console.log('Making request...');

    const res = await fetch(url);

    console.log('Response status:', res.status);
    console.log('Response ok:', res.ok);

    if (!res.ok) {
      console.log('opopo');
      const errorText = await res.text();
      console.log('Error response body:', errorText);
      throw new Error(
        `Failed to get sessions state: ${res.status} ${res.statusText}`,
      );
    }
    const jsonRes = await res.json();
    console.log('Get session state successfully', jsonRes['sessionState']);
    const ready = jsonRes.sessionState === 'active';
    return ready;
  } catch (err) {
    console.log(2233);
    console.error('getSessionState error:', err);
    return false;
  }
}
