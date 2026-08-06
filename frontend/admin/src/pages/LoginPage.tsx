import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEVELOPMENT_MODE } from '../contexts/AuthContext';
import { PhoneInput } from '../components/PhoneInput';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const adminLoginSchema = z.object({
  phone: z.string().regex(/^[6-9][0-9]{9}$/, 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)'),
  password: z.string().optional()
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export const LoginPage: React.FC = () => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sendOtp } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      phone: '',
      password: ''
    }
  });

  const onSubmit = async (data: AdminLoginFormValues) => {
    setError('');
    setIsSubmitting(true);
    try {
      const formatted = `+91${data.phone}`;
      await sendOtp(formatted, 'ADMIN', data.password);
      navigate('/otp', { state: { phone: formatted } });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2 font-display">Administrator Sign In</h2>
      <p className="text-slate-400 text-sm mb-6">Enter your authorized admin phone number.</p>

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
          theme="admin"
        />

        {DEVELOPMENT_MODE && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Admin Password (Optional in Dev Mode)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Development admin password"
                {...register('password')}
                disabled={isSubmitting}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-white font-medium transition-all"
              />
            </div>
          </div>
        )}

        {/* Hidden container for Firebase invisible reCAPTCHA */}
        <div id="recaptcha-container"></div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
