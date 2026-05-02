
import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, className }) => {
  return (
    <div className={`relative flex items-center group ${className || ''}`}>
      {children}
      <div 
        role="tooltip"
        className="absolute bottom-full mb-2 w-64 p-3 text-sm text-white bg-slate-800 dark:bg-slate-900 rounded-lg shadow-lg 
                   invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300
                   z-[100] pointer-events-none"
      >
        {text}
        <svg className="absolute text-slate-800 dark:text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
          <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
        </svg>
      </div>
    </div>
  );
};

