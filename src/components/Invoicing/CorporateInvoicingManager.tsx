import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Invoice, InvoiceItem, InvoiceClient, CompanyInvoiceSettings, Receipt, Institution, User, CompanyDetails, MpesaTransaction, LetterheadConfig } from '../../types';
import { apiService } from '../../services/apiService';
import { downloadInvoicePdf, downloadQuotePdf, downloadReceiptPdf } from '../../services/pdfService';
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
import { PrinterIcon } from '../icons/PrinterIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';

interface CorporateInvoicingManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    companyDetails?: CompanyDetails;
    onLogAction?: (action: string) => void;
    availableInstitutions?: Institution[];
    initialInvoices?: Invoice[];
    initialReceipts?: Receipt[];
    letterheadConfig?: LetterheadConfig;
    logoUrl?: string | null;
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: 'Paid in Full', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
    partial: { label: 'Partially Paid', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
    pending: { label: 'Awaiting Payment', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' },
    overdue: { label: 'Overdue', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800' },
    quote: { label: 'Estimate / Quote', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' },
    cancelled: { label: 'Cancelled', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' }
};

const amountToWords = (num: number, currency: string = 'KES'): string => {
    if (!num || isNaN(num) || num <= 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
        if (n < 1000000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
        if (n < 1000000000) return inWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 !== 0 ? ' ' + inWords(n % 1000000) : '');
        return String(n);
    };
    const whole = Math.floor(num);
    const cents = Math.round((num - whole) * 100);
    let str = inWords(whole) + (currency === 'KES' ? ' Kenya Shillings' : ` ${currency}`);
    if (cents > 0) str += ` and ${cents}/100 Cents`;
    return str + ' Only';
};

export const CorporateInvoicingManager: React.FC<CorporateInvoicingManagerProps> = ({
    currentUser,
    currentInstitution,
    companyDetails,
    onLogAction,
    availableInstitutions,
    initialInvoices,
    initialReceipts,
    letterheadConfig,
    logoUrl
}) => {
    const institutionId = currentInstitution?.id || currentUser?.institutionId || 'GLOBAL';

    // Tabs
    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'quotes' | 'payments' | 'clients' | 'statements' | 'settings'>('dashboard');

    // Core Data States
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices || []);
    const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts || []);
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
    const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null);

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
    const [formInvoiceNextNumber, setFormInvoiceNextNumber] = useState<number>(1001);
    const [formQuotePrefix, setFormQuotePrefix] = useState('QUO-');
    const [formQuoteNextNumber, setFormQuoteNextNumber] = useState<number>(1001);
    const [formReceiptPrefix, setFormReceiptPrefix] = useState('REC-');
    const [formReceiptNextNumber, setFormReceiptNextNumber] = useState<number>(1001);
    const [formHeaderImageUrl, setFormHeaderImageUrl] = useState('');
    const [formFooterImageUrl, setFormFooterImageUrl] = useState('');
    const [customDocNumber, setCustomDocNumber] = useState('');
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

    const institutionMap = useMemo(() => {
        const map = new Map<string, Institution>();
        (availableInstitutions || []).forEach(inst => {
            if (inst.id) map.set(inst.id, inst);
        });
        return map;
    }, [availableInstitutions]);

    // Initial Load Data
    const loadAllInvoicingData = async () => {
        setLoading(true);
        try {
            // Determine the DB query scope:
            // - 'GLOBAL' = super admin corporate billing. Records are stored with institution_id = null
            //   (apiService.saveModuleRecord converts 'GLOBAL' → null to avoid FK violations).
            //   We pass undefined here so fetchModuleRecords returns all null-institution_id records.
            // - Any real tenant id = scope to that tenant only.
            // - No id at all = also undefined (safe fallback, should not normally happen).
            const isGlobal = !institutionId || institutionId === 'GLOBAL';
            const targetInstId = isGlobal ? undefined : institutionId;

            const [invRes, recRes, clientRes, setRes, numConfigsRes] = await Promise.allSettled([
                apiService.fetchInvoices(targetInstId),
                apiService.fetchModuleRecords<Receipt>('receipts', targetInstId),
                apiService.fetchInvoiceClients(targetInstId),
                apiService.fetchCompanyInvoiceSettings(isGlobal ? undefined : institutionId),
                apiService.fetchModuleRecords<any>('finance_numbering_configs', isGlobal ? undefined : institutionId).catch(() => [])
            ]);

            if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
                let fetched = invRes.value;
                if (isGlobal) {
                    fetched = fetched.filter(i => {
                        const id = i.institutionId || (i as any).institution_id;
                        const isStudent = !!(i.studentId || (i as any).student_id);
                        return (!id || id === 'GLOBAL') && !isStudent;
                    });
                } else if (institutionId) {
                    fetched = fetched.filter(i => (i.institutionId || (i as any).institution_id) === institutionId);
                }
                const mapById = new Map<string, Invoice>();
                (initialInvoices || []).forEach(i => {
                    const id = i.institutionId || (i as any).institution_id;
                    const isStudent = !!(i.studentId || (i as any).student_id);
                    if (isGlobal ? ((!id || id === 'GLOBAL') && !isStudent) : (id === institutionId)) {
                        mapById.set(i.id, i);
                    }
                });
                fetched.forEach(i => mapById.set(i.id, i));
                setInvoices(Array.from(mapById.values()));
            }
            if (recRes.status === 'fulfilled' && Array.isArray(recRes.value)) {
                let fetched = recRes.value;
                if (isGlobal) {
                    fetched = fetched.filter(r => {
                        const id = r.institutionId || (r as any).institution_id;
                        const isStudent = !!(r.studentId || (r as any).student_id || (r as any).studentName || (r as any).student_name || (r as any).feeStructureId);
                        return (!id || id === 'GLOBAL') && !isStudent;
                    });
                } else if (institutionId) {
                    fetched = fetched.filter(r => (r.institutionId || (r as any).institution_id) === institutionId);
                }
                const mapById = new Map<string, Receipt>();
                (initialReceipts || []).forEach(r => {
                    const id = r.institutionId || (r as any).institution_id;
                    const isStudent = !!(r.studentId || (r as any).student_id || (r as any).studentName || (r as any).student_name || (r as any).feeStructureId);
                    if (isGlobal ? ((!id || id === 'GLOBAL') && !isStudent) : (id === institutionId)) {
                        mapById.set(r.id, r);
                    }
                });
                fetched.forEach(r => mapById.set(r.id, r));
                setReceipts(Array.from(mapById.values()));
            }
            if (clientRes.status === 'fulfilled' && Array.isArray(clientRes.value)) {
                let fetched = clientRes.value;
                if (isGlobal) {
                    fetched = fetched.filter(c => {
                        const id = c.institutionId || (c as any).institution_id;
                        return !id || id === 'GLOBAL';
                    });
                } else if (institutionId) {
                    fetched = fetched.filter(c => (c.institutionId || (c as any).institution_id) === institutionId);
                }
                setClients(fetched);
            }

            // Sync configured Document Numbering from finance_numbering_configs
            if (numConfigsRes.status === 'fulfilled' && Array.isArray(numConfigsRes.value)) {
                const configs = numConfigsRes.value;
                const invCfg = configs.find(c => String(c.documentType || c.document_type || '').toLowerCase() === 'invoice');
                if (invCfg) {
                    if (invCfg.prefix) setFormInvoicePrefix(invCfg.prefix);
                    const n = Number(invCfg.nextNumber || invCfg.next_number);
                    if (n) setFormInvoiceNextNumber(n);
                }
                const quoCfg = configs.find(c => {
                    const t = String(c.documentType || c.document_type || '').toLowerCase();
                    return t === 'quote' || t === 'quotation';
                });
                if (quoCfg) {
                    if (quoCfg.prefix) setFormQuotePrefix(quoCfg.prefix);
                    const n = Number(quoCfg.nextNumber || quoCfg.next_number);
                    if (n) setFormQuoteNextNumber(n);
                }
                const recCfg = configs.find(c => String(c.documentType || c.document_type || '').toLowerCase() === 'receipt');
                if (recCfg) {
                    if (recCfg.prefix) setFormReceiptPrefix(recCfg.prefix);
                    const n = Number(recCfg.nextNumber || recCfg.next_number);
                    if (n) setFormReceiptNextNumber(n);
                }
            }

            // Merge with CompanyInvoiceSettings
            if (setRes.status === 'fulfilled' && Array.isArray(setRes.value) && setRes.value.length > 0) {
                const s = setRes.value[0];
                setSettings(s);
                if (s.invoicePrefix) setFormInvoicePrefix(s.invoicePrefix);
                if (s.quotePrefix) setFormQuotePrefix(s.quotePrefix);
                if (s.receiptPrefix) setFormReceiptPrefix(s.receiptPrefix);
                if (s.nextInvoiceNumber) setFormInvoiceNextNumber(s.nextInvoiceNumber);
                if (s.nextQuoteNumber) setFormQuoteNextNumber(s.nextQuoteNumber);
                if (s.nextReceiptNumber) setFormReceiptNextNumber(s.nextReceiptNumber);
                if (s.headerImageUrl) setFormHeaderImageUrl(s.headerImageUrl);
                if (s.footerImageUrl) setFormFooterImageUrl(s.footerImageUrl);
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
                if (s.logoUrl) setFormLogoUrl(s.logoUrl);
                if (s.stampUrl) setFormStampUrl(s.stampUrl);
            }

            // Fallback letterhead defaults from institution / company details
            const defaultHeader = currentInstitution?.letterheadConfig?.headerImageUrl || (currentInstitution as any)?.headerImageUrl || (currentInstitution as any)?.header_image_url || letterheadConfig?.headerImageUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.headerImageUrl || '';
            const defaultFooter = currentInstitution?.letterheadConfig?.footerImageUrl || currentInstitution?.footerImageUrl || (currentInstitution as any)?.footer_image_url || letterheadConfig?.footerImageUrl || companyDetails?.letterheadConfig?.footerImageUrl || (companyDetails as any)?.footerImageUrl || '';
            const defaultLogo = currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || logoUrl || companyDetails?.logoUrl || '';
            const defaultStamp = currentInstitution?.letterheadConfig?.stampImageUrl || (currentInstitution as any)?.stampUrl || (currentInstitution as any)?.stamp_url || letterheadConfig?.stampImageUrl || companyDetails?.letterheadConfig?.stampImageUrl || (companyDetails as any)?.stampUrl || '';

            setFormHeaderImageUrl(prev => prev || defaultHeader);
            setFormFooterImageUrl(prev => prev || defaultFooter);
            setFormLogoUrl(prev => prev || defaultLogo);
            setFormStampUrl(prev => prev || defaultStamp);
        } catch (e) {
            console.error('Failed to load corporate invoicing data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllInvoicingData();
    }, [institutionId]);

    useEffect(() => {
        if (initialInvoices && initialInvoices.length > 0) {
            const isGlobal = !institutionId || institutionId === 'GLOBAL';
            const clean = isGlobal
                ? initialInvoices.filter(i => {
                    const id = i.institutionId || (i as any).institution_id;
                    const isStudent = !!(i.studentId || (i as any).student_id);
                    return (!id || id === 'GLOBAL') && !isStudent;
                })
                : initialInvoices.filter(i => (i.institutionId || (i as any).institution_id) === institutionId);

            setInvoices(prev => {
                const mapById = new Map<string, Invoice>();
                prev.forEach(i => mapById.set(i.id, i));
                clean.forEach(i => mapById.set(i.id, i));
                return Array.from(mapById.values());
            });
        }
    }, [initialInvoices, institutionId]);

    useEffect(() => {
        if (initialReceipts && initialReceipts.length > 0) {
            const isGlobal = !institutionId || institutionId === 'GLOBAL';
            const clean = isGlobal
                ? initialReceipts.filter(r => {
                    const id = r.institutionId || (r as any).institution_id;
                    const isStudent = !!(r.studentId || (r as any).student_id || (r as any).studentName || (r as any).student_name || (r as any).feeStructureId);
                    return (!id || id === 'GLOBAL') && !isStudent;
                })
                : initialReceipts.filter(r => (r.institutionId || (r as any).institution_id) === institutionId);

            setReceipts(prev => {
                const mapById = new Map<string, Receipt>();
                prev.forEach(r => mapById.set(r.id, r));
                clean.forEach(r => mapById.set(r.id, r));
                return Array.from(mapById.values());
            });
        }
    }, [initialReceipts, institutionId]);

    // Financial Metrics Calculations
    const metrics = useMemo(() => {
        const isGlobal = !institutionId || institutionId === 'GLOBAL';
        const relevantInvoices = invoices.filter(i => {
            if (isGlobal) {
                const id = i.institutionId || (i as any).institution_id;
                const isStudent = !!(i.studentId || (i as any).student_id);
                return (!id || id === 'GLOBAL') && !isStudent;
            }
            return (i.institutionId || (i as any).institution_id) === institutionId;
        });
        const relevantReceipts = receipts.filter(r => {
            if (isGlobal) {
                const id = r.institutionId || (r as any).institution_id;
                const isStudent = !!(r.studentId || (r as any).student_id || (r as any).studentName || (r as any).student_name || (r as any).feeStructureId);
                return (!id || id === 'GLOBAL') && !isStudent;
            }
            return (r.institutionId || (r as any).institution_id) === institutionId;
        });

        const activeInvoices = relevantInvoices.filter(i => i.status !== 'quote' && i.status !== 'cancelled');
        const totalBilled = activeInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
        const totalPaid = relevantReceipts.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
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

        const quoteCount = relevantInvoices.filter(i => i.status === 'quote').length;

        return {
            totalBilled,
            totalPaid,
            totalReceivables,
            overdueInvoicesCount: overdueInvoices.length,
            overdueAmount,
            quoteCount,
            activeCount: activeInvoices.length
        };
    }, [invoices, receipts, institutionId]);

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
        const isGlobal = !institutionId || institutionId === 'GLOBAL';
        return invoices.filter(inv => {
            if (isGlobal) {
                const id = inv.institutionId || (inv as any).institution_id;
                const isStudent = !!(inv.studentId || (inv as any).student_id);
                if ((id && id !== 'GLOBAL') || isStudent) return false;
            } else if (institutionId) {
                const id = inv.institutionId || (inv as any).institution_id;
                if (id && id !== institutionId) return false;
            }

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
                const instName = (institutionMap.get(inv.institutionId || '')?.name || '').toLowerCase();
                const itemMatch = inv.items?.some(it => it.description.toLowerCase().includes(q));
                if (!num.includes(q) && !cName.includes(q) && !instName.includes(q) && !itemMatch) return false;
            }

            return true;
        });
    }, [invoices, activeTab, statusFilter, clientFilter, searchQuery, institutionMap, institutionId]);

    // Receipts Search & Filter States
    const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
    const [receiptMethodFilter, setReceiptMethodFilter] = useState('all');

    // Filtered Receipts List
    const filteredReceipts = useMemo(() => {
        const isGlobal = !institutionId || institutionId === 'GLOBAL';
        return receipts.filter(rec => {
            if (isGlobal) {
                const id = rec.institutionId || (rec as any).institution_id;
                const isStudent = !!(rec.studentId || (rec as any).student_id || (rec as any).studentName || (rec as any).student_name || (rec as any).feeStructureId);
                if ((id && id !== 'GLOBAL') || isStudent) return false;
            } else if (institutionId) {
                const id = rec.institutionId || (rec as any).institution_id;
                if (id && id !== institutionId) return false;
            }

            if (receiptMethodFilter !== 'all' && (rec.paymentMethod || '').toLowerCase() !== receiptMethodFilter.toLowerCase()) {
                return false;
            }

            if (receiptSearchQuery) {
                const q = receiptSearchQuery.toLowerCase();
                const recNum = (rec.receiptNumber || '').toLowerCase();
                const txId = (rec.relatedTransactionId || '').toLowerCase();
                const paidFor = (rec.paidFor || '').toLowerCase();
                const instName = (institutionMap.get(rec.institutionId || '')?.name || '').toLowerCase();
                const matchingInv = invoices.find(i => i.id === rec.invoiceId);
                const cName = (matchingInv?.clientName || '').toLowerCase();
                if (!recNum.includes(q) && !txId.includes(q) && !paidFor.includes(q) && !instName.includes(q) && !cName.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [receipts, receiptMethodFilter, receiptSearchQuery, invoices, institutionMap]);

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

    // Helper for uploading local images as data URLs
    const handleImageUpload = (file: File, setter: (url: string) => void) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                setter(e.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    // Helper to open create invoice/quote modal with auto-sequenced document number
    const handleOpenCreateDocModal = async (quoteMode: boolean) => {
        setIsQuoteMode(quoteMode);
        try {
            const nextNumber = await apiService.peekNextDocumentNumber(institutionId, quoteMode ? 'quote' : 'invoice');
            setCustomDocNumber(nextNumber);
        } catch {
            const p = quoteMode ? formQuotePrefix : formInvoicePrefix;
            const n = quoteMode ? formQuoteNextNumber : formInvoiceNextNumber;
            setCustomDocNumber(`${p}${n}`);
        }
        setShowInvoiceModal(true);
    };

    // Save New Invoice / Quote
    const handleSaveInvoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invClientId) return alert('Please select a corporate client.');
        if (invItems.length === 0 || calculatedSubtotal <= 0) return alert('Please provide at least one valid line item with an amount.');

        const client = clients.find(c => c.id === invClientId);
        const docType = isQuoteMode ? 'quote' : 'invoice';

        // Obtain sequential number from the configured sequence
        let serial = customDocNumber.trim();
        if (!serial) {
            serial = await apiService.getNextDocumentNumber(institutionId, docType);
        } else {
            // Pre-peeked or customized number was approved; advance persistent counter
            await apiService.getNextDocumentNumber(institutionId, docType).catch(() => {});
        }

        // Update local sequence counter
        if (isQuoteMode) {
            setFormQuoteNextNumber(prev => prev + 1);
        } else {
            setFormInvoiceNextNumber(prev => prev + 1);
        }

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

        const newInvoiceNumber = await apiService.getNextDocumentNumber(institutionId, 'invoice');
        setFormInvoiceNextNumber(prev => prev + 1);
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

        const newReceiptNumber = await apiService.getNextDocumentNumber(institutionId, 'receipt');
        setFormReceiptNextNumber(prev => prev + 1);
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
            nextInvoiceNumber: Number(formInvoiceNextNumber) || 1001,
            nextQuoteNumber: Number(formQuoteNextNumber) || 1001,
            nextReceiptNumber: Number(formReceiptNextNumber) || 1001,
            headerImageUrl: formHeaderImageUrl,
            footerImageUrl: formFooterImageUrl,
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

            // Also synchronize finance_numbering_configs
            await Promise.allSettled([
                apiService.saveModuleRecord('finance_numbering_configs', {
                    id: `num_cfg_invoice_${institutionId}`,
                    institutionId,
                    institution_id: institutionId,
                    documentType: 'invoice',
                    document_type: 'invoice',
                    prefix: formInvoicePrefix,
                    nextNumber: Number(formInvoiceNextNumber) || 1001,
                    next_number: Number(formInvoiceNextNumber) || 1001,
                    updatedAt: new Date().toISOString()
                }),
                apiService.saveModuleRecord('finance_numbering_configs', {
                    id: `num_cfg_quote_${institutionId}`,
                    institutionId,
                    institution_id: institutionId,
                    documentType: 'quote',
                    document_type: 'quote',
                    prefix: formQuotePrefix,
                    nextNumber: Number(formQuoteNextNumber) || 1001,
                    next_number: Number(formQuoteNextNumber) || 1001,
                    updatedAt: new Date().toISOString()
                }),
                apiService.saveModuleRecord('finance_numbering_configs', {
                    id: `num_cfg_receipt_${institutionId}`,
                    institutionId,
                    institution_id: institutionId,
                    documentType: 'receipt',
                    document_type: 'receipt',
                    prefix: formReceiptPrefix,
                    nextNumber: Number(formReceiptNextNumber) || 1001,
                    next_number: Number(formReceiptNextNumber) || 1001,
                    updatedAt: new Date().toISOString()
                })
            ]);

            setSettings(updatedSettings);
            onLogAction?.('Updated company invoice & billing profile configurations, numbering sequences, and letterhead.');
            alert('Invoicing preferences, numbering sequences, letterhead branding, and banking details saved successfully!');
        } catch (err: any) {
            alert('Failed to save settings: ' + err.message);
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Download PDF Invoice / Quote with Letterhead
    const handleDownloadDocument = async (doc: Invoice) => {
        try {
            const effectiveLetterheadConfig: LetterheadConfig = {
                headerImageUrl: formHeaderImageUrl || currentInstitution?.letterheadConfig?.headerImageUrl || (currentInstitution as any)?.headerImageUrl || letterheadConfig?.headerImageUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.headerImageUrl || null,
                footerImageUrl: formFooterImageUrl || currentInstitution?.letterheadConfig?.footerImageUrl || currentInstitution?.footerImageUrl || letterheadConfig?.footerImageUrl || companyDetails?.letterheadConfig?.footerImageUrl || (companyDetails as any)?.footerImageUrl || null,
                stampImageUrl: formStampUrl || currentInstitution?.letterheadConfig?.stampImageUrl || (currentInstitution as any)?.stampUrl || letterheadConfig?.stampImageUrl || companyDetails?.letterheadConfig?.stampImageUrl || (companyDetails as any)?.stampUrl || null,
                footerText: currentInstitution?.letterheadConfig?.footerText || letterheadConfig?.footerText || companyDetails?.letterheadConfig?.footerText || `${currentInstitution?.name || 'EduAI'} - Official Corporate Document`,
                showStamp: true
            };

            const effectiveInstitution: Institution = {
                ...currentInstitution,
                letterheadConfig: effectiveLetterheadConfig,
                logoUrl: formLogoUrl || currentInstitution?.logoUrl || logoUrl || companyDetails?.logoUrl || '',
                footerImageUrl: effectiveLetterheadConfig.footerImageUrl || undefined
            };

            const effectiveCompanyDetails: CompanyDetails = {
                ...(companyDetails || {}),
                name: currentInstitution?.name || companyDetails?.name || 'Company Name',
                address: currentInstitution?.address || companyDetails?.address || 'P.O. Box 100, City',
                phone: currentInstitution?.phoneNumber || companyDetails?.phone || '0700000000',
                email: currentInstitution?.email || companyDetails?.email || 'billing@company.com',
                website: currentInstitution?.website || companyDetails?.website || '',
                letterheadConfig: effectiveLetterheadConfig,
                logoUrl: effectiveInstitution.logoUrl ?? null,
                paymentInstructions: (formBankName || formMpesaPaybill) ? [
                    formBankName ? `Bank: ${formBankName} | Account Name: ${formAccountName} | A/C No: ${formAccountNumber}` : '',
                    formMpesaPaybill ? `M-Pesa Paybill: ${formMpesaPaybill} | Account: ${doc.invoiceNumber}` : '',
                    formMpesaTill ? `M-Pesa Till: ${formMpesaTill}` : '',
                    doc.terms || formTermsTemplate || ''
                ].filter(Boolean).join('\n') : undefined
            } as CompanyDetails;

            const effectiveLogo = formLogoUrl || currentInstitution?.logoUrl || logoUrl || companyDetails?.logoUrl || null;

            if (doc.status === 'quote') {
                await downloadQuotePdf(doc, effectiveInstitution, effectiveCompanyDetails, effectiveLogo);
            } else {
                await downloadInvoicePdf(doc, effectiveInstitution, effectiveCompanyDetails, effectiveLogo);
            }
        } catch (err: any) {
            console.error("Failed to generate document PDF:", err);
            alert("Failed to generate PDF: " + (err.message || err));
        }
    };

    // Download PDF Receipt with Letterhead
    const handleDownloadReceiptPdf = async (rec: Receipt) => {
        try {
            const targetInst = institutionMap.get(rec.institutionId || '') || currentInstitution;
            const matchingInv = invoices.find(i => i.id === rec.invoiceId);
            const client = clients.find(c => c.id === matchingInv?.clientId);
            const effectiveLetterheadConfig: LetterheadConfig = {
                headerImageUrl: formHeaderImageUrl || targetInst?.letterheadConfig?.headerImageUrl || letterheadConfig?.headerImageUrl || companyDetails?.letterheadConfig?.headerImageUrl || (targetInst as any)?.headerImageUrl || null,
                footerImageUrl: formFooterImageUrl || targetInst?.letterheadConfig?.footerImageUrl || letterheadConfig?.footerImageUrl || companyDetails?.letterheadConfig?.footerImageUrl || targetInst?.footerImageUrl || null,
                stampImageUrl: formStampUrl || targetInst?.letterheadConfig?.stampImageUrl || letterheadConfig?.stampImageUrl || companyDetails?.letterheadConfig?.stampImageUrl || (targetInst as any)?.stampUrl || null,
                footerText: targetInst?.letterheadConfig?.footerText || letterheadConfig?.footerText || companyDetails?.letterheadConfig?.footerText || `${targetInst?.name || 'EduAI'} - Official Receipt`,
                showStamp: true
            };

            const targetInstWithLetterhead: Institution = {
                ...targetInst,
                letterheadConfig: effectiveLetterheadConfig,
                logoUrl: formLogoUrl || targetInst?.logoUrl || logoUrl || companyDetails?.logoUrl || '',
                footerImageUrl: effectiveLetterheadConfig.footerImageUrl || undefined
            };

            const effectiveCompanyDetails: CompanyDetails = {
                ...(companyDetails || {}),
                name: companyDetails?.name || targetInst?.name || 'Corporate Invoicing Hub',
                address: companyDetails?.address || targetInst?.address || 'P.O. Box 100, City',
                phone: companyDetails?.phone || targetInst?.phoneNumber || '0700000000',
                email: companyDetails?.email || targetInst?.email || 'billing@company.com',
                website: companyDetails?.website || '',
                letterheadConfig: effectiveLetterheadConfig,
                logoUrl: targetInstWithLetterhead.logoUrl ?? null
            } as CompanyDetails;

            const customerName = matchingInv?.clientName || client?.clientName || (rec as any).receivedFrom || 'Commercial Client';
            const customerPhone = client?.phone || matchingInv?.clientPhone || '';

            const fallbackTx: MpesaTransaction = {
                id: rec.relatedTransactionId || rec.id,
                transactionId: rec.relatedTransactionId || rec.receiptNumber || 'TXN-CLEARED',
                amount: rec.amountPaid,
                phoneNumber: customerPhone,
                payerName: customerName,
                institutionId: rec.institutionId || targetInst?.id || '',
                timestamp: rec.paymentDate || new Date().toISOString(),
                status: 'completed',
                provider: (rec.paymentMethod || '').toLowerCase().includes('mpesa') ? 'mpesa' : 'bank',
                paymentMethod: (rec.paymentMethod || 'electronic') as any,
                description: rec.paidFor || `Payment for Invoice ${matchingInv?.invoiceNumber || ''}`,
                referenceId: rec.receiptNumber
            };

            const invoiceBalance = matchingInv ? Math.max(0, Number(matchingInv.totalAmount) - Number(matchingInv.amountPaid || 0)) : undefined;

            await downloadReceiptPdf(
                rec,
                fallbackTx,
                targetInstWithLetterhead,
                effectiveCompanyDetails,
                formLogoUrl || targetInst?.logoUrl || logoUrl || null,
                invoiceBalance,
                currentUser?.name || 'Finance Officer'
            );
        } catch (err: any) {
            console.error("Failed to generate receipt PDF:", err);
            alert("Failed to generate receipt PDF: " + (err.message || err));
        }
    };

    // Share Receipt via WhatsApp
    const handleShareReceiptViaWhatsApp = (rec: Receipt) => {
        const matchingInv = invoices.find(i => i.id === rec.invoiceId);
        const client = clients.find(c => c.id === matchingInv?.clientId);
        const customerName = matchingInv?.clientName || client?.clientName || 'Valued Client';
        const phone = (client?.phone || matchingInv?.clientPhone || '').replace(/\D/g, '');
        const message = `*OFFICIAL PAYMENT RECEIPT*\n` +
            `Receipt No: *${rec.receiptNumber}*\n` +
            `Date: ${rec.paymentDate}\n` +
            `Customer: *${customerName}*\n` +
            `Amount Cleared: *${formCurrency} ${Number(rec.amountPaid).toLocaleString()}*\n` +
            `Payment Method: ${rec.paymentMethod || 'Electronic Settlement'}\n` +
            `Reference: ${rec.relatedTransactionId || rec.receiptNumber}\n` +
            `Purpose: ${rec.paidFor || 'Official Corporate Services Settlement'}\n\n` +
            `Thank you for your business.\n` +
            `_${currentInstitution?.name || companyDetails?.name || 'EduAI Enterprise Global'}_`;

        const url = `https://wa.me/${phone ? phone : ''}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
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
                        onClick={() => handleOpenCreateDocModal(false)}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" /> New Tax Invoice
                    </button>
                    <button
                        onClick={() => handleOpenCreateDocModal(true)}
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
                                                <td className="p-3">
                                                    <p className="font-bold text-slate-900 dark:text-white">{inv.clientName || institutionMap.get(inv.institutionId || '')?.name || 'Client'}</p>
                                                    {institutionMap.get(inv.institutionId || '')?.name && inv.clientName && inv.clientName !== institutionMap.get(inv.institutionId || '')?.name && (
                                                        <span className="text-[10px] text-indigo-500 font-semibold block">{institutionMap.get(inv.institutionId || '')?.name}</span>
                                                    )}
                                                </td>
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
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => setPreviewInvoice(inv)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Preview Invoice with Letterhead"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadDocument(inv)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Download Official PDF"
                                                        >
                                                            <DocumentArrowDownIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
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
                                onClick={() => handleOpenCreateDocModal(activeTab === 'quotes')}
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
                                                    <p className="font-bold text-slate-900 dark:text-white">{doc.clientName || institutionMap.get(doc.institutionId || '')?.name || 'Client'}</p>
                                                    {institutionMap.get(doc.institutionId || '')?.name && doc.clientName && doc.clientName !== institutionMap.get(doc.institutionId || '')?.name && (
                                                        <span className="text-[10px] text-indigo-500 font-semibold block">{institutionMap.get(doc.institutionId || '')?.name}</span>
                                                    )}
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
                                                            onClick={() => setPreviewInvoice(doc)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Preview Document with Letterhead"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
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
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

                    {/* Filter & Search Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search by receipt #, ref, customer, or purpose..."
                                value={receiptSearchQuery}
                                onChange={e => setReceiptSearchQuery(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-600 dark:text-white w-full md:w-80"
                            />
                            <select
                                value={receiptMethodFilter}
                                onChange={e => setReceiptMethodFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="all">All Channels</option>
                                <option value="M-Pesa">M-Pesa</option>
                                <option value="Bank">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredReceipts.length}</span> of {receipts.length} verified receipts
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4">Receipt #</th>
                                        <th className="p-4">Payment Date</th>
                                        <th className="p-4">Customer / Institution</th>
                                        <th className="p-4">Channel / Method</th>
                                        <th className="p-4">Reference / Code</th>
                                        <th className="p-4">Allocated Invoice / Purpose</th>
                                        <th className="p-4 text-right">Amount Cleared</th>
                                        <th className="p-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredReceipts.map(rec => {
                                        const matchingInv = invoices.find(i => i.id === rec.invoiceId);
                                        const instName = institutionMap.get(rec.institutionId || matchingInv?.institutionId || '')?.name;
                                        const customerName = matchingInv?.clientName || instName || 'Commercial Client';

                                        return (
                                            <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                                <td className="p-4 font-mono font-black text-emerald-600 dark:text-emerald-400">{rec.receiptNumber}</td>
                                                <td className="p-4 text-slate-500">{rec.paymentDate}</td>
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-900 dark:text-white">{customerName}</p>
                                                    {instName && instName !== customerName && (
                                                        <span className="text-[10px] text-indigo-500 font-semibold block">{instName}</span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{rec.paymentMethod}</td>
                                                <td className="p-4 font-mono text-slate-500">{rec.relatedTransactionId || '—'}</td>
                                                <td className="p-4 text-slate-600 dark:text-slate-400">{rec.paidFor || 'Invoice Settlement'}</td>
                                                <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                    {formCurrency} {Number(rec.amountPaid).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => setPreviewReceipt(rec)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                                                            title="Preview Modern Corporate Receipt"
                                                        >
                                                            <EyeIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">View</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadReceiptPdf(rec)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                                                            title="Download Official PDF Receipt"
                                                        >
                                                            <DocumentArrowDownIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">PDF</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleShareReceiptViaWhatsApp(rec)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center"
                                                            title="Share Receipt on WhatsApp"
                                                        >
                                                            💬
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredReceipts.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-slate-400">
                                                {receipts.length === 0
                                                    ? 'No customer payments recorded yet. Click "Record Pay" on any pending invoice.'
                                                    : 'No receipts match your search filters.'}
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
                        {/* Numbering Sequences & Currency */}
                        <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Document Numbering Sequences &amp; Currency
                                    </h4>
                                    <p className="text-[11px] text-slate-500">Auto-incrementing counters used whenever official invoices, quotes, and receipts are generated.</p>
                                </div>
                                <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    {formCurrency} Active
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Invoice Series</label>
                                        <span className="text-[9px] font-mono text-indigo-500 font-bold">{formInvoicePrefix}{formInvoiceNextNumber}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formInvoicePrefix}
                                        onChange={e => setFormInvoicePrefix(e.target.value)}
                                        placeholder="e.g. INV-"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <span className="text-[10px] text-slate-400 font-bold">Next #:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formInvoiceNextNumber}
                                            onChange={e => setFormInvoiceNextNumber(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-mono font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quote Series</label>
                                        <span className="text-[9px] font-mono text-purple-500 font-bold">{formQuotePrefix}{formQuoteNextNumber}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formQuotePrefix}
                                        onChange={e => setFormQuotePrefix(e.target.value)}
                                        placeholder="e.g. QUO-"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <span className="text-[10px] text-slate-400 font-bold">Next #:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formQuoteNextNumber}
                                            onChange={e => setFormQuoteNextNumber(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-mono font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Receipt Series</label>
                                        <span className="text-[9px] font-mono text-emerald-500 font-bold">{formReceiptPrefix}{formReceiptNextNumber}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formReceiptPrefix}
                                        onChange={e => setFormReceiptPrefix(e.target.value)}
                                        placeholder="e.g. REC-"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <span className="text-[10px] text-slate-400 font-bold">Next #:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formReceiptNextNumber}
                                            onChange={e => setFormReceiptNextNumber(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-mono font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Billing Currency</label>
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
                                    <p className="text-[10px] text-slate-400">Applies to all generated invoices &amp; PDF totals.</p>
                                </div>
                            </div>
                        </div>

                        {/* Official Letterhead & Company Branding */}
                        <div className="p-5 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border border-indigo-200/50 dark:border-indigo-900/40 space-y-4">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                                    Official Letterhead &amp; Document Branding
                                </h4>
                                <p className="text-[11px] text-slate-500">Configure letterhead header banner, footer banner, corporate logo, and authorized verification stamp.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Letterhead Header Banner</label>
                                        <label className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer">
                                            <span>Upload File</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], setFormHeaderImageUrl)}
                                            />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        value={formHeaderImageUrl}
                                        onChange={e => setFormHeaderImageUrl(e.target.value)}
                                        placeholder="https://... or uploaded image data"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400">Full-width top banner image displayed across all PDF invoices and quotations.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Letterhead Footer Banner</label>
                                        <label className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer">
                                            <span>Upload File</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], setFormFooterImageUrl)}
                                            />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        value={formFooterImageUrl}
                                        onChange={e => setFormFooterImageUrl(e.target.value)}
                                        placeholder="https://... or uploaded image data"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400">Bottom decorative banner displayed at the base of every page.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Company / School Logo</label>
                                        <label className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer">
                                            <span>Upload File</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], setFormLogoUrl)}
                                            />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        value={formLogoUrl}
                                        onChange={e => setFormLogoUrl(e.target.value)}
                                        placeholder="https://... or uploaded logo data"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400">High-resolution logo embedded in document headers and receipts.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Official Stamp / Seal</label>
                                        <label className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer">
                                            <span>Upload File</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], setFormStampUrl)}
                                            />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        value={formStampUrl}
                                        onChange={e => setFormStampUrl(e.target.value)}
                                        placeholder="https://... or uploaded stamp data"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                    <p className="text-[10px] text-slate-400">Official seal applied above the signature block on approved invoices.</p>
                                </div>
                            </div>

                            {/* Letterhead Live Visual Preview Card */}
                            <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Letterhead Preview</span>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                                    {formHeaderImageUrl ? (
                                        <img src={formHeaderImageUrl} alt="Header Preview" className="w-full object-contain max-h-20 bg-white" />
                                    ) : (
                                        <div className="p-3 text-center text-xs text-slate-400 bg-slate-100 dark:bg-slate-800">
                                            [ No Header Banner Configured - Will Use Text Letterhead ]
                                        </div>
                                    )}
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {formLogoUrl ? (
                                                <img src={formLogoUrl} alt="Logo Preview" className="h-10 w-auto object-contain" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    LOGO
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-black text-xs text-slate-900 dark:text-white uppercase">{currentInstitution?.name || 'Company Name'}</p>
                                                <p className="text-[10px] text-slate-400">{currentInstitution?.address || 'Address'} • {currentInstitution?.phoneNumber || 'Phone'}</p>
                                            </div>
                                        </div>
                                        {formStampUrl && (
                                            <img src={formStampUrl} alt="Stamp Preview" className="h-10 w-auto object-contain opacity-75" />
                                        )}
                                    </div>
                                    {formFooterImageUrl ? (
                                        <img src={formFooterImageUrl} alt="Footer Preview" className="w-full object-contain max-h-12 bg-white" />
                                    ) : (
                                        <div className="p-2 text-center text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                            {currentInstitution?.name || 'EduAI'} • Official Corporate Document
                                        </div>
                                    )}
                                </div>
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
                            {/* Document Serial Number & Sequence Verification */}
                            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                                        {isQuoteMode ? 'Quotation Number' : 'Official Tax Invoice Number'}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={customDocNumber}
                                            onChange={e => setCustomDocNumber(e.target.value)}
                                            placeholder={isQuoteMode ? `${formQuotePrefix}${formQuoteNextNumber}` : `${formInvoicePrefix}${formInvoiceNextNumber}`}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-600 w-44"
                                        />
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                            Auto-Sequenced
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    Next Configured: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{isQuoteMode ? `${formQuotePrefix}${formQuoteNextNumber}` : `${formInvoicePrefix}${formInvoiceNextNumber}`}</span>
                                </div>
                            </div>

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

            {/* ===== MODAL: DOCUMENT PREVIEW WITH OFFICIAL LETTERHEAD ===== */}
            {previewInvoice && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-slate-100 dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
                        {/* Modal Action Bar */}
                        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                    {previewInvoice.status === 'quote' ? 'Quotation Preview' : 'Tax Invoice Preview'}
                                </span>
                                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                    {previewInvoice.invoiceNumber}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${(INVOICE_STATUS_CONFIG[previewInvoice.status] || INVOICE_STATUS_CONFIG.pending).bg} ${(INVOICE_STATUS_CONFIG[previewInvoice.status] || INVOICE_STATUS_CONFIG.pending).color}`}>
                                    {(INVOICE_STATUS_CONFIG[previewInvoice.status] || INVOICE_STATUS_CONFIG.pending).label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownloadDocument(previewInvoice)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all"
                                >
                                    <DocumentArrowDownIcon className="w-4 h-4" /> Download PDF
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Print
                                </button>
                                <button
                                    onClick={() => setPreviewInvoice(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Document Sheet Body */}
                        <div className="p-4 sm:p-8 overflow-y-auto flex-grow bg-slate-100 dark:bg-slate-900">
                            <div className="bg-white text-slate-900 rounded-2xl shadow-xl max-w-3xl mx-auto overflow-hidden border border-slate-200 print:border-none print:shadow-none">
                                {/* Letterhead Header Banner */}
                                {formHeaderImageUrl ? (
                                    <div className="w-full bg-slate-50 border-b border-slate-200 overflow-hidden">
                                        <img src={formHeaderImageUrl} alt="Official Letterhead Banner" className="w-full object-contain max-h-36 block" />
                                    </div>
                                ) : (
                                    <div className="p-6 border-b border-slate-200 flex justify-between items-start gap-4 bg-slate-50/50">
                                        <div className="flex items-center gap-4">
                                            {(formLogoUrl || currentInstitution?.logoUrl || logoUrl) && (
                                                <img
                                                    src={formLogoUrl || currentInstitution?.logoUrl || logoUrl || ''}
                                                    alt="Institution Logo"
                                                    className="h-16 w-auto object-contain max-w-[120px]"
                                                />
                                            )}
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{currentInstitution?.name || 'Corporate Invoicing Hub'}</h2>
                                                <p className="text-xs text-slate-500">{currentInstitution?.address || 'P.O. Box 100, City'}</p>
                                                <p className="text-xs text-slate-500">{currentInstitution?.phoneNumber || '0700000000'} | {currentInstitution?.email || 'billing@company.com'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Document</span>
                                            <h3 className="text-xl font-black text-indigo-700 uppercase tracking-tight">{previewInvoice.status === 'quote' ? 'Quotation' : 'Tax Invoice'}</h3>
                                            <p className="font-mono font-black text-sm text-slate-900">{previewInvoice.invoiceNumber}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Header details bar when header banner exists */}
                                {formHeaderImageUrl && (
                                    <div className="px-8 pt-6 pb-2 flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            {(formLogoUrl || currentInstitution?.logoUrl || logoUrl) && (
                                                <img
                                                    src={formLogoUrl || currentInstitution?.logoUrl || logoUrl || ''}
                                                    alt="Logo"
                                                    className="h-12 w-auto object-contain max-w-[100px]"
                                                />
                                            )}
                                            <div>
                                                <h3 className="font-black text-slate-900 text-sm uppercase">{currentInstitution?.name}</h3>
                                                <p className="text-[11px] text-slate-500">{currentInstitution?.email || 'billing@company.com'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-lg font-black uppercase text-indigo-700 tracking-wider">
                                                {previewInvoice.status === 'quote' ? 'Quotation / Estimate' : 'Tax Invoice'}
                                            </h2>
                                            <p className="font-mono font-black text-sm text-slate-900">{previewInvoice.invoiceNumber}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Invoice Metadata and Bill To Block */}
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Billed To (Client / Customer)</span>
                                            <h4 className="text-base font-black text-slate-900">{previewInvoice.clientName || 'Corporate Client'}</h4>
                                            {previewInvoice.clientAddress && <p className="text-xs text-slate-600 mt-0.5">{previewInvoice.clientAddress}</p>}
                                            {previewInvoice.clientTaxPin && <p className="text-xs font-mono text-slate-500">PIN: {previewInvoice.clientTaxPin}</p>}
                                            {previewInvoice.clientEmail && <p className="text-xs text-slate-600">{previewInvoice.clientEmail}</p>}
                                            {previewInvoice.clientPhone && <p className="text-xs text-slate-600">{previewInvoice.clientPhone}</p>}
                                        </div>
                                        <div className="space-y-1 text-right md:border-l md:border-slate-200 md:pl-6">
                                            <div className="flex justify-between md:justify-end gap-3 text-xs">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">Issue Date:</span>
                                                <span className="font-bold text-slate-800">{previewInvoice.issueDate}</span>
                                            </div>
                                            <div className="flex justify-between md:justify-end gap-3 text-xs">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">{previewInvoice.status === 'quote' ? 'Valid Until:' : 'Due Date:'}</span>
                                                <span className="font-bold text-slate-800">{previewInvoice.dueDate}</span>
                                            </div>
                                            <div className="flex justify-between md:justify-end gap-3 text-xs">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">Currency:</span>
                                                <span className="font-bold font-mono text-slate-800">{previewInvoice.currency || formCurrency || 'KES'}</span>
                                            </div>
                                            <div className="flex justify-between md:justify-end gap-3 text-xs">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">Status:</span>
                                                <span className="font-black uppercase text-indigo-700">{previewInvoice.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Line Items Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                                            <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                                                <tr>
                                                    <th className="p-3">#</th>
                                                    <th className="p-3">Item / Service Description</th>
                                                    <th className="p-3 text-center">Qty</th>
                                                    <th className="p-3 text-right">Unit Price</th>
                                                    <th className="p-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {(previewInvoice.items || []).map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-slate-800">{item.description}</td>
                                                        <td className="p-3 text-center font-mono">{item.quantity}</td>
                                                        <td className="p-3 text-right font-mono">{previewInvoice.currency || formCurrency} {Number(item.unitPrice).toLocaleString()}</td>
                                                        <td className="p-3 text-right font-mono font-bold">{previewInvoice.currency || formCurrency} {Number(item.amount).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals & Calculations */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                                        {/* Payment instructions */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2 flex-grow max-w-md">
                                            <h5 className="font-black uppercase text-[10px] tracking-wider text-slate-500">Payment &amp; Settlement Details</h5>
                                            {formBankName && (
                                                <p className="text-slate-700 text-[11px]">
                                                    <strong>Bank:</strong> {formBankName} | <strong>A/C:</strong> {formAccountNumber} ({formAccountName})
                                                </p>
                                            )}
                                            {formMpesaPaybill && (
                                                <p className="text-slate-700 text-[11px]">
                                                    <strong>M-Pesa Paybill:</strong> {formMpesaPaybill} | <strong>Account:</strong> {previewInvoice.invoiceNumber}
                                                </p>
                                            )}
                                            {formMpesaTill && (
                                                <p className="text-slate-700 text-[11px]">
                                                    <strong>M-Pesa Till:</strong> {formMpesaTill}
                                                </p>
                                            )}
                                            {previewInvoice.terms && (
                                                <p className="text-slate-500 text-[10px] italic border-t border-slate-200 pt-1.5 mt-1.5">
                                                    {previewInvoice.terms}
                                                </p>
                                            )}
                                        </div>

                                        {/* Numbers */}
                                        <div className="w-full sm:w-64 space-y-2 text-xs">
                                            <div className="flex justify-between text-slate-600">
                                                <span>Subtotal:</span>
                                                <span className="font-mono font-bold">{previewInvoice.currency || formCurrency} {Number(previewInvoice.subtotal || previewInvoice.totalAmount).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>VAT / Tax ({previewInvoice.taxRate || 0}%):</span>
                                                <span className="font-mono font-bold">{previewInvoice.currency || formCurrency} {Number(previewInvoice.taxAmount || 0).toLocaleString()}</span>
                                            </div>
                                            {Number(previewInvoice.discountAmount) > 0 && (
                                                <div className="flex justify-between text-emerald-600 font-bold">
                                                    <span>Discount:</span>
                                                    <span className="font-mono">- {previewInvoice.currency || formCurrency} {Number(previewInvoice.discountAmount).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-black text-slate-900">
                                                <span>Total Due:</span>
                                                <span className="font-mono text-indigo-700">{previewInvoice.currency || formCurrency} {Number(previewInvoice.totalAmount).toLocaleString()}</span>
                                            </div>
                                            {previewInvoice.status !== 'quote' && (
                                                <>
                                                    <div className="flex justify-between text-emerald-600 text-xs">
                                                        <span>Amount Cleared:</span>
                                                        <span className="font-mono font-bold">{previewInvoice.currency || formCurrency} {Number(previewInvoice.amountPaid || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-rose-600 font-bold text-xs border-t border-slate-200 pt-1">
                                                        <span>Balance Remaining:</span>
                                                        <span className="font-mono font-black">{previewInvoice.currency || formCurrency} {Math.max(0, Number(previewInvoice.totalAmount) - (Number(previewInvoice.amountPaid) || 0)).toLocaleString()}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stamp & Authorized Signatory Block */}
                                    <div className="pt-6 flex justify-between items-end border-t border-slate-100">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Electronic Verification</p>
                                            <p className="text-[11px] text-slate-500">Generated securely by EduAI Invoicing Engine. Valid without signature.</p>
                                        </div>
                                        <div className="text-center space-y-1">
                                            {(formStampUrl || currentInstitution?.letterheadConfig?.stampImageUrl) && (
                                                <img
                                                    src={formStampUrl || currentInstitution?.letterheadConfig?.stampImageUrl || ''}
                                                    alt="Official Stamp"
                                                    className="h-16 w-auto object-contain mx-auto opacity-80"
                                                />
                                            )}
                                            <div className="w-40 border-t border-slate-400 mt-2 pt-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Authorized Signature</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Letterhead Footer Banner */}
                                {formFooterImageUrl ? (
                                    <div className="w-full bg-slate-50 border-t border-slate-200 overflow-hidden">
                                        <img src={formFooterImageUrl} alt="Official Letterhead Footer" className="w-full object-contain max-h-24 block" />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400">
                                        {currentInstitution?.name || 'EduAI'} • Official Corporate Document
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: MODERN ATTRACTIVE CORPORATE RECEIPT PREVIEW ===== */}
            {previewReceipt && (() => {
                const matchingInv = invoices.find(i => i.id === previewReceipt.invoiceId);
                const client = clients.find(c => c.id === matchingInv?.clientId);
                const receiptInst = institutionMap.get(previewReceipt.institutionId || '') || currentInstitution;
                const docCurrency = matchingInv?.currency || formCurrency || 'KES';
                const invoiceTotal = Number(matchingInv?.totalAmount || previewReceipt.amountPaid);
                const invoicePaidTotal = Number(matchingInv?.amountPaid || previewReceipt.amountPaid);
                const invoiceRemaining = matchingInv ? Math.max(0, invoiceTotal - invoicePaidTotal) : 0;
                const isFullySettled = invoiceRemaining <= 0;
                const customerName = matchingInv?.clientName || client?.clientName || (previewReceipt as any).receivedFrom || 'Commercial Client';
                const customerPhone = client?.phone || matchingInv?.clientPhone || '—';
                const customerEmail = client?.email || matchingInv?.clientEmail || '—';
                const customerAddress = client?.address || matchingInv?.clientAddress || '—';
                const customerTaxPin = client?.taxPin || matchingInv?.clientTaxPin || '—';
                const authHash = `REC-${previewReceipt.receiptNumber}-${(previewReceipt.id || '').slice(-6).toUpperCase()}-${(previewReceipt.relatedTransactionId || 'TXN').slice(-6).toUpperCase()}`;

                return (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[94vh]">
                            {/* Modal Action Bar */}
                            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <ShieldCheckIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Official Settlement Receipt</span>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Cleared &amp; Settled
                                            </span>
                                        </div>
                                        <p className="font-mono font-black text-slate-900 dark:text-white text-sm">
                                            {previewReceipt.receiptNumber}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownloadReceiptPdf(previewReceipt)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all"
                                    >
                                        <DocumentArrowDownIcon className="w-4 h-4" /> Download PDF
                                    </button>
                                    <button
                                        onClick={() => handleShareReceiptViaWhatsApp(previewReceipt)}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all"
                                        title="Share Receipt via WhatsApp"
                                    >
                                        <span>💬</span> WhatsApp
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                    >
                                        <PrinterIcon className="w-4 h-4" /> Print
                                    </button>
                                    <button
                                        onClick={() => setPreviewReceipt(null)}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"
                                        title="Close"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Document Sheet Body */}
                            <div className="p-4 sm:p-8 overflow-y-auto flex-grow bg-slate-100 dark:bg-slate-900">
                                <div className="bg-white text-slate-900 rounded-2xl shadow-xl max-w-3xl mx-auto overflow-hidden border border-slate-200 print:border-none print:shadow-none print:m-0">
                                    {/* Letterhead Header Banner */}
                                    {formHeaderImageUrl ? (
                                        <div className="w-full bg-slate-50 border-b border-slate-200 overflow-hidden">
                                            <img src={formHeaderImageUrl} alt="Official Letterhead Banner" className="w-full object-contain max-h-36 block" />
                                        </div>
                                    ) : (
                                        <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-4 bg-gradient-to-br from-slate-50 via-white to-emerald-50/20">
                                            <div className="flex items-center gap-4">
                                                {(formLogoUrl || receiptInst?.logoUrl || logoUrl) && (
                                                    <img
                                                        src={formLogoUrl || receiptInst?.logoUrl || logoUrl || ''}
                                                        alt="Institution Logo"
                                                        className="h-16 w-auto object-contain max-w-[120px] rounded-lg p-1 bg-white border border-slate-200 shadow-sm"
                                                    />
                                                )}
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Enterprise Commercial Billing</span>
                                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{receiptInst?.name || 'Corporate Invoicing Hub'}</h2>
                                                    <p className="text-xs text-slate-500">{receiptInst?.address || 'P.O. Box 100, City, Kenya'}</p>
                                                    <p className="text-xs text-slate-500">{receiptInst?.phoneNumber || '0700000000'} | {receiptInst?.email || 'billing@company.com'}</p>
                                                    {(receiptInst as any)?.taxPin && (
                                                        <p className="text-xs font-mono font-bold text-slate-600">TAX PIN / KRA: {(receiptInst as any).taxPin}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right self-stretch sm:self-auto sm:min-w-[200px]">
                                                <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-widest mb-1">
                                                    Official Corporate Receipt
                                                </div>
                                                <p className="font-mono font-black text-lg text-slate-900">{previewReceipt.receiptNumber}</p>
                                                <p className="text-xs text-slate-500">Date: <span className="font-bold text-slate-700">{previewReceipt.paymentDate}</span></p>
                                                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                    <span>✓</span> Payment Cleared
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Key Transaction Metrics Ribbon */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 bg-slate-50 border-b border-slate-200 text-xs">
                                        <div className="p-3.5">
                                            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Payment Date</span>
                                            <span className="font-bold text-slate-800">{previewReceipt.paymentDate}</span>
                                        </div>
                                        <div className="p-3.5">
                                            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Settlement Method</span>
                                            <span className="font-bold text-slate-800">{previewReceipt.paymentMethod || 'Electronic Transfer'}</span>
                                        </div>
                                        <div className="p-3.5">
                                            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Channel / Bank Ref</span>
                                            <span className="font-mono font-bold text-indigo-700 truncate block">
                                                {previewReceipt.relatedTransactionId || previewReceipt.receiptNumber}
                                            </span>
                                        </div>
                                        <div className="p-3.5">
                                            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Audit Status</span>
                                            <span className="font-black text-emerald-600 flex items-center gap-1">
                                                <CheckCircleIcon className="w-3.5 h-3.5" /> Cleared &amp; Verified
                                            </span>
                                        </div>
                                    </div>

                                    {/* Body Container */}
                                    <div className="p-6 sm:p-8 space-y-6">
                                        {/* Received From Client Card */}
                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/80">
                                            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                    <BuildingOfficeIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    Received With Thanks From (Client / Payer)
                                                </span>
                                                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    Client ID: {client?.id || matchingInv?.clientId || 'COMMERCIAL'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <h3 className="text-base font-black text-slate-900 tracking-tight">{customerName}</h3>
                                                    {client?.contactPerson && (
                                                        <p className="text-slate-600 text-xs mt-0.5">
                                                            <strong className="text-slate-500 font-semibold">Attn:</strong> {client.contactPerson}
                                                        </p>
                                                    )}
                                                    <p className="text-slate-600 mt-1">
                                                        <strong className="text-slate-500 font-semibold">Address:</strong> {customerAddress}
                                                    </p>
                                                </div>
                                                <div className="space-y-1 sm:text-right">
                                                    <p className="text-slate-600">
                                                        <strong className="text-slate-500 font-semibold">Tax PIN / KRA:</strong> <span className="font-mono font-bold text-slate-800">{customerTaxPin}</span>
                                                    </p>
                                                    <p className="text-slate-600">
                                                        <strong className="text-slate-500 font-semibold">Email:</strong> {customerEmail}
                                                    </p>
                                                    <p className="text-slate-600">
                                                        <strong className="text-slate-500 font-semibold">Phone:</strong> {customerPhone}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Particulars Table */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Settlement Details &amp; Accounting Breakdown
                                                </h4>
                                                {matchingInv && (
                                                    <span className="text-[10px] text-slate-500">
                                                        Linked Tax Invoice: <strong className="font-mono text-indigo-700 font-bold">{matchingInv.invoiceNumber}</strong>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider border-b border-slate-200">
                                                        <tr>
                                                            <th className="p-3">Payment Narration / Description</th>
                                                            <th className="p-3 text-center">Invoice Ref</th>
                                                            <th className="p-3 text-right">Invoiced Total</th>
                                                            <th className="p-3 text-right">Amount Cleared</th>
                                                            <th className="p-3 text-right">Invoice Balance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        <tr>
                                                            <td className="p-3.5">
                                                                <p className="font-bold text-slate-800">
                                                                    {previewReceipt.paidFor || 'Official Corporate Services Settlement'}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                                    Processed via {previewReceipt.paymentMethod || 'Electronic Settlement'} • Ref: {previewReceipt.relatedTransactionId || previewReceipt.receiptNumber}
                                                                </p>
                                                            </td>
                                                            <td className="p-3.5 text-center font-mono font-bold text-indigo-600">
                                                                {matchingInv?.invoiceNumber || 'Direct Payment'}
                                                            </td>
                                                            <td className="p-3.5 text-right font-mono text-slate-600">
                                                                {docCurrency} {invoiceTotal.toLocaleString()}
                                                            </td>
                                                            <td className="p-3.5 text-right font-mono font-black text-emerald-600 text-sm">
                                                                {docCurrency} {Number(previewReceipt.amountPaid).toLocaleString()}
                                                            </td>
                                                            <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                                                                {docCurrency} {invoiceRemaining.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Highlight Box: Total Amount Cleared & Amount in Words */}
                                        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                                            {/* Decorative watermark */}
                                            <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10 pointer-events-none">
                                                <ShieldCheckIcon className="w-48 h-48 text-white" />
                                            </div>
                                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 block mb-1">
                                                        Total Amount Received &amp; Cleared
                                                    </span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                                                            {docCurrency} {Number(previewReceipt.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/30 text-white border border-emerald-300/40">
                                                            Full Value
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="md:text-right max-w-md">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 block mb-0.5">
                                                        Amount in Words
                                                    </span>
                                                    <p className="text-xs font-semibold text-emerald-50 italic leading-relaxed">
                                                        "{amountToWords(Number(previewReceipt.amountPaid), docCurrency)}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Invoice Clearance Status Notice Card */}
                                        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                                            isFullySettled
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                                : 'bg-amber-50 border-amber-200 text-amber-900'
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    isFullySettled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-xs uppercase tracking-wide">
                                                        {isFullySettled
                                                            ? 'Invoice Paid in Full — Account Fully Settled'
                                                            : 'Partial Payment Cleared — Outstanding Balance Pending'}
                                                    </h5>
                                                    <p className="text-[11px] opacity-80 mt-0.5">
                                                        {isFullySettled
                                                            ? `All obligations for Tax Invoice ${matchingInv?.invoiceNumber || ''} have been satisfied in full.`
                                                            : `Remaining balance of ${docCurrency} ${invoiceRemaining.toLocaleString()} remains due per corporate terms.`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[9px] font-black uppercase tracking-wider block opacity-70">Remaining Balance</span>
                                                <span className="font-mono font-black text-sm">
                                                    {docCurrency} {invoiceRemaining.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Security, Verification QR & Authorized Stamp */}
                                        <div className="pt-4 flex flex-col sm:flex-row justify-between items-end gap-6 border-t border-slate-200">
                                            {/* Cryptographic QR & Audit Info */}
                                            <div className="flex items-center gap-4">
                                                {/* Visual SVG QR Code */}
                                                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                                                    <svg className="w-20 h-20 text-slate-850" viewBox="0 0 100 100" fill="currentColor">
                                                        {/* Top-left corner finder pattern */}
                                                        <rect x="5" y="5" width="28" height="28" fill="currentColor" rx="4" />
                                                        <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                                                        <rect x="13" y="13" width="12" height="12" fill="currentColor" rx="1" />

                                                        {/* Top-right corner finder pattern */}
                                                        <rect x="67" y="5" width="28" height="28" fill="currentColor" rx="4" />
                                                        <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                                                        <rect x="75" y="13" width="12" height="12" fill="currentColor" rx="1" />

                                                        {/* Bottom-left corner finder pattern */}
                                                        <rect x="5" y="67" width="28" height="28" fill="currentColor" rx="4" />
                                                        <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                                                        <rect x="13" y="75" width="12" height="12" fill="currentColor" rx="1" />

                                                        {/* Timing and alignment patterns */}
                                                        <rect x="38" y="10" width="5" height="5" />
                                                        <rect x="48" y="10" width="5" height="5" />
                                                        <rect x="58" y="10" width="5" height="5" />
                                                        <rect x="10" y="38" width="5" height="5" />
                                                        <rect x="10" y="48" width="5" height="5" />
                                                        <rect x="10" y="58" width="5" height="5" />

                                                        {/* Data matrix dots */}
                                                        <rect x="40" y="40" width="6" height="6" rx="1" />
                                                        <rect x="50" y="38" width="8" height="5" />
                                                        <rect x="62" y="42" width="6" height="6" />
                                                        <rect x="42" y="52" width="6" height="6" />
                                                        <rect x="52" y="50" width="6" height="8" rx="1" />
                                                        <rect x="62" y="52" width="6" height="6" />
                                                        <rect x="72" y="42" width="5" height="6" />
                                                        <rect x="80" y="50" width="6" height="6" />
                                                        <rect x="72" y="60" width="6" height="6" />
                                                        <rect x="82" y="70" width="5" height="5" />
                                                        <rect x="68" y="75" width="8" height="5" />
                                                        <rect x="80" y="80" width="6" height="8" />
                                                        <rect x="40" y="70" width="6" height="6" />
                                                        <rect x="50" y="72" width="8" height="6" />
                                                        <rect x="40" y="82" width="6" height="6" />
                                                        <rect x="52" y="82" width="6" height="6" />
                                                    </svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                                            Cryptographic Verification
                                                        </p>
                                                    </div>
                                                    <p className="font-mono text-[9px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {authHash}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 max-w-xs leading-tight">
                                                        Scan QR code or use the authentication hash to verify payment settlement validity on the audit portal.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Stamp & Authorized Signatory */}
                                            <div className="text-center space-y-1 self-center sm:self-end">
                                                {(formStampUrl || receiptInst?.letterheadConfig?.stampImageUrl) ? (
                                                    <img
                                                        src={formStampUrl || receiptInst?.letterheadConfig?.stampImageUrl || ''}
                                                        alt="Official Stamp"
                                                        className="h-16 w-auto object-contain mx-auto opacity-85"
                                                    />
                                                ) : (
                                                    /* Stylized Electronic Rubber Stamp Seal */
                                                    <div className="w-28 h-28 mx-auto border-2 border-dashed border-emerald-600/70 rounded-full flex flex-col items-center justify-center p-2 text-emerald-700 bg-emerald-50/40 rotate-[-8deg] shadow-inner">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-800">EduAI Official</span>
                                                        <span className="text-[12px] font-black uppercase tracking-tighter text-emerald-600 my-0.5">CLEARED</span>
                                                        <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-700">{previewReceipt.paymentDate}</span>
                                                    </div>
                                                )}
                                                <div className="w-44 border-t border-slate-400 mt-2 pt-1 mx-auto">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                                        Authorized Finance Officer
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 block">
                                                        {currentUser?.name || 'Accounts Department'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Letterhead Footer Banner */}
                                    {formFooterImageUrl ? (
                                        <div className="w-full bg-slate-50 border-t border-slate-200 overflow-hidden">
                                            <img src={formFooterImageUrl} alt="Official Letterhead Footer" className="w-full object-contain max-h-24 block" />
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between px-8">
                                            <span>{receiptInst?.name || 'EduAI Enterprise'} • Official Corporate Settlement Document</span>
                                            <span>Issued via Secure Invoicing Gateway • Page 1 of 1</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
