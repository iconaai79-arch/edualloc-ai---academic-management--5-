import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { apiService } from '../../services/apiService';
import { SmartCategoryImporterModal } from './SmartCategoryImporterModal';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { LockClosedIcon } from '../icons/LockClosedIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { TagIcon } from '../icons/TagIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OperationHoursConfig {
    storeHoursEnforced: boolean;
    issueOpenTime: string;
    issueCloseTime: string;
    receiveOpenTime: string;
    receiveCloseTime: string;
    operatingDays: string[];
    closedMessage: string;
}

export interface InventoryCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
    description?: string;
    sortOrder: number;
    isDefault?: boolean;
}

interface Props {
    institutionId: string;
    currentUser: User;
    currentInstitution?: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PRINCIPAL_ROLES = ['admin', 'head_teacher', 'super_admin', 'dos', 'deputy', 'store'];

const DEFAULT_CATEGORIES: InventoryCategory[] = [
    { id: 'stationery', name: 'Stationery', icon: '✏️', color: '#6366f1', sortOrder: 1, isDefault: true },
    { id: 'textbooks', name: 'Textbooks', icon: '📚', color: '#0ea5e9', sortOrder: 2, isDefault: true },
    { id: 'uniforms', name: 'Uniforms', icon: '👕', color: '#10b981', sortOrder: 3, isDefault: true },
    { id: 'sports', name: 'Sports Equipment', icon: '⚽', color: '#f59e0b', sortOrder: 4, isDefault: true },
    { id: 'lab', name: 'Lab Supplies', icon: '🔬', color: '#8b5cf6', sortOrder: 5, isDefault: true },
    { id: 'cleaning', name: 'Cleaning Supplies', icon: '🧹', color: '#ec4899', sortOrder: 6, isDefault: true },
    { id: 'electronics', name: 'Electronics', icon: '💻', color: '#14b8a6', sortOrder: 7, isDefault: true },
    { id: 'furniture', name: 'Furniture', icon: '🪑', color: '#f97316', sortOrder: 8, isDefault: true },
    { id: 'other', name: 'Other', icon: '📦', color: '#94a3b8', sortOrder: 99, isDefault: true },
];

const EMOJI_PRESETS = ['📦', '✏️', '📚', '👕', '⚽', '🔬', '🧹', '💻', '🪑', '🍽️', '🔧', '🎨', '🏥', '📋', '🗂️', '🔑', '💊', '🧰', '🎒', '🖨️', '📎', '📐', '🧪', '🌿', '📸'];
const COLOR_PRESETS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#ef4444', '#84cc16', '#06b6d4', '#d946ef', '#78716c', '#94a3b8'];

// ─── Operation Hours Sub-panel ─────────────────────────────────────────────

function OperationHoursPanel({ institutionId, currentUser, currentInstitution, isPrincipal }: {
    institutionId: string; currentUser: User; currentInstitution?: any; isPrincipal: boolean;
}) {
    const [config, setConfig] = useState<OperationHoursConfig>({
        storeHoursEnforced: currentInstitution?.storeHoursEnforced ?? false,
        issueOpenTime: currentInstitution?.storeOpenTime ?? '08:00',
        issueCloseTime: currentInstitution?.storeCloseTime ?? '17:00',
        receiveOpenTime: currentInstitution?.receiveOpenTime ?? '08:00',
        receiveCloseTime: currentInstitution?.receiveCloseTime ?? '17:00',
        operatingDays: currentInstitution?.storeOperatingDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        closedMessage: currentInstitution?.storeClosedMessage ?? 'The school store is currently closed. Please visit during operating hours.',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const update = <K extends keyof OperationHoursConfig>(field: K, value: OperationHoursConfig[K]) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setIsDirty(true); setSavedAt(null);
    };
    const toggleDay = (day: string) => {
        setConfig(prev => ({
            ...prev,
            operatingDays: prev.operatingDays.includes(day)
                ? prev.operatingDays.filter(d => d !== day)
                : [...prev.operatingDays, day]
        }));
        setIsDirty(true); setSavedAt(null);
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiService.saveModuleRecord('institutions', {
                id: institutionId,
                storeHoursEnforced: config.storeHoursEnforced,
                storeOpenTime: config.issueOpenTime,
                storeCloseTime: config.issueCloseTime,
                receiveOpenTime: config.receiveOpenTime,
                receiveCloseTime: config.receiveCloseTime,
                storeOperatingDays: config.operatingDays,
                storeClosedMessage: config.closedMessage,
            });
            setSavedAt(new Date().toLocaleTimeString());
            setIsDirty(false);
        } catch (err: any) { alert('Failed to save: ' + err.message); }
        finally { setIsSaving(false); }
    };

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5);
    const isOpenDay = config.operatingDays.includes(dayName);
    const isIssueOpen = isOpenDay && currentTime >= config.issueOpenTime && currentTime <= config.issueCloseTime;
    const isReceiveOpen = isOpenDay && currentTime >= config.receiveOpenTime && currentTime <= config.receiveCloseTime;
    const storeIsOpen = !config.storeHoursEnforced || (isIssueOpen || isReceiveOpen);

