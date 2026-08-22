import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DriverProfile, SendOtpResponse } from '../types';
import { api } from '../services/api';
import { auth, signInWithPhoneNumber, RecaptchaVerifier } from '../firebase';
import { ConfirmationResult } from 'firebase/auth';

export const DEVELOPMENT_MODE = import.meta.env.VITE_DEVELOPMENT_MODE === 'true';

export function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}


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
          const localToken = localStorage.getItem('token');
          if (localToken) {
            try {
              const decoded = parseJwt(localToken);
              console.log("[AUTH DEBUG] Token role:", decoded?.role);
              const { data } = await api.get<User>('/auth/me');
              console.log("[AUTH DEBUG] restored user role:", data.role);
              if (data.role?.toUpperCase() !== 'DRIVER') {
                throw new Error('Unauthorized role');
              }
              if (active) {
                setUser(data);
                const profileRes = await api.get<DriverProfile>('/driver/me');
                setDriverProfile(profileRes.data);
              }
              setIsLoading(false);
              return;
            } catch (err) {
              console.warn('[AUTH DEBUG] Session restoration failed, clearing token:', err);
              localStorage.removeItem('token');
              localStorage.removeItem('role');
              localStorage.removeItem('refresh_token');
            }
          }

          // Exchange Firebase Token for backend JWT
          const idToken = await firebaseUser.getIdToken();
          const { data } = await api.post('/auth/firebase-login', {
            firebase_token: idToken,
            role: 'DRIVER',
          });

          const decoded = parseJwt(data.access_token);
          console.log("[AUTH DEBUG] Token role:", decoded?.role);
          console.log("[AUTH DEBUG] Firebase login user role:", data.user?.role);
          if (data.user?.role?.toUpperCase() !== 'DRIVER') {
            throw new Error('Unauthorized role');
          }

          if (active) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', 'driver');
            localStorage.setItem('refresh_token', data.refresh_token);
            setUser(data.user);
            
            const profileRes = await api.get<DriverProfile>('/driver/me');
            setDriverProfile(profileRes.data);
          }
        } else {
          // Check for dev login credentials
          const localToken = localStorage.getItem('token');
          if (localToken) {
            try {
              const decoded = parseJwt(localToken);
              console.log("[AUTH DEBUG] Token role:", decoded?.role);
              const { data } = await api.get<User>('/auth/me');
              console.log("[AUTH DEBUG] restored user role:", data.role);
              if (data.role?.toUpperCase() !== 'DRIVER') {
                throw new Error('Unauthorized role');
              }
              if (active) {
                setUser(data);
                const profileRes = await api.get<DriverProfile>('/driver/me');
                setDriverProfile(profileRes.data);
              }
            } catch (err) {
              console.warn('[AUTH DEBUG] Dev session restoration failed, clearing token:', err);
              if (active) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
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

    const decoded = parseJwt(data.access_token);
    console.log("[AUTH DEBUG] Token role:", decoded?.role);
    console.log("[AUTH DEBUG] verifyOtp response role:", data.user?.role);
    if (data.user?.role?.toUpperCase() !== 'DRIVER') {
      throw new Error('Login failed: Account role is not driver');
    }

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', 'driver');
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);

    const profileRes = await api.get<DriverProfile>('/driver/me');
    setDriverProfile(profileRes.data);
  };

  const toggleOnlineStatus = async (online: boolean) => {
    let payload: any = { 
      online_status: online, 
      status: online ? 'ONLINE' : 'OFFLINE',
    };
    
    if (online) {
      if (!('geolocation' in navigator)) {
        throw new Error('Geolocation is not supported by your browser');
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        payload.lat = position.coords.latitude;
        payload.lng = position.coords.longitude;
        payload.heading = position.coords.heading || 0;
        payload.speed = position.coords.speed || 0;
        payload.accuracy = position.coords.accuracy || 10;
      } catch (e: any) {
        console.error('Geolocation capture failed:', e);
        if (DEVELOPMENT_MODE) {
          console.warn('Fallback to mock coordinates in development mode');
          payload.lat = 12.9716;
          payload.lng = 77.5946;
        } else {
          if (e.code === 1) {
            throw new Error('Location access denied. Please enable location permissions to go online.');
          } else {
            throw new Error(`Failed to retrieve your location: ${e.message || 'Timeout or network error'}`);
          }
        }
      }
    } else {
      // Offline mode: send default coordinates to avoid validation error
      payload.lat = 12.9716;
      payload.lng = 77.5946;
    }

    const { data } = await api.put<DriverProfile>('/driver/availability', payload);
    setDriverProfile(data);
  };

  // Adaptive Driver Heartbeat Loop (5s moving / 10s idle)
  useEffect(() => {
    if (!driverProfile?.online_status) return;

    let timeoutId: any;
    let isMoving = false;

    const runHeartbeat = () => {
      const scheduleNext = () => {
        const delay = isMoving ? 5000 : 10000;
        timeoutId = setTimeout(runHeartbeat, delay);
      };

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const speed = pos.coords.speed || 0;
          isMoving = speed > 0.5; // moving if > 0.5 m/s (~1.8 km/h)
          api.post('/driver/heartbeat', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            speed: speed,
            accuracy: pos.coords.accuracy || 10
          })
          .then(scheduleNext)
          .catch(scheduleNext);
        }, () => {
          isMoving = false;
          api.post('/driver/heartbeat', { lat: 12.9716, lng: 77.5946 })
          .then(scheduleNext)
          .catch(scheduleNext);
        });
      } else {
        isMoving = false;
        api.post('/driver/heartbeat', { lat: 12.9716, lng: 77.5946 })
        .then(scheduleNext)
        .catch(scheduleNext);
      }
    };

    timeoutId = setTimeout(runHeartbeat, 5000);

    return () => clearTimeout(timeoutId);
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
      localStorage.removeItem('token');
      localStorage.removeItem('role');
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
