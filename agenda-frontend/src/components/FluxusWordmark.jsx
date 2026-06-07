import React from 'react';

export default function FluxusWordmark({ className = '' }) {
  return (
    <div className={`fluxus-wordmark ${className}`.trim()} aria-label="fluxus">
      <span className="fluxus-wordmark-text" aria-hidden="true">fluxus</span>
    </div>
  );
}