    return (
        <div className="space-y-5">
            {/* Live status */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-500">Control when items can be issued or received from suppliers.</p>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[10px] font-black uppercase tracking-wider ${storeIsOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${storeIsOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {storeIsOpen ? 'Open Now' : 'Closed Now'}
                </div>
            </div>

            {/* Master enforce toggle */}
            <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${config.storeHoursEnforced ? 'border-indigo-200 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-700'} p-4 shadow-sm`}>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">Enforce Operation Hours</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Block issuance and receiving outside set hours</p>
                    </div>
                    <button
                        onClick={() => isPrincipal && update('storeHoursEnforced', !config.storeHoursEnforced)}
                        disabled={!isPrincipal}
                        className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-all ${!isPrincipal ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${config.storeHoursEnforced ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.storeHoursEnforced ? 'left-6' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>

            <div className={`space-y-4 transition-opacity ${config.storeHoursEnforced ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {/* Days */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Operating Days</p>
                    <div className="flex flex-wrap gap-2">
                        {ALL_DAYS.map(day => (
                            <button key={day} onClick={() => isPrincipal && toggleDay(day)} disabled={!isPrincipal}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${config.operatingDays.includes(day) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'} ${!isPrincipal ? 'cursor-not-allowed' : ''}`}>
                                {day.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Issue + Receive Hours side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: 'Item Issuance', icon: '📤', open: 'issueOpenTime', close: 'issueCloseTime', active: isIssueOpen, accent: 'indigo' },
                        { label: 'Supplier Receiving', icon: '📥', open: 'receiveOpenTime', close: 'receiveCloseTime', active: isReceiveOpen, accent: 'emerald' },
                    ].map(({ label, icon, open, close, active, accent }) => (
                        <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{icon}</span>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{label}</p>
                                        <p className="text-[9px] text-slate-400">{(config as any)[open]} – {(config as any)[close]}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {active ? 'Open' : 'Closed'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Opens</label>
                                    <input type="time" value={(config as any)[open]} disabled={!isPrincipal}
                                        onChange={e => isPrincipal && update(open as any, e.target.value)}
                                        className={`w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-${accent}-400 disabled:opacity-60 disabled:cursor-not-allowed`} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Closes</label>
                                    <input type="time" value={(config as any)[close]} disabled={!isPrincipal}
                                        onChange={e => isPrincipal && update(close as any, e.target.value)}
                                        className={`w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-${accent}-400 disabled:opacity-60 disabled:cursor-not-allowed`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Closed message */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Closed Notice Message</label>
                    <textarea rows={2} value={config.closedMessage} disabled={!isPrincipal}
                        onChange={e => isPrincipal && update('closedMessage', e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none disabled:opacity-60 disabled:cursor-not-allowed" />
                </div>
            </div>

            {isPrincipal && (
                <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDirty ? 'text-amber-500' : savedAt ? 'text-emerald-600' : 'text-transparent'}`}>
                        {isDirty ? 'Unsaved changes' : savedAt ? `✓ Saved at ${savedAt}` : '.'}
                    </span>
                    <button onClick={handleSave} disabled={isSaving || !isDirty}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {isSaving ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircleIcon className="w-3.5 h-3.5" /> Save Hours</>}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Category Manager Sub-panel ────────────────────────────────────────────

function CategoryManagerPanel({ institutionId, currentUser, isPrincipal }: {
    institutionId: string; currentUser: User; isPrincipal: boolean;
}) {
    const [categories, setCategories] = useState<InventoryCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [newCat, setNewCat] = useState<Partial<InventoryCategory>>({ name: '', icon: '📦', color: '#6366f1', description: '' });
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleImportCategories = async (imported: Omit<InventoryCategory, 'id'>[]) => {
        const newCats = imported.map((c, i) => ({
            ...c,
            id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sortOrder: categories.length + i + 1,
        }));
        const updated = [...categories, ...newCats];
        setCategories(updated);
        setIsImportModalOpen(false);
        await saveCategories(newCats as InventoryCategory[]);
    };

    useEffect(() => { loadCategories(); }, [institutionId]);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords('store_categories', institutionId);
            if (data && data.length > 0) {
                setCategories(data.sort((a: InventoryCategory, b: InventoryCategory) => a.sortOrder - b.sortOrder));
            } else {
                // Seed defaults
                setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c, institutionId })));
            }
        } catch { setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c, institutionId }))); }
        finally { setIsLoading(false); }
    };

    const saveCategories = async (cats: InventoryCategory[]) => {
        setIsSaving(true);
        try {
            for (const cat of cats) {
                await apiService.saveModuleRecord('store_categories', { ...cat, institutionId });
            }
            setSavedAt(new Date().toLocaleTimeString());
        } catch (err: any) { alert('Save failed: ' + err.message); }
        finally { setIsSaving(false); }
    };

    const handleAddCategory = async () => {
        if (!newCat.name?.trim()) return;
        const cat: InventoryCategory = {
            id: `cat_${Date.now()}`,
            name: newCat.name.trim(),
            icon: newCat.icon || '📦',
            color: newCat.color || '#6366f1',
            description: newCat.description || '',
            sortOrder: categories.length + 1,
        };
        const updated = [...categories, cat];
        setCategories(updated);
        setNewCat({ name: '', icon: '📦', color: '#6366f1', description: '' });
        setShowAddForm(false);
        await saveCategories([cat]);
    };

    const handleDelete = async (id: string) => {
        const cat = categories.find(c => c.id === id);
        if (cat?.isDefault && !window.confirm(`"${cat.name}" is a default category. Delete anyway?`)) return;
        setCategories(prev => prev.filter(c => c.id !== id));
        try { await apiService.deleteModuleRecord('store_categories', id); } catch { }
    };

    const handleInlineEdit = (id: string, field: keyof InventoryCategory, value: any) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
        setSavedAt(null);
    };

    const handleSaveEdit = async (id: string) => {
        const cat = categories.find(c => c.id === id);
        if (cat) await saveCategories([cat]);
        setEditingId(null);
    };

    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const sorted = [...categories];
        const dragged = sorted.splice(dragItem.current, 1)[0];
        sorted.splice(dragOverItem.current, 0, dragged);
        const reordered = sorted.map((c, i) => ({ ...c, sortOrder: i + 1 }));
        setCategories(reordered);
        saveCategories(reordered);
        dragItem.current = null;
        dragOverItem.current = null;
    };

    if (isLoading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-500">
                    Drag to reorder · Click ✏️ to rename · These categories appear in the inventory form and filters.
                </p>
                <div className="flex items-center gap-2">
                    {savedAt && <span className="text-[10px] text-emerald-600 font-black uppercase">✓ Saved {savedAt}</span>}
                    {isSaving && <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />}
                    {isPrincipal && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wide transition-all">
                                ✨ Smart Import
                            </button>
                            <button onClick={() => setShowAddForm(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
                                <PlusIcon className="w-3.5 h-3.5" /> Add Category
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add form */}
            {showAddForm && isPrincipal && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">New Category</p>
                        <button onClick={() => setShowAddForm(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"><XIcon className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">Name *</label>
                            <input type="text" value={newCat.name || ''} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Laboratory Chemicals"
                                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">Description</label>
                            <input type="text" value={newCat.description || ''} onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))}
                                placeholder="Optional short description"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">Emoji Icon</label>
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1">
                                {EMOJI_PRESETS.map(e => (
                                    <button key={e} onClick={() => setNewCat(p => ({ ...p, icon: e }))}
                                        className={`w-8 h-8 text-lg rounded-lg transition-all ${newCat.icon === e ? 'bg-indigo-600 scale-110' : 'bg-white dark:bg-slate-800 hover:bg-indigo-50'}`}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">Colour</label>
                            <div className="flex flex-wrap gap-1.5">
                                {COLOR_PRESETS.map(c => (
                                    <button key={c} onClick={() => setNewCat(p => ({ ...p, color: c }))}
                                        style={{ backgroundColor: c }}
                                        className={`w-7 h-7 rounded-lg transition-all ${newCat.color === c ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''}`} />
                                ))}
                                <input type="color" value={newCat.color} onChange={e => setNewCat(p => ({ ...p, color: e.target.value }))}
                                    className="w-7 h-7 rounded-lg border-0 cursor-pointer" title="Custom colour" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-3">
                        <button onClick={handleAddCategory} disabled={!newCat.name?.trim()}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide disabled:opacity-50 transition-all">
                            <PlusIcon className="w-3.5 h-3.5" /> Add Category
                        </button>
                    </div>
                </div>
            )}

            {/* Category list */}
            <div className="space-y-2">
                {categories.map((cat, idx) => (
                    <div key={cat.id}
                        draggable={isPrincipal}
                        onDragStart={() => { dragItem.current = idx; }}
                        onDragEnter={() => { dragOverItem.current = idx; }}
                        onDragEnd={handleDragSort}
                        onDragOver={e => e.preventDefault()}
                        className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm transition-all ${isPrincipal ? 'cursor-grab active:cursor-grabbing hover:border-indigo-200 dark:hover:border-indigo-700' : ''}`}
                    >
                        {editingId === cat.id ? (
                            /* Inline edit row */
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1 flex-wrap">
                                    {EMOJI_PRESETS.slice(0, 12).map(e => (
                                        <button key={e} onClick={() => handleInlineEdit(cat.id, 'icon', e)}
                                            className={`w-7 h-7 text-base rounded-lg transition-all ${cat.icon === e ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                                <input type="text" value={cat.name}
                                    onChange={e => handleInlineEdit(cat.id, 'name', e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat.id)}
                                    autoFocus
                                    className="flex-1 min-w-[150px] px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-indigo-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-white" />
                                <input type="text" value={cat.description || ''}
                                    onChange={e => handleInlineEdit(cat.id, 'description', e.target.value)}
                                    placeholder="Description..."
                                    className="flex-1 min-w-[120px] px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                                <div className="flex items-center gap-1">
                                    {COLOR_PRESETS.slice(0, 7).map(c => (
                                        <button key={c} onClick={() => handleInlineEdit(cat.id, 'color', c)}
                                            style={{ backgroundColor: c }}
                                            className={`w-5 h-5 rounded-full transition-all ${cat.color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''}`} />
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 ml-auto">
                                    <button onClick={() => handleSaveEdit(cat.id)}
                                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-all">
                                        Save
                                    </button>
                                    <button onClick={() => setEditingId(null)}
                                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all">
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Display row */
                            <div className="flex items-center gap-3">
                                {isPrincipal && (
                                    <div className="text-slate-300 dark:text-slate-600 select-none text-sm" title="Drag to reorder">⠿</div>
                                )}
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                    style={{ backgroundColor: cat.color + '20', border: `2px solid ${cat.color}30` }}>
                                    {cat.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-900 dark:text-white text-sm truncate">{cat.name}</p>
                                        {cat.isDefault && (
                                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 text-[8px] font-black uppercase tracking-wide rounded-full flex-shrink-0">default</span>
                                        )}
                                    </div>
                                    {cat.description && <p className="text-[10px] text-slate-400 truncate">{cat.description}</p>}
                                </div>
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                {isPrincipal && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                        <button onClick={() => setEditingId(cat.id)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
                                            <PencilIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(cat.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {categories.length === 0 && (
                <div className="py-12 text-center">
                    <TagIcon className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">No categories yet</p>
                </div>
            )}

            <p className="text-[10px] text-slate-400 text-center">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'} · Drag rows to reorder
            </p>

            {isImportModalOpen && (
                <SmartCategoryImporterModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImportCategories}
                />
            )}
        </div>
    );
}

// ─── Document Prefix Sub-panel ─────────────────────────────────────────────

function DocumentPrefixPanel({ institutionId, currentInstitution, isPrincipal }: {
    institutionId: string; currentInstitution?: any; isPrincipal: boolean;
}) {
    const [prefixes, setPrefixes] = useState({
        lpoPrefix: currentInstitution?.lpoPrefix || 'LPO-',
        grnPrefix: currentInstitution?.grnPrefix || 'GRN-',
        requisitionPrefix: currentInstitution?.requisitionPrefix || 'REQ-',
        dispatchPrefix: currentInstitution?.dispatchPrefix || 'DIS-',
        expensePrefix: currentInstitution?.expensePrefix || 'EXP-',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const update = (field: keyof typeof prefixes, value: string) => {
        setPrefixes(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setSavedAt(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiService.saveModuleRecord('institutions', {
                id: institutionId,
                lpoPrefix: prefixes.lpoPrefix,
                grnPrefix: prefixes.grnPrefix,
                requisitionPrefix: prefixes.requisitionPrefix,
                dispatchPrefix: prefixes.dispatchPrefix,
                expensePrefix: prefixes.expensePrefix,
            });
            setSavedAt(new Date().toLocaleTimeString());
            setIsDirty(false);
        } catch (err: any) {
            alert('Failed to save prefixes: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-500">Configure the prefixes for automatically generated document numbers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { key: 'lpoPrefix', label: 'Local Purchase Order (LPO)', placeholder: 'LPO-' },
                    { key: 'grnPrefix', label: 'Goods Received Note (GRN)', placeholder: 'GRN-' },
                    { key: 'requisitionPrefix', label: 'Requisition Note', placeholder: 'REQ-' },
                    { key: 'dispatchPrefix', label: 'Dispatch / Issue Note', placeholder: 'DIS-' },
                    { key: 'expensePrefix', label: 'Expense Voucher', placeholder: 'EXP-' },
                ].map(({ key, label, placeholder }) => (
                    <div key={key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</label>
                        <input
                            type="text"
                            value={(prefixes as any)[key]}
                            onChange={e => isPrincipal && update(key as any, e.target.value)}
                            disabled={!isPrincipal}
                            placeholder={placeholder}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed uppercase"
                        />
                    </div>
                ))}
            </div>

            {isPrincipal && (
                <div className="flex items-center justify-between mt-6">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDirty ? 'text-amber-500' : savedAt ? 'text-emerald-600' : 'text-transparent'}`}>
                        {isDirty ? 'Unsaved changes' : savedAt ? `✓ Saved at ${savedAt}` : '.'}
                    </span>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSaving ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircleIcon className="w-3.5 h-3.5" /> Save Prefixes</>}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Staff Management Sub-panel ───────────────────────────────────────────

const UserIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

function StoreStaffPanel({ institutionId, currentUser, isPrincipal }: {
    institutionId: string; currentUser: User; isPrincipal: boolean;
}) {
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    
    // For creating new store staff from scratch
    const [newStaffData, setNewStaffData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        password: '',
    });

    useEffect(() => {
        loadUsers();
    }, [institutionId]);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords('users', institutionId);
            setAllUsers(data || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignStoreRole = async () => {
        if (!selectedUserId) return;
        setIsSaving(true);
        try {
            const user = allUsers.find(u => u.id === selectedUserId);
            if (user) {
                const updatedUser = { ...user, role: 'store' };
                await apiService.saveModuleRecord('users', updatedUser);
                setAllUsers(prev => prev.map(u => u.id === selectedUserId ? updatedUser : u));
                setSelectedUserId('');
                setShowAddForm(false);
            }
        } catch (err: any) {
            alert('Failed to assign store role: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateStoreStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStaffData.name || !newStaffData.email || !newStaffData.password) return;
        setIsSaving(true);
        try {
            const newStaffUser = {
                id: 'usr_' + Date.now(),
                institutionId,
                name: newStaffData.name,
                email: newStaffData.email,
                phoneNumber: newStaffData.phoneNumber,
                password: newStaffData.password,
                role: 'store',
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('users', newStaffUser);
            setAllUsers(prev => [...prev, newStaffUser]);
            setNewStaffData({ name: '', email: '', phoneNumber: '', password: '' });
            setShowAddForm(false);
        } catch (err: any) {
            alert('Failed to create store staff: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRevokeStoreRole = async (userId: string) => {
        if (userId === currentUser.id) {
            alert('You cannot revoke your own store access.');
            return;
        }
        if (!window.confirm('Are you sure you want to revoke storekeeper access for this user? They will be demoted to standard "staff".')) return;
        setIsSaving(true);
        try {
            const user = allUsers.find(u => u.id === userId);
            if (user) {
                const updatedUser = { ...user, role: 'staff' };
                await apiService.saveModuleRecord('users', updatedUser);
                setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
            }
        } catch (err: any) {
            alert('Failed to revoke store role: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const storeStaff = allUsers.filter(u => u.role === 'store');
    const eligibleStaff = allUsers.filter(u => u.role !== 'store' && u.role !== 'student' && u.role !== 'parent');

    if (isLoading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-500">
                    Assign and manage personnel who have permission to issue and receive inventory items.
                </p>
                {isPrincipal && (
                    <button onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
                        <PlusIcon className="w-3.5 h-3.5" /> Add Store Keeper
                    </button>
                )}
            </div>

            {/* Form Modal / Dropdown selection */}
            {showAddForm && isPrincipal && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Add Store Staff</p>
                        <button onClick={() => setShowAddForm(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"><XIcon className="w-4 h-4" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Option A: Select Existing Staff */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Option 1: Assign to Existing Staff Member</p>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Select User</label>
                                <select 
                                    value={selectedUserId} 
                                    onChange={e => setSelectedUserId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">-- Choose Staff Member --</option>
                                    {eligibleStaff.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email || u.phoneNumber} - Role: {u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <button 
                                onClick={handleAssignStoreRole} 
                                disabled={!selectedUserId || isSaving}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {isSaving ? 'Assigning...' : 'Assign Store Role'}
                            </button>
                        </div>

                        {/* Option B: Create New User */}
                        <form onSubmit={handleCreateStoreStaff} className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 md:pl-6">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Option 2: Create New Store Keeper Profile</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Full Name *</label>
                                    <input type="text" required value={newStaffData.name} onChange={e => setNewStaffData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Jane Doe" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Email Address *</label>
                                    <input type="email" required value={newStaffData.email} onChange={e => setNewStaffData(p => ({ ...p, email: e.target.value }))}
                                        placeholder="jane.doe@school.com" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone Number</label>
                                    <input type="text" value={newStaffData.phoneNumber} onChange={e => setNewStaffData(p => ({ ...p, phoneNumber: e.target.value }))}
                                        placeholder="0712345678" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Password *</label>
                                    <input type="password" required value={newStaffData.password} onChange={e => setNewStaffData(p => ({ ...p, password: e.target.value }))}
                                        placeholder="••••••••" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white" />
                                </div>
                            </div>
                            <button type="submit" disabled={isSaving || !newStaffData.name || !newStaffData.email || !newStaffData.password}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide disabled:opacity-50 transition-all">
                                {isSaving ? 'Creating...' : 'Create & Assign Role'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Staff list cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {storeStaff.map(user => (
                    <div key={user.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 shadow-sm flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-700 transition-all">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-slate-900 dark:text-white text-sm truncate">{user.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{user.email || 'No email'}</p>
                                {user.phoneNumber && <p className="text-[9px] text-slate-400 font-mono mt-0.5">{user.phoneNumber}</p>}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-slate-105 dark:border-slate-700 mt-4 pt-3">
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-wide">
                                Store Keeper
                            </span>
                            {isPrincipal && (
                                <button 
                                    onClick={() => handleRevokeStoreRole(user.id)}
                                    disabled={user.id === currentUser.id}
                                    className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider disabled:opacity-50"
                                >
                                    Revoke Access
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {storeStaff.length === 0 && (
                <div className="py-12 text-center">
                    <UserIcon className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-350 dark:text-slate-650">No store keepers assigned</p>
                </div>
            )}
        </div>
    );
}

// ─── Main StoreConfigManager ────────────────────────────────────────────────

export function StoreConfigManager({ institutionId, currentUser, currentInstitution }: Props) {
    const [activeTab, setActiveTab] = useState<'hours' | 'categories' | 'prefixes' | 'staff'>('hours');

    const isPrincipal = PRINCIPAL_ROLES.includes(currentUser.role) ||
        currentUser.roles?.some(r => PRINCIPAL_ROLES.includes(r)) || false;

    const tabs = [
        { id: 'hours', label: 'Operation Hours', icon: <ClockIcon className="w-4 h-4" /> },
        { id: 'categories', label: 'Item Categories', icon: <TagIcon className="w-4 h-4" /> },
        { id: 'prefixes', label: 'Document Prefixes', icon: <DocumentTextIcon className="w-4 h-4" /> },
        { id: 'staff', label: 'Store Staff', icon: <UserIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-start gap-4 flex-wrap justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Store Configuration</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage how the school store operates</p>
                </div>
                {!isPrincipal && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                        <LockClosedIcon className="w-4 h-4 text-amber-600" />
                        <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">Principal / Admin Access Only</p>
                    </div>
                )}
            </div>

            {/* Sub-tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl w-fit gap-1">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}>
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Panel content */}
            <div className="mt-2">
                {activeTab === 'hours' && (
                    <OperationHoursPanel
                        institutionId={institutionId}
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        isPrincipal={isPrincipal}
                    />
                )}
                {activeTab === 'categories' && (
                    <CategoryManagerPanel
                        institutionId={institutionId}
                        currentUser={currentUser}
                        isPrincipal={isPrincipal}
                    />
                )}
                {activeTab === 'prefixes' && (
                    <DocumentPrefixPanel
                        institutionId={institutionId}
                        currentInstitution={currentInstitution}
                        isPrincipal={isPrincipal}
                    />
                )}
                {activeTab === 'staff' && (
                    <StoreStaffPanel
                        institutionId={institutionId}
                        currentUser={currentUser}
                        isPrincipal={isPrincipal}
                    />
                )}
            </div>
        </div>
    );
}
