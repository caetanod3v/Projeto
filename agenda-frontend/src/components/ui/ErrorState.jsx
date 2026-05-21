import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const variantClasses = {
  inline: 'rounded-2xl border border-red-100 bg-red-50/70 p-4 dark:border-red-400/15 dark:bg-red-500/10',
  fullpage: 'rounded-[28px] border border-red-100 bg-white p-8 shadow-sm ring-1 ring-gray-200/70 dark:border-red-400/15 dark:bg-[#191d28] dark:ring-white/10',
  toast: 'rounded-xl border border-red-100 bg-red-50/90 p-3 dark:border-red-400/15 dark:bg-red-500/10',
};

export default function ErrorState({
  variant = 'inline',
  title = 'Nao foi possivel carregar os dados',
  message = 'Tente novamente em alguns instantes.',
  onRetry,
  retryLabel = 'Tentar novamente',
  className = '',
}) {
  const isFullPage = variant === 'fullpage';

  return (
    <div className={`${variantClasses[variant] || variantClasses.inline} ${className}`}>
      <div className={`flex ${isFullPage ? 'flex-col items-center text-center' : 'items-start'} gap-3`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-300">
          <AlertCircle size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`${isFullPage ? 'text-base' : 'text-sm'} font-semibold text-gray-950 dark:text-white`}>
            {title}
          </h3>
          {message && (
            <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-300">
              {message}
            </p>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`${isFullPage ? 'mt-5' : 'mt-3'} inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white/10 dark:text-white dark:ring-1 dark:ring-white/10 dark:hover:bg-white/15`}
            >
              <RefreshCw size={14} />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
