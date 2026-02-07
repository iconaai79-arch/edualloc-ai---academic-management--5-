import React, { useState, useEffect, useRef } from 'react';
import type { User, AppNotification, Institution, Role } from '../types';
import { NotificationBell } from './NotificationBell';
import { getInitials } from '../utils/stringUtils';
import { ChevronDownIcon, ArrowRightOnRectangleIcon, PencilIcon, ClockIcon } from './icons/index';

interface HeaderProps {
    currentUser: User | null;
    institutionName?: string;
    onLogout: () => void;
    onEditProfile: () => void;
    logoUrl: string | null; // Institutional Logo
    systemLogoUrl: string | null; // Super Admin / System Logo
    applicationTitle?: string;
    notifications: AppNotification[];
    onMarkAsRead: (id?: string) => void;
    currentInstitution?: Institution | null;
    isApiOnline?: boolean;
}

const formatRoleName = (role?: Role, institutionType?: Institution['institutionType']): string => {
    if (!role) return 'User';
    const isSchool = institutionType === 'Primary' || institutionType === 'Secondary';
    if (isSchool) {
        switch (role) {
            case 'head_teacher': case 'admin': return 'Head Teacher';
            case 'deputy': return 'Deputy';
            case 'dos': case 'academics_officer': return 'DOS';
            case 'teacher': case 'lecturer': return 'Teacher';
        }
    }
    switch (role) {
        case 'admin': return 'Chair TTO';
        case 'super_admin': return 'Super Admin';
        case 'lecturer': return 'Lecturer';
        case 'student': return 'Student';
        default: return String(role).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};

const TrialTimer: React.FC<{ trialEndsAt: string }> = ({ trialEndsAt }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number } | null>(null);

    useEffect(() => {
        const calculate = () => {
            const diff = new Date(trialEndsAt).getTime() - new Date().getTime();
            if (diff <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0 });
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            setTimeLeft({ d, h, m });
        };
        calculate();
        const interval = setInterval(calculate, 60000);
        return () => clearInterval(interval);
    }, [trialEndsAt]);

    if (!timeLeft) return null;

    return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm animate-pulse">
            <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Trial:</span>
                <span className="text-[11px] font-mono font-black text-amber-800 dark:text-amber-200">
                    {Number(timeLeft.d)}d {Number(timeLeft.h)}h {Number(timeLeft.m)}m
                </span>
            </div>
        </div>
    );
};

export const Header: React.FC<HeaderProps> = ({ currentUser, institutionName, onLogout, onEditProfile, logoUrl, systemLogoUrl, applicationTitle, notifications, onMarkAsRead, currentInstitution, isApiOnline = true }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!currentUser) return null;

    const showTrialTimer = currentInstitution?.status === 'trial' && currentInstitution.trialEndsAt;

    return (
        <header
            className={`sticky top-0 z-[100] w-full transition-all duration-300 ${isScrolled
                    ? 'bg-white/95 dark:bg-slate-900/95 shadow-md backdrop-blur-md py-2'
                    : 'bg-white dark:bg-slate-900 py-3'
                } border-b border-slate-200 dark:border-slate-800`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {String(applicationTitle || 'EduAi')}
                                </h1>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${isApiOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isApiOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                    {isApiOnline ? 'Live' : 'Offline'}
                                </div>
                            </div>
                        </div>

                        {institutionName && (
                            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700">
                                {systemLogoUrl && (
                                    <div className="flex-shrink-0 h-7 w-7 bg-indigo-50 dark:bg-slate-800 rounded shadow-sm overflow-hidden border border-indigo-100 dark:border-slate-700 p-0.5">
                                        <img src={systemLogoUrl} alt="System Logo" className="h-full w-full object-contain" />
                                    </div>
                                )}

                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                    {String(institutionName)}
                                </p>

                                {logoUrl && (
                                    <div className="flex-shrink-0 h-8 w-8 bg-white dark:bg-slate-800 rounded shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 p-0.5">
                                        <img src={logoUrl} alt="Institution Logo" className="h-full w-full object-contain" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {showTrialTimer && currentInstitution.trialEndsAt && (
                            <div className="hidden sm:block">
                                <TrialTimer trialEndsAt={currentInstitution.trialEndsAt} />
                            </div>
                        )}

                        <NotificationBell notifications={notifications} onMarkAsRead={onMarkAsRead} />

                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex items-center gap-2 p-1 pr-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold overflow-hidden border border-slate-300 dark:border-slate-600">
                                    {currentUser.profilePhotoUrl ? (
                                        <img src={currentUser.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xs">{getInitials(currentUser.name)}</span>
                                    )}
                                </div>
                                <div className="hidden md:block text-left">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</span>
                                </div>
                                <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-2xl bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-[110] overflow-hidden animate-fade-in-up">
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Role</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {formatRoleName(currentUser.role, currentInstitution?.institutionType)}
                                        </p>
                                    </div>
                                    <div className="py-1">
                                        <button onClick={() => { onEditProfile(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-3 transition-colors">
                                            <PencilIcon className="w-4 h-4" /> Edit Profile
                                        </button>
                                        <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors">
                                            <ArrowRightOnRectangleIcon className="w-4 h-4" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};