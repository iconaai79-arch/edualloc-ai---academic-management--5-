import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { MpesaIcon } from '../icons/MpesaIcon';
import { ShieldIcon } from '../icons/ShieldIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { ClaimsManager } from './ClaimsManager';

interface PatientInvoice {
    id: string;
    invoiceNumber: string;
    patientId: string;
    patientName: string;
    payerType: 'Self-Pay' | 'Insurance';
    insuranceProvider?: string;
    policyNumber?: string;
    copayAmount?: number;
    items: { itemName: string; category: string; quantity: number; unitPrice: number; total: number }[];
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: 'Pending' | 'Paid' | 'Partial' | 'Overdue';
    date: string;
    paymentMethod?: 'M-Pesa' | 'Cash' | 'Card' | 'Insurance Claim';
}

const MOCK_PATIENT_INVOICES: PatientInvoice[] = [
    {
        id: 'inv_101',
        invoiceNumber: 'INV-2025-001',
        patientId: 'pat_1',
        patientName: 'John Kamau',
        payerType: 'Insurance',
        insuranceProvider: 'SHA (Social Health Authority)',
        policyNumber: 'SHA-8849-K',
        copayAmount: 500,
        items: [
            { itemName: 'General Practitioner Consultation', category: 'Consultation', quantity: 1, unitPrice: 2000, total: 2000 },
            { itemName: 'Full Blood Count (FBC) Lab Test', category: 'Diagnostics', quantity: 1, unitPrice: 3500, total: 3500 },
            { itemName: 'Amoxicillin 500mg (20 Caps)', category: 'Pharmacy', quantity: 1, unitPrice: 1200, total: 1200 }
        ],
        totalAmount: 6700,
        amountPaid: 6700,
        balance: 0,
        status: 'Paid',
        date: '2025-03-11',
        paymentMethod: 'Insurance Claim'
    },
    {
        id: 'inv_102',
        invoiceNumber: 'INV-2025-002',
        patientId: 'pat_2',
        patientName: 'Mary Wambui',
        payerType: 'Self-Pay',
        items: [
            { itemName: 'Dental Scaling & Polishing', category: 'Dental', quantity: 1, unitPrice: 4500, total: 4500 },
            { itemName: 'Paracetamol 500mg', category: 'Pharmacy', quantity: 1, unitPrice: 300, total: 300 }
        ],
        totalAmount: 4800,
        amountPaid: 0,
        balance: 4800,
        status: 'Pending',
        date: '2025-03-12'
    },
    {
        id: 'inv_103',
        invoiceNumber: 'INV-2025-003',
        patientId: 'pat_3',
        patientName: 'David Njenga',
        payerType: 'Insurance',
        insuranceProvider: 'Jubilee Insurance',
        policyNumber: 'JUB-99412',
        copayAmount: 1000,
        items: [
            { itemName: 'Inpatient Ward Admission (2 Days)', category: 'Inpatient', quantity: 2, unitPrice: 8000, total: 16000 },
            { itemName: 'IV Saline Drip & Nursing Care', category: 'Nursing', quantity: 1, unitPrice: 5000, total: 5000 }
        ],
        totalAmount: 21000,
        amountPaid: 1000,
        balance: 20000,
        status: 'Partial',
        date: '2025-03-10',
        paymentMethod: 'M-Pesa'
    }
];

