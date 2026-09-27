import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Invoice, InvoiceItem, InvoiceClient, CompanyInvoiceSettings, Receipt, Institution, User, CompanyDetails } from '../../types';
import { apiService } from '../../services/apiService';
import { downloadInvoicePdf, downloadQuotePdf } from '../../services/pdfService';
import { sendEmailNotification } from '../../services/emailService';

// Icons
import { PlusIcon } from '../icons/PlusIcon';
import { XIcon } from '../icons/XIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { PencilIcon } from '../icons/PencilIcon';

interface CorporateInvoicingManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    companyDetails?: CompanyDetails;
    onLogAction?: (action: string) => void;
    availableInstitutions?: Institution[];
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: 'Paid in Full', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
    partial: { label: 'Partially Paid', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
    pending: { label: 'Awaiting Payment', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' },
    overdue: { label: 'Overdue', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800' },
    quote: { label: 'Estimate / Quote', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' },
    cancelled: { label: 'Cancelled', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' }
};

export const CorporateInvoicingManager: React.FC<CorporateInvoicingManagerProps> = ({
    currentUser,
    currentInstitution,
    companyDetails,
    onLogAction,
    availableInstitutions
}) => {
    const institutionId = currentInstitution?.id || currentUser?.institutionId || 'GLOBAL';

    // Tabs
    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'quotes' | 'payments' | 'clients' | 'statements' | 'settings'>('dashboard');

    // Core Data States
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [clients, setClients] = useState<InvoiceClient[]>([]);
    const [settings, setSettings] = useState<CompanyInvoiceSettings | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [clientFilter, setClientFilter] = useState<string>('all');

    // Modals
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [isQuoteMode, setIsQuoteMode] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [editingClient, setEditingClient] = useState<InvoiceClient | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

    // New Invoice / Quote Form State
    const [invClientId, setInvClientId] = useState('');
    const [invIssueDate, setInvIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [invDueDate, setInvDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
    });
    const [invTaxRate, setInvTaxRate] = useState<number>(16);
    const [invDiscount, setInvDiscount] = useState<number>(0);
    const [invNotes, setInvNotes] = useState('');
    const [invTerms, setInvTerms] = useState('');
    const [invItems, setInvItems] = useState<InvoiceItem[]>([
        { description: '', quantity: 1, unitPrice: 0, amount: 0 }
    ]);

    // Payment Form State
    const [payAmount, setPayAmount] = useState<number>(0);
    const [payMethod, setPayMethod] = useState<string>('M-Pesa');
    const [payRef, setPayRef] = useState('');
    const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [payNotes, setPayNotes] = useState('');

    // Client Form State
    const [clientName, setClientName] = useState('');
    const [clientContactPerson, setClientContactPerson] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientTaxPin, setClientTaxPin] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientCity, setClientCity] = useState('');
    const [clientNotes, setClientNotes] = useState('');
    const [isSyncingClients, setIsSyncingClients] = useState(false);

    // Statement State
    const [statementClientId, setStatementClientId] = useState<string>('');
    const [statementStartDate, setStatementStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 60);
        return d.toISOString().split('T')[0];
    });
    const [statementEndDate, setStatementEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Settings Form State
    const [formInvoicePrefix, setFormInvoicePrefix] = useState('INV-');
    const [formQuotePrefix, setFormQuotePrefix] = useState('QUO-');
    const [formReceiptPrefix, setFormReceiptPrefix] = useState('REC-');
    const [formCurrency, setFormCurrency] = useState('KES');
    const [formDefaultTaxRate, setFormDefaultTaxRate] = useState(16);
    const [formDefaultTermsDays, setFormDefaultTermsDays] = useState(14);
    const [formBankName, setFormBankName] = useState('');
    const [formAccountName, setFormAccountName] = useState('');
    const [formAccountNumber, setFormAccountNumber] = useState('');
    const [formMpesaPaybill, setFormMpesaPaybill] = useState('');
    const [formMpesaTill, setFormMpesaTill] = useState('');
    const [formNotesTemplate, setFormNotesTemplate] = useState('Thank you for choosing our services. Please quote the invoice number on your payment reference.');
    const [formTermsTemplate, setFormTermsTemplate] = useState('Payment is due within 14 calendar days from issue date. Electronic copies are legally binding.');
    const [formLogoUrl, setFormLogoUrl] = useState('');
    const [formStampUrl, setFormStampUrl] = useState('');
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Initial Load Data
    const loadAllInvoicingData = async () => {
        setLoading(true);
        try {
            const [invRes, recRes, clientRes, setRes] = await Promise.allSettled([
                apiService.fetchInvoices(institutionId),
                apiService.fetchModuleRecords<Receipt>('receipts', institutionId),
                apiService.fetchInvoiceClients(institutionId),
                apiService.fetchCompanyInvoiceSettings(institutionId)
            ]);

            if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
                setInvoices(invRes.value);
            }
            if (recRes.status === 'fulfilled' && Array.isArray(recRes.value)) {
                setReceipts(recRes.value);
            }
            if (clientRes.status === 'fulfilled' && Array.isArray(clientRes.value)) {
                setClients(clientRes.value);
            }
            if (setRes.status === 'fulfilled' && Array.isArray(setRes.value) && setRes.value.length > 0) {
                const s = setRes.value[0];
                setSettings(s);
                setFormInvoicePrefix(s.invoicePrefix || 'INV-');
                setFormQuotePrefix(s.quotePrefix || 'QUO-');
                setFormReceiptPrefix(s.receiptPrefix || 'REC-');
                setFormCurrency(s.currency || 'KES');
                setFormDefaultTaxRate(s.taxRate ?? 16);
                setFormDefaultTermsDays(s.paymentTermsDays ?? 14);
                setFormBankName(s.bankName || '');
                setFormAccountName(s.accountName || '');
                setFormAccountNumber(s.accountNumber || '');
                setFormMpesaPaybill(s.mpesaPaybill || '');
                setFormMpesaTill(s.mpesaTill || '');
                if (s.notesTemplate) setFormNotesTemplate(s.notesTemplate);
                if (s.termsTemplate) setFormTermsTemplate(s.termsTemplate);
                setFormLogoUrl(s.logoUrl || '');
                setFormStampUrl(s.stampUrl || '');
            }
        } catch (e) {
            console.error('Failed to load corporate invoicing data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllInvoicingData();
    }, [institutionId]);

    // Financial Metrics Calculations
    const metrics = useMemo(() => {
        const activeInvoices = invoices.filter(i => i.status !== 'quote' && i.status !== 'cancelled');
        const totalBilled = activeInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
        const totalPaid = receipts.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
        const totalReceivables = Math.max(0, totalBilled - totalPaid);

        const now = new Date();
        const overdueInvoices = activeInvoices.filter(i => {
            if (i.status === 'paid') return false;
            const due = new Date(i.dueDate || i.due_date || '');
            return due < now;
        });

        const overdueAmount = overdueInvoices.reduce((sum, i) => {
            const paid = Number(i.amountPaid) || 0;
            return sum + Math.max(0, Number(i.totalAmount) - paid);
        }, 0);

        const quoteCount = invoices.filter(i => i.status === 'quote').length;

        return {
            totalBilled,
            totalPaid,
            totalReceivables,
            overdueInvoicesCount: overdueInvoices.length,
            overdueAmount,
            quoteCount,
            activeCount: activeInvoices.length
        };
    }, [invoices, receipts]);

    // Aging Buckets Analysis
    const agingData = useMemo(() => {
        const now = new Date().getTime();
        let current = 0;
        let days30 = 0;
        let days60 = 0;
        let days90Plus = 0;

        invoices
            .filter(i => i.status !== 'quote' && i.status !== 'cancelled' && i.status !== 'paid')
            .forEach(i => {
                const due = new Date(i.dueDate || i.due_date || '').getTime();
                const bal = Math.max(0, Number(i.totalAmount) - (Number(i.amountPaid) || 0));
                if (due >= now) {
                    current += bal;
                } else {
                    const daysPast = Math.floor((now - due) / (1000 * 60 * 60 * 24));
                    if (daysPast <= 30) days30 += bal;
                    else if (daysPast <= 60) days60 += bal;
                    else days90Plus += bal;
                }
            });

        return { current, days30, days60, days90Plus };
    }, [invoices]);

    // Filtered Invoices List
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (activeTab === 'quotes') {
                if (inv.status !== 'quote') return false;
            } else if (activeTab === 'invoices') {
                if (inv.status === 'quote') return false;
            }

            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
            if (clientFilter !== 'all' && inv.clientId !== clientFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const num = (inv.invoiceNumber || '').toLowerCase();
                const cName = (inv.clientName || '').toLowerCase();
                const itemMatch = inv.items?.some(it => it.description.toLowerCase().includes(q));
                if (!num.includes(q) && !cName.includes(q) && !itemMatch) return false;
            }

            return true;
        });
    }, [invoices, activeTab, statusFilter, clientFilter, searchQuery]);

    // Client Statement Ledger
    const statementLedger = useMemo(() => {
        if (!statementClientId) return [];

        const clientInvoices = invoices.filter(i => i.clientId === statementClientId && i.status !== 'quote' && i.status !== 'cancelled');
        const clientReceipts = receipts.filter(r => {
            const matchingInv = invoices.find(inv => inv.id === r.invoiceId);
            return matchingInv?.clientId === statementClientId;
        });

        const entries: {
            date: string;
            type: 'Invoice' | 'Payment';
            ref: string;
            description: string;
            debit: number;
            credit: number;
        }[] = [];

        clientInvoices.forEach(inv => {
            entries.push({
                date: inv.issueDate,
                type: 'Invoice',
                ref: inv.invoiceNumber,
                description: inv.items?.map(it => it.description).filter(Boolean).join(', ') || 'Corporate Services',
                debit: Number(inv.totalAmount) || 0,
                credit: 0
            });
        });

        clientReceipts.forEach(rec => {
            entries.push({
                date: rec.paymentDate,
                type: 'Payment',
                ref: rec.receiptNumber,
                description: rec.paidFor || `Payment via ${rec.paymentMethod}`,
                debit: 0,
                credit: Number(rec.amountPaid) || 0
            });
        });

        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let running = 0;
        return entries.map(item => {
            running = running + item.debit - item.credit;
            return {
                ...item,
                runningBalance: running
            };
        });
    }, [statementClientId, invoices, receipts]);

    // Add Line Item
    const handleAddLineItem = () => {
        setInvItems([...invItems, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    };

    // Remove Line Item
    const handleRemoveLineItem = (index: number) => {
        if (invItems.length === 1) return;
        setInvItems(invItems.filter((_, idx) => idx !== index));
    };

    // Update Line Item
    const handleUpdateLineItem = (index: number, field: keyof InvoiceItem, val: any) => {
        const updated = [...invItems];
        const item = { ...updated[index], [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
            const q = field === 'quantity' ? Number(val) : Number(item.quantity);
            const p = field === 'unitPrice' ? Number(val) : Number(item.unitPrice);
            item.amount = (q || 0) * (p || 0);
        }
        updated[index] = item;
        setInvItems(updated);
    };

    // Invoice Calculations
    const calculatedSubtotal = useMemo(() => {
        return invItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    }, [invItems]);

    const calculatedTaxAmount = useMemo(() => {
        return (calculatedSubtotal * (Number(invTaxRate) || 0)) / 100;
    }, [calculatedSubtotal, invTaxRate]);

    const calculatedGrandTotal = useMemo(() => {
        return Math.max(0, calculatedSubtotal + calculatedTaxAmount - (Number(invDiscount) || 0));
    }, [calculatedSubtotal, calculatedTaxAmount, invDiscount]);

    // Save New Invoice / Quote
    const handleSaveInvoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invClientId) return alert('Please select a corporate client.');
        if (invItems.length === 0 || calculatedSubtotal <= 0) return alert('Please provide at least one valid line item with an amount.');

        const client = clients.find(c => c.id === invClientId);
        const prefix = isQuoteMode ? (formQuotePrefix || 'QUO-') : (formInvoicePrefix || 'INV-');
        const serial = `${prefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newDoc: Invoice = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            invoiceNumber: serial,
            institutionId,
            issueDate: invIssueDate,
            dueDate: invDueDate,
            items: invItems,
            subtotal: calculatedSubtotal,
            taxRate: invTaxRate,
            taxAmount: calculatedTaxAmount,
            discountAmount: invDiscount,
            totalAmount: calculatedGrandTotal,
            amountPaid: 0,
            balance: calculatedGrandTotal,
            status: isQuoteMode ? 'quote' : 'pending',
            clientId: client?.id,
            clientName: client?.clientName || 'Client',
            clientEmail: client?.email,
            clientPhone: client?.phone,
            clientTaxPin: client?.taxPin,
            clientAddress: client?.address,
            currency: formCurrency || 'KES',
            notes: invNotes || formNotesTemplate,
            terms: invTerms || formTermsTemplate
        };

        try {
            await apiService.saveModuleRecord('invoices', newDoc);
            setInvoices(prev => [newDoc, ...prev]);
            setShowInvoiceModal(false);
            onLogAction?.(`Created corporate ${isQuoteMode ? 'Quote' : 'Invoice'} ${serial} for ${client?.clientName} of ${formCurrency} ${calculatedGrandTotal.toLocaleString()}`);
            alert(`Success: ${isQuoteMode ? 'Quotation' : 'Invoice'} ${serial} created successfully!`);
            // Reset form
            setInvItems([{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
            setInvDiscount(0);
        } catch (err: any) {
            alert('Failed to save document: ' + err.message);
        }
    };

    // Convert Quote to Tax Invoice
    const handleConvertQuoteToInvoice = async (quote: Invoice) => {
        if (!window.confirm(`Convert Quotation ${quote.invoiceNumber} for ${quote.clientName} into an official Tax Invoice?`)) return;

        const newInvoiceNumber = `${formInvoicePrefix || 'INV-'}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const updatedDoc: Invoice = {
            ...quote,
            invoiceNumber: newInvoiceNumber,
            status: 'pending',
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + (formDefaultTermsDays || 14) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        try {
            await apiService.saveModuleRecord('invoices', updatedDoc);
            setInvoices(prev => prev.map(inv => inv.id === quote.id ? updatedDoc : inv));
            onLogAction?.(`Converted Quote ${quote.invoiceNumber} to Active Invoice ${newInvoiceNumber}`);
            alert(`Quotation successfully converted to Invoice: ${newInvoiceNumber}!`);
        } catch (err: any) {
            alert('Failed to convert quote: ' + err.message);
        }
    };

    // Record Customer Payment
    const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentTargetInvoice) return;
        if (payAmount <= 0) return alert('Please enter a valid payment amount.');

        const currentPaid = Number(paymentTargetInvoice.amountPaid) || 0;
        const newPaidTotal = currentPaid + Number(payAmount);
        const total = Number(paymentTargetInvoice.totalAmount) || 0;
        const remaining = Math.max(0, total - newPaidTotal);

        const newReceiptNumber = `${formReceiptPrefix || 'REC-'}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const newReceipt: Receipt = {
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            receiptNumber: newReceiptNumber,
            institutionId,
            invoiceId: paymentTargetInvoice.id,
            paymentDate: payDate,
            amountPaid: Number(payAmount),
            paymentMethod: payMethod,
            relatedTransactionId: payRef || undefined,
            paidFor: `Payment for Invoice ${paymentTargetInvoice.invoiceNumber} (${paymentTargetInvoice.clientName || 'Client'})`
        };

        const updatedInvoice: Invoice = {
            ...paymentTargetInvoice,
            amountPaid: newPaidTotal,
            balance: remaining,
            status: remaining <= 0 ? 'paid' : 'partial'
        };

        try {
            await apiService.saveModuleRecord('receipts', newReceipt);
            await apiService.saveModuleRecord('invoices', updatedInvoice);

            setReceipts(prev => [newReceipt, ...prev]);
            setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
            setShowPaymentModal(false);
            setPaymentTargetInvoice(null);
            setPayAmount(0);
            setPayRef('');

            onLogAction?.(`Recorded payment of ${formCurrency} ${payAmount.toLocaleString()} for Invoice ${paymentTargetInvoice.invoiceNumber} (Receipt: ${newReceiptNumber})`);
            alert(`Payment recorded successfully! Receipt generated: ${newReceiptNumber}`);
        } catch (err: any) {
            alert('Failed to record payment: ' + err.message);
        }
    };

    // Save Client
    const handleSaveClientSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName.trim()) return alert('Client name is required.');

        const newClient: InvoiceClient = {
            id: editingClient ? editingClient.id : `cli_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            institutionId,
            clientName: clientName.trim(),
            contactPerson: clientContactPerson.trim(),
            email: clientEmail.trim(),
            phone: clientPhone.trim(),
            taxPin: clientTaxPin.trim().toUpperCase(),
            address: clientAddress.trim(),
            city: clientCity.trim(),
            notes: clientNotes.trim(),
            updatedAt: new Date().toISOString()
        };

        try {
            await apiService.saveInvoiceClient(newClient);
            if (editingClient) {
                setClients(prev => prev.map(c => c.id === newClient.id ? newClient : c));
                onLogAction?.(`Updated corporate client profile: ${newClient.clientName}`);
                alert(`Client "${newClient.clientName}" updated successfully!`);
            } else {
                setClients(prev => [newClient, ...prev]);
                onLogAction?.(`Registered new corporate client: ${newClient.clientName}`);
                alert(`Client "${newClient.clientName}" registered successfully!`);
            }
            setShowClientModal(false);
            setEditingClient(null);
            // Reset
            setClientName('');
            setClientContactPerson('');
            setClientEmail('');
            setClientPhone('');
            setClientTaxPin('');
            setClientAddress('');
            setClientCity('');
            setClientNotes('');
        } catch (err: any) {
            alert('Failed to save client: ' + err.message);
        }
    };

    // Save Settings
    const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);

        const updatedSettings: CompanyInvoiceSettings = {
            id: settings?.id || `inv_cfg_${institutionId}`,
            institutionId,
            invoicePrefix: formInvoicePrefix,
            quotePrefix: formQuotePrefix,
            receiptPrefix: formReceiptPrefix,
            currency: formCurrency,
            taxRate: Number(formDefaultTaxRate) || 0,
            taxName: `VAT (${formDefaultTaxRate}%)`,
            paymentTermsDays: Number(formDefaultTermsDays) || 14,
            bankName: formBankName,
            accountName: formAccountName,
            accountNumber: formAccountNumber,
            mpesaPaybill: formMpesaPaybill,
            mpesaTill: formMpesaTill,
            notesTemplate: formNotesTemplate,
            termsTemplate: formTermsTemplate,
            logoUrl: formLogoUrl,
            stampUrl: formStampUrl,
            updatedAt: new Date().toISOString()
        };

        try {
            await apiService.saveCompanyInvoiceSettings(updatedSettings);
            setSettings(updatedSettings);
            onLogAction?.('Updated company invoice & billing profile configurations.');
            alert('Invoicing preferences, numbering prefixes, and banking details saved successfully!');
        } catch (err: any) {
            alert('Failed to save settings: ' + err.message);
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Download PDF Invoice / Quote
    const handleDownloadDocument = (doc: Invoice) => {
        const effectiveCompanyDetails: CompanyDetails = {
            name: currentInstitution?.name || 'Company Name',
            address: currentInstitution?.address || 'P.O. Box 100, City',
            phone: currentInstitution?.phoneNumber || '0700000000',
            email: currentInstitution?.email || 'billing@company.com',
            website: '',
            taxPin: formBankName ? undefined : undefined
        };

        if (doc.status === 'quote') {
            downloadQuotePdf(doc, effectiveCompanyDetails, formLogoUrl || currentInstitution?.logoUrl || null);
        } else {
            downloadInvoicePdf(doc, effectiveCompanyDetails, formLogoUrl || currentInstitution?.logoUrl || null);
        }
    };

    // WhatsApp Dispatch
    const handleShareViaWhatsApp = (doc: Invoice) => {
        const phone = (doc.clientPhone || '').replace(/\D/g, '');
        const message = `Hello ${doc.clientName || 'Customer'},\n\nPlease find your ${doc.status === 'quote' ? 'Quotation' : 'Invoice'} ${doc.invoiceNumber} for ${formCurrency} ${Number(doc.totalAmount).toLocaleString()}.\nDue Date: ${doc.dueDate}\nStatus: ${doc.status.toUpperCase()}.\n\nThank you for choosing ${currentInstitution?.name || 'us'}.`;
        const url = `https://wa.me/${phone ? phone : ''}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // Batch Sync Tenant Institutions into Corporate Client Directory
    const handleSyncTenantsAsClients = async () => {
        if (!availableInstitutions || availableInstitutions.length === 0) return;
        const existingNames = new Set(clients.map(c => c.clientName.toLowerCase().trim()));
        const toImport = availableInstitutions.filter(inst => inst.name && !existingNames.has(inst.name.toLowerCase().trim()));
        
        if (toImport.length === 0) {
            alert('All available tenant institutions are already present in your Clients Directory.');
            return;
        }

        if (!window.confirm(`Import ${toImport.length} tenant institution(s) into your Corporate Clients Directory?`)) {
            return;
        }

        setIsSyncingClients(true);
        let importedCount = 0;
        const newClientsList: InvoiceClient[] = [];

        try {
            for (const inst of toImport) {
                const newClient: InvoiceClient = {
                    id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId,
                    clientName: inst.name,
                    contactPerson: inst.category || inst.institutionType || 'Administrator',
                    email: inst.email || '',
                    phone: inst.phoneNumber || '',
                    city: inst.county || '',
                    address: inst.address || '',
                    notes: `Imported from institution directory (Code: ${inst.code || inst.id})`
                };
                await apiService.saveInvoiceClient(newClient);
                newClientsList.push(newClient);
                importedCount++;
            }
            setClients(prev => [...prev, ...newClientsList]);
            onLogAction?.(`Imported ${importedCount} tenant institutions into Corporate Client Directory.`);
            alert(`Success: ${importedCount} tenant institution(s) imported into your Clients Directory!`);
        } catch (err: any) {
            console.error('Failed importing clients:', err);
            alert(`Partial or complete failure importing clients: ${err.message}`);
        } finally {
            setIsSyncingClients(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6">
            {/* Top Executive Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                
                <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-black tracking-widest uppercase text-indigo-300">
                            Corporate Invoicing &amp; Billing Engine
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                        {currentInstitution?.name || 'Corporate Invoicing Hub'}
                    </h1>
                    <p className="text-xs text-indigo-200/80 max-w-xl">
                        Autonomous enterprise billing: issue tax invoices, manage proformas, receive multi-channel payments, track customer ledgers, and export signed PDF statements.
                    </p>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => { setIsQuoteMode(false); setShowInvoiceModal(true); }}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" /> New Tax Invoice
                    </button>
                    <button
                        onClick={() => { setIsQuoteMode(true); setShowInvoiceModal(true); }}
                        className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                        <PencilIcon className="w-4 h-4" /> New Quotation
                    </button>
                    <button
                        onClick={() => { setEditingClient(null); setShowClientModal(true); }}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                        <BuildingOfficeIcon className="w-4 h-4" /> Add Client
                    </button>
                </div>
            </div>

            {/* Navigation Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                {[
                    { id: 'dashboard', label: 'Overview Dashboard', icon: '📊' },
                    { id: 'invoices', label: `Tax Invoices (${invoices.filter(i => i.status !== 'quote').length})`, icon: '📄' },
                    { id: 'quotes', label: `Quotations & Estimates (${invoices.filter(i => i.status === 'quote').length})`, icon: '📑' },
                    { id: 'payments', label: `Payments & Receipts (${receipts.length})`, icon: '💳' },
                    { id: 'clients', label: `Clients Directory (${clients.length})`, icon: '🏢' },
                    { id: 'statements', label: 'Customer Statements', icon: '📜' },
                    { id: 'settings', label: 'Branding & Invoicing Settings', icon: '⚙️' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* TAB 1: EXECUTIVE DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Top 4 KPI Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Invoiced Volume</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                {formCurrency} {metrics.totalBilled.toLocaleString()}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">{metrics.activeCount} active corporate invoices</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Cash Collected</p>
                            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                {formCurrency} {metrics.totalPaid.toLocaleString()}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">{receipts.length} verified payment receipts</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Outstanding Receivables</p>
                            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                {formCurrency} {metrics.totalReceivables.toLocaleString()}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">Pending customer settlements</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Overdue Balance</p>
                            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                                {formCurrency} {metrics.overdueAmount.toLocaleString()}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">{metrics.overdueInvoicesCount} invoices past maturity</p>
                        </div>
                    </div>

                    {/* Aging Receivables Breakdown */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    Accounts Receivable Aging Analysis
                                </h4>
                                <p className="text-xs text-slate-500">Maturity and collection status across outstanding customer balances</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                Total: {formCurrency} {metrics.totalReceivables.toLocaleString()}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Current (Not Due)</span>
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">{formCurrency} {agingData.current.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">1 – 30 Days Overdue</span>
                                <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">{formCurrency} {agingData.days30.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl">
                                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-300">31 – 60 Days Overdue</span>
                                <p className="text-lg font-black text-orange-700 dark:text-orange-300 mt-1">{formCurrency} {agingData.days60.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">60+ Days Overdue</span>
                                <p className="text-lg font-black text-rose-700 dark:text-rose-300 mt-1">{formCurrency} {agingData.days90Plus.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Invoices Quick Table */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Recent Corporate Invoices
                            </h4>
                            <button
                                onClick={() => setActiveTab('invoices')}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                View All Invoices &rarr;
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-3">Invoice #</th>
                                        <th className="p-3">Client</th>
                                        <th className="p-3">Issue Date</th>
                                        <th className="p-3">Due Date</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3 text-right">Balance</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {invoices.filter(i => i.status !== 'quote').slice(0, 5).map(inv => {
                                        const cfg = INVOICE_STATUS_CONFIG[inv.status] || INVOICE_STATUS_CONFIG.pending;
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                                <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">{inv.invoiceNumber}</td>
                                                <td className="p-3 font-bold text-slate-900 dark:text-white">{inv.clientName || 'Client'}</td>
                                                <td className="p-3 text-slate-500">{inv.issueDate}</td>
                                                <td className="p-3 text-slate-500">{inv.dueDate}</td>
                                                <td className="p-3 text-right font-mono font-bold">{formCurrency} {Number(inv.totalAmount).toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                    {formCurrency} {Math.max(0, Number(inv.totalAmount) - (Number(inv.amountPaid) || 0)).toLocaleString()}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleDownloadDocument(inv)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Download Official PDF"
                                                    >
                                                        <DocumentArrowDownIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {invoices.filter(i => i.status !== 'quote').length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-6 text-center text-slate-400">
                                                No invoices recorded yet. Click "New Tax Invoice" to create your first client bill.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2 & TAB 3: INVOICES / QUOTES LIST */}
            {(activeTab === 'invoices' || activeTab === 'quotes') && (
                <div className="space-y-4 animate-fade-in">
                    {/* Filter & Search Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search by number, client, item..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-600 dark:text-white w-full md:w-64"
                            />
                            {activeTab === 'invoices' && (
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-600 dark:text-white"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Awaiting Payment</option>
                                    <option value="partial">Partially Paid</option>
                                    <option value="paid">Paid</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            )}
                            <select
                                value={clientFilter}
                                onChange={e => setClientFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="all">All Clients</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.clientName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button
                                onClick={() => {
                                    setIsQuoteMode(activeTab === 'quotes');
                                    setShowInvoiceModal(true);
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> {activeTab === 'quotes' ? 'Create Quotation' : 'Create Invoice'}
                            </button>
                        </div>
                    </div>

                    {/* Documents Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4">{activeTab === 'quotes' ? 'Quote #' : 'Invoice #'}</th>
                                        <th className="p-4">Client Name</th>
                                        <th className="p-4">Issue Date</th>
                                        <th className="p-4">{activeTab === 'quotes' ? 'Valid Until' : 'Due Date'}</th>
                                        <th className="p-4 text-right">Subtotal</th>
                                        <th className="p-4 text-right">Tax (VAT)</th>
                                        <th className="p-4 text-right">Grand Total</th>
                                        {activeTab === 'invoices' && <th className="p-4 text-right">Balance Due</th>}
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredInvoices.map(doc => {
                                        const cfg = INVOICE_STATUS_CONFIG[doc.status] || INVOICE_STATUS_CONFIG.pending;
                                        const balance = Math.max(0, Number(doc.totalAmount) - (Number(doc.amountPaid) || 0));
                                        return (
                                            <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="p-4 font-mono font-black text-indigo-600 dark:text-indigo-400">{doc.invoiceNumber}</td>
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-900 dark:text-white">{doc.clientName || 'Client'}</p>
                                                    {doc.clientTaxPin && <span className="text-[10px] text-slate-400 font-mono">PIN: {doc.clientTaxPin}</span>}
                                                </td>
                                                <td className="p-4 text-slate-500">{doc.issueDate}</td>
                                                <td className="p-4 text-slate-500">{doc.dueDate}</td>
                                                <td className="p-4 text-right font-mono text-slate-500">{formCurrency} {Number(doc.subtotal || doc.totalAmount).toLocaleString()}</td>
                                                <td className="p-4 text-right font-mono text-slate-500">{formCurrency} {Number(doc.taxAmount || 0).toLocaleString()}</td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                    {formCurrency} {Number(doc.totalAmount).toLocaleString()}
                                                </td>
                                                {activeTab === 'invoices' && (
                                                    <td className="p-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                        {formCurrency} {balance.toLocaleString()}
                                                    </td>
                                                )}
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {activeTab === 'quotes' && (
                                                            <button
                                                                onClick={() => handleConvertQuoteToInvoice(doc)}
                                                                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                                                title="Convert Quote to Active Invoice"
                                                            >
                                                                Convert to Invoice
                                                            </button>
                                                        )}
                                                        {activeTab === 'invoices' && doc.status !== 'paid' && (
                                                            <button
                                                                onClick={() => {
                                                                    setPaymentTargetInvoice(doc);
                                                                    setPayAmount(balance);
                                                                    setShowPaymentModal(true);
                                                                }}
                                                                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                                                title="Record Payment"
                                                            >
                                                                Record Pay
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDownloadDocument(doc)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Download PDF"
                                                        >
                                                            <DocumentArrowDownIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleShareViaWhatsApp(doc)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Share on WhatsApp"
                                                        >
                                                            💬
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-slate-400">
                                                No {activeTab === 'quotes' ? 'quotations' : 'invoices'} found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: PAYMENTS & RECEIPTS */}
            {activeTab === 'payments' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Customer Receipts &amp; Payment Ledger
                            </h4>
                            <p className="text-xs text-slate-500">Official log of cleared settlements across M-Pesa, Bank, and Card channels</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Total Collected: {formCurrency} {metrics.totalPaid.toLocaleString()}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4">Receipt #</th>
                                        <th className="p-4">Payment Date</th>
                                        <th className="p-4">Channel / Method</th>
                                        <th className="p-4">Reference / Code</th>
                                        <th className="p-4">Allocated Invoice / Purpose</th>
                                        <th className="p-4 text-right">Amount Cleared</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {receipts.map(rec => (
                                        <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                            <td className="p-4 font-mono font-black text-emerald-600 dark:text-emerald-400">{rec.receiptNumber}</td>
                                            <td className="p-4 text-slate-500">{rec.paymentDate}</td>
                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{rec.paymentMethod}</td>
                                            <td className="p-4 font-mono text-slate-500">{rec.relatedTransactionId || '—'}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-400">{rec.paidFor || 'Invoice Settlement'}</td>
                                            <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                {formCurrency} {Number(rec.amountPaid).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {receipts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400">
                                                No customer payments recorded yet. Click "Record Pay" on any pending invoice.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: CLIENTS DIRECTORY */}
            {activeTab === 'clients' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Corporate Client Accounts Directory
                            </h4>
                            <p className="text-xs text-slate-500">Registered commercial clients, billing points of contact, and tax credentials</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {availableInstitutions && availableInstitutions.length > 0 && (
                                <button
                                    onClick={handleSyncTenantsAsClients}
                                    disabled={isSyncingClients}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <span>🔄</span> {isSyncingClients ? 'Syncing...' : `Import Tenants (${availableInstitutions.length})`}
                                </button>
                            )}
                            <button
                                onClick={() => { setEditingClient(null); setShowClientModal(true); }}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> Add New Client
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clients.map(client => {
                            const clientInvoices = invoices.filter(i => i.clientId === client.id && i.status !== 'quote');
                            const billed = clientInvoices.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0);
                            const paid = receipts
                                .filter(r => clientInvoices.some(inv => inv.id === r.invoiceId))
                                .reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0);
                            const balance = Math.max(0, billed - paid);

                            return (
                                <div key={client.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 relative group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{client.clientName}</h4>
                                            {client.contactPerson && <p className="text-xs text-slate-500 mt-0.5">Attn: {client.contactPerson}</p>}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingClient(client);
                                                setClientName(client.clientName);
                                                setClientContactPerson(client.contactPerson || '');
                                                setClientEmail(client.email || '');
                                                setClientPhone(client.phone || '');
                                                setClientTaxPin(client.taxPin || '');
                                                setClientAddress(client.address || '');
                                                setClientCity(client.city || '');
                                                setClientNotes(client.notes || '');
                                                setShowClientModal(true);
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="space-y-1 text-xs text-slate-500">
                                        {client.email && <p className="flex items-center gap-1.5">✉️ {client.email}</p>}
                                        {client.phone && <p className="flex items-center gap-1.5">📞 {client.phone}</p>}
                                        {client.taxPin && <p className="font-mono text-[10px] text-slate-400">PIN: {client.taxPin}</p>}
                                    </div>

                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl flex justify-between items-center text-xs">
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-slate-400">Billed</span>
                                            <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{formCurrency} {billed.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black uppercase text-rose-500">Outstanding</span>
                                            <p className="font-mono font-black text-rose-600 dark:text-rose-400">{formCurrency} {balance.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => {
                                                setStatementClientId(client.id);
                                                setActiveTab('statements');
                                            }}
                                            className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors"
                                        >
                                            View Statement &rarr;
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {clients.length === 0 && (
                            <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <BuildingOfficeIcon className="w-8 h-8 text-slate-400 mx-auto" />
                                <h4 className="font-bold text-slate-800 dark:text-white">No Clients Registered</h4>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">Register your corporate customers and companies to issue invoices, quotes, and account statements.</p>
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    {availableInstitutions && availableInstitutions.length > 0 && (
                                        <button
                                            onClick={handleSyncTenantsAsClients}
                                            disabled={isSyncingClients}
                                            className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2"
                                        >
                                            <span>🔄</span> Import {availableInstitutions.length} Tenant Institutions
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setEditingClient(null); setShowClientModal(true); }}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
                                    >
                                        Add Your First Client
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 6: CUSTOMER STATEMENTS */}
            {activeTab === 'statements' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Client Statement of Account
                            </h4>
                            <p className="text-xs text-slate-500">Formal ledger statement detailing invoices, payments, and running balance</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={statementClientId}
                                onChange={e => setStatementClientId(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="">-- Choose Corporate Client --</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.clientName}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => window.print()}
                                disabled={!statementClientId}
                                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                            >
                                🖨️ Print Statement
                            </button>
                        </div>
                    </div>

                    {statementClientId ? (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                            {/* Client Header in Statement */}
                            {(() => {
                                const sel = clients.find(c => c.id === statementClientId);
                                const finalBalance = statementLedger.length > 0 ? statementLedger[statementLedger.length - 1].runningBalance : 0;
                                return (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <h3 className="font-black text-base text-slate-900 dark:text-white">{sel?.clientName}</h3>
                                            <p className="text-xs text-slate-500">{sel?.address || ''} {sel?.city ? `• ${sel.city}` : ''}</p>
                                            {sel?.taxPin && <p className="text-[10px] font-mono text-slate-400">PIN: {sel.taxPin}</p>}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Total Net Balance</span>
                                            <h2 className="text-2xl font-mono font-black text-rose-600 dark:text-rose-400">
                                                {formCurrency} {finalBalance.toLocaleString()}
                                            </h2>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Ledger Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Reference #</th>
                                            <th className="p-3">Description</th>
                                            <th className="p-3 text-right">Debit (Invoice)</th>
                                            <th className="p-3 text-right">Credit (Payment)</th>
                                            <th className="p-3 text-right">Running Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {statementLedger.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                                <td className="p-3 text-slate-500">{row.date}</td>
                                                <td className="p-3 font-bold">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
                                                        row.type === 'Invoice' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                                                    }`}>
                                                        {row.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{row.ref}</td>
                                                <td className="p-3 text-slate-600 dark:text-slate-400">{row.description}</td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {row.debit > 0 ? `${formCurrency} ${row.debit.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {row.credit > 0 ? `${formCurrency} ${row.credit.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="p-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                                                    {formCurrency} {row.runningBalance.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {statementLedger.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-400">
                                                    No financial records found for this client.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-slate-200 dark:border-slate-700 text-center text-slate-400">
                            Please select a client from the dropdown above to view their statement of account.
                        </div>
                    )}
                </div>
            )}

            {/* TAB 7: INVOICE SETTINGS & BRANDING */}
            {activeTab === 'settings' && (
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in max-w-4xl">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Corporate Invoicing &amp; Company Branding Configurations
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Configure serial numbering, currency tariffs, tax compliance, and settlement instructions.</p>
                    </div>

                    <form onSubmit={handleSaveSettingsSubmit} className="space-y-6">
                        {/* Numbering & Currency */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Invoice Prefix</label>
                                <input
                                    type="text"
                                    value={formInvoicePrefix}
                                    onChange={e => setFormInvoicePrefix(e.target.value)}
                                    placeholder="e.g. INV-"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Quote Prefix</label>
                                <input
                                    type="text"
                                    value={formQuotePrefix}
                                    onChange={e => setFormQuotePrefix(e.target.value)}
                                    placeholder="e.g. QUO-"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Receipt Prefix</label>
                                <input
                                    type="text"
                                    value={formReceiptPrefix}
                                    onChange={e => setFormReceiptPrefix(e.target.value)}
                                    placeholder="e.g. REC-"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Billing Currency</label>
                                <select
                                    value={formCurrency}
                                    onChange={e => setFormCurrency(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                >
                                    <option value="KES">KES - Kenyan Shilling</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                    <option value="UGX">UGX - Ugandan Shilling</option>
                                    <option value="TZS">TZS - Tanzanian Shilling</option>
                                </select>
                            </div>
                        </div>

                        {/* Tax & Terms */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Default Tax Rate (%)</label>
                                <input
                                    type="number"
                                    value={formDefaultTaxRate}
                                    onChange={e => setFormDefaultTaxRate(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Default Payment Terms (Days)</label>
                                <input
                                    type="number"
                                    value={formDefaultTermsDays}
                                    onChange={e => setFormDefaultTermsDays(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Bank Details */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Bank Settlement Details (Appears on Invoices)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Bank Name</label>
                                    <input
                                        type="text"
                                        value={formBankName}
                                        onChange={e => setFormBankName(e.target.value)}
                                        placeholder="e.g. KCB Bank / Equity Bank"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Account Name</label>
                                    <input
                                        type="text"
                                        value={formAccountName}
                                        onChange={e => setFormAccountName(e.target.value)}
                                        placeholder="e.g. ACME Solutions Ltd"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Account Number</label>
                                    <input
                                        type="text"
                                        value={formAccountNumber}
                                        onChange={e => setFormAccountNumber(e.target.value)}
                                        placeholder="e.g. 1234567890"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* M-Pesa Settlement */}
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">M-Pesa Express / Paybill / Buy Goods</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">M-Pesa Paybill</label>
                                    <input
                                        type="text"
                                        value={formMpesaPaybill}
                                        onChange={e => setFormMpesaPaybill(e.target.value)}
                                        placeholder="e.g. 522522"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">M-Pesa Till / Buy Goods</label>
                                    <input
                                        type="text"
                                        value={formMpesaTill}
                                        onChange={e => setFormMpesaTill(e.target.value)}
                                        placeholder="e.g. 987654"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes & Terms Templates */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Default Invoice Notes</label>
                                <textarea
                                    rows={2}
                                    value={formNotesTemplate}
                                    onChange={e => setFormNotesTemplate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Default Terms &amp; Conditions</label>
                                <textarea
                                    rows={2}
                                    value={formTermsTemplate}
                                    onChange={e => setFormTermsTemplate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingSettings}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-50"
                            >
                                {isSavingSettings ? 'Saving...' : 'Save Invoicing Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ===== MODAL: NEW INVOICE / QUOTE ===== */}
            {showInvoiceModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                {isQuoteMode ? 'Create New Corporate Quotation' : 'Issue Official Tax Invoice'}
                            </h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveInvoiceSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Client & Date Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Client</label>
                                    <select
                                        required
                                        value={invClientId}
                                        onChange={e => setInvClientId(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    >
                                        <option value="">-- Choose Client --</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.clientName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Issue Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={invIssueDate}
                                        onChange={e => setInvIssueDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{isQuoteMode ? 'Valid Until' : 'Due Date'}</label>
                                    <input
                                        type="date"
                                        required
                                        value={invDueDate}
                                        onChange={e => setInvDueDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Line Items &amp; Services</label>
                                    <button
                                        type="button"
                                        onClick={handleAddLineItem}
                                        className="text-xs text-indigo-600 font-bold hover:underline"
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {invItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <input
                                                type="text"
                                                placeholder="Description / Service name"
                                                required
                                                value={item.description}
                                                onChange={e => handleUpdateLineItem(idx, 'description', e.target.value)}
                                                className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-600 dark:text-white"
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Qty"
                                                required
                                                value={item.quantity}
                                                onChange={e => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                                                className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-indigo-600 dark:text-white text-center"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Unit Price"
                                                required
                                                value={item.unitPrice}
                                                onChange={e => handleUpdateLineItem(idx, 'unitPrice', e.target.value)}
                                                className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-indigo-600 dark:text-white text-right"
                                            />
                                            <span className="w-24 text-right font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                                {formCurrency} {Number(item.amount).toLocaleString()}
                                            </span>
                                            {invItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLineItem(idx)}
                                                    className="text-slate-400 hover:text-rose-500 p-1"
                                                >
                                                    <XIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Calculation */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span className="font-mono font-bold">{formCurrency} {calculatedSubtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        VAT / Tax (%)
                                        <input
                                            type="number"
                                            value={invTaxRate}
                                            onChange={e => setInvTaxRate(Number(e.target.value))}
                                            className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 text-center font-mono text-[11px]"
                                        />
                                    </span>
                                    <span className="font-mono font-bold">{formCurrency} {calculatedTaxAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span>Discount Amount</span>
                                    <input
                                        type="number"
                                        value={invDiscount}
                                        onChange={e => setInvDiscount(Number(e.target.value))}
                                        className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono text-[11px]"
                                    />
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                                    <span>Grand Total</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                        {formCurrency} {calculatedGrandTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInvoiceModal(false)}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                                >
                                    {isQuoteMode ? 'Save & Issue Quotation' : 'Save & Issue Tax Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL: RECORD PAYMENT ===== */}
            {showPaymentModal && paymentTargetInvoice && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Record Payment for {paymentTargetInvoice.invoiceNumber}
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                                <p className="text-slate-500">Client: <strong className="text-slate-900 dark:text-white">{paymentTargetInvoice.clientName}</strong></p>
                                <p className="text-slate-500">Invoice Total: <strong className="font-mono text-slate-900 dark:text-white">{formCurrency} {Number(paymentTargetInvoice.totalAmount).toLocaleString()}</strong></p>
                                <p className="text-slate-500">Balance Remaining: <strong className="font-mono text-rose-600">{formCurrency} {Math.max(0, Number(paymentTargetInvoice.totalAmount) - (Number(paymentTargetInvoice.amountPaid) || 0)).toLocaleString()}</strong></p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Amount ({formCurrency})</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={payAmount}
                                    onChange={e => setPayAmount(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Channel</label>
                                    <select
                                        value={payMethod}
                                        onChange={e => setPayMethod(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    >
                                        <option value="M-Pesa">M-Pesa Paybill/Till</option>
                                        <option value="Bank Transfer">Bank Electronic Transfer</option>
                                        <option value="Card">Debit / Credit Card</option>
                                        <option value="Cheque">Bank Cheque</option>
                                        <option value="Cash">Cash Settlement</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Settlement Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={payDate}
                                        onChange={e => setPayDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Transaction Ref / Cheque #</label>
                                <input
                                    type="text"
                                    placeholder="e.g. QAB8921JK3 / Cheque 00412"
                                    value={payRef}
                                    onChange={e => setPayRef(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                                >
                                    Confirm &amp; Issue Receipt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL: ADD / EDIT CLIENT ===== */}
            {showClientModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                {editingClient ? 'Edit Corporate Client' : 'Register Corporate Client'}
                            </h3>
                            <button onClick={() => setShowClientModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClientSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Company / Client Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Acme Corporation Ltd"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Contact Person</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Jane Doe"
                                        value={clientContactPerson}
                                        onChange={e => setClientContactPerson(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">KRA / Tax PIN</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. P051234567Z"
                                        value={clientTaxPin}
                                        onChange={e => setClientTaxPin(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Billing Email</label>
                                    <input
                                        type="email"
                                        placeholder="accounts@client.com"
                                        value={clientEmail}
                                        onChange={e => setClientEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="0712345678"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Physical Address / City</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Westlands Commercial Center, Nairobi"
                                    value={clientAddress}
                                    onChange={e => setClientAddress(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowClientModal(false)}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                                >
                                    {editingClient ? 'Save Changes' : 'Register Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
