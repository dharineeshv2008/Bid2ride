import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PhoneInput } from '../components/PhoneInput';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  phone: z.string().regex(/^[6-9][0-9]{9}$/, 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sendOtp } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: ''
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError('');
    setIsSubmitting(true);
    try {
      const formatted = `+91${data.phone}`;
      await sendOtp(formatted, 'DRIVER');
      navigate('/otp', { state: { phone: formatted } });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2 font-display">Driver Sign In</h2>
      <p className="text-slate-400 text-sm mb-6">Enter your registered driver phone number.</p>

      {error && (
        <div className="bg-rose-500/10 text-rose-400 text-xs p-3 rounded-xl mb-4 border border-rose-500/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PhoneInput
          register={register}
          error={errors.phone?.message}
          disabled={isSubmitting}
          theme="driver"
        />

        {/* Hidden container for Firebase invisible reCAPTCHA */}
        <div id="recaptcha-container"></div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-emerald-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
