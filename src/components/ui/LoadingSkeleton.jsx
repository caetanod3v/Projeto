import React from 'react';

const widthClasses = {
  xs: 'w-16',
  sm: 'w-24',
  md: 'w-40',
  lg: 'w-64',
  full: 'w-full',
};

function SkeletonLine({ width = 'full', className = '' }) {
  return (
    <div
      className={`h-3 rounded-full bg-gray-100 animate-pulse dark:bg-white/10 ${widthClasses[width] || widthClasses.full} ${className}`}
    />
  );
}

function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse dark:bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine width="md" />
          <SkeletonLine width="sm" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonLine />
        <SkeletonLine width="lg" />
      </div>
    </div>
  );
}

export default function LoadingSkeleton({
  variant = 'line',
  rows = 3,
  className = '',
}) {
  if (variant === 'card') {
    return <SkeletonCard className={className} />;
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-4 h-5 w-5 rounded-md bg-gray-100 animate-pulse dark:bg-white/10" />
              <SkeletonLine width="sm" className="mb-2 h-6" />
              <SkeletonLine width="xs" />
            </div>
          ))}
        </div>
        <LoadingSkeleton variant="list" rows={rows} />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonLine key={index} width={index % 3 === 1 ? 'lg' : 'full'} />
      ))}
    </div>
  );
}
