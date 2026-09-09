import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, AppNotification, Institution, Role } from '../types';
import { NotificationBell } from './NotificationBell';
import { InstallAppButton } from './InstallAppButton';
import { OfflineSyncWidget } from './common/OfflineSyncWidget';
import { getInitials } from '../utils/stringUtils';
import { formatRoleDisplayName, isEduInstitution, isHISInstitution } from '../utils/roleUtils';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ClockIcon } from './icons/ClockIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BeakerIcon } from './icons/BeakerIcon';

interface HeaderProps {
    currentUser: User | null;
    institutionName?: string;
    onLogout: () => void;
    onEditProfile?: () => void;
    logoUrl?: string | null;
    systemLogoUrl?: string | null;
    applicationTitle?: string;
    notifications?: AppNotification[];
    onMarkAsRead?: (id?: string) => void;
    currentInstitution?: Institution | null;
    isApiOnline?: boolean;
    activeRole?: Role;
    onSwitchRole?: (role: Role) => void;
    onExitPerspective?: () => void;
    onToggleHealthSystem?: () => void;
    isHealthSystemOpen?: boolean;
    onTogglePharmacySystem?: () => void;
    isPharmacySystemOpen?: boolean;
    primaryColor?: string;
    secondaryColor?: string;
    hidePerspectiveSwitcher?: boolean;
    androidUrl?: string;
    onOpenShowcase?: () => void;
    onAcknowledgeVisitorMet?: (notification: AppNotification) => void;
}

