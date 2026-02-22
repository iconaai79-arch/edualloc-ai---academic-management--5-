import React, { useState, useMemo, useEffect } from 'react';
import { BuySMSModal } from './BuySMSModal';
import { PlusIcon } from './icons/index';
import type { User, Department, Course, Institution, MpesaConfig, SmsConfig, SmsLog } from '../types';
import { apiService } from '../services/apiService';

interface CommunicationsManagerProps {
    users: User[];
    departments: Department[];
    courses: Course[];
    institutions?: Institution[]; // Optional for super admin view
    onSendSms: (recipient: string, message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<{ success: boolean; message: string }>;
    currentUser?: User;
    smsBalance?: number;
    currentInstitution?: Institution | null;
    mpesaConfig?: MpesaConfig;
    smsConfig?: SmsConfig;
    onRefreshData?: () => void;
}

const calculateSmsParts = (msg: string) => {
    // Simple regex to detect any character outside the standard GSM 7-bit alphabet basic and extended set.
    // This is a simplified check; a full GSM character set check is more complex.
    const isUnicode = /[^\u0000-\u007F\u0080-\u00FF€]/.test(msg);

    const charCount = msg.length;
    if (charCount === 0) {
        return { count: 0, characters: 0, limit: isUnicode ? 70 : 160, isUnicode };
    }

    if (isUnicode) {
        if (charCount <= 70) {
            return { count: 1, characters: charCount, limit: 70, isUnicode };
        }
        // Multi-part Unicode SMS messages are concatenated using 67 characters per part.
        return { count: Math.ceil(charCount / 67), characters: charCount, limit: 67, isUnicode };
    } else {
        if (charCount <= 160) {
            return { count: 1, characters: charCount, limit: 160, isUnicode };
        }
        // Multi-part GSM messages are concatenated using 153 characters per part.
        return { count: Math.ceil(charCount / 153), characters: charCount, limit: 153, isUnicode };
    }
};


export const CommunicationsManager: React.FC<CommunicationsManagerProps> = ({ users, departments, courses, institutions, onSendSms, currentUser, smsBalance, currentInstitution, mpesaConfig, smsConfig, onRefreshData }) => {
    const [isBuySMSModalOpen, setIsBuySMSModalOpen] = useState(false);
    const [recipientTarget, setRecipientTarget] = useState('individual'); // individual, all_staff, all_students, department, course, institution
    const [selectedId, setSelectedId] = useState(''); // Holds user ID, dept ID, course ID, or institution ID
    const [selectedInstitutionRoleFilter, setSelectedInstitutionRoleFilter] = useState<'all' | 'admins'>('all');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'sending' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
    const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    const [smsInfo, setSmsInfo] = useState({ count: 0, characters: 0, limit: 160, isUnicode: false });

    const isSuperAdminView = !!institutions;
    const institutionMap = useMemo(() => institutions ? new Map(institutions.map(i => [i.id, i.name])) : null, [institutions]);

    useEffect(() => {
        setSmsInfo(calculateSmsParts(message));
    }, [message]);

    const fetchLogs = async () => {
        if (!currentInstitution) return;
        setIsLoadingLogs(true);
        try {
            const logs = await apiService.fetchSmsLogs(currentInstitution.id);
            // Sort by date descending
            setSmsLogs(logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (err) {
            console.error('Failed to fetch SMS logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchLogs();
        }
    }, [activeTab, currentInstitution]);

    const filteredUsersForIndividualSelection = useMemo(() => {
        if (!searchTerm) return [];
        let availableUsers = users;

        // Filter for HOD
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos') && currentUser.departmentId) {
            availableUsers = users.filter(u => u.departmentId === currentUser.departmentId || (u.role === 'student' && courses.some(c => c.id === u.courseId && c.departmentId === currentUser.departmentId)));
        }

        return availableUsers.filter(u =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.staffId?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 100); // Limit to 100 results for performance
    }, [users, searchTerm, currentUser, courses]);

    const departmentOptions = useMemo(() => {
        if (isSuperAdminView && institutionMap) {
            return departments.map(d => ({
                id: d.id,
                name: `${institutionMap.get(d.institutionId) || 'Unknown Inst.'} - ${d.name}`
            }));
        }

        // Filter for HOD
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos') && currentUser.departmentId) {
            return departments.filter(d => d.id === currentUser.departmentId).map(d => ({ id: d.id, name: d.name }));
        }

        return departments.map(d => ({ id: d.id, name: d.name }));
    }, [departments, isSuperAdminView, institutionMap, currentUser]);

    const courseOptions = useMemo(() => {
        if (isSuperAdminView && institutionMap) {
            const departmentMap = new Map(departments.map(d => [d.id, d.institutionId]));
            return courses.map(c => ({
                id: c.id,
                name: `${institutionMap.get(departmentMap.get(c.departmentId) || '') || '...'} - ${c.name}`
            }));
        }

        // Filter for HOD
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos') && currentUser.departmentId) {
            return courses.filter(c => c.departmentId === currentUser.departmentId).map(c => ({ id: c.id, name: c.name }));
        }

        return courses.map(c => ({ id: c.id, name: c.name }));
    }, [courses, departments, isSuperAdminView, institutionMap, currentUser]);


