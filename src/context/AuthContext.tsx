'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { awsConfig } from '@/config/cognito';
import { useRouter } from 'next/navigation';

// Function to decode JWT token
function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: awsConfig.userPoolId,
      userPoolClientId: awsConfig.userPoolWebClientId,
      region: awsConfig.region
    }
  }
}, { ssr: true });

interface UserAttributes {
  sub: string;
  email: string;
  email_verified: string;
  given_name?: string;
  phone_number?: string;
  phone_number_verified?: string;
  [key: string]: string | undefined;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  userAttributes: UserAttributes | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<UserAttributes | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setIsAuthenticated(true);
      setUser(user);
      setUserAttributes(attributes as unknown as UserAttributes);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      setUserAttributes(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string) {
    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });
      if (isSignedIn) {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        
        // Get the session and decode the token
        const { tokens } = await fetchAuthSession();
        if (tokens?.idToken) {
          const decodedToken = decodeToken(tokens.idToken.toString());
          if (decodedToken && decodedToken['cognito:groups']) {
            console.log('User group membership:', decodedToken['cognito:groups']);
          }
        }
        
        setIsAuthenticated(true);
        setUser(user);
        setUserAttributes(attributes as unknown as UserAttributes);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      setUserAttributes(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, userAttributes, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 