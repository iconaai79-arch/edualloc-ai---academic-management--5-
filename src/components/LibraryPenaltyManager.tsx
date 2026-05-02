
import React, { useState, useEffect } from 'react';
import type { LibraryFine, LibrarySettings, User } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { UserIcon } from './icons/UserIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { apiService } from '../services/apiService';

interface LibraryPenaltyManagerProps {
    institutionId: string;
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const LibraryPenaltyManager: React.FC<LibraryPenaltyManagerProps> = ({
    institutionId,
    onLogAction,
    onDataChange
}) => {
    const [fines, setFines] = useState<LibraryFine[]>([]);
    const [settings, setSettings] = useState<LibrarySettings>({
        overdueFinePerDay: 0,
        maxBooksPerUser: 3,
        reservationExpiryDays: 3,
        defaultLendingPeriodDays: 14,
        institutionId
    });
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [finesData, settingsData, usersData] = await Promise.all([
                apiService.fetchModuleRecords<LibraryFine>('library_fines', institutionId),
                apiService.fetchModuleRecords<LibrarySettings>('library_settings', institutionId),
                apiService.fetchUsers(institutionId)
            ]);
            setFines(finesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            if (settingsData.length > 0) setSettings(settingsData[0]);
            setUsers(usersData);
        } catch (error) {
            console.error('Error loading penalty data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await apiService.saveModuleRecord('library_settings', settings);
            await onLogAction('Updated Library Penalty Settings');
            onDataChange();
        } catch (error) {
            alert('Failed to save settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSettleFine = async (fine: LibraryFine, amount: number) => {
        if (amount <= 0) return;
        try {
            const newPaid = fine.paidAmount + amount;
            const newStatus = newPaid >= fine.amount ? 'paid' : 'partially_paid';

            await apiService.saveModuleRecord('library_fines', {
                ...fine,
                paidAmount: newPaid,
                status: newStatus,
                updatedAt: new Date().toISOString()
            });

            await onLogAction(`Processed fine payment of KES ${amount} for user ${fine.userId}`);
            loadData();
            onDataChange();
        } catch (error) {
            alert('Payment processing failed.');
        }
    };

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';
    const getUserStaffId = (id: string) => users.find(u => u.id === id)?.staffId || 'N/A';

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Penalty Configuration */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm sticky top-28">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl shadow-sm">
                                <SettingsIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Lending Policy</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Overdue Rate (Per Day)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KES</div>
                                    <input
                                        type="number"
                                        value={settings.overdueFinePerDay}
                                        onChange={(e) => setSettings({ ...settings, overdueFinePerDay: parseFloat(e.target.value) })}
                                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-rose-500 rounded-2xl text-sm font-black transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Standard Lending Term (Days)</label>
                                <input
                                    type="number"
                                    value={settings.defaultLendingPeriodDays}
                                    onChange={(e) => setSettings({ ...settings, defaultLendingPeriodDays: parseInt(e.target.value) })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-black transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Max Books per User</label>
                                <input
                                    type="number"
                                    value={settings.maxBooksPerUser}
                                    onChange={(e) => setSettings({ ...settings, maxBooksPerUser: parseInt(e.target.value) })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-black transition-all"
                                />
                            </div>

                            <div className="pt-8">
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                    className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 hover:translate-y-[-2px] disabled:opacity-50"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    {savingSettings ? 'Synchronizing...' : 'Enforce Policy Changes'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-12 p-6 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                            <div className="flex items-center gap-2 mb-3">
                                <ShieldIcon className="w-4 h-4 text-rose-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600">Integrity Protocol</h4>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">Fines are automatically triggered upon overdue book retrieval. Policy updates apply only to future lending activity.</p>
                        </div>
                    </div>
                </div>

                {/* Fine Registry */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[600px]">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Dues Registry</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Outstanding & Paid Penalties</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-800">
                                    Pending: KES {fines.filter(f => f.status !== 'paid').reduce((acc, f) => acc + (f.amount - f.paidAmount), 0).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Context</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Due Amount</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Settlement</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {fines.map(fine => (
                                        <tr key={fine.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-lg flex items-center justify-center">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{getUserName(fine.userId)}</p>
                                                        <p className="text-[9px] font-bold text-slate-400">{getUserStaffId(fine.userId)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed">{fine.description}</p>
                                                <p className="text-[8px] font-mono text-slate-400 mt-1 uppercase">{new Date(fine.createdAt).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-black text-slate-900 dark:text-white">KES {fine.amount.toFixed(2)}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 w-20 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${fine.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'} transition-all`}
                                                            style={{ width: `${(fine.paidAmount / fine.amount) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${fine.status === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {fine.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {fine.status !== 'paid' ? (
                                                    <button
                                                        onClick={() => {
                                                            const amt = prompt(`Enter payment amount (Outstanding: KES ${(fine.amount - fine.paidAmount).toFixed(2)})`, (fine.amount - fine.paidAmount).toString());
                                                            if (amt) handleSettleFine(fine, parseFloat(amt));
                                                        }}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-all hover:scale-105"
                                                    >
                                                        Clear Due
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2 text-emerald-500">
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Settled</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {fines.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                                                No penalty records found in registry
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

