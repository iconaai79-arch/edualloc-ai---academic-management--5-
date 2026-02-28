import React from 'react';

export const WrenchIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.423 5.281a4.5 4.5 0 0 0-6.426 5.406m13.42 4.602a4.5 4.5 0 0 1-5.406 6.426m-.539-7.538 3.536-3.536m-3.536 3.536 3.536 3.536m-3.536-3.536-3.536-3.536m3.536 3.536-3.536 3.536" />
    </svg>
);
