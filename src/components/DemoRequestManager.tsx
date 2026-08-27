import React, { useState, useEffect } from 'react';
import { DemoRequest, Invoice, InvoiceItem, Institution } from '../types';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { CalendarDaysIcon as CalendarIcon } from './icons/CalendarDaysIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserIcon } from './icons/UserIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { FunnelIcon } from './icons/FunnelIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';

import { downloadQuotePdf, generateQuotePdfDataUri } from '../services/pdfService';
import { sendEmailNotification } from '../services/emailService';
import { apiService } from '../services/apiService';

interface DemoRequestManagerProps {
    requests: DemoRequest[];
    onUpdateStatus: (id: string, status: DemoRequest['status']) => Promise<void>;
    companyDetails?: any;
}

const MODULE_ITEMS: Record<string, { description: string; price: number }> = {
    academic: { description: 'EduAlloc AI Core Academic Management System - 1 Year Subscription', price: 120000 },
    driving: { description: 'Driving School Management Module - 1 Year License', price: 50000 },
    coop: { description: 'Cooperative / Dairy Management Module - 1 Year License', price: 80000 },
    sacco: { description: 'Sacco Savings & Credit Module - 1 Year License', price: 90000 },
    church: { description: 'Church Information System - 1 Year Subscription', price: 60000 },
    law: { description: 'Law Firm Practice Management Module - 1 Year License', price: 110000 },
    hospitality: { description: 'Hospitality / Event Management Module - 1 Year License', price: 70000 }
};

