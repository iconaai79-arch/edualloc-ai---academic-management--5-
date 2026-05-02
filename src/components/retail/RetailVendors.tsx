
import React, { useState, useEffect } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { MagnifyingGlassIcon as SearchIcon } from '../icons/MagnifyingGlassIcon';
import { BuildingOfficeIcon as BuildingIcon } from '../icons/BuildingOfficeIcon';
import { EnvelopeIcon as MailIcon } from '../icons/EnvelopeIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { UserIcon } from '../icons/UserIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon as EditIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { ShieldCheckIcon as ShieldIcon } from '../icons/ShieldCheckIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { Supplier } from '../../types';
import { apiService } from '../../services/apiService';

interface RetailVendorsProps {
    institutionId: string;
}

export function RetailVendors({ institutionId }: RetailVendorsProps) {
    const [vendors, setVendors] = useState<Supplier[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Supplier | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        category: 'General'
    });

    useEffect(() => {
        loadVendors();
    }, [institutionId]);

    const loadVendors = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<Supplier>('suppliers', institutionId);
            setVendors(data);
        } catch (error) {
            console.error('Failed to load vendors:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                institutionId,
                id: editingVendor?.id || `SUP-${Math.floor(1000 + Math.random() * 9000)}`
            };
            await apiService.saveModuleRecord('suppliers', dataToSave);
            setIsModalOpen(false);
            setEditingVendor(null);
            setFormData({ name: '', contactPerson: '', email: '', phone: '', category: 'General' });
            loadVendors();
        } catch (error) {
            console.error('Failed to save vendor:', error);
            alert('Failed to save vendor. Please try again.');
        }
    };

    const handleDeleteVendor = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await apiService.deleteModuleRecord('suppliers', id);
            loadVendors();
        } catch (error) {
            console.error('Failed to delete vendor:', error);
            alert('Failed to delete vendor. It may be referenced in other records.');
        }
    };

    const filteredVendors = vendors.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Vendor Management</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Manage your suppliers and service providers</p>
                </div>
                <button
                    onClick={() => {
                        setEditingVendor(null);
                        setFormData({ name: '', contactPerson: '', email: '', phone: '', category: 'General' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Vendor
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-white dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="p-3 bg-white dark:bg-slate-700 rounded-2xl w-fit shadow-sm mb-4">
                            <BuildingIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{vendors.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Total Vendors</p>
                    </div>
                </div>
                
                <div className="bg-emerald-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-white dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="p-3 bg-white dark:bg-slate-700 rounded-2xl w-fit shadow-sm mb-4">
                            <ShieldIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">
                            {new Set(vendors.map(v => v.category)).size}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Categories</p>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-white dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10 flex h-full items-center gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH VENDORS..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 rounded-2xl border-none text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vendor List */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Name</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Person</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Details</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Loading vendors...</p>
                                    </td>
                                </tr>
                            ) : filteredVendors.map(vendor => (
                                <tr key={vendor.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                                {vendor.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{vendor.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vendor.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="w-3 h-3 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-tight">{vendor.contactPerson}</span>
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-medium">
                                                <MailIcon className="w-3 h-3" />
                                                <span>{vendor.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-medium">
                                                <PhoneIcon className="w-3 h-3" />
                                                <span>{vendor.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEditingVendor(vendor);
                                                    setFormData({
                                                        name: vendor.name,
                                                        contactPerson: vendor.contactPerson,
                                                        email: vendor.email,
                                                        phone: vendor.phone,
                                                        category: vendor.category
                                                    });
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteVendor(vendor.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl transition-all"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && filteredVendors.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        No vendors found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">
                                    {editingVendor ? 'Edit Vendor' : 'New Vendor'}
                                </h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Supplier Registration</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveVendor} className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Company Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="VENDOR NAME..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contact Person</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                            className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="PERSON..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category</label>
                                        <select 
                                            value={formData.category}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                        >
                                            <option>General</option>
                                            <option>Technology</option>
                                            <option>Office Supplies</option>
                                            <option>Furniture</option>
                                            <option>Logistics</option>
                                            <option>Wholesale</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="EMAIL..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone</label>
                                        <input 
                                            type="tel" 
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="PHONE..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all font-sans"
                            >
                                {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

