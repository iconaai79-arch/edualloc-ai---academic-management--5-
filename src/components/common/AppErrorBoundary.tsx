
import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons';

export const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error("Global Error Caught:", event.error);
            setHasError(true);
            setError(event.error);
        };
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-center">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <XIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Application Error</h2>
                    <p className="text-slate-500 mb-6 text-sm">{error?.message || "A critical error occurred while loading the portal."}</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98]">
                        Reload System
                    </button>
                </div>
            </div>
        );
    }
    return <>{children}</>;
};
