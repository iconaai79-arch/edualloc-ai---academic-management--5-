import React, { useState, useMemo } from 'react';
import type { Institution, Role } from '../types';
import { 
    DownloadIcon, 
    SmartphoneIcon, 
    SparklesIcon, 
    XIcon, 
    CheckIcon, 
    DocumentTextIcon, 
    GlobeAltIcon,
    ArrowUpTrayIcon
} from './icons';

interface InstallAppButtonProps {
    currentInstitution?: Institution | null;
    activeRole?: Role;
    applicationTitle?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
    currentInstitution,
    activeRole,
    applicationTitle = 'EduAI',
    logoUrl,
    primaryColor = '#4f46e5',
    className = ''
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copiedState, setCopiedState] = useState<'url' | 'downloaded' | ''>('');
    const [activeTab, setActiveTab] = useState<'desktop' | 'mobile' | 'deep_link'>('desktop');

    // Dynamically resolve context-aware application title & target start URL based on module
    const { appTitle, targetUrl, iconUrl } = useMemo(() => {
        const instName = currentInstitution?.name || applicationTitle;
        const type = currentInstitution?.institutionType?.toLowerCase() || '';
        const cat = currentInstitution?.category?.toLowerCase() || '';
        const hasDS = currentInstitution?.moduleStates?.some(m => m.moduleId === 'driving_school' && (m.status === 'active' || m.status === 'trial')) || 
                      type.includes('driving school') || 
                      cat.includes('driving school') ||
                      activeRole === 'driving_instructor';

        let resolvedTitle = `${instName} App`;
        let resolvedIcon = logoUrl || '/favicon.png';

        if (hasDS) {
            resolvedTitle = `${instName} Driving School`;
            resolvedIcon = logoUrl || '/driving_school_logo_3d.png';
        } else if (activeRole === 'pharmacist' || type === 'pharmacy') {
            resolvedTitle = `${instName} Pharmacy Terminal`;
            resolvedIcon = logoUrl || '/favicon.png';
        } else if (type === 'his' || activeRole === 'his_admin') {
            resolvedTitle = `${instName} Health System`;
        } else if (activeRole) {
            const prettyRole = activeRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            resolvedTitle = `${instName} ${prettyRole}`;
        }

        // Construct stable robust Start URL retaining query variables
        const origin = window.location.origin;
        const searchParams = new URLSearchParams();
        if (activeRole) searchParams.set('role', activeRole);
        if (currentInstitution?.id) searchParams.set('institutionId', currentInstitution.id);
        
        const queryString = searchParams.toString();
        const fullUrl = queryString ? `${origin}/?${queryString}` : `${origin}/`;

        return {
            appTitle: resolvedTitle,
            targetUrl: fullUrl,
            iconUrl: resolvedIcon
        };
    }, [currentInstitution, activeRole, applicationTitle, logoUrl]);

    const handleInstallClick = async () => {
        const deferredPrompt = window.__deferredInstallPrompt;
        if (deferredPrompt) {
            try {
                // Prompt pre-validated native browser installation interface directly
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    window.__deferredInstallPrompt = null;
                }
                return;
            } catch (err) {
                console.error('[Install Trigger] Native launch failure, deploying smart overlay:', err);
            }
        }
        
        // Native triggers exhausted or device out-of-scope: Open Advanced Setup Guide overlay
        setIsModalOpen(true);
    };

    const downloadDesktopShortcut = () => {
        const urlContent = `[InternetShortcut]\nURL=${targetUrl}\nIconIndex=0\n`;
        const blob = new Blob([urlContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const safeTitle = appTitle.replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `${safeTitle}.url`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setCopiedState('downloaded');
        setTimeout(() => setCopiedState(''), 3000);
    };

    const copyDeepLink = () => {
        navigator.clipboard.writeText(targetUrl);
        setCopiedState('url');
        setTimeout(() => setCopiedState(''), 3000);
    };

    return (
        <>
            <button
                onClick={handleInstallClick}
                title={`Install ${appTitle} Shortcut`}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-300 border shadow-sm group active:scale-95 ${className || 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:shadow-md'}`}
            >
                <div className="relative">
                    <SmartphoneIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                </div>
                <span>Install Shortcut</span>
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl relative text-left flex flex-col max-h-[90vh]">
                        {/* Header Banner */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img src={iconUrl} alt="App Icon" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.png'; }} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                                        {appTitle}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mt-0.5 flex items-center gap-1">
                                        <SparklesIcon className="w-3 h-3" /> Module Context Installation
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Module Content Layout */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Segment Selector */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                                <button
                                    onClick={() => setActiveTab('desktop')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'desktop' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                >
                                    Desktop
                                </button>
                                <button
                                    onClick={() => setActiveTab('mobile')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'mobile' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                >
                                    Phone / Tablet
                                </button>
                                <button
                                    onClick={() => setActiveTab('deep_link')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'deep_link' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                >
                                    Deep Link
                                </button>
                            </div>

                            {activeTab === 'desktop' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-200">Instant Windows Shortcut (.url)</h4>
                                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1">Download an execution package to launch directly into your personalized context from your workspace desktop.</p>
                                        </div>
                                        <button
                                            onClick={downloadDesktopShortcut}
                                            className="flex-shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 w-full sm:w-auto justify-center"
                                        >
                                            {copiedState === 'downloaded' ? (
                                                <>
                                                    <CheckIcon className="w-4 h-4 text-emerald-300" />
                                                    <span>Downloaded!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <DownloadIcon className="w-4 h-4" />
                                                    <span>Get .url Link</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Browser Manual Integration</h5>
                                        <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-decimal pl-4">
                                            <li>Navigate to the top right of your browser interface.</li>
                                            <li>Select <strong className="text-slate-800 dark:text-slate-200">More Tools</strong> or <strong className="text-slate-800 dark:text-slate-200">Save and share</strong>.</li>
                                            <li>Choose <strong className="text-slate-800 dark:text-slate-200">Create shortcut...</strong> or <strong className="text-slate-800 dark:text-slate-200">Install page as an app</strong>.</li>
                                            <li>Ensure the module view retains its deep connection.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'mobile' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded">
                                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                                </div>
                                                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Apple iOS / Safari</h5>
                                            </div>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Tap the <strong className="text-slate-700 dark:text-slate-300">Share</strong> navigation trigger at the bottom header, scroll down and pick <strong className="text-indigo-600 dark:text-indigo-400">Add to Home Screen</strong>.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">
                                                    <GlobeAltIcon className="w-4 h-4" />
                                                </div>
                                                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Android / Chrome</h5>
                                            </div>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Open the action header menu (<strong className="text-slate-700 dark:text-slate-300">⋮</strong>) in the browser toolbar and activate <strong className="text-indigo-600 dark:text-indigo-400">Add to Home screen</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-3">
                                        <SparklesIcon className="w-5 h-5 flex-shrink-0 text-amber-500" />
                                        <span>Shortcuts added directly to your operating system retain local sessions securely.</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'deep_link' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Direct Module Access Routing</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={targetUrl}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none select-all"
                                            />
                                            <button
                                                onClick={copyDeepLink}
                                                className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-all rounded-xl text-xs font-black uppercase tracking-wider flex-shrink-0 flex items-center gap-1 active:scale-95"
                                            >
                                                {copiedState === 'url' ? (
                                                    <>
                                                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <DocumentTextIcon className="w-3.5 h-3.5" />
                                                        <span>Copy Link</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1.5 italic">Save this dynamic URL routing config inside browser bookmarks for continuous instantaneous load.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-center">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Acknowledge & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
