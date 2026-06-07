import React from 'react';

const sizeClasses = {
  sm: 'h-4 w-4 border-[2px]',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

export default function LoadingSpinner({ size = 'md', label = 'Carregando...', className = '' }) {
  const spinnerSize = sizeClasses[size] || sizeClasses.md;

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-300 ${className}`}>
      <span
        className={`${spinnerSize} inline-block animate-spin rounded-full border-gray-200 border-t-uvv-yellow dark:border-white/10 dark:border-t-uvv-yellow`}
        aria-hidden="true"
      />
      {label && <span>{label}</span>}
    </span>
  );
}
