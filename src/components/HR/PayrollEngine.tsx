
import React, { useState, useMemo } from 'react';
import type { User, PayrollRecord, Institution } from '../../types';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { CalculatorIcon } from '../icons/CalculatorIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';

interface PayrollEngineProps {
    staff: User[];
    payrollRecords: PayrollRecord[];
    institution: Institution;
    onProcessPayroll: (records: PayrollRecord[]) => Promise<void>;
}

export const PayrollEngine: React.FC<PayrollEngineProps> = ({
    staff,
    payrollRecords,
    institution,
    onProcessPayroll
}) => {
    const [selectedMonth, setSelectedMonth] = useState('January 2026');
    const [isProcessing, setIsProcessing] = useState(false);

    const stats = useMemo(() => {
        const currentMonthRecords = payrollRecords.filter(r => r.month === selectedMonth);
        const totalNet = currentMonthRecords.reduce((acc, r) => acc + (r.netSalary || 0), 0);
        return {
            processedCount: currentMonthRecords.length,
            totalPayout: totalNet,
            pendingCount: staff.length - currentMonthRecords.length
        };
    }, [payrollRecords, selectedMonth, staff]);

    const handleRunPayroll = async () => {
        setIsProcessing(true);
        const newRecords: PayrollRecord[] = staff.map(s => {
            const basic = 50000; // Placeholder basic
            const houseAllowance = basic * 0.15;
            const nssf = 1080;
            const nhif = 1200;
            const net = basic + houseAllowance - nssf - nhif;

            return {
                id: `pay_${Date.now()}_${s.id}`,
                institutionId: institution.id,
                staffId: s.id,
                month: selectedMonth,
                basicSalary: basic,
                allowances: [{ name: 'House Allowance', amount: houseAllowance }],
                deductions: [{ name: 'NSSF', amount: nssf }, { name: 'NHIF', amount: nhif }],
                netSalary: net,
                status: 'paid',
                recordedBy: 'System Engine',
                paymentDate: new Date().toISOString()
            };
        });

        await onProcessPayroll(newRecords);
        setIsProcessing(false);
        alert(`Payroll processed for ${staff.length} staff members.`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl" />
                <div className="relative space-y-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Payroll Engine</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">KES Currency Standards • Statutory Compliance (NSSF/NHIF)</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Staff</p>
                            <p className="text-lg font-black text-slate-900">{staff.length}</p>
                        </div>
                        <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processed Payout</p>
                            <p className="text-lg font-black text-indigo-600">KES {stats.totalPayout?.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="relative flex flex-col items-end gap-4">
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer"
                    >
                        <option>January 2026</option>
                        <option>February 2026</option>
                        <option>March 2026</option>
                    </select>
                    <button 
                        onClick={handleRunPayroll}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <CalculatorIcon className="w-5 h-5" />
                        Execute Payroll Run
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Staff Ledger ({selectedMonth})</h3>
                        <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Download CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Basic</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Net Salary</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {staff.map((s, i) => {
                                    const record = payrollRecords.find(r => r.staffId === s.id && r.month === selectedMonth);
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black">
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{s.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{s.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-bold text-slate-600 text-sm">
                                                KES {record?.basicSalary?.toLocaleString() || '---'}
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-slate-900 text-sm">
                                                KES {record?.netSalary?.toLocaleString() || '---'}
                                            </td>
                                            <td className="px-8 py-6">
                                                {record ? (
                                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                        Paid
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6">
                        <h3 className="text-xl font-black tracking-tight">Deduction Distribution</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'PAYE (Tax)', amount: stats.totalPayout * 0.1, color: 'bg-indigo-500' },
                                { label: 'NHIF (Medical)', amount: staff.length * 1200, color: 'bg-emerald-500' },
                                { label: 'NSSF (Pension)', amount: staff.length * 1080, color: 'bg-amber-500' },
                            ].map((d, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">{d.label}</span>
                                        <span>KES {d.amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`${d.color} h-full`} style={{ width: '40%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-indigo-600">
                            <DocumentTextIcon className="w-6 h-6" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Payslip Designer</h3>
                        </div>
                        <p className="text-xs font-medium text-slate-500">Customize institutional payslip templates with branding and statutory disclosures.</p>
                        <button className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all">Configure Template</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

