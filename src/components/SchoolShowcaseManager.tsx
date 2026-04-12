import React, { useState, useEffect } from 'react';
import { Institution, SchoolGallery, SchoolAd, User } from '../types';
import { apiService } from '../services/apiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { ImageIcon } from './icons/ImageIcon';
import { TagIcon } from './icons/TagIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface SchoolShowcaseManagerProps {
    school: Institution;
    onUpdate: () => void;
}

export const SchoolShowcaseManager: React.FC<SchoolShowcaseManagerProps> = ({ school, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'content' | 'gallery' | 'ads' | 'config'>('content');
    const [isSaving, setIsSaving] = useState(false);
    const [gallery, setGallery] = useState<SchoolGallery[]>([]);
    const [ads, setAds] = useState<SchoolAd[]>([]);
    const [formData, setFormData] = useState({
        motto: school.motto || '',
        vision: school.vision || '',
        mission: school.mission || '',
        history: school.history || '',
        showcaseCpanelUrl: school.showcaseCpanelUrl || '',
        showcaseCpanelToken: school.showcaseCpanelToken || ''
    });

    useEffect(() => {
        const loadMediaData = async () => {
            try {
                const [schoolGallery, schoolAds] = await Promise.all([
                    apiService.fetchModuleRecords<SchoolGallery>('school_gallery', school.id),
                    apiService.fetchModuleRecords<SchoolAd>('school_ads', school.id)
                ]);
                setGallery(schoolGallery || []);
                setAds(schoolAds || []);
            } catch (error) {
                console.error("Failed to load showcase data:", error);
            }
        };
        loadMediaData();
    }, [school.id]);

    const handleSaveContent = async () => {
        setIsSaving(true);
        try {
            await apiService.saveInstitution({
                ...school,
                ...formData
            });
            onUpdate();
            alert("Digital presence updated successfully!");
        } catch (error) {
            alert("Failed to update content. See console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUploadToCpanel = async (file: File, type: 'gallery' | 'ads') => {
        if (!formData.showcaseCpanelUrl || !formData.showcaseCpanelToken) {
            alert("cPanel remote storage not configured. Please visit the 'Configuration' tab.");
            return;
        }

        setIsSaving(true);
        try {
            const uploadedUrl = await apiService.uploadToShowcaseCpanel(file, formData.showcaseCpanelUrl, formData.showcaseCpanelToken);
            if (uploadedUrl) {
                if (type === 'gallery') {
                    const newEntry: Omit<SchoolGallery, 'id' | 'createdAt'> = {
                        institutionId: school.id,
                        imageUrl: uploadedUrl,
                        caption: file.name.split('.')[0],
                        sortOrder: gallery.length,
                        eventDate: new Date().toISOString().split('T')[0]
                    };
                    await apiService.saveModuleRecord('school_gallery', newEntry);
                } else {
                    const newAd: Omit<SchoolAd, 'id' | 'createdAt'> = {
                        institutionId: school.id,
                        imageUrl: uploadedUrl,
                        isActive: true,
                        displayLocation: 'sidebar',
                        title: 'New Event'
                    };
                    await apiService.saveModuleRecord('school_ads', newAd);
                }
                
                // Refresh local state
                const [updatedGallery, updatedAds] = await Promise.all([
                    apiService.fetchModuleRecords<SchoolGallery>('school_gallery', school.id),
                    apiService.fetchModuleRecords<SchoolAd>('school_ads', school.id)
                ]);
                setGallery(updatedGallery);
                setAds(updatedAds);
            }
        } catch (error: any) {
            alert(`Upload failure: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRecord = async (id: string, table: 'school_gallery' | 'school_ads') => {
        if (!window.confirm("Delete this asset from your showcase?")) return;
        try {
            await apiService.deleteModuleRecord(table, id);
            if (table === 'school_gallery') setGallery(prev => prev.filter(g => g.id !== id));
            else setAds(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            alert("Failed to delete record.");
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
            {/* Elite Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 rotate-3">
                        <GlobeAltIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Showcase Management</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Control your academy's public digital presence</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    {[
                        { id: 'content', label: 'Identity', icon: TagIcon },
                        { id: 'gallery', label: 'Gallery', icon: ImageIcon },
                        { id: 'ads', label: 'Ads', icon: SparklesIcon },
                        { id: 'config', label: 'CPanel', icon: ArrowPathIcon }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-950 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Content Workspace */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'content' && (
                    <div className="max-w-4xl space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional Motto</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="e.g., Knowledge is Power"
                                    value={formData.motto}
                                    onChange={e => setFormData({ ...formData, motto: e.target.value })}
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academy Vision</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Future-facing focus..."
                                    value={formData.vision}
                                    onChange={e => setFormData({ ...formData, vision: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academy Mission Statement</label>
                            <textarea 
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                                placeholder="State your core objectives..."
                                value={formData.mission}
                                onChange={e => setFormData({ ...formData, mission: e.target.value })}
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional History & Heritage</label>
                            <textarea 
                                rows={6}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] px-6 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Describe the journey of the school from foundation to date..."
                                value={formData.history}
                                onChange={e => setFormData({ ...formData, history: e.target.value })}
                            />
                        </div>

                        <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                            <button 
                                onClick={handleSaveContent}
                                disabled={isSaving}
                                className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-transform flex items-center gap-3 disabled:opacity-50"
                            >
                                {isSaving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                                Push Updates Online
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'gallery' && (
                    <div className="animate-fade-in space-y-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Institutional Gallery</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Uploaded direct to cPanel showcasing event highlights</p>
                            </div>
                            <label className="cursor-pointer">
                                <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUploadToCpanel(e.target.files[0], 'gallery')} />
                                <div className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                                    <PlusIcon className="w-4 h-4" />
                                    Upload Photo
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {gallery.map((item) => (
                                <div key={item.id} className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
                                    <img src={item.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Gallery" />
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                                        <p className="text-white text-[9px] font-black uppercase truncate w-full mb-3">{item.caption}</p>
                                        <button 
                                            onClick={() => handleDeleteRecord(item.id, 'school_gallery')}
                                            className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {gallery.length === 0 && (
                                <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                                    <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                                    <h5 className="text-slate-500 font-black uppercase text-xs tracking-widest">No Photos Released Yet</h5>
                                    <p className="text-slate-400 text-[9px] font-bold mt-2">Start uploading school events to display on your storefront.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ads' && (
                    <div className="animate-fade-in space-y-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Website Advertisements</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage active recruitment and event banners</p>
                            </div>
                            <label className="cursor-pointer">
                                <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUploadToCpanel(e.target.files[0], 'ads')} />
                                <div className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors">
                                    <PlusIcon className="w-4 h-4" />
                                    Post Ad
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {ads.map((ad) => (
                                <div key={ad.id} className="relative bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 group">
                                    <div className="h-40 bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                                        <img src={ad.imageUrl} className="w-full h-full object-cover" alt="Advertisement" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-6">
                                            <h5 className="text-white font-black uppercase text-xs tracking-tight">{ad.title || 'Institutional Event'}</h5>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">Position: {ad.displayLocation}</span>
                                            <span className={ad.isActive ? 'text-emerald-500' : 'text-red-500'}>{ad.isActive ? 'Online' : 'Offline'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleDeleteRecord(ad.id, 'school_ads')}
                                                className="w-full py-3 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-200 transition-colors"
                                            >
                                                Kill Advertisement
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {ads.length === 0 && (
                                <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                                    <SparklesIcon className="w-12 h-12 text-slate-300 mb-4" />
                                    <h5 className="text-slate-500 font-black uppercase text-xs tracking-widest">No Active Advertising</h5>
                                    <p className="text-slate-400 text-[9px] font-bold mt-2">Display admissions banners or holiday announcements here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="max-w-2xl animate-fade-in space-y-10">
                        <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-6 rounded-r-3xl">
                            <h5 className="text-amber-700 dark:text-amber-400 font-black uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4" />
                                Power User Integration
                            </h5>
                            <p className="text-amber-600/80 dark:text-amber-400/60 text-[10px] font-bold leading-relaxed">
                                Configure your cPanel Showcase Bridge to enable direct media uploads. Images will be hosted on your institutional server and linked to your storefront profile.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">cPanel Showcase API Endpoint</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="https://your-school-site.com/api/showcase/upload.php"
                                    value={formData.showcaseCpanelUrl}
                                    onChange={e => setFormData({ ...formData, showcaseCpanelUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Showcase Secret Token</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Neural Access Key..."
                                    value={formData.showcaseCpanelToken}
                                    onChange={e => setFormData({ ...formData, showcaseCpanelToken: e.target.value })}
                                />
                            </div>

                            <button 
                                onClick={handleSaveContent}
                                disabled={isSaving}
                                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 active:scale-95"
                            >
                                {isSaving ? 'Encrypting Connection...' : 'Secure Bridge Connection'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