export const DemoRequestManager: React.FC<DemoRequestManagerProps> = ({ requests, onUpdateStatus, companyDetails }) => {
    const [localRequests, setLocalRequests] = useState<DemoRequest[]>(requests);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<DemoRequest['status'] | 'all'>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [notesMap, setNotesMap] = useState<Record<string, string>>({});
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

    // Quote Modal states
    const [selectedRequestForQuote, setSelectedRequestForQuote] = useState<DemoRequest | null>(null);
    const [quoteItems, setQuoteItems] = useState<InvoiceItem[]>([]);
    const [quoteNumber, setQuoteNumber] = useState('');
    const [quoteIssueDate, setQuoteIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [quoteDueDate, setQuoteDueDate] = useState<string>(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
        academic: true,
        driving: false,
        coop: false,
        sacco: false,
        church: false,
        law: false,
        hospitality: false
    });
    const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

    // Payment Modal states
    const [selectedRequestForPayment, setSelectedRequestForPayment] = useState<DemoRequest | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cash' | 'bank_transfer' | 'cheque'>('mpesa');
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentRemarks, setPaymentRemarks] = useState('');
    const [isPostingPayment, setIsPostingPayment] = useState(false);

    useEffect(() => {
        setLocalRequests(requests);
        const map: Record<string, string> = {};
        requests.forEach(r => {
            if (r.notes) map[r.id] = r.notes;
        });
        setNotesMap(map);
    }, [requests]);

    const handleSaveNotes = async (id: string) => {
        try {
            setSavingNoteId(id);
            const noteText = notesMap[id] || '';
            await apiService.saveModuleRecord('demo_requests', { id, notes: noteText });
            setLocalRequests(prev => prev.map(r => r.id === id ? { ...r, notes: noteText } : r));
        } catch (e) {
            console.error('Failed to save follow-up notes:', e);
        } finally {
            setSavingNoteId(null);
        }
    };

    // Initialize Quote items when quote request modal opens
    useEffect(() => {
        if (selectedRequestForQuote) {
            setQuoteNumber(`QT-${Date.now().toString().slice(-6)}`);
            // Prefill with academic module
            const items: InvoiceItem[] = [
                {
                    description: MODULE_ITEMS.academic.description,
                    quantity: 1,
                    unitPrice: MODULE_ITEMS.academic.price,
                    amount: MODULE_ITEMS.academic.price
                }
            ];
            setQuoteItems(items);
            setSelectedModules({
                academic: true,
                driving: false,
                coop: false,
                sacco: false,
                church: false,
                law: false,
                hospitality: false
            });
        }
    }, [selectedRequestForQuote]);

    // Initialize Payment values when modal opens
    useEffect(() => {
        if (selectedRequestForPayment) {
            const quoteAmt = selectedRequestForPayment.quoteAmount || 0;
            const paidAmt = (selectedRequestForPayment.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
            setPaymentAmount(Math.max(0, quoteAmt - paidAmt));
            setPaymentMethod('mpesa');
            setPaymentRef('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setPaymentRemarks('');
        }
    }, [selectedRequestForPayment]);

    const handleOpenQuoteModal = (request: DemoRequest) => {
        setSelectedRequestForQuote(request);
        if (request.quoteItems && request.quoteItems.length > 0) {
            setQuoteItems(request.quoteItems);
        } else {
            setQuoteItems([
                { description: 'Core Platform Setup & Module License', quantity: 1, unitPrice: 25000, amount: 25000 },
                { description: 'Staff Training & Onboarding (Virtual/On-site)', quantity: 1, unitPrice: 10000, amount: 10000 }
            ]);
        }
        if ((request as any).quoteNumber) {
            setQuoteNumber((request as any).quoteNumber);
        } else {
            setQuoteNumber(`QT-${Date.now().toString().slice(-6)}`);
        }
        const rawIssue = (request as any).quoteIssueDate || (request as any).issueDate || new Date().toISOString().split('T')[0];
        setQuoteIssueDate(rawIssue.split('T')[0]);
        const rawDue = (request as any).quoteDueDate || (request as any).dueDate;
        if (rawDue) {
            setQuoteDueDate(rawDue.split('T')[0]);
        } else {
            const d = new Date(rawIssue);
            d.setDate(d.getDate() + 30);
            setQuoteDueDate(d.toISOString().split('T')[0]);
        }
    };

    const handleModuleToggle = (moduleKey: string) => {
        const nextSelected = { ...selectedModules, [moduleKey]: !selectedModules[moduleKey] };
        setSelectedModules(nextSelected);

        const items: InvoiceItem[] = [];
        Object.entries(nextSelected).forEach(([key, isChecked]) => {
            if (isChecked && MODULE_ITEMS[key]) {
                items.push({
                    description: MODULE_ITEMS[key].description,
                    quantity: 1,
                    unitPrice: MODULE_ITEMS[key].price,
                    amount: MODULE_ITEMS[key].price
                });
            }
        });

        // Add back custom items not mapping standard modules
        const customItems = quoteItems.filter(item => 
            !Object.values(MODULE_ITEMS).some(m => m.description === item.description)
        );
        setQuoteItems([...items, ...customItems]);
    };

    const handleAddCustomItem = () => {
        setQuoteItems(prev => [
            ...prev,
            { description: 'Custom Integration & Onboarding support', quantity: 1, unitPrice: 10000, amount: 10000 }
        ]);
    };

    const handleRemoveQuoteItem = (index: number) => {
        setQuoteItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleQuoteItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        setQuoteItems(prev => prev.map((item, idx) => {
            if (idx === index) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    updated.amount = (updated.quantity || 0) * (updated.unitPrice || 0);
                }
                return updated;
            }
            return item;
        }));
    };

    const filteredRequests = localRequests.filter(req => {
        const matchesSearch = 
            req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.institution.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    const handleStatusUpdate = async (id: string, newStatus: DemoRequest['status']) => {
        setUpdatingId(id);
        try {
            await onUpdateStatus(id, newStatus);
            setLocalRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleRowExpand = (id: string) => {
        setExpandedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const getStatusColor = (status: DemoRequest['status']) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'contacted': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'quote_sent': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const buildMockInvoiceAndInstitution = (request: DemoRequest) => {
        const subtotal = quoteItems.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = Math.round((subtotal * taxRate) / 100);
        const total = subtotal + taxAmount;

        const mockQuote: Invoice = {
            id: `q_${Date.now()}`,
            invoiceNumber: quoteNumber,
            institutionId: 'platform_onboarding',
            issueDate: quoteIssueDate || new Date().toISOString().split('T')[0],
            issue_date: quoteIssueDate || new Date().toISOString().split('T')[0],
            dueDate: quoteDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            due_date: quoteDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: quoteItems,
            subtotal: subtotal,
            taxRate: taxRate,
            taxAmount: taxAmount,
            totalAmount: total,
            status: 'quote'
        };

        const mockInstitution: Institution = {
            id: 'platform_onboarding',
            name: request.institution,
            email: request.email,
            phoneNumber: request.phone,
            institutionType: 'Education',
            status: 'trial'
        };

        const effectiveCompanyDetails = companyDetails || {
            name: "EduAlloc AI",
            email: "billing@edualloc.ai",
            phone: "+254 700 000000",
            website: "www.edualloc.ai",
            address: "Nairobi, Kenya",
            logoUrl: null,
            letterheadConfig: { headerImageUrl: null, stampImageUrl: null }
        };

        return { mockQuote, mockInstitution, effectiveCompanyDetails };
    };

    const handleDownloadQuotePreview = async (request: DemoRequest) => {
        try {
            const { mockQuote, mockInstitution, effectiveCompanyDetails } = buildMockInvoiceAndInstitution(request);
            await downloadQuotePdf(mockQuote, mockInstitution, effectiveCompanyDetails, effectiveCompanyDetails.logoUrl || null, true);
        } catch (e: any) {
            alert("Error downloading preview: " + e.message);
        }
    };

    const handleSendQuoteToClient = async (request: DemoRequest) => {
        setIsGeneratingQuote(true);
        try {
            const { mockQuote, mockInstitution, effectiveCompanyDetails } = buildMockInvoiceAndInstitution(request);
            
            // 1. Generate PDF data URI
            const dataUri = await generateQuotePdfDataUri(mockQuote, mockInstitution, effectiveCompanyDetails, effectiveCompanyDetails.logoUrl || null, true);

            // 2. Convert to file object
            const base64Marker = 'base64,';
            const base64Index = dataUri.indexOf(base64Marker) + base64Marker.length;
            const base64 = dataUri.substring(base64Index);
            
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const fileObj = new File([blob], `Quotation_${(request.institution || 'Client').replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

            // 3. Upload to storage
            let quoteUrl = '';
            try {
                const uploadRes = await apiService.uploadToGoogleDrive(fileObj, 'System_Quotations');
                if (uploadRes?.success && uploadRes.url) {
                    quoteUrl = uploadRes.url;
                }
            } catch (err) {
                console.warn("Storage upload failed, sending direct attachment only", err);
            }

            // 4. Send Email attachment
            const attachments = [{
                filename: `Quotation-${quoteNumber}.pdf`,
                content: base64,
                encoding: 'base64',
                contentType: 'application/pdf'
            }];

            const emailSubject = `Official Quotation ${quoteNumber} - ${effectiveCompanyDetails.name}`;
            const emailBody = `Dear ${request.name},\n\nThank you for requesting a demonstration of our platform. We have generated an official quote for the modules and services requested by ${request.institution}.\n\nPlease find the detailed quotation PDF attached to this email.\n\nTotal Estimated Cost: KES ${mockQuote.totalAmount.toLocaleString()}\n\nShould you have any questions, feel free to reply directly to this email.\n\nBest regards,\nThe ${effectiveCompanyDetails.name} Team`;

            const emailRes = await sendEmailNotification(
                request.email,
                emailSubject,
                emailBody,
                effectiveCompanyDetails.emailConfig,
                effectiveCompanyDetails.name,
                attachments
            );

            if (!emailRes.success) {
                throw new Error("Email dispatch failed: " + emailRes.message);
            }

            // 5. Update DemoRequest in Database
            const quoteAmt = mockQuote.totalAmount;
            const status = 'quote_sent' as const;
            
            await apiService.saveModuleRecord('demo_requests', {
                id: request.id,
                status,
                quoteAmount: quoteAmt,
                quoteItems,
                quoteUrl: quoteUrl || undefined
            });

            // Update UI State
            setLocalRequests(prev => prev.map(r => r.id === request.id ? {
                ...r,
                status,
                quoteAmount: quoteAmt,
                quoteItems,
                quoteUrl: quoteUrl || undefined
            } : r));

            // Call parent updates
            await onUpdateStatus(request.id, status);

            alert("Quotation generated, cloud backed up, and emailed successfully!");
            setSelectedRequestForQuote(null);
        } catch (e: any) {
            alert("Quotation dispatch failed: " + e.message);
        } finally {
            setIsGeneratingQuote(false);
        }
    };

    const handlePostPayment = async (request: DemoRequest) => {
        if (!paymentAmount || paymentAmount <= 0) {
            alert("Please enter a valid positive payment amount.");
            return;
        }

        setIsPostingPayment(true);
        try {
            const newPayment = {
                amount: paymentAmount,
                paymentMethod,
                reference: paymentRef,
                paymentDate,
                remarks: paymentRemarks,
                postedAt: new Date().toISOString()
            };

            const existingPayments = request.payments || [];
            const updatedPayments = [...existingPayments, newPayment];
            const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
            const quoteAmt = request.quoteAmount || 0;

            const nextStatus = totalPaid >= quoteAmt ? 'completed' as const : request.status;

            await apiService.saveModuleRecord('demo_requests', {
                id: request.id,
                status: nextStatus,
                payments: updatedPayments
            });

            setLocalRequests(prev => prev.map(r => r.id === request.id ? {
                ...r,
                status: nextStatus,
                payments: updatedPayments
            } : r));

            await onUpdateStatus(request.id, nextStatus);

            alert("Payment successfully recorded!");
            setSelectedRequestForPayment(null);
        } catch (e: any) {
            alert("Failed to post payment: " + e.message);
        } finally {
            setIsPostingPayment(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="w-7 h-7 text-indigo-500" />
                        Demo Requests & Leads
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage prospective institutional clients, quotation dispatches, and setups.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-semibold">
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        Export Leads
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search name, email, institution..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <FunnelIcon className="w-5 h-5 text-gray-400" />
                    <select 
                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New Requests</option>
                        <option value="contacted">Contacted</option>
                        <option value="quote_sent">Quote Sent</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
                    <span className="font-medium text-gray-900 dark:text-white">{filteredRequests.length}</span> results found
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="w-10"></th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prospect</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Institution</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested At</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredRequests.map((req) => (
                                <React.Fragment key={req.id}>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group">
                                        <td className="pl-4 text-center">
                                            <button 
                                                onClick={() => toggleRowExpand(req.id)}
                                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {expandedIds.includes(req.id) ? (
                                                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
                                                    {req.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{req.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <EnvelopeIcon className="w-3 h-3" />
                                                        {req.email}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <PhoneIcon className="w-3 h-3" />
                                                        {req.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white font-medium">{req.institution}</div>
                                            <div className="text-xs text-gray-500 mt-1 line-clamp-1 italic">
                                                "{req.message || 'No additional details provided'}"
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                                {new Date(req.requestedAt).toLocaleDateString(undefined, { 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)} capitalize`}>
                                                {req.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                {req.status === 'new' && (
                                                    <button 
                                                        onClick={() => handleStatusUpdate(req.id, 'contacted')}
                                                        disabled={updatingId === req.id}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                                                        title="Mark as Contacted"
                                                    >
                                                        {updatingId === req.id ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PhoneIcon className="w-5 h-5" />}
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => setSelectedRequestForQuote(req)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                                                    title="Send/Re-send Quote"
                                                >
                                                    <DocumentTextIcon className="w-5 h-5" />
                                                </button>

                                                {req.quoteAmount ? req.quoteAmount > ((req.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0)) && (
                                                    <button 
                                                        onClick={() => setSelectedRequestForPayment(req)}
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                                                        title="Post Payment"
                                                    >
                                                        <CreditCardIcon className="w-5 h-5" />
                                                    </button>
                                                ) : null}

                                                {req.status !== 'completed' && (
                                                    <button 
                                                        onClick={() => handleStatusUpdate(req.id, 'completed')}
                                                        disabled={updatingId === req.id}
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                                                        title="Mark as Completed"
                                                    >
                                                        {updatingId === req.id ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                     {/* Expandable row */}
                                     {expandedIds.includes(req.id) && (
                                         <tr className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                                             <td></td>
                                             <td colSpan={5} className="px-6 py-5 space-y-6">
                                                 {/* Top Action & Direct Communication Bar */}
                                                 <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                                     <div className="flex flex-wrap items-center gap-2">
                                                         <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Actions:</span>
                                                         {req.phone && req.phone !== 'Pending in chat' && (
                                                             <>
                                                                 <a
                                                                     href={`tel:${req.phone.replace(/[^0-9+]/g, '')}`}
                                                                     className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-800"
                                                                 >
                                                                     <PhoneIcon className="w-3.5 h-3.5" /> Call {req.phone}
                                                                 </a>
                                                                 <a
                                                                     href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(req.name)},%20thank%20you%20for%20inquiring%20about%20EduAI%20Cloud%20ERP%20solutions.%20How%20can%20we%20assist%20you%20today?`}
                                                                     target="_blank"
                                                                     rel="noopener noreferrer"
                                                                     className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                                                 >
                                                                     <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" /> WhatsApp Prospect
                                                                 </a>
                                                             </>
                                                         )}
                                                         {req.email && req.email !== 'visitor@eduai.showcase' && (
                                                             <a
                                                                 href={`mailto:${req.email}?subject=EduAI%20Platform%20Consultation%20Follow-up&body=Dear%20${encodeURIComponent(req.name)},%0A%0AThank%20you%20for%20your%20interest%20in%20EduAI.`}
                                                                 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-lg text-xs font-bold transition-all border border-sky-200 dark:border-sky-800"
                                                             >
                                                                 <EnvelopeIcon className="w-3.5 h-3.5" /> Email
                                                             </a>
                                                         )}
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                         <span className="text-[11px] font-semibold text-gray-400">Channel / Origin:</span>
                                                         <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                             {req.source || 'AI Showcase Solutions Advisor'}
                                                         </span>
                                                     </div>
                                                 </div>

                                                 {/* Main Two-Column Layout */}
                                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                     {/* Column 1: AI Chat Conversation Transcript */}
                                                     <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                                                         <div className="flex justify-between items-center mb-3">
                                                             <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                                 <SparklesIcon className="w-4 h-4 text-purple-500" />
                                                                 AI Conversation History & Chat Transcript
                                                             </h4>
                                                             <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                                                 Live Transcript
                                                             </span>
                                                         </div>

                                                         {/* Chat Bubbles Container */}
                                                         {(() => {
                                                             let transcriptList: Array<{ role: string; text: string; timestamp?: string }> = [];
                                                             if (Array.isArray(req.conversationTranscript)) {
                                                                 transcriptList = req.conversationTranscript;
                                                             } else if (typeof req.conversationTranscript === 'string' && req.conversationTranscript.trim()) {
                                                                 try {
                                                                     transcriptList = JSON.parse(req.conversationTranscript);
                                                                 } catch {
                                                                     transcriptList = [{ role: 'user', text: req.conversationTranscript }];
                                                                 }
                                                             }

                                                             if (transcriptList.length === 0 && req.message) {
                                                                 transcriptList = [{ role: 'user', text: req.message }];
                                                             }

                                                             return transcriptList.length > 0 ? (
                                                                 <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                                                     {transcriptList.map((item, tIdx) => {
                                                                         const isUser = item.role === 'user';
                                                                         return (
                                                                             <div key={tIdx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                                                                                 <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold px-1">
                                                                                     <span>{isUser ? `👤 ${req.name || 'Prospect'}` : '✨ AI Solutions Advisor'}</span>
                                                                                     {item.timestamp && (
                                                                                         <span>• {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                     )}
                                                                                 </div>
                                                                                 <div
                                                                                     className={`p-3 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                                                                                         isUser
                                                                                             ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                                                                                             : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-none shadow-xs font-normal'
                                                                                     }`}
                                                                                 >
                                                                                     {item.text.split('\n').map((line, lIdx) => (
                                                                                         <p key={lIdx} className={lIdx > 0 ? 'mt-1' : ''}>{line}</p>
                                                                                     ))}
                                                                                 </div>
                                                                             </div>
                                                                         );
                                                                     })}
                                                                 </div>
                                                             ) : (
                                                                 <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                                                     <p className="text-xs text-gray-400">No chat transcript available for this inquiry.</p>
                                                                 </div>
                                                             );
                                                         })()}

                                                         {/* Super Admin Internal Follow-up Notes */}
                                                         <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                             <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                                                                 <span>📝 Super Admin Follow-Up & Call Notes:</span>
                                                                 <span className="text-[10px] font-normal text-gray-400">Saved to CRM record</span>
                                                             </label>
                                                             <div className="flex gap-2">
                                                                 <textarea
                                                                     value={notesMap[req.id] || ''}
                                                                     onChange={e => setNotesMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                                     placeholder="Record follow-up details (e.g., Called John — confirmed demo for Thursday 10 AM, interested in CBC School + SACCO module)..."
                                                                     rows={2}
                                                                     className="flex-1 text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none"
                                                                 />
                                                                 <button
                                                                     onClick={() => handleSaveNotes(req.id)}
                                                                     disabled={savingNoteId === req.id}
                                                                     className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-sm self-end"
                                                                 >
                                                                     {savingNoteId === req.id ? 'Saving...' : 'Save Note'}
                                                                 </button>
                                                             </div>
                                                         </div>
                                                     </div>

                                                     {/* Column 2: Quotations & Payments */}
                                                     <div className="space-y-6">
                                                         {/* Quote Section */}
                                                         <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                             <div className="flex justify-between items-center mb-3">
                                                                 <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                                     <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                                                                     Quotation Details
                                                                 </h4>
                                                                 {req.quoteAmount ? (
                                                                     <button 
                                                                         onClick={() => handleOpenQuoteModal(req)}
                                                                         className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                                                         title="Edit Quotation"
                                                                     >
                                                                         <PencilIcon className="w-3.5 h-3.5" /> Edit Quotation
                                                                     </button>
                                                                 ) : null}
                                                             </div>
                                                             {req.quoteAmount ? (
                                                                 <div className="space-y-4">
                                                                     <div className="flex justify-between items-center text-sm bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                                                                         <span className="text-gray-500 dark:text-gray-400 font-semibold">Total Quotation Value:</span>
                                                                         <span className="font-extrabold text-indigo-700 dark:text-indigo-400 text-base">KES {req.quoteAmount.toLocaleString()}</span>
                                                                     </div>
                                                                     {req.quoteUrl && (
                                                                         <div className="flex justify-between items-center text-sm">
                                                                             <span className="text-gray-500 dark:text-gray-400 text-xs">Cloud Hosted Backup:</span>
                                                                             <a 
                                                                                 href={req.quoteUrl} 
                                                                                 target="_blank" 
                                                                                 rel="noopener noreferrer" 
                                                                                 className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold text-xs bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800"
                                                                             >
                                                                                 <DocumentArrowDownIcon className="w-3.5 h-3.5" /> Open Quote Document
                                                                             </a>
                                                                         </div>
                                                                     )}
                                                                     <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                                                                         <div className="flex justify-between items-center mb-2">
                                                                             <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Quote Line Items:</span>
                                                                             <button
                                                                                 onClick={() => handleOpenQuoteModal(req)}
                                                                                 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                                                             >
                                                                                 Edit Items & Pricing
                                                                             </button>
                                                                         </div>
                                                                         <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                                                                             {req.quoteItems?.map((item, idx) => (
                                                                                 <div key={idx} className="flex justify-between items-start text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 p-2 rounded border border-gray-100/50 dark:border-gray-800/30">
                                                                                     <div className="font-medium mr-4">{item.description} <span className="text-[10px] text-gray-400 font-bold ml-1">x{item.quantity}</span></div>
                                                                                     <div className="font-bold text-gray-800 dark:text-white shrink-0">KES {item.amount.toLocaleString()}</div>
                                                                                 </div>
                                                                             ))}
                                                                         </div>
                                                                     </div>
                                                                 </div>
                                                             ) : (
                                                                 <div className="text-center py-5">
                                                                     <p className="text-xs text-gray-400 dark:text-gray-500">No quotation has been sent to this prospect yet.</p>
                                                                     <button 
                                                                         onClick={() => handleOpenQuoteModal(req)}
                                                                         className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-xs font-semibold"
                                                                     >
                                                                         <DocumentTextIcon className="w-3.5 h-3.5" /> Generate Quotation
                                                                     </button>
                                                                 </div>
                                                             )}
                                                         </div>

                                                         {/* Payments Section */}
                                                         <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                             <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                                 <CreditCardIcon className="w-5 h-5 text-green-500" />
                                                                 Onboarding Payments Log
                                                             </h4>
                                                             {req.payments && req.payments.length > 0 ? (
                                                                 <div className="space-y-4">
                                                                     <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 pr-1">
                                                                         {req.payments.map((p: any, idx: number) => (
                                                                             <div key={idx} className="py-2 flex justify-between items-start text-xs">
                                                                                 <div>
                                                                                     <div className="font-semibold text-gray-800 dark:text-gray-200 capitalize flex items-center gap-1.5">
                                                                                         <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                                         {p.paymentMethod.replace('_', ' ')}: {p.reference || 'Ref N/A'}
                                                                                     </div>
                                                                                     <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5 flex items-center gap-1">
                                                                                         <span>{new Date(p.paymentDate).toLocaleDateString()}</span>
                                                                                         {p.remarks && <span className="italic">• "{p.remarks}"</span>}
                                                                                     </div>
                                                                                 </div>
                                                                                 <div className="font-bold text-green-600 dark:text-green-400">KES {p.amount.toLocaleString()}</div>
                                                                             </div>
                                                                         ))}
                                                                     </div>

                                                                     <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center text-sm font-bold bg-green-50/30 dark:bg-green-950/10 p-2.5 rounded-lg border border-green-100/50 dark:border-green-900/20">
                                                                         <span className="text-gray-500 dark:text-gray-400">Total Collected:</span>
                                                                         <span className="text-green-700 dark:text-green-400 text-base">
                                                                             KES {req.payments.reduce((sum: number, p: any) => sum + p.amount, 0).toLocaleString()} 
                                                                             {req.quoteAmount ? ` / ${req.quoteAmount.toLocaleString()}` : ''}
                                                                         </span>
                                                                     </div>
                                                                 </div>
                                                             ) : (
                                                                 <div className="text-center py-5">
                                                                     <p className="text-xs text-gray-400 dark:text-gray-500">No payment records exist for this prospect.</p>
                                                                     {req.quoteAmount ? (
                                                                         <button 
                                                                             onClick={() => setSelectedRequestForPayment(req)}
                                                                             className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-xs font-semibold"
                                                                         >
                                                                             <CreditCardIcon className="w-3.5 h-3.5" /> Record Client Payment
                                                                         </button>
                                                                     ) : (
                                                                         <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 italic">Please generate a quote before posting payments.</p>
                                                                     )}
                                                                 </div>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </div>
                                             </td>
                                         </tr>
                                     )}
                                </React.Fragment>
                            ))}
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <CalendarIcon className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                                            <div className="text-lg font-medium text-gray-400 dark:text-gray-500">No demo requests found</div>
                                            <button 
                                                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                                className="text-indigo-600 text-sm hover:underline mt-2 font-medium"
                                            >
                                                Clear all filters
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QUOTE GENERATOR MODAL */}
            {selectedRequestForQuote && (
                <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/30">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <DocumentTextIcon className="w-6 h-6 text-indigo-500" />
                                    Generate & Email Quotation
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                    Client: {selectedRequestForQuote.institution} ({selectedRequestForQuote.name})
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedRequestForQuote(null)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-300 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-grow p-6 overflow-y-auto space-y-6">
                            {/* Quote Config Header info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Quote Ref Number</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono font-bold dark:text-white text-xs"
                                        value={quoteNumber}
                                        onChange={(e) => setQuoteNumber(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Recipient Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-xs"
                                        value={selectedRequestForQuote.email}
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Issue Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-xs"
                                        value={quoteIssueDate}
                                        onChange={(e) => {
                                            const newIssue = e.target.value;
                                            setQuoteIssueDate(newIssue);
                                            try {
                                                const d = new Date(newIssue);
                                                d.setDate(d.getDate() + 30);
                                                setQuoteDueDate(d.toISOString().split('T')[0]);
                                            } catch (err) {}
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Valid Until</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-xs"
                                        value={quoteDueDate}
                                        onChange={(e) => setQuoteDueDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Module Checklist Pre-populators */}
                            <div className="bg-indigo-50/40 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                                <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-3">
                                    Quick Module Adders & Pricing
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {Object.keys(MODULE_ITEMS).map((key) => (
                                        <label 
                                            key={key} 
                                            className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-sm select-none"
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={selectedModules[key] || false}
                                                onChange={() => handleModuleToggle(key)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">{key}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Quotation Grid */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        Quote Items Ledger
                                    </h4>
                                    <button 
                                        onClick={handleAddCustomItem}
                                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Item Line
                                    </button>
                                </div>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-inner">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                                                <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Description</th>
                                                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider w-20">Qty</th>
                                                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider w-32">Unit Price (KES)</th>
                                                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider w-32">Amount</th>
                                                <th className="px-4 py-2.5 text-center w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                            {quoteItems.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                                    <td className="p-2">
                                                        <input 
                                                            type="text" 
                                                            className="w-full px-2 py-1 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded outline-none dark:text-white font-medium"
                                                            value={item.description}
                                                            onChange={(e) => handleQuoteItemChange(index, 'description', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-2 py-1 text-right bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded outline-none dark:text-white"
                                                            value={item.quantity}
                                                            onChange={(e) => handleQuoteItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-2 py-1 text-right bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded outline-none dark:text-white"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleQuoteItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-2 text-right font-bold text-gray-800 dark:text-white">
                                                        KES {item.amount.toLocaleString()}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button 
                                                            onClick={() => handleRemoveQuoteItem(index)}
                                                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {quoteItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-6 text-center text-gray-400">
                                                        No quotation lines added yet. Click "Add Item Line" above.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer Summary & Buttons */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                {/* Tax Rate Controls */}
                                <div className="flex items-center gap-3">
                                    <label className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                                        Tax / VAT Rate:
                                    </label>
                                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                                        {[0, 16, 18].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setTaxRate(r)}
                                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${taxRate === r ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600'}`}
                                            >
                                                {r === 0 ? 'Exempt (0%)' : `${r}% VAT`}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={taxRate}
                                            onChange={e => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                            className="w-16 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs font-bold text-right outline-none dark:text-white focus:ring-1 focus:ring-indigo-500"
                                            placeholder="0"
                                        />
                                        <span className="text-xs font-bold text-gray-400">%</span>
                                    </div>
                                </div>

                                {/* Financial Calculations */}
                                <div className="flex items-center gap-6 text-xs font-bold">
                                    <div className="text-gray-500 dark:text-gray-400">
                                        Subtotal: <span className="font-extrabold text-gray-800 dark:text-white">KES {quoteItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                        Tax ({taxRate}%): <span className="font-extrabold text-indigo-600 dark:text-indigo-400">KES {Math.round((quoteItems.reduce((sum, item) => sum + item.amount, 0) * taxRate) / 100).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-sm">
                                        Total: KES {(quoteItems.reduce((sum, item) => sum + item.amount, 0) + Math.round((quoteItems.reduce((sum, item) => sum + item.amount, 0) * taxRate) / 100)).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 w-full">
                                <button
                                    onClick={() => handleDownloadQuotePreview(selectedRequestForQuote)}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-xs font-bold cursor-pointer"
                                >
                                    <DocumentArrowDownIcon className="w-4 h-4" /> Download PDF
                                </button>

                                <button
                                    onClick={() => handleSendQuoteToClient(selectedRequestForQuote)}
                                    disabled={isGeneratingQuote || quoteItems.length === 0}
                                    className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors shadow-md text-xs font-black uppercase tracking-wider cursor-pointer"
                                >
                                    {isGeneratingQuote ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" /> Dispatching...
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon className="w-4 h-4" /> Email & Save Quotation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* POST PAYMENT MODAL */}
            {selectedRequestForPayment && (
                <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/30">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CreditCardIcon className="w-6 h-6 text-green-500" />
                                    Post Onboarding Payment
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                    {selectedRequestForPayment.institution}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedRequestForPayment(null)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-300 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Form */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Amount Paid (KES)</label>
                                <input 
                                    type="number" 
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-lg dark:text-white"
                                    value={paymentAmount || ''}
                                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                    placeholder="Enter amount"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Method</label>
                                    <select
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all dark:text-white font-medium"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                    >
                                        <option value="mpesa">M-Pesa</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Payment Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all dark:text-white font-medium"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Transaction Ref / Receipt Code</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all font-mono font-bold uppercase dark:text-white"
                                    placeholder="e.g. RGX9X8C8S9"
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Remarks / Internal Notes</label>
                                <textarea 
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all dark:text-white"
                                    placeholder="Enter additional details"
                                    rows={2}
                                    value={paymentRemarks}
                                    onChange={(e) => setPaymentRemarks(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedRequestForPayment(null)}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handlePostPayment(selectedRequestForPayment)}
                                disabled={isPostingPayment}
                                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-green-400 transition-colors shadow-md text-xs font-bold"
                            >
                                {isPostingPayment ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" /> Recording...
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="w-4 h-4" /> Save Payment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
