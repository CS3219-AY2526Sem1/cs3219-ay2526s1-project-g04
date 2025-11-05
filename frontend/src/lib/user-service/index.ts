// The payload of our Access Token
export interface UserJwtPayload {
  userId: number;
  username: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

// Data for the user profile page
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
  role: 'USER' | 'ADMIN';
  bannerUrl?: string | null;
}

// Data for the public user card
export interface PublicUserProfile {
  username: string;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

// Data for batch user fetch
export interface BatchUser {
  id: number;
  username: string;
}

// === API Payloads (from Zod schemas) ===

export interface SignupData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

export interface UpdateProfileData {
  username?: string;
  bio?: string | null;
  bannerUrl?: string | null;
}

export interface RequestEmailChangeData {
  newEmail: string;
  password: string; // current password
}

export interface VerifyEmailChangeData {
  newEmail: string;
  password: string;
  otp: string;
}

export interface RequestPasswordChangeData {
  oldPassword: string;
}

export interface VerifyPasswordChangeData {
  oldPassword: string;
  newPassword: string;
  otp: string;
}

export interface ForgotPasswordRequestData {
  email: string;
}

export interface ForgotPasswordResetData {
  email: string;
  otp: string;
  newPassword: string;
}

// === API Responses ===

export interface AuthResponse {
  message: string;
  token: string;
  refreshToken: string;
}

export interface VerifyEmailResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface UpdateProfileResponse {
  message: string;
  accessToken?: string; // Only sent if username was changed
}

export interface UpdatePictureResponse {
  message: string;
  profilePictureUrl: string;
}