const formatRoleName = (role?: Role, institution?: Institution | null): string => {
    if (!role) return 'User';
    return formatRoleDisplayName(role, institution);
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

export const Header: React.FC<HeaderProps> = ({ 
    currentUser, institutionName, onLogout, onEditProfile, logoUrl, systemLogoUrl, 
    applicationTitle, notifications, onMarkAsRead, currentInstitution, 
    isApiOnline = true, activeRole, onSwitchRole, onExitPerspective, 
    onToggleHealthSystem, isHealthSystemOpen, onTogglePharmacySystem, isPharmacySystemOpen, primaryColor, secondaryColor,
    hidePerspectiveSwitcher, androidUrl, onOpenShowcase, onAcknowledgeVisitorMet
}) => {
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

    const availableRoles = useMemo(() => {
        if (!currentUser) return [];

        // Ensure we always have an array to filter
        const rawRoles = Array.isArray(currentUser.roles)
            ? currentUser.roles
            : (currentUser.role ? [currentUser.role] : []);

        const roles = rawRoles.filter(r => r != null && r !== undefined);

        // Ensure primary role is included
        if (currentUser.role && !roles.includes(currentUser.role)) {
            roles.unshift(currentUser.role);
        }
        return [...new Set(roles)];
    }, [currentUser]);

    if (!currentUser) return null;

    const showTrialTimer = currentInstitution?.status === 'trial' && currentInstitution.trialEndsAt;

    return (
        <header
            className={`sticky top-0 z-[100] w-full transition-all duration-300 ${isScrolled
                ? 'bg-white/95 dark:bg-slate-900/95 shadow-md backdrop-blur-md py-2'
                : 'bg-white dark:bg-slate-900 py-3'
                } border-b border-slate-200 dark:border-slate-800`}
            style={{ borderTop: primaryColor ? `4px solid ${primaryColor}` : undefined }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {String(applicationTitle || 'EduAi')}
                                </h1>
                                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${isApiOnline || (typeof navigator !== 'undefined' && navigator.onLine) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isApiOnline || (typeof navigator !== 'undefined' && navigator.onLine) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse' : 'bg-rose-400'}`}></span>
                                    {isApiOnline || (typeof navigator !== 'undefined' && navigator.onLine) ? 'Live' : 'Offline'}
                                </div>
                            </div>
                        </div>

                        {institutionName && (
                            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700">
                                {systemLogoUrl && (
                                    <div 
                                        className="flex-shrink-0 h-7 w-7 bg-indigo-50 dark:bg-slate-800 rounded shadow-sm overflow-hidden border border-indigo-100 dark:border-slate-700 p-0.5"
                                        style={{ borderColor: primaryColor ? `${primaryColor}20` : undefined, backgroundColor: primaryColor ? `${primaryColor}10` : undefined }}
                                    >
                                        <img loading="lazy" src={systemLogoUrl} alt="System Logo" className="h-full w-full object-contain" />
                                    </div>
                                )}

                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                    {String(institutionName)}
                                </p>

                                {logoUrl && (
                                    <div className="flex-shrink-0 h-8 w-8 bg-white dark:bg-slate-800 rounded shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 p-0.5">
                                        <img loading="lazy" src={logoUrl} alt="Institution Logo" className="h-full w-full object-contain" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {onExitPerspective && (
                            <button
                                onClick={onExitPerspective}
                                className="flex items-center gap-2 px-4 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100 dark:border-red-800 hover:bg-red-100 transition-all shadow-sm active:scale-95 animate-pulse"
                            >
                                <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
                                Exit Perspective
                            </button>
                        )}
                        {showTrialTimer && currentInstitution.trialEndsAt && (
                            <div className="hidden sm:block">
                                <TrialTimer trialEndsAt={currentInstitution.trialEndsAt} />
                            </div>
                        )}

                        {isHISInstitution(currentInstitution, activeRole) && (() => {
                            const isPropertyManagement = activeRole === 'property_admin' || 
                                                         activeRole === 'landlord' || 
                                                         activeRole === 'tenant' || 
                                                         currentInstitution?.businessSubType?.toLowerCase().includes('property management') ||
                                                         currentInstitution?.institutionType?.toLowerCase().includes('property management');
                            
                            if (isPropertyManagement) return null;

                            return (
                                <button
                                    onClick={onToggleHealthSystem}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm active:scale-95 ${
                                        isHealthSystemOpen 
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20' 
                                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100'
                                    }`}
                                >
                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    {isHealthSystemOpen ? 'Core ERP' : 'Health System'}
                                </button>
                            );
                        })()}

                        {(() => {
                            const isPharmacist = activeRole === 'pharmacist' || 
                                                activeRole === 'pharmacy_admin' ||
                                                currentInstitution?.institutionType === 'Pharmacy' ||
                                                currentInstitution?.institutionType === 'HIS';
                            
                            if (!isPharmacist) return null;

                            return (
                                <button
                                    onClick={onTogglePharmacySystem}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm active:scale-95 ${
                                        isPharmacySystemOpen 
                                        ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20' 
                                        : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800 hover:bg-rose-100'
                                    }`}
                                >
                                    <BeakerIcon className="w-3.5 h-3.5 text-rose-400" />
                                    {isPharmacySystemOpen ? 'Global Dashboard' : 'Pharmacy Terminal'}
                                </button>
                            );
                        })()}

                        <InstallAppButton
                            currentInstitution={currentInstitution}
                            activeRole={activeRole}
                            applicationTitle={applicationTitle}
                            logoUrl={logoUrl}
                            primaryColor={primaryColor}
                            androidUrl={androidUrl}
                        />

                        {currentInstitution && (
                            <OfflineSyncWidget institutionId={currentInstitution.id} />
                        )}

                        <NotificationBell 
                            notifications={notifications || []} 
                            onMarkAsRead={onMarkAsRead || (() => {})} 
                            currentUser={currentUser} 
                            onAcknowledgeVisitorMet={onAcknowledgeVisitorMet}
                        />

                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex items-center gap-2 p-1 pr-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold overflow-hidden border border-slate-300 dark:border-slate-600">
                                    {currentUser?.profilePhotoUrl ? (
                                        <img loading="lazy" src={currentUser.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xs">{getInitials(currentUser?.name)}</span>
                                    )}
                                </div>
                                <div className="hidden md:block text-left">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[100px]">{(currentUser?.name || 'User').split(' ')[0]}</span>
                                </div>
                                <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-[110] overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-700">
                                     {!hidePerspectiveSwitcher && (
                                        <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Available Roles</p>
                                            <div className="space-y-2">
                                                {availableRoles.map((r: Role) => (
                                                    <button
                                                        key={r}
                                                        disabled={activeRole === r}
                                                        onClick={() => { onSwitchRole?.(r as Role); setIsMenuOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all flex items-center justify-between group ${activeRole === r ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                    >
                                                        {formatRoleName(r as Role, currentInstitution)}
                                                        {activeRole === r && (
                                                            <div 
                                                                className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" 
                                                                style={{ backgroundColor: activeRole === r ? 'white' : primaryColor }}
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-1 px-2">
                                        {onOpenShowcase && (
                                            <button onClick={() => { onOpenShowcase(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 transition-colors rounded-xl">
                                                <SparklesIcon className="w-4 h-4 text-indigo-500" /> Platform Showcase
                                            </button>
                                        )}
                                        {onEditProfile && (
                                            <button onClick={() => { onEditProfile(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-3 transition-colors rounded-xl">
                                                <PencilIcon className="w-4 h-4" /> Edit Profile
                                            </button>
                                        )}
                                        <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors rounded-xl">
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

