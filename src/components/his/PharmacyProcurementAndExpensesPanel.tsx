import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { HISPharmacyInventory, User } from '../../types';
import { apiService } from '../../services/apiService';

export interface PharmacySupplier {
  id: string;
  institutionId: string;
  name: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  paymentTerms?: string;
}

export interface PharmacyGrnItem {
  drugId?: string;
  drugName: string;
  category: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  batchNumber: string;
  expiryDate: string;
  lineTotal: number;
}

export interface PharmacyStockReceipt {
  id: string;
  institutionId: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceRef: string;
  receivedDate: string;
  paymentStatus: 'Paid - Cash' | 'Paid - M-Pesa' | 'Paid - Bank' | 'Credit (Payable)';
  items: PharmacyGrnItem[];
  totalCost: number;
  receivedBy: string;
  notes?: string;
  createdAt: string;
}

export interface PharmacyExpenseRecord {
  id: string;
  institutionId: string;
  date: string;
  category: string;
  description: string;
  vendor?: string;
  amount: number;
  paymentMethod: 'Cash' | 'M-Pesa' | 'Bank Transfer' | 'Cheque';
  reference?: string;
  status: 'Paid' | 'Pending';
  recordedBy: string;
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  'Rent & Premises',
  'Utilities (Power / Water / WiFi)',
  'Staff Salaries & Locum',
  'Supplier Stock Purchase',
  'PPB License & Compliance',
  'Packaging & Dispensing Bags',
  'Transport & Courier',
  'Cleaning & Maintenance',
  'Marketing & SMS Credits',
  'Other Operating Expense',
];

const DEFAULT_SUPPLIERS = (instId: string): PharmacySupplier[] => [
  { id: `sup_meds_${instId}`, institutionId: instId, name: 'MEDS (Mission for Essential Drugs)', phone: '0722 202 106', paymentTerms: '30 Days Credit' },
  { id: `sup_surgi_${instId}`, institutionId: instId, name: 'Surgipharm Ltd', phone: '0709 988 000', paymentTerms: 'Cash / 14 Days' },
  { id: `sup_phillips_${instId}`, institutionId: instId, name: 'Phillips Pharmaceuticals', phone: '0711 082 000', paymentTerms: '30 Days Credit' },
];

interface PharmacyProcurementAndExpensesPanelProps {
  mode: 'receiving' | 'expenses';
  institutionId: string;
  pharmacyName?: string;
  currentUser: User;
  inventory: HISPharmacyInventory[];
  onRefreshData: () => Promise<void> | void;
}

