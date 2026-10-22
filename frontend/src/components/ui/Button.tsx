import React, { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 cursor-pointer border outline-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-blue-600 text-white border-blue-600 shadow-sm hover:enabled:bg-blue-700 hover:enabled:border-blue-700 shadow-blue-500/20',
    secondary: 'bg-white text-slate-900 border-slate-200 shadow-sm hover:enabled:bg-slate-100 hover:enabled:border-slate-300',
    danger: 'bg-white text-red-600 border-red-200 hover:enabled:bg-red-50 hover:enabled:border-red-600',
    ghost: 'bg-transparent text-slate-600 border-transparent hover:enabled:bg-slate-100 hover:enabled:text-slate-900',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim();

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};
