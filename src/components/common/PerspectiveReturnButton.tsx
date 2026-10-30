
import React from 'react';
import { Role } from '../../types';
import { ArrowRightOnRectangleIcon } from '../icons/ArrowRightOnRectangleIcon';

export const PerspectiveReturnButton: React.FC<{
    role: Role | null;
    isImpersonatedSession?: boolean;
    impersonatorType?: 'super_admin' | 'reseller' | null;
    onReturn: () => void;
    onAccessAlumnaPortal?: (school: any) => void;
    onRestoreSession?: () => void;
    hasCurrentUser?: boolean;
    isPublicView?: boolean;
    hideReturnToLogin?: boolean;
}> = ({ role, isImpersonatedSession, impersonatorType, onReturn, onRestoreSession, hasCurrentUser, isPublicView, hideReturnToLogin }) => {
    if (!role && !isImpersonatedSession && hasCurrentUser) return null;
    if (!hasCurrentUser && !isPublicView) return null;
    if (!hasCurrentUser && hideReturnToLogin) return null;

    const isReseller = impersonatorType === 'reseller';

    return (
        <div className={`fixed ${isPublicView ? 'top-6 right-6 md:bottom-12 md:right-12' : 'bottom-24 left-6'} z-[200] animate-fade-in-up no-print flex flex-col gap-3`}>
            {(role || isImpersonatedSession) && (
                <button
                    onClick={isImpersonatedSession ? onRestoreSession : onReturn}
                    className={`flex items-center gap-0 sm:gap-3 pl-2 pr-2 sm:pr-6 py-2 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform border-2 ${isReseller ? 'border-emerald-500 hover:border-emerald-400' : 'border-indigo-500 hover:border-indigo-400'} group`}
                >
                    <div className={`w-10 h-10 ${isReseller ? 'bg-emerald-600 group-hover:bg-emerald-500' : 'bg-indigo-600 group-hover:bg-indigo-500'} rounded-full flex items-center justify-center shadow-lg transition-colors`}>
                        <ArrowRightOnRectangleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className={`text-[9px] font-black uppercase tracking-widest opacity-80 ${isReseller ? 'text-emerald-200' : 'text-indigo-200'}`}>
                            {isImpersonatedSession ? (isReseller ? 'Reseller Access' : 'System Access') : 'Viewing as'}
                        </p>
                        <p className="text-xs font-black uppercase tracking-tight text-white">
                            {isImpersonatedSession 
                                ? (isReseller ? 'Return to Reseller Portal' : 'Return to Super Admin') 
                                : (role || '').replace('_', ' ')}
                        </p>
                    </div>
                </button>
            )}
            {!hasCurrentUser && (
                <button
                    onClick={onReturn}
                    className="flex items-center gap-0 sm:gap-3 pl-2 pr-2 sm:pr-6 py-2 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform border-2 border-orange-500 group"
                >
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-lg group-hover:bg-orange-500 transition-colors">
                        <ArrowRightOnRectangleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-80 text-orange-200">Public Access</p>
                        <p className="text-xs font-black uppercase tracking-tight text-white">Return to Login</p>
                    </div>
                </button>
            )}
        </div>
    );
};
