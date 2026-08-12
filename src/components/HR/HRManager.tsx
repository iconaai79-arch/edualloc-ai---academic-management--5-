
import React, { useState } from 'react';
import type { User, PayrollRecord, LeaveRequest, Institution, LetterheadConfig } from '../../types';
import { PayrollEngine } from './PayrollEngine';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { XIcon } from '../icons/XIcon';
import { ClockIcon } from '../icons/ClockIcon';
import TeacherCheckInAdminView from '../TeacherCheckInAdminView';
import { BiometricAttendanceDashboard } from './BiometricAttendanceDashboard';
import { apiService } from '../../services/apiService';
import { 
    generateStaffPayslipPdf, 
    generateStaffP9Pdf, 
    generateStatutoryDeductionsPdf,
    downloadBankAdvicePdf
} from '../../services/pdfService';

interface HRManagerProps {
    currentUser?: User;
    staff: User[];
    payrollRecords: PayrollRecord[];
    leaveRequests: LeaveRequest[];
    institution: Institution;
    onProcessPayroll: (records: PayrollRecord[]) => Promise<void>;
    onUpdateLeaveStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onAddUser?: (data: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    letterheadConfig?: LetterheadConfig;
    footerImageUrl?: string | null;
    activeTab?: 'roster' | 'payroll' | 'leave' | 'attendance' | 'reports' | 'analytics';
    setActiveTab?: (tab: 'roster' | 'payroll' | 'leave' | 'attendance' | 'reports' | 'analytics') => void;
    companyDetails?: any;
}

export const HRManager: React.FC<HRManagerProps> = ({
    currentUser,
    staff: rawStaff,
    payrollRecords,
    leaveRequests,
    institution,
    onProcessPayroll,
    onUpdateLeaveStatus,
    onAddUser,
    onEditUser,
    onDeleteUser,
    letterheadConfig,
    footerImageUrl,
    activeTab: propActiveTab,
    setActiveTab: propSetActiveTab,
    companyDetails
}) => {
    const staff = (rawStaff || []).filter(member => {
        if (!member || !member.role) return false;
        const r = member.role.toLowerCase().trim();
        return r !== 'student' && r !== 'parent' && r !== 'visitor';
    });

    const [localActiveTab, setLocalActiveTab] = useState<'roster' | 'payroll' | 'leave' | 'attendance' | 'reports' | 'analytics'>('roster');
    const activeTab = propActiveTab || localActiveTab;
    const setActiveTab = propSetActiveTab || setLocalActiveTab;

    
    // Onboarding & Edit Form States
    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<User | null>(null);
    const [onboardForm, setOnboardForm] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        role: 'doctor',
        password: '',
        employmentDate: '',
        nationalId: '',
        employmentTerms: 'Permanent & Pensionable',
        basicSalary: 0,
        kraPin: '',
        nssfNo: '',
        shifNumber: '',
        bankName: 'Equity Bank',
        bankBranch: '',
        bankAccountNumber: ''
    });

    const handleOpenEditStaff = (member: User) => {
        setEditingStaff(member);
        let m = member.metadata || {};
        if (typeof m === 'string') {
            try { m = JSON.parse(m); } catch (e) { m = {}; }
        }
        const salaryVal = Number(m.basicSalary || m.basic_salary || (member as any).basicSalary || (member as any).basic_salary || (member as any).basic) || 0;
        setOnboardForm({
            name: member.name || '',
            email: member.email || '',
            phoneNumber: member.phoneNumber || '',
            role: member.role || 'doctor',
            password: '',
            employmentDate: m.employmentDate || (member as any).employmentDate || '',
            nationalId: m.nationalId || (member as any).nationalId || '',
            employmentTerms: m.employmentTerms || (member as any).employmentTerms || 'Permanent & Pensionable',
            basicSalary: salaryVal,
            kraPin: m.kraPin || (member as any).kraPin || '',
            nssfNo: m.nssfNo || (member as any).nssfNo || '',
            shifNumber: m.shifNumber || m.nhifNo || (member as any).shifNumber || '',
            bankName: m.bankName || (member as any).bankName || 'Equity Bank',
            bankBranch: m.bankBranch || (member as any).bankBranch || '',
            bankAccountNumber: m.bankAccountNumber || (member as any).bankAccountNumber || (member as any).accountNumber || ''
        });
        setShowOnboardModal(true);
    };

    const handleOnboardSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onboardForm.name || !onboardForm.email) {
            alert('Name and Email are required.');
            return;
        }
        try {
            const salary = Number(onboardForm.basicSalary) || 0;
            const hrMetadata = {
                employmentDate: onboardForm.employmentDate,
                nationalId: onboardForm.nationalId,
                employmentTerms: onboardForm.employmentTerms,
                basicSalary: salary,
                basic_salary: salary,
                kraPin: onboardForm.kraPin,
                nssfNo: onboardForm.nssfNo,
                shifNumber: onboardForm.shifNumber,
                bankName: onboardForm.bankName,
                bankBranch: onboardForm.bankBranch,
                bankAccountNumber: onboardForm.bankAccountNumber
            };

            if (editingStaff) {
                let existingMeta = editingStaff.metadata || {};
                if (typeof existingMeta === 'string') {
                    try { existingMeta = JSON.parse(existingMeta); } catch (e) { existingMeta = {}; }
                }
                const updatedPayload = {
                    ...onboardForm,
                    basicSalary: salary,
                    basic_salary: salary,
                    metadata: {
                        ...existingMeta,
                        ...hrMetadata
                    }
                };

                if (onEditUser) {
                    await onEditUser(editingStaff.id, updatedPayload);
                }
                await apiService.updateModuleRecord('users', editingStaff.id, {
                    name: onboardForm.name,
                    email: onboardForm.email,
                    phoneNumber: onboardForm.phoneNumber,
                    role: onboardForm.role,
                    basicSalary: salary,
                    basic_salary: salary,
                    metadata: {
                        ...existingMeta,
                        ...hrMetadata
                    }
                }).catch(() => null);
                alert(`✓ Staff record & HR file for ${onboardForm.name} updated successfully!`);
            } else if (onAddUser) {
                await onAddUser({
                    ...onboardForm,
                    basicSalary: salary,
                    basic_salary: salary,
                    metadata: hrMetadata
                });
                alert(`✓ Successfully onboarded ${onboardForm.name}!`);
            }
            setShowOnboardModal(false);
            setEditingStaff(null);
            setOnboardForm({
                name: '', email: '', phoneNumber: '', role: 'teacher', password: '',
                employmentDate: '', nationalId: '', employmentTerms: 'Permanent & Pensionable', basicSalary: 0,
                kraPin: '', nssfNo: '', shifNumber: '', bankName: 'Equity Bank', bankBranch: '', bankAccountNumber: ''
            });
        } catch (error: any) {
            console.error(error);
            alert('Failed to save staff record: ' + (error.message || error));
        }
    };

    // Reports Form States
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('January 2026');
    const [selectedP9StaffId, setSelectedP9StaffId] = useState('');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [selectedStatutoryMonth, setSelectedStatutoryMonth] = useState('January 2026');
    
    // Preview State
    const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');

    // Salary Bank Disbursement Advice States
    const [showBankScheduleModal, setShowBankScheduleModal] = useState(false);
    const [schedulePeriod, setSchedulePeriod] = useState('');
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleStaffAccounts, setScheduleStaffAccounts] = useState<any[]>([]);
    const [scheduleSourceBankId, setScheduleSourceBankId] = useState('');
    const [scheduleChequeNumber, setScheduleChequeNumber] = useState('');
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);

    React.useEffect(() => {
        if (showBankScheduleModal) {
            apiService.fetchModuleRecords<any>('school_bank_accounts', institution.id)
                .then(res => setBankAccounts(res || []))
                .catch(() => setBankAccounts([]));
        }
    }, [showBankScheduleModal, institution]);

    React.useEffect(() => {
        if (showBankScheduleModal && (schedulePeriod || selectedStatutoryMonth)) {
            const period = schedulePeriod || selectedStatutoryMonth;
            const periodRecords = payrollRecords.filter(r => r.month === period);
            const mapped = periodRecords.map(r => {
                const s = staff.find(st => st.id === r.staffId);
                return {
                    payrollId: r.id,
                    staffId: r.staffId,
                    staffName: r.staffName || s?.name || 'Staff',
                    netPay: r.netSalary || 0,
                    bankName: s?.metadata?.bankName || 'Equity Bank',
                    bankBranch: s?.metadata?.bankBranch || 'Main Branch',
                    accountNumber: s?.metadata?.bankAccountNumber || '1234567890'
                };
            });
            
            if (mapped.length === 0 && staff) {
                const staffUsers = staff.filter(u => ['teacher', 'staff', 'admin', 'lecturer'].includes(u.role));
                const fallbackMapped = staffUsers.map((u, i) => ({
                    payrollId: `man_${Date.now()}_${i}`,
                    staffId: u.id,
                    staffName: u.name,
                    netPay: 0,
                    bankName: u.metadata?.bankName || 'Equity Bank',
                    bankBranch: u.metadata?.bankBranch || 'Main Branch',
                    accountNumber: u.metadata?.bankAccountNumber || '1234567890'
                }));
                setScheduleStaffAccounts(fallbackMapped);
            } else {
                setScheduleStaffAccounts(mapped);
            }
        }
    }, [showBankScheduleModal, schedulePeriod, selectedStatutoryMonth, payrollRecords, staff]);

    const tabs = [
        { id: 'roster', label: 'Staff Roster', icon: UserGroupIcon },
        { id: 'payroll', label: 'Payroll Hub', icon: BanknotesIcon },
        { id: 'leave', label: 'Leave Governance', icon: CalendarDaysIcon },
        { id: 'attendance', label: 'Attendance Tracker', icon: ClockIcon },
        { id: 'reports', label: 'Compliance Reports', icon: DocumentTextIcon },
        { id: 'analytics', label: 'Workforce Intel', icon: BarChart3Icon },
    ] as const;

    const handleGeneratePayslip = async () => {
        if (!selectedStaffId) {
            alert('Please select an employee first.');
            return;
        }
        const member = staff.find(s => s.id === selectedStaffId);
        if (!member) return;

        // Try to find the matching processed payroll record
        const record = payrollRecords.find(r => r.staffId === selectedStaffId && r.month === selectedMonth);
        if (!record) {
            alert(`No payroll record found for ${member.name} in ${selectedMonth}. Please process payroll first.`);
            return;
        }

        try {
            let templateConfig = undefined;
            try {
                const stored = localStorage.getItem('eduai_payslip_template_config');
                if (stored) {
                    templateConfig = JSON.parse(stored);
                }
            } catch (e) {
                console.error('[HRManager] Error loading template config:', e);
            }

            const dataUri = await generateStaffPayslipPdf(member, record, institution, templateConfig);
            setPreviewTitle(`Payslip - ${member.name} (${selectedMonth})`);
            setSelectedReportUrl(dataUri);
        } catch (e) {
            console.error(e);
            alert('Failed to generate payslip.');
        }
    };

    const handleGenerateP9 = async () => {
        if (!selectedP9StaffId) {
            alert('Please select an employee first.');
            return;
        }
        const member = staff.find(s => s.id === selectedP9StaffId);
        if (!member) return;

        // Filter records for the selected year
        const yearRecords = payrollRecords.filter(r => r.staffId === selectedP9StaffId && r.month.endsWith(selectedYear));
        
        try {
            const dataUri = await generateStaffP9Pdf(member, yearRecords, selectedYear, institution);
            setPreviewTitle(`P9 Certificate - ${member.name} (${selectedYear})`);
            setSelectedReportUrl(dataUri);
        } catch (e) {
            console.error(e);
            alert('Failed to generate P9 card.');
        }
    };

    const handleGenerateStatutoryDeductions = async () => {
        const monthRecords = payrollRecords.filter(r => r.month === selectedStatutoryMonth);
        if (monthRecords.length === 0) {
            alert(`No payroll records processed for the month of ${selectedStatutoryMonth}.`);
            return;
        }

        try {
            const dataUri = await generateStatutoryDeductionsPdf(selectedStatutoryMonth, monthRecords, institution);
            setPreviewTitle(`Statutory Deductions - ${selectedStatutoryMonth}`);
            setSelectedReportUrl(dataUri);
        } catch (e) {
            console.error(e);
            alert('Failed to generate compliance report.');
        }
    };

    return (
        <div className="space-y-8">
            {/* Elite Navigation Bar */}
            {!propActiveTab && (
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex gap-2 flex-wrap">
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
                    <div className="hidden md:block px-6 border-l border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Human Capital</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{staff.length} Active Personnel</p>
                    </div>
                </div>
            )}

            {/* Dynamic View Engine */}
            <div>
                {activeTab === 'roster' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-widest text-sm">Personnel Directory</h3>
                            <button 
                                onClick={() => {
                                    setEditingStaff(null);
                                    setOnboardForm({
                                        name: '', email: '', phoneNumber: '', role: 'teacher', password: '',
                                        employmentDate: '', nationalId: '', employmentTerms: 'Permanent & Pensionable', basicSalary: 0,
                                        kraPin: '', nssfNo: '', shifNumber: '', bankName: 'Equity Bank', bankBranch: '', bankAccountNumber: ''
                                    });
                                    setShowOnboardModal(true);
                                }}
                                className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                Onboard Staff
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 overflow-y-auto" style={{ maxHeight: '560px' }}>
                            {staff.map((member, i) => (
                                <div key={i} className="group p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-600 opacity-0 group-hover:opacity-10 rounded-full -mr-10 -mt-10 transition-all duration-700 group-hover:scale-150" />
                                    <div className="relative space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm border border-slate-50 dark:border-slate-600 text-2xl font-black text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                {member.name.charAt(0)}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white dark:bg-slate-700 rounded-full border border-slate-100 dark:border-slate-600 text-slate-400">Verified</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.role} • {member.email || member.phoneNumber}</p>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => handleOpenEditStaff(member)}
                                                className="flex-1 py-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-1"
                                            >
                                                Edit HR File & Details
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedStaffId(member.id);
                                                    setActiveTab('payroll');
                                                }}
                                                className="flex-1 py-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-605 transition-all"
                                            >
                                                Pay History
                                            </button>
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
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Absence Requests</h3>
                                <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '480px' }}>
                                    {leaveRequests.filter(r => r.status === 'pending').length === 0 ? (
                                        <div className="py-12 text-center space-y-2">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                <CalendarDaysIcon className="w-8 h-8" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending requests</p>
                                        </div>
                                    ) : (
                                        leaveRequests.filter(r => r.status === 'pending').map((req, i) => (
                                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 dark:border-slate-700 hover:bg-white hover:shadow-xl transition-all group">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                                        <UserGroupIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{staff.find(s => s.id === req.staffId)?.name || 'Unknown Staff'}</p>
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

                {activeTab === 'reports' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 animate-in fade-in duration-500">
                        {/* Payslip Card */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-6">
                            <div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit mb-4">
                                    <DocumentTextIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Staff Payslips</h3>
                                <p className="text-xs text-slate-400 mt-2">Generate official monthly payslips detailing base pay, custom allowances, standard statutory deductions, and biometric penalties.</p>
                                
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Employee</label>
                                        <select 
                                            value={selectedStaffId} 
                                            onChange={e => setSelectedStaffId(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">-- Choose Staff --</option>
                                            {staff.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Month</label>
                                        <select 
                                            value={selectedMonth} 
                                            onChange={e => setSelectedMonth(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="January 2026">January 2026</option>
                                            <option value="February 2026">February 2026</option>
                                            <option value="March 2026">March 2026</option>
                                            <option value="April 2026">April 2026</option>
                                            <option value="May 2026">May 2026</option>
                                            <option value="June 2026">June 2026</option>
                                            <option value="July 2026">July 2026</option>
                                            <option value="August 2026">August 2026</option>
                                            <option value="September 2026">September 2026</option>
                                            <option value="October 2026">October 2026</option>
                                            <option value="November 2026">November 2026</option>
                                            <option value="December 2026">December 2026</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleGeneratePayslip}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                Generate Payslip
                            </button>
                        </div>

                        {/* P9 Card */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-6">
                            <div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit mb-4">
                                    <DocumentTextIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">P9 Tax Deduction Card</h3>
                                <p className="text-xs text-slate-400 mt-2">Generate standard yearly P9 tax certificates required by employees for filing annual KRA income tax returns.</p>
                                
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Employee</label>
                                        <select 
                                            value={selectedP9StaffId} 
                                            onChange={e => setSelectedP9StaffId(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">-- Choose Staff --</option>
                                            {staff.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Year</label>
                                        <select 
                                            value={selectedYear} 
                                            onChange={e => setSelectedYear(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="2026">2026</option>
                                            <option value="2025">2025</option>
                                            <option value="2024">2024</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleGenerateP9}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                Generate P9 Certificate
                            </button>
                        </div>

                        {/* Statutory Deductions Card */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-6">
                            <div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl w-fit mb-4">
                                    <DocumentTextIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Statutory Report</h3>
                                <p className="text-xs text-slate-400 mt-2">Generate aggregated summaries of statutory deductions (NSSF, SHIF, Housing Levy, and PAYE) for compliance submissions.</p>
                                
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Month</label>
                                        <select 
                                            value={selectedStatutoryMonth} 
                                            onChange={e => setSelectedStatutoryMonth(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-755 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="January 2026">January 2026</option>
                                            <option value="February 2026">February 2026</option>
                                            <option value="March 2026">March 2026</option>
                                            <option value="April 2026">April 2026</option>
                                            <option value="May 2026">May 2026</option>
                                            <option value="June 2026">June 2026</option>
                                            <option value="July 2026">July 2026</option>
                                            <option value="August 2026">August 2026</option>
                                            <option value="September 2026">September 2026</option>
                                            <option value="October 2026">October 2026</option>
                                            <option value="November 2026">November 2026</option>
                                            <option value="December 2026">December 2026</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleGenerateStatutoryDeductions}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                Generate Statutory Summary
                            </button>
                        </div>

                        {/* Bank Advice Card */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-6">
                            <div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit mb-4">
                                    <BanknotesIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Bank Advice Letter</h3>
                                <p className="text-xs text-slate-400 mt-2">Generate bank disbursement instruction letters to process salary payments for all staff members.</p>
                                
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Month</label>
                                        <select 
                                            value={selectedStatutoryMonth} 
                                            onChange={e => setSelectedStatutoryMonth(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="January 2026">January 2026</option>
                                            <option value="February 2026">February 2026</option>
                                            <option value="March 2026">March 2026</option>
                                            <option value="April 2026">April 2026</option>
                                            <option value="May 2026">May 2026</option>
                                            <option value="June 2026">June 2026</option>
                                            <option value="July 2026">July 2026</option>
                                            <option value="August 2026">August 2026</option>
                                            <option value="September 2026">September 2026</option>
                                            <option value="October 2026">October 2026</option>
                                            <option value="November 2026">November 2026</option>
                                            <option value="December 2026">December 2026</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setSchedulePeriod(selectedStatutoryMonth);
                                    setShowBankScheduleModal(true);
                                }}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                Generate Bank Advice
                            </button>
                        </div>

                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                        {/* Workforce Stats */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Workforce Capacity</h3>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Index</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white">98.4%</p>
                                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full w-[98.4%]" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in space-y-8">
                        <BiometricAttendanceDashboard
                            staff={staff}
                            institution={institution}
                        />

                        {/* Existing Teacher Check-In System */}
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-700">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Manual Check-In System</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Legacy teacher attendance tracker (non-biometric)</p>
                            </div>
                            <div className="p-4">
                                <TeacherCheckInAdminView
                                    currentUser={currentUser!}
                                    currentInstitution={institution}
                                    letterheadConfig={letterheadConfig}
                                    footerImageUrl={footerImageUrl}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium PDF Preview Modal */}
            {selectedReportUrl && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider">{previewTitle}</h3>
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Kenyan Statutory Compliant Document</p>
                            </div>
                            <button 
                                onClick={() => setSelectedReportUrl(null)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-500 rounded-xl transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* PDF Frame */}
                        <div className="flex-1 p-6 bg-slate-100 dark:bg-slate-950/80">
                            <iframe 
                                src={selectedReportUrl} 
                                className="w-full h-[65vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white" 
                                title="Report Preview"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = selectedReportUrl;
                                    link.download = `${previewTitle.replace(/\s+/g, '_')}.pdf`;
                                    link.click();
                                }}
                                className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                            >
                                Download Document
                            </button>
                            <button 
                                onClick={() => setSelectedReportUrl(null)}
                                className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-300"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Onboard & Edit Staff Glassmorphic Modal */}
            {showOnboardModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">{editingStaff ? 'Edit Staff HR File & Profile' : 'Onboard New Staff'}</h3>
                                <p className="text-[10px] font-semibold opacity-80">{editingStaff ? 'Update employee contract terms, national ID, basic salary, KRA PIN & bank details' : 'Register new personnel to the institution directory'}</p>
                            </div>
                            <button 
                                onClick={() => setShowOnboardModal(false)}
                                className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleOnboardSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[78vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Full Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={onboardForm.name}
                                        onChange={e => setOnboardForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Email Address *</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={onboardForm.email}
                                        onChange={e => setOnboardForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                        placeholder="jane.doe@institution.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={onboardForm.phoneNumber}
                                        onChange={e => setOnboardForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="+254 712 345678"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Institutional Role</label>
                                    <select 
                                        value={onboardForm.role}
                                        onChange={e => setOnboardForm(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                    >
                                        <option value="doctor">Doctor / Physician</option>
                                        <option value="nurse">Nurse / Triage Officer</option>
                                        <option value="receptionist">Receptionist / Front Desk Officer</option>
                                        <option value="cashier">Finance / Cashier Officer</option>
                                        <option value="hr_officer">HR Officer</option>
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="lab_tech">Lab Technologist</option>
                                        <option value="support_staff">Support Staff</option>
                                        <option value="driver">Driver</option>
                                        <option value="trainer">Trainer</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            {/* ── Employment & Contract Terms Section ── */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        💼 Contract & Compensation Terms
                                    </h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Employment Date</label>
                                        <input
                                            type="date"
                                            value={onboardForm.employmentDate}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, employmentDate: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">National ID / Passport No</label>
                                        <input
                                            type="text"
                                            value={onboardForm.nationalId}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, nationalId: e.target.value }))}
                                            placeholder="e.g. 34892019"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Employment Terms</label>
                                        <select
                                            value={onboardForm.employmentTerms}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, employmentTerms: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="Permanent & Pensionable">Permanent & Pensionable</option>
                                            <option value="Fixed-Term Contract">Fixed-Term Contract</option>
                                            <option value="Casual / Day Worker">Casual / Day Worker</option>
                                            <option value="Intern / Probationary">Intern / Probationary</option>
                                            <option value="Visiting Consultant">Visiting Consultant</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Basic Monthly Salary (KES)</label>
                                        <input
                                            type="number"
                                            value={onboardForm.basicSalary || ''}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, basicSalary: Number(e.target.value) }))}
                                            placeholder="e.g. 85000"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-emerald-600 dark:text-emerald-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Statutory & Banking Section ── */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        🏛 Statutory Tax & Bank Account Details
                                    </h4>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">KRA PIN Number</label>
                                        <input
                                            type="text"
                                            value={onboardForm.kraPin}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, kraPin: e.target.value.toUpperCase() }))}
                                            placeholder="A019482910Z"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">NSSF Number</label>
                                        <input
                                            type="text"
                                            value={onboardForm.nssfNo}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, nssfNo: e.target.value }))}
                                            placeholder="10482019"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">SHIF / NHIF No</label>
                                        <input
                                            type="text"
                                            value={onboardForm.shifNumber}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, shifNumber: e.target.value }))}
                                            placeholder="SHIF-94820"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Bank Name</label>
                                        <select
                                            value={onboardForm.bankName}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, bankName: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="Equity Bank">Equity Bank</option>
                                            <option value="KCB Bank">KCB Bank</option>
                                            <option value="Cooperative Bank">Cooperative Bank</option>
                                            <option value="NCBA Bank">NCBA Bank</option>
                                            <option value="Absa Bank">Absa Bank</option>
                                            <option value="Stanbic Bank">Stanbic Bank</option>
                                            <option value="Family Bank">Family Bank</option>
                                            <option value="Standard Chartered">Standard Chartered</option>
                                            <option value="M-Pesa STK Express">M-Pesa Mobile Money</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Bank Branch</label>
                                        <input
                                            type="text"
                                            value={onboardForm.bankBranch}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, bankBranch: e.target.value }))}
                                            placeholder="Nairobi Main"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Account / Phone No</label>
                                        <input
                                            type="text"
                                            value={onboardForm.bankAccountNumber}
                                            onChange={e => setOnboardForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                                            placeholder="1294820194"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 text-center"
                                >
                                    {editingStaff ? '✓ Save Personnel HR File' : 'Confirm Onboarding'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setShowOnboardModal(false)}
                                    className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Salary Bank Disbursement Advice Modal */}
            {showBankScheduleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Salary Bank Payment Schedule</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Generate bank advice letter detailing payments to each staff account</p>
                            </div>
                            <button 
                                onClick={() => setShowBankScheduleModal(false)}
                                className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <XIcon className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body / Inputs */}
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
                            
                            {/* Parameter Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                
                                {/* Period Select */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payroll Period *</label>
                                    <select
                                        value={schedulePeriod}
                                        onChange={(e) => setSchedulePeriod(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                    >
                                        <option value={selectedStatutoryMonth}>{selectedStatutoryMonth}</option>
                                        {Array.from(new Set((payrollRecords || []).map(r => (r as any).period || (r as any).payPeriod || ''))).filter(p => p !== selectedStatutoryMonth).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Source Account Select */}
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Debit Bank Account *</label>
                                    <select
                                        value={scheduleSourceBankId}
                                        onChange={(e) => setScheduleSourceBankId(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                    >
                                        <option value="">-- Choose School Debit Account --</option>
                                        {(bankAccounts || []).map(ba => (
                                            <option key={ba.id} value={ba.id}>
                                                {ba.bankName || ba.bank_name} - {ba.accountName || ba.account_name} ({ba.accountNumber || ba.account_number})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Cheque # */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cheque Number / Ref</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CHQ-00123"
                                        value={scheduleChequeNumber}
                                        onChange={(e) => setScheduleChequeNumber(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                    />
                                </div>

                            </div>

                            {/* Datepicker Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Schedule Table */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs bg-white dark:bg-slate-900">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                                    <span className="font-black uppercase tracking-wider text-[10px] text-slate-500">Beneficiary Accounts</span>
                                    <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-full">{scheduleStaffAccounts.length} Staff Members</span>
                                </div>
                                <div className="overflow-x-auto max-h-[30vh]">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                                <th className="py-2.5 px-3">Staff Name</th>
                                                <th className="py-2.5 px-3">Bank Name</th>
                                                <th className="py-2.5 px-3">Branch</th>
                                                <th className="py-2.5 px-3">Account Number</th>
                                                <th className="py-2.5 px-3 text-right">Net Salary</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scheduleStaffAccounts.map((item, idx) => (
                                                <tr key={item.payrollId || idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                                                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{item.staffName}</td>
                                                    <td className="py-2.5 px-3">
                                                        <input
                                                            type="text"
                                                            value={item.bankName}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleStaffAccounts];
                                                                updated[idx].bankName = e.target.value;
                                                                setScheduleStaffAccounts(updated);
                                                            }}
                                                            className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded outline-none font-medium w-full"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <input
                                                            type="text"
                                                            value={item.bankBranch}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleStaffAccounts];
                                                                updated[idx].bankBranch = e.target.value;
                                                                setScheduleStaffAccounts(updated);
                                                            }}
                                                            className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded outline-none font-medium w-full"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <input
                                                            type="text"
                                                            value={item.accountNumber}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleStaffAccounts];
                                                                updated[idx].accountNumber = e.target.value;
                                                                setScheduleStaffAccounts(updated);
                                                            }}
                                                            className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded outline-none font-medium w-full"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <input
                                                            type="number"
                                                            value={item.netPay || ''}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleStaffAccounts];
                                                                updated[idx].netPay = parseFloat(e.target.value) || 0;
                                                                setScheduleStaffAccounts(updated);
                                                            }}
                                                            className="px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded outline-none font-bold text-right w-24 text-emerald-600"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                            {scheduleStaffAccounts.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                                        No payroll records found for the selected period
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        {/* Modal Actions */}
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                            <button
                                onClick={() => setShowBankScheduleModal(false)}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!scheduleSourceBankId || scheduleStaffAccounts.length === 0}
                                onClick={() => {
                                    const bankObj = (bankAccounts || []).find(ba => ba.id === scheduleSourceBankId);
                                    downloadBankAdvicePdf({
                                        period: schedulePeriod,
                                        chequeNumber: scheduleChequeNumber,
                                        paymentDate: scheduleDate,
                                        sourceBankAccount: bankObj,
                                        staffDetails: scheduleStaffAccounts,
                                        institution: institution,
                                        companyDetails: companyDetails,
                                        logoUrl: null,
                                        letterheadUrl: null
                                    });
                                    setShowBankScheduleModal(false);
                                }}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-650 transition-all shadow-md disabled:opacity-50"
                            >
                                Download Bank Advice
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



