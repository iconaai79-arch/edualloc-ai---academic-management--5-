import React from 'react';
export const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125V11.25c0-.447-.406-.813-.854-.813h-3.105a2.25 2.25 0 0 1-1.927-1.089l-1.06-1.764a2.25 2.25 0 0 0-1.927-1.089h-3.105c-.448 0-.854.366-.854.813V14.25m12 0 .45-9h1.125c.448 0 .854.366.854.813V14.25m-14.4 0h14.4" />
    </svg>
);
