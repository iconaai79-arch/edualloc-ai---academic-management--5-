import React, { useState, useMemo, useEffect } from 'react';
import { BuySMSModal } from './BuySMSModal';
import { PlusIcon } from './icons/PlusIcon';

import type { User, Department, Course, Institution, MpesaConfig, SmsConfig, SmsLog, SmsOutbox, MpesaTransaction } from '../types';
import { RETAIL_SUBTYPES } from '../constants';
import { apiService } from '../services/apiService';

interface CommunicationsManagerProps {
    users: User[];
    departments: Department[];
    courses: Course[];
    institutions?: Institution[]; // Optional for super admin view
    onSendSms: (recipient: string | string[], message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<{ success: boolean; message: string }>;
    currentUser?: User;
    smsBalance?: number;
    currentInstitution?: Institution | null;
    mpesaConfig?: MpesaConfig;
    smsConfig?: SmsConfig;
    onRefreshData?: () => void;
    moduleContext?: 'school' | 'carwash' | 'property' | 'agrovet' | 'cooperative' | 'church' | 'auto_marketplace';
    companyDetails?: any;
    transactions?: MpesaTransaction[];
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


export const CommunicationsManager: React.FC<CommunicationsManagerProps> = ({ users, departments, courses, institutions, onSendSms, currentUser, smsBalance, currentInstitution, mpesaConfig, smsConfig, onRefreshData, moduleContext = 'school', companyDetails, transactions }) => {
    const isRetailAgency = useMemo(() => {
        if (currentInstitution?.institutionType === 'Church') return false;
        if (moduleContext === 'auto_marketplace') return true;
        const subType = currentInstitution?.businessSubType || '';
        const type = currentInstitution?.institutionType || '';
        return RETAIL_SUBTYPES.includes(subType) || RETAIL_SUBTYPES.includes(type);
    }, [currentInstitution, moduleContext]);
    const isChurch = useMemo(() => currentInstitution?.institutionType === 'Church', [currentInstitution]);
    const [isBuySMSModalOpen, setIsBuySMSModalOpen] = useState(false);
    const [selectedTransactionForReceipt, setSelectedTransactionForReceipt] = useState<MpesaTransaction | null>(null);
    const [recipientTarget, setRecipientTarget] = useState('individual'); // individual, all_staff, all_students, department, course, institution
    const [selectedId, setSelectedId] = useState(''); // Holds user ID, dept ID, course ID, or institution ID
    const [selectedInstitutionRoleFilter, setSelectedInstitutionRoleFilter] = useState<'all' | 'admins'>('all');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'sending' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'outbox' | 'transactions'>('compose');
    const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
    const [smsOutbox, setSmsOutbox] = useState<SmsOutbox[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [isLoadingOutbox, setIsLoadingOutbox] = useState(false);

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

    const fetchOutbox = async () => {
        if (!currentInstitution) return;
        setIsLoadingOutbox(true);
        try {
            const outbox = await apiService.fetchSmsOutbox(currentInstitution.id);
            setSmsOutbox(outbox);
        } catch (err) {
            console.error('Failed to fetch SMS outbox:', err);
        } finally {
            setIsLoadingOutbox(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchLogs();
        } else if (activeTab === 'outbox') {
            fetchOutbox();
        }
    }, [activeTab, currentInstitution]);

    const filteredUsersForIndividualSelection = useMemo(() => {
        if (!searchTerm) return [];
        let availableUsers = users;
        if (!isSuperAdminView && currentInstitution) {
            availableUsers = availableUsers.filter(u => u.institutionId === currentInstitution.id);
        }

        // Filter for HOD
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos') && currentUser.departmentId) {
            availableUsers = availableUsers.filter(u => u.departmentId === currentUser.departmentId || (u.role === 'student' && courses.some(c => c.id === u.courseId && c.departmentId === currentUser.departmentId)));
        }

        return availableUsers.filter(u =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.staffId?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 100); // Limit to 100 results for performance
    }, [users, searchTerm, currentUser, courses, isSuperAdminView, currentInstitution]);

    const smsTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter(t => {
            const desc = (t.description || '').toLowerCase();
            const type = t.metadata?.type || (t as any).type;
            const provider = t.provider;
            return type === 'sms' || type === 'sms_topup' || desc.includes('sms');
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions]);

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

    const leadModelOptions = useMemo(() => {
        const models = new Set<string>();
        let availableUsers = users;
        if (!isSuperAdminView && currentInstitution) {
            availableUsers = availableUsers.filter(u => u.institutionId === currentInstitution.id);
        }
        availableUsers.filter(u => u.role === 'lead' && u.metadata?.enquiredModels).forEach(u => {
            u.metadata.enquiredModels.forEach((m: string) => models.add(m));
        });
        return Array.from(models).sort();
    }, [users, isSuperAdminView, currentInstitution]);

    const [leadModelFilter, setLeadModelFilter] = useState('all');

    const recipientList = useMemo(() => {
        let baseUsers = users;
        if (!isSuperAdminView && currentInstitution) {
            baseUsers = baseUsers.filter(u => u.institutionId === currentInstitution.id);
        }

        // Apply base filter for HOD
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos') && currentUser.departmentId) {
            // HODs can message: staff in dept, students in dept courses
            const allowedCourseIds = new Set(courses.filter(c => c.departmentId === currentUser.departmentId).map(c => c.id));
            baseUsers = baseUsers.filter(u =>
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
                return (moduleContext === 'school' || isChurch) ? baseUsers.filter(u => u.role !== 'student' && u.role !== 'member' && u.role !== 'church_member') : baseUsers.filter(u => String(u.role) !== 'customer' && String(u.role) !== 'lead');
            case 'all_students':
                return baseUsers.filter(u => u.role === 'student' || u.role === 'member' || u.role === 'church_member');
            case 'all_customers':
                return baseUsers.filter(u => String(u.role) === 'customer' || (isChurch && u.role === 'visitor'));
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
            case 'all_retail_agents':
                return isChurch ? [] : baseUsers.filter(u => u.role === 'retail_agent' || (u.role as string) === 'agent');
            case 'all_field_agents':
                return isChurch ? [] : baseUsers.filter(u => u.role === 'field_agent');
            case 'all_agents':
                return isChurch ? [] : baseUsers.filter(u => ['retail_agent', 'field_agent', 'agent'].includes(u.role as string));
            case 'all_leads': {
                let filtered = isChurch ? [] : baseUsers.filter(u => u.role === 'lead');
                if (leadModelFilter !== 'all') {
                    filtered = filtered.filter(u => u.metadata?.enquiredModels?.includes(leadModelFilter));
                }
                return filtered;
            }
            case 'institution': {
                if (!selectedId) return [];
                const usersInInstitution = baseUsers.filter(u => u.institutionId === selectedId);
                if (selectedInstitutionRoleFilter === 'admins') {
                    return usersInInstitution.filter(u => u.role === 'admin');
                }
                return usersInInstitution;
            }
            case 'all_tenants':
                return users.filter(u => String(u.role) === 'tenant');
            case 'all_landlords':
                return users.filter(u => String(u.role) === 'landlord');
            case 'all_farmers':
                return baseUsers.filter(u => u.role === 'farmer');
            case 'all_riders':
                return baseUsers.filter(u => u.role === 'rider');
            case 'all_coop_staff':
                return baseUsers.filter(u => ['coop_admin', 'coop_chairman', 'cooperative_manager', 'sacco_officer'].includes(u.role));
            case 'all_coop_members':
                return baseUsers;
            default:
                return [];
        }
    }, [recipientTarget, selectedId, selectedInstitutionRoleFilter, users, courses, currentUser, leadModelFilter, isSuperAdminView, currentInstitution, moduleContext, isChurch]);

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
                message: `Insufficient balance. This send requires ${totalUnitsRequired?.toLocaleString()} units, but you only have ${(smsBalance || 0)?.toLocaleString()}.`
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
            ? `You are about to send ${smsInfo.count} page(s) of SMS to 1 recipient. This will deduct ${totalUnitsRequired?.toLocaleString()} units. Are you sure?`
            : `You are about to send ${smsInfo.count} page(s) of SMS to ${validRecipients.length} recipients. \n\nCalculation: ${validRecipients.length} recipients × ${smsInfo.count} pages = ${totalUnitsRequired?.toLocaleString()} total units.\n\nAre you sure?`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        setStatus({ type: 'sending', message: `Initializing bulk send to ${validRecipients.length} recipients...` });
        
        try {
            const phoneNumbers = validRecipients.map(u => u.phoneNumber).filter(Boolean) as string[];
            
            // We pass the entire list to the backend which now handles batching efficiently
            const result = await onSendSms(phoneNumbers, message, smsConfig, smsInfo.count, currentInstitution?.id);
            
            if (result.success) {
                setStatus({ type: 'success', message: `Successfully dispatched message to ${validRecipients.length} recipients.` });
                setMessage('');
                if (onRefreshData) onRefreshData();
            } else {
                setStatus({ type: 'error', message: result.message || 'Bulk dispatch failed.' });
            }
        } catch (e: any) {
            console.error('Bulk SMS Error:', e);
            setStatus({ type: 'error', message: `Critical error during bulk dispatch: ${e.message}` });
        }

        setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
    };

    const handleQueueToOutbox = async () => {
        if (!currentInstitution) return;
        setStatus({ type: 'sending', message: 'Queuing messages to outbox...' });
        try {
            const outboxMessages = validRecipients.map(user => ({
                id: `ob_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                institutionId: currentInstitution.id,
                recipient: user.phoneNumber || '',
                message: message,
                units: smsInfo.count,
                status: 'pending',
                createdAt: new Date().toISOString()
            }));

            // Bulk save to outbox
            await apiService.saveToSmsOutbox(outboxMessages);
            setStatus({ type: 'success', message: `${outboxMessages.length} messages queued to outbox.` });
            setMessage('');
            setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
        } catch (err) {
            console.error('Failed to queue to outbox:', err);
            setStatus({ type: 'error', message: 'Failed to queue messages.' });
        }
    };

    const handleRetryOutbox = async (item: SmsOutbox) => {
        const totalUnitsRequired = item.units;
        if ((smsBalance || 0) < totalUnitsRequired) {
            alert(`Insufficient balance to send this message (${totalUnitsRequired} units required).`);
            return;
        }

        try {
            const result = await onSendSms(item.recipient, item.message, smsConfig, item.units, item.institutionId);
            if (result.success) {
                await apiService.removeFromSmsOutbox(item.id);
                fetchOutbox();
                if (onRefreshData) onRefreshData();
            } else {
                alert(`Failed to retry: ${result.message}`);
            }
        } catch (err) {
            console.error('Retry error:', err);
        }
    };

    const handleRetryAllOutbox = async () => {
        const totalPending = smsOutbox.length;
        if (totalPending === 0) return;

        let processed = 0;
        let success = 0;
        let balance = smsBalance || 0;

        setStatus({ type: 'sending', message: `Retrying ${totalPending} messages...` });

        for (const item of smsOutbox) {
            if (balance < item.units) break;

            try {
                const result = await onSendSms(item.recipient, item.message, smsConfig, item.units, item.institutionId);
                if (result.success) {
                    await apiService.removeFromSmsOutbox(item.id);
                    success++;
                    balance -= item.units;
                }
            } catch (err) {
                console.error('Retry all error at item', item.id, err);
            }
            processed++;
        }

        setStatus({ type: 'success', message: `Processed ${processed} messages. Successfully sent: ${success}.` });
        fetchOutbox();
        if (onRefreshData) onRefreshData();
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
                            placeholder={isChurch ? "Search for member/worker by name..." : "Search for user by name or ID..."}
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
                                    {user.name} ({isChurch && (user.role === 'student' || user.role === 'member' || user.role === 'church_member') ? 'Member' : user.role}) - {user.phoneNumber || 'No phone'}
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
            case 'all_leads':
                return leadModelOptions.length > 0 ? (
                    <div className="mt-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filter by Interested Model</label>
                        <select 
                            value={leadModelFilter} 
                            onChange={e => setLeadModelFilter(e.target.value)} 
                            className="form-select mt-1"
                        >
                            <option value="all">All Models ({leadModelOptions.length})</option>
                            {leadModelOptions.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    const renderOutboxTab = () => {
        if (isLoadingOutbox) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-medium">Loading outbox...</p>
                </div>
            );
        }

        if (smsOutbox.length === 0) {
            return (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">Outbox is empty.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-medium text-slate-500">{smsOutbox.length} messages waiting to be sent.</p>
                    <button 
                        onClick={handleRetryAllOutbox}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                    >
                        Retry All
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Recipient</th>
                                <th className="py-3 px-4">Message</th>
                                <th className="py-3 px-4 text-center">Units</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {smsOutbox.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                                        {item.recipient}
                                    </td>
                                    <td className="py-3 px-4 min-w-[200px] max-w-xs truncate text-slate-600 dark:text-slate-400">
                                        {item.message}
                                    </td>
                                    <td className="py-3 px-4 text-center text-[10px] font-bold">
                                        {item.units}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button 
                                            onClick={() => handleRetryOutbox(item)}
                                            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                                        >
                                            Retry
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (confirm('Delete from outbox?')) {
                                                    await apiService.removeFromSmsOutbox(item.id);
                                                    fetchOutbox();
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-800 font-bold text-xs ml-3"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
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
            <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {smsLogs.map(log => {
                        const date = new Date(log.createdAt);
                        const isValid = !isNaN(date.getTime());
                        return (
                            <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                            {isValid ? date.toLocaleDateString() : 'Invalid Date'}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500">
                                            {isValid ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : log.createdAt}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-[9px] font-black border border-slate-100 dark:border-slate-700">
                                            {log.units} Units
                                        </span>
                                        <span className="capitalize text-[8px] font-black px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            {log.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Recipient</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.recipient}</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 italic border border-slate-50 dark:border-slate-700/50">
                                    "{log.message}"
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTransactionsTab = () => {
        return (
            <div className="animate-fade-in-up space-y-4">
                <div className="overflow-x-auto bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 p-2">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="py-4 px-6">Date</th>
                                <th className="py-4 px-6">Reference</th>
                                <th className="py-4 px-6">Amount</th>
                                <th className="py-4 px-6">Provider</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-right">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {smsTransactions.length > 0 ? smsTransactions.map(txn => (
                                <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="py-4 px-6 whitespace-nowrap text-[10px] font-medium text-slate-500">
                                        {new Date(txn.timestamp).toLocaleDateString()}
                                        <span className="block opacity-50">{new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-slate-700 dark:text-slate-300">
                                        {txn.transactionId || txn.id}
                                        {txn.metadata?.units && <span className="ml-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[8px] font-bold">{txn.metadata.units} Units</span>}
                                    </td>
                                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                                        KES {txn.amount?.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-6 text-[10px] uppercase font-black text-slate-400">
                                        {txn.provider}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${txn.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button
                                            onClick={() => setSelectedTransactionForReceipt(txn)}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                        >
                                            View Receipt
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs italic">
                                        No purchase history found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            {/* Perpetual Lifetime Free Status Banner */}
            <div className="mb-5 p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 rounded-2xl border border-emerald-500/30 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-md">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🟢</span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm uppercase italic tracking-tight">Perpetual Lifetime Free SMS Broadcaster</h4>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 text-[8px] font-black uppercase">Unblocked for Life</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">
                            Software access is 100% free forever — top up SMS units anytime via M-Pesa based on usage!
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsBuySMSModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 shrink-0"
                >
                    <span>💳 Buy SMS Units (Pay-As-You-Go)</span>
                </button>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold">{isRetailAgency ? 'Communications Hub' : 'Broadcaster'}</h3>
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
                        <button
                            onClick={() => setActiveTab('outbox')}
                            className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'outbox' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Outbox {smsOutbox.length > 0 && <span className="ml-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{smsOutbox.length}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Purchases
                        </button>
                    </div>
                </div>
                {(smsBalance !== undefined || ['admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'super_admin', 'academics_officer', 'boarding_master', 'property_admin', 'carwash_admin', 'agrovet_admin', 'transport_admin'].includes(currentUser?.role || '')) && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Balance</span>
                        <span className={`text-sm font-black ${(smsBalance || 0) < 50 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                            {(smsBalance || 0)?.toLocaleString()} Units
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
                                {moduleContext === 'carwash' ? (
                                    <>
                                        <option value="individual">Individual Recipient</option>
                                        <option value="all_staff">All Staff</option>
                                        <option value="all_customers">All Customers</option>
                                    </>
                                ) : moduleContext === 'property' ? (
                                    <>
                                        <option value="individual">Individual Recipient</option>
                                        <option value="all_staff">All Staff</option>
                                        <option value="all_tenants">All Tenants</option>
                                        <option value="all_landlords">All Landlords</option>
                                    </>
                                ) : moduleContext === 'cooperative' ? (
                                    <>
                                        <option value="individual">Individual Member</option>
                                        <option value="all_farmers">All Farmers</option>
                                        <option value="all_riders">All Riders (Logistics)</option>
                                        <option value="all_coop_staff">Cooperative Staff / Admins</option>
                                        <option value="all_coop_members">All Cooperative Members</option>
                                    </>
                                ) : moduleContext === 'auto_marketplace' ? (
                                    <>
                                        <option value="individual">Individual Recipient</option>
                                        <option value="all_staff">All Staff (Admins & Sales)</option>
                                        <option value="all_leads">Showroom Leads (Prospects)</option>
                                        <option value="all_customers">All Customers (Buyers)</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="individual">{isChurch ? 'Individual Member/Worker' : 'Individual User'}</option>
                                        {isSuperAdminView && <option value="institution">By Institution</option>}
                                        <option value="all_staff">{isChurch ? 'All Church Workers/Staff' : 'All Staff'}</option>
                                        {isRetailAgency ? (
                                            <>
                                                <option value="all_retail_agents">All Retail Agents</option>
                                                <option value="all_field_agents">All Field Agents</option>
                                                <option value="all_agents">All Agents (Retail + Field)</option>
                                                <option value="all_customers">All Customers</option>
                                                <option value="all_leads">Showroom Leads (Walk-ins)</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="all_students">{isChurch ? 'All Congregation Members' : 'All Students'}</option>
                                                <option value="department">{isChurch ? 'By Ministry/Committee' : 'By Department'}</option>
                                                <option value="course">{isChurch ? 'By Program/Group' : 'By Course'}</option>
                                                {isChurch && <option value="all_customers">All Visitors & Guests</option>}
                                            </>
                                        )}
                                    </>
                                )}
                            </select>
                        </div>

                        {renderSecondarySelector()}

                        <div className="pt-2 space-y-1">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Recipients: <span className="font-bold text-[var(--color-primary)]">{validRecipients.length}</span>
                            </p>
                            {validRecipients.length > 0 && (
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    Total Units Required: <span className="text-indigo-600 dark:text-indigo-400">{(validRecipients.length * smsInfo.count)?.toLocaleString()}</span>
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
                                <div className="flex items-center gap-3">
                                    <p className={`text-sm font-medium ${status.type === 'error' ? 'text-red-500' :
                                        status.type === 'success' ? 'text-green-600' :
                                            'text-slate-500'
                                        }`}>{status.message}</p>
                                    
                                    {status.type === 'error' && status.message.includes('Insufficient balance') && validRecipients.length > 0 && (
                                        <button 
                                            onClick={handleQueueToOutbox}
                                            className="text-xs font-black uppercase text-indigo-600 hover:text-indigo-800 border-b border-indigo-600"
                                        >
                                            Queue to Outbox
                                        </button>
                                    )}
                                </div>
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
            ) : activeTab === 'history' ? (
                <div className="mt-4">
                    {renderHistoryTab()}
                </div>
            ) : activeTab === 'outbox' ? (
                <div className="mt-4">
                    {renderOutboxTab()}
                </div>
            ) : (
                <div className="mt-4">
                    {renderTransactionsTab()}
                </div>
            )}
            {isBuySMSModalOpen && (currentInstitution || currentUser?.role === 'super_admin') && (
                <BuySMSModal
                    isOpen={isBuySMSModalOpen}
                    onClose={() => setIsBuySMSModalOpen(false)}
                    onPurchaseComplete={async (purchasedUnits) => {
                        if (onRefreshData) {
                            await onRefreshData();
                        }
                    }}
                    mpesaConfig={mpesaConfig}
                    airtelMoneyConfig={currentInstitution?.airtelMoneyConfig || companyDetails?.airtelMoneyConfig}
                    intasendConfig={currentInstitution?.intasendConfig || companyDetails?.intasendConfig}
                    ncbaConfig={currentInstitution?.ncbaConfig || companyDetails?.ncbaConfig}
                    institutionId={currentInstitution?.id || 'SYSTEM'}
                    institutionCode={currentInstitution?.institutionCode || 'SYSTEM'}
                    institutionName={currentInstitution?.name || 'Education AI Portal'}
                    smsUnitPrice={currentInstitution?.customSmsPrice || (currentInstitution as any)?.custom_sms_price || (smsConfig as any)?.smsUnitPrice || (smsConfig as any)?.sms_unit_price || companyDetails?.smsConfig?.smsUnitPrice || (companyDetails?.smsConfig as any)?.sms_unit_price || (companyDetails as any)?.smsUnitPrice || (companyDetails as any)?.sms_unit_price || 2}
                    minSmsUnits={(smsConfig as any)?.minSmsUnits || 0}
                    requesterId={currentUser?.id}
                />
            )}
            {selectedTransactionForReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        {/* Printable Area Wrapper */}
                        <div id="sms-receipt-print-area" className="p-8 space-y-6">
                            {/* Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-dashed border-slate-200 dark:border-slate-800">
                                <div className="inline-flex p-3.5 bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 rounded-3xl">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">SMS Topup Receipt</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentInstitution?.name || 'Education AI Portal'}</p>
                            </div>

                            {/* Details */}
                            <div className="space-y-4 text-xs">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Receipt Reference</span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTransactionForReceipt.transactionId || selectedTransactionForReceipt.id}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Date & Time</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(selectedTransactionForReceipt.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Payment Provider</span>
                                    <span className="font-bold text-slate-850 dark:text-slate-150 uppercase text-[10px]">{selectedTransactionForReceipt.provider}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">SMS Units Purchased</span>
                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                                        {selectedTransactionForReceipt.metadata?.units || Math.round(selectedTransactionForReceipt.amount / (currentInstitution?.customSmsPrice || (currentInstitution as any)?.custom_sms_price || (smsConfig as any)?.smsUnitPrice || (smsConfig as any)?.sms_unit_price || companyDetails?.smsConfig?.smsUnitPrice || (companyDetails?.smsConfig as any)?.sms_unit_price || (companyDetails as any)?.smsUnitPrice || (companyDetails as any)?.sms_unit_price || 2))} Units
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-slate-50 dark:bg-slate-900/50 px-4 rounded-2xl">
                                    <span className="font-black text-slate-400 uppercase text-[9px] tracking-wider">Amount Paid</span>
                                    <span className="font-black text-slate-900 dark:text-white text-base">KES {selectedTransactionForReceipt.amount?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Status</span>
                                    <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-full text-[9px] font-black uppercase tracking-wider">{selectedTransactionForReceipt.status}</span>
                                </div>
                            </div>

                            {/* Footer note */}
                            <div className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-4 border-t border-slate-100 dark:border-slate-800">
                                Thank you for your purchase!
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-4 p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    const printContent = document.getElementById('sms-receipt-print-area')?.innerHTML;
                                    const originalContent = document.body.innerHTML;
                                    if (printContent) {
                                        document.body.innerHTML = `
                                            <div style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 2rem;">
                                                <div style="width: 100%; max-width: 400px; border: 1px solid #e2e8f0; padding: 2rem; border-radius: 1.5rem;">
                                                    ${printContent}
                                                </div>
                                            </div>
                                        `;
                                        window.print();
                                        document.body.innerHTML = originalContent;
                                        window.location.reload(); // Reload to restore React state cleanly
                                    }
                                }}
                                className="flex-1 py-3.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-750 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all text-center shadow-md"
                            >
                                Print Receipt
                            </button>
                            <button
                                onClick={() => setSelectedTransactionForReceipt(null)}
                                className="flex-1 py-3.5 bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-900 dark:text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all text-center"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
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
