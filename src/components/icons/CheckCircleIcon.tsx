import React from 'react';

export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <defs>
        <style>
        {`
            .animated-check-circle {
                stroke-dasharray: 57; /* 2 * PI * 9 */
                stroke-dashoffset: 57;
                animation: draw-circle 0.5s ease-out forwards;
            }
            .animated-check-mark {
                stroke-dasharray: 10;
                stroke-dashoffset: 10;
                animation: draw-check 0.4s ease-out forwards 0.4s;
            }
            @keyframes draw-circle {
                to {
                    stroke-dashoffset: 0;
                }
            }
            @keyframes draw-check {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `}
        </style>
    </defs>
    <path className="animated-check-circle" strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path className="animated-check-mark" strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
  </svg>
);