export function HISBillingView({ institutionId }: { institutionId?: string }) {
    const [activeTab, setActiveTab] = useState<'invoices' | 'insurance' | 'analytics'>('invoices');
    const [billingItems, setBillingItems] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<PatientInvoice[]>(MOCK_PATIENT_INVOICES);
    const [patients, setPatients] = useState<any[]>([]);
    const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Modal states
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<PatientInvoice | null>(null);

    // New Invoice Form
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [manualPatientName, setManualPatientName] = useState('');
    const [payerType, setPayerType] = useState<'Self-Pay' | 'Insurance'>('Self-Pay');
    const [selectedInsurance, setSelectedInsurance] = useState('SHA (Social Health Authority)');
    const [policyNumber, setPolicyNumber] = useState('');
    const [copayAmount, setCopayAmount] = useState('0');
    const [lineItems, setLineItems] = useState<{ itemName: string; category: string; quantity: number; unitPrice: number }[]>([
        { itemName: 'General Consultation', category: 'Consultation', quantity: 1, unitPrice: 1500 }
    ]);

    // Payment Form
    const [paymentPhone, setPaymentPhone] = useState('0712345678');
    const [paymentMethod, setPaymentMethod] = useState<'M-Pesa' | 'Cash' | 'Card'>('M-Pesa');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!institutionId) return;
            setIsLoading(true);
            try {
                const [bItems, pData, insData] = await Promise.all([
                    apiService.fetchModuleRecords('his_billing_items', institutionId, undefined, { order: 'created_at.desc' }),
                    apiService.fetchModuleRecords('his_patients', institutionId),
                    apiService.fetchModuleRecords('his_insurance_providers', institutionId)
                ]);
                
                setPatients(pData || []);
                setInsuranceProviders(insData && insData.length > 0 ? insData : [
                    { name: 'SHA (Social Health Authority)', code: 'SHA-NAT-01' },
                    { name: 'Jubilee Insurance', code: 'JUB-MED-01' },
                    { name: 'AAR Insurance', code: 'AAR-MED-03' },
                    { name: 'APA Insurance', code: 'APA-MED-04' },
                    { name: 'UAP Old Mutual', code: 'UAP-MED-05' },
                    { name: 'Britam Health', code: 'BRIT-MED-06' }
                ]);

                if (bItems && bItems.length > 0) {
                    const enhanced = bItems.map((i: any) => ({
                        ...i,
                        patientName: pData?.find((p: any) => p.id === i.patientId)?.fullName || 'Unknown'
                    }));
                    setBillingItems(enhanced);
                }
            } catch (e) { 
                console.error("Failed to load billing records:", e); 
            } finally { 
                setIsLoading(false); 
            }
        };
        loadData();
    }, [institutionId]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (inv.insuranceProvider || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchTerm, statusFilter]);

    // Financial Metrics
    const totalRevenue = useMemo(() => invoices.reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
    const totalCollected = useMemo(() => invoices.reduce((sum, inv) => sum + inv.amountPaid, 0), [invoices]);
    const totalPendingInsurance = useMemo(() => invoices.filter(inv => inv.payerType === 'Insurance' && inv.status !== 'Paid').reduce((sum, inv) => sum + inv.balance, 0), [invoices]);
    const totalPendingSelfPay = useMemo(() => invoices.filter(inv => inv.payerType === 'Self-Pay' && inv.status !== 'Paid').reduce((sum, inv) => sum + inv.balance, 0), [invoices]);

    const handleAddLineItem = () => {
        setLineItems(prev => [...prev, { itemName: '', category: 'Consultation', quantity: 1, unitPrice: 1000 }]);
    };

    const handleRemoveLineItem = (index: number) => {
        setLineItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleLineItemChange = (index: number, field: string, value: any) => {
        setLineItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const newInvoiceSubtotal = useMemo(() => {
        return lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    }, [lineItems]);

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        const pObj = patients.find(p => p.id === selectedPatientId);
        const pName = pObj ? pObj.fullName : (manualPatientName || 'Walk-in Patient');
        
        const newInv: PatientInvoice = {
            id: `inv_${Date.now()}`,
            invoiceNumber: `INV-2025-${Math.floor(100 + Math.random() * 900)}`,
            patientId: selectedPatientId || 'walkin',
            patientName: pName,
            payerType,
            insuranceProvider: payerType === 'Insurance' ? selectedInsurance : undefined,
            policyNumber: payerType === 'Insurance' ? policyNumber : undefined,
            copayAmount: payerType === 'Insurance' ? Number(copayAmount) : 0,
            items: lineItems.map(item => ({ ...item, total: Number(item.quantity) * Number(item.unitPrice) })),
            totalAmount: newInvoiceSubtotal,
            amountPaid: 0,
            balance: newInvoiceSubtotal,
            status: 'Pending',
            date: new Date().toISOString().split('T')[0]
        };

        setInvoices(prev => [newInv, ...prev]);

        if (institutionId) {
            try {
                await apiService.saveModuleRecord('his_billing_items', {
                    institution_id: institutionId,
                    patientId: newInv.patientId,
                    patientName: newInv.patientName,
                    invoiceNumber: newInv.invoiceNumber,
                    payerType: newInv.payerType,
                    totalAmount: newInv.totalAmount,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
                
                // If insurance, also log to claims
                if (payerType === 'Insurance') {
                    await apiService.saveModuleRecord('his_claims', {
                        institution_id: institutionId,
                        patientId: newInv.patientId,
                        patientName: newInv.patientName,
                        insuranceProvider: selectedInsurance,
                        policyNumber,
                        claimAmount: newInv.totalAmount - Number(copayAmount),
                        status: 'Pending',
                        submissionDate: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Failed to save invoice to Supabase:", err);
            }
        }

        setIsGenerateModalOpen(false);
        alert(`Invoice ${newInv.invoiceNumber} created successfully!`);
    };

    const handleProcessPayment = async () => {
        if (!selectedInvoice) return;
        setIsProcessingPayment(true);

        setTimeout(async () => {
            const updatedInv: PatientInvoice = {
                ...selectedInvoice,
                amountPaid: selectedInvoice.totalAmount,
                balance: 0,
                status: 'Paid',
                paymentMethod
            };

            setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? updatedInv : inv));
            
            if (institutionId) {
                try {
                    await apiService.saveModuleRecord('his_billing_items', {
                        institution_id: institutionId,
                        id: selectedInvoice.id,
                        status: 'paid',
                        paymentMethod,
                        paidAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.error("Failed to record payment in Supabase:", err);
                }
            }

            setIsProcessingPayment(false);
            setIsPaymentModalOpen(false);
            alert(`Payment of KES ${selectedInvoice.totalAmount.toLocaleString()} recorded via ${paymentMethod}! Invoice marked as PAID.`);
        }, 1200);
    };

    return (
        <div className="animate-fade-in-up space-y-8 pb-12">
            {/* Top Bar Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        Finance &amp; <span className="text-rose-500">Invoicing Hub</span>
                    </h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">
                        Comprehensive Patient Checkout, Direct Billing &amp; Insurance Company Claims Console
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => setActiveTab('invoices')}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                    >
                        Patient Invoices
                    </button>
                    <button 
                        onClick={() => setActiveTab('insurance')}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'insurance' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                    >
                        Insurance &amp; SHA Claims
                    </button>
                    <button 
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <PlusIcon className="w-4 h-4" /> Generate Invoice
                    </button>
                </div>
            </div>

            {/* Financial Overview Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-transparent">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Total Invoiced Revenue</p>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                            <CreditCardIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">KES {totalRevenue.toLocaleString()}</p>
                            <p className="text-[9px] font-bold text-slate-400">All Patient Invoices</p>
                        </div>
                    </div>
                </div>

                <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Collected (M-Pesa / Cash)</p>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                            <MpesaIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-emerald-500">KES {totalCollected.toLocaleString()}</p>
                            <p className="text-[9px] font-bold text-slate-400">Self-Pay &amp; Copays Paid</p>
                        </div>
                    </div>
                </div>

                <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden bg-gradient-to-br from-rose-500/10 to-transparent">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Insurance Pending (SHA/Pvt)</p>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                            <ShieldIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-rose-400">KES {totalPendingInsurance.toLocaleString()}</p>
                            <p className="text-[9px] font-bold text-slate-400">Claims Pending Payout</p>
                        </div>
                    </div>
                </div>

                <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-transparent">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Self-Pay Pending Balance</p>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-amber-400">KES {totalPendingSelfPay.toLocaleString()}</p>
                            <p className="text-[9px] font-bold text-slate-400">Outpatient Unpaid Balance</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT 1: PATIENT INVOICES */}
            {activeTab === 'invoices' && (
                <div className="space-y-6">
                    {/* Filter & Search Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-white/10">
                        <div className="relative w-full md:w-96">
                            <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search invoice, patient, or insurance..."
                                className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status:</span>
                            {['all', 'pending', 'paid', 'partial'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        statusFilter === st ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Invoices List Table */}
                    <div className="glass-morphism rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.02]">
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Invoice #</th>
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Patient</th>
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Payer / Insurance</th>
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Line Items</th>
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Total Amount</th>
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Paid</th>
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <span className="font-mono font-bold text-xs text-indigo-400">{inv.invoiceNumber}</span>
                                                <p className="text-[9px] text-slate-500">{inv.date}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{inv.patientName}</p>
                                            </td>
                                            <td className="p-5">
                                                {inv.payerType === 'Insurance' ? (
                                                    <div>
                                                        <span className="text-[10px] font-black text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                                            {inv.insuranceProvider}
                                                        </span>
                                                        {inv.policyNumber && <p className="text-[9px] font-mono text-slate-400 mt-1">Pol: {inv.policyNumber}</p>}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                        Self-Pay (Direct Cash/M-Pesa)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <p className="text-xs font-bold text-slate-300">{inv.items.length} services / meds</p>
                                                <p className="text-[9px] text-slate-500 truncate max-w-[180px]">
                                                    {inv.items.map(i => i.itemName).join(', ')}
                                                </p>
                                            </td>
                                            <td className="p-5 font-black text-sm text-slate-900 dark:text-white">
                                                KES {inv.totalAmount.toLocaleString()}
                                            </td>
                                            <td className="p-5 font-bold text-xs text-emerald-400">
                                                KES {inv.amountPaid.toLocaleString()}
                                            </td>
                                            <td className="p-5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                    inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    inv.status === 'Partial' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {inv.status !== 'Paid' && (
                                                        <button 
                                                            onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                                                            className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-1 shadow-md shadow-emerald-500/10"
                                                        >
                                                            <MpesaIcon className="w-3.5 h-3.5" /> Pay Now
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => alert(`Printing Invoice ${inv.invoiceNumber} for ${inv.patientName}...`)}
                                                        className="p-2 glass-morphism rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                        title="Print PDF Invoice"
                                                    >
                                                        <FileTextIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-slate-500 italic text-xs uppercase font-black tracking-widest">
                                                No patient invoices match your search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 2: INSURANCE & SHA CLAIMS */}
            {activeTab === 'insurance' && (
                <div className="space-y-6">
                    <ClaimsManager institutionId={institutionId} />
                </div>
            )}

            {/* MODAL: GENERATE INVOICE */}
            {isGenerateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-8 max-w-3xl w-full space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Generate Patient <span className="text-emerald-400">Invoice</span></h3>
                                <p className="text-xs text-slate-400">Issue billing for consultations, medications, lab tests, and hospital admission</p>
                            </div>
                            <button onClick={() => setIsGenerateModalOpen(false)} className="p-2 text-slate-400 hover:text-white">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvoice} className="space-y-6">
                            {/* Patient Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Registered Patient</label>
                                    <select 
                                        value={selectedPatientId}
                                        onChange={(e) => setSelectedPatientId(e.target.value)}
                                        className="w-full p-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">-- Walk-in / Direct Name Entry --</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.fullName} ({p.shaNumber || 'No SHA'})</option>
                                        ))}
                                    </select>
                                </div>
                                {!selectedPatientId && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Walk-in Patient Full Name</label>
                                        <input 
                                            type="text"
                                            value={manualPatientName}
                                            onChange={(e) => setManualPatientName(e.target.value)}
                                            placeholder="e.g. Samuel Otieno"
                                            className="w-full p-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                            required={!selectedPatientId}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Payer Configuration */}
                            <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Payer Type</label>
                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setPayerType('Self-Pay')}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            payerType === 'Self-Pay' ? 'bg-emerald-500 text-slate-950' : 'bg-black/40 text-slate-400 border border-white/10'
                                        }`}
                                    >
                                        Self-Pay (Cash / M-Pesa)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPayerType('Insurance')}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            payerType === 'Insurance' ? 'bg-rose-500 text-white' : 'bg-black/40 text-slate-400 border border-white/10'
                                        }`}
                                    >
                                        Insurance / SHA Cover
                                    </button>
                                </div>

                                {payerType === 'Insurance' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Insurance Provider</label>
                                            <select 
                                                value={selectedInsurance}
                                                onChange={(e) => setSelectedInsurance(e.target.value)}
                                                className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white"
                                            >
                                                {insuranceProviders.map((ins, i) => (
                                                    <option key={i} value={ins.name}>{ins.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Policy / Member SHA #</label>
                                            <input 
                                                type="text"
                                                value={policyNumber}
                                                onChange={(e) => setPolicyNumber(e.target.value)}
                                                placeholder="e.g. SHA-90812-B"
                                                className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Co-Pay Amount (KES)</label>
                                            <input 
                                                type="number"
                                                value={copayAmount}
                                                onChange={(e) => setCopayAmount(e.target.value)}
                                                placeholder="500"
                                                className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Itemized Line Items */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Line Items</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAddLineItem}
                                        className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" /> Add Service / Med
                                    </button>
                                </div>

                                {lineItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-black/40 p-3 rounded-2xl border border-white/5">
                                        <input 
                                            type="text"
                                            value={item.itemName}
                                            onChange={(e) => handleLineItemChange(idx, 'itemName', e.target.value)}
                                            placeholder="Service / Medication Name"
                                            className="flex-2 w-full p-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600"
                                            required
                                        />
                                        <select 
                                            value={item.category}
                                            onChange={(e) => handleLineItemChange(idx, 'category', e.target.value)}
                                            className="w-full sm:w-36 p-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white"
                                        >
                                            <option value="Consultation">Consultation</option>
                                            <option value="Diagnostics">Diagnostics/Lab</option>
                                            <option value="Pharmacy">Pharmacy</option>
                                            <option value="Inpatient">Inpatient Ward</option>
                                            <option value="Dental">Dental</option>
                                            <option value="Ophthalmology">Ophthalmology</option>
                                        </select>
                                        <input 
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                                            placeholder="QTY"
                                            min="1"
                                            className="w-full sm:w-20 p-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white text-center"
                                            required
                                        />
                                        <input 
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                                            placeholder="Price"
                                            className="w-full sm:w-28 p-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white"
                                            required
                                        />
                                        {lineItems.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveLineItem(idx)} className="p-2 text-rose-400 hover:text-rose-300">
                                                <XCircleIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Total Summary */}
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Total Invoice Amount</p>
                                    <p className="text-2xl font-black text-white">KES {newInvoiceSubtotal.toLocaleString()}</p>
                                </div>
                                <button 
                                    type="submit"
                                    className="px-8 py-3.5 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Issue &amp; Save Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: PROCESS PAYMENT */}
            {isPaymentModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-8 max-w-lg w-full space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Record <span className="text-emerald-400">Payment</span></h3>
                                <p className="text-xs text-slate-400">Invoice #{selectedInvoice.invoiceNumber} • {selectedInvoice.patientName}</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 text-slate-400 hover:text-white">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-2">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Amount Payable</p>
                            <p className="text-3xl font-black text-white">KES {selectedInvoice.totalAmount.toLocaleString()}</p>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Channel</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['M-Pesa', 'Cash', 'Card'] as const).map(ch => (
                                    <button
                                        key={ch}
                                        type="button"
                                        onClick={() => setPaymentMethod(ch)}
                                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            paymentMethod === ch ? 'bg-indigo-600 text-white' : 'bg-black/40 text-slate-400 border border-white/10'
                                        }`}
                                    >
                                        {ch}
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'M-Pesa' && (
                                <div className="space-y-2 pt-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">M-Pesa Mobile Number</label>
                                    <input 
                                        type="text"
                                        value={paymentPhone}
                                        onChange={(e) => setPaymentPhone(e.target.value)}
                                        placeholder="0712345678"
                                        className="w-full p-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                    <p className="text-[9px] text-slate-500 italic">Triggers instant STK prompt to patient handset</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleProcessPayment}
                            disabled={isProcessingPayment}
                            className="w-full py-4 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 flex justify-center items-center gap-2"
                        >
                            {isProcessingPayment ? (
                                <>
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    <span>Processing Transaction...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>Confirm KES {selectedInvoice.totalAmount.toLocaleString()} Payment</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HISBillingView;
