import React, { useState, useMemo } from 'react';
import type { County, User } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { XIcon } from './icons/XIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { CheckIcon } from './icons/CheckIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { UserIcon } from './icons/UserIcon';


interface CountyManagerProps {
    counties: County[];
    onAddCounty: (data: Omit<County, 'id' | 'createdAt'>) => void;
    onUpdateCounty: (id: string, data: Partial<County>) => void;
    onDeleteCounty: (id: string) => void;
}

export const CountyManager: React.FC<CountyManagerProps> = ({
    counties,
    onAddCounty,
    onUpdateCounty,
    onDeleteCounty
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCounty, setEditingCounty] = useState<County | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        email: '',
        phoneNumber: '',
        adminName: '',
        status: 'active' as 'active' | 'suspended',
        primaryColor: '#4f46e5',
        secondaryColor: '#0f172a',
        motto: '',
        website: '',
        logoUrl: '',
        letterheadUrl: ''
    });
    const [isUploading, setIsUploading] = useState(false);


    const filteredCounties = useMemo(() => {
        if (!searchTerm) return counties;
        const lower = searchTerm.toLowerCase();
        return counties.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            c.code.toLowerCase().includes(lower) ||
            c.email.toLowerCase().includes(lower)
        );
    }, [counties, searchTerm]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.code || !formData.email || !formData.phoneNumber) {
            alert('Please fill in all required fields');
            return;
        }

        if (editingCounty) {
            onUpdateCounty(editingCounty.id, formData);
            setEditingCounty(null);
        } else {
            onAddCounty(formData);
        }

        resetForm();
        setIsAddModalOpen(false);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            email: '',
            phoneNumber: '',
            adminName: '',
            status: 'active',
            primaryColor: '#4f46e5',
            secondaryColor: '#0f172a',
            motto: '',
            website: '',
            logoUrl: '',
            letterheadUrl: ''
        });
    };


    const handleEdit = (county: County) => {
        setFormData({
            name: county.name,
            code: county.code,
            email: county.email,
            phoneNumber: county.phoneNumber,
            adminName: county.adminName || '',
            status: county.status,
            primaryColor: county.primaryColor || '#4f46e5',
            secondaryColor: county.secondaryColor || '#0f172a',
            motto: county.motto || '',
            website: county.website || '',
            logoUrl: county.logoUrl || '',
            letterheadUrl: county.letterheadUrl || ''
        });
        setEditingCounty(county);
        setIsAddModalOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'letterheadUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Dynamic import to avoid circular dependencies if any, though apiService is usually safe
        const { apiService } = await import('../services/apiService');
        
        setIsUploading(true);
        try {
            const path = `counties/${Date.now()}_${file.name}`;
            const url = await apiService.uploadFile('eduai', path, file);
            if (url) {
                setFormData(prev => ({ ...prev, [field]: url }));
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };


    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this county? This action cannot be undone.')) {
            onDeleteCounty(id);
        }
    };

    const getAdminName = (county: County) => {
        return county.adminName || 'Not Assigned';
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* ... (Header and Search Bar code remains same, skipping for brevity in this tool call, will target form section) */}

            {/* Search Bar */}
            <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search counties by name, code, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>

            {/* Counties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCounties.map(county => (
                    <div
                        key={county.id}
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-black uppercase tracking-tight">{county.name}</h3>
                                <p className="text-xs font-mono text-slate-500 mt-1">Code: {county.code}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${county.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}>
                                {county.status}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                                <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-300">{county.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <PhoneIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-300">{county.phoneNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-300">Admin: {getAdminName(county)}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                            {/* ... Buttons ... */}
                            <button
                                onClick={() => handleEdit(county)}
                                className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                            >
                                <PencilIcon className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(county.id)}
                                className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                            >
                                <XIcon className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}

                {/* ... Empty check ... */}
                {filteredCounties.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <MapPinIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">No counties found</p>
                        <p className="text-sm text-slate-400 mt-1">
                            {searchTerm ? 'Try a different search term' : 'Register your first county to get started'}
                        </p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                        {/* ... Header ... */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-2xl font-black uppercase tracking-tight">
                                {editingCounty ? 'Edit County' : 'Register New County'}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setEditingCounty(null);
                                    resetForm();
                                }}
                                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* ... Name and Code ... */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">County Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="e.g., Nairobi County"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2">County Code *</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                                        placeholder="e.g., NRB-001"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* ... Email and Phone ... */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Email Address *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="county@example.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="+254..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold mb-2">County Administrator</label>
                                    <input
                                        type="text"
                                        value={formData.adminName}
                                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="Enter admin name"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Optional: Name of the assigned county admin</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Branding & Identity</h4>
                                
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-bold mb-2">County Motto</label>
                                        <input
                                            type="text"
                                            value={formData.motto}
                                            onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="e.g., Unity and Progress"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2">Official Website</label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                                            placeholder="https://county.go.ke"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-bold mb-2">Primary Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={formData.primaryColor}
                                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                                className="h-12 w-12 rounded-lg border-0 p-0 cursor-pointer overflow-hidden"
                                            />
                                            <input
                                                type="text"
                                                value={formData.primaryColor}
                                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2">Secondary Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={formData.secondaryColor}
                                                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                                className="h-12 w-12 rounded-lg border-0 p-0 cursor-pointer overflow-hidden"
                                            />
                                            <input
                                                type="text"
                                                value={formData.secondaryColor}
                                                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold mb-2">County Logo</label>
                                        <div className="flex items-center gap-4">
                                            {formData.logoUrl && (
                                                <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1 bg-white" />
                                            )}
                                            <label className="flex-1">
                                                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer text-center text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-300 dark:border-slate-700">
                                                    {isUploading ? 'Uploading...' : formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} disabled={isUploading} />
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2">Letterhead Image</label>
                                        <div className="flex items-center gap-4">
                                            {formData.letterheadUrl && (
                                                <img src={formData.letterheadUrl} alt="Letterhead" className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1 bg-white" />
                                            )}
                                            <label className="flex-1">
                                                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer text-center text-xs font-bold uppercase tracking-widest border-2 border-dashed border-slate-300 dark:border-slate-700">
                                                    {isUploading ? 'Uploading...' : formData.letterheadUrl ? 'Change Image' : 'Upload Image'}
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'letterheadUrl')} disabled={isUploading} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div className="flex gap-4 pt-4">
                                {/* ... Buttons ... */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setEditingCounty(null);
                                        resetForm();
                                    }}
                                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-bold flex items-center justify-center gap-2"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                    {editingCounty ? 'Update County' : 'Register County'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
