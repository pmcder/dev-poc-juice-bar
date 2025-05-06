'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { 
  signIn, 
  signOut, 
  getCurrentUser, 
  fetchUserAttributes, 
  fetchAuthSession,
  confirmSignIn,
  updatePassword
} from 'aws-amplify/auth';
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
      identityPoolId: awsConfig.identityPoolId
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
  user: UserAttributes | null;
  userAttributes: UserAttributes | null;
  userGroups: string[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  needsNewPassword: boolean;
  tempUsername: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserAttributes | null>(null);
  const [userAttributes, setUserAttributes] = useState<UserAttributes | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const { tokens } = await fetchAuthSession();
      let groups: string[] = [];
      
      if (tokens?.idToken) {
        const decodedToken = decodeToken(tokens.idToken.toString());
        if (decodedToken && decodedToken['cognito:groups']) {
          groups = decodedToken['cognito:groups'];
        }
      }
      
      setIsAuthenticated(true);
      setUser(user as unknown as UserAttributes);
      setUserAttributes(attributes as unknown as UserAttributes);
      setUserGroups(groups);
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      setUserAttributes(null);
      setUserGroups([]);
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string) {
    try {
      console.log('Attempting login with username:', username);
      const signInResponse = await signIn({ username, password });
      console.log('Sign in response:', signInResponse);
      
      // Check if we need to handle additional steps
      if (signInResponse.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        throw new Error('Please confirm your account before signing in');
      }
      
      if (signInResponse.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        console.log('Password change required');
        // Store the username and session for password change
        setTempUsername(username);
        setNeedsNewPassword(true);
        // Complete the initial sign-in with the temporary password
        await confirmSignIn({ challengeResponse: password });
        return;
      }
      
      if (signInResponse.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
        throw new Error('SMS MFA is required. Please contact your administrator to disable MFA.');
      }
      
      if (signInResponse.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        throw new Error('TOTP MFA is required. Please contact your administrator to disable MFA.');
      }
      
      if (!signInResponse.isSignedIn) {
        console.error('Sign in failed:', signInResponse.nextStep);
        throw new Error(`Sign in failed: ${signInResponse.nextStep?.signInStep || 'Unknown error'}`);
      }

      const user = await getCurrentUser();
      console.log('Current user:', user);
      const attributes = await fetchUserAttributes();
      console.log('User attributes:', attributes);
      
      // Get the session and decode the token
      const { tokens } = await fetchAuthSession();
      let groups: string[] = [];
      
      if (tokens?.idToken) {
        const decodedToken = decodeToken(tokens.idToken.toString());
        console.log('Decoded token:', decodedToken);
        if (decodedToken && decodedToken['cognito:groups']) {
          groups = decodedToken['cognito:groups'];
          console.log('User group membership:', groups);
        }
      }
      
      setIsAuthenticated(true);
      setUser(user as unknown as UserAttributes);
      setUserAttributes(attributes as unknown as UserAttributes);
      setUserGroups(groups);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
      if (error instanceof Error) {
        throw new Error(`Login failed: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during login');
    }
  }

  async function logout() {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      setUserAttributes(null);
      setUserGroups([]);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    try {
      console.log('Changing password for user:', tempUsername);
      
      // Update the password
      await updatePassword({ oldPassword, newPassword });
      
      // Reset the state
      setNeedsNewPassword(false);
      setTempUsername('');
      
      // Get the user session and attributes
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const { tokens } = await fetchAuthSession();
      let groups: string[] = [];
      
      if (tokens?.idToken) {
        const decodedToken = decodeToken(tokens.idToken.toString());
        if (decodedToken && decodedToken['cognito:groups']) {
          groups = decodedToken['cognito:groups'];
        }
      }
      
      setIsAuthenticated(true);
      setUser(user as unknown as UserAttributes);
      setUserAttributes(attributes as unknown as UserAttributes);
      setUserGroups(groups);
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error instanceof Error) {
        throw new Error(`Password change failed: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while changing password');
    }
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      userAttributes, 
      userGroups, 
      login, 
      logout, 
      loading,
      changePassword,
      needsNewPassword,
      tempUsername
    }}>
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