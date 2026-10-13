import React from 'react';
import logoSvg from '../../assets/logo.svg';

export function CollegeLogo({ className = "w-12 h-12", watermark = false }) {
  if (watermark) {
    return (
      <div className={`pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.06] overflow-hidden ${className}`}>
        <img
          src={logoSvg}
          alt="Watermark"
          className="w-96 h-96 object-contain grayscale"
        />
      </div>
    );
  }

  return (
    <img
      src={logoSvg}
      alt="JMT Public Higher Secondary School & College"
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
