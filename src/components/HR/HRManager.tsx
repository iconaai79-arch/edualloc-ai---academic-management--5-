
import React, { useState } from 'react';
import type { User, PayrollRecord, LeaveRequest, Institution } from '../../types';
import { PayrollEngine } from './PayrollEngine';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';

interface HRManagerProps {
    staff: User[];
    payrollRecords: PayrollRecord[];
    leaveRequests: LeaveRequest[];
    institution: Institution;
    onProcessPayroll: (records: PayrollRecord[]) => Promise<void>;
    onUpdateLeaveStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
}

export const HRManager: React.FC<HRManagerProps> = ({
    staff,
    payrollRecords,
    leaveRequests,
    institution,
    onProcessPayroll,
    onUpdateLeaveStatus
}) => {
    const [activeTab, setActiveTab] = useState<'roster' | 'payroll' | 'leave' | 'analytics'>('roster');

    const tabs = [
        { id: 'roster', label: 'Staff Roster', icon: UserGroupIcon },
        { id: 'payroll', label: 'Payroll Hub', icon: BanknotesIcon },
        { id: 'leave', label: 'Leave Governance', icon: CalendarDaysIcon },
        { id: 'analytics', label: 'Workforce Intel', icon: BarChart3Icon },
    ] as const;

    return (
        <div className="space-y-8">
            {/* Elite Navigation Bar */}
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
                <div className="hidden md:block px-6 border-l border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Human Capital</p>
                    <p className="text-sm font-black text-slate-900">{staff.length} Active Personnel</p>
                </div>
            </div>

            {/* Dynamic View Engine */}
            <div className="min-h-[600px]">
                {activeTab === 'roster' && (
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest text-sm">Personnel Directory</h3>
                            <button className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg">Onboard Staff</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                            {staff.map((member, i) => (
                                <div key={i} className="group p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-600 opacity-0 group-hover:opacity-10 rounded-full -mr-10 -mt-10 transition-all duration-700 group-hover:scale-150" />
                                    <div className="relative space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-50 text-2xl font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                {member.name.charAt(0)}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white rounded-full border border-slate-100 text-slate-400">Verified</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.role} • {member.email || member.phoneNumber}</p>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button className="flex-1 py-3 bg-white text-slate-900 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">View Files</button>
                                            <button className="flex-1 py-3 bg-white text-slate-900 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Pay History</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'payroll' && (
                    <PayrollEngine 
                        staff={staff}
                        payrollRecords={payrollRecords}
                        institution={institution}
                        onProcessPayroll={onProcessPayroll}
                    />
                )}

                {activeTab === 'leave' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Absence Requests</h3>
                                <div className="space-y-4">
                                    {leaveRequests.filter(r => r.status === 'pending').length === 0 ? (
                                        <div className="py-12 text-center space-y-2">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                <CalendarIcon className="w-8 h-8" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending requests</p>
                                        </div>
                                    ) : (
                                        leaveRequests.filter(r => r.status === 'pending').map((req, i) => (
                                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                                        <UserGroupIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{staff.find(s => s.id === req.staffId)?.name || 'Unknown Staff'}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.type} Leave • {req.startDate} to {req.endDate}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => onUpdateLeaveStatus(req.id, 'rejected')} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">Reject</button>
                                                    <button onClick={() => onUpdateLeaveStatus(req.id, 'approved')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">Approve</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent" />
                            <div className="relative space-y-6">
                                <h3 className="text-xl font-black tracking-tight">Workforce Capacity</h3>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Index</p>
                                    <p className="text-3xl font-black">98.4%</p>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="bg-indigo-500 h-full w-[98.4%]" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400">On Leave Today</span>
                                        <span className="text-sm font-black">0 Staff</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400">Total Sick Leave (YTD)</span>
                                        <span className="text-sm font-black">12 Days</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

