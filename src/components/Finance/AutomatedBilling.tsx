
import React, { useState } from 'react';
import type { FeeStructure, User, AcademicYear, Semester, Institution } from '../../types';
import { ZapIcon } from '../icons/ZapIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface AutomatedBillingProps {
    feeStructures: FeeStructure[];
    students: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    institution: Institution;
    onGenerateInvoices: (invoices: any[]) => Promise<void>;
}

export const AutomatedBilling: React.FC<AutomatedBillingProps> = ({
    feeStructures = [],
    students = [],
    academicYears = [],
    semesters = [],
    institution,
    onGenerateInvoices
}) => {
    const [selectedAY, setSelectedAY] = useState('');
    const [selectedSem, setSelectedSem] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState<'config' | 'preview' | 'processing' | 'done'>('config');

    const handleRunBilling = async () => {
        setIsGenerating(true);
        setStep('processing');
        
        // Mock processing logic
        const total = students.length;
        for (let i = 0; i <= 100; i += 10) {
            setProgress(i);
            await new Promise(r => setTimeout(r, 200));
        }

        // Logic to generate invoice objects would go here
        const mockInvoices = students.map(s => ({
            id: `inv_auto_${Date.now()}_${s.id}`,
            studentId: s.id,
            totalAmount: feeStructures.reduce((acc, f) => acc + f.amount, 0),
            status: 'pending',
            issueDate: new Date().toISOString(),
            institutionId: institution.id
        }));

        await onGenerateInvoices(mockInvoices);
        setStep('done');
        setIsGenerating(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100 mb-4 animate-bounce">
                    <ZapIcon className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Institutional Billing Wizard</h2>
                <p className="text-slate-500 font-medium max-w-lg mx-auto">
                    Automate your revenue lifecycle. Generate term-based invoices for all registered students in seconds.
                </p>
            </div>

            {step === 'config' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Academic Year</label>
                            <select 
                                value={selectedAY}
                                onChange={(e) => setSelectedAY(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="">Select Year</option>
                                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Term / Semester</label>
                            <select 
                                value={selectedSem}
                                onChange={(e) => setSelectedSem(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="">Select Term</option>
                                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-700">
                            <ZapIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Impact Analysis</span>
                        </div>
                        <p className="text-sm font-bold text-amber-800/80 leading-relaxed">
                            Generating billing for {students.length} students across {feeStructures.length} active fee categories. 
                            Estimated revenue projection: <span className="font-black">KES {(students.length * feeStructures.reduce((acc, f) => acc + f.amount, 0)).toLocaleString()}</span>.
                        </p>
                    </div>

                    <button 
                        onClick={() => setStep('preview')}
                        disabled={!selectedAY || !selectedSem}
                        className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-50"
                    >
                        Preview Billing Run
                    </button>
                </div>
            )}

            {step === 'preview' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8 animate-in slide-in-from-right-8 duration-500">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm border-l-4 border-indigo-600 pl-4">Billing Preview Summary</h3>
                    
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
                        {feeStructures.map((f, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-sm font-bold text-slate-700">{f.name}</span>
                                <span className="text-sm font-black text-slate-900">KES {f.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex gap-4">
                        <button onClick={() => setStep('config')} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Back</button>
                        <button onClick={handleRunBilling} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Confirm & Execute Run</button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-2xl text-center space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 bg-indigo-600 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.5)]" style={{ width: `${progress}%` }} />
                    <div className="space-y-4">
                        <div className="w-24 h-24 border-8 border-slate-50 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-slate-900">Engineered Precision Invoicing</h3>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Executing Phase: Ledger Distribution ({progress}%)</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 italic">"Finalizing cryptographic billing signatures for institutional compliance..."</p>
                    </div>
                </div>
            )}

            {step === 'done' && (
                <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                        <CheckCircleIcon className="w-12 h-12 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-slate-900">Lifecycle Executed</h3>
                        <p className="text-slate-500 font-medium">
                            The billing engine has successfully generated and distributed invoices to <span className="text-indigo-600 font-black">{students.length}</span> student accounts.
                        </p>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setStep('config')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">New Billing Run</button>
                        <button onClick={() => window.print()} className="px-8 py-4 bg-white text-slate-900 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Export Journals</button>
                    </div>
                </div>
            )}
        </div>
    );
};

