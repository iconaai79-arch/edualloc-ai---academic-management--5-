
import React, { useState } from 'react';
import {
    Receipt as ReceiptIcon,
    Plus as PlusIcon,
    Search as SearchIcon,
    Filter as FilterIcon,
    Calendar as CalendarIcon,
    Store as StoreIcon,
    DollarSign as DollarSignIcon,
    Tag as TagIcon
} from 'lucide-react';
import { RetailExpense, RetailStore, User } from '../../types';

interface RetailExpensesProps {
    institutionId: string;
    currentUser: User;
    retailStores: RetailStore[];
    retailExpenses: RetailExpense[];
    onAddRetailExpense: (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => Promise<void>;
}

export function RetailExpenses({
    institutionId,
    currentUser,
    retailStores,
    retailExpenses,
    onAddRetailExpense
}: RetailExpensesProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('all');

    const [newExpense, setNewExpense] = useState({
        amount: 0,
        category: 'Rent',
        description: '',
        storeId: retailStores[0]?.id || ''
    });

    const categories = ['Rent', 'Electricity', 'Water', 'Salaries', 'Transport', 'Marketing', 'Repairs', 'Other'];

    const handleAdd = async () => {
        if (newExpense.amount <= 0 || !newExpense.storeId) {
            alert('Please enter a valid amount and select a store');
            return;
        }
        await onAddRetailExpense(newExpense);
        setIsAddModalOpen(false);
        setNewExpense({
            amount: 0,
            category: 'Rent',
            description: '',
            storeId: retailStores[0]?.id || ''
        });
    };

    const filteredExpenses = retailExpenses.filter(exp => {
        const matchesStore = selectedStoreId === 'all' || exp.storeId === selectedStoreId;
        const matchesSearch = exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exp.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStore && matchesSearch;
    });

    const totalSpent = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Store Expenses</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Operational cost tracking for all locations</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" />
                    Record Expense
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-[2rem] border border-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600"><DollarSignIcon className="w-5 h-5" /></div>
                    </div>
                    <p className="text-3xl font-black text-slate-900">KES {totalSpent.toLocaleString()}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Total Period Spending</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600"><ReceiptIcon className="w-5 h-5" /></div>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{filteredExpenses.length}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Entries Recorded</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-600"><StoreIcon className="w-5 h-5" /></div>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{selectedStoreId === 'all' ? retailStores.length : 1}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Active Locations</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 justify-between mb-8">
                    <div className="relative flex-1">
                        <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[150px]"
                        >
                            <option value="all">All Stores</option>
                            {retailStores.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Store</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredExpenses.map(exp => (
                                <tr key={exp.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="py-5 text-xs font-bold text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                                    <td className="py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <StoreIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-tight text-slate-900">
                                                {retailStores.find(s => s.id === exp.storeId)?.name || 'Unknown Store'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest">
                                            {exp.category}
                                        </span>
                                    </td>
                                    <td className="py-5 text-xs font-medium text-slate-600">{exp.description}</td>
                                    <td className="py-5 text-right font-black text-slate-900 text-sm">
                                        KES {Number(exp.amount).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <ReceiptIcon className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No expenses found matching your filters</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Expense Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Record New Expense</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Operational Outflow Entry</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Store</label>
                                <select
                                    value={newExpense.storeId}
                                    onChange={(e) => setNewExpense({ ...newExpense, storeId: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {retailStores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (KES)</label>
                                    <input
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                                    <select
                                        value={newExpense.category}
                                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {categories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                                <textarea
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    rows={3}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    placeholder="e.g. Monthly rent for Westside Branch..."
                                ></textarea>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all underline"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    Confirm Entry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
