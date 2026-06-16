import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, Receipt, Expense, FinancialGoal, User, Institution, FeeStructure, AcademicYear, Semester, Requisition, VoteHead, Course, CompanyDetails } from '../../types';
import { RevenueWarRoom } from './RevenueWarRoom';
import { AutomatedBilling } from './AutomatedBilling';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { ZapIcon } from '../icons/ZapIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { ScaleIcon } from '../icons/ScaleIcon';
import { RetailRequisitions } from '../retail/RetailRequisitions';
import { apiService } from '../../services/apiService';
import { isEduInstitution } from '../../utils/roleUtils';

interface FinanceManagerProps {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    goals: FinancialGoal[];
    feeStructures: FeeStructure[];
    students: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    institution: Institution;
    onGenerateInvoices: (invoices: any[]) => Promise<void>;
    onAddExpense: (expense: any) => Promise<void>;
    receiptLimit: number;
    setReceiptLimit: React.Dispatch<React.SetStateAction<number>>;
    transactionLimit: number;
    setTransactionLimit: React.Dispatch<React.SetStateAction<number>>;
    transactions?: any[];
    requisitions?: Requisition[];
    onUpdateRequisition?: (id: string, data: any) => Promise<void>;
    currentUser: User;
    voteHeads?: VoteHead[];
    courses?: Course[];
    onRefreshData?: () => Promise<void>;
    companyDetails?: CompanyDetails;
}