export const PharmacyProcurementAndExpensesPanel: React.FC<PharmacyProcurementAndExpensesPanelProps> = ({
  mode,
  institutionId,
  pharmacyName = 'Pharmacy & Chemist',
  currentUser,
  inventory,
  onRefreshData,
}) => {
  const instKey = institutionId || 'default';
  const suppliersKey = `eduai_pharm_suppliers_${instKey}`;
  const grnKey = `eduai_pharm_grns_${instKey}`;
  const expensesKey = `eduai_pharm_expenses_${instKey}`;

  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>(() => {
    try {
      const raw = localStorage.getItem(suppliersKey);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_SUPPLIERS(instKey);
  });

  const [grns, setGrns] = useState<PharmacyStockReceipt[]>(() => {
    try {
      const raw = localStorage.getItem(grnKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [expenses, setExpenses] = useState<PharmacyExpenseRecord[]>(() => {
    try {
      const raw = localStorage.getItem(expensesKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync from Supabase on mount
  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      if (!apiService.fetchModuleRecords) return;
      try {
        const [supRows, grnRows, expRows] = await Promise.all([
          apiService.fetchModuleRecords<PharmacySupplier>('pharmacy_suppliers', instKey).catch(() => []),
          apiService.fetchModuleRecords<PharmacyStockReceipt>('pharmacy_stock_receipts', instKey).catch(() => []),
          apiService.fetchModuleRecords<PharmacyExpenseRecord>('pharmacy_expenses', instKey).catch(() => []),
        ]);
        if (!mounted) return;
        if (Array.isArray(supRows) && supRows.length > 0) {
          setSuppliers(supRows);
          try { localStorage.setItem(suppliersKey, JSON.stringify(supRows)); } catch (_) {}
        }
        if (Array.isArray(grnRows) && grnRows.length > 0) {
          const sorted = [...grnRows].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setGrns(sorted);
          try { localStorage.setItem(grnKey, JSON.stringify(sorted)); } catch (_) {}
        }
        if (Array.isArray(expRows) && expRows.length > 0) {
          const sorted = [...expRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setExpenses(sorted);
          try { localStorage.setItem(expensesKey, JSON.stringify(sorted)); } catch (_) {}
        }
      } catch (_) {}
    };
    sync();
    return () => { mounted = false; };
  }, [instKey]);

  // ── SUPPLIER & GRN FORM STATE ──
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupTerms, setNewSupTerms] = useState('Cash / M-Pesa');

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => suppliers[0]?.id || '');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<PharmacyStockReceipt['paymentStatus']>('Paid - M-Pesa');
  const [grnNotes, setGrnNotes] = useState('');
  const [isSavingGrn, setIsSavingGrn] = useState(false);

  const [grnLines, setGrnLines] = useState<Array<{
    drugId: string;
    drugName: string;
    category: string;
    quantity: number;
    unitCost: number;
    sellingPrice: number;
    batchNumber: string;
    expiryDate: string;
  }>>([
    {
      drugId: '',
      drugName: '',
      category: 'General Medicine',
      quantity: 10,
      unitCost: 100,
      sellingPrice: 150,
      batchNumber: `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    },
  ]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    const sup: PharmacySupplier = {
      id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      institutionId: instKey,
      name: newSupName.trim(),
      phone: newSupPhone.trim(),
      paymentTerms: newSupTerms.trim() || 'Cash',
    };
    const next = [sup, ...suppliers];
    setSuppliers(next);
    setSelectedSupplierId(sup.id);
    try { localStorage.setItem(suppliersKey, JSON.stringify(next)); } catch (_) {}
    await apiService.saveModuleRecord('pharmacy_suppliers', sup).catch(() => {});
    setNewSupName('');
    setNewSupPhone('');
    setShowAddSupplier(false);
    setBanner({ type: 'success', text: `Supplier "${sup.name}" added.` });
  };

  const handleSelectExistingDrug = (idx: number, drugId: string) => {
    const drug = inventory.find(d => d.id === drugId);
    setGrnLines(prev =>
      prev.map((row, i) =>
        i !== idx
          ? row
          : {
              ...row,
              drugId,
              drugName: drug ? drug.name : row.drugName,
              category: drug?.category || row.category,
              sellingPrice: drug?.unitPrice || row.sellingPrice,
              unitCost: drug?.unitPrice ? Math.round(drug.unitPrice * 0.7) : row.unitCost,
            }
      )
    );
  };

  const handleSubmitGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = grnLines.filter(l => l.drugName.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      setBanner({ type: 'error', text: 'Please add at least one drug with quantity > 0.' });
      return;
    }

    setIsSavingGrn(true);
    try {
      const sup = suppliers.find(s => s.id === selectedSupplierId) || { id: 'walkin_sup', name: 'Direct Supplier' };
      const grnNumber = `GRN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 899)}`;
      const items: PharmacyGrnItem[] = validLines.map(l => ({
        drugId: l.drugId || undefined,
        drugName: l.drugName.trim(),
        category: l.category || 'General Medicine',
        quantity: Number(l.quantity) || 0,
        unitCost: Number(l.unitCost) || 0,
        sellingPrice: Number(l.sellingPrice) || 0,
        batchNumber: l.batchNumber.trim() || `B-${Date.now().toString().slice(-5)}`,
        expiryDate: l.expiryDate,
        lineTotal: (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
      }));
      const totalCost = items.reduce((s, it) => s + it.lineTotal, 0);

      // 1. Update / Create each drug in his_pharmacy_inventory + create FEFO batch
      for (const it of items) {
        const existing =
          (it.drugId && inventory.find(d => d.id === it.drugId)) ||
          inventory.find(d => (d.name || '').toLowerCase() === it.drugName.toLowerCase());

        const drugRecordId = existing?.id || `drug_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const updatedDrug = existing
          ? {
              ...existing,
              stockQuantity: (Number(existing.stockQuantity) || 0) + it.quantity,
              unitPrice: it.sellingPrice > 0 ? it.sellingPrice : existing.unitPrice,
              updatedAt: new Date().toISOString(),
            }
          : {
              id: drugRecordId,
              institutionId: instKey,
              name: it.drugName,
              category: it.category,
              unit: 'Pack / Unit',
              unitPrice: it.sellingPrice,
              stockQuantity: it.quantity,
              reorderLevel: 10,
              isNarcotic: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

        await apiService.saveModuleRecord('his_pharmacy_inventory', updatedDrug).catch(() => {});

        await apiService
          .saveModuleRecord('his_pharmacy_batches', {
            id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            institutionId: instKey,
            inventoryId: drugRecordId,
            drugName: it.drugName,
            batchNumber: it.batchNumber,
            quantity: it.quantity,
            unitCost: it.unitCost,
            expiryDate: it.expiryDate,
            supplierName: sup.name,
            grnNumber,
            createdAt: new Date().toISOString(),
          })
          .catch(() => {});
      }

      // 2. Save GRN Record
      const receipt: PharmacyStockReceipt = {
        id: `grn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        institutionId: instKey,
        grnNumber,
        supplierId: sup.id,
        supplierName: sup.name,
        invoiceRef: invoiceRef.trim() || grnNumber,
        receivedDate,
        paymentStatus,
        items,
        totalCost,
        receivedBy: currentUser?.name || 'Pharmacist',
        notes: grnNotes.trim(),
        createdAt: new Date().toISOString(),
      };

      const nextGrns = [receipt, ...grns];
      setGrns(nextGrns);
      try { localStorage.setItem(grnKey, JSON.stringify(nextGrns)); } catch (_) {}
      await apiService.saveModuleRecord('pharmacy_stock_receipts', receipt).catch(() => {});

      // 3. Auto-post expense if paid immediately
      if (paymentStatus !== 'Credit (Payable)' && totalCost > 0) {
        const exp: PharmacyExpenseRecord = {
          id: `pexp_grn_${Date.now()}`,
          institutionId: instKey,
          date: receivedDate,
          category: 'Supplier Stock Purchase',
          description: `Stock Received (${grnNumber}) — ${items.map(i => `${i.drugName} x${i.quantity}`).join(', ')}`,
          vendor: sup.name,
          amount: totalCost,
          paymentMethod: paymentStatus.includes('Cash') ? 'Cash' : paymentStatus.includes('Bank') ? 'Bank Transfer' : 'M-Pesa',
          reference: invoiceRef.trim() || grnNumber,
          status: 'Paid',
          recordedBy: currentUser?.name || 'Pharmacist',
          createdAt: new Date().toISOString(),
        };
        const nextExps = [exp, ...expenses];
        setExpenses(nextExps);
        try { localStorage.setItem(expensesKey, JSON.stringify(nextExps)); } catch (_) {}
        await apiService.saveModuleRecord('pharmacy_expenses', exp).catch(() => {});
      }

      setInvoiceRef('');
      setGrnNotes('');
      setGrnLines([
        {
          drugId: '',
          drugName: '',
          category: 'General Medicine',
          quantity: 10,
          unitCost: 100,
          sellingPrice: 150,
          batchNumber: `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        },
      ]);
      await onRefreshData();
      setBanner({
        type: 'success',
        text: `✅ Stock Received (${grnNumber}) from ${sup.name}: ${items.length} item(s) worth KES ${totalCost.toLocaleString()} added to inventory & FEFO batches!`,
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Failed to record stock receipt.' });
    } finally {
      setIsSavingGrn(false);
    }
  };

  const handlePrintGrnPdf = (grn: PharmacyStockReceipt) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${pharmacyName.toUpperCase()} — GOODS RECEIVED NOTE (GRN)`, 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`GRN #: ${grn.grnNumber}   |   Supplier: ${grn.supplierName}   |   Supplier Invoice: ${grn.invoiceRef}`, 14, 23);
    doc.text(`Date: ${grn.receivedDate}   |   Payment: ${grn.paymentStatus}   |   Received By: ${grn.receivedBy}`, 14, 29);

    autoTable(doc, {
      startY: 35,
      head: [['Drug Name', 'Batch #', 'Expiry', 'Qty', 'Unit Cost', 'Sell Price', 'Line Total']],
      body: grn.items.map(it => [
        it.drugName,
        it.batchNumber,
        it.expiryDate,
        String(it.quantity),
        `KES ${it.unitCost.toLocaleString()}`,
        `KES ${it.sellingPrice.toLocaleString()}`,
        `KES ${it.lineTotal.toLocaleString()}`,
      ]),
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
    });

    const y = (doc as any).lastAutoTable?.finalY || 90;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GRN VALUE: KES ${grn.totalCost.toLocaleString()}`, 196, y + 10, { align: 'right' });
    doc.save(`${grn.grnNumber}.pdf`);
  };

  // ── EXPENSES FORM STATE ──
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expDescription, setExpDescription] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expMethod, setExpMethod] = useState<PharmacyExpenseRecord['paymentMethod']>('M-Pesa');
  const [expRef, setExpRef] = useState('');
  const [expStatus, setExpStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [expFilterCat, setExpFilterCat] = useState('ALL');
  const [expSearch, setExpSearch] = useState('');

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expAmount) || 0;
    if (!expDescription.trim() || amt <= 0) {
      setBanner({ type: 'error', text: 'Enter expense description and amount > 0.' });
      return;
    }
    const rec: PharmacyExpenseRecord = {
      id: `pexp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      institutionId: instKey,
      date: expDate,
      category: expCategory,
      description: expDescription.trim(),
      vendor: expVendor.trim(),
      amount: amt,
      paymentMethod: expMethod,
      reference: expRef.trim(),
      status: expStatus,
      recordedBy: currentUser?.name || 'Pharmacist',
      createdAt: new Date().toISOString(),
    };
    const next = [rec, ...expenses];
    setExpenses(next);
    try { localStorage.setItem(expensesKey, JSON.stringify(next)); } catch (_) {}
    await apiService.saveModuleRecord('pharmacy_expenses', rec).catch(() => {});
    setExpDescription('');
    setExpVendor('');
    setExpAmount('');
    setExpRef('');
    setBanner({ type: 'success', text: `✅ Recorded expense "${rec.description}" (KES ${rec.amount.toLocaleString()}).` });
  };

  const handleToggleExpensePaid = async (rec: PharmacyExpenseRecord) => {
    const updated: PharmacyExpenseRecord = { ...rec, status: rec.status === 'Paid' ? 'Pending' : 'Paid' };
    const next = expenses.map(e => (e.id === rec.id ? updated : e));
    setExpenses(next);
    try { localStorage.setItem(expensesKey, JSON.stringify(next)); } catch (_) {}
    await apiService.saveModuleRecord('pharmacy_expenses', updated).catch(() => {});
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense record?')) return;
    const next = expenses.filter(e => e.id !== id);
    setExpenses(next);
    try { localStorage.setItem(expensesKey, JSON.stringify(next)); } catch (_) {}
    await apiService.deleteModuleRecord('pharmacy_expenses', id).catch(() => {});
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (expFilterCat !== 'ALL' && e.category !== expFilterCat) return false;
      const q = expSearch.trim().toLowerCase();
      if (q && !e.description.toLowerCase().includes(q) && !(e.vendor || '').toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [expenses, expFilterCat, expSearch]);

  const expenseStats = useMemo(() => {
    const total = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const paid = filteredExpenses.filter(e => e.status === 'Paid').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const pending = filteredExpenses.filter(e => e.status === 'Pending').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { total, paid, pending };
  }, [filteredExpenses]);

  const handleExportExpensesPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${pharmacyName.toUpperCase()} — PHARMACY EXPENSES REPORT`, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}  |  Total: KES ${expenseStats.total.toLocaleString()}  |  Paid: KES ${expenseStats.paid.toLocaleString()}  |  Pending: KES ${expenseStats.pending.toLocaleString()}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Category', 'Description', 'Vendor / Payee', 'Method', 'Ref #', 'Status', 'Amount (KES)']],
      body: filteredExpenses.map(e => [
        e.date,
        e.category,
        e.description,
        e.vendor || '—',
        e.paymentMethod,
        e.reference || '—',
        e.status,
        `KES ${(Number(e.amount) || 0).toLocaleString()}`,
      ]),
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
    });
    doc.save(`Pharmacy_Expenses_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ── RENDER: RECEIVE STOCK FROM SUPPLIERS ──
  if (mode === 'receiving') {
    const totalDraftCost = grnLines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
    return (
      <div className="space-y-6 animate-fade-in">
        {banner && (
          <div className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            banner.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span>{banner.text}</span>
            <button type="button" onClick={() => setBanner(null)} className="font-black cursor-pointer">✕</button>
          </div>
        )}

        {/* Receive Stock Form Card */}
        <form onSubmit={handleSubmitGrn} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                📦 Receive Stock from Supplier (GRN)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically updates drug quantities, logs FEFO batch numbers &amp; expiry dates, and posts paid stock purchases to Expenses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSupplier(v => !v)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              {showAddSupplier ? 'Close Supplier Form' : '+ New Supplier'}
            </button>
          </div>

          {showAddSupplier && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Supplier Name *</label>
                <input type="text" value={newSupName} onChange={e => setNewSupName(e.target.value)} placeholder="e.g. KEMSA / Wholesaler" className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Phone</label>
                <input type="text" value={newSupPhone} onChange={e => setNewSupPhone(e.target.value)} placeholder="07XX XXX XXX" className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Terms</label>
                <input type="text" value={newSupTerms} onChange={e => setNewSupTerms(e.target.value)} placeholder="30 Days Credit" className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold" />
              </div>
              <button type="button" onClick={handleAddSupplier} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase cursor-pointer">
                Save Supplier
              </button>
            </div>
          )}

          {/* Header Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Supplier *</label>
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Supplier Invoice / D-Note #</label>
              <input
                type="text"
                value={invoiceRef}
                onChange={e => setInvoiceRef(e.target.value)}
                placeholder="e.g. INV-2026-8841"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Date Received</label>
              <input
                type="date"
                value={receivedDate}
                onChange={e => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
              >
                <option value="Paid - M-Pesa">Paid - M-Pesa</option>
                <option value="Paid - Cash">Paid - Cash</option>
                <option value="Paid - Bank">Paid - Bank Transfer</option>
                <option value="Credit (Payable)">Credit (Supplier Payable)</option>
              </select>
            </div>
          </div>

          {/* Drug Line Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Drugs &amp; Batches Being Received</span>
              <button
                type="button"
                onClick={() =>
                  setGrnLines(prev => [
                    ...prev,
                    {
                      drugId: '',
                      drugName: '',
                      category: 'General Medicine',
                      quantity: 10,
                      unitCost: 100,
                      sellingPrice: 150,
                      batchNumber: `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
                      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
                    },
                  ])
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase cursor-pointer"
              >
                + Add Drug Row
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="p-2.5">Existing Drug (Optional)</th>
                    <th className="p-2.5">Drug Name *</th>
                    <th className="p-2.5">Qty *</th>
                    <th className="p-2.5">Unit Cost</th>
                    <th className="p-2.5">Sell Price</th>
                    <th className="p-2.5">Batch #</th>
                    <th className="p-2.5">Expiry</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grnLines.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <select
                          value={row.drugId}
                          onChange={e => handleSelectExistingDrug(idx, e.target.value)}
                          className="w-36 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold"
                        >
                          <option value="">-- New Drug --</option>
                          {inventory.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.drugName}
                          onChange={e => setGrnLines(prev => prev.map((r, i) => i === idx ? { ...r, drugName: e.target.value } : r))}
                          placeholder="Drug name..."
                          className="w-40 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={e => setGrnLines(prev => prev.map((r, i) => i === idx ? { ...r, quantity: Number(e.target.value) } : r))}
                          className="w-16 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={row.unitCost}
                          onChange={e => setGrnLines(prev => prev.map((r, i) => i === idx ? { ...r, unitCost: Number(e.target.value) } : r))}
                          className="w-20 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={row.sellingPrice}
                          onChange={e => setGrnLines(prev => prev.map((r, i) => i === idx ? { ...r, sellingPrice: Number(e.target.value) } : r))}
                          className="w-20 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.batchNumber}
                          onChange={e => setGrnLines(prev => prev.map((r, i) => i === idx ? { ...r, batchNumber: e.target.value } : r))}
                          className="w-24 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.expiryDate}
                          onChange={e => setGrnLines(prev => prev.map((r, i) => i === idx ? { ...r, expiryDate: e.target.value } : r))}
                          className="w-32 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px]"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                        KES {((Number(row.quantity) || 0) * (Number(row.unitCost) || 0)).toLocaleString()}
                      </td>
                      <td className="p-2 text-right">
                        {grnLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setGrnLines(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 font-black cursor-pointer px-1"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="text-sm font-black text-slate-900">
              Total Stock Value: <span className="text-emerald-700 font-mono">KES {totalDraftCost.toLocaleString()}</span>
            </div>
            <button
              type="submit"
              disabled={isSavingGrn}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
            >
              {isSavingGrn ? 'Receiving Stock...' : '✅ Confirm & Receive Stock into Inventory'}
            </button>
          </div>
        </form>

        {/* Recent Goods Received Notes (GRN) History */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
            📜 Recent Supplier Deliveries / GRN History ({grns.length})
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-3">GRN #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Invoice Ref</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-right">Total Cost</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grns.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-bold">No supplier deliveries recorded yet.</td></tr>
                ) : (
                  grns.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-black text-indigo-700">{g.grnNumber}</td>
                      <td className="p-3 font-semibold">{g.receivedDate}</td>
                      <td className="p-3 font-bold text-slate-900">{g.supplierName}</td>
                      <td className="p-3 font-mono text-slate-500">{g.invoiceRef}</td>
                      <td className="p-3 text-slate-600">{g.items.length} drug(s) ({g.items.reduce((s, i) => s + i.quantity, 0)} units)</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          g.paymentStatus.includes('Credit') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {g.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">KES {g.totalCost.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintGrnPdf(g)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-[10px] font-black uppercase cursor-pointer transition-colors"
                        >
                          📄 GRN PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: PHARMACY EXPENSE MODULE ──
  return (
    <div className="space-y-6 animate-fade-in">
      {banner && (
        <div className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
          banner.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Expense KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Expenses</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">KES {expenseStats.total.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{filteredExpenses.length} expense voucher(s)</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Paid Out</div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">KES {expenseStats.paid.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Settled operating &amp; stock bills</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">Pending / Unpaid</div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">KES {expenseStats.pending.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting disbursement</div>
        </div>
      </div>

      {/* Record New Expense Form */}
      <form onSubmit={handleAddExpense} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
          💸 Record Pharmacy / Chemist Expense
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Date</label>
            <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Category</label>
            <select value={expCategory} onChange={e => setExpCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Amount (KES) *</label>
            <input type="number" min={1} required value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="e.g. 4500" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-black" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Payment Method</label>
            <select value={expMethod} onChange={e => setExpMethod(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
              <option value="M-Pesa">M-Pesa</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Description *</label>
            <input type="text" required value={expDescription} onChange={e => setExpDescription(e.target.value)} placeholder="e.g. Monthly Chemist Rent / KPLC Token / Dispensing Envelopes" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Vendor / Payee</label>
            <input type="text" value={expVendor} onChange={e => setExpVendor(e.target.value)} placeholder="e.g. Kenya Power" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Ref #</label>
              <input type="text" value={expRef} onChange={e => setExpRef(e.target.value)} placeholder="M-Pesa / Rcpt" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono" />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Status</label>
              <select value={expStatus} onChange={e => setExpStatus(e.target.value as any)} className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer">
            + Save Expense
          </button>
        </div>
      </form>

      {/* Expenses Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={expFilterCat} onChange={e => setExpFilterCat(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" value={expSearch} onChange={e => setExpSearch(e.target.value)} placeholder="Search expenses..." className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold" />
          </div>
          <button type="button" onClick={handleExportExpensesPdf} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer">
            📄 Export Expenses PDF
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description &amp; Payee</th>
                <th className="p-3">Method / Ref</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">No pharmacy expenses recorded yet.</td></tr>
              ) : (
                filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold whitespace-nowrap">{e.date}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">{e.category}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{e.description}</div>
                      {e.vendor && <div className="text-[10px] text-slate-500">Payee: {e.vendor}</div>}
                    </td>
                    <td className="p-3 text-slate-600">
                      <span className="font-bold">{e.paymentMethod}</span>
                      {e.reference && <span className="ml-1.5 font-mono text-[10px] text-slate-400">({e.reference})</span>}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleToggleExpensePaid(e)}
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase cursor-pointer ${
                          e.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                        }`}
                        title="Click to toggle Paid / Pending"
                      >
                        {e.status}
                      </button>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                      KES {(Number(e.amount) || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(e.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
