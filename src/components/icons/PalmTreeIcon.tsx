
import React from 'react';

export const PalmTreeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4" />
    <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3" />
    <path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.71-.71.71-.71 4.25-4.24c-1.96-1.95-5.28-1.8-7.43.35Z" />
    <path d="M11 15.5c.5 2.5-.17 4.5-1 6.5" />
    <path d="M13 15.5c.5 2.5 1 4.5 3 6.5" />
    <path d="M13 15c5.5 0 9 2.5 9 5.5" />
    <path d="M11 15c-5.5 0-9 2.5-9 5.5" />
  </svg>
);
