
import React, { useState } from 'react';
import { 
    Link2, 
    Copy, 
    ExternalLink, 
    Globe, 
    ShieldCheck, 
    Eye, 
    EyeOff, 
    Check, 
    Info,
    Layout,
    Navigation,
    Share2,
    Zap,
    MapPin,
    GraduationCap,
    Palmtree,
    ShoppingCart,
    Users
} from 'lucide-react';
import type { CompanyDetails } from '../types';

interface PortalLinksManagerProps {
    companyDetails: CompanyDetails | null;
    onUpdateSettings: (settings: any) => void;
}

export const PortalLinksManager: React.FC<PortalLinksManagerProps> = ({ companyDetails, onUpdateSettings }) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const baseUrl = window.location.origin;

    const portals = [
        {
            key: 'showAlumnaeHub',
            label: 'Alumnae Network (Registration)',
            description: 'Independent registration portal for institutional graduates.',
            url: `${baseUrl}/?view=alumnae_register`,
            icon: GraduationCap,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            key: 'showAlumnaeSocial',
            label: 'Alumnae Social Portal',
            description: 'Direct link to the social feed and networking hub.',
            url: `${baseUrl}/?view=alumnae_social`,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            key: 'showTouristHub',
            label: 'Tourism & Travel Hub',
            description: 'Public marketplace for hotels, safaris, and local experiences.',
            url: `${baseUrl}/?view=travel`,
            icon: Palmtree,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            key: 'showMarketplace',
            label: 'Property Marketplace',
            description: 'Direct access to real estate listings and car showroom portals.',
            url: `${baseUrl}/?view=marketplace`,
            icon: ShoppingCart,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
        {
            key: 'showCommunityHub',
            label: 'Community Social Hub',
            description: 'Public center for NGOs, Foundations, and Political Campaigns.',
            url: `${baseUrl}/?view=community`,
            icon: Users,
            color: 'text-rose-600',
            bg: 'bg-rose-50'
        },
        {
            key: 'showTransportHub',
            label: 'Transport Hub',
            description: 'Portal for logistics, fleet management and public transport services.',
            url: `${baseUrl}/?view=transport`,
            icon: Navigation,
            color: 'text-teal-600',
            bg: 'bg-teal-50'
        }
    ];

    const handleCopy = (url: string, key: string) => {
        navigator.clipboard.writeText(url);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const settings = companyDetails?.portalSettings || {
        showAlumnaeHub: true,
        showTouristHub: true,
        showMarketplace: true,
        showCommunityHub: true,
        showTransportHub: true,
        publicRegistrationEnabled: true
    };

    return (
        <div className="space-y-10 animate-fade-in p-8">
            <header className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-4">
                        Independent <br /> <span className="text-indigo-600 italic">Portal Links</span>
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xl">
                        Manage deep-links for external hubs. These URLs can be shared directly with clients or embedded in institutional websites.
                    </p>
                </div>
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Globe className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Public Access</p>
                        <p className="text-sm font-black uppercase italic">All Links Active</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {portals.map((portal) => (
                    <div key={portal.key} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group">
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 ${portal.bg} rounded-3xl flex items-center justify-center ${portal.color}`}>
                                    <portal.icon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{portal.label}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{portal.description}</p>
                                </div>
                            </div>
                            {portal.key !== 'showAlumnaeSocial' && (
                                <button 
                                    onClick={() => onUpdateSettings({ [portal.key]: !(settings as any)[portal.key] })}
                                    className={`p-4 rounded-2xl transition-all ${ (settings as any)[portal.key] ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400' }`}
                                >
                                    {(settings as any)[portal.key] ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                                </button>
                            )}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-white/5 relative overflow-hidden group/link">
                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                <Link2 className="w-5 h-5" />
                            </div>
                            <code className="text-[10px] font-bold text-slate-500 truncate flex-1 uppercase tracking-wider">
                                {portal.url}
                            </code>
                            <div className="flex gap-2 relative z-10">
                                <button 
                                    onClick={() => handleCopy(portal.url, portal.key)}
                                    className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:bg-slate-900 hover:text-white transition-all text-slate-600 dark:text-slate-300"
                                    title="Copy Link"
                                >
                                    {copiedKey === portal.key ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <a 
                                    href={portal.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all text-slate-600 dark:text-slate-300"
                                    title="Open in New Tab"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${(portal.key === 'showAlumnaeSocial' || (settings as any)[portal.key]) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    {(portal.key === 'showAlumnaeSocial' || (settings as any)[portal.key]) ? 'Publicly Visible' : 'Hidden from Landing'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deep Link Status</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Active / Functional</p>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
                                    <Zap className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-indigo-600 rounded-[3.5rem] p-12 text-white relative overflow-hidden mt-12">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mt-48 -mr-48 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldCheck className="w-8 h-8" />
                            <span className="text-xs font-black uppercase tracking-[0.3em]">Institutional Security Guard</span>
                        </div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Universal Registration Security</h3>
                        <p className="text-indigo-100 text-sm font-medium leading-relaxed">
                            Deep-links ignore landing page visibility settings for direct access. You can disable public account creation entirely for all portals if you require invite-only access.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-indigo-100">Alumnae Platform Service Fee (KES)</label>
                            <input 
                                type="number"
                                value={companyDetails?.alumnaeJoiningFee || 0}
                                onChange={(e) => onUpdateSettings({ alumnaeJoiningFee: Number(e.target.value) })}
                                className="bg-white/10 border-white/20 text-white rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-white/40 outline-none w-48"
                                placeholder="e.g. 500"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-indigo-100">Featured Alumna Fee (KES)</label>
                            <input 
                                type="number"
                                value={companyDetails?.alumnaeFeatureFee || 0}
                                onChange={(e) => onUpdateSettings({ alumnaeFeatureFee: Number(e.target.value) })}
                                className="bg-white/10 border-white/20 text-white rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-white/40 outline-none w-48"
                                placeholder="e.g. 1000"
                            />
                        </div>
                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={() => onUpdateSettings({ alumnaeRegistrationFeeEnabled: !settings.alumnaeRegistrationFeeEnabled })}
                                className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border ${ settings.alumnaeRegistrationFeeEnabled ? 'bg-indigo-700 border-indigo-400 text-white' : 'bg-white/10 border-white/20 text-indigo-100' }`}
                            >
                                {settings.alumnaeRegistrationFeeEnabled ? 'Fee Enabled' : 'Fee Disabled'}
                            </button>
                            <button 
                                onClick={() => onUpdateSettings({ publicRegistrationEnabled: !settings.publicRegistrationEnabled })}
                                className={`px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-2xl ${ settings.publicRegistrationEnabled ? 'bg-white text-indigo-600 hover:bg-slate-900 hover:text-white' : 'bg-rose-500 text-white hover:bg-rose-600' }`}
                            >
                                {settings.publicRegistrationEnabled ? 'Disable Public Reg' : 'Enable Public Reg'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
