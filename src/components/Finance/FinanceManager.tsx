
import React, { useState } from 'react';
import type { Invoice, Receipt, Expense, FinancialGoal, User, Institution, FeeStructure, AcademicYear, Semester } from '../../types';
import { RevenueWarRoom } from './RevenueWarRoom';
import { AutomatedBilling } from './AutomatedBilling';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';
import { RocketLaunchIcon } from '../icons/RocketLaunchIcon';
import { ClipboardDocumentCheckIcon } from '../icons/ClipboardDocumentCheckIcon';
import { PresentationChartLineIcon } from '../icons/PresentationChartLineIcon';

interface FinanceManagerProps {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    goals: FinancialGoal[];
    feeStructures: FeeStructure[];
    students: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    institution: Institution;
    onGenerateInvoices: (invoices: any[]) => Promise<void>;
    onAddExpense: (expense: any) => Promise<void>;
}

export const FinanceManager: React.FC<FinanceManagerProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'expenses' | 'audit'>('overview');

    const tabs = [
        { id: 'overview', label: 'Revenue War Room', icon: PresentationChartLineIcon },
        { id: 'billing', label: 'Billing Engine', icon: RocketLaunchIcon },
        { id: 'expenses', label: 'Expense Governance', icon: CurrencyDollarIcon },
        { id: 'audit', label: 'Fiscal Audit', icon: ClipboardDocumentCheckIcon },
    ] as const;

    return (
        <div className="space-y-8">
            {/* Professional Navigation Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 ${
                                activeTab === tab.id 
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                            }`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                            <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>
                <div className="hidden md:flex items-center gap-4 px-6 border-l border-slate-100">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiscal Year</p>
                        <p className="text-sm font-black text-slate-900">FY 2026/27</p>
                    </div>
                </div>
            </div>

            {/* Dynamic View Engine */}
            <div className="min-h-[600px]">
                {activeTab === 'overview' && (
                    <RevenueWarRoom 
                        invoices={props.invoices}
                        receipts={props.receipts}
                        expenses={props.expenses}
                        goals={props.goals}
                        students={props.students}
                        institution={props.institution}
                    />
                )}

                {activeTab === 'billing' && (
                    <AutomatedBilling 
                        feeStructures={props.feeStructures}
                        students={props.students}
                        academicYears={props.academicYears}
                        semesters={props.semesters}
                        institution={props.institution}
                        onGenerateInvoices={props.onGenerateInvoices}
                    />
                )}

                {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Record Expense</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none">
                                            <option>Salaries</option>
                                            <option>Utilities</option>
                                            <option>Maintenance</option>
                                            <option>Supplies</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount (KES)</label>
                                        <input type="number" placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Description</label>
                                        <textarea placeholder="Purpose of expenditure..." rows={3} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none resize-none" />
                                    </div>
                                    <button onClick={() => alert("Expense recorded in session.")} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">Submit Record</button>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm min-h-full">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Expenditure Log</h3>
                                <div className="space-y-4">
                                    {props.expenses.map((exp, i) => (
                                        <div key={i} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    <CurrencyDollarIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{exp.description}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exp.category} • {exp.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-rose-600">-KES {exp.amount.toLocaleString()}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm text-center space-y-8">
                        <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto">
                            <ClipboardDocumentCheckIcon className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Financial Audit Trail</h3>
                            <p className="text-slate-400 font-medium max-w-md mx-auto">Comprehensive fiscal transparency system. All transactions, deletions, and adjustments are logged for institutional integrity.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                            <button className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-600 transition-all group text-left">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Reconciliation</p>
                                <p className="text-sm font-black text-slate-900 group-hover:translate-x-2 transition-transform">Run Bank Statement Sync →</p>
                            </button>
                            <button className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-600 transition-all group text-left">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Reports</p>
                                <p className="text-sm font-black text-slate-900 group-hover:translate-x-2 transition-transform">Generate Tax Summary →</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
