
import React from 'react';
import type { User, Institution, PayrollRecord, LeaveRequest } from '../../types';
import { HRManager } from './HRManager';
import { Header } from '../Header';

interface HROfficerViewProps {
    currentUser: User;
    currentInstitution: Institution;
    staff: User[];
    payrollRecords: PayrollRecord[];
    leaveRequests: LeaveRequest[];
    onProcessPayroll: (records: PayrollRecord[]) => Promise<void>;
    onUpdateLeaveStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
}

export const HROfficerView: React.FC<HROfficerViewProps> = ({
    currentUser,
    currentInstitution,
    staff,
    payrollRecords,
    leaveRequests,
    onProcessPayroll,
    onUpdateLeaveStatus
}) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header 
                currentUser={currentUser} 
                institutionName={currentInstitution.name} 
                onLogout={() => window.location.reload()}
            />
            
            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-10">
                {/* Hero / Welcome Section */}
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Workforce Integrity active</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Human Capital Command</h1>
                        <p className="text-slate-500 font-medium">Welcome back, {currentUser.name}. Managing <span className="text-indigo-600 font-black">{staff.length} professional staff</span> for {currentInstitution.name}.</p>
                    </div>
                </div>

                {/* Centralized HR Hub */}
                <HRManager 
                    staff={staff}
                    payrollRecords={payrollRecords}
                    leaveRequests={leaveRequests}
                    institution={currentInstitution}
                    onProcessPayroll={onProcessPayroll}
                    onUpdateLeaveStatus={onUpdateLeaveStatus}
                />
            </main>
        </div>
    );
};
