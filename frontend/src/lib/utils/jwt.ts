import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  userId: number;
  username: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const setAccessToken = (accessToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
};

export const removeTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getDecodedToken = (): DecodedToken | null => {
  const token = getAccessToken();
  if (!token) {
    return null;
  }

  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const getUserId = (): number | null => {
  const decoded = getDecodedToken();
  return decoded ? decoded.userId : null;
};

export const getUsername = (): string | null => {
  const decoded = getDecodedToken();
  return decoded ? decoded.username : null;
};

export const isTokenExpired = (): boolean => {
  const decoded = getDecodedToken();
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};