export const FinanceManager: React.FC<FinanceManagerProps> = (props) => {
    const isDrivingSchool = props.institution.institutionType === 'Driving School';
    
    // Dynamic Tabs based on Institution Type
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'expenses' | 'audit' | 'requisitions' | 'config'>('overview');

    const tabs = [
        { id: 'overview', label: 'Revenue War Room', icon: BarChart3Icon },
        { id: 'billing', label: isDrivingSchool ? 'DS Invoices' : 'Billing Engine', icon: ZapIcon },
        ...(!isDrivingSchool ? [{ id: 'config', label: 'Fee Configuration', icon: CreditCardIcon }] : []),
        { id: 'expenses', label: 'Expense Governance', icon: BanknotesIcon },
        { id: 'requisitions', label: 'Requisitions & LPOs', icon: ClipboardListIcon },
        { id: 'audit', label: 'Fiscal Audit', icon: CheckBadgeIcon },
    ] as const;

    const [retailStores, setRetailStores] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Driving School Mode States
    const [dsInvoices, setDsInvoices] = useState<any[]>([]);
    const [dsPayments, setDsPayments] = useState<any[]>([]);
    const [dsSettings, setDsSettings] = useState<any>(null);
    const [dsFeeStructures, setDsFeeStructures] = useState<any[]>([]);
    const [isCreatingDsInvoice, setIsCreatingDsInvoice] = useState(false);
    const [selectedDsInvoice, setSelectedDsInvoice] = useState<any | null>(null);
    const [isRecordingDsPayment, setIsRecordingDsPayment] = useState(false);

    // DS New Invoice Form States
    const [dsFormStudentId, setDsFormStudentId] = useState('');
    const [dsFormClass, setDsFormClass] = useState('');
    const [dsFormItems, setDsFormItems] = useState<Array<{ name: string; amount: number; priority: number }>>([]);
    const [dsFormNotes, setDsFormNotes] = useState('');
    const [dsFormDueDate, setDsFormDueDate] = useState('');

    // DS Payment Form States
    const [dsPayAmount, setDsPayAmount] = useState<number>(0);
    const [dsPayMethod, setDsPayMethod] = useState('M-Pesa');
    const [dsPayReference, setDsPayReference] = useState('');

    // Education Fee Config Sub-tab State
    const [configSubTab, setConfigSubTab] = useState<'voteheads' | 'builder'>('voteheads');

    // Voteheads Setup States
    const [newVoteName, setNewVoteName] = useState('');
    const [newVotePriority, setNewVotePriority] = useState(1);
    const [newVoteAllocatedAmount, setNewVoteAllocatedAmount] = useState(0);
    const [editingVoteheadId, setEditingVoteheadId] = useState<string | null>(null);
    const [editVoteName, setEditVoteName] = useState('');
    const [editVotePriority, setEditVotePriority] = useState(1);
    const [editVoteAllocatedAmount, setEditVoteAllocatedAmount] = useState(0);

    // Fee Structure Builder States
    const [builderCourseId, setBuilderCourseId] = useState('');
    const [builderAYId, setBuilderAYId] = useState('');
    const [builderTerm, setBuilderTerm] = useState('');
    const [builderAmounts, setBuilderAmounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const instId = props.institution.id;
        apiService.fetchModuleRecords<any>('retail_stores', instId)
            .then(res => setRetailStores(res || []))
            .catch(err => console.error("Failed to load stores for finance:", err));
        Promise.all([
            apiService.fetchModuleRecords<any>('inventory', instId).catch(() => []),
            apiService.fetchModuleRecords<any>('retail_inventory_items', instId).catch(() => [])
        ])
        .then(([genInv, retInv]) => setInventory([...(genInv || []), ...(retInv || [])]))
            .catch(err => console.error("Failed to load inventory for finance:", err));
        apiService.fetchModuleRecords<any>('users', instId)
            .then(res => setAllUsers(res || []))
            .catch(err => console.error("Failed to load users for finance:", err));
    }, [props.institution.id]);

    // Retrieve DS records if institutionType === 'Driving School'
    useEffect(() => {
        if (isDrivingSchool) {
            const instId = props.institution.id;
            apiService.fetchModuleRecords<any>('ds_invoices', instId)
                .then(res => setDsInvoices(res || []))
                .catch(err => console.error("Failed to load ds_invoices:", err));
            apiService.fetchModuleRecords<any>('ds_payments', instId)
                .then(res => setDsPayments(res || []))
                .catch(err => console.error("Failed to load ds_payments:", err));
            apiService.fetchModuleRecords<any>('ds_settings', instId)
                .then(res => {
                    if (res && res.length > 0) setDsSettings(res[0]);
                })
                .catch(err => console.error("Failed to load ds_settings:", err));
            apiService.fetchModuleRecords<any>('ds_fee_structures', instId)
                .then(res => setDsFeeStructures(res || []))
                .catch(err => console.error("Failed to load ds_fee_structures:", err));
        }
    }, [props.institution.id, isDrivingSchool]);

    // Pre-populate builder amounts from existing structures
    useEffect(() => {
        if (builderCourseId && builderAYId && builderTerm) {
            const matchingFS = props.feeStructures.filter(f =>
                f.courseId === builderCourseId &&
                f.academicYearId === builderAYId &&
                f.term === builderTerm
            );
            const initialAmounts: Record<string, number> = {};
            (props.voteHeads || []).forEach(v => {
                const fs = matchingFS.find(item => item.voteHeadId === v.id);
                initialAmounts[v.id] = fs ? fs.amount : 0;
            });
            setBuilderAmounts(initialAmounts);
        } else {
            setBuilderAmounts({});
        }
    }, [builderCourseId, builderAYId, builderTerm, props.feeStructures, props.voteHeads]);

    // Translate DS structures to standard Dashboard Invoice models dynamically
    const mappedInvoices = useMemo(() => {
        if (!isDrivingSchool) return props.invoices;
        return dsInvoices.map((dsInv: any) => ({
            id: dsInv.id,
            invoiceNumber: dsInv.invoiceNumber || dsInv.invoice_number || dsInv.id,
            institutionId: dsInv.institutionId,
            issueDate: dsInv.createdAt || new Date().toISOString(),
            dueDate: dsInv.dueDate || dsInv.due_date || '',
            due_date: dsInv.dueDate || dsInv.due_date || '',
            items: (dsInv.items || []).map((it: any) => ({
                description: it.name || it.voteName || 'Fee Item',
                quantity: 1,
                unitPrice: it.amount || 0,
                amount: it.amount || 0
            })),
            totalAmount: dsInv.totalAmount || 0,
            status: dsInv.status === 'Fully Paid' ? 'paid' as const : 'pending' as const,
            studentId: dsInv.studentId
        }));
    }, [props.invoices, dsInvoices, isDrivingSchool]);

    // Translate DS payments to standard Dashboard Receipt models dynamically
    const mappedReceipts = useMemo(() => {
        if (!isDrivingSchool) return props.receipts;
        return dsPayments.map((dsPay: any) => ({
            id: dsPay.id,
            receiptNumber: dsPay.receiptNumber || dsPay.receipt_number || dsPay.id,
            institutionId: dsPay.institutionId,
            paymentDate: dsPay.paymentDate || new Date().toISOString(),
            amountPaid: dsPay.amount || 0,
            paidFor: `Payment for DS Invoice ${dsPay.invoiceNumber || dsPay.invoiceId}`,
            paymentMethod: dsPay.paymentMethod || 'Cash',
            relatedTransactionId: dsPay.transactionReference || '',
            invoiceId: dsPay.invoiceId,
            studentId: dsPay.studentId
        }));
    }, [props.receipts, dsPayments, isDrivingSchool]);

    // Voteheads save handlers
    const handleSaveVoteHead = async (voteHead: Partial<VoteHead>) => {
        try {
            const payload = {
                id: voteHead.id || `vh_${Date.now()}`,
                name: voteHead.name,
                allocatedAmount: Number(voteHead.allocatedAmount) || 0,
                amountSpent: voteHead.amountSpent || 0,
                academicYearId: voteHead.academicYearId || '',
                priority: Number(voteHead.priority) || 10,
                institutionId: props.institution.id
            };
            await apiService.saveModuleRecord('vote_heads', payload);
            setNewVoteName('');
            setNewVotePriority(1);
            setNewVoteAllocatedAmount(0);
            setEditingVoteheadId(null);
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            alert("Vote head saved successfully!");
        } catch (e) {
            console.error("Failed to save votehead:", e);
            alert("Failed to save votehead.");
        }
    };

    const handleDeleteVoteHead = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this votehead?")) return;
        try {
            await apiService.deleteModuleRecord('vote_heads', id);
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            alert("Vote head deleted.");
        } catch (e) {
            console.error("Failed to delete votehead:", e);
            alert("Failed to delete votehead.");
        }
    };

    // Fee cohort saving
    const handleSaveFeeStructure = async () => {
        if (!builderCourseId || !builderAYId || !builderTerm) {
            alert("Please select Course, Academic Year, and Semester.");
            return;
        }
        try {
            const activeVotes = Object.entries(builderAmounts).filter(([_, amt]) => amt > 0);
            const existingList = props.feeStructures.filter(f =>
                f.courseId === builderCourseId &&
                f.academicYearId === builderAYId &&
                f.term === builderTerm
            );

            await Promise.all(activeVotes.map(async ([voteHeadId, amount]) => {
                const matchedVoteHead = (props.voteHeads || []).find(v => v.id === voteHeadId);
                const matchedName = matchedVoteHead ? matchedVoteHead.name : 'Fee Item';
                const matchedPriority = matchedVoteHead ? matchedVoteHead.priority : 10;
                
                const existing = existingList.find(e => e.voteHeadId === voteHeadId);
                const payload: FeeStructure = {
                    id: existing ? existing.id : `fs_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
                    name: `${matchedName}`,
                    amount: amount,
                    academicYearId: builderAYId,
                    term: builderTerm,
                    courseId: builderCourseId,
                    voteHeadId: voteHeadId,
                    priority: matchedPriority,
                    institutionId: props.institution.id
                };
                await apiService.saveModuleRecord('fee_structures', payload);
            }));

            // Delete any existing structures that were set to 0 or left out
            const keptVoteIds = new Set(activeVotes.map(([id]) => id));
            const deletedStructures = existingList.filter(e => e.voteHeadId && !keptVoteIds.has(e.voteHeadId));
            await Promise.all(deletedStructures.map(d => apiService.deleteModuleRecord('fee_structures', d.id)));

            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            alert("Fee structure cohort configuration saved successfully!");
        } catch (err) {
            console.error("Failed to save fee structures:", err);
            alert("Failed to save fee structures.");
        }
    };

    // Create DS Invoice Handler
    const handleCreateDsInvoice = async () => {
        if (!dsFormStudentId || !dsFormClass || dsFormItems.length === 0) {
            alert("Please select student, course/class, and add items.");
            return;
        }
        try {
            const student = props.students.find(s => s.id === dsFormStudentId);
            const studentName = student ? student.name : 'Unknown Student';
            const invoiceNumber = `DS-INV-${Date.now().toString().slice(-6)}`;
            
            const newInvoice = {
                id: `ds_inv_${Date.now()}`,
                institutionId: props.institution.id,
                studentId: dsFormStudentId,
                studentName: studentName,
                className: dsFormClass,
                items: dsFormItems.map(it => ({
                    name: it.name,
                    amount: Number(it.amount) || 0,
                    priority: Number(it.priority) || 10,
                    paidAmount: 0
                })),
                totalAmount: dsFormItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0),
                paidAmount: 0,
                balance: dsFormItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0),
                status: 'Pending',
                invoiceNumber: invoiceNumber,
                dueDate: dsFormDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: dsFormNotes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ds_invoices', newInvoice);

            // Reload Local DS state
            const instId = props.institution.id;
            const updated = await apiService.fetchModuleRecords<any>('ds_invoices', instId).catch(() => []);
            setDsInvoices(updated);

            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            
            // Clean state
            setDsFormStudentId('');
            setDsFormClass('');
            setDsFormItems([]);
            setDsFormNotes('');
            setIsCreatingDsInvoice(false);
            alert(`DS Invoice ${invoiceNumber} generated!`);
        } catch (e) {
            console.error("Failed to create DS Invoice:", e);
            alert("Failed to save DS Invoice.");
        }
    };

    // Record DS Payment (Priority-Based Settlement)
    const handleRecordDsPayment = async () => {
        if (!selectedDsInvoice || dsPayAmount <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }
        try {
            const amountPaid = Number(dsPayAmount);
            const recNumber = `RCPT-${Date.now().toString().slice(-6)}`;
            
            // Priority-based distribution Strategy
            let remainingAmount = amountPaid;
            const distributions: string[] = [];
            const sortedItems = [...(selectedDsInvoice.items || [])].sort((a, b) => (a.priority || 99) - (b.priority || 99));
            
            const updatedItems = sortedItems.map((item: any) => {
                const itemBalance = item.amount - (item.paidAmount || 0);
                if (remainingAmount <= 0) return item;
                
                const distribution = Math.min(remainingAmount, itemBalance);
                if (distribution > 0) {
                    distributions.push(`${item.name || item.voteName}: ${distribution?.toLocaleString()}`);
                }
                remainingAmount -= distribution;
                
                return {
                    ...item,
                    paidAmount: (item.paidAmount || 0) + distribution
                };
            });

            const newPaidAmount = (selectedDsInvoice.paidAmount || 0) + amountPaid;
            const newBalance = Math.max(0, selectedDsInvoice.totalAmount - newPaidAmount);
            const newStatus = newBalance <= 0 ? 'Fully Paid' : 'Partially Paid';

            const updatedInvoicePayload = {
                ...selectedDsInvoice,
                items: updatedItems,
                paidAmount: newPaidAmount,
                balance: newBalance,
                status: newStatus,
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ds_invoices', updatedInvoicePayload);

            const pay = {
                id: `pay_${Date.now()}`,
                institutionId: props.institution.id,
                invoiceId: selectedDsInvoice.id,
                studentId: selectedDsInvoice.studentId,
                studentName: selectedDsInvoice.studentName,
                amount: amountPaid,
                paymentMethod: dsPayMethod,
                transactionReference: dsPayReference || '',
                paymentDate: new Date().toISOString().split('T')[0],
                receiptNumber: recNumber,
                status: 'Verified',
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ds_payments', pay);
            
            // Reload local DS Invoices/Payments state
            const instId = props.institution.id;
            const updatedInvoices = await apiService.fetchModuleRecords<any>('ds_invoices', instId).catch(() => []);
            const updatedPayments = await apiService.fetchModuleRecords<any>('ds_payments', instId).catch(() => []);
            
            setDsInvoices(updatedInvoices);
            setDsPayments(updatedPayments);
            setSelectedDsInvoice(updatedInvoices.find((i: any) => i.id === selectedDsInvoice.id) || null);
            
            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            setIsRecordingDsPayment(false);
            setDsPayAmount(0);
            setDsPayReference('');
            alert(`DS Payment recorded successfully!\nDistributed settlements: ${distributions.join(', ')}`);
        } catch (err) {
            console.error("Failed to record DS payment:", err);
            alert("Database rejection recording DS payment.");
        }
    };

    // Auto-load invoice items from DS fee structure template
    const handleDsClassTemplateSelect = (className: string) => {
        setDsFormClass(className);
        const template = dsFeeStructures.find(fs => fs.className === className);
        if (template && Array.isArray(template.items) && template.items.length > 0) {
            setDsFormItems(template.items.map((it: any) => ({
                name: it.name || it.voteName || 'Item',
                amount: it.amount || 0,
                priority: it.priority || 10
            })));
        } else {
            // Check settings votes presets as fallbacks
            if (dsSettings && dsSettings.votes) {
                setDsFormItems((dsSettings.votes || []).map((v: any, idx: number) => ({
                    name: v.voteName || v.vote_name || '',
                    amount: v.defaultAmount ?? v.default_amount ?? 0,
                    priority: idx + 1
                })));
            } else {
                setDsFormItems([{ name: 'Tuition Fee', amount: 15000, priority: 1 }]);
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* Professional Navigation Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
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
                <div className="hidden md:flex items-center gap-4 px-6 border-l border-slate-100">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiscal Status</p>
                        <p className="text-sm font-black text-slate-900">{isDrivingSchool ? "Driving School Mode" : "Education Mode"}</p>
                    </div>
                </div>
            </div>

            {/* Dynamic View Engine */}
            <div className="min-h-[600px]">
                {activeTab === 'overview' && (
                    <RevenueWarRoom 
                        invoices={mappedInvoices}
                        receipts={mappedReceipts}
                        expenses={props.expenses}
                        goals={props.goals}
                        students={props.students}
                        institution={props.institution}
                        receiptLimit={props.receiptLimit}
                        setReceiptLimit={props.setReceiptLimit}
                        transactionLimit={props.transactionLimit}
                        setTransactionLimit={props.setTransactionLimit}
                        transactions={props.transactions || []}
                    />
                )}

                {activeTab === 'billing' && !isDrivingSchool && (
                    <AutomatedBilling 
                        feeStructures={props.feeStructures}
                        students={props.students}
                        academicYears={props.academicYears}
                        semesters={props.semesters}
                        institution={props.institution}
                        onGenerateInvoices={props.onGenerateInvoices}
                        companyDetails={props.companyDetails}
                    />
                )}

                {activeTab === 'billing' && isDrivingSchool && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* DS Invoice creation modal/drawer */}
                        {isCreatingDsInvoice ? (
                            <div className="lg:col-span-3 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                                <div className="flex justify-between items-center pb-4 border-b">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Create Driving School Invoice</h3>
                                    <button onClick={() => setIsCreatingDsInvoice(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><XIcon className="w-5 h-5" /></button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Select Student</label>
                                        <select 
                                            value={dsFormStudentId} 
                                            onChange={e => setDsFormStudentId(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Choose Registered Student</option>
                                            {props.students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phoneNumber})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Select Class / Course Category</label>
                                        <select 
                                            value={dsFormClass} 
                                            onChange={e => handleDsClassTemplateSelect(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Select Category Template</option>
                                            {dsFeeStructures.map(f => <option key={f.id} value={f.className}>{f.className}</option>)}
                                            <option value="General Class">General Class (Manual Presets)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Due Date</label>
                                        <input 
                                            type="date" 
                                            value={dsFormDueDate} 
                                            onChange={e => setDsFormDueDate(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic items list for DS Invoice */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itemized Voteheads & Amounts</h5>
                                        <button 
                                            type="button" 
                                            onClick={() => setDsFormItems(prev => [...prev, { name: '', amount: 0, priority: prev.length + 1 }])}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {dsFormItems.map((item, idx) => (
                                            <div key={idx} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border">
                                                <input 
                                                    type="text" 
                                                    value={item.name} 
                                                    placeholder="e.g. Tuition Fee" 
                                                    onChange={e => {
                                                        const copy = [...dsFormItems];
                                                        copy[idx].name = e.target.value;
                                                        setDsFormItems(copy);
                                                    }}
                                                    className="flex-[3] px-4 py-2 bg-white rounded-xl outline-none border font-bold text-sm"
                                                />
                                                <input 
                                                    type="number" 
                                                    value={item.amount} 
                                                    placeholder="Amount" 
                                                    onChange={e => {
                                                        const copy = [...dsFormItems];
                                                        copy[idx].amount = Number(e.target.value);
                                                        setDsFormItems(copy);
                                                    }}
                                                    className="flex-[2] px-4 py-2 bg-white rounded-xl outline-none border font-bold text-sm"
                                                />
                                                <input 
                                                    type="number" 
                                                    value={item.priority} 
                                                    placeholder="Priority" 
                                                    onChange={e => {
                                                        const copy = [...dsFormItems];
                                                        copy[idx].priority = Number(e.target.value);
                                                        setDsFormItems(copy);
                                                    }}
                                                    className="flex-[1] px-4 py-2 bg-white rounded-xl outline-none border font-bold text-sm"
                                                    title="Priority weight (lowest priority gets paid first)"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setDsFormItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right font-black text-slate-800 text-lg">
                                        Total Amount: KES {dsFormItems.reduce((s, it) => s + (it.amount || 0), 0)?.toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Invoice Remarks / Notes</label>
                                    <textarea 
                                        rows={3} 
                                        value={dsFormNotes}
                                        onChange={e => setDsFormNotes(e.target.value)}
                                        placeholder="Add payment installments instructions or terms..." 
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm resize-none"
                                    />
                                </div>

                                <div className="flex gap-4 justify-end pt-4">
                                    <button onClick={() => setIsCreatingDsInvoice(false)} className="px-6 py-3 bg-slate-100 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
                                    <button onClick={handleCreateDsInvoice} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-wider hover:bg-indigo-700 shadow-md">Generate Invoice</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Left column: Invoices list */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Driving School Invoices</h3>
                                                <p className="text-xs font-bold text-slate-400">Total configured ledgers: {dsInvoices.length}</p>
                                            </div>
                                            <button 
                                                onClick={() => setIsCreatingDsInvoice(true)}
                                                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 shadow-md transition-all"
                                            >
                                                + New Invoice
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Invoice #</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Course / Class</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Total</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Balance</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {dsInvoices.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="py-8 text-center text-xs font-medium text-slate-400">No driving school invoices found.</td>
                                                        </tr>
                                                    ) : (
                                                        dsInvoices.map((inv) => (
                                                            <tr 
                                                                key={inv.id} 
                                                                onClick={() => setSelectedDsInvoice(inv)}
                                                                className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${selectedDsInvoice?.id === inv.id ? 'bg-indigo-50/40 font-bold' : ''}`}
                                                            >
                                                                <td className="py-4 text-xs font-black text-indigo-600">{inv.invoiceNumber || inv.invoice_number || inv.id}</td>
                                                                <td className="py-4 text-xs">{inv.studentName || 'Student'}</td>
                                                                <td className="py-4 text-xs text-slate-500">{inv.className}</td>
                                                                <td className="py-4 text-xs text-right">KES {inv.totalAmount?.toLocaleString()}</td>
                                                                <td className="py-4 text-xs text-right font-bold text-slate-900">KES {inv.balance?.toLocaleString()}</td>
                                                                <td className="py-4 text-xs">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                        inv.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                                        inv.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                                    }`}>
                                                                        {inv.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right column: Details panel / Payment execution */}
                                <div className="lg:col-span-1 space-y-6">
                                    {selectedDsInvoice ? (
                                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-right duration-300">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Invoice Details</p>
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight">{selectedDsInvoice.invoiceNumber}</h4>
                                                <p className="text-xs font-medium text-slate-400">{selectedDsInvoice.studentName}</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Class / Category</span>
                                                    <span className="font-bold">{selectedDsInvoice.className}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Total Billed</span>
                                                    <span className="font-bold">KES {selectedDsInvoice.totalAmount?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Total Paid</span>
                                                    <span className="font-bold text-emerald-600">KES {selectedDsInvoice.paidAmount?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Outstanding Balance</span>
                                                    <span className="font-black text-rose-600">KES {selectedDsInvoice.balance?.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Itemized list of votes & payment distribution */}
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itemized Vote Settlement</p>
                                                <div className="space-y-2">
                                                    {(selectedDsInvoice.items || []).map((it: any, idx: number) => {
                                                        const bal = it.amount - (it.paidAmount || 0);
                                                        const pRate = it.amount > 0 ? ((it.paidAmount || 0) / it.amount) * 100 : 0;
                                                        return (
                                                            <div key={idx} className="bg-slate-50 p-3 rounded-xl space-y-1">
                                                                <div className="flex justify-between text-xs font-bold">
                                                                    <span className="text-slate-700">{it.name} <span className="text-[9px] text-slate-400 font-normal">(Priority {it.priority || 10})</span></span>
                                                                    <span>KES {it.paidAmount || 0} / {it.amount}</span>
                                                                </div>
                                                                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-indigo-600" style={{ width: `${pRate}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Record Payment Form */}
                                            {isRecordingDsPayment ? (
                                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Record Payment</h5>
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Amount Paid (KES)</label>
                                                            <input 
                                                                type="number" 
                                                                value={dsPayAmount} 
                                                                onChange={e => setDsPayAmount(Number(e.target.value))}
                                                                className="w-full px-4 py-2 rounded-xl border outline-none font-bold text-sm bg-white"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Payment Method</label>
                                                            <select 
                                                                value={dsPayMethod} 
                                                                onChange={e => setDsPayMethod(e.target.value)}
                                                                className="w-full px-4 py-2 rounded-xl border outline-none font-bold text-xs bg-white"
                                                            >
                                                                <option>M-Pesa</option>
                                                                <option>Cash</option>
                                                                <option>Bank Transfer</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Transaction Ref / Receipt #</label>
                                                            <input 
                                                                type="text" 
                                                                value={dsPayReference} 
                                                                placeholder="e.g. QWE123RTY"
                                                                onChange={e => setDsPayReference(e.target.value)}
                                                                className="w-full px-4 py-2 rounded-xl border outline-none font-bold text-xs bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 pt-2">
                                                            <button onClick={() => setIsRecordingDsPayment(false)} className="flex-1 py-2 bg-white border rounded-xl text-xs font-bold hover:bg-slate-100">Cancel</button>
                                                            <button onClick={handleRecordDsPayment} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700">Submit</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                selectedDsInvoice.balance > 0 && (
                                                    <button 
                                                        onClick={() => { setIsRecordingDsPayment(true); setDsPayAmount(selectedDsInvoice.balance); }}
                                                        className="w-full py-4 bg-slate-900 text-white hover:bg-indigo-600 transition-colors rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md"
                                                    >
                                                        Record Payment Receive
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 p-8 rounded-[3rem] border border-dashed border-slate-200 text-center text-xs font-medium text-slate-400 py-16">
                                            Select an invoice from the ledger list to manage receipts or view priority allocations.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* New Fee Configuration Tab for Education Institutions */}
                {activeTab === 'config' && !isDrivingSchool && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Configuration sub-tabs bar */}
                        <div className="flex border-b border-slate-200 pb-2">
                            <button
                                onClick={() => setConfigSubTab('voteheads')}
                                className={`px-6 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                                    configSubTab === 'voteheads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                                }`}
                            >
                                Vote Heads & Priorities
                            </button>
                            <button
                                onClick={() => setConfigSubTab('builder')}
                                className={`px-6 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                                    configSubTab === 'builder' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                                }`}
                            >
                                Fee Structure Builder
                            </button>
                        </div>

                        {configSubTab === 'voteheads' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Voteheads left panel: creation */}
                                <div className="lg:col-span-1">
                                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                            {editingVoteheadId ? 'Edit Vote Head' : 'Add Vote Head'}
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vote Head Label</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. Tuition Fee" 
                                                    value={editingVoteheadId ? editVoteName : newVoteName}
                                                    onChange={e => editingVoteheadId ? setEditVoteName(e.target.value) : setNewVoteName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Priority Ranking</label>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="100"
                                                    placeholder="e.g. 1" 
                                                    value={editingVoteheadId ? editVotePriority : newVotePriority}
                                                    onChange={e => editingVoteheadId ? setEditVotePriority(Number(e.target.value)) : setNewVotePriority(Number(e.target.value))}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                                />
                                                <p className="text-[9px] font-medium text-slate-400 leading-tight">Priority ranking determines order of fee payment allocation (lower number = paid first).</p>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Allocated Budget (Optional)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="0.00" 
                                                    value={editingVoteheadId ? editVoteAllocatedAmount : newVoteAllocatedAmount}
                                                    onChange={e => editingVoteheadId ? setEditVoteAllocatedAmount(Number(e.target.value)) : setNewVoteAllocatedAmount(Number(e.target.value))}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                                />
                                            </div>

                                            {editingVoteheadId ? (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setEditingVoteheadId(null)}
                                                        className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveVoteHead({ id: editingVoteheadId, name: editVoteName, priority: editVotePriority, allocatedAmount: editVoteAllocatedAmount })}
                                                        className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                                    >
                                                        Save Changes
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleSaveVoteHead({ name: newVoteName, priority: newVotePriority, allocatedAmount: newVoteAllocatedAmount })}
                                                    className="w-full py-4 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md"
                                                >
                                                    Register Vote Head
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Voteheads right panel: grid/table */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Active Institutional Vote Heads</h3>
                                        
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Vote Head Name</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Priority</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Budget</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(props.voteHeads || []).length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-xs text-slate-400">No Vote Heads configured yet. Setup presets using the form.</td>
                                                        </tr>
                                                    ) : (
                                                        [...(props.voteHeads || [])].sort((a,b) => (a.priority || 99) - (b.priority || 99)).map(vh => (
                                                            <tr key={vh.id} className="hover:bg-slate-50/50">
                                                                <td className="py-4 text-xs font-bold text-slate-800">{vh.name}</td>
                                                                <td className="py-4 text-xs text-center">
                                                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-black text-[10px]">
                                                                        #{vh.priority}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-xs text-right text-slate-500">KES {vh.allocatedAmount?.toLocaleString()}</td>
                                                                <td className="py-4 text-xs text-right">
                                                                    <div className="inline-flex gap-2">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setEditingVoteheadId(vh.id);
                                                                                setEditVoteName(vh.name);
                                                                                setEditVotePriority(vh.priority || 10);
                                                                                setEditVoteAllocatedAmount(vh.allocatedAmount || 0);
                                                                            }}
                                                                            className="p-1.5 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-md"
                                                                            title="Edit"
                                                                        >
                                                                            <PencilIcon className="w-4 h-4" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDeleteVoteHead(vh.id)}
                                                                            className="p-1.5 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-md"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2Icon className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
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

                        {configSubTab === 'builder' && (
                            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cohort Fee Structure Builder</h3>
                                    <p className="text-xs font-medium text-slate-400">Map specific courses, academic years, and terms/semesters to itemized votehead amounts to structure institutional billing structures.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Cohort Course</label>
                                        <select 
                                            value={builderCourseId}
                                            onChange={e => setBuilderCourseId(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Choose Course</option>
                                            {(props.courses || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Academic Year</label>
                                        <select 
                                            value={builderAYId}
                                            onChange={e => setBuilderAYId(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Select Academic Year</option>
                                            {(props.academicYears || []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Term / Semester</label>
                                        <select 
                                            value={builderTerm}
                                            onChange={e => setBuilderTerm(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Select Semester</option>
                                            {(props.semesters || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Grid of configured voteheads for amount assignment */}
                                {builderCourseId && builderAYId && builderTerm && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pb-2 border-b">Configure amounts for this cohort</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(props.voteHeads || []).length === 0 ? (
                                                <p className="col-span-2 text-center text-xs text-slate-400 p-4">No configured voteheads found. Setup voteheads in the first tab to assign values.</p>
                                            ) : (
                                                (props.voteHeads || []).map(vh => (
                                                    <div key={vh.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-slate-800">{vh.name}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Rank #{vh.priority}</p>
                                                        </div>
                                                        <div className="w-1/3">
                                                            <input 
                                                                type="number" 
                                                                placeholder="KES 0.00"
                                                                value={builderAmounts[vh.id] || ''}
                                                                onChange={e => setBuilderAmounts(prev => ({ ...prev, [vh.id]: Number(e.target.value) }))}
                                                                className="w-full px-3 py-2 border rounded-xl outline-none font-bold text-right text-sm bg-white focus:ring-2 focus:ring-indigo-600"
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="pt-6 border-t flex justify-between items-center">
                                            <div className="text-slate-500 font-medium text-sm">
                                                Total Structure Amount: <span className="font-black text-slate-900 text-lg">KES {Object.values(builderAmounts).reduce((sum, a) => sum + (a || 0), 0)?.toLocaleString()}</span>
                                            </div>
                                            <button 
                                                onClick={handleSaveFeeStructure}
                                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
                                            >
                                                Save Structure Cohort
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Record Expense</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none">
                                            <option>Salaries</option>
                                            <option>Utilities</option>
                                            <option>Maintenance</option>
                                            <option>Supplies</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount (KES)</label>
                                        <input type="number" placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Description</label>
                                        <textarea placeholder="Purpose of expenditure..." rows={3} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none resize-none" />
                                    </div>
                                    <button onClick={() => alert("Expense recorded in session.")} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">Submit Record</button>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm min-h-full">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Expenditure Log</h3>
                                <div className="space-y-4">
                                    {(props.expenses || []).map((exp, i) => (
                                        <div key={i} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    <BanknotesIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{exp.description}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exp.category} • {exp.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-rose-600">-KES {(exp.amount ?? 0)?.toLocaleString()}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'requisitions' && (
                    <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
                        <RetailRequisitions
                            institutionId={props.institution.id}
                            currentUser={props.currentUser}
                            retailStores={retailStores}
                            requisitions={props.requisitions || []}
                            inventory={inventory}
                            onAddRequisition={async () => {}}
                            onUpdateRequisition={props.onUpdateRequisition}
                            isEducation={isEduInstitution(props.institution)}
                            allUsers={allUsers}
                        />
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm text-center space-y-8">
                        <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto">
                            <CheckBadgeIcon className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Financial Audit Trail</h3>
                            <p className="text-slate-400 font-medium max-w-md mx-auto">Comprehensive fiscal transparency system. All transactions, deletions, and adjustments are logged for institutional integrity.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                            <button className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-600 transition-all group text-left">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Reconciliation</p>
                                <p className="text-sm font-black text-slate-900 group-hover:translate-x-2 transition-transform">Run Bank Statement Sync →</p>
                            </button>
                            <button className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-600 transition-all group text-left">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Reports</p>
                                <p className="text-sm font-black text-slate-900 group-hover:translate-x-2 transition-transform">Generate Tax Summary →</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
