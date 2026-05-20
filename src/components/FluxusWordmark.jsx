import React from 'react';

export default function FluxusWordmark() {
  return (
    <div className="fluxus-wordmark" aria-label="Fluxus">
      <span className="fluxus-wordmark-text" aria-hidden="true">
        <span>Flu</span>
        <span className="fluxus-wordmark-x">
          <span className="fluxus-x-arm fluxus-x-arm-a" />
          <span className="fluxus-x-arm fluxus-x-arm-b" />
          <span className="fluxus-x-loop" />
        </span>
        <span>us</span>
      </span>
    </div>
  );
}
