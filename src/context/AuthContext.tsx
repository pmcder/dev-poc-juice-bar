'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';
import { awsConfig } from '@/config/cognito';
import { useRouter } from 'next/navigation';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: awsConfig.userPoolId,
      userPoolClientId: awsConfig.userPoolWebClientId,
      identityPoolId: awsConfig.region // Using region as identityPoolId for now
    }
  }
}, { ssr: true });

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      setIsAuthenticated(true);
      setUser(user);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string) {
    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });
      if (isSignedIn) {
        const user = await getCurrentUser();
        setIsAuthenticated(true);
        setUser(user);
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
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
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