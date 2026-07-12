import React from 'react';

interface IconProps {
    className?: string;
}

export const BuildingLibraryIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 21h20" />
        <path d="M3 21V7l9-4 9 4v14" />
        <path d="M9 21v-6h6v6" />
        <path d="M6 10.5v1" />
        <path d="M10 10.5v1" />
        <path d="M14 10.5v1" />
        <path d="M18 10.5v1" />
        <path d="M6 14.5v1" />
        <path d="M18 14.5v1" />
        <path d="M2 7h20" />
    </svg>
);
