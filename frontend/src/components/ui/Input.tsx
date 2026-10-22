import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = true,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const containerClasses = `flex flex-col gap-1.5 mb-4 group ${fullWidth ? 'w-full' : ''} ${className}`;

  return (
    <div className={containerClasses.trim()}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-600 transition-colors group-focus-within:text-blue-600">
          {label}
        </label>
      )}
      <input 
        id={inputId}
        className={`bg-white border text-slate-900 px-3.5 py-2.5 rounded-md text-sm transition-all outline-none shadow-xs placeholder:text-slate-400 ${
          error 
            ? 'border-red-500 focus:ring-3 focus:ring-red-500/20' 
            : 'border-slate-200 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15'
        }`}
        {...props}
      />
      {error && <span className="text-red-600 text-xs mt-0.5">{error}</span>}
    </div>
  );
};
