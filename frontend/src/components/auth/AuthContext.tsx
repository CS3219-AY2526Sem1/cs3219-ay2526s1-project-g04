'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { login, logout, verifyEmail } from '@/services/userServiceApi';
import { LoginData, UserJwtPayload, VerifyEmailData } from '@/lib/user-service';
import { Box, CircularProgress } from '@mui/material';
// 1. Import the new function
import { getNewAccessToken } from '@/lib/utils/apiClient'; // Adjust path if needed

// Define the shape of the context
interface AuthContextType {
  user: UserJwtPayload | null;
  isLoading: boolean; // This will be true while checking the token
  logIn: (data: LoginData) => Promise<void>;
  logOut: () => Promise<void>;
  verifyAndLogin: (data: VerifyEmailData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserJwtPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const checkUserStatus = async () => {
      let token = localStorage.getItem('accessToken');

      try {
        if (token) {
          const decoded = jwtDecode<UserJwtPayload>(token);
          if (decoded.exp * 1000 < Date.now()) {
            console.log(
              'AuthContext: Access token expired, attempting refresh...',
            );
            token = await getNewAccessToken();
          }
        } else {
          console.log('AuthContext: No access token, attempting refresh...');
          token = await getNewAccessToken();
        }

        if (token) {
          const decoded = jwtDecode<UserJwtPayload>(token);
          setUser(decoded);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('AuthContext: Error checking user status', error);
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setIsLoading(false);
    };
    checkUserStatus();
  }, []);

  /**
   * Helper function to set auth data in state and storage
   */
  const setAuthData = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const decoded = jwtDecode<UserJwtPayload>(accessToken);
    setUser(decoded);
  };

  /**
   * Logs in a user via the standard login form.
   */
  const logIn = async (data: LoginData) => {
    const response = await login(data);
    // console.log(response);
    // console.log(
    //   'token=',
    //   response.token,
    //   'refreshToken=',
    //   response.refreshToken,
    // );
    setAuthData(response.token, response.refreshToken); // Use response.token
    router.push('/home/dashboard');
  };

  /**
   * Verifies an OTP and logs the user in.
   */
  const verifyAndLogin = async (data: VerifyEmailData) => {
    const response = await verifyEmail(data);
    setAuthData(response.accessToken, response.refreshToken);
    router.push('/home/dashboard');
  };

  /**
   * Logs the user out by clearing tokens and state.
   */
  const logOut = async () => {
    try {
      await logout();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        'Backend logout failed, proceeding with frontend logout.',
        error,
      );
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/accounts/login');
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, logIn, logOut, verifyAndLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to easily access the authentication context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
