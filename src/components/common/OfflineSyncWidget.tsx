import React, { useState, useEffect } from 'react';
import { syncEngine } from '../../services/syncEngine';
import { localDb } from '../../services/localDb';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { GlobeAltIcon } from '../icons/GlobeAltIcon';
import { ShieldExclamationIcon } from '../icons/ShieldExclamationIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface OfflineSyncWidgetProps {
    institutionId: string;
}

export const OfflineSyncWidget: React.FC<OfflineSyncWidgetProps> = ({ institutionId }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlineEnabled, setOfflineEnabled] = useState(localStorage.getItem('eduai_offline_enabled') === 'true');
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [showStatusTooltip, setShowStatusTooltip] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Process queue immediately when network recovers
            syncEngine.processQueue().catch(err => console.error('[SyncWidget] Auto-sync queue failure:', err));
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleEnableOffline = async () => {
        if (!isOnline) {
            setErrorMsg('Connection required to enable offline database.');
            return;
        }
        setSyncing(true);
        setErrorMsg('');
        setProgress(0);

        try {
            await syncEngine.fetchAndCacheTenantData(institutionId, (p) => {
                setProgress(p);
            });
            localStorage.setItem('eduai_offline_enabled', 'true');
            setOfflineEnabled(true);
        } catch (err: any) {
            setErrorMsg(err.message || 'Synchronization failed.');
        } finally {
            setSyncing(false);
        }
    };

    const handleDisableOffline = async () => {
        if (window.confirm('Disable offline access? This will delete your locally cached data.')) {
            await localDb.clearAll();
            localStorage.removeItem('eduai_offline_enabled');
            setOfflineEnabled(false);
        }
    };

    return (
        <div className="relative flex items-center gap-3">
            {/* Connection Badge Indicator */}
            <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer select-none bg-slate-800 border border-slate-700 hover:border-slate-600"
                onClick={() => setShowStatusTooltip(!showStatusTooltip)}
            >
                {isOnline ? (
                    <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 absolute"></span>
                        <GlobeAltIcon className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                        <span className="text-emerald-400">Online</span>
                    </>
                ) : (
                    <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <ShieldExclamationIcon className="w-3.5 h-3.5 text-amber-400 ml-1" />
                        <span className="text-amber-400">Offline Mode</span>
                    </>
                )}
            </div>

            {/* Offline Control Button / Dropdown Popover */}
            {showStatusTooltip && (
                <div className="absolute right-0 top-12 z-50 w-80 bg-slate-900 border border-slate-700/60 rounded-[2rem] shadow-2xl p-6 animate-fade-in-up text-slate-100 font-sans">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Offline Capabilities</h4>
                    
                    {syncing ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <ArrowPathIcon className="w-5 h-5 text-indigo-400 animate-spin" />
                                <span className="text-xs font-medium text-slate-300">Synchronizing database...</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-slate-500 tracking-widest uppercase">
                                <span>Caching Data</span>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    ) : offlineEnabled ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-950/20 border border-emerald-800/20 text-emerald-400">
                                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs font-bold leading-tight">Offline Mode Configured! You can safely disconnect.</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={handleEnableOffline}
                                    disabled={!isOnline}
                                    className="w-full text-xs font-black uppercase py-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    Force Refresh Cache
                                </button>
                                <button 
                                    onClick={handleDisableOffline}
                                    className="w-full text-xs font-black uppercase py-3 rounded-xl bg-red-950/20 hover:bg-red-900/10 text-red-400 border border-red-900/30 transition-all active:scale-[0.98]"
                                >
                                    Disable Offline Mode
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Install the app locally and cache your workspace records to work without internet. Actions sync automatically when you return online.
                            </p>
                            {errorMsg && (
                                <p className="text-red-400 text-[11px] font-semibold">{errorMsg}</p>
                            )}
                            <button
                                onClick={handleEnableOffline}
                                disabled={!isOnline}
                                className="w-full text-xs font-black uppercase py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 transition-all active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed"
                            >
                                Enable Offline Mode (1-Click)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
