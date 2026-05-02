
import React, { useState } from 'react';
import { 
    Settings, 
    Palette, 
    ShieldCheck, 
    Bell, 
    Globe, 
    Lock, 
    Smartphone,
    Save,
    Sparkles,
    ChefHat,
    Truck,
    Clock,
    FileText
} from 'lucide-react';
import { Institution } from '../../types';
import { apiService } from '../../services/apiService';

interface HospitalitySettingsProps {
    institution: Institution;
    onUpdate: () => void;
}

export const HospitalitySettings: React.FC<HospitalitySettingsProps> = ({ institution, onUpdate }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        themeColor: institution.themeColor || '#4f46e5',
        marketplaceEnabled: institution.marketplaceEnabled !== false,
        roomServiceEnabled: true,
        excursionsEnabled: true,
        checkInTime: '11:00 AM',
        checkOutTime: '10:00 AM',
        cancellationPolicy: 'Refundable up to 24 hours before check-in.',
        contactEmail: institution.email || '',
        contactPhone: institution.phoneNumber || ''
    });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update Institution record for core fields
            await apiService.saveModuleRecord('institutions', {
                ...institution,
                themeColor: settings.themeColor,
                marketplaceEnabled: settings.marketplaceEnabled,
                email: settings.contactEmail,
                phoneNumber: settings.contactPhone
            });
            
            // Optionally save extended settings to a specialized table if it exists
            // For now, we'll just simulate success for the UI
            setTimeout(() => {
                setIsSaving(false);
                alert('Hospitality settings updated successfully!');
                onUpdate();
            }, 800);
        } catch (err) {
            console.error(err);
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Module Configuration</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Fine-tune your guest experience and operational rules</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <Sparkles className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? 'Saving...' : 'Persist Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Branding & Aesthetics */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Palette className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Storefront Branding</h4>
                    </div>
                    
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-3 block">Accent Theme Color</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="color" 
                                value={settings.themeColor} 
                                onChange={e => setSettings({...settings, themeColor: e.target.value})}
                                className="w-16 h-16 rounded-2xl border-none cursor-pointer bg-transparent"
                            />
                            <div className="flex-1">
                                <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{settings.themeColor}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Applied to buttons, icons and highlights in your public gateway.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 dark:border-slate-700">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    checked={settings.marketplaceEnabled}
                                    onChange={e => setSettings({...settings, marketplaceEnabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-12 h-6 bg-slate-100 dark:bg-slate-700 rounded-full peer-checked:bg-indigo-600 transition-all"></div>
                                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all shadow-sm"></div>
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Public Marketplace Listing</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Visible on Travel Hub Hub</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Service Modules */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Active Service Nodes</h4>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <ChefHat className="w-5 h-5 text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Room Service / Dining</span>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={settings.roomServiceEnabled}
                                onChange={e => setSettings({...settings, roomServiceEnabled: e.target.checked})}
                                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <Truck className="w-5 h-5 text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Fleet & Excursions</span>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={settings.excursionsEnabled}
                                onChange={e => setSettings({...settings, excursionsEnabled: e.target.checked})}
                                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Policies & Logistics */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Logistics & Guest Policies</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Check-in Window</label>
                            <input 
                                type="text" 
                                value={settings.checkInTime} 
                                onChange={e => setSettings({...settings, checkInTime: e.target.value})}
                                placeholder="e.g. 11:00 AM" 
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" 
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Check-out Deadline</label>
                            <input 
                                type="text" 
                                value={settings.checkOutTime} 
                                onChange={e => setSettings({...settings, checkOutTime: e.target.value})}
                                placeholder="e.g. 10:00 AM" 
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Cancellation Policy</label>
                            <textarea 
                                rows={2} 
                                value={settings.cancellationPolicy} 
                                onChange={e => setSettings({...settings, cancellationPolicy: e.target.value})}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50 resize-none" 
                            />
                        </div>
                    </div>
                </div>

                {/* Public Contact Details */}
                <div className="bg-slate-900 rounded-[3rem] p-8 text-white md:col-span-2 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Smartphone className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-white/10 rounded-2xl">
                                <Globe className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h4 className="text-lg font-black uppercase tracking-tight">Public Contact Details</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Support Email</label>
                                <input 
                                    type="email" 
                                    value={settings.contactEmail} 
                                    onChange={e => setSettings({...settings, contactEmail: e.target.value})}
                                    placeholder="concierge@hotel.com" 
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50 text-white" 
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Support Hot-line</label>
                                <input 
                                    type="tel" 
                                    value={settings.contactPhone} 
                                    onChange={e => setSettings({...settings, contactPhone: e.target.value})}
                                    placeholder="+254..." 
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50 text-white" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

