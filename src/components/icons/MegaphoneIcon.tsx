import React from 'react';

export const MegaphoneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.007.51.011.77.011h2.25c.49 0 .97-.067 1.41-.196m-4.43 0a6.78 6.78 0 0 0 1.346 2.333c.342.389.82.551 1.336.452 1.01-.193 1.83-.917 2.1-1.926a3.991 3.991 0 0 0 .145-1.074m-9.18 0c-.3.007-.6.011-.9.011a3 3 0 1 1 0-6c.3 0 .6.004.9.011m0 5.978a15.421 15.421 0 0 0 5.922 2.189m0 0c.304.043.613.076.924.101" />
    </svg>
);

