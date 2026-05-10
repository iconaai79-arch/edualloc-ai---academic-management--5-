import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InfoIcon, AlertTriangleIcon, XIcon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

export const Toast: React.FC<ToastMessage & { onClose: (id: string) => void }> = ({ id, message, type, duration = 5000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const icons = {
        success: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />,
        error: <XCircleIcon className="w-5 h-5 text-red-500" />,
        info: <InfoIcon className="w-5 h-5 text-blue-500" />,
        warning: <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50',
        error: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50',
        info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50',
        warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50'
    };

    return (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border shadow-lg animate-slide-in-right ${bgColors[type]} max-w-md w-full pointer-events-auto transition-all`}>
            <div className="shrink-0">{icons[type]}</div>
            <p className="flex-grow text-sm font-bold text-slate-800 dark:text-slate-200">{message}</p>
            <button onClick={() => onClose(id)} className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                <XIcon className="w-4 h-4 text-slate-400" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-md px-6 sm:px-0">
            {toasts.map(t => <Toast key={t.id} {...t} onClose={onClose} />)}
        </div>
    );
};
