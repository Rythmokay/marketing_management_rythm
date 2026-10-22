import React, { type ReactNode, type CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glass?: boolean;
  style?: CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glass = false, style }) => {
  const baseClasses = glass 
    ? 'bg-white/95 backdrop-blur-md border border-slate-200 shadow-md p-8 rounded-xl transition-all'
    : 'bg-white rounded-xl border border-slate-200 shadow-xs p-6 transition-all hover:shadow-md hover:border-slate-300';
  
  const classes = `${baseClasses} ${className}`.trim();
  
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
};
