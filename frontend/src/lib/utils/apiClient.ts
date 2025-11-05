'use client';

import { jwtDecode } from 'jwt-decode';

interface DecodedAccessToken {
  userId: number;
  username: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

async function getNewAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.log('No refresh token found.');
    return null;
  }

  try {
    const response = await fetch('http://localhost:3001/user/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: refreshToken }),
    });

    if (!response.ok) {
      console.error('Refresh token failed');
      return null;
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = localStorage.getItem('accessToken');

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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/accounts/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
};
