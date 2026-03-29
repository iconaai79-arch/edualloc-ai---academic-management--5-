import React, { useState } from 'react';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ArrowsPointingOutIcon } from './icons/ArrowsPointingOutIcon';
import { ArrowsPointingInIcon } from './icons/ArrowsPointingInIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface ExternalModuleViewProps {
    url: string;
    title: string;
    description?: string;
}

export const ExternalModuleView: React.FC<ExternalModuleViewProps> = ({ url, title, description }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [key, setKey] = useState(0);

    const refreshFrame = () => setKey(prev => prev + 1);

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : ''}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                        <GlobeAltIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic">{title}</h2>
                        {description && <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{description}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={refreshFrame}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-600 transition-all group"
                        title="Refresh Module"
                    >
                        <ArrowPathIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <button 
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-600 transition-all group"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
                    >
                        {isFullscreen ? <ArrowsPointingInIcon className="w-5 h-5" /> : <ArrowsPointingOutIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Iframe Content */}
            <div className="flex-grow bg-slate-100 dark:bg-black relative">
                <iframe 
                    key={key}
                    src={url}
                    title={title}
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
                
                {/* Visual Polish - Gradient Overlay at bottom */}
                {!isFullscreen && (
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none"></div>
                )}
            </div>
        </div>
    );
};
