'use client';

import { jwtDecode } from 'jwt-decode';
import { refreshExpiredToken } from '@/services/userServiceApi';
import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  setAccessToken,
} from '@/lib/utils/jwt';

interface DecodedAccessToken {
  userId: number;
  username: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

async function getNewAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.log('No refresh token found.');
    return null;
  }

  try {
    const data = await refreshExpiredToken(refreshToken);
    setAccessToken(data.token);
    return data.token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = getAccessToken();

  // 1. Check if token exists and is expired
  if (token) {
    try {
      const decoded = jwtDecode<DecodedAccessToken>(token);

      if (decoded && decoded.exp * 1000 < Date.now()) {
        console.log('Access token expired, refreshing...');
        token = await getNewAccessToken();
      }
    } catch (error) {
      console.error('Invalid token, refreshing...', error);
      token = await getNewAccessToken();
    }
  }

  // 2. If no token after all checks, log out
  if (!token) {
    removeTokens();
    window.location.href = '/accounts/login';
    throw new Error('Session expired. Please log in again.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, {
    ...options,
    headers: headers,
  });

  // check for 403/401 and attempt refresh
  if (response.status === 403 || response.status === 401) {
    console.log('Token was rejected by server, attempting refresh...');
    const newToken = await getNewAccessToken();

    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);

      response = await fetch(url, {
        ...options,
        headers: headers,
      });
    } else {
      removeTokens();
      window.location.href = '/accounts/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
};
