
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

    return (
        <div className="w-full">
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
                activityLog={hrLogs}
                showEduFlow={true}
                users={users}
                onLogAction={props.onLogAction}
            />
        </div>
    );
};