    const recipientList = useMemo(() => {
        let baseUsers = users;

        // Apply base filter for HOD
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos') && currentUser.departmentId) {
            // HODs can message: staff in dept, students in dept courses
            const allowedCourseIds = new Set(courses.filter(c => c.departmentId === currentUser.departmentId).map(c => c.id));
            baseUsers = users.filter(u =>
                u.departmentId === currentUser.departmentId ||
                (u.role === 'student' && u.courseId && allowedCourseIds.has(u.courseId))
            );
        }

        switch (recipientTarget) {
            case 'individual': {
                const user = baseUsers.find(u => u.id === selectedId);
                return user ? [user] : [];
            }
            case 'all_staff':
                return baseUsers.filter(u => u.role !== 'student');
            case 'all_students':
                return baseUsers.filter(u => u.role === 'student');
            case 'department': {
                if (!selectedId) return [];
                // If HOD selects their dept, they get everyone in it
                // Even if they are admin, selecting a dept filters by that dept
                const staffInDept = baseUsers.filter(u => u.departmentId === selectedId && u.role !== 'student');
                // For students, find courses in that dept
                const coursesInDept = new Set(courses.filter(c => c.departmentId === selectedId).map(c => c.id));
                const studentsInDept = baseUsers.filter(u => u.role === 'student' && u.courseId && coursesInDept.has(u.courseId));

                const allInDept = new Map();
                staffInDept.forEach(u => allInDept.set(u.id, u));
                studentsInDept.forEach(u => allInDept.set(u.id, u));
                return Array.from(allInDept.values());
            }
            case 'course': {
                if (!selectedId) return [];
                return baseUsers.filter(u => u.courseId === selectedId);
            }
            case 'institution': {
                if (!selectedId) return [];
                const usersInInstitution = baseUsers.filter(u => u.institutionId === selectedId);
                if (selectedInstitutionRoleFilter === 'admins') {
                    return usersInInstitution.filter(u => u.role === 'admin');
                }
                return usersInInstitution;
            }
            default:
                return [];
        }
    }, [recipientTarget, selectedId, selectedInstitutionRoleFilter, users, courses, currentUser]);

    const validRecipients = useMemo(() => {
        const unique = new Map<string, User>();
        recipientList.forEach(u => {
            if (u.phoneNumber && u.phoneNumber.trim() !== '') {
                // Deduplicate by ID if available, otherwise by Phone Number
                const key = u.id || u.phoneNumber.trim();
                unique.set(key, u);
            }
        });
        return Array.from(unique.values());
    }, [recipientList]);

    const handleSend = async () => {
        const totalUnitsRequired = validRecipients.length * smsInfo.count;

        if ((smsBalance || 0) < totalUnitsRequired) {
            setStatus({
                type: 'error',
                message: `Insufficient balance. This send requires ${totalUnitsRequired.toLocaleString()} units, but you only have ${(smsBalance || 0).toLocaleString()}.`
            });
            setIsBuySMSModalOpen(true);
            return;
        }
        if (validRecipients.length === 0) {
            setStatus({ type: 'error', message: 'No recipients with valid phone numbers found for the selected group.' });
            return;
        }
        if (!message.trim()) {
            setStatus({ type: 'error', message: 'Message cannot be empty.' });
            return;
        }
        const confirmMsg = validRecipients.length === 1
            ? `You are about to send ${smsInfo.count} page(s) of SMS to 1 recipient. This will deduct ${totalUnitsRequired.toLocaleString()} units. Are you sure?`
            : `You are about to send ${smsInfo.count} page(s) of SMS to ${validRecipients.length} recipients. \n\nCalculation: ${validRecipients.length} recipients × ${smsInfo.count} pages = ${totalUnitsRequired.toLocaleString()} total units.\n\nAre you sure?`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        setStatus({ type: 'sending', message: 'Preparing to send...' });
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < validRecipients.length; i++) {
            const user = validRecipients[i];
            setStatus({ type: 'sending', message: `Sending ${i + 1} of ${validRecipients.length} to ${user.name}...` });
            try {
                const result = await onSendSms(user.phoneNumber, message, smsConfig, smsInfo.count, user.institutionId);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.warn(`Failed to send SMS to ${user.name} (${user.phoneNumber}): ${result.message}`);
                }
            } catch (e) {
                failCount++;
                console.error(`Error sending SMS to ${user.name} (${user.phoneNumber}):`, e);
            }
        }

        let finalMessage = `Finished. Sent: ${successCount}. Failed: ${failCount}.`;
        if (failCount > 0) {
            finalMessage += ` Failures may be due to invalid numbers or service issues. Check console for details.`;
        }
        setStatus({ type: 'success', message: finalMessage });

        setMessage('');
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
    };

    const handleRecipientTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRecipientTarget(e.target.value);
        setSelectedId('');
        setSearchTerm('');
    };

    const renderSecondarySelector = () => {
        switch (recipientTarget) {
            case 'individual':
                return (
                    <>
                        <input
                            type="text"
                            placeholder="Search for user by name or ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="form-input mt-1"
                        />
                        <select
                            value={selectedId}
                            onChange={e => setSelectedId(e.target.value)}
                            required
                            className="form-select mt-2"
                            aria-label="Select individual recipient"
                        >
                            <option value="" disabled>Select a user ({filteredUsersForIndividualSelection.length} found)</option>
                            {filteredUsersForIndividualSelection.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.role}) - {user.phoneNumber || 'No phone'}
                                </option>
                            ))}
                        </select>
                    </>
                );
            case 'department':
                return (
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} required className="form-select mt-1" aria-label="Select department">
                        <option value="" disabled>Select a department</option>
                        {departmentOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                );
            case 'course':
                return (
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} required className="form-select mt-1" aria-label="Select course">
                        <option value="" disabled>Select a course</option>
                        {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                );
            case 'institution':
                return institutions ? (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} required className="form-select" aria-label="Select institution">
                            <option value="" disabled>Select an institution</option>
                            {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        <select value={selectedInstitutionRoleFilter} onChange={e => setSelectedInstitutionRoleFilter(e.target.value as any)} required className="form-select" aria-label="Select role within institution">
                            <option value="all">All Users</option>
                            <option value="admins">Admins Only</option>
                        </select>
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    const renderHistoryTab = () => {
        if (isLoadingLogs) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-medium">Loading history...</p>
                </div>
            );
        }

        if (smsLogs.length === 0) {
            return (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">No sent messages found.</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Recipient</th>
                            <th className="py-3 px-4">Message</th>
                            <th className="py-3 px-4 text-center">Units</th>
                            <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {smsLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                                    {(() => {
                                        const date = new Date(log.createdAt);
                                        const isValid = !isNaN(date.getTime());
                                        return (
                                            <>
                                                {isValid ? date.toLocaleDateString() : 'Invalid Date'}
                                                <span className="block text-[10px] opacity-60">
                                                    {isValid ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : log.createdAt}
                                                </span>
                                            </>
                                        );
                                    })()}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                                    {log.recipient}
                                </td>
                                <td className="py-3 px-4 min-w-[200px] max-w-xs truncate text-slate-600 dark:text-slate-400" title={log.message}>
                                    {log.message}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                        {log.units}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span className="capitalize text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        {log.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold">Broadcaster</h3>
                    <div className="flex gap-4 mt-1">
                        <button
                            onClick={() => setActiveTab('compose')}
                            className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'compose' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Compose
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Sent History
                        </button>
                    </div>
                </div>
                {(smsBalance !== undefined || ['admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'super_admin', 'academics_officer', 'boarding_master'].includes(currentUser?.role || '')) && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Balance</span>
                        <span className={`text-sm font-black ${(smsBalance || 0) < 50 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                            {(smsBalance || 0).toLocaleString()} Units
                        </span>
                        {(smsBalance || 0) < 10 && (
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
                        )}
                        <button
                            onClick={() => setIsBuySMSModalOpen(true)}
                            className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            Top Up
                        </button>
                    </div>
                )}
            </div>
            {activeTab === 'compose' ? (
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Recipient Group</label>
                            <select value={recipientTarget} onChange={handleRecipientTargetChange} className="form-select mt-1" aria-label="Select recipient group">
                                <option value="individual">Individual User</option>
                                {isSuperAdminView && <option value="institution">By Institution</option>}
                                <option value="all_staff">All Staff</option>
                                <option value="all_students">All Students</option>
                                <option value="department">By Department</option>
                                <option value="course">By Course</option>
                            </select>
                        </div>

                        {renderSecondarySelector()}

                        <div className="pt-2 space-y-1">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Recipients: <span className="font-bold text-[var(--color-primary)]">{validRecipients.length}</span>
                            </p>
                            {validRecipients.length > 0 && (
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    Total Units Required: <span className="text-indigo-600 dark:text-indigo-400">{(validRecipients.length * smsInfo.count).toLocaleString()}</span>
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                            <textarea
                                rows={5}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                required
                                className="form-input mt-1"
                                placeholder="Type your message here..."
                            ></textarea>
                            <div className="mt-2 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                <span>{smsInfo.isUnicode && "Unicode characters detected"}</span>
                                <span>
                                    {smsInfo.characters} / {smsInfo.limit * smsInfo.count} ({smsInfo.count} SMS)
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-end items-center gap-4">
                            {status.type !== 'idle' && (
                                <p className={`text-sm font-medium ${status.type === 'error' ? 'text-red-500' :
                                    status.type === 'success' ? 'text-green-600' :
                                        'text-slate-500'
                                    }`}>{status.message}</p>
                            )}
                            <button onClick={handleSend} disabled={status.type === 'sending' || validRecipients.length === 0} className="btn-primary">
                                {status.type === 'sending' ? 'Sending...' : 'Send SMS'}
                            </button>
                        </div>
                    </div>

                    <div className="w-full lg:w-72 flex-shrink-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">Phone Preview</p>
                        <div className="relative mx-auto border-black dark:border-slate-600 bg-black border-[10px] rounded-[2.5rem] h-[450px] w-full max-w-[220px]">
                            <div className="h-[22px] w-[100px] bg-black dark:bg-slate-600 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                            <div className="h-[35px] w-[3px] bg-black dark:bg-slate-600 absolute -left-[13px] top-[60px] rounded-l-lg"></div>
                            <div className="h-[35px] w-[3px] bg-black dark:bg-slate-600 absolute -right-[13px] top-[120px] rounded-r-lg"></div>
                            <div className="rounded-[2rem] overflow-hidden w-full h-full bg-slate-50 dark:bg-slate-800">
                                <div className="p-4 space-y-2">
                                    <div className="flex justify-end">
                                        <div className="bg-blue-500 text-white p-2 rounded-lg max-w-[80%]">
                                            <p className="text-sm break-words">{message || "Your message will appear here..."}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-4">
                    {renderHistoryTab()}
                </div>
            )}
            {isBuySMSModalOpen && currentInstitution && mpesaConfig && (
                <BuySMSModal
                    isOpen={isBuySMSModalOpen}
                    onClose={() => setIsBuySMSModalOpen(false)}
                    onPurchaseComplete={(purchasedUnits) => {
                        if (onRefreshData) {
                            onRefreshData();
                            alert(`SMS purchase successful! ${purchasedUnits.toLocaleString()} units have been added. Your new balance will reflect in a moment.`);
                        }
                    }}
                    mpesaConfig={mpesaConfig}
                    institutionId={currentInstitution.id}
                    institutionCode={currentInstitution.institutionCode || 'SYSTEM'}
                    institutionName={currentInstitution.name}
                    smsUnitPrice={currentInstitution.customSmsPrice || (smsConfig as any)?.smsUnitPrice || 2}
                    minSmsUnits={(smsConfig as any)?.minSmsUnits || 0}
                    requesterId={currentUser?.id}
                />
            )}
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};