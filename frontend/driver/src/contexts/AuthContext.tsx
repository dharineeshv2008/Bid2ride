import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DriverProfile, SendOtpResponse } from '../types';
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
  driverProfile: DriverProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  confirmationResult: ConfirmationResult | null;
  sendOtp: (phone: string, role?: string, password?: string) => Promise<SendOtpResult>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleOnlineStatus: (status: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

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
                if (data.role === 'DRIVER') {
                  const profileRes = await api.get<DriverProfile>('/driver/me');
                  setDriverProfile(profileRes.data);
                }
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
            role: 'DRIVER',
          });
          if (active) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            setUser(data.user);
            
            const profileRes = await api.get<DriverProfile>('/driver/me');
            setDriverProfile(profileRes.data);
          }
        } else {
          // Check for dev login credentials
          const localToken = localStorage.getItem('access_token');
          if (localToken) {
            try {
              const { data } = await api.get<User>('/auth/me');
              if (active) {
                setUser(data);
                if (data.role === 'DRIVER') {
                  const profileRes = await api.get<DriverProfile>('/driver/me');
                  setDriverProfile(profileRes.data);
                }
              }
            } catch (err) {
              if (active) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
                setDriverProfile(null);
              }
            }
          } else {
            if (active) {
              setUser(null);
              setDriverProfile(null);
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
        console.warn(`Phone number ${formattedPhone} is not a registered testing number. Mapping to +919876543211.`);
        formattedPhone = '+919876543211';
      }
    }

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
      role: 'DRIVER',
      name: name || 'Driver Pilot',
    });

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);

    const profileRes = await api.get<DriverProfile>('/driver/me');
    setDriverProfile(profileRes.data);
  };

  const toggleOnlineStatus = async (online: boolean) => {
    let payload: any = { online_status: online, status: online ? 'ONLINE' : 'OFFLINE' };
    
    if (online && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        if (position.coords.accuracy <= 100) {
          payload.lat = position.coords.latitude;
          payload.lng = position.coords.longitude;
          payload.heading = position.coords.heading || 0;
          payload.speed = position.coords.speed || 0;
          payload.accuracy = position.coords.accuracy;
        }
      } catch (e) {
        console.warn('Geolocation capture failed or permission denied, proceeding with status update', e);
      }
    }

    const { data } = await api.put<DriverProfile>('/driver/availability', payload);
    setDriverProfile(data);
  };

  // 30-Second Driver Heartbeat Loop
  useEffect(() => {
    if (!driverProfile?.online_status) return;

    const interval = setInterval(() => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
          if (pos.coords.accuracy <= 100) {
            api.post('/driver/heartbeat', {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading || 0,
              speed: pos.coords.speed || 0,
              accuracy: pos.coords.accuracy
            }).catch(() => {});
          }
        }, () => {
          api.post('/driver/heartbeat', {}).catch(() => {});
        });
      } else {
        api.post('/driver/heartbeat', {}).catch(() => {});
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [driverProfile?.online_status]);

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        await api.post('/auth/logout', { refresh_token: refresh });
      }
    } catch (_) {
    } finally {
      try {
        await auth.signOut();
      } catch (_) {}
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setDriverProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driverProfile,
        isAuthenticated: !!user,
        isLoading,
        confirmationResult,
        sendOtp,
        verifyOtp,
        logout,
        toggleOnlineStatus,
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
