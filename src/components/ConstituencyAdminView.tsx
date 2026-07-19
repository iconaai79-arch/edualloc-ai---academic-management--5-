import React, { useState, useMemo, useEffect } from 'react';
import { 
    LayoutDashboard, School, Settings, Wallet, LogOut, Plus, 
    Search, Filter, CheckCircle2, AlertCircle, Info, ArrowRight, Sparkles,
    MessageSquare, Send, History, Clock, Trash2, RefreshCw
} from 'lucide-react';
import { 
    ArrowPathIcon, ChevronRightIcon, UserIcon, MapPinIcon 
} from './icons';
import { 
    User, Institution, Role, NGCdfFund, NGCdfBursary, ActivityLog, SmsLog, SmsOutbox, SchoolRegistry, CompanyDetails
} from '../types';
import { apiService } from '../services/apiService';
import { localDb } from '../services/localDb';
import { syncEngine } from '../services/syncEngine';

interface ConstituencyAdminViewProps {
    currentUser: User;
    institutions: Institution[];
    users: User[];
    onLogout: () => void;
    onLogAction?: (action: string) => void;
    onSendSms?: (recipient: string | string[], message: string) => Promise<any>;
    onAddUser?: (userData: any) => Promise<void>;
    onSaveInstitution?: (data: any) => Promise<void>;
    companyDetails?: CompanyDetails;
}

