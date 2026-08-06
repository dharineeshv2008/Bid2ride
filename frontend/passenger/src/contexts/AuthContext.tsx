import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthTokenResponse, SendOtpResponse } from '../types';
import { api } from '../services/api';
import { auth, signInWithPhoneNumber, RecaptchaVerifier } from '../firebase';
import { ConfirmationResult } from 'firebase/auth';

export const DEVELOPMENT_MODE = import.meta.env.VITE_DEVELOPMENT_MODE === 'true';

// Firebase Testing Numbers
const TEST_NUMBERS = ['+919876543210', '+919876543211', '+919999999999'];

export interface SendOtpResult {
  sessionId: string | null;
  developmentMode: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  confirmationResult: ConfirmationResult | null;
  sendOtp: (phone: string, role?: string, password?: string) => Promise<SendOtpResult>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const refreshUser = async (): Promise<User | null> => {
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
      return data;
    } catch (err) {
      console.error('Failed to refresh user profile data', err);
      return null;
    }
  };

  useEffect(() => {
    const handleProfileUpdate = () => {
      refreshUser();
    };
    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('profile_updated', handleProfileUpdate);
  }, []);


  useEffect(() => {
    let active = true;
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!active) return;
      setIsLoading(true);
      try {
        if (firebaseUser) {
          const localToken = localStorage.getItem('access_token');
          if (localToken) {
            try {
              const { data } = await api.get<User>('/auth/me');
              if (active) {
                setUser(data);
              }
              setIsLoading(false);
              return;
            } catch (err) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
            }
          }

          // Exchange Firebase Token for backend JWT
          const idToken = await firebaseUser.getIdToken();
          const { data } = await api.post('/auth/firebase-login', {
            firebase_token: idToken,
            role: 'PASSENGER',
          });
          if (active) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            setUser(data.user);
          }
        } else {
          // If no Firebase user, see if we have dev login bypass credentials
          const localToken = localStorage.getItem('access_token');
          if (localToken) {
            try {
              const { data } = await api.get<User>('/auth/me');
              if (active) {
                setUser(data);
              }
            } catch (err) {
              if (active) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
              }
            }
          } else {
            if (active) {
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const sendOtp = async (phone: string, role?: string, password?: string): Promise<SendOtpResult> => {
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
    }

    if (DEVELOPMENT_MODE) {
      auth.settings.appVerificationDisabledForTesting = true;
      if (!TEST_NUMBERS.includes(formattedPhone)) {
        console.warn(`Phone number ${formattedPhone} is not a registered testing number. Mapping to +919876543210.`);
        formattedPhone = '+919876543210';
      }
    }

    // Set up recaptcha container dynamically
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      document.body.appendChild(container);
    }

    const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {}
    });

    let confirmation: ConfirmationResult;
    try {
      confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    } catch (err: any) {
      if (DEVELOPMENT_MODE) {
        console.warn('Firebase Phone Auth failed, fallback to mock confirmation result');
        confirmation = {
          verificationId: 'mock-verification-id',
          confirm: async (otpCode: string) => {
            if (otpCode === '123456' || otpCode === '1234') {
              return {
                user: {
                  getIdToken: async () => `mock-token-${formattedPhone}`
                }
              } as any;
            } else {
              const errorObj = new Error('Invalid code');
              (errorObj as any).code = 'auth/invalid-verification-code';
              throw errorObj;
            }
          }
        };
      } else {
        throw err;
      }
    }

    setConfirmationResult(confirmation);
    return { sessionId: 'firebase-session', developmentMode: false };
  };

  const verifyOtp = async (phone: string, otp: string, name?: string) => {
    if (!confirmationResult) {
      throw new Error('No active verification session. Please request a new code.');
    }

    const userCredential = await confirmationResult.confirm(otp);
    const idToken = await userCredential.user.getIdToken();

    const { data } = await api.post('/auth/firebase-login', {
      firebase_token: idToken,
      role: 'PASSENGER',
      name: name || 'Passenger User',
    });

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        await api.post('/auth/logout', { refresh_token: refresh });
      }
    } catch (_) {
      // Ignore API errors on logout cleanup
    } finally {
      try {
        await auth.signOut();
      } catch (_) {}
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        confirmationResult,
        sendOtp,
        verifyOtp,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
