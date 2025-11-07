import * as Types from '@/lib/user-service';
import { fetchWithAuth } from '@/lib/utils/apiClient';
import { UpdatePictureResponse } from '@/lib/user-service';
// const USER_SERVICE_URL = process.env.NEXT_PUBLIC_API_USER_SERVICE!;
const USER_SERVICE_URL = 'http://localhost:3005';

/**
 * A utility function to handle API responses and throw errors
 */
async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An API error occurred');
  }
  return data;
}

/**
 * Signs up a new user.
 */
export async function signup(
  data: Types.SignupData,
): Promise<{ message: string; user: { email: string; username: string } }> {
  const response = await fetch(`${USER_SERVICE_URL}/user/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Logs in a user.
 */
export async function login(
  data: Types.LoginData,
): Promise<Types.AuthResponse> {
  console.log(USER_SERVICE_URL);
  const response = await fetch(`${USER_SERVICE_URL}/user/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Verifies a user's email with an OTP.
 */
export async function verifyEmail(
  data: Types.VerifyEmailData,
): Promise<Types.VerifyEmailResponse> {
  const response = await fetch(`${USER_SERVICE_URL}/user/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Requests a new OTP for an unverified email.
 */
export async function resendOtp(email: string): Promise<{ message: string }> {
  const response = await fetch(`${USER_SERVICE_URL}/user/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(response);
}

/**
 * Checks if a username is available.
 */
export async function checkUsername(
  username: string,
): Promise<{ isAvailable: boolean }> {
  const response = await fetch(
    `${USER_SERVICE_URL}/user/check-username?username=${encodeURIComponent(username)}`,
  );
  return handleResponse(response);
}

/**
 * Requests a password reset OTP for a forgotten password.
 */
export async function requestForgotPassword(
  data: Types.ForgotPasswordRequestData,
): Promise<{ message: string }> {
  const response = await fetch(
    `${USER_SERVICE_URL}/user/auth/forgot-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}

/**
 * Resets a forgotten password using an OTP.
 */
export async function resetPassword(
  data: Types.ForgotPasswordResetData,
): Promise<{ message: string }> {
  const response = await fetch(`${USER_SERVICE_URL}/user/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Refreshes the access token.
 */
export async function refreshExpiredToken(
  token: string,
): Promise<Types.AuthResponse> {
  const response = await fetch(`${USER_SERVICE_URL}/user/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return handleResponse(response);
}

// ======================================
// === PROTECTED USER ENDPOINTS (AUTH) ===
// ======================================

/**
 * Logs out the user on the backend (invalidates refresh token).
 */
export async function logout(): Promise<{ message: string }> {
  const response = await fetchWithAuth(`${USER_SERVICE_URL}/user/auth/logout`, {
    method: 'POST',
  });
  return handleResponse(response);
}

/**
 * Fetches the profile of the currently authenticated user.
 */
export async function getMyProfile(): Promise<Types.UserProfile> {
  const response = await fetchWithAuth(`${USER_SERVICE_URL}/user/me/profile`);
  return handleResponse(response);
}

/**
 * Fetches the public profile of any user by their ID.
 */
export async function getUserProfileById(
  id: number,
): Promise<Types.PublicUserProfile> {
  const response = await fetchWithAuth(`${USER_SERVICE_URL}/user/${id}`);
  return handleResponse(response);
}

/**
 * Fetches public profiles for a batch of user IDs.
 */
export async function getUsersBatch(ids: number[]): Promise<Types.BatchUser[]> {
  const response = await fetchWithAuth(
    `${USER_SERVICE_URL}/user?ids=${ids.join(',')}`,
  );
  return handleResponse(response);
}

/**
 * Updates the authenticated user's text-based profile info.
 */
export async function updateMyProfile(
  data: Types.UpdateProfileData,
): Promise<Types.UpdateProfileResponse> {
  const response = await fetchWithAuth(`${USER_SERVICE_URL}/user/me/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Uploads a new profile picture for the authenticated user.
 */
export async function updateMyProfilePicture(
  formData: FormData,
): Promise<UpdatePictureResponse> {
  const response = await fetchWithAuth(
    `${USER_SERVICE_URL}/user/me/profile-picture`,
    {
      method: 'POST',
      body: formData,
    },
  );
  return handleResponse(response);
}

/**
 * Step 1: Requests an OTP to change the user's email.
 */
export async function requestEmailChange(
  data: Types.RequestEmailChangeData,
): Promise<{ message: string }> {
  const response = await fetchWithAuth(
    `${USER_SERVICE_URL}/user/me/email/request-otp`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}

/**
 * Step 2: Verifies the OTP to confirm the email change.
 */
export async function verifyEmailChange(
  data: Types.VerifyEmailChangeData,
): Promise<{ message: string }> {
  const response = await fetchWithAuth(
    `${USER_SERVICE_URL}/user/me/email/verify-otp`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}

/**
 * Step 1: Requests an OTP to change the user's password.
 */
export async function requestPasswordChange(
  data: Types.RequestPasswordChangeData,
): Promise<{ message: string }> {
  const response = await fetchWithAuth(
    `${USER_SERVICE_URL}/user/me/password/request-otp`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}

/**
 * Step 2: Verifies the OTP to confirm the password change.
 */
export async function verifyPasswordChange(
  data: Types.VerifyPasswordChangeData,
): Promise<{ message: string }> {
  const response = await fetchWithAuth(
    `${USER_SERVICE_URL}/user/me/password/verify-otp`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}