export const ConstituencyAdminView: React.FC<ConstituencyAdminViewProps> = ({
    currentUser,
    institutions = [],
    users = [],
    onLogout,
    onLogAction,
    onSendSms,
    onAddUser,
    onSaveInstitution,
    companyDetails
}) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [ngCdfFunds, setNgCdfFunds] = useState<NGCdfFund[]>([]);
    const [ngCdfBursaries, setNgCdfBursaries] = useState<NGCdfBursary[]>([]);
    const [isLoadingNgCdf, setIsLoadingNgCdf] = useState(false);

    // Form states
    const [ngCdfFormFY, setNgCdfFormFY] = useState('2025/2026');
    const [ngCdfFormBudget, setNgCdfFormBudget] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    // School registry states
    const [schoolRegistry, setSchoolRegistry] = useState<SchoolRegistry[]>([]);
    const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);
    const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
    const [showManualAddSchool, setShowManualAddSchool] = useState(false);
    const [schoolLinkingId, setSchoolLinkingId] = useState<string | null>(null);
    const [manualSchoolForm, setManualSchoolForm] = useState({
        name: '',
        institutionType: 'Secondary',
        subCounty: '',
        phoneNumber: '',
        email: '',
        knecCode: '',
        uic: '',
        accommodationType: 'Day' as 'Day' | 'Boarding' | 'Mixed',
        genderType: 'Mixed' as 'Boys' | 'Girls' | 'Mixed',
        registryId: null as string | null
    });
    const [isSavingSchool, setIsSavingSchool] = useState(false);
    const [linkingSchoolDetails, setLinkingSchoolDetails] = useState<SchoolRegistry | null>(null);
    const [linkingAdminEmail, setLinkingAdminEmail] = useState('');
    const [linkingAdminPhone, setLinkingAdminPhone] = useState('');

    // SMS states
    const [smsSubTab, setSmsSubTab] = useState<'compose' | 'history' | 'outbox'>('compose');
    const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
    const [smsOutbox, setSmsOutbox] = useState<SmsOutbox[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [isLoadingOutbox, setIsLoadingOutbox] = useState(false);
    const [recipientTarget, setRecipientTarget] = useState<'staff' | 'schools' | 'bursaries' | 'custom' | 'individual'>('staff');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [customRecipients, setCustomRecipients] = useState('');
    const [smsMessage, setSmsMessage] = useState('');
    const [smsStatus, setSmsStatus] = useState<{ type: 'idle' | 'sending' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
    const [smsSearchTerm, setSmsSearchTerm] = useState('');

    // Constituency identifier from user session (e.g. 'Kigumo')
    const myConstituency = currentUser.institutionId || 'Kigumo';

    const fetchNgCdfData = async () => {
        setIsLoadingNgCdf(true);
        try {
            // Fetch records from backend.
            // If offline/local, the custom apiService filter maps constituencyId/constituencyName.
            const [funds, applications, outbox] = await Promise.all([
                apiService.fetchModuleRecords<any>('ng_cdf_funds', myConstituency).catch(() => []),
                apiService.fetchModuleRecords<any>('ng_cdf_bursaries', myConstituency).catch(() => []),
                apiService.fetchSmsOutbox(myConstituency).catch(() => [])
            ]);
            
            // Apply a secondary client-side check to guarantee strict constituency scoping
            const filteredFunds = (funds || []).filter(
                (f: any) => f.constituencyName?.toLowerCase() === myConstituency.toLowerCase() || 
                           f.constituencyId?.toLowerCase() === myConstituency.toLowerCase()
            );
            const filteredBursaries = (applications || []).filter(
                (b: any) => b.constituencyName?.toLowerCase() === myConstituency.toLowerCase()
            );

            setNgCdfFunds(filteredFunds);
            setNgCdfBursaries(filteredBursaries);
            setSmsOutbox(outbox);
        } catch (e) {
            console.error("Failed to fetch NG-CDF data:", e);
        } finally {
            setIsLoadingNgCdf(false);
        }
    };

    useEffect(() => {
        fetchNgCdfData();
    }, [myConstituency]);

    const fetchSchoolRegistry = async () => {
        if (schoolRegistry.length > 0) return; // already loaded
        setIsLoadingRegistry(true);
        try {
            const records = await apiService.fetchFullRegistry();
            setSchoolRegistry(records);
        } catch (e) {
            console.error('Failed to fetch school registry:', e);
        } finally {
            setIsLoadingRegistry(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'institutions' || showManualAddSchool) fetchSchoolRegistry();
    }, [activeTab, showManualAddSchool]);

    const handleLinkSchool = async (school: SchoolRegistry) => {
        if (schoolLinkingId === school.id) return;
        setSchoolLinkingId(school.id);
        try {
            const instData = {
                id: `inst_cdf_${Date.now()}`,
                name: school.name,
                institutionType: school.institutionType || 'School',
                category: school.accommodationType || 'Day',
                constituency: myConstituency,
                subCounty: school.subCounty || '',
                county: school.county || '',
                institutionCode: school.knecCode || school.uic || '',
                registryId: school.id,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            if (onSaveInstitution) {
                await onSaveInstitution(instData);
            } else {
                await apiService.saveModuleRecord('institutions', instData);
            }
            if (onLogAction) onLogAction(`Linked registry school "${school.name}" to ${myConstituency} constituency`);
            alert(`"${school.name}" has been added to your constituency schools.`);
            // Refresh App-level data by triggering a re-load (institutions prop will update)
        } catch (e: any) {
            console.error('Failed to link school:', e);
            alert('Error linking school: ' + (e.message || 'Unknown error'));
        } finally {
            setSchoolLinkingId(null);
        }
    };

    const handleLinkSchoolConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkingSchoolDetails) return;
        const school = linkingSchoolDetails;
        setLinkingSchoolDetails(null);
        setSchoolLinkingId(school.id);
        try {
            const instData = {
                id: `inst_cdf_${Date.now()}`,
                name: school.name,
                institutionType: school.institutionType || 'School',
                category: school.accommodationType || 'Day',
                constituency: myConstituency,
                subCounty: school.subCounty || '',
                county: school.county || '',
                institutionCode: school.knecCode || school.uic || '',
                registryId: school.id,
                status: 'active',
                email: linkingAdminEmail.trim(),
                phoneNumber: linkingAdminPhone.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            if (onSaveInstitution) {
                await onSaveInstitution(instData);
            } else {
                await apiService.saveModuleRecord('institutions', instData);
            }
            if (onLogAction) onLogAction(`Linked registry school "${school.name}" to ${myConstituency} constituency`);
            alert(`"${school.name}" has been added to your constituency schools.`);
        } catch (e: any) {
            console.error('Failed to link school:', e);
            alert('Error linking school: ' + (e.message || 'Unknown error'));
        } finally {
            setSchoolLinkingId(null);
        }
    };

    const handleManualAddSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualSchoolForm.name.trim()) return;
        setIsSavingSchool(true);
        try {
            const instData = {
                id: `inst_cdf_manual_${Date.now()}`,
                name: manualSchoolForm.name.trim(),
                institutionType: manualSchoolForm.institutionType,
                category: manualSchoolForm.accommodationType,
                constituency: myConstituency,
                subCounty: manualSchoolForm.subCounty,
                phoneNumber: manualSchoolForm.phoneNumber,
                email: manualSchoolForm.email,
                institutionCode: manualSchoolForm.knecCode || manualSchoolForm.uic || '',
                uic: manualSchoolForm.uic,
                knecCode: manualSchoolForm.knecCode,
                genderType: manualSchoolForm.genderType,
                status: 'active',
                registryId: manualSchoolForm.registryId || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            if (onSaveInstitution) {
                await onSaveInstitution(instData);
            } else {
                await apiService.saveModuleRecord('institutions', instData);
            }
            if (onLogAction) onLogAction(`Manually added school "${instData.name}" to ${myConstituency} constituency`);
            setShowManualAddSchool(false);
            setManualSchoolForm({ name: '', institutionType: 'Secondary', subCounty: '', phoneNumber: '', email: '', knecCode: '', uic: '', accommodationType: 'Day', genderType: 'Mixed', registryId: null });
            alert(`"${instData.name}" has been added to your constituency schools.`);
        } catch (e: any) {
            console.error('Failed to add school:', e);
            alert('Error adding school: ' + (e.message || 'Unknown error'));
        } finally {
            setIsSavingSchool(false);
        }
    };

    const handleSaveNgCdfFund = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ngCdfFormBudget) return;
        try {
            const budgetVal = Number(ngCdfFormBudget);
            const payload: NGCdfFund = {
                id: `ng_fund_${Date.now()}`,
                constituencyId: myConstituency,
                constituencyName: myConstituency,
                financialYear: ngCdfFormFY,
                totalBudget: budgetVal,
                allocatedAmount: 0,
                remainingAmount: budgetVal
            };
            await apiService.saveModuleRecord('ng_cdf_funds', payload);
            setNgCdfFormBudget('');
            fetchNgCdfData();
            if (onLogAction) onLogAction(`Registered NG-CDF Fund budget of KES ${budgetVal} for FY ${ngCdfFormFY}`);
            alert("NG-CDF Constituency Fund budget registered successfully!");
        } catch (err) {
            console.error("Failed to save fund:", err);
            alert("Error registering fund.");
        }
    };

    const handleUpdateBursaryStatus = async (id: string, status: 'disbursed' | 'rejected') => {
        try {
            const bur = ngCdfBursaries.find(b => b.id === id);
            if (!bur) return;
            
            const updated = {
                ...bur,
                status: status,
                vettedAt: new Date().toISOString(),
                vettedBy: currentUser.name || 'CDF Officer',
                disbursedAt: status === 'disbursed' ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ng_cdf_bursaries', updated);
            
            if (status === 'disbursed') {
                // Find budget fund matching the financial year
                const matchingFund = ngCdfFunds.find(f => f.financialYear === (bur.notes || '2025/2026')); // fallback FY mapping
                const fundToUpdate = matchingFund || ngCdfFunds[0];

                if (fundToUpdate) {
                    const allocated = (fundToUpdate.allocatedAmount || 0) + (bur.amountApproved || bur.amountRequested || 0);
                    const remaining = Math.max(0, fundToUpdate.totalBudget - allocated);
                    await apiService.saveModuleRecord('ng_cdf_funds', {
                        ...fundToUpdate,
                        allocatedAmount: allocated,
                        remainingAmount: remaining
                    });
                }

                // Automatically post receipt to student ledger at the school's institution
                const amount = bur.amountApproved || bur.amountRequested || 0;
                const receipt = {
                    id: `rcpt_bursary_approved_${Date.now()}`,
                    receiptNumber: `B-${(companyDetails?.globalReceiptPrefix || 'RCPT-').trim()}${Date.now().toString().slice(-6)}`,
                    institutionId: bur.institutionId,
                    studentId: bur.studentId,
                    amountPaid: amount,
                    paymentMethod: 'Cheque',
                    relatedTransactionId: bur.chequeNumber || `CDF-DISB-${Date.now().toString().slice(-4)}`,
                    paymentDate: new Date().toISOString().split('T')[0],
                    paidFor: `Approved NG-CDF Bursary (${bur.constituencyName})`,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('receipts', receipt);
            }
            
            fetchNgCdfData();
            if (onLogAction) onLogAction(`Vetted bursary application for student ${bur.studentName} as ${status}`);
            alert(`Bursary status updated to ${status}!`);
        } catch (err) {
            console.error("Failed to update status:", err);
            alert("Error updating status.");
        }
    };

    // Filtered lists
    const constituencyInstitutions = useMemo(() => {
        return institutions.filter(inst => 
            inst.constituency?.toLowerCase() === myConstituency.toLowerCase()
        );
    }, [institutions, myConstituency]);

    const filteredBursariesList = useMemo(() => {
        if (!filterSearch) return ngCdfBursaries;
        return ngCdfBursaries.filter(b => 
            b.studentName.toLowerCase().includes(filterSearch.toLowerCase()) ||
            b.institutionName.toLowerCase().includes(filterSearch.toLowerCase()) ||
            (b.chequeNumber || '').toLowerCase().includes(filterSearch.toLowerCase())
        );
    }, [ngCdfBursaries, filterSearch]);

    // SMS helpers and calculations
    const currentInstitution = useMemo(() => {
        return institutions.find(inst => inst.id === myConstituency || inst.name?.toLowerCase() === myConstituency.toLowerCase());
    }, [institutions, myConstituency]);

    const smsBalance = currentInstitution?.smsBalance ?? currentUser.smsBalance ?? 1250;

    const fetchSmsLogs = async () => {
        setIsLoadingLogs(true);
        try {
            let logs = [];
            if (!navigator.onLine) {
                logs = await localDb.getAll('sms_logs').catch(() => []);
            } else {
                logs = await apiService.fetchSmsLogs(myConstituency).catch(() => []);
                for (const log of logs) {
                    await localDb.put('sms_logs', log);
                }
            }
            setSmsLogs(logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (err) {
            console.error('Failed to fetch SMS logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const fetchSmsOutbox = async () => {
        setIsLoadingOutbox(true);
        try {
            let outbox = [];
            if (!navigator.onLine) {
                outbox = await localDb.getAll('sms_outbox').catch(() => []);
            } else {
                outbox = await apiService.fetchSmsOutbox(myConstituency).catch(() => []);
                for (const item of outbox) {
                    await localDb.put('sms_outbox', item);
                }
            }
            setSmsOutbox(outbox);
        } catch (err) {
            console.error('Failed to fetch SMS outbox:', err);
        } finally {
            setIsLoadingOutbox(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'bulksms') {
            if (smsSubTab === 'history') {
                fetchSmsLogs();
            } else if (smsSubTab === 'outbox') {
                fetchSmsOutbox();
            }
        }
    }, [activeTab, smsSubTab, myConstituency]);

    const calculateSmsParts = (msg: string) => {
        const isUnicode = /[^\u0000-\u007F\u0080-\u00FF€]/.test(msg);
        const charCount = msg.length;
        if (charCount === 0) {
            return { count: 0, characters: 0, limit: isUnicode ? 70 : 160, isUnicode };
        }
        if (isUnicode) {
            if (charCount <= 70) {
                return { count: 1, characters: charCount, limit: 70, isUnicode };
            }
            return { count: Math.ceil(charCount / 67), characters: charCount, limit: 67, isUnicode };
        } else {
            if (charCount <= 160) {
                return { count: 1, characters: charCount, limit: 160, isUnicode };
            }
            return { count: Math.ceil(charCount / 153), characters: charCount, limit: 153, isUnicode };
        }
    };

    const smsInfo = useMemo(() => calculateSmsParts(smsMessage), [smsMessage]);

    const bursaryRecipients = useMemo(() => {
        const mapped = new Map<string, any>();
        ngCdfBursaries.forEach(b => {
            if (!b.studentName) return;
            const studentUser = users.find(u => u.id === b.studentId || u.name?.toLowerCase() === b.studentName?.toLowerCase());
            const phone = studentUser?.phoneNumber || '';
            if (phone) {
                mapped.set(b.studentId || b.studentName, {
                    id: b.studentId || b.id,
                    name: b.studentName,
                    phoneNumber: phone,
                    role: 'Bursary Applicant'
                });
            }
        });
        return Array.from(mapped.values());
    }, [ngCdfBursaries, users]);

    const customRecipientsList = useMemo(() => {
        if (!customRecipients.trim()) return [];
        return customRecipients.split(/[\n,]+/)
            .map(p => p.trim())
            .filter(p => p.length >= 9)
            .map((p, idx) => ({
                id: `custom_${idx}`,
                name: `Custom Recipient`,
                phoneNumber: p,
                role: 'Custom'
            }));
    }, [customRecipients]);

    const filteredUsersForSms = useMemo(() => {
        if (!smsSearchTerm) return [];
        return users.filter(u => 
            (u.institutionId === myConstituency || u.role === 'student' || u.role === 'parent') &&
            u.name && (
                u.name.toLowerCase().includes(smsSearchTerm.toLowerCase()) || 
                (u.phoneNumber && u.phoneNumber.includes(smsSearchTerm))
            )
        ).slice(0, 50);
    }, [users, myConstituency, smsSearchTerm]);
   
    const selectedIndividualUser = useMemo(() => {
        if (!selectedUserId) return null;
        return users.find(u => u.id === selectedUserId) || null;
    }, [users, selectedUserId]);

    const resolvedRecipients = useMemo(() => {
        switch (recipientTarget) {
            case 'staff':
                return users.filter(u => u && u.institutionId === myConstituency && u.phoneNumber).map(u => ({
                    id: u.id,
                    name: u.name,
                    phoneNumber: u.phoneNumber,
                    role: u.role
                }));
            case 'schools':
                return constituencyInstitutions.filter(i => i.phoneNumber).map(i => ({
                    id: i.id,
                    name: i.name,
                    phoneNumber: i.phoneNumber,
                    role: 'School Principal/Contact'
                }));
            case 'bursaries':
                return bursaryRecipients;
            case 'custom':
                return customRecipientsList;
            case 'individual':
                return selectedIndividualUser && selectedIndividualUser.phoneNumber ? [{
                    id: selectedIndividualUser.id,
                    name: selectedIndividualUser.name,
                    phoneNumber: selectedIndividualUser.phoneNumber,
                    role: selectedIndividualUser.role
                }] : [];
            default:
                return [];
        }
    }, [recipientTarget, users, myConstituency, constituencyInstitutions, bursaryRecipients, customRecipientsList, selectedIndividualUser]);

    const handleSendSms = async () => {
        const totalUnitsRequired = resolvedRecipients.length * smsInfo.count;

        if (resolvedRecipients.length === 0) {
            setSmsStatus({ type: 'error', message: 'No recipients with valid phone numbers found for the selected group.' });
            return;
        }
        if (!smsMessage.trim()) {
            setSmsStatus({ type: 'error', message: 'Message cannot be empty.' });
            return;
        }

        // --- OFFLINE PATH: queue locally and return ---
        if (!navigator.onLine) {
            setSmsStatus({ type: 'sending', message: `You are offline. Queuing ${resolvedRecipients.length} message(s) locally...` });
            try {
                const offlineMessages = resolvedRecipients.map(r => ({
                    id: `ob_offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: myConstituency,
                    recipient: r.phoneNumber,
                    message: smsMessage,
                    units: smsInfo.count,
                    status: 'pending' as const,
                    createdAt: new Date().toISOString()
                }));
                for (const msg of offlineMessages) {
                    await syncEngine.queueMutation('INSERT', 'sms_outbox', msg);
                }
                setSmsOutbox(prev => [...prev, ...offlineMessages]);
                setSmsStatus({
                    type: 'success',
                    message: `You are offline. ${offlineMessages.length} message(s) queued locally and will be sent automatically once connection is restored.`
                });
                setSmsMessage('');
                setCustomRecipients('');
                setSelectedUserId('');
            } catch (err: any) {
                setSmsStatus({ type: 'error', message: err.message || 'Failed to queue messages offline.' });
            }
            setTimeout(() => setSmsStatus({ type: 'idle', message: '' }), 8000);
            return;
        }

        // --- ONLINE PATH: send immediately ---
        if (smsBalance < totalUnitsRequired) {
            setSmsStatus({
                type: 'error',
                message: `Insufficient balance. This send requires ${totalUnitsRequired} units, but you only have ${smsBalance}.`
            });
            return;
        }

        const confirmMsg = resolvedRecipients.length === 1
            ? `You are about to send ${smsInfo.count} page(s) of SMS to 1 recipient. This will deduct ${totalUnitsRequired} units. Are you sure?`
            : `You are about to send ${smsInfo.count} page(s) of SMS to ${resolvedRecipients.length} recipients. \n\nCalculation: ${resolvedRecipients.length} recipients × ${smsInfo.count} pages = ${totalUnitsRequired} total units.\n\nAre you sure?`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        setSmsStatus({ type: 'sending', message: `Initializing bulk send to ${resolvedRecipients.length} recipients...` });

        try {
            const phoneNumbers = resolvedRecipients.map(r => r.phoneNumber);
            if (!onSendSms) {
                throw new Error("SMS sending callback is not configured.");
            }
            const result = await onSendSms(phoneNumbers, smsMessage);

            if (result && result.success) {
                setSmsStatus({ type: 'success', message: `Successfully dispatched message to ${resolvedRecipients.length} recipients.` });
                setSmsMessage('');
                setCustomRecipients('');
                setSelectedUserId('');
                fetchNgCdfData();
                if (smsSubTab === 'history') fetchSmsLogs();
            } else {
                setSmsStatus({ type: 'error', message: result?.message || 'Bulk dispatch failed.' });
            }
        } catch (e: any) {
            console.error("Failed to send bulk SMS:", e);
            setSmsStatus({ type: 'error', message: e.message || 'Error occurred while sending SMS.' });
        }

        setTimeout(() => setSmsStatus({ type: 'idle', message: '' }), 6000);
    };

    const handleQueueToOutbox = async () => {
        if (resolvedRecipients.length === 0) {
            setSmsStatus({ type: 'error', message: 'No valid recipients selected.' });
            return;
        }
        if (!smsMessage.trim()) {
            setSmsStatus({ type: 'error', message: 'Message content is empty.' });
            return;
        }

        setSmsStatus({ type: 'sending', message: 'Adding messages to outbox queue...' });
        try {
            const outboxMessages = resolvedRecipients.map(r => ({
                id: `ob_const_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                institutionId: myConstituency,
                recipient: r.phoneNumber,
                message: smsMessage,
                units: smsInfo.count,
                status: 'pending' as const,
                createdAt: new Date().toISOString()
            }));

            if (!navigator.onLine) {
                // Offline: persist locally and enqueue sync mutations
                for (const msg of outboxMessages) {
                    await syncEngine.queueMutation('INSERT', 'sms_outbox', msg);
                }
                setSmsOutbox(prev => [...prev, ...outboxMessages]);
                setSmsStatus({
                    type: 'success',
                    message: `You are offline. ${outboxMessages.length} message(s) saved locally and will sync to the server once connection is restored.`
                });
            } else {
                // Online: push to Supabase and mirror to local cache
                await apiService.saveToSmsOutbox(outboxMessages);
                for (const msg of outboxMessages) {
                    await localDb.put('sms_outbox', msg);
                }
                setSmsStatus({ type: 'success', message: `Successfully queued ${outboxMessages.length} message(s) to Outbox.` });
            }

            setSmsMessage('');
            setCustomRecipients('');
            setSelectedUserId('');
            fetchNgCdfData();
            if (smsSubTab === 'outbox') fetchSmsOutbox();
        } catch (err: any) {
            console.error('Failed to queue messages:', err);
            setSmsStatus({ type: 'error', message: err.message || 'Error queuing messages to outbox.' });
        }

        setTimeout(() => setSmsStatus({ type: 'idle', message: '' }), 6000);
    };

    const handleRetryOutboxItem = async (item: SmsOutbox) => {
        if (!navigator.onLine) {
            alert('You are offline. Please restore your internet connection to retry sending messages. Queued items will be sent automatically once you are back online.');
            return;
        }
        if (smsBalance < item.units) {
            alert(`Insufficient balance to retry (${item.units} units needed).`);
            return;
        }
        if (!onSendSms) {
            alert("SMS sending service is not active.");
            return;
        }
        try {
            const result = await onSendSms(item.recipient, item.message);
            if (result && result.success) {
                await apiService.removeFromSmsOutbox(item.id);
                // Remove from local cache as well
                await localDb.delete('sms_outbox', item.id);
                fetchSmsOutbox();
                fetchNgCdfData();
            } else {
                alert(`Retry failed: ${result?.message || 'Unknown error'}`);
            }
        } catch (e) {
            console.error("Failed to retry outbox item:", e);
        }
    };

    const handleRetryAllOutbox = async () => {
        if (smsOutbox.length === 0) return;

        if (!navigator.onLine) {
            // Trigger the sync engine to process any pending mutations when back online
            setSmsStatus({
                type: 'error',
                message: 'You are offline. All queued messages will be sent automatically once your connection is restored. The sync engine will process them in order.'
            });
            setTimeout(() => setSmsStatus({ type: 'idle', message: '' }), 8000);
            return;
        }

        if (!onSendSms) {
            alert("SMS sending service is not active.");
            return;
        }

        setSmsStatus({ type: 'sending', message: `Retrying ${smsOutbox.length} pending message(s)...` });
        let successCount = 0;
        try {
            for (const item of smsOutbox) {
                if (smsBalance < item.units) {
                    alert(`Stopping retry loop: Insufficient balance to send remaining messages.`);
                    break;
                }
                const result = await onSendSms(item.recipient, item.message);
                if (result && result.success) {
                    await apiService.removeFromSmsOutbox(item.id);
                    // Mirror removal in local cache
                    await localDb.delete('sms_outbox', item.id);
                    successCount++;
                }
            }
            setSmsStatus({ type: 'success', message: `Successfully processed ${successCount} message(s) from outbox.` });
            fetchSmsOutbox();
            fetchNgCdfData();
        } catch (e: any) {
            console.error("Retry all failed:", e);
            setSmsStatus({ type: 'error', message: e.message || 'Error occurred while retrying all.' });
        }

        setTimeout(() => setSmsStatus({ type: 'idle', message: '' }), 6000);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 text-white p-6 flex flex-col z-50">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-lg">
                        C
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-tight leading-none text-slate-100">NG-CDF Office</h1>
                        <p className="text-[11px] font-bold text-indigo-400 mt-1 uppercase tracking-wider">
                            {myConstituency}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'dashboard'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('institutions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'institutions'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <School className="w-4 h-4" />
                        Constituency Schools
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full font-mono">
                            {constituencyInstitutions.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('funds')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'funds'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <Wallet className="w-4 h-4" />
                        Allocated Budgets
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full font-mono">
                            {ngCdfFunds.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('vetting')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'vetting'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Vetting Board
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full font-mono">
                            {ngCdfBursaries.filter(b => b.status === 'pending' || b.status === 'vetted').length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('bulksms')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'bulksms'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Bulk SMS
                        {smsOutbox.length > 0 && (
                            <span className="ml-auto bg-red-600 text-white text-[10px] py-0.5 px-2 rounded-full font-mono animate-pulse">
                                {smsOutbox.length}
                            </span>
                        )}
                    </button>
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-300 font-bold text-sm uppercase">
                            {currentUser.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate text-slate-100">{currentUser.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 flex-1 p-8 overflow-y-auto min-h-screen">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                {myConstituency} constituency dashboard
                            </h2>
                            <p className="text-slate-500 font-medium">
                                Manage independent Constituency Development Fund (NG-CDF) allocations and clear student bursary vouchers.
                            </p>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-50 text-indigo-600 rounded-xl">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Budget</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">
                                    KES {ngCdfFunds.reduce((sum, f) => sum + (f.totalBudget || 0), 0).toLocaleString()}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Seeded limits</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cleared Cheques</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-950">
                                    KES {ngCdfBursaries.filter(b => b.status === 'disbursed').reduce((sum, b) => sum + (b.amountApproved || 0), 0).toLocaleString()}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Disbursed to schools</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vetting Pipeline</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 font-mono">
                                    {ngCdfBursaries.filter(b => b.status === 'pending' || b.status === 'vetted').length}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Pending approval</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <School className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schools</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 font-mono">
                                    {constituencyInstitutions.length}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Constituency registry</p>
                            </div>
                        </div>

                        {/* Recent pipeline action */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                            <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Vetting board snippet</h3>
                                    <button 
                                        onClick={() => setActiveTab('vetting')} 
                                        className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
                                    >
                                        Vette All Applications <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {ngCdfBursaries.slice(0, 5).length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            No recent applications reported
                                        </div>
                                    ) : (
                                        ngCdfBursaries.slice(0, 5).map(bur => (
                                            <div key={bur.id} className="py-4 flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase text-slate-900">{bur.studentName}</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{bur.institutionName} • Cheque: {bur.chequeNumber || '—'}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-bold text-slate-800">KES {bur.amountApproved?.toLocaleString()}</span>
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        bur.status === 'disbursed' ? 'bg-green-100 text-green-700' :
                                                        bur.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {bur.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 font-mono">Consolidated Budget</span>
                                    <h3 className="text-2xl font-black mt-2">
                                        KES {ngCdfFunds.reduce((sum, f) => sum + (f.remainingAmount || 0), 0).toLocaleString()}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">Remaining balance across all financial years</p>
                                </div>
                                <div className="space-y-4 mt-8">
                                    <button 
                                        onClick={() => setActiveTab('funds')}
                                        className="w-full py-3 bg-white text-indigo-600 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-colors"
                                    >
                                        Allocate Budget
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'institutions' && (() => {
                    const linkedIds = new Set(constituencyInstitutions.map(i => (i as any).registryId).filter(Boolean));
                    const linkedNames = new Set(constituencyInstitutions.map(i => i.name?.toLowerCase()));

                    const filteredRegistry = schoolRegistry.filter(s => {
                        if (!schoolSearchQuery.trim()) return false;
                        const q = schoolSearchQuery.toLowerCase();
                        return (
                            s.name?.toLowerCase().includes(q) ||
                            s.county?.toLowerCase().includes(q) ||
                            s.subCounty?.toLowerCase().includes(q) ||
                            s.knecCode?.toLowerCase().includes(q) ||
                            s.institutionType?.toLowerCase().includes(q)
                        );
                    }).slice(0, 30);

                    return (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Schools & Institutions</h2>
                                <p className="text-slate-500 font-medium">Manage educational centers under {myConstituency} constituency. Search the national registry or add manually.</p>
                            </div>
                            <button
                                onClick={() => setShowManualAddSchool(true)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add School Manually
                            </button>
                        </div>

                        {/* Registry Search */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-base font-black uppercase tracking-tight text-slate-800 mb-1">Search National School Registry</h3>
                            <p className="text-[11px] text-slate-400 font-medium mb-5">Search by school name, county, sub-county, KNEC code, or type. Click "Add to Constituency" to link a school.</p>

                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search school name, county, KNEC code..."
                                    value={schoolSearchQuery}
                                    onChange={e => setSchoolSearchQuery(e.target.value)}
                                    onFocus={() => { if (schoolRegistry.length === 0) fetchSchoolRegistry(); }}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-medium text-sm text-slate-800 transition-all"
                                />
                                {isLoadingRegistry && (
                                    <RefreshCw className="absolute right-4 top-3.5 w-4 h-4 text-indigo-500 animate-spin" />
                                )}
                            </div>

                            {/* Search results */}
                            {schoolSearchQuery.trim() && (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {filteredRegistry.length === 0 && !isLoadingRegistry ? (
                                        <div className="text-center py-8 space-y-3">
                                            <div className="text-3xl">🔍</div>
                                            <p className="text-sm font-bold text-slate-500">No schools found matching "{schoolSearchQuery}"</p>
                                            <p className="text-xs text-slate-400">You can add this school manually using the button above.</p>
                                            <button
                                                onClick={() => { setManualSchoolForm(p => ({ ...p, name: schoolSearchQuery })); setShowManualAddSchool(true); }}
                                                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                            >
                                                <Plus className="inline w-3 h-3 mr-1" />
                                                Add "{schoolSearchQuery}" Manually
                                            </button>
                                        </div>
                                    ) : (
                                        filteredRegistry.map(school => {
                                            const alreadyLinked = linkedIds.has(school.id) || linkedNames.has(school.name?.toLowerCase());
                                            return (
                                                <div key={school.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                                    alreadyLinked
                                                        ? 'bg-emerald-50 border-emerald-200'
                                                        : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                                                }`}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black uppercase text-slate-900 truncate">{school.name}</span>
                                                            {school.institutionType && (
                                                                <span className="shrink-0 text-[9px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-black uppercase tracking-wider">{school.institutionType}</span>
                                                            )}
                                                            {school.genderType && (
                                                                <span className="shrink-0 text-[9px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-black uppercase tracking-wider">{school.genderType}</span>
                                                            )}
                                                            {school.accommodationType && (
                                                                <span className="shrink-0 text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-black uppercase tracking-wider">{school.accommodationType}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {school.subCounty && <span className="text-[10px] text-slate-500 font-medium">📍 {school.subCounty}</span>}
                                                            {school.county && <span className="text-[10px] text-slate-400">{school.county} County</span>}
                                                            {school.knecCode && <span className="text-[10px] font-mono text-slate-400">KNEC: {school.knecCode}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 shrink-0">
                                                        {alreadyLinked ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Added
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setLinkingSchoolDetails(school); setLinkingAdminEmail(''); setLinkingAdminPhone(''); }}
                                                                disabled={schoolLinkingId === school.id}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                                                            >
                                                                {schoolLinkingId === school.id ? (
                                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <Plus className="w-3 h-3" />
                                                                )}
                                                                Add to Constituency
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {!schoolSearchQuery.trim() && (
                                <div className="text-center py-8 text-slate-400">
                                    <School className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold uppercase tracking-wider">Type a school name to search the national registry</p>
                                    {schoolRegistry.length > 0 && (
                                        <p className="text-[10px] mt-1">{schoolRegistry.length.toLocaleString()} schools in registry</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Constituency Schools Table */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight text-slate-800">{myConstituency} Schools</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{constituencyInstitutions.length} schools registered under this constituency</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">School Name</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Type</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Contact</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Sub-County</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Code</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {constituencyInstitutions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center">
                                                    <School className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                                    <p className="text-xs text-slate-400 font-medium">No schools linked to {myConstituency} yet.</p>
                                                    <p className="text-[10px] text-slate-300 mt-1">Search the national registry above or add schools manually.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            constituencyInstitutions.map(inst => (
                                                <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <div className="text-xs font-bold text-slate-900">{inst.name}</div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full uppercase tracking-wider">
                                                            {inst.institutionType || 'School'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="text-xs text-slate-700 font-medium">{inst.email || '—'}</div>
                                                        <div className="text-[10px] text-slate-400">{inst.phoneNumber || ''}</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-medium text-slate-600">{inst.subCounty || '—'}</td>
                                                    <td className="py-4 px-4 text-[10px] font-mono text-slate-500">{inst.institutionCode || '—'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {/* Manual Add School Modal */}
                {showManualAddSchool && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowManualAddSchool(false)}>
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Add School Manually</h3>
                                    <p className="text-[11px] text-slate-400 mt-1">School will be added to <span className="font-black text-indigo-600">{myConstituency}</span> constituency</p>
                                </div>
                                <button onClick={() => setShowManualAddSchool(false)} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleManualAddSchool} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="relative">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">School Name *</label>
                                    <input
                                        type="text" required
                                        value={manualSchoolForm.name}
                                        onChange={e => setManualSchoolForm(p => ({ ...p, name: e.target.value, registryId: null }))}
                                        placeholder="e.g. Kigumo High School"
                                        className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 text-sm"
                                    />
                                    {(() => {
                                        const nameQuery = manualSchoolForm.name.toLowerCase();
                                        const matchingRegistry = schoolRegistry.filter(s => {
                                            if (!nameQuery.trim()) return false;
                                            if (manualSchoolForm.registryId) {
                                                const selected = schoolRegistry.find(r => r.id === manualSchoolForm.registryId);
                                                if (selected && selected.name.toLowerCase() === nameQuery) return false;
                                            }
                                            return s.name.toLowerCase().includes(nameQuery);
                                        }).slice(0, 5);

                                        if (matchingRegistry.length === 0) return null;

                                        return (
                                            <div className="absolute z-[210] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                <div className="p-2 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-indigo-600">
                                                    Match Registry School
                                                </div>
                                                {matchingRegistry.map(school => (
                                                    <button
                                                        key={school.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setManualSchoolForm({
                                                                name: school.name,
                                                                institutionType: school.institutionType || 'Secondary',
                                                                subCounty: school.subCounty || '',
                                                                phoneNumber: manualSchoolForm.phoneNumber,
                                                                email: manualSchoolForm.email,
                                                                knecCode: school.knecCode || '',
                                                                uic: school.uic || '',
                                                                accommodationType: school.accommodationType || 'Day',
                                                                genderType: school.genderType || 'Mixed',
                                                                registryId: school.id
                                                            });
                                                        }}
                                                        className="w-full p-3 hover:bg-indigo-50 text-left text-xs font-bold text-slate-700 flex flex-col transition-colors"
                                                    >
                                                        <span className="text-indigo-600 font-extrabold">{school.name}</span>
                                                        <span className="text-[9px] text-slate-400 mt-0.5">
                                                            {school.institutionType || 'School'} • {school.accommodationType || 'Day'} • {school.genderType || 'Mixed'} • Sub-County: {school.subCounty || '—'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Institution Type</label>
                                        <select value={manualSchoolForm.institutionType} onChange={e => setManualSchoolForm(p => ({ ...p, institutionType: e.target.value }))} className="form-select w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 text-sm">
                                            <option>Primary</option>
                                            <option>Secondary</option>
                                            <option>TVET</option>
                                            <option>University</option>
                                            <option>Special Needs</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Boarding Type</label>
                                        <select value={manualSchoolForm.accommodationType} onChange={e => setManualSchoolForm(p => ({ ...p, accommodationType: e.target.value as any }))} className="form-select w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 text-sm">
                                            <option value="Day">Day</option>
                                            <option value="Boarding">Boarding</option>
                                            <option value="Mixed">Mixed</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Gender</label>
                                        <select value={manualSchoolForm.genderType} onChange={e => setManualSchoolForm(p => ({ ...p, genderType: e.target.value as any }))} className="form-select w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 text-sm">
                                            <option value="Mixed">Mixed</option>
                                            <option value="Boys">Boys</option>
                                            <option value="Girls">Girls</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Sub-County</label>
                                        <input type="text" value={manualSchoolForm.subCounty} onChange={e => setManualSchoolForm(p => ({ ...p, subCounty: e.target.value }))} placeholder="e.g. Kigumo" className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Phone Number</label>
                                        <input type="tel" value={manualSchoolForm.phoneNumber} onChange={e => setManualSchoolForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="07xx xxx xxx" className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-medium text-slate-800 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Email</label>
                                        <input type="email" value={manualSchoolForm.email} onChange={e => setManualSchoolForm(p => ({ ...p, email: e.target.value }))} placeholder="school@email.com" className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-medium text-slate-800 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">KNEC Code</label>
                                        <input type="text" value={manualSchoolForm.knecCode} onChange={e => setManualSchoolForm(p => ({ ...p, knecCode: e.target.value }))} placeholder="Optional" className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-mono text-slate-700 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">UIC</label>
                                        <input type="text" value={manualSchoolForm.uic} onChange={e => setManualSchoolForm(p => ({ ...p, uic: e.target.value }))} placeholder="Optional" className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-mono text-slate-700 text-sm" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowManualAddSchool(false)} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSavingSchool} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                                        {isSavingSchool && <RefreshCw className="w-3 h-3 animate-spin" />}
                                        Save School
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Link Registry School Contact Details Modal */}
                {linkingSchoolDetails && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setLinkingSchoolDetails(null)}>
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Add School Admin Details</h3>
                                    <p className="text-[11px] text-slate-400 mt-1">Provide contact details to automatically generate school login credentials.</p>
                                </div>
                                <button onClick={() => setLinkingSchoolDetails(null)} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleLinkSchoolConfirm} className="p-8 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-700">Linking: <span className="text-indigo-600 font-black">{linkingSchoolDetails.name}</span></p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Admin Email *</label>
                                    <input
                                        type="email" required
                                        value={linkingAdminEmail}
                                        onChange={e => setLinkingAdminEmail(e.target.value)}
                                        placeholder="school.admin@email.com"
                                        className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Admin Phone Number</label>
                                    <input
                                        type="tel"
                                        value={linkingAdminPhone}
                                        onChange={e => setLinkingAdminPhone(e.target.value)}
                                        placeholder="07xx xxx xxx (Optional)"
                                        className="form-input w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-medium text-slate-800 text-sm"
                                    />
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setLinkingSchoolDetails(null)} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all">
                                        Link & Send Credentials
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'funds' && (
                    <div className="space-y-6">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">NG-CDF Budgets</h2>
                            <p className="text-slate-500 font-medium">Manage yearly funding limits allocated to the constituency development funds.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 h-fit">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Allocate Fund Budget</h3>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Define budget envelopes per financial year.</p>
                                </div>

                                <form onSubmit={handleSaveNgCdfFund} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Constituency</label>
                                        <input 
                                            type="text" 
                                            disabled 
                                            value={myConstituency}
                                            className="w-full px-4 py-3 bg-slate-100 border-2 border-transparent rounded-xl outline-none font-bold text-slate-500 text-sm cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Financial Year</label>
                                        <select
                                            value={ngCdfFormFY}
                                            onChange={e => setNgCdfFormFY(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="2025/2026">2025/2026</option>
                                            <option value="2026/2027">2026/2027</option>
                                            <option value="2027/2028">2027/2028</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Allocated Budget (KES)</label>
                                        <input 
                                            type="number" 
                                            placeholder="0.00" 
                                            required
                                            value={ngCdfFormBudget}
                                            onChange={e => setNgCdfFormBudget(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
                                    >
                                        Register Allocation
                                    </button>
                                </form>
                            </div>

                            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-fit">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Constituency Budgets</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Financial Year</th>
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Total Budget</th>
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Allocated</th>
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Remaining</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {ngCdfFunds.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-4 text-xs text-slate-400 font-medium">No budgets initialized for {myConstituency} yet.</td>
                                                </tr>
                                            ) : (
                                                ngCdfFunds.map(fund => (
                                                    <tr key={fund.id}>
                                                        <td className="py-3 text-xs font-bold text-slate-800">{fund.financialYear}</td>
                                                        <td className="py-3 text-xs text-right font-bold text-slate-700">KES {fund.totalBudget?.toLocaleString()}</td>
                                                        <td className="py-3 text-xs text-right text-slate-500">KES {fund.allocatedAmount?.toLocaleString() || 0}</td>
                                                        <td className="py-3 text-xs text-right font-black text-indigo-600">KES {fund.remainingAmount?.toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vetting' && (
                    <div className="space-y-6">
                        <div className="mb-8 flex justify-between items-end">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Vetting Board & Pipeline</h2>
                                <p className="text-slate-500 font-medium">Verify, approve, or reject student bursary applications linked to this constituency.</p>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student or school..."
                                    value={filterSearch}
                                    onChange={e => setFilterSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none font-medium text-xs text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Institution</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Cheque #</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Amount</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredBursariesList.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">No applications reported in this queue.</td>
                                            </tr>
                                        ) : (
                                            filteredBursariesList.map(bur => (
                                                <tr key={bur.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <div className="text-xs font-bold text-slate-900 uppercase">{bur.studentName}</div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">Applied: {bur.appliedAt ? new Date(bur.appliedAt).toLocaleDateString() : 'Recent'}</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-medium text-slate-600">
                                                        {bur.institutionName}
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-mono text-indigo-600">
                                                        {bur.chequeNumber || '—'}
                                                    </td>
                                                    <td className="py-4 px-4 text-xs text-right font-black text-slate-800">
                                                        KES {bur.amountApproved?.toLocaleString()}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            bur.status === 'disbursed' || bur.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            bur.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {bur.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        {bur.status !== 'disbursed' && bur.status !== 'rejected' ? (
                                                            <div className="flex gap-2 justify-end">
                                                                <button 
                                                                    onClick={() => handleUpdateBursaryStatus(bur.id, 'disbursed')}
                                                                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleUpdateBursaryStatus(bur.id, 'rejected')}
                                                                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-400 font-medium">
                                                                Cleared by {bur.vettedBy || 'CDF Officer'}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bulksms' && (
                    <div className="space-y-6">
                        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Bulk SMS Services</h2>
                                <p className="text-slate-500 font-medium">Broadcast alerts, announcements, or notifications to constituency stakeholders.</p>
                            </div>
                            
                            {/* SMS Balance Stats Widget */}
                            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">SMS Balance</span>
                                    <span className={`text-sm font-black ${smsBalance < 50 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                                        {smsBalance.toLocaleString()} Units
                                    </span>
                                </div>
                                <button
                                    onClick={() => alert(`To top up your SMS credits, please contact the county billing office or EduAI support. Reference Code: CDF-SMS-${myConstituency.toUpperCase()}`)}
                                    className="ml-4 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm shadow-indigo-600/10"
                                >
                                    Top Up
                                </button>
                            </div>
                        </div>

                        {/* Alert / Status Bar */}
                        {smsStatus.type !== 'idle' && (
                            <div className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-medium border animate-fade-in ${
                                smsStatus.type === 'sending' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                smsStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                                {smsStatus.type === 'sending' && <RefreshCw className="w-4 h-4 animate-spin text-blue-500 mt-0.5" />}
                                {smsStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />}
                                {smsStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />}
                                <div>
                                    <span className="font-bold capitalize">{smsStatus.type}: </span>
                                    {smsStatus.message}
                                </div>
                            </div>
                        )}

                        {/* Navigation Sub-Tabs */}
                        <div className="flex gap-4 border-b border-slate-200 pb-2">
                            <button
                                onClick={() => setSmsSubTab('compose')}
                                className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all flex items-center gap-2 ${
                                    smsSubTab === 'compose'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Send className="w-3.5 h-3.5" />
                                Compose
                            </button>
                            <button
                                onClick={() => setSmsSubTab('history')}
                                className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all flex items-center gap-2 ${
                                    smsSubTab === 'history'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <History className="w-3.5 h-3.5" />
                                Sent History
                            </button>
                            <button
                                onClick={() => setSmsSubTab('outbox')}
                                className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all flex items-center gap-2 ${
                                    smsSubTab === 'outbox'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Outbox Queue
                                {smsOutbox.length > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                        {smsOutbox.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Tab Content Panels */}
                        {smsSubTab === 'compose' && (
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Composer Settings */}
                                <div className="flex-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Create Broadcast</h3>
                                        <p className="text-xs text-slate-400 font-medium mt-1">Compose message and target recipients in your constituency.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Target Selector */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Recipient Group</label>
                                            <select
                                                value={recipientTarget}
                                                onChange={e => {
                                                    setRecipientTarget(e.target.value as any);
                                                    setSelectedUserId('');
                                                    setCustomRecipients('');
                                                    setSmsSearchTerm('');
                                                }}
                                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm transition-all"
                                            >
                                                <option value="staff">Constituency Staff ({users.filter(u => u && u.institutionId === myConstituency).length} users)</option>
                                                <option value="schools">School Contacts ({constituencyInstitutions.length} schools)</option>
                                                <option value="bursaries">Bursary Applicants ({bursaryRecipients.length} resolved students)</option>
                                                <option value="individual">Search & Select Individual</option>
                                                <option value="custom">Custom Phone Numbers</option>
                                            </select>
                                        </div>

                                        {/* Secondary Selectors */}
                                        {recipientTarget === 'individual' && (
                                            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-in">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Search User (Name / Phone)</label>
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Type to search..."
                                                            value={smsSearchTerm}
                                                            onChange={e => setSmsSearchTerm(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-medium text-xs text-slate-700"
                                                        />
                                                    </div>
                                                </div>

                                                {smsSearchTerm && (
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Search Result</label>
                                                        <select
                                                            value={selectedUserId}
                                                            onChange={e => setSelectedUserId(e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700"
                                                        >
                                                            <option value="">-- Choose User --</option>
                                                            {filteredUsersForSms.map(u => (
                                                                <option key={u.id} value={u.id}>
                                                                    {u.name} ({u.role}) - {u.phoneNumber || 'No phone'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {recipientTarget === 'custom' && (
                                            <div className="space-y-1 animate-fade-in">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Custom Recipient Numbers (Comma or Newline separated)</label>
                                                <textarea
                                                    placeholder="e.g. +254712345678, 0723456789"
                                                    value={customRecipients}
                                                    onChange={e => setCustomRecipients(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-semibold text-slate-700 text-xs placeholder-slate-400"
                                                />
                                                <span className="text-[10px] text-slate-400 font-bold ml-1">Detected {customRecipientsList.length} valid numbers.</span>
                                            </div>
                                        )}

                                        {/* Resolved Recipients Info Box */}
                                        {resolvedRecipients.length > 0 && (
                                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-2 text-indigo-800 text-xs">
                                                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <span className="font-bold">Target Details:</span> Will broadcast message to <strong className="font-black text-indigo-700">{resolvedRecipients.length}</strong> recipient(s). 
                                                    <div className="mt-1 flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                                                        {resolvedRecipients.slice(0, 8).map(r => (
                                                            <span key={r.id} className="inline-flex px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black">
                                                                {r.name} ({r.phoneNumber})
                                                            </span>
                                                        ))}
                                                        {resolvedRecipients.length > 8 && (
                                                            <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold">
                                                                + {resolvedRecipients.length - 8} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Message Composer Area */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Message Content</label>
                                                <span className={`text-[10px] font-bold ${smsInfo.isUnicode ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {smsInfo.isUnicode ? 'Unicode SMS (Emoji/Special)' : 'Standard GSM SMS'}
                                                </span>
                                            </div>
                                            <textarea
                                                placeholder="Write your broadcast message here..."
                                                required
                                                value={smsMessage}
                                                onChange={e => setSmsMessage(e.target.value)}
                                                rows={5}
                                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm placeholder-slate-400"
                                            />
                                            {/* Composer Stats */}
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 mt-1">
                                                <span>{smsInfo.characters} Characters</span>
                                                <span>{smsInfo.count} Page(s) ({smsInfo.limit} chars/part)</span>
                                                <span className="text-indigo-600">{resolvedRecipients.length * smsInfo.count} total units needed</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Triggers */}
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleSendSms}
                                            disabled={smsStatus.type === 'sending' || resolvedRecipients.length === 0}
                                            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                                        >
                                            <Send className="w-4 h-4" />
                                            Send Immediately
                                        </button>
                                        <button
                                            onClick={handleQueueToOutbox}
                                            disabled={smsStatus.type === 'sending' || resolvedRecipients.length === 0}
                                            className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                        >
                                            Queue to Outbox
                                        </button>
                                    </div>
                                </div>

                                {/* Phone Mockup Preview Card */}
                                <div className="w-80 flex flex-col items-center justify-center p-6 bg-slate-100 rounded-[2.5rem] border border-slate-200 shadow-inner flex-shrink-0">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-4 font-mono">Live Broadcast Preview</span>
                                    <div className="relative w-64 h-[440px] bg-slate-950 rounded-[2.5rem] border-8 border-slate-900 shadow-2xl overflow-hidden flex flex-col justify-between p-3 font-sans">
                                        {/* Status bar */}
                                        <div className="flex justify-between items-center text-slate-500 text-[8px] px-2 py-1 select-none">
                                            <span>EduAI Mobiles</span>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        </div>
                                        
                                        {/* Screen body */}
                                        <div className="flex-1 w-full bg-slate-900/60 backdrop-blur rounded-2xl p-3 overflow-y-auto flex flex-col justify-end space-y-4">
                                            <div className="self-center bg-slate-800/40 text-[9px] px-2 py-0.5 rounded-full text-slate-400 font-medium select-none mb-4">
                                                Today
                                            </div>
                                            
                                            {/* Chat Bubble */}
                                            {smsMessage.trim() ? (
                                                <div className="self-end max-w-[85%] bg-indigo-600 text-white rounded-2xl rounded-tr-none p-3 shadow-md text-[10px] font-medium leading-relaxed break-words animate-fade-in whitespace-pre-wrap">
                                                    {smsMessage}
                                                    <span className="block text-[8px] text-indigo-200 mt-1.5 text-right font-mono select-none">
                                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="self-center py-12 text-center text-slate-500 text-[10px] italic select-none">
                                                    No message drafted yet. Type in the composer to preview.
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Home button indicator */}
                                        <div className="w-24 h-1 bg-slate-800 rounded-full self-center mt-2 select-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {smsSubTab === 'history' && (
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sent SMS Logs</h3>
                                    <button
                                        onClick={fetchSmsLogs}
                                        disabled={isLoadingLogs}
                                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:opacity-50"
                                        title="Reload Logs"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {isLoadingLogs ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="text-xs font-bold uppercase tracking-wider">Loading history logs...</p>
                                    </div>
                                ) : smsLogs.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider border-2 border-dashed border-slate-100 rounded-2xl">
                                        No sent messages found for this constituency office.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date & Time</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Recipient</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Message Content</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Units Used</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {smsLogs.map(log => {
                                                    const date = new Date(log.createdAt);
                                                    return (
                                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-4 px-4 whitespace-nowrap">
                                                                <div className="text-xs font-bold text-slate-700">{date.toLocaleDateString()}</div>
                                                                <div className="text-[10px] text-slate-400 font-semibold">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="text-xs font-bold text-slate-800">{log.recipient}</div>
                                                            </td>
                                                            <td className="py-4 px-4 min-w-[200px] max-w-xs truncate text-xs text-slate-600 font-semibold" title={log.message}>
                                                                {log.message}
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold font-mono">
                                                                    {log.units}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                                                    {log.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {smsSubTab === 'outbox' && (
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Outbox Queue</h3>
                                        <p className="text-xs text-slate-400 font-medium mt-1">Pending messages waiting for dispatch or manual retry.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRetryAllOutbox}
                                            disabled={smsOutbox.length === 0}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Retry All
                                        </button>
                                        <button
                                            onClick={fetchSmsOutbox}
                                            disabled={isLoadingOutbox}
                                            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:opacity-50"
                                            title="Reload Outbox"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isLoadingOutbox ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {isLoadingOutbox ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="text-xs font-bold uppercase tracking-wider">Loading outbox...</p>
                                    </div>
                                ) : smsOutbox.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider border-2 border-dashed border-slate-100 rounded-2xl">
                                        Outbox queue is empty.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date Queued</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Recipient</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Message Content</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Required Units</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                                    <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {smsOutbox.map(item => {
                                                    const date = new Date(item.createdAt);
                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 font-semibold">
                                                                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td className="py-4 px-4 text-xs font-bold text-slate-800">
                                                                {item.recipient}
                                                            </td>
                                                            <td className="py-4 px-4 min-w-[200px] max-w-xs truncate text-xs text-slate-600 font-semibold" title={item.message}>
                                                                {item.message}
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold font-mono">
                                                                    {item.units}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-center animate-pulse">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700">
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                <div className="flex gap-2 justify-end">
                                                                    <button
                                                                        onClick={() => handleRetryOutboxItem(item)}
                                                                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                                                    >
                                                                        Retry
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (window.confirm("Delete this queued message?")) {
                                                                                if (!navigator.onLine) {
                                                                                    // Offline: delete locally and queue a sync mutation
                                                                                    await syncEngine.queueMutation('DELETE', 'sms_outbox', item);
                                                                                    setSmsOutbox(prev => prev.filter(o => o.id !== item.id));
                                                                                } else {
                                                                                    // Online: remove from server and local cache
                                                                                    await apiService.removeFromSmsOutbox(item.id);
                                                                                    await localDb.delete('sms_outbox', item.id);
                                                                                    fetchSmsOutbox();
                                                                                    fetchNgCdfData();
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
