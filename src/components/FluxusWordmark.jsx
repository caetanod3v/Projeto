import React from 'react';

export default function FluxusWordmark() {
  return (
    <div className="fluxus-wordmark" aria-label="Fluxus">
      <span className="fluxus-wordmark-text" aria-hidden="true">Fluxus</span>
      <svg className="fluxus-wordmark-current" viewBox="0 0 180 34" preserveAspectRatio="none" aria-hidden="true">
        <path d="M5 18 C28 9 42 9 62 18 S96 27 117 18 S151 9 175 18" />
      </svg>
    </div>
  );
}
