import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { OTPInput } from '../components/OTPInput';
import { Loader2, ArrowLeft, RotateCcw } from 'lucide-react';

export const OtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, sendOtp } = useAuth();

  const phone = location.state?.phone || '+919876543210';
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(60);

  // 60 seconds countdown timer
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (otp.length === 6) {
      verifyAndSubmit(otp);
    }
  }, [otp]);

  const verifyAndSubmit = async (code: string) => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      await verifyOtp(phone, code, name);
      navigate('/dashboard');
    } catch (err: any) {
      let errMsg = 'Invalid or expired OTP code.';
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP verification code');
      return;
    }
    verifyAndSubmit(otp);
  };

  const handleResend = async () => {
    setError('');
    try {
      await sendOtp(phone, 'PASSENGER');
      setTimer(60);
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate('/login')}
        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Change Phone Number
      </button>

      <h2 className="text-2xl font-bold text-slate-900 mb-1">Enter Verification Code</h2>
      <p className="text-slate-500 text-sm mb-6">
        We sent a 6-digit SMS code to <span className="font-semibold text-slate-800">{phone}</span>.
      </p>

      {error && (
        <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-xl mb-4 border border-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Full Name (First Login)
          </label>
          <input
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 font-medium transition-all bg-white disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 text-center">
            6-Digit OTP Code
          </label>
          <OTPInput
            value={otp}
            onChange={setOtp}
            disabled={isSubmitting}
            theme="passenger"
          />
        </div>

        <div className="flex items-center justify-between text-sm px-1">
          {timer > 0 ? (
            <span className="text-slate-500">
              Resend code in <span className="font-semibold text-slate-700">{timer}s</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 font-bold text-sky-600 hover:text-sky-700 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Resend OTP
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || otp.length !== 6}
          className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Verify & Continue'
          )}
        </button>
      </form>
    </div>
  );
};
