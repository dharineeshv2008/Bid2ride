import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  register: UseFormRegister<any>;
  error?: string;
  disabled?: boolean;
  theme?: 'passenger' | 'driver' | 'admin';
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ register, error, disabled, theme = 'passenger' }) => {
  const labelClass = theme === 'passenger' 
    ? 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5'
    : 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

  const containerBorderClass = theme === 'passenger' ? 'border-slate-200' : 'border-slate-800';

  const inputClass = theme === 'passenger'
    ? 'w-full pl-20 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 font-medium transition-all disabled:opacity-50 bg-white'
    : theme === 'driver'
    ? 'w-full pl-20 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all disabled:opacity-50'
    : 'w-full pl-20 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-white font-medium transition-all disabled:opacity-50';

  return (
    <div className="space-y-1">
      <label className={labelClass}>Phone Number</label>
      <div className="relative">
        <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm font-semibold border-r ${containerBorderClass} pr-2.5 text-slate-400`}>
          <Phone className="w-4 h-4 text-slate-400" />
          <span className={theme === 'passenger' ? 'text-slate-600' : 'text-slate-300'}>+91</span>
        </div>
        <input
          type="tel"
          placeholder="98765 43210"
          disabled={disabled}
          {...register('phone')}
          className={inputClass}
        />
      </div>
      {error && (
        <p className="text-rose-500 text-xs mt-1 font-medium">{error}</p>
      )}
    </div>
  );
};
