import { useState } from 'react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';
import { ConfirmationResult } from 'firebase/auth';

const DEVELOPMENT_MODE = import.meta.env.VITE_DEVELOPMENT_MODE === 'true';

// Firebase Testing Numbers
const TEST_NUMBERS = ['+919876543210', '+919876543211', '+919999999999'];

export const useFirebaseAuth = () => {
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecaptcha = (containerId: string): RecaptchaVerifier | null => {
    if (recaptchaVerifier) return recaptchaVerifier;
    try {
      // Create invisible verifier
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        }
      });
      setRecaptchaVerifier(verifier);
      return verifier;
    } catch (err) {
      console.error('Error creating RecaptchaVerifier:', err);
      return null;
    }
  };

  const sendOtp = async (phone: string, containerId: string = 'recaptcha-container') => {
    setIsSending(true);
    setError(null);
    try {
      let formattedPhone = phone;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
      }

      if (DEVELOPMENT_MODE) {
        // Bypass captcha for test numbers in Firebase Auth setting
        auth.settings.appVerificationDisabledForTesting = true;

        // If the number entered is not a pre-configured testing number, map it to a testing number to prevent sending a real SMS.
        if (!TEST_NUMBERS.includes(formattedPhone)) {
          console.warn(`Phone number ${formattedPhone} is not a registered testing number in Dev Mode. Mapping to +919876543210.`);
          formattedPhone = '+919876543210';
        }
      }

      const verifier = getRecaptcha(containerId);
      if (!verifier && !DEVELOPMENT_MODE) {
        throw new Error('Failed to initialize recaptcha verifier.');
      }

      let confirmation: ConfirmationResult;
      try {
        confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier!);
      } catch (err: any) {
        // Fallback for offline/unconfigured environment in Dev Mode
        if (DEVELOPMENT_MODE) {
          console.warn('Firebase signInWithPhoneNumber failed, using offline mock fallback');
          const mockConfirmation: ConfirmationResult = {
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
          confirmation = mockConfirmation;
        } else {
          throw err;
        }
      }

      setConfirmationResult(confirmation);
      return { confirmation, phone: formattedPhone };
    } catch (err: any) {
      console.error('Firebase sendOtp error:', err);
      let errMsg = 'Failed to send verification code. Please try again.';
      if (err.code === 'auth/invalid-phone-number') {
        errMsg = 'Invalid phone number format.';
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errMsg = 'Network error. Please check your internet connection.';
      }
      setError(errMsg);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtpCode = async (code: string): Promise<string> => {
    setIsVerifying(true);
    setError(null);
    try {
      if (!confirmationResult) {
        throw new Error('No active verification session. Please request a new code.');
      }

      const userCredential = await confirmationResult.confirm(code);
      const idToken = await userCredential.user.getIdToken();
      return idToken;
    } catch (err: any) {
      console.error('Firebase verifyOtp error:', err);
      let errMsg = 'Invalid verification code. Please try again.';
      if (err.code === 'auth/invalid-verification-code') {
        errMsg = 'Invalid OTP code. Please check and try again.';
      } else if (err.code === 'auth/code-expired') {
        errMsg = 'The verification code has expired. Please request a new one.';
      } else if (err.code === 'auth/network-request-failed') {
        errMsg = 'Network error. Please check your connection.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    sendOtp,
    verifyOtpCode,
    isSending,
    isVerifying,
    error,
    setError,
    confirmationResult,
  };
};
