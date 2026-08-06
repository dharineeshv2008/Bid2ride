import React, { useRef, useState, useEffect } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  theme?: 'passenger' | 'driver' | 'admin';
}

export const OTPInput: React.FC<OTPInputProps> = ({ value, onChange, disabled, theme = 'passenger' }) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Keep internal state in sync with external value
  useEffect(() => {
    const valDigits = value.split('').slice(0, 6);
    const newDigits = Array(6).fill('');
    for (let i = 0; i < valDigits.length; i++) {
      newDigits[i] = valDigits[i];
    }
    setDigits(newDigits);
  }, [value]);

  // Autofocus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 50);
  }, []);

  const handleChange = (index: number, val: string) => {
    // Only allow numeric input
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      // Clear current digit
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      onChange(newDigits.join(''));
      return;
    }

    const newDigits = [...digits];
    // Take only the last entered character if multiple are input
    newDigits[index] = cleaned[cleaned.length - 1];
    setDigits(newDigits);

    const newValue = newDigits.join('');
    onChange(newValue);

    // Auto move to the next box
    if (index < 5 && newDigits[index]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      // If the current field is empty, clear the previous field and move focus back
      if (!newDigits[index] && index > 0) {
        newDigits[index - 1] = '';
        inputsRef.current[index - 1]?.focus();
      } else {
        newDigits[index] = '';
      }
      setDigits(newDigits);
      onChange(newDigits.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = Array(6).fill('');
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);
    onChange(pastedData);

    // Focus either the last filled index or keep it on the 6th input
    const focusIndex = Math.min(pastedData.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleFocus = (index: number) => {
    inputsRef.current[index]?.select();
  };

  const inputClass = theme === 'passenger'
    ? 'w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 bg-white transition-all'
    : theme === 'driver'
    ? 'w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white bg-slate-900 transition-all'
    : 'w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-white bg-slate-900 transition-all';

  return (
    <div className="flex justify-between gap-1.5 max-w-[18rem] mx-auto" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          type="text"
          maxLength={1}
          value={digit}
          disabled={disabled}
          ref={(el) => (inputsRef.current[index] = el)}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          className={inputClass}
        />
      ))}
    </div>
  );
};
