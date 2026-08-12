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
import { PdfViewer } from '../PdfViewer';
import { generatePatientInvoicePdf } from '../../services/pdfService';

interface PatientInvoice {
    id: string;
    invoiceNumber: string;
    patientId: string;
    patientName: string;
    payerType: 'Self-Pay' | 'Insurance' | 'Split (Co-Pay + Insurance)';
    insuranceProvider?: string;
    policyNumber?: string;
    copayAmount?: number;
    insuranceCoverAmount?: number;
    items: { itemName: string; category: string; quantity: number; unitPrice: number; total: number }[];
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: 'Pending' | 'Paid' | 'Partial' | 'Overdue';
    date: string;
    paymentMethod?: 'M-Pesa' | 'Cash' | 'Card' | 'Insurance Claim' | 'Split (Co-Pay + Claim)';
}

const MOCK_PATIENT_INVOICES: PatientInvoice[] = [
    {
        id: 'inv_101',
        invoiceNumber: 'INV-2025-001',
        patientId: 'pat_1',
        patientName: 'John Kamau',
        payerType: 'Split (Co-Pay + Insurance)',
        insuranceProvider: 'SHA (Social Health Authority)',
        policyNumber: 'SHA-8849-K',
        copayAmount: 500,
        insuranceCoverAmount: 6200,
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
        paymentMethod: 'Split (Co-Pay + Claim)'
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
        payerType: 'Split (Co-Pay + Insurance)',
        insuranceProvider: 'Jubilee Insurance',
        policyNumber: 'JUB-99412',
        copayAmount: 1000,
        insuranceCoverAmount: 20000,
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
    const [activeTab, setActiveTab] = useState<'invoices' | 'revenue' | 'statements' | 'claims' | 'accumulated_b2b' | 'insurance_remittance' | 'expenditure'>('invoices');
    const [billingItems, setBillingItems] = useState<any[]>([]);

    // ── HIS Expenditure Module State ─────────────────────────────────────
    const [expenditures, setExpenditures] = useState<any[]>([
        {
            id: 'exp_101',
            title: 'Bulk Medical Oxygen Cylinders Refill',
            category: 'Medical & Surgical Supplies',
            vendor: 'BOC Gases Kenya Ltd',
            amount: 145000,
            date: '2026-08-01',
            paymentMethod: 'Bank Transfer (EFT / RTGS)',
            voucherNo: 'EXP-2026-001',
            status: 'Paid',
            notes: '20 x 50L High Pressure Medical Oxygen cylinders for ICU & Wards'
        },
        {
            id: 'exp_102',
            title: 'Pharmaceutical Stock Replenishment (Antibiotics & Analgesics)',
            category: 'Pharmaceutical Inventory',
            vendor: 'KEMSA / Meds Kenya',
            amount: 380000,
            date: '2026-08-04',
            paymentMethod: 'Bank Transfer (EFT / RTGS)',
            voucherNo: 'EXP-2026-002',
            status: 'Paid',
            notes: 'Monthly pharmacy stock replenishment per LPO #LPO-8849'
        },
        {
            id: 'exp_103',
            title: 'Standby Generator Diesel Fuel Supply (1,000L)',
            category: 'Facility Utilities & Fuel',
            vendor: 'TotalEnergies Kenya',
            amount: 65000,
            date: '2026-08-07',
            paymentMethod: 'M-Pesa Business Paybill',
            voucherNo: 'EXP-2026-003',
            status: 'Paid',
            notes: 'Emergency backup power fuel tank refilling'
        },
        {
            id: 'exp_104',
            title: 'Outsourced Histopathology & Tumor Biopsy Tests',
            category: 'External Partner Lab Fees',
            vendor: 'Lancet Kenya / PathCare',
            amount: 92000,
            date: '2026-08-09',
            paymentMethod: 'Bank Transfer (EFT / RTGS)',
            voucherNo: 'EXP-2026-004',
            status: 'Approved',
            notes: 'Contracted referral lab test fees for July 2026'
        },
        {
            id: 'exp_105',
            title: 'Mindray Anesthesia Workstation Routine Servicing',
            category: 'Biomedical Equipment Repair',
            vendor: 'Mindray Medical Kenya',
            amount: 45000,
            date: '2026-08-11',
            paymentMethod: 'Cheque',
            voucherNo: 'EXP-2026-005',
            status: 'Pending Approval',
            notes: 'Biomedical preventive maintenance service voucher'
        }
    ]);

    const [expenseSearch, setExpenseSearch] = useState('');
    const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
    const [expenseStatusFilter, setExpenseStatusFilter] = useState('all');

    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({
        title: '',
        category: 'Medical & Surgical Supplies',
        vendor: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer (EFT / RTGS)',
        voucherNo: '',
        status: 'Paid',
        notes: ''
    });
    const [invoices, setInvoices] = useState<PatientInvoice[]>(MOCK_PATIENT_INVOICES);
    const [patients, setPatients] = useState<any[]>([]);
    const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Revenue Period Generator state
    const [revenuePeriod, setRevenuePeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
    const [customStartDate, setCustomStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

    // Accumulated B2B Insurance Invoicing State
    const [b2bInsuranceCompany, setB2bInsuranceCompany] = useState('SHA (Social Health Authority)');
    const [b2bStartDate, setB2bStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [b2bEndDate, setB2bEndDate] = useState(new Date().toISOString().slice(0, 10));

    // Remittance Posting State
    const [remittanceProvider, setRemittanceProvider] = useState('Jubilee Insurance');
    const [remittanceRefNo, setRemittanceRefNo] = useState('EFT-JUB-948102');
    const [remittanceBilledAmount, setRemittanceBilledAmount] = useState(650000);
    const [remittancePaidAmount, setRemittancePaidAmount] = useState(480000);
    const [remittanceDisallowedAmount, setRemittanceDisallowedAmount] = useState(20000);
    const [remittanceNotes, setRemittanceNotes] = useState('Partial EFT payment received per Remittance Advice #JUB-2026-08. Disallowed claims submitted for appeal.');
    const [isPostingRemittance, setIsPostingRemittance] = useState(false);
    const [remittanceLogs, setRemittanceLogs] = useState<any[]>([
        { id: 'rem_1', provider: 'Jubilee Insurance', refNo: 'EFT-JUB-948102', billed: 650000, paid: 480000, disallowed: 20000, balance: 150000, status: 'Partial Payment', date: '2026-08-10', officer: 'Mary K. (Finance)' },
        { id: 'rem_2', provider: 'SHA (Social Health Authority)', refNo: 'SHA-REM-0091', billed: 1200000, paid: 1200000, disallowed: 0, balance: 0, status: 'Fully Settled', date: '2026-08-05', officer: 'John M. (Finance)' },
    ]);

    // Insurance Statement Filter state
    const [selectedProviderFilter, setSelectedProviderFilter] = useState('all');
    
    // Modal states
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<PatientInvoice | null>(null);

    // On-Screen PDF Preview Modal State
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfPreviewUri, setPdfPreviewUri] = useState<string | null>(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('Invoice PDF Preview');

    // Incoming Doctor Orders & Prescriptions Queue
    const [doctorOrdersQueue, setDoctorOrdersQueue] = useState<any[]>([
        {
            id: 'ord_101',
            patientName: 'Dr. Prescribed: Grace Wanjiru',
            patientId: 'pat_10',
            doctorName: 'Dr. John Smith',
            type: 'Prescription',
            items: [
                { itemName: 'Amoxicillin 500mg Caps', category: 'Pharmacy', quantity: 2, unitPrice: 600, total: 1200 },
                { itemName: 'Paracetamol 500mg Tabs', category: 'Pharmacy', quantity: 1, unitPrice: 200, total: 200 }
            ],
            totalAmount: 1400,
            time: '10 mins ago'
        },
        {
            id: 'ord_102',
            patientName: 'Dr. Ordered: Kevin Otieno',
            patientId: 'pat_11',
            doctorName: 'Dr. Sarah Omondi',
            type: 'Lab Test & Meds',
            items: [
                { itemName: 'Full Blood Count (FBC)', category: 'Diagnostics', quantity: 1, unitPrice: 2500, total: 2500 },
                { itemName: 'Ciprofloxacin 500mg', category: 'Pharmacy', quantity: 1, unitPrice: 1500, total: 1500 }
            ],
            totalAmount: 4000,
            time: '25 mins ago'
        }
    ]);

    // New Invoice Form
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [manualPatientName, setManualPatientName] = useState('');
    const [payerType, setPayerType] = useState<'Self-Pay' | 'Insurance' | 'Split (Co-Pay + Insurance)'>('Self-Pay');
    const [selectedInsurance, setSelectedInsurance] = useState('SHA (Social Health Authority)');
    const [policyNumber, setPolicyNumber] = useState('');
    const [copayAmount, setCopayAmount] = useState('500');
    const [lineItems, setLineItems] = useState<{ itemName: string; category: string; quantity: number; unitPrice: number }[]>([
        { itemName: 'General Consultation', category: 'Consultation', quantity: 1, unitPrice: 1500 }
    ]);

    // Payment Form
    const [paymentPhone, setPaymentPhone] = useState('0712345678');
    const [paymentMethod, setPaymentMethod] = useState<'M-Pesa' | 'Cash' | 'Card'>('M-Pesa');
    const [paymentOption, setPaymentOption] = useState<'copay' | 'full' | 'custom'>('copay');
    const [customPayAmount, setCustomPayAmount] = useState<number>(0);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const handlePreviewPdf = async (inv: PatientInvoice) => {
        try {
            const dataUri = await generatePatientInvoicePdf(inv);
            setPdfPreviewUri(dataUri);
            setPdfPreviewTitle(`Invoice ${inv.invoiceNumber} — ${inv.patientName}`);
            setIsPdfModalOpen(true);
        } catch (e: any) {
            alert("Failed to render PDF preview: " + (e.message || e));
        }
    };

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
    const totalPendingInsurance = useMemo(() => invoices.filter(inv => inv.payerType !== 'Self-Pay' && inv.status !== 'Paid').reduce((sum, inv) => sum + (inv.insuranceCoverAmount || inv.balance), 0), [invoices]);
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
        
        const isInsurance = payerType === 'Insurance' || payerType === 'Split (Co-Pay + Insurance)';
        const copay = isInsurance ? Number(copayAmount) || 0 : 0;
        const insuranceCover = isInsurance ? Math.max(0, newInvoiceSubtotal - copay) : 0;

        const newInv: PatientInvoice = {
            id: `inv_${Date.now()}`,
            invoiceNumber: `INV-2025-${Math.floor(100 + Math.random() * 900)}`,
            patientId: selectedPatientId || 'walkin',
            patientName: pName,
            payerType,
            insuranceProvider: isInsurance ? selectedInsurance : undefined,
            policyNumber: isInsurance ? policyNumber : undefined,
            copayAmount: copay,
            insuranceCoverAmount: insuranceCover,
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
                    copayAmount: copay,
                    insuranceCoverAmount: insuranceCover,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
                
                // If insurance involved, also log insurance claim for the remaining balance
                if (isInsurance && insuranceCover > 0) {
                    await apiService.saveModuleRecord('his_claims', {
                        institution_id: institutionId,
                        patientId: newInv.patientId,
                        patientName: newInv.patientName,
                        insuranceProvider: selectedInsurance,
                        policyNumber,
                        claimAmount: insuranceCover,
                        copayAmount: copay,
                        status: 'Pending',
                        submissionDate: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Failed to save invoice to Supabase:", err);
            }
        }

        setIsGenerateModalOpen(false);
        const splitMsg = isInsurance 
            ? ` (Patient Co-pay: KES ${copay.toLocaleString()} | Insurance Claim: KES ${insuranceCover.toLocaleString()})`
            : '';
        alert(`Invoice ${newInv.invoiceNumber} created successfully!${splitMsg}`);
    };

    const handleProcessPayment = async () => {
        if (!selectedInvoice) return;
        setIsProcessingPayment(true);

        const amountToPay = paymentOption === 'copay'
            ? (selectedInvoice.copayAmount || selectedInvoice.balance)
            : paymentOption === 'custom'
            ? customPayAmount
            : selectedInvoice.balance;

        setTimeout(async () => {
            const newAmountPaid = selectedInvoice.amountPaid + amountToPay;
            const newBalance = Math.max(0, selectedInvoice.totalAmount - newAmountPaid);
            const isFullyPaid = newBalance === 0;

            const updatedInv: PatientInvoice = {
                ...selectedInvoice,
                amountPaid: newAmountPaid,
                balance: newBalance,
                status: isFullyPaid ? 'Paid' : 'Partial',
                paymentMethod: selectedInvoice.payerType !== 'Self-Pay' ? 'Split (Co-Pay + Claim)' : paymentMethod
            };

            setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? updatedInv : inv));
            
            if (institutionId) {
                try {
                    await apiService.saveModuleRecord('his_billing_items', {
                        institution_id: institutionId,
                        id: selectedInvoice.id,
                        status: isFullyPaid ? 'paid' : 'partial',
                        amountPaid: newAmountPaid,
                        balance: newBalance,
                        paymentMethod,
                        paidAt: new Date().toISOString()
                    });

                    // Auto-clear pharmacy prescription for this patient in Pharmacy module
                    const prescs = await apiService.fetchModuleRecords('his_prescriptions', institutionId).catch(() => []);
                    const patientPrescs = (prescs || []).filter((p: any) => p.patientId === selectedInvoice.patientId && p.status !== 'dispensed');
                    const recipNo = `REC-${Math.floor(10000 + Math.random() * 90000)}`;
                    const financeNote = `✓ Cleared for Dispensing at Finance Desk (Receipt #${recipNo} | Method: ${paymentMethod} | Paid KES ${amountToPay.toLocaleString()})`;

                    for (const p of patientPrescs) {
                        await apiService.updateModuleRecord('his_prescriptions', p.id, {
                            paymentStatus: 'cleared',
                            financeNotes: financeNote,
                            receiptNumber: recipNo,
                            clearedByFinanceAt: new Date().toISOString()
                        }).catch(() => null);
                    }
                } catch (err) {
                    console.error("Failed to record payment in Supabase:", err);
                }
            }

            setIsProcessingPayment(false);
            setIsPaymentModalOpen(false);
            setIsProcessingPayment(false);
            setIsPaymentModalOpen(false);
            alert(`✓ Payment of KES ${amountToPay.toLocaleString()} recorded via ${paymentMethod}!\nRemaining Outstanding Balance: KES ${newBalance.toLocaleString()}`);
        }, 1200);
    };

    const handlePrintB2bMasterInvoice = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Please allow popups to print B2B master invoice.');

        const masterNo = `INS-INV-${new Date().getFullYear()}-${b2bInsuranceCompany.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const sampleClaims = [
            { patientName: 'Grace Wanjiru', memberNo: 'SHA-948201', date: '2026-08-02', desc: 'Outpatient Consult + Lab Panel', total: 4500, copay: 500, netClaim: 4000 },
            { patientName: 'Kevin Otieno', memberNo: 'SHA-948202', date: '2026-08-05', desc: 'X-Ray Chest + Prescriptions', total: 6800, copay: 500, netClaim: 6300 },
            { patientName: 'Sarah Omondi', memberNo: 'SHA-948203', date: '2026-08-08', desc: 'Female Ward Admission (3 Days)', total: 42000, copay: 0, netClaim: 42000 },
            { patientName: 'Daniel Kiprop', memberNo: 'SHA-948204', date: '2026-08-10', desc: 'Emergency Triage & Medication', total: 8500, copay: 500, netClaim: 8000 },
        ];

        const totalNetClaim = sampleClaims.reduce((s, c) => s + c.netClaim, 0);

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>B2B Accumulated Master Invoice - ${b2bInsuranceCompany}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 3px double #1e1b4b; padding-bottom: 20px; margin-bottom: 25px; }
                    .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #312e81; margin: 5px 0; }
                    .subtitle { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 3px; }
                    .inv-no { font-size: 11px; font-weight: 800; color: #4338ca; margin-top: 5px; }
                    .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
                    .grid-2 { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                    .table th { background: #312e81; color: white; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
                    .table td { border-bottom: 1px solid #e2e8f0; padding: 10px; font-weight: 600; }
                    .total-box { margin-top: 25px; text-align: right; background: #e0e7ff; padding: 15px 25px; border-radius: 12px; border: 1px solid #c7d2fe; }
                    .stamp-box { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .stamp { border: 2px dashed #4338ca; color: #4338ca; padding: 12px 20px; border-radius: 12px; font-weight: 900; text-transform: uppercase; font-size: 10px; text-align: center; transform: rotate(-2deg); }
                    .sig-line { border-top: 1.5px solid #0f172a; width: 220px; text-align: center; pt-2; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="subtitle">Quantum Healthcare Medical Centre — Accounts Receivable</div>
                    <div class="title">B2B Accumulated Period Master Invoice</div>
                    <div class="inv-no">Master Invoice Ref: ${masterNo} | Date: ${new Date().toLocaleDateString()}</div>
                </div>

                <div class="box">
                    <div class="grid-2">
                        <div>
                            <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Billed Insurance Provider</div>
                            <div style="font-size: 16px; font-weight: 900; color: #312e81;">${b2bInsuranceCompany}</div>
                            <div style="font-size: 11px; font-weight: 700; color: #475569;">B2B Medical Claims Department</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Billing Period</div>
                            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${b2bStartDate} to ${b2bEndDate}</div>
                        </div>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Patient Name</th>
                            <th>Member / Policy No</th>
                            <th>Visit Date</th>
                            <th>Services Rendered</th>
                            <th>Gross Charge</th>
                            <th>Co-Pay Paid</th>
                            <th>Net B2B Claim (KES)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sampleClaims.map((c, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${c.patientName}</td>
                                <td>${c.memberNo}</td>
                                <td>${c.date}</td>
                                <td>${c.desc}</td>
                                <td>${c.total.toLocaleString()}</td>
                                <td>${c.copay.toLocaleString()}</td>
                                <td style="color: #312e81; font-weight: 800;">${c.netClaim.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-box">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #4338ca;">Total Accumulated Net Amount Due</div>
                    <div style="font-size: 26px; font-weight: 900; color: #1e1b4b;">KES ${totalNetClaim.toLocaleString()}</div>
                    <div style="font-size: 10px; font-weight: 700; color: #64748b;">Payable within 30 Days to Quantum Medical Account</div>
                </div>

                <div class="stamp-box">
                    <div class="stamp">
                        ✓ CERTIFIED B2B MASTER INVOICE<br>
                        QUANTUM FINANCE HUB<br>
                        ${masterNo}
                    </div>
                    <div>
                        <div class="sig-line">
                            Finance Manager Sign-Off<br>
                            <span style="color: #64748b; font-size: 10px;">Quantum Accounts Receivable</span>
                        </div>
                    </div>
                </div>

                <script>window.print();</script>
            </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handlePostRemittance = async () => {
        setIsPostingRemittance(true);
        const remBalance = Math.max(0, remittanceBilledAmount - remittancePaidAmount - remittanceDisallowedAmount);
        const remStatus = remBalance === 0 ? 'Fully Settled' : 'Partial Payment';

        setTimeout(async () => {
            const newLog = {
                id: `rem_${Date.now()}`,
                provider: remittanceProvider,
                refNo: remittanceRefNo,
                billed: remittanceBilledAmount,
                paid: remittancePaidAmount,
                disallowed: remittanceDisallowedAmount,
                balance: remBalance,
                status: remStatus,
                date: new Date().toISOString().split('T')[0],
                officer: 'Finance Officer'
            };

            setRemittanceLogs(prev => [newLog, ...prev]);

            if (institutionId) {
                await apiService.saveModuleRecord('his_insurance_remittances', {
                    institution_id: institutionId,
                    ...newLog,
                    created_at: new Date().toISOString()
                }).catch(() => null);
            }

            setIsPostingRemittance(false);
            alert(`✓ Insurance Remittance Advice #${remittanceRefNo} Posted Successfully!\n\nReceived Amount: KES ${remittancePaidAmount.toLocaleString()}\nDisallowed Claims: KES ${remittanceDisallowedAmount.toLocaleString()}\nOutstanding Claim Balance: KES ${remBalance.toLocaleString()}`);
        }, 800);
    };

    useEffect(() => {
        if (institutionId) {
            apiService.fetchModuleRecords('his_expenditures', institutionId)
                .then(res => {
                    if (res && res.length > 0) {
                        setExpenditures(res);
                    }
                })
                .catch(() => {});
        }
    }, [institutionId]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.title.trim() || !newExpense.amount) {
            return alert('Please fill in expense title and amount.');
        }
        const voucher = newExpense.voucherNo.trim() || `EXP-2026-${Math.floor(100 + Math.random() * 900)}`;
        const record = {
            id: `exp_${Date.now()}`,
            institution_id: institutionId || 'his_inst_1',
            institutionId: institutionId || 'his_inst_1',
            title: newExpense.title.trim(),
            category: newExpense.category,
            vendor: newExpense.vendor.trim() || 'General Vendor',
            amount: Number(newExpense.amount),
            date: newExpense.date,
            paymentMethod: newExpense.paymentMethod,
            voucherNo: voucher,
            status: newExpense.status,
            notes: newExpense.notes.trim(),
            created_at: new Date().toISOString()
        };

        setExpenditures(prev => [record, ...prev]);

        if (institutionId) {
            await apiService.saveModuleRecord('his_expenditures', record).catch(() => null);
        }

        setIsAddExpenseModalOpen(false);
        setNewExpense({
            title: '',
            category: 'Medical & Surgical Supplies',
            vendor: '',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            paymentMethod: 'Bank Transfer (EFT / RTGS)',
            voucherNo: '',
            status: 'Paid',
            notes: ''
        });
        alert(`✓ Expenditure "${record.title}" (Voucher: ${voucher}) recorded successfully!`);
    };

    const handleUpdateExpenseStatus = async (id: string, newStatus: string) => {
        setExpenditures(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
        if (institutionId) {
            await apiService.updateModuleRecord('his_expenditures', id, { status: newStatus }).catch(() => null);
        }
    };

    const handleDeleteExpense = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete expenditure "${title}"?`)) return;
        setExpenditures(prev => prev.filter(e => e.id !== id));
        if (institutionId) {
            await apiService.deleteModuleRecord('his_expenditures', id).catch(() => null);
        }
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
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsAddExpenseModalOpen(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/30 italic"
                    >
                        <PlusIcon className="w-4 h-4 text-white" /> Record Outflow / Expense
                    </button>
                    <button 
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 italic"
                    >
                        <PlusIcon className="w-4 h-4 text-slate-950" /> Generate Invoice
                    </button>
                </div>
            </div>

            {/* ── RICH HORIZONTAL FINANCE SUB-MENU ── */}
            <div className="flex items-center gap-2 p-2 bg-slate-900/60 border border-white/10 rounded-[2.5rem] overflow-x-auto no-scrollbar shadow-2xl">
                <button 
                    onClick={() => setActiveTab('invoices')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'invoices' 
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <CreditCardIcon className="w-4 h-4" />
                    <span>Patient Invoices &amp; Checkout Queue</span>
                </button>

                <button 
                    onClick={() => setActiveTab('revenue')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'revenue' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ChartBarIcon className="w-4 h-4" />
                    <span>Period Revenue Generator</span>
                </button>

                <button 
                    onClick={() => setActiveTab('statements')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'statements' 
                            ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <FileTextIcon className="w-4 h-4" />
                    <span>Insurance Statements &amp; Balances</span>
                </button>

                <button 
                    onClick={() => setActiveTab('claims')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'claims' 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ShieldIcon className="w-4 h-4" />
                    <span>Insurance Claims Management</span>
                </button>

                <button 
                    onClick={() => setActiveTab('accumulated_b2b')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'accumulated_b2b' 
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <span>🏢 B2B Accumulated Period Invoice</span>
                </button>

                <button 
                    onClick={() => setActiveTab('insurance_remittance')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'insurance_remittance' 
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <span>💵 Insurance Remittance &amp; Partial Payment</span>
                </button>

                <button 
                    onClick={() => setActiveTab('expenditure')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'expenditure' 
                            ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <span>💸 Expenditure &amp; Outflows Module</span>
                </button>
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
                    {/* ⚡ DOCTOR ORDERS & PRESCRIPTIONS QUEUE */}
                    <div className="p-6 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent border border-amber-500/20 rounded-[2.5rem] space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping inline-block" />
                                    <h3 className="text-sm font-black uppercase tracking-wider text-white italic">
                                        ⚡ Doctor Orders &amp; Prescriptions Queue ({doctorOrdersQueue.length} Pending)
                                    </h3>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Bills automatically queued from Doctor consultations for instant cashier checkout
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/30">
                                Live Feed
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {doctorOrdersQueue.map((ord) => (
                                <div key={ord.id} className="p-4 bg-slate-900/80 rounded-2xl border border-white/10 flex items-center justify-between gap-4 hover:border-amber-400/40 transition-all">
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-xs font-black text-white uppercase tracking-tight truncate">{ord.patientName}</p>
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase">{ord.doctorName} • {ord.type}</p>
                                        <p className="text-[9px] text-slate-400 truncate max-w-[240px]">{ord.items.map((i: any) => `${i.itemName} (x${i.quantity})`).join(', ')}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 space-y-2">
                                        <p className="text-sm font-black text-amber-400">KES {ord.totalAmount.toLocaleString()}</p>
                                        <button
                                            onClick={() => {
                                                setManualPatientName(ord.patientName.replace(/^Dr\. (Prescribed|Ordered): /, ''));
                                                setSelectedPatientId(ord.patientId);
                                                setLineItems(ord.items.map((i: any) => ({
                                                    itemName: i.itemName,
                                                    category: i.category,
                                                    quantity: i.quantity,
                                                    unitPrice: i.unitPrice
                                                })));
                                                setIsGenerateModalOpen(true);
                                                setDoctorOrdersQueue(prev => prev.filter(q => q.id !== ord.id));
                                            }}
                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-500/20"
                                        >
                                            Checkout &amp; Invoice →
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {doctorOrdersQueue.length === 0 && (
                                <div className="p-6 text-center text-slate-500 italic text-xs col-span-2">
                                    No pending doctor prescriptions in queue. New orders from doctors will appear here automatically.
                                </div>
                            )}
                        </div>
                    </div>

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
                                                        onClick={() => handlePreviewPdf(inv)}
                                                        className="p-2 glass-morphism rounded-xl text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all flex items-center gap-1 text-[10px] font-black uppercase px-3"
                                                        title="On-Screen PDF Invoice Preview"
                                                    >
                                                        <FileTextIcon className="w-4 h-4" />
                                                        <span>Preview PDF</span>
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

            {/* TAB CONTENT 2: PERIOD REVENUE GENERATOR */}
            {activeTab === 'revenue' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Period Controls Header */}
                    <div className="p-6 bg-slate-900 border border-white/10 rounded-[2.5rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                                Financial <span className="text-emerald-400">Revenue Performance Generator</span>
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Filter hospital earnings by period, date range &amp; service department
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10">
                                {(['today', 'week', 'month', 'year', 'custom'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setRevenuePeriod(p)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                            revenuePeriod === p ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            {revenuePeriod === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        value={customStartDate} 
                                        onChange={(e) => setCustomStartDate(e.target.value)} 
                                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none" 
                                    />
                                    <span className="text-slate-500 text-xs font-black">TO</span>
                                    <input 
                                        type="date" 
                                        value={customEndDate} 
                                        onChange={(e) => setCustomEndDate(e.target.value)} 
                                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none" 
                                    />
                                </div>
                            )}

                            <button
                                onClick={async () => {
                                    const categoryBreakdown = [
                                        { category: 'General Practitioner Consultation', amount: invoices.reduce((s, i) => s + (i.items.filter(it => it.category === 'Consultation').reduce((sum, item) => sum + item.total, 0)), 0) + 18500 },
                                        { category: 'Pharmacy & Prescriptions', amount: invoices.reduce((s, i) => s + (i.items.filter(it => it.category === 'Pharmacy').reduce((sum, item) => sum + item.total, 0)), 0) + 34200 },
                                        { category: 'Laboratory & Diagnostics', amount: invoices.reduce((s, i) => s + (i.items.filter(it => it.category === 'Diagnostics').reduce((sum, item) => sum + item.total, 0)), 0) + 29400 },
                                        { category: 'Dental & Eye Clinic', amount: invoices.reduce((s, i) => s + (i.items.filter(it => it.category === 'Dental' || it.category === 'Eye').reduce((sum, item) => sum + item.total, 0)), 0) + 14500 },
                                        { category: 'Inpatient Ward Admission', amount: invoices.reduce((s, i) => s + (i.items.filter(it => it.category === 'Inpatient').reduce((sum, item) => sum + item.total, 0)), 0) + 42000 }
                                    ];
                                    const pdfUri = await generateHisPeriodRevenuePdf({
                                        periodLabel: revenuePeriod,
                                        totalRevenue,
                                        totalCollected,
                                        totalPendingInsurance,
                                        categoryBreakdown
                                    });
                                    setPdfPreviewUri(pdfUri);
                                    setPdfPreviewTitle(`Period Revenue Performance Report (${revenuePeriod.toUpperCase()})`);
                                    setIsPdfModalOpen(true);
                                }}
                                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 italic"
                            >
                                <FileTextIcon className="w-4 h-4 text-slate-950" />
                                <span>Export Revenue PDF</span>
                            </button>
                        </div>
                    </div>

                    {/* Department Revenue Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Revenue by Clinical Department</h4>
                            <div className="space-y-4">
                                {[
                                    { category: 'General Consultations', amount: 18500, color: 'bg-indigo-500', pct: 22 },
                                    { category: 'Pharmacy & Medication', amount: 34200, color: 'bg-emerald-500', pct: 40 },
                                    { category: 'Laboratory & Diagnostics', amount: 29400, color: 'bg-blue-500', pct: 35 },
                                    { category: 'Dental & Ophthalmology', amount: 14500, color: 'bg-purple-500', pct: 18 },
                                    { category: 'Inpatient Ward Admission', amount: 42000, color: 'bg-rose-500', pct: 50 },
                                ].map((cat, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-white uppercase">
                                            <span>{cat.category}</span>
                                            <span className="font-mono text-emerald-400">KES {cat.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                            <div className={`h-full ${cat.color} rounded-full transition-all duration-1000`} style={{ width: `${cat.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Payment Method Distribution</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20 text-center">
                                    <MpesaIcon className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                                    <p className="text-2xl font-black text-white">KES {(totalCollected * 0.75).toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">M-Pesa Express (75%)</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-black/40 border border-indigo-500/20 text-center">
                                    <CreditCardIcon className="w-8 h-8 mx-auto text-indigo-400 mb-2" />
                                    <p className="text-2xl font-black text-white">KES {(totalCollected * 0.25).toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Cash / Card / POS (25%)</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-black/40 border border-rose-500/20 text-center col-span-2">
                                    <ShieldIcon className="w-8 h-8 mx-auto text-rose-400 mb-2" />
                                    <p className="text-2xl font-black text-rose-400">KES {totalPendingInsurance.toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Pending Insurance Claims (SHA/Private Insurers)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 3: INSURANCE STATEMENTS & OUTSTANDING BALANCES */}
            {activeTab === 'statements' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Controls */}
                    <div className="p-6 bg-slate-900 border border-white/10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                                Insurance Provider <span className="text-rose-400">Statements &amp; Outstanding Balances</span>
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Real-time audit of insurance cover claimed, co-pay settlements &amp; insurer balance due
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={selectedProviderFilter}
                                onChange={(e) => setSelectedProviderFilter(e.target.value)}
                                className="bg-black/50 border border-rose-500/40 rounded-2xl px-5 py-3 text-xs font-bold text-white outline-none uppercase"
                            >
                                <option value="all">All Insurance Providers</option>
                                {insuranceProviders.map((p, i) => (
                                    <option key={i} value={p.name}>{p.name}</option>
                                ))}
                            </select>

                            <button
                                onClick={async () => {
                                    const providerData = [
                                        { name: 'SHA (Social Health Authority)', count: 14, billed: 128000, outstanding: 128000 },
                                        { name: 'Jubilee Insurance', count: 8, billed: 64500, outstanding: 45000 },
                                        { name: 'AAR Insurance', count: 5, billed: 38000, outstanding: 38000 },
                                        { name: 'APA Insurance', count: 4, billed: 29000, outstanding: 29000 },
                                        { name: 'UAP Old Mutual', count: 6, billed: 42000, outstanding: 22000 }
                                    ];
                                    const pdfUri = await generateHisInsuranceStatementPdf({
                                        providerName: selectedProviderFilter,
                                        providers: providerData
                                    });
                                    setPdfPreviewUri(pdfUri);
                                    setPdfPreviewTitle(`Insurance Statement & Outstanding Balances Report (${selectedProviderFilter.toUpperCase()})`);
                                    setIsPdfModalOpen(true);
                                }}
                                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-950/50 flex items-center gap-2 italic"
                            >
                                <FileTextIcon className="w-4 h-4" />
                                <span>Export Statement PDF</span>
                            </button>
                        </div>
                    </div>

                    {/* Per-Provider Balance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: 'SHA (Social Health Authority)', code: 'SHA-NAT-01', invoices: 14, totalBilled: 128000, copay: 7000, outstanding: 121000, status: 'Overdue Batch' },
                            { name: 'Jubilee Insurance', code: 'JUB-MED-01', invoices: 8, totalBilled: 64500, copay: 4000, outstanding: 60500, status: 'Pending Payout' },
                            { name: 'AAR Insurance', code: 'AAR-MED-03', invoices: 5, totalBilled: 38000, copay: 2500, outstanding: 35500, status: 'Pending Payout' },
                        ].map((prov, i) => (
                            <div key={i} className="bg-slate-900 border border-rose-500/30 rounded-[2.5rem] p-6 space-y-4 shadow-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{prov.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Code: {prov.code}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-500/30">
                                        {prov.status}
                                    </span>
                                </div>

                                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                                        <span>Total Claims Invoices:</span>
                                        <span className="text-white">{prov.invoices} Invoices</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                                        <span>Total Billed Cover:</span>
                                        <span className="text-white">KES {prov.totalBilled.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                                        <span>Co-Pay Collected:</span>
                                        <span className="text-emerald-400">KES {prov.copay.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">OUTSTANDING BALANCE DUE:</span>
                                    <span className="text-xl font-mono font-black text-rose-400">KES {prov.outstanding.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CONTENT 4: INSURANCE CLAIMS MANAGEMENT */}
            {activeTab === 'claims' && (
                <div className="space-y-6 animate-fade-in">
                    <ClaimsManager institutionId={institutionId} />
                </div>
            )}

            {/* TAB CONTENT 5: B2B ACCUMULATED PERIOD INVOICING */}
            {activeTab === 'accumulated_b2b' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/20 p-8 rounded-[2.5rem] space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-wider text-cyan-300">🏢 B2B Accumulated Period Master Invoice Generator</h3>
                                <p className="text-xs text-slate-400 font-semibold mt-1">Consolidate all patient claims for an insurance provider into a single Period Master Invoice</p>
                            </div>
                            <button
                                onClick={handlePrintB2bMasterInvoice}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-cyan-900/50 flex items-center gap-2"
                            >
                                <span>🖨️ Print Accumulated Master Invoice</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Insurance Company *</label>
                                <select
                                    value={b2bInsuranceCompany}
                                    onChange={e => setB2bInsuranceCompany(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                >
                                    {insuranceProviders.map((prov, i) => (
                                        <option key={i} value={prov.name} className="bg-slate-900 text-white">{prov.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Period Start Date *</label>
                                <input
                                    type="date"
                                    value={b2bStartDate}
                                    onChange={e => setB2bStartDate(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Period End Date *</label>
                                <input
                                    type="date"
                                    value={b2bEndDate}
                                    onChange={e => setB2bEndDate(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Consolidated Period Breakdown Table */}
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Itemized Patient Claims ({b2bInsuranceCompany})</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Period: {b2bStartDate} to {b2bEndDate}</p>
                            </div>
                            <span className="px-4 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-black uppercase tracking-widest border border-cyan-500/30">
                                Total Net Due: KES 60,300
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-white">
                                <thead className="bg-black/40 text-[9px] uppercase tracking-widest text-slate-400 font-black">
                                    <tr>
                                        <th className="p-4">#</th>
                                        <th className="p-4">Patient Name</th>
                                        <th className="p-4">Member / Policy No</th>
                                        <th className="p-4">Visit Date</th>
                                        <th className="p-4">Services Rendered</th>
                                        <th className="p-4">Gross Amount</th>
                                        <th className="p-4">Co-Pay Paid</th>
                                        <th className="p-4">Net Claim Billed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-semibold text-slate-300">
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 font-black">1</td>
                                        <td className="p-4 text-white font-bold">Grace Wanjiru</td>
                                        <td className="p-4 text-cyan-400">SHA-948201</td>
                                        <td className="p-4">2026-08-02</td>
                                        <td className="p-4">Outpatient Consult + Lab Panel</td>
                                        <td className="p-4">KES 4,500</td>
                                        <td className="p-4 text-emerald-400">KES 500</td>
                                        <td className="p-4 text-cyan-300 font-black">KES 4,000</td>
                                    </tr>
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 font-black">2</td>
                                        <td className="p-4 text-white font-bold">Kevin Otieno</td>
                                        <td className="p-4 text-cyan-400">SHA-948202</td>
                                        <td className="p-4">2026-08-05</td>
                                        <td className="p-4">X-Ray Chest + Prescriptions</td>
                                        <td className="p-4">KES 6,800</td>
                                        <td className="p-4 text-emerald-400">KES 500</td>
                                        <td className="p-4 text-cyan-300 font-black">KES 6,300</td>
                                    </tr>
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 font-black">3</td>
                                        <td className="p-4 text-white font-bold">Sarah Omondi</td>
                                        <td className="p-4 text-cyan-400">SHA-948203</td>
                                        <td className="p-4">2026-08-08</td>
                                        <td className="p-4">Female Ward Admission (3 Days)</td>
                                        <td className="p-4">KES 42,000</td>
                                        <td className="p-4 text-emerald-400">KES 0</td>
                                        <td className="p-4 text-cyan-300 font-black">KES 42,000</td>
                                    </tr>
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 font-black">4</td>
                                        <td className="p-4 text-white font-bold">Daniel Kiprop</td>
                                        <td className="p-4 text-cyan-400">SHA-948204</td>
                                        <td className="p-4">2026-08-10</td>
                                        <td className="p-4">Emergency Triage &amp; Medication</td>
                                        <td className="p-4">KES 8,500</td>
                                        <td className="p-4 text-emerald-400">KES 500</td>
                                        <td className="p-4 text-cyan-300 font-black">KES 8,000</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 6: INSURANCE REMITTANCE & PARTIAL PAYMENTS */}
            {activeTab === 'insurance_remittance' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-orange-950/60 border border-amber-500/20 p-8 rounded-[2.5rem] space-y-6">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-wider text-amber-300">💵 Post Insurance Remittance &amp; Partial Payment</h3>
                            <p className="text-xs text-slate-400 font-semibold mt-1">Record EFT, cheque, or bank transfer payments received from insurance companies against billed claims</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Insurance Company *</label>
                                <select
                                    value={remittanceProvider}
                                    onChange={e => setRemittanceProvider(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                >
                                    {insuranceProviders.map((prov, i) => (
                                        <option key={i} value={prov.name} className="bg-slate-900 text-white">{prov.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Remittance / EFT / Cheque Ref No *</label>
                                <input
                                    type="text"
                                    value={remittanceRefNo}
                                    onChange={e => setRemittanceRefNo(e.target.value)}
                                    placeholder="e.g. EFT-JUB-948102"
                                    className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Total Billed Master Claim (KES)</label>
                                <input
                                    type="number"
                                    value={remittanceBilledAmount}
                                    onChange={e => setRemittanceBilledAmount(Number(e.target.value))}
                                    className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 block">Partial / Full Payment Received (KES) *</label>
                                <input
                                    type="number"
                                    value={remittancePaidAmount}
                                    onChange={e => setRemittancePaidAmount(Number(e.target.value))}
                                    className="w-full bg-black/40 border border-emerald-500/40 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-emerald-300 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block">Disallowed / Disputed Claims (KES)</label>
                                <input
                                    type="number"
                                    value={remittanceDisallowedAmount}
                                    onChange={e => setRemittanceDisallowedAmount(Number(e.target.value))}
                                    className="w-full bg-black/40 border border-rose-500/40 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-rose-300 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-amber-300 uppercase tracking-widest mb-1.5 block">Calculated Outstanding Balance</label>
                                <div className="w-full bg-black/60 border border-amber-500/30 rounded-xl p-3 text-sm font-black text-amber-300 font-mono">
                                    KES {Math.max(0, remittanceBilledAmount - remittancePaidAmount - remittanceDisallowedAmount).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Remittance Advice Notes / Remarks</label>
                            <input
                                type="text"
                                value={remittanceNotes}
                                onChange={e => setRemittanceNotes(e.target.value)}
                                placeholder="Details of partial payment and disallowed claims..."
                                className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                            />
                        </div>

                        <button
                            onClick={handlePostRemittance}
                            disabled={isPostingRemittance}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-900/50"
                        >
                            {isPostingRemittance ? 'Processing Remittance Entry...' : '✓ Post Insurance Remittance & Update Claims'}
                        </button>
                    </div>

                    {/* Remittance History Table */}
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden">
                        <div className="p-6 border-b border-white/10 bg-black/20">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Posted Insurance Remittance Audit Log</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Historical record of EFT payments &amp; claim reconciliations</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-white">
                                <thead className="bg-black/40 text-[9px] uppercase tracking-widest text-slate-400 font-black">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Insurance Company</th>
                                        <th className="p-4">EFT / Cheque Ref</th>
                                        <th className="p-4">Total Billed</th>
                                        <th className="p-4">Amount Paid</th>
                                        <th className="p-4">Disallowed</th>
                                        <th className="p-4">Balance</th>
                                        <th className="p-4">Remittance Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-semibold text-slate-300">
                                    {remittanceLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/[0.02]">
                                            <td className="p-4 text-slate-400">{log.date}</td>
                                            <td className="p-4 text-white font-bold">{log.provider}</td>
                                            <td className="p-4 text-amber-400 font-mono">{log.refNo}</td>
                                            <td className="p-4">KES {log.billed.toLocaleString()}</td>
                                            <td className="p-4 text-emerald-400 font-black">KES {log.paid.toLocaleString()}</td>
                                            <td className="p-4 text-rose-400 font-black">KES {log.disallowed.toLocaleString()}</td>
                                            <td className="p-4 text-amber-300 font-black">KES {log.balance.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                    log.status === 'Fully Settled'
                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ EXPENDITURE & OUTFLOWS MODULE ═══════════ */}
            {activeTab === 'expenditure' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Expenditure Metrics Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="p-6 bg-slate-900/60 rounded-[2.5rem] border border-rose-500/20 relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Operational Outflow</span>
                            <h3 className="text-2xl font-black text-white italic mt-1 font-mono">
                                KES {expenditures.reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()}
                            </h3>
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-1 block">Hospital Expenses &amp; Disbursements</span>
                        </div>

                        <div className="p-6 bg-slate-900/60 rounded-[2.5rem] border border-emerald-500/20 relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settled &amp; Paid Expenses</span>
                            <h3 className="text-2xl font-black text-emerald-400 italic mt-1 font-mono">
                                KES {expenditures.filter(e => e.status === 'Paid').reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()}
                            </h3>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1 block">Completed Payments</span>
                        </div>

                        <div className="p-6 bg-slate-900/60 rounded-[2.5rem] border border-amber-500/20 relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Approved / Pending Payment</span>
                            <h3 className="text-2xl font-black text-amber-300 italic mt-1 font-mono">
                                KES {expenditures.filter(e => e.status !== 'Paid').reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()}
                            </h3>
                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mt-1 block">Outstanding Vendor Liabilities</span>
                        </div>

                        <div className="p-6 bg-slate-900/60 rounded-[2.5rem] border border-indigo-500/20 relative overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Recorded Vouchers</span>
                            <h3 className="text-2xl font-black text-indigo-300 italic mt-1 font-mono">
                                {expenditures.length} Vouchers
                            </h3>
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1 block">Audited Outflows</span>
                        </div>
                    </div>

                    {/* Filter & Action Controls */}
                    <div className="p-6 bg-slate-900/40 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                            <div className="relative flex-1 min-w-[200px]">
                                <SearchIcon className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                                <input
                                    type="text"
                                    placeholder="Search expense title, voucher # or vendor..."
                                    value={expenseSearch}
                                    onChange={e => setExpenseSearch(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                                />
                            </div>

                            <select
                                value={expenseCategoryFilter}
                                onChange={e => setExpenseCategoryFilter(e.target.value)}
                                className="bg-slate-950 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-rose-500"
                            >
                                <option value="all">All Categories</option>
                                <option value="Medical & Surgical Supplies">Medical &amp; Surgical Supplies</option>
                                <option value="Pharmaceutical Inventory">Pharmaceutical Inventory</option>
                                <option value="Laboratory & Diagnostic Reagents">Laboratory &amp; Diagnostic Reagents</option>
                                <option value="Biomedical Equipment Repair">Biomedical Equipment Repair</option>
                                <option value="Facility Utilities & Fuel">Facility Utilities &amp; Fuel</option>
                                <option value="Staff Payroll & Allowances">Staff Payroll &amp; Allowances</option>
                                <option value="Administrative & Office">Administrative &amp; Office</option>
                                <option value="External Partner Lab Fees">External Partner Lab Fees</option>
                            </select>

                            <select
                                value={expenseStatusFilter}
                                onChange={e => setExpenseStatusFilter(e.target.value)}
                                className="bg-slate-950 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-rose-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Paid">Paid</option>
                                <option value="Approved">Approved</option>
                                <option value="Pending Approval">Pending Approval</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setIsAddExpenseModalOpen(true)}
                            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" /> Log Hospital Expenditure
                        </button>
                    </div>

                    {/* Expenditures Audit Table */}
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden">
                        <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-center">
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Hospital Expenditure Audit Journal</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Approved operational expenses, vendor invoices &amp; disbursement vouchers</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-white">
                                <thead className="bg-black/40 text-[9px] uppercase tracking-widest text-slate-400 font-black">
                                    <tr>
                                        <th className="p-4">Voucher #</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Expense Title &amp; Category</th>
                                        <th className="p-4">Supplier / Vendor</th>
                                        <th className="p-4">Payment Method</th>
                                        <th className="p-4 text-right">Amount (KES)</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-semibold text-slate-300">
                                    {expenditures
                                        .filter(e => {
                                            const matchSearch = !expenseSearch || 
                                                e.title?.toLowerCase().includes(expenseSearch.toLowerCase()) || 
                                                e.vendor?.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                                                e.voucherNo?.toLowerCase().includes(expenseSearch.toLowerCase());
                                            const matchCat = expenseCategoryFilter === 'all' || e.category === expenseCategoryFilter;
                                            const matchStat = expenseStatusFilter === 'all' || e.status === expenseStatusFilter;
                                            return matchSearch && matchCat && matchStat;
                                        })
                                        .map(exp => (
                                            <tr key={exp.id} className="hover:bg-white/[0.02]">
                                                <td className="p-4 text-rose-400 font-mono font-bold">{exp.voucherNo}</td>
                                                <td className="p-4 text-slate-400">{exp.date}</td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{exp.title}</div>
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-200 font-semibold">{exp.vendor}</td>
                                                <td className="p-4 text-slate-400">{exp.paymentMethod}</td>
                                                <td className="p-4 text-right font-black text-rose-300 font-mono text-sm">
                                                    KES {(Number(exp.amount) || 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                        exp.status === 'Paid'
                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                            : exp.status === 'Approved'
                                                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                    }`}>
                                                        {exp.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {exp.status !== 'Paid' && (
                                                            <button
                                                                onClick={() => handleUpdateExpenseStatus(exp.id, 'Paid')}
                                                                className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                                                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                                            title="Delete Expenditure Record"
                                                        >
                                                            <XCircleIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ MODAL: RECORD EXPENDITURE ═══════════ */}
            {isAddExpenseModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-gradient-to-r from-rose-600 to-red-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Log Hospital Expenditure</h3>
                                <p className="text-[10px] font-semibold opacity-80">Record operational expense, vendor invoice, or supply payment voucher</p>
                            </div>
                            <button onClick={() => setIsAddExpenseModalOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddExpense} className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Expense Title / Description *</label>
                                <input
                                    type="text"
                                    required
                                    value={newExpense.title}
                                    onChange={e => setNewExpense(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Oxygen Cylinder Refills, Lab Reagent Purchase"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Expense Category *</label>
                                    <select
                                        value={newExpense.category}
                                        onChange={e => setNewExpense(f => ({ ...f, category: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                    >
                                        <option value="Medical & Surgical Supplies">Medical &amp; Surgical Supplies</option>
                                        <option value="Pharmaceutical Inventory">Pharmaceutical Inventory</option>
                                        <option value="Laboratory & Diagnostic Reagents">Laboratory &amp; Diagnostic Reagents</option>
                                        <option value="Biomedical Equipment Repair">Biomedical Equipment Repair</option>
                                        <option value="Facility Utilities & Fuel">Facility Utilities &amp; Fuel</option>
                                        <option value="Staff Payroll & Allowances">Staff Payroll &amp; Allowances</option>
                                        <option value="Administrative & Office">Administrative &amp; Office</option>
                                        <option value="External Partner Lab Fees">External Partner Lab Fees</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Vendor / Supplier</label>
                                    <input
                                        type="text"
                                        value={newExpense.vendor}
                                        onChange={e => setNewExpense(f => ({ ...f, vendor: e.target.value }))}
                                        placeholder="e.g. BOC Gases Kenya, KEMSA"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Amount (KES) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={newExpense.amount || ''}
                                        onChange={e => setNewExpense(f => ({ ...f, amount: Number(e.target.value) }))}
                                        placeholder="150000"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 text-rose-600 dark:text-rose-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Expense Date</label>
                                    <input
                                        type="date"
                                        value={newExpense.date}
                                        onChange={e => setNewExpense(f => ({ ...f, date: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Payment Method</label>
                                    <select
                                        value={newExpense.paymentMethod}
                                        onChange={e => setNewExpense(f => ({ ...f, paymentMethod: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                    >
                                        <option value="Bank Transfer (EFT / RTGS)">Bank Transfer (EFT / RTGS)</option>
                                        <option value="M-Pesa Business Paybill">M-Pesa Business Paybill</option>
                                        <option value="Petty Cash">Petty Cash</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Status</label>
                                    <select
                                        value={newExpense.status}
                                        onChange={e => setNewExpense(f => ({ ...f, status: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Pending Approval">Pending Approval</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Voucher / LPO Reference No.</label>
                                <input
                                    type="text"
                                    value={newExpense.voucherNo}
                                    onChange={e => setNewExpense(f => ({ ...f, voucherNo: e.target.value }))}
                                    placeholder="e.g. EXP-2026-009 or LPO-8492"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Notes / Description Memo</label>
                                <input
                                    type="text"
                                    value={newExpense.notes}
                                    onChange={e => setNewExpense(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Details of expense, LPO number or payment receipt..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsAddExpenseModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-8 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md">
                                    ✓ Save Expenditure Record
                                </button>
                            </div>
                        </form>
                    </div>
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
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Payer & Settlement Mode</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setPayerType('Self-Pay')}
                                        className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            payerType === 'Self-Pay' ? 'bg-emerald-500 text-slate-950' : 'bg-black/40 text-slate-400 border border-white/10'
                                        }`}
                                    >
                                        💵 100% Self-Pay
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPayerType('Split (Co-Pay + Insurance)')}
                                        className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            payerType === 'Split (Co-Pay + Insurance)' ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400' : 'bg-black/40 text-slate-400 border border-white/10'
                                        }`}
                                    >
                                        ⚖️ Split (Co-Pay + Cover)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPayerType('Insurance')}
                                        className={`py-3 px-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            payerType === 'Insurance' ? 'bg-rose-500 text-white' : 'bg-black/40 text-slate-400 border border-white/10'
                                        }`}
                                    >
                                        🛡️ 100% Insurance Cover
                                    </button>
                                </div>

                                {payerType !== 'Self-Pay' && (
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Patient Co-Pay (KES)</label>
                                                <input 
                                                    type="number"
                                                    value={copayAmount}
                                                    onChange={(e) => setCopayAmount(e.target.value)}
                                                    placeholder="500"
                                                    min="0"
                                                    className="w-full p-3 bg-black/50 border border-amber-500/50 rounded-xl text-xs text-amber-300 font-bold"
                                                />
                                            </div>
                                        </div>

                                        {/* Split calculation breakdown indicator */}
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-wrap justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                            <div className="text-amber-300">
                                                <span>Patient Responsibility (Co-Pay): </span>
                                                <span className="text-sm font-bold text-white ml-1">KES {Number(copayAmount || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="text-rose-300">
                                                <span>Insurance Cover Claim: </span>
                                                <span className="text-sm font-bold text-white ml-1">KES {Math.max(0, newInvoiceSubtotal - Number(copayAmount || 0)).toLocaleString()}</span>
                                            </div>
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

                        {/* Split / Payment Amount Breakdown */}
                        <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 uppercase font-bold text-[10px]">Total Bill:</span>
                                <span className="font-black text-white">KES {selectedInvoice.totalAmount.toLocaleString()}</span>
                            </div>
                            {selectedInvoice.insuranceProvider && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-rose-400 uppercase font-bold text-[10px]">Insurance Claim ({selectedInvoice.insuranceProvider}):</span>
                                    <span className="font-black text-rose-300">KES {(selectedInvoice.insuranceCoverAmount || (selectedInvoice.totalAmount - (selectedInvoice.copayAmount || 0))).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10">
                                <span className="text-amber-400 uppercase font-bold text-[10px]">Outstanding Balance:</span>
                                <span className="font-black text-amber-300 text-lg">KES {selectedInvoice.balance.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Select What Amount to Pay */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Amount Selection</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedInvoice.copayAmount && selectedInvoice.copayAmount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => { setPaymentOption('copay'); setCustomPayAmount(selectedInvoice.copayAmount || 0); }}
                                        className={`p-3 rounded-xl text-left border transition-all ${
                                            paymentOption === 'copay' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-black/40 border-white/10 text-slate-400'
                                        }`}
                                    >
                                        <p className="text-[9px] font-black uppercase tracking-wider">Pay Patient Co-Pay Only</p>
                                        <p className="text-lg font-black text-white mt-0.5">KES {selectedInvoice.copayAmount.toLocaleString()}</p>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setPaymentOption('full'); setCustomPayAmount(selectedInvoice.balance); }}
                                    className={`p-3 rounded-xl text-left border transition-all ${
                                        paymentOption === 'full' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-black/40 border-white/10 text-slate-400'
                                    }`}
                                >
                                    <p className="text-[9px] font-black uppercase tracking-wider">Pay Full Balance</p>
                                    <p className="text-lg font-black text-white mt-0.5">KES {selectedInvoice.balance.toLocaleString()}</p>
                                </button>
                            </div>
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
                                    <span>Confirm KES {(paymentOption === 'copay' ? (selectedInvoice.copayAmount || selectedInvoice.balance) : selectedInvoice.balance).toLocaleString()} Payment</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: ON-SCREEN INVOICE PDF PREVIEW */}
            {isPdfModalOpen && pdfPreviewUri && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center pb-4 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                                    📄 On-Screen <span className="text-indigo-400">Invoice PDF Preview</span>
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pdfPreviewTitle}</p>
                            </div>
                            <button
                                onClick={() => setIsPdfModalOpen(false)}
                                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                            >
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                            <PdfViewer src={pdfPreviewUri} pdfDataUri={pdfPreviewUri} className="w-full h-full border-none" title={pdfPreviewTitle} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HISBillingView;
