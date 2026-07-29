
import React, { useState, useMemo } from 'react';
import type { User, Institution, PayrollRecord, LeaveRequest, LetterheadConfig, ActivityLog } from '../../types';
import { HRManager } from './HRManager';
import { Header } from '../Header';
import { ActivityLogPanel } from '../common/ActivityLogPanel';

const EduFlowManager = React.lazy(() => import('../common/EduFlowManager').then(m => ({ default: m.EduFlowManager })));

interface HROfficerViewProps {
    currentUser?: User;
    currentInstitution?: Institution;
    users?: User[];
    payrollRecords?: PayrollRecord[];
    leaveRequests?: LeaveRequest[];
    onProcessPayroll?: (records: PayrollRecord[]) => Promise<void>;
    onUpdateLeaveStatus?: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onAddUser?: (data: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    onAddDepartment?: (name: string) => Promise<void>;
    onUpdateDepartment?: (id: string, name: string) => void;
    onDeleteDepartment?: (id: string) => void;
    letterheadConfig?: LetterheadConfig;
    footerImageUrl?: string | null;
    companyDetails?: any;
    /** Activity log entries — filtered for HR events */
    activityLog?: ActivityLog[];
    onLogAction?: (action: string) => Promise<void>;
}

export const HROfficerView: React.FC<HROfficerViewProps> = (props) => {
    const [
        currentUser = { name: 'User' } as any,
        currentInstitution = { name: 'Institution' } as any,
        users = [],
        payrollRecords = [],
        leaveRequests = [],
        onProcessPayroll = async () => {},
        onUpdateLeaveStatus = async () => {},
        onAddUser = async () => {},
        onEditUser = async () => {},
        onDeleteUser = async () => {}
    ] = [props.currentUser, props.currentInstitution, props.users, props.payrollRecords, props.leaveRequests,
         props.onProcessPayroll, props.onUpdateLeaveStatus, props.onAddUser, props.onEditUser, props.onDeleteUser];

    const activityLog = props.activityLog || [];

    // Filter for HR-relevant events
    const hrLogs = useMemo(() =>
        activityLog.filter(l => {
            const a = (l.action || '').toLowerCase();
            return a.includes('payroll') || a.includes('leave') || a.includes('staff') ||
                a.includes('employee') || a.includes('attendance') || a.includes('user') ||
                a.includes('onboard') || a.includes('offboard') || a.includes('hr') ||
                ((l.module || '') as string) === 'HR';
        }),
    [activityLog]);

    const [activeTab, setActiveTab] = useState<'hr' | 'eduflow' | 'activity_log'>('hr');

    return (
        <div className="space-y-10 w-full">
            {/* Hero / Welcome Section */}
            <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-900">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Workforce Integrity active</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Human Capital Command</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Welcome back, {currentUser.name}. Managing <span className="text-indigo-600 font-black">{users.length} professional staff</span> for {currentInstitution.name}.</p>
                    </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-4">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('hr')}
                            className={`py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'hr' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            HR Management
                        </button>
                        <button
                            onClick={() => setActiveTab('eduflow')}
                            className={`py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'eduflow' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            EduFlow Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('activity_log')}
                            className={`py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'activity_log' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Activity Log
                        </button>
                    </nav>
                </div>

                {/* Main Content */}
                {activeTab === 'hr' ? (
                    <HRManager 
                        currentUser={currentUser}
                        staff={users.filter(u => u.role?.toLowerCase().trim() !== 'student')}
                        payrollRecords={payrollRecords}
                        leaveRequests={leaveRequests}
                        institution={currentInstitution}
                        onProcessPayroll={onProcessPayroll}
                        onUpdateLeaveStatus={onUpdateLeaveStatus}
                        onAddUser={onAddUser}
                        onEditUser={onEditUser}
                        onDeleteUser={onDeleteUser}
                        letterheadConfig={props.letterheadConfig}
                        footerImageUrl={props.footerImageUrl}
                        companyDetails={props.companyDetails}
                    />

                ) : activeTab === 'activity_log' ? (
                    <ActivityLogPanel logs={hrLogs} module="HR" />
                ) : (
                    <React.Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="w-8 h-8 animate-spin text-slate-350 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>}>
                        <EduFlowManager 
                            context="academic"
                            currentUser={currentUser}
                            currentInstitution={currentInstitution || null}
                            subjects={[]}
                            users={users}
                            courses={[]}
                        />
                    </React.Suspense>
                )}
        </div>
    );
};

