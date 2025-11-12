import * as Types from '@/lib/matching-service';
import { fetchWithAuth } from '@/lib/utils/apiClient';

const MATCHING_URL = process.env.NEXT_PUBLIC_API_MATCHING_SERVICE!;

/**
 * POST /match/request
 * sends a match request to the matching service
 * userId in user token
 */
export async function postMatchRequest(
  data: Types.MatchCriteria,
): Promise<Types.ApiResult<Types.MatchResponseBody>> {
  try {
    const url = `${MATCHING_URL}/match/request`;

    const res = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const resData = (await res.json()) as Types.MatchResponseBody;

    if (!res.ok) {
      return {
        success: false,
        message: resData.message ?? `Request failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      data: resData,
    };
  } catch (error) {
    console.log('Error posting to /match/request: ', error);
    return {
      success: false,
      message: 'Network or unexpected error',
    };
  }
}

/**
 * GET /match/status/{userId}
 * Gets the status of the user with userId in the matching service
 * userId in user token
 */
export async function getMatchStatus(): Promise<
  Types.ApiResult<Types.StatusResponseBody>
> {
  try {
    const url = `${MATCHING_URL}/match/status`;

    const res = await fetchWithAuth(url, {
      method: 'GET',
    });

    const resData = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: resData.message ?? `Request failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      data: resData,
    };
  } catch (error) {
    console.log('Error getting from /match/status: ', error);
    return {
      success: false,
      message: 'Network or unexpected error',
    };
  }
}

/**
 * DELETE /match/cancel
 * Cancels a match request by user with userId
 * userId in user token
 */
export async function deleteMatchRequest(): Promise<
  Types.ApiResult<Types.DeleteResponseBody>
> {
  try {
    const url = `${MATCHING_URL}/match/cancel`;

    const res = await fetchWithAuth(url, {
      method: 'DELETE',
    });

    const resData = (await res.json()) as Types.DeleteResponseBody;

    if (!res.ok) {
      return {
        success: false,
        message: resData.message ?? `Request failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      data: resData,
    };
  } catch (error) {
    console.log('Error deleting from /match/cancel: ', error);
    return {
      success: false,
      message: 'Network or unexpected error',
    };
  }
}
