import React from 'react';
import '../styles/substation-brand.css';

/** One wordmark and lightning animation shared by every application surface. */
export function SubstationBrand({ variant = 'compact', onClick }: { variant?: 'opening' | 'compact' | 'mini' | 'auth'; onClick?: () => void }) {
  const content = <>
    <span className="sas-thunder-badge" aria-hidden="true">
      <svg className="sas-thunder-arcs" viewBox="0 0 64 64" fill="none"><path d="M7 13 17 20 12 25 23 29 M48 7 43 18 51 17 45 28 M42 40 52 43 47 49 57 54 M20 44 12 48 16 53 8 58" /></svg>
      <svg className="sas-thunder-bolt" viewBox="0 0 64 64"><path d="M37 10 17 35H30L25 54 49 27H35L37 10Z" /></svg>
    </span>
    <span className="sas-brand-wordmark"><strong>Substation</strong><span>Automation</span></span>
  </>;
  return onClick
    ? <button type="button" className={`sas-unified-brand sas-brand--${variant}`} data-brand="substation" aria-label="Open substation workspace" onClick={onClick}>{content}</button>
    : <span className={`sas-unified-brand sas-brand--${variant}`} data-brand="substation">{content}</span>;
}
