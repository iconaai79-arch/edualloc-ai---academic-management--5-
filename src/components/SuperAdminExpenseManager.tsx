import React, { useState, useEffect, useMemo } from 'react';
import { 
    CreditCard, 
    Plus, 
    Trash2, 
    Edit2, 
    Filter, 
    Search, 
    Building, 
    DollarSign, 
    Calendar,
    BookOpen,
    HelpCircle,
    Check
} from 'lucide-react';
import type { PlatformExpense, Institution } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from '../services/ToastContext';

interface SuperAdminExpenseManagerProps {
    institutions: Institution[];
    onLogAction?: (action: string) => Promise<void>;
}

export const SuperAdminExpenseManager: React.FC<SuperAdminExpenseManagerProps> = ({ 
    institutions = [], 
    onLogAction 
}) => {
    const { success: showSuccessToast, error: showErrorToast } = useToast();
    
    // Expenses State
    const [expenses, setExpenses] = useState<PlatformExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form States
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<PlatformExpense['category']>('fuel');
    const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
    const [institutionId, setInstitutionId] = useState('');
    const [notes, setNotes] = useState('');
    
    // Edit Mode
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filters
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterTenant, setFilterTenant] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Expenses
    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<PlatformExpense>('platform_expenses');
            setExpenses(Array.isArray(data) ? data : []);
        } catch (e: any) {
            console.error('Failed to fetch platform expenses:', e);
            showErrorToast('Failed to load expenses. Ensure migration has been executed.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    // Form Submit (Create / Edit)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!description.trim()) {
            showErrorToast('Please enter a description.');
            return;
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            showErrorToast('Please enter a valid positive amount.');
            return;
        }

        setSaving(true);
        try {
            const payload: PlatformExpense = {
                id: isEditing && editingId ? editingId : `exp_${Date.now()}`,
                description: description.trim(),
                amount: numericAmount,
                category,
                date: new Date(date).toISOString(),
                institutionId: institutionId || undefined,
                notes: notes.trim() || undefined
            };

            await apiService.saveModuleRecord('platform_expenses', payload);
            
            showSuccessToast(isEditing ? 'Expense updated successfully.' : 'Expense logged successfully.');
            
            // Log action if handler provided
            if (onLogAction) {
                const actionMsg = isEditing 
                    ? `Updated platform expense: ${payload.description} (KES ${payload.amount.toLocaleString()})`
                    : `Logged new platform expense: ${payload.description} (KES ${payload.amount.toLocaleString()})`;
                await onLogAction(actionMsg);
            }

            // Reset form
            resetForm();
            // Refresh records
            await fetchExpenses();
        } catch (e: any) {
            console.error('Failed to save platform expense:', e);
            showErrorToast('Failed to save expense. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Delete Expense
    const handleDelete = async (id: string, expDescription: string) => {
        if (!window.confirm(`Are you sure you want to delete the expense: "${expDescription}"?`)) {
            return;
        }

        try {
            await apiService.deleteModuleRecord('platform_expenses', id);
            showSuccessToast('Expense deleted successfully.');
            
            if (onLogAction) {
                await onLogAction(`Deleted platform expense: ${expDescription}`);
            }

            // Refresh records
            await fetchExpenses();
        } catch (e: any) {
            console.error('Failed to delete platform expense:', e);
            showErrorToast('Failed to delete expense.');
        }
    };

    // Enter Edit Mode
    const handleEditClick = (expense: PlatformExpense) => {
        setIsEditing(true);
        setEditingId(expense.id);
        setDescription(expense.description);
        setAmount(String(expense.amount));
        setCategory(expense.category);
        setDate(new Date(expense.date).toISOString().substring(0, 10));
        setInstitutionId(expense.institutionId || '');
        setNotes(expense.notes || '');
    };

    // Cancel / Reset Form
    const resetForm = () => {
        setIsEditing(false);
        setEditingId(null);
        setDescription('');
        setAmount('');
        setCategory('fuel');
        setDate(new Date().toISOString().substring(0, 10));
        setInstitutionId('');
        setNotes('');
    };

    // Calculate Summary Metrics
    const metrics = useMemo(() => {
        let total = 0;
        let tenantTagged = 0;
        let general = 0;

        expenses.forEach(exp => {
            const val = Number(exp.amount) || 0;
            total += val;
            if (exp.institutionId) {
                tenantTagged += val;
            } else {
                general += val;
            }
        });

        return { total, tenantTagged, general };
    }, [expenses]);

    // Apply Filter & Search logic
    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            // Category Filter
            if (filterCategory !== 'all' && exp.category !== filterCategory) {
                return false;
            }

            // Tenant Tag Filter
            if (filterTenant !== 'all') {
                if (filterTenant === 'general' && exp.institutionId) return false;
                if (filterTenant !== 'general' && exp.institutionId !== filterTenant) return false;
            }

            // Search Filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const descMatch = exp.description?.toLowerCase().includes(query);
                const notesMatch = exp.notes?.toLowerCase().includes(query);
                const categoryMatch = exp.category?.toLowerCase().includes(query);
                
                // Also search by institution name
                let instMatch = false;
                if (exp.institutionId) {
                    const inst = institutions.find(i => i.id === exp.institutionId);
                    if (inst?.name?.toLowerCase().includes(query)) {
                        instMatch = true;
                    }
                }
                return descMatch || notesMatch || categoryMatch || instMatch;
            }

            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, filterCategory, filterTenant, searchQuery, institutions]);

    // Render Category Badge Colors
    const getCategoryStyles = (cat: PlatformExpense['category']) => {
        switch (cat) {
            case 'fuel':
                return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            case 'accommodation':
                return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
            case 'hosting':
                return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
            case 'meals':
                return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            case 'marketing':
                return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
            default:
                return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            
            {/* ── Summary Dashboard Metrics ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="w-16 h-16 text-indigo-400" />
                    </div>
                    <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Total Platform Expenses</h4>
                    <p className="text-4xl font-black text-white tracking-tighter">
                        KES {metrics.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Cumulative Outflow</p>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Building className="w-16 h-16 text-cyan-400" />
                    </div>
                    <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Tenant Tagged Costs</h4>
                    <p className="text-4xl font-black text-cyan-400 tracking-tighter">
                        KES {metrics.tenantTagged.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Onsite visits & Dedicated support</p>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CreditCard className="w-16 h-16 text-emerald-400" />
                    </div>
                    <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">General Infrastructure</h4>
                    <p className="text-4xl font-black text-emerald-400 tracking-tighter">
                        KES {metrics.general.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Hosting, Domains & Platforms</p>
                </div>
            </div>

            {/* ── Main Layout Column Splits ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* ── Left Column: Log Expense Form ── */}
                <div className="lg:col-span-4 bg-slate-900/30 p-8 rounded-[3rem] border border-white/5 shadow-2xl h-fit">
                    <h3 className="text-xl font-black tracking-tighter uppercase text-white mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                        {isEditing ? 'Edit Platform Expense' : 'Log Platform Expense'}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 ml-1">
                                Expense Description <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. Server hosting for June"
                                className="form-input w-full bg-slate-950/60 border-2 border-white/5 focus:border-indigo-500/50 text-white rounded-2xl p-4 font-bold text-sm shadow-inner transition-all"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 ml-1">
                                    Amount (KES) <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="KES"
                                    min="0.01"
                                    step="0.01"
                                    className="form-input w-full bg-slate-950/60 border-2 border-white/5 focus:border-indigo-500/50 text-white rounded-2xl p-4 font-bold text-sm shadow-inner transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 ml-1">
                                    Category <span className="text-rose-500">*</span>
                                </label>
                                <select 
                                    value={category}
                                    onChange={e => setCategory(e.target.value as PlatformExpense['category'])}
                                    className="form-select w-full bg-slate-950/60 border-2 border-white/5 focus:border-indigo-500/50 text-white rounded-2xl p-4 font-bold text-sm shadow-inner transition-all"
                                >
                                    <option value="hosting" className="bg-[#020617]">Hosting / Domain</option>
                                    <option value="fuel" className="bg-[#020617]">Fuel / Transport</option>
                                    <option value="accommodation" className="bg-[#020617]">Accommodation</option>
                                    <option value="meals" className="bg-[#020617]">Meals / Catering</option>
                                    <option value="marketing" className="bg-[#020617]">Marketing / Ads</option>
                                    <option value="other" className="bg-[#020617]">Other Expense</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 ml-1">
                                Tag Tenant (Optional)
                            </label>
                            <select 
                                value={institutionId}
                                onChange={e => setInstitutionId(e.target.value)}
                                className="form-select w-full bg-slate-950/60 border-2 border-white/5 focus:border-indigo-500/50 text-white rounded-2xl p-4 font-bold text-sm shadow-inner transition-all"
                            >
                                <option value="" className="bg-[#020617]">-- None / General Expense --</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id} className="bg-[#020617]">
                                        {inst.name} ({inst.institutionCode})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 ml-1">
                                    Expense Date
                                </label>
                                <div className="relative">
                                    <input 
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="form-input w-full bg-slate-950/60 border-2 border-white/5 focus:border-indigo-500/50 text-white rounded-2xl p-4 font-bold text-sm shadow-inner transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 ml-1">
                                Notes / Memo
                            </label>
                            <textarea 
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Add optional details..."
                                rows={3}
                                className="form-textarea w-full bg-slate-950/60 border-2 border-white/5 focus:border-indigo-500/50 text-white rounded-2xl p-4 font-bold text-sm shadow-inner transition-all resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-3 border-t border-white/5">
                            {isEditing && (
                                <button 
                                    type="button" 
                                    onClick={resetForm}
                                    className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                            <button 
                                type="submit" 
                                disabled={saving}
                                className={`flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/10 hover:bg-indigo-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : isEditing ? (
                                    'Update Log'
                                ) : (
                                    'Save Expense'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Right Column: Log List & Telemetry ── */}
                <div className="lg:col-span-8 bg-slate-900/20 p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                    
                    {/* ── Advanced Filtering Header ── */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-950/40 p-6 rounded-[2rem] border border-white/5">
                        <div className="relative w-full md:w-72">
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search description, notes..."
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                            />
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cat:</span>
                            </div>
                            <select
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                                className="bg-slate-900/50 border border-white/5 rounded-xl py-2 px-3 text-xs font-black text-slate-300 focus:outline-none"
                            >
                                <option value="all">All Categories</option>
                                <option value="hosting">Hosting / Domain</option>
                                <option value="fuel">Fuel / Transport</option>
                                <option value="accommodation">Accommodation</option>
                                <option value="meals">Meals</option>
                                <option value="marketing">Marketing</option>
                                <option value="other">Other</option>
                            </select>

                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tenant:</span>
                                <select
                                    value={filterTenant}
                                    onChange={e => setFilterTenant(e.target.value)}
                                    className="bg-slate-900/50 border border-white/5 rounded-xl py-2 px-3 text-xs font-black text-slate-300 focus:outline-none max-w-[150px] md:max-w-[200px] truncate"
                                >
                                    <option value="all">All Tenants</option>
                                    <option value="general">General (Platform)</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Expenses Table ── */}
                    {loading ? (
                        <div className="flex justify-center items-center py-24">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-slate-950/10">
                            <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 text-sm font-black uppercase tracking-[0.2em]">No expenses found</p>
                            <p className="text-xs text-slate-600 font-bold mt-1">Try relaxing filters or log a new expense</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-slate-950/20">
                            <table className="min-w-full divide-y divide-white/5">
                                <thead className="bg-slate-950/40">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Expense Details</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Tenant Tag</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (KES)</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredExpenses.map((exp) => {
                                        const inst = exp.institutionId 
                                            ? institutions.find(i => i.id === exp.institutionId)
                                            : null;
                                        return (
                                            <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400 font-mono">
                                                    {new Date(exp.date).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="text-sm font-black text-white">{exp.description}</div>
                                                        {exp.notes && (
                                                            <div className="text-[10px] text-slate-500 font-medium italic mt-0.5 line-clamp-1">
                                                                {exp.notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 inline-flex text-[9px] font-black uppercase rounded-lg ${getCategoryStyles(exp.category)}`}>
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {inst ? (
                                                        <div className="flex flex-col">
                                                            <div className="text-[10px] font-black text-cyan-400 uppercase tracking-tight max-w-[150px] truncate">
                                                                {inst.name}
                                                            </div>
                                                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">{inst.institutionCode}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider bg-slate-800/40 px-2 py-0.5 rounded border border-white/5">
                                                            General
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-white font-mono">
                                                    {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                                                    <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleEditClick(exp)}
                                                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/10 transition-colors"
                                                            title="Edit expense"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(exp.id, exp.description)}
                                                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/10 transition-colors"
                                                            title="Delete expense"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
