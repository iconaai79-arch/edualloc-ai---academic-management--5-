import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { Institution, User } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProcurementItem {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    name: string;
    category: string;
    unit: string;
    unitCost?: number;
    unit_cost?: number;
    reorderLevel?: number;
    reorder_level?: number;
    currentStock?: number;
    current_stock?: number;
    description?: string;
    itemCode?: string;
    item_code?: string;
    isActive?: boolean;
}

interface ProcurementSupplier {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    name: string;
    contactPerson?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    kraPin?: string;
    kra_pin?: string;
    paymentTerms?: string;
    payment_terms?: string;
    bankName?: string;
    bank_name?: string;
    bankAccount?: string;
    bank_account?: string;
    bankBranch?: string;
    bank_branch?: string;
    rating?: number;
    category?: string;
    outstandingBalance?: number;
    outstanding_balance?: number;
    totalPurchases?: number;
    total_purchases?: number;
    notes?: string;
}

interface LPOItem {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    total: number;
}

interface ProcurementLPO {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    lpoNumber?: string;
    lpo_number?: string;
    supplierId?: string;
    supplier_id?: string;
    supplierName?: string;
    requisitionId?: string;
    requisition_id?: string;
    issuedDate?: string;
    issued_date?: string;
    expectedDeliveryDate?: string;
    expected_delivery_date?: string;
    deliveryAddress?: string;
    delivery_address?: string;
    items?: LPOItem[];
    subtotal?: number;
    taxAmount?: number;
    tax_amount?: number;
    totalAmount?: number;
    total_amount?: number;
    status?: string;
    notes?: string;
    approvedBy?: string;
    approved_by?: string;
    createdBy?: string;
    created_by?: string;
}

interface ProcurementInvoice {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    lpoId?: string;
    lpo_id?: string;
    lpoNumber?: string;
    supplierId?: string;
    supplier_id?: string;
    supplierName?: string;
    invoiceNumber?: string;
    invoice_number?: string;
    invoiceDate?: string;
    invoice_date?: string;
    dueDate?: string;
    due_date?: string;
    items?: LPOItem[];
    amount?: number;
    taxAmount?: number;
    tax_amount?: number;
    totalAmount?: number;
    total_amount?: number;
    amountPaid?: number;
    amount_paid?: number;
    balanceOwing?: number;
    balance_owing?: number;
    status?: string;
    paymentReference?: string;
    payment_reference?: string;
    paymentDate?: string;
    payment_date?: string;
    paymentMethod?: string;
    payment_method?: string;
    notes?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProcurementHubProps {
    institution: Institution;
    currentUser?: User;
}

// ─── Sub-tab config ───────────────────────────────────────────────────────────

const TABS = [
    { id: 'inventory',  label: 'Items Inventory',       emoji: '📦' },
    { id: 'suppliers',  label: 'Supplier Registration',  emoji: '🏭' },
    { id: 'requisitions', label: 'Requisitions',         emoji: '📋' },
    { id: 'lpos',       label: 'LPO Management',         emoji: '📄' },
    { id: 'invoices',   label: 'Supplier Invoices',      emoji: '🧾' },
    { id: 'reports',    label: 'Reports',                emoji: '📊' },
] as const;
type TabId = typeof TABS[number]['id'];

const STATUS_COLORS: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    approved:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    rejected:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    draft:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    issued:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    received:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    paid:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    partial:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    overdue:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

// ─── Main Component ───────────────────────────────────────────────────────────

export const ProcurementHub: React.FC<ProcurementHubProps> = ({ institution, currentUser }) => {
    const [activeTab, setActiveTab] = useState<TabId>('inventory');

    // ── Data state ──
    const [items, setItems] = useState<ProcurementItem[]>([]);
    const [schoolItems, setSchoolItems] = useState<any[]>([]); // retail_inventory_items
    const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
    const [lpos, setLpos] = useState<ProcurementLPO[]>([]);
    const [invoices, setInvoices] = useState<ProcurementInvoice[]>([]);
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inventoryView, setInventoryView] = useState<'all' | 'procurement' | 'school'>('all');
    const [importingId, setImportingId] = useState<string | null>(null);

    // ── Modal state ──
    const [showItemModal, setShowItemModal] = useState(false);
    const [editItem, setEditItem] = useState<ProcurementItem | null>(null);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editSupplier, setEditSupplier] = useState<ProcurementSupplier | null>(null);
    const [showLPOModal, setShowLPOModal] = useState(false);
    const [editLPO, setEditLPO] = useState<ProcurementLPO | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [editInvoice, setEditInvoice] = useState<ProcurementInvoice | null>(null);
    const [showReqModal, setShowReqModal] = useState(false);

    // ── Search / filter ──
    const [itemSearch, setItemSearch] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
    const [lpoSearch, setLpoSearch] = useState('');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [reqSearch, setReqSearch] = useState('');

    // ── Forms ──
    const emptyItem = (): ProcurementItem => ({ name: '', category: 'General', unit: 'pcs', unitCost: 0, reorderLevel: 5, currentStock: 0, description: '', itemCode: '' });
    const emptySupplier = (): ProcurementSupplier => ({ name: '', contactPerson: '', phone: '', email: '', address: '', kraPin: '', paymentTerms: 'Net 30', bankName: '', bankAccount: '', bankBranch: '', rating: 3, category: 'General', notes: '' });
    const emptyLPO = (): ProcurementLPO => ({ lpoNumber: `LPO-${Date.now()}`, supplierId: '', issuedDate: new Date().toISOString().split('T')[0], expectedDeliveryDate: '', deliveryAddress: '', items: [], subtotal: 0, taxAmount: 0, totalAmount: 0, status: 'draft', notes: '' });
    const emptyInvoice = (): ProcurementInvoice => ({ lpoId: '', supplierId: '', invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', items: [], amount: 0, taxAmount: 0, totalAmount: 0, amountPaid: 0, status: 'pending', paymentMethod: 'Bank Transfer', notes: '' });
    const emptyReq = () => ({ title: '', departmentId: '', priority: 'normal', items: [], notes: '', status: 'pending' });

    const [itemForm, setItemForm] = useState<ProcurementItem>(emptyItem());
    const [supplierForm, setSupplierForm] = useState<ProcurementSupplier>(emptySupplier());
    const [lpoForm, setLpoForm] = useState<ProcurementLPO>(emptyLPO());
    const [invoiceForm, setInvoiceForm] = useState<ProcurementInvoice>(emptyInvoice());
    const [reqForm, setReqForm] = useState<any>(emptyReq());

    // LPO line items
    const [lpoLineItem, setLpoLineItem] = useState<LPOItem>({ name: '', quantity: 1, unit: 'pcs', unitCost: 0, total: 0 });

    // ── Load data ──
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [its, sups, lps, invs, reqs, schItems] = await Promise.all([
                apiService.fetchModuleRecords<ProcurementItem>('procurement_items', institution.id).catch(() => []),
                apiService.fetchModuleRecords<ProcurementSupplier>('procurement_suppliers', institution.id).catch(() => []),
                apiService.fetchModuleRecords<ProcurementLPO>('procurement_lpos', institution.id).catch(() => []),
                apiService.fetchModuleRecords<ProcurementInvoice>('procurement_invoices', institution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('requisitions', institution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('retail_inventory_items', institution.id).catch(() => []),
            ]);
            setItems(its);
            setSuppliers(sups);
            setLpos(lps);
            setInvoices(invs);
            setRequisitions(reqs);
            setSchoolItems(schItems);
        } finally {
            setLoading(false);
        }
    }, [institution.id]);

    useEffect(() => { load(); }, [load]);

    // ── Helpers ──
    const supplierName = (id?: string) => suppliers.find(s => s.id === id)?.name || '—';
    const lpoNumber = (id?: string) => lpos.find(l => l.id === id)?.lpoNumber || lpos.find(l => l.id === id)?.lpo_number || '—';

    // ── Save handlers ──
    const handleOpenCreateLPO = async (req?: any) => {
        setEditLPO(null);
        let nextLPO = `LPO-${Date.now().toString().slice(-6)}`;
        try {
            nextLPO = await apiService.getNextDocumentNumber(institution.id, 'lpo');
        } catch (e) {
            console.error("Failed to generate LPO number:", e);
        }
        
        const base = emptyLPO();
        setLpoForm({
            ...base,
            lpoNumber: nextLPO,
            requisitionId: req?.id || base.requisitionId,
            items: req?.items || base.items || []
        });
        setShowLPOModal(true);
        if (req) setActiveTab('lpos');
    };

    const saveItem = async () => {
        await apiService.saveModuleRecord('procurement_items', { ...itemForm, institution_id: institution.id, institutionId: institution.id, unit_cost: itemForm.unitCost, reorder_level: itemForm.reorderLevel, current_stock: itemForm.currentStock, item_code: itemForm.itemCode, is_active: true });
        setShowItemModal(false); setEditItem(null); setItemForm(emptyItem()); load();
    };

    const saveSupplier = async () => {
        await apiService.saveModuleRecord('procurement_suppliers', { ...supplierForm, institution_id: institution.id, institutionId: institution.id, contact_person: supplierForm.contactPerson, kra_pin: supplierForm.kraPin, payment_terms: supplierForm.paymentTerms, bank_name: supplierForm.bankName, bank_account: supplierForm.bankAccount, bank_branch: supplierForm.bankBranch, is_active: true });
        setShowSupplierModal(false); setEditSupplier(null); setSupplierForm(emptySupplier()); load();
    };

    const saveLPO = async () => {
        let finalLpoNumber = lpoForm.lpoNumber || lpoForm.lpo_number;
        if (!finalLpoNumber || finalLpoNumber.startsWith('LPO-17') || finalLpoNumber.includes(Date.now().toString().slice(0, 5))) {
            try {
                finalLpoNumber = await apiService.getNextDocumentNumber(institution.id, 'lpo');
            } catch (e) {}
        }
        const subtotal = (lpoForm.items || []).reduce((s, i) => s + i.total, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;
        await apiService.saveModuleRecord('procurement_lpos', { 
            ...lpoForm, 
            institution_id: institution.id, 
            institutionId: institution.id, 
            lpo_number: finalLpoNumber, 
            lpoNumber: finalLpoNumber,
            supplier_id: lpoForm.supplierId, 
            requisition_id: lpoForm.requisitionId, 
            issued_date: lpoForm.issuedDate, 
            expected_delivery_date: lpoForm.expectedDeliveryDate, 
            delivery_address: lpoForm.deliveryAddress, 
            tax_amount: tax, 
            total_amount: total, 
            subtotal, 
            created_by: currentUser?.name || currentUser?.id 
        });
        setShowLPOModal(false); setEditLPO(null); setLpoForm(emptyLPO()); load();
    };

    const saveInvoice = async () => {
        const total = (invoiceForm.totalAmount || 0);
        const balance = total - (invoiceForm.amountPaid || 0);
        const status = (invoiceForm.amountPaid || 0) >= total ? 'paid' : (invoiceForm.amountPaid || 0) > 0 ? 'partial' : 'pending';
        await apiService.saveModuleRecord('procurement_invoices', { ...invoiceForm, institution_id: institution.id, institutionId: institution.id, lpo_id: invoiceForm.lpoId, supplier_id: invoiceForm.supplierId, invoice_number: invoiceForm.invoiceNumber, invoice_date: invoiceForm.invoiceDate, due_date: invoiceForm.dueDate, tax_amount: invoiceForm.taxAmount, total_amount: total, amount_paid: invoiceForm.amountPaid, payment_reference: invoiceForm.paymentReference, payment_date: invoiceForm.paymentDate, payment_method: invoiceForm.paymentMethod, status });
        setShowInvoiceModal(false); setEditInvoice(null); setInvoiceForm(emptyInvoice()); load();
    };

    const updateReqStatus = async (id: string, status: string) => {
        await apiService.saveModuleRecord('requisitions', { id, status, institution_id: institution.id });
        load();
    };

    const addLpoLine = () => {
        if (!lpoLineItem.name || lpoLineItem.quantity < 1) return;
        const line = { ...lpoLineItem, total: lpoLineItem.quantity * lpoLineItem.unitCost };
        setLpoForm(f => ({ ...f, items: [...(f.items || []), line] }));
        setLpoLineItem({ name: '', quantity: 1, unit: 'pcs', unitCost: 0, total: 0 });
    };

    // ── Import school store item into procurement catalogue ──
    const importFromSchool = async (schoolItem: any) => {
        setImportingId(schoolItem.id);
        try {
            // Check if already imported (match by name + institution)
            const existing = items.find(i => i.name.toLowerCase() === (schoolItem.name || '').toLowerCase());
            if (existing) {
                alert(`"${schoolItem.name}" is already in the Procurement catalogue.`);
                return;
            }
            await apiService.saveModuleRecord('procurement_items', {
                institution_id: institution.id,
                institutionId: institution.id,
                name: schoolItem.name,
                category: schoolItem.category || 'General',
                unit: schoolItem.unit || 'pcs',
                unit_cost: schoolItem.costPrice || schoolItem.cost_price || schoolItem.basePrice || schoolItem.base_price || 0,
                unitCost: schoolItem.costPrice || schoolItem.cost_price || schoolItem.basePrice || schoolItem.base_price || 0,
                reorder_level: schoolItem.reorderLevel || schoolItem.reorder_level || 5,
                reorderLevel: schoolItem.reorderLevel || schoolItem.reorder_level || 5,
                current_stock: schoolItem.quantity || 0,
                currentStock: schoolItem.quantity || 0,
                item_code: schoolItem.sku || '',
                itemCode: schoolItem.sku || '',
                description: schoolItem.description || '',
                is_active: true,
                // Store the retail item ID for two-way sync
                retail_item_id: schoolItem.id,
            });
            await load();
        } finally {
            setImportingId(null);
        }
    };

    // ── Mark LPO as Received and push qty into school store inventory ──
    const markLPOReceived = async (lpo: ProcurementLPO) => {
        if (!window.confirm(`Mark LPO ${lpo.lpoNumber || lpo.lpo_number} as RECEIVED?\n\nThis will update stock levels in both Procurement and School Store inventory.`)) return;
        // 1. Update LPO status
        await apiService.saveModuleRecord('procurement_lpos', { id: lpo.id, status: 'received', institution_id: institution.id });
        // 2. For each LPO line item, update procurement_items stock + retail_inventory_items quantity
        for (const line of (lpo.items || [])) {
            const procItem = items.find(i => i.name.toLowerCase() === line.name.toLowerCase());
            if (procItem?.id) {
                const newStock = (procItem.currentStock || procItem.current_stock || 0) + line.quantity;
                await apiService.saveModuleRecord('procurement_items', { id: procItem.id, current_stock: newStock, currentStock: newStock, institution_id: institution.id }).catch(() => null);
            }
            const schItem = schoolItems.find(s => s.name.toLowerCase() === line.name.toLowerCase());
            if (schItem?.id) {
                const newQty = (schItem.quantity || 0) + line.quantity;
                await apiService.saveModuleRecord('retail_inventory_items', { id: schItem.id, quantity: newQty, institution_id: institution.id }).catch(() => null);
            }
        }
        await load();
    };

    // ── Report computations ──
    const totalOwing = invoices.reduce((s, inv) => s + (inv.balanceOwing || inv.balance_owing || ((inv.totalAmount || inv.total_amount || 0) - (inv.amountPaid || inv.amount_paid || 0))), 0);
    const totalPaid = invoices.reduce((s, inv) => s + (inv.amountPaid || inv.amount_paid || 0), 0);
    const overdueInvoices = invoices.filter(inv => {
        const due = inv.dueDate || inv.due_date;
        return due && new Date(due) < new Date() && (inv.status !== 'paid');
    });

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">🛒 Procurement</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">End-to-end procurement: inventory → suppliers → requisitions → LPOs → invoices</p>
                </div>
                <div className="flex gap-2 text-[10px] font-bold">
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl">
                        💰 Owing: {fmt(totalOwing)}
                    </div>
                    <div className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
                        ⚠️ Overdue: {overdueInvoices.length}
                    </div>
                </div>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span>{tab.emoji}</span> {tab.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading procurement data...
                </div>
            )}

            {/* ══════════════════ TAB: ITEMS INVENTORY ══════════════════ */}
            {activeTab === 'inventory' && !loading && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="🔍 Search items..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        {/* View filter pills */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                            {(['all', 'procurement', 'school'] as const).map(v => (
                                <button key={v} onClick={() => setInventoryView(v)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    inventoryView === v ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}>{v === 'all' ? 'All' : v === 'procurement' ? '🛒 Procurement' : '🏪 School Store'}</button>
                            ))}
                        </div>
                        <button onClick={() => { setEditItem(null); setItemForm(emptyItem()); setShowItemModal(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + Add Item
                        </button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Procurement Items', value: items.length, color: 'indigo' },
                            { label: 'School Store Items', value: schoolItems.length, color: 'purple' },
                            { label: 'Low Stock (Procurement)', value: items.filter(i => (i.currentStock || i.current_stock || 0) <= (i.reorderLevel || i.reorder_level || 0)).length, color: 'amber' },
                            { label: 'Procurement Value', value: fmt(items.reduce((s, i) => s + (i.currentStock || i.current_stock || 0) * (i.unitCost || i.unit_cost || 0), 0)), color: 'emerald', isText: true },
                        ].map(stat => (
                            <div key={stat.label} className={`p-4 rounded-2xl border bg-${stat.color}-50 dark:bg-${stat.color}-950/30 border-${stat.color}-100 dark:border-${stat.color}-900`}>
                                <p className={`text-[10px] font-bold text-${stat.color}-600 dark:text-${stat.color}-400 uppercase tracking-wider`}>{stat.label}</p>
                                <p className={`text-xl font-black text-${stat.color}-700 dark:text-${stat.color}-300 mt-1`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Procurement Items Table ── */}
                    {(inventoryView === 'all' || inventoryView === 'procurement') && (
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">🛒 Procurement Catalogue</p>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        <tr>{['Code', 'Name', 'Category', 'Unit', 'Unit Cost', 'Stock', 'Reorder', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || (i.category || '').toLowerCase().includes(itemSearch.toLowerCase())).map(item => {
                                            const stock = item.currentStock ?? item.current_stock ?? 0;
                                            const reorder = item.reorderLevel ?? item.reorder_level ?? 0;
                                            const isLow = stock <= reorder;
                                            const linkedSchool = schoolItems.find(s => s.name.toLowerCase() === item.name.toLowerCase());
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-slate-500">{item.itemCode || item.item_code || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                                                        {linkedSchool && <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full text-[8px] font-black">🏪 LINKED</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.category}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.unit}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(item.unitCost ?? item.unit_cost ?? 0)}</td>
                                                    <td className={`px-4 py-3 font-black ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>{stock}</td>
                                                    <td className="px-4 py-3 text-slate-500">{reorder}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {isLow ? '⚠ Low' : '✓ OK'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button onClick={() => { setItemForm({ ...item, unitCost: item.unitCost ?? item.unit_cost, reorderLevel: item.reorderLevel ?? item.reorder_level, currentStock: item.currentStock ?? item.current_stock, itemCode: item.itemCode ?? item.item_code }); setEditItem(item); setShowItemModal(true); }} className="text-indigo-600 hover:text-indigo-800 font-black">Edit</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {items.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No procurement items yet. Click + Add Item or import from School Store below.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── School Store Items Table ── */}
                    {(inventoryView === 'all' || inventoryView === 'school') && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">🏪 School Store Inventory</p>
                                <p className="text-[10px] text-slate-400">Items imported into Procurement get a <span className="font-black text-indigo-600">🛒 IMPORTED</span> badge</p>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-purple-200 dark:border-purple-800">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-purple-50 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-800">
                                        <tr>{['SKU', 'Name', 'Category', 'Unit', 'Cost Price', 'Qty in Store', 'Reorder', 'Linked', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-black text-purple-500 dark:text-purple-400 uppercase tracking-wider">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-50 dark:divide-purple-900/30">
                                        {schoolItems.filter(s => !itemSearch || (s.name || '').toLowerCase().includes(itemSearch.toLowerCase())).map(si => {
                                            const alreadyImported = items.some(i => i.name.toLowerCase() === (si.name || '').toLowerCase());
                                            return (
                                                <tr key={si.id} className="hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-slate-500">{si.sku || '—'}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{si.name}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{si.category || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{si.unit || 'pcs'}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(si.costPrice || si.cost_price || si.basePrice || si.base_price || 0)}</td>
                                                    <td className={`px-4 py-3 font-black ${(si.quantity || 0) <= (si.reorderLevel || si.reorder_level || 0) ? 'text-rose-600' : 'text-emerald-600'}`}>{si.quantity || 0}</td>
                                                    <td className="px-4 py-3 text-slate-500">{si.reorderLevel || si.reorder_level || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        {alreadyImported
                                                            ? <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full font-black text-[9px]">🛒 Imported</span>
                                                            : <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full font-black text-[9px]">Not imported</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {!alreadyImported && (
                                                            <button
                                                                onClick={() => importFromSchool(si)}
                                                                disabled={importingId === si.id}
                                                                className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[9px] font-black hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                            >
                                                                {importingId === si.id ? '...' : '⬆ Import'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {schoolItems.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No school store items found. Add items in the Retail/Store module first.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════ TAB: SUPPLIERS ══════════════════ */}
            {activeTab === 'suppliers' && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} placeholder="🔍 Search suppliers..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => { setEditSupplier(null); setSupplierForm(emptySupplier()); setShowSupplierModal(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + Register Supplier
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suppliers.filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase())).map(sup => {
                            const owing = sup.outstandingBalance ?? sup.outstanding_balance ?? 0;
                            return (
                                <div key={sup.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-white text-sm">{sup.name}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{sup.category} • {sup.paymentTerms || sup.payment_terms}</p>
                                        </div>
                                        <span className="text-lg">{'⭐'.repeat(sup.rating || 3)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div><span className="text-slate-400">Contact:</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{sup.contactPerson || sup.contact_person || '—'}</span></div>
                                        <div><span className="text-slate-400">Phone:</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{sup.phone || '—'}</span></div>
                                        <div><span className="text-slate-400">KRA PIN:</span><br /><span className="font-mono font-bold text-slate-700 dark:text-slate-200">{sup.kraPin || sup.kra_pin || '—'}</span></div>
                                        <div><span className="text-slate-400">Bank:</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{sup.bankName || sup.bank_name || '—'}</span></div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold">Outstanding</p>
                                            <p className={`font-black text-sm ${owing > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(owing)}</p>
                                        </div>
                                        <button onClick={() => { setSupplierForm({ ...sup, contactPerson: sup.contactPerson ?? sup.contact_person, kraPin: sup.kraPin ?? sup.kra_pin, paymentTerms: sup.paymentTerms ?? sup.payment_terms, bankName: sup.bankName ?? sup.bank_name, bankAccount: sup.bankAccount ?? sup.bank_account, bankBranch: sup.bankBranch ?? sup.bank_branch }); setEditSupplier(sup); setShowSupplierModal(true); }} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-colors">Edit</button>
                                    </div>
                                </div>
                            );
                        })}
                        {suppliers.length === 0 && <div className="col-span-3 py-12 text-center text-slate-400">No suppliers registered yet. Click + Register Supplier to begin.</div>}
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: REQUISITIONS ══════════════════ */}
            {activeTab === 'requisitions' && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input value={reqSearch} onChange={e => setReqSearch(e.target.value)} placeholder="🔍 Search requisitions..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => { setReqForm(emptyReq()); setShowReqModal(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + New Requisition
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>{['REQ #', 'Title / Description', 'Requested By', 'Date', 'Amount', 'Priority', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {requisitions.filter(r => !reqSearch || (r.title || r.description || '').toLowerCase().includes(reqSearch.toLowerCase())).map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-500">{req.id?.slice(0, 8) || '—'}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white max-w-[180px] truncate">{req.title || req.description || req.notes || '(No title)'}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{req.requestedBy || req.requested_by || req.createdBy || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500">{req.requestedDate || req.requested_date || req.createdAt?.split('T')[0] || '—'}</td>
                                        <td className="px-4 py-3 font-bold">{fmt(req.totalAmount || req.total_amount || 0)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${req.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : req.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {req.priority || 'Normal'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[req.status] || STATUS_COLORS.pending}`}>
                                                {req.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {req.status === 'pending' && <>
                                                    <button onClick={() => updateReqStatus(req.id, 'approved')} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[9px] hover:bg-emerald-200">✓ Approve</button>
                                                    <button onClick={() => updateReqStatus(req.id, 'rejected')} className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg font-black text-[9px] hover:bg-rose-200">✗ Reject</button>
                                                </>}
                                                {req.status === 'approved' && (
                                                    <button onClick={() => handleOpenCreateLPO(req)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-[9px] hover:bg-blue-200">📄 Create LPO</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {requisitions.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No requisitions found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: LPO MANAGEMENT ══════════════════ */}
            {activeTab === 'lpos' && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input value={lpoSearch} onChange={e => setLpoSearch(e.target.value)} placeholder="🔍 Search LPOs..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => handleOpenCreateLPO()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + Create LPO
                        </button>
                    </div>

                    {/* LPO cards */}
                    <div className="space-y-3">
                        {lpos.filter(l => !lpoSearch || (l.lpoNumber || l.lpo_number || '').toLowerCase().includes(lpoSearch.toLowerCase()) || supplierName(l.supplierId || l.supplier_id).toLowerCase().includes(lpoSearch.toLowerCase())).map(lpo => {
                            const sName = supplierName(lpo.supplierId || lpo.supplier_id);
                            const total = lpo.totalAmount || lpo.total_amount || 0;
                            const lpoNum = lpo.lpoNumber || lpo.lpo_number;
                            const status = lpo.status || 'draft';
                            return (
                                <div key={lpo.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-800 dark:text-white text-sm">{lpoNum}</span>
                                                <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>{status}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500">Supplier: <span className="font-bold text-slate-700 dark:text-slate-200">{sName}</span></p>
                                            <p className="text-[11px] text-slate-500">Issued: <span className="font-bold">{lpo.issuedDate || lpo.issued_date}</span> {lpo.expectedDeliveryDate || lpo.expected_delivery_date ? `• Expected: ${lpo.expectedDeliveryDate || lpo.expected_delivery_date}` : ''}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-xl font-black text-slate-800 dark:text-white">{fmt(total)}</p>
                                            <p className="text-[10px] text-slate-400">{(lpo.items || []).length} line items</p>
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => { setInvoiceForm({ ...emptyInvoice(), lpoId: lpo.id, supplierId: lpo.supplierId || lpo.supplier_id, totalAmount: total }); setShowInvoiceModal(true); setActiveTab('invoices'); }} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-xl text-[9px] font-black hover:bg-amber-200">🧾 Record Invoice</button>
                                                {status === 'issued' && (
                                                    <button onClick={() => markLPOReceived(lpo)} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black hover:bg-emerald-200">✅ Mark Received</button>
                                                )}
                                                <button onClick={() => { setLpoForm({ ...lpo, lpoNumber: lpo.lpoNumber ?? lpo.lpo_number, supplierId: lpo.supplierId ?? lpo.supplier_id }); setEditLPO(lpo); setShowLPOModal(true); }} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black hover:bg-indigo-100">Edit</button>
                                            </div>
                                        </div>
                                    </div>
                                    {(lpo.items || []).length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-[10px]">
                                                <thead><tr className="text-slate-400 font-black uppercase tracking-wider"><th className="text-left py-1">Item</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Unit Cost</th><th className="text-right py-1">Total</th></tr></thead>
                                                <tbody>{(lpo.items || []).map((line, i) => (
                                                    <tr key={i} className="border-t border-slate-50 dark:border-slate-800/50">
                                                        <td className="py-1 text-slate-700 dark:text-slate-200">{line.name}</td>
                                                        <td className="py-1 text-right text-slate-500">{line.quantity} {line.unit}</td>
                                                        <td className="py-1 text-right text-slate-500">{fmt(line.unitCost)}</td>
                                                        <td className="py-1 text-right font-bold text-slate-700 dark:text-slate-200">{fmt(line.total)}</td>
                                                    </tr>
                                                ))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {lpos.length === 0 && <div className="py-12 text-center text-slate-400">No LPOs created yet. Approve a requisition and click "Create LPO".</div>}
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: SUPPLIER INVOICES ══════════════════ */}
            {activeTab === 'invoices' && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} placeholder="🔍 Search invoices..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => { setEditInvoice(null); setInvoiceForm(emptyInvoice()); setShowInvoiceModal(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + Record Invoice
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>{['Invoice #', 'Supplier', 'LPO #', 'Invoice Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {invoices.filter(inv => !invoiceSearch || (inv.invoiceNumber || inv.invoice_number || '').toLowerCase().includes(invoiceSearch.toLowerCase()) || supplierName(inv.supplierId || inv.supplier_id).toLowerCase().includes(invoiceSearch.toLowerCase())).map(inv => {
                                    const total = inv.totalAmount ?? inv.total_amount ?? 0;
                                    const paid = inv.amountPaid ?? inv.amount_paid ?? 0;
                                    const balance = inv.balanceOwing ?? inv.balance_owing ?? (total - paid);
                                    const dueDate = inv.dueDate || inv.due_date;
                                    const isOverdue = dueDate && new Date(dueDate) < new Date() && inv.status !== 'paid';
                                    const status = isOverdue ? 'overdue' : (inv.status || 'pending');
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                            <td className="px-3 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{inv.invoiceNumber || inv.invoice_number || '—'}</td>
                                            <td className="px-3 py-3 font-bold text-slate-800 dark:text-white">{supplierName(inv.supplierId || inv.supplier_id)}</td>
                                            <td className="px-3 py-3 font-mono text-slate-500">{lpoNumber(inv.lpoId || inv.lpo_id)}</td>
                                            <td className="px-3 py-3 text-slate-500">{inv.invoiceDate || inv.invoice_date}</td>
                                            <td className={`px-3 py-3 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>{dueDate || '—'}</td>
                                            <td className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(total)}</td>
                                            <td className="px-3 py-3 font-bold text-emerald-600">{fmt(paid)}</td>
                                            <td className={`px-3 py-3 font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(balance)}</td>
                                            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>{status}</span></td>
                                            <td className="px-3 py-3"><button onClick={() => { setInvoiceForm({ ...inv, lpoId: inv.lpoId ?? inv.lpo_id, supplierId: inv.supplierId ?? inv.supplier_id, invoiceNumber: inv.invoiceNumber ?? inv.invoice_number, invoiceDate: inv.invoiceDate ?? inv.invoice_date, dueDate: inv.dueDate ?? inv.due_date, totalAmount: total, taxAmount: inv.taxAmount ?? inv.tax_amount, amountPaid: paid, paymentReference: inv.paymentReference ?? inv.payment_reference, paymentDate: inv.paymentDate ?? inv.payment_date, paymentMethod: inv.paymentMethod ?? inv.payment_method }); setEditInvoice(inv); setShowInvoiceModal(true); }} className="text-indigo-600 hover:text-indigo-800 font-black">Pay / Edit</button></td>
                                        </tr>
                                    );
                                })}
                                {invoices.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">No invoices recorded yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: REPORTS ══════════════════ */}
            {activeTab === 'reports' && !loading && (
                <div className="space-y-6">
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total LPOs Issued', value: lpos.length, sub: fmt(lpos.reduce((s, l) => s + (l.totalAmount || l.total_amount || 0), 0)), color: 'indigo' },
                            { label: 'Total Invoiced', value: invoices.length, sub: fmt(invoices.reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0)), color: 'blue' },
                            { label: 'Total Paid', value: '', sub: fmt(totalPaid), color: 'emerald' },
                            { label: 'Total Owing', value: '', sub: fmt(totalOwing), color: 'rose' },
                        ].map(kpi => (
                            <div key={kpi.label} className={`p-5 rounded-2xl border bg-${kpi.color}-50 dark:bg-${kpi.color}-950/30 border-${kpi.color}-100 dark:border-${kpi.color}-900`}>
                                <p className={`text-[10px] font-black text-${kpi.color}-600 dark:text-${kpi.color}-400 uppercase tracking-wider`}>{kpi.label}</p>
                                {kpi.value !== '' && <p className={`text-2xl font-black text-${kpi.color}-700 dark:text-${kpi.color}-300`}>{kpi.value}</p>}
                                <p className={`text-sm font-black text-${kpi.color}-700 dark:text-${kpi.color}-300 mt-1`}>{kpi.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Supplier Owing Report */}
                    <div>
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">📋 Supplier Outstanding Balances</h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <tr>{['Supplier', 'Total Invoiced', 'Total Paid', 'Balance Owing', 'Overdue Invoices', 'Risk'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {suppliers.map(sup => {
                                        const supInvoices = invoices.filter(i => (i.supplierId || i.supplier_id) === sup.id);
                                        const totalInv = supInvoices.reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
                                        const totalPd = supInvoices.reduce((s, i) => s + (i.amountPaid || i.amount_paid || 0), 0);
                                        const balance = totalInv - totalPd;
                                        const overdueCount = supInvoices.filter(i => { const d = i.dueDate || i.due_date; return d && new Date(d) < new Date() && i.status !== 'paid'; }).length;
                                        return (
                                            <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{sup.name}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmt(totalInv)}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-bold">{fmt(totalPd)}</td>
                                                <td className={`px-4 py-3 font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(balance)}</td>
                                                <td className="px-4 py-3">{overdueCount > 0 ? <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-black text-[9px]">{overdueCount} overdue</span> : <span className="text-slate-400">None</span>}</td>
                                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${overdueCount > 0 ? 'bg-rose-100 text-rose-700' : balance > 50000 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{overdueCount > 0 ? '🔴 High' : balance > 50000 ? '🟡 Medium' : '🟢 Low'}</span></td>
                                            </tr>
                                        );
                                    })}
                                    {suppliers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No supplier data yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Invoice Aging Report */}
                    <div>
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">⏰ Invoice Aging Report</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Current (not due)', days: null, max: 0 },
                                { label: '1-30 Days Overdue', days: 30, max: 0 },
                                { label: '31-60 Days', days: 60, max: 31 },
                                { label: '60+ Days', days: null, max: 61 },
                            ].map((bucket, bi) => {
                                const now = new Date();
                                const bucketInvoices = invoices.filter(inv => {
                                    const due = inv.dueDate || inv.due_date;
                                    if (!due || inv.status === 'paid') return false;
                                    const daysOver = Math.floor((now.getTime() - new Date(due).getTime()) / 86400000);
                                    if (bi === 0) return daysOver < 0;
                                    if (bi === 1) return daysOver >= 0 && daysOver <= 30;
                                    if (bi === 2) return daysOver > 30 && daysOver <= 60;
                                    return daysOver > 60;
                                });
                                const total = bucketInvoices.reduce((s, i) => s + ((i.totalAmount || i.total_amount || 0) - (i.amountPaid || i.amount_paid || 0)), 0);
                                const colors = ['emerald', 'amber', 'orange', 'rose'];
                                const c = colors[bi];
                                return (
                                    <div key={bi} className={`p-4 rounded-2xl border bg-${c}-50 dark:bg-${c}-950/30 border-${c}-100 dark:border-${c}-900`}>
                                        <p className={`text-[10px] font-black text-${c}-600 dark:text-${c}-400 uppercase`}>{bucket.label}</p>
                                        <p className={`text-lg font-black text-${c}-700 dark:text-${c}-300 mt-1`}>{fmt(total)}</p>
                                        <p className={`text-[10px] text-${c}-500`}>{bucketInvoices.length} invoices</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* LPO Register */}
                    <div>
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">📄 LPO Register</h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <tr>{['LPO Number', 'Supplier', 'Issued Date', 'Amount', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {lpos.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{l.lpoNumber || l.lpo_number}</td>
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{supplierName(l.supplierId || l.supplier_id)}</td>
                                            <td className="px-4 py-3 text-slate-500">{l.issuedDate || l.issued_date}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(l.totalAmount || l.total_amount || 0)}</td>
                                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[l.status || 'draft']}`}>{l.status || 'draft'}</span></td>
                                        </tr>
                                    ))}
                                    {lpos.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No LPOs issued yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: ADD / EDIT ITEM ══════════════ */}
            {showItemModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-wider text-md">{editItem ? 'Edit Item' : 'Add Inventory Item'}</h3>
                            <button onClick={() => setShowItemModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Item Name *', key: 'name', type: 'text', full: true },
                                    { label: 'Item Code', key: 'itemCode', type: 'text' },
                                    { label: 'Category', key: 'category', type: 'text' },
                                    { label: 'Unit (pcs/kg/ltrs...)', key: 'unit', type: 'text' },
                                    { label: 'Unit Cost (KES)', key: 'unitCost', type: 'number' },
                                    { label: 'Current Stock', key: 'currentStock', type: 'number' },
                                    { label: 'Reorder Level', key: 'reorderLevel', type: 'number' },
                                ].map(f => (
                                    <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{f.label}</label>
                                        <input
                                            type={f.type}
                                            value={(itemForm as any)[f.key] || ''}
                                            onChange={e => setItemForm(p => ({ ...p, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Description</label>
                                    <textarea value={itemForm.description || ''} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowItemModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveItem} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black hover:bg-indigo-700 transition-all shadow-md">Save Item</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: ADD / EDIT SUPPLIER ══════════════ */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-emerald-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-wider text-md">{editSupplier ? 'Edit Supplier' : 'Register Supplier'}</h3>
                            <button onClick={() => setShowSupplierModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Supplier Name *', key: 'name', full: true },
                                    { label: 'Contact Person', key: 'contactPerson' },
                                    { label: 'Phone', key: 'phone' },
                                    { label: 'Email', key: 'email' },
                                    { label: 'KRA PIN', key: 'kraPin' },
                                    { label: 'Category', key: 'category' },
                                    { label: 'Payment Terms', key: 'paymentTerms' },
                                    { label: 'Bank Name', key: 'bankName' },
                                    { label: 'Bank Account #', key: 'bankAccount' },
                                    { label: 'Bank Branch', key: 'bankBranch' },
                                ].map(f => (
                                    <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{f.label}</label>
                                        <input value={(supplierForm as any)[f.key] || ''} onChange={e => setSupplierForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Address</label>
                                    <textarea value={supplierForm.address || ''} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Rating (1–5 stars)</label>
                                    <div className="flex gap-2">
                                        {[1,2,3,4,5].map(star => (
                                            <button key={star} onClick={() => setSupplierForm(p => ({ ...p, rating: star }))} className={`text-2xl transition-all ${(supplierForm.rating || 3) >= star ? 'opacity-100' : 'opacity-30'}`}>⭐</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Notes</label>
                                    <textarea value={supplierForm.notes || ''} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowSupplierModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveSupplier} className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl text-[11px] font-black hover:bg-emerald-700 transition-all shadow-md">Save Supplier</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: CREATE / EDIT LPO ══════════════ */}
            {showLPOModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-blue-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-wider text-md">{editLPO ? 'Edit LPO' : 'Create Local Purchase Order'}</h3>
                            <button onClick={() => setShowLPOModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">LPO Number</label>
                                    <input value={lpoForm.lpoNumber || ''} onChange={e => setLpoForm(p => ({ ...p, lpoNumber: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Supplier *</label>
                                    <select value={lpoForm.supplierId || ''} onChange={e => setLpoForm(p => ({ ...p, supplierId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="">— Select Supplier —</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Issue Date</label>
                                    <input type="date" value={lpoForm.issuedDate || ''} onChange={e => setLpoForm(p => ({ ...p, issuedDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Expected Delivery</label>
                                    <input type="date" value={lpoForm.expectedDeliveryDate || ''} onChange={e => setLpoForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Delivery Address</label>
                                    <input value={lpoForm.deliveryAddress || ''} onChange={e => setLpoForm(p => ({ ...p, deliveryAddress: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>

                            {/* Line items */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Line Items</p>
                                <div className="flex gap-2 flex-wrap">
                                    <input placeholder="Item name" value={lpoLineItem.name} onChange={e => setLpoLineItem(p => ({ ...p, name: e.target.value }))} className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none" />
                                    <input type="number" placeholder="Qty" value={lpoLineItem.quantity} onChange={e => setLpoLineItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))} className="w-16 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none" />
                                    <input placeholder="Unit" value={lpoLineItem.unit} onChange={e => setLpoLineItem(p => ({ ...p, unit: e.target.value }))} className="w-16 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none" />
                                    <input type="number" placeholder="Unit Cost" value={lpoLineItem.unitCost} onChange={e => setLpoLineItem(p => ({ ...p, unitCost: parseFloat(e.target.value) || 0 }))} className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none" />
                                    <button onClick={addLpoLine} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black hover:bg-blue-700">+ Add</button>
                                </div>
                                {(lpoForm.items || []).length > 0 && (
                                    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <table className="w-full text-[10px]">
                                            <thead className="bg-slate-50 dark:bg-slate-800"><tr className="text-slate-400 font-black uppercase"><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit</th><th className="px-3 py-2 text-right">Unit Cost</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2"></th></tr></thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {(lpoForm.items || []).map((line, i) => (
                                                    <tr key={i}>
                                                        <td className="px-3 py-2">{line.name}</td>
                                                        <td className="px-3 py-2 text-right">{line.quantity}</td>
                                                        <td className="px-3 py-2 text-right">{line.unit}</td>
                                                        <td className="px-3 py-2 text-right">{fmt(line.unitCost)}</td>
                                                        <td className="px-3 py-2 text-right font-bold">{fmt(line.total)}</td>
                                                        <td className="px-3 py-2"><button onClick={() => setLpoForm(f => ({ ...f, items: (f.items || []).filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:text-rose-700 font-black">✕</button></td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-50 dark:bg-slate-800 font-black">
                                                    <td colSpan={4} className="px-3 py-2 text-right text-slate-500 uppercase text-[9px]">Subtotal (excl. 16% VAT)</td>
                                                    <td className="px-3 py-2 text-right">{fmt((lpoForm.items || []).reduce((s, i) => s + i.total, 0))}</td>
                                                    <td></td>
                                                </tr>
                                                <tr className="bg-slate-50 dark:bg-slate-800 font-black">
                                                    <td colSpan={4} className="px-3 py-2 text-right text-slate-500 uppercase text-[9px]">Total (incl. 16% VAT)</td>
                                                    <td className="px-3 py-2 text-right text-blue-700 dark:text-blue-300">{fmt((lpoForm.items || []).reduce((s, i) => s + i.total, 0) * 1.16)}</td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                                <textarea value={lpoForm.notes || ''} onChange={e => setLpoForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowLPOModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveLPO} className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black hover:bg-blue-700 transition-all shadow-md">Save LPO</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: RECORD / EDIT INVOICE ══════════════ */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-amber-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-wider text-md">{editInvoice ? 'Edit / Record Payment' : 'Record Supplier Invoice'}</h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Invoice Number *</label>
                                    <input value={invoiceForm.invoiceNumber || ''} onChange={e => setInvoiceForm(p => ({ ...p, invoiceNumber: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Supplier *</label>
                                    <select value={invoiceForm.supplierId || ''} onChange={e => setInvoiceForm(p => ({ ...p, supplierId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500">
                                        <option value="">— Select Supplier —</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Linked LPO (optional)</label>
                                    <select value={invoiceForm.lpoId || ''} onChange={e => setInvoiceForm(p => ({ ...p, lpoId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500">
                                        <option value="">— No LPO —</option>
                                        {lpos.map(l => <option key={l.id} value={l.id}>{l.lpoNumber || l.lpo_number}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Invoice Date</label>
                                    <input type="date" value={invoiceForm.invoiceDate || ''} onChange={e => setInvoiceForm(p => ({ ...p, invoiceDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Due Date</label>
                                    <input type="date" value={invoiceForm.dueDate || ''} onChange={e => setInvoiceForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Invoice Total (KES)</label>
                                    <input type="number" value={invoiceForm.totalAmount || ''} onChange={e => setInvoiceForm(p => ({ ...p, totalAmount: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Amount Paid (KES)</label>
                                    <input type="number" value={invoiceForm.amountPaid || ''} onChange={e => setInvoiceForm(p => ({ ...p, amountPaid: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Balance Owing</label>
                                    <div className={`w-full px-4 py-2.5 rounded-xl text-sm font-black ${(invoiceForm.totalAmount || 0) - (invoiceForm.amountPaid || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700'}`}>
                                        {fmt((invoiceForm.totalAmount || 0) - (invoiceForm.amountPaid || 0))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Payment Method</label>
                                    <select value={invoiceForm.paymentMethod || 'Bank Transfer'} onChange={e => setInvoiceForm(p => ({ ...p, paymentMethod: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500">
                                        {['Bank Transfer', 'Cheque', 'M-Pesa', 'Cash', 'EFT', 'RTGS'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Payment Reference</label>
                                    <input value={invoiceForm.paymentReference || ''} onChange={e => setInvoiceForm(p => ({ ...p, paymentReference: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Payment Date</label>
                                    <input type="date" value={invoiceForm.paymentDate || ''} onChange={e => setInvoiceForm(p => ({ ...p, paymentDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                                    <textarea value={invoiceForm.notes || ''} onChange={e => setInvoiceForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveInvoice} className="px-8 py-2.5 bg-amber-600 text-white rounded-2xl text-[11px] font-black hover:bg-amber-700 transition-all shadow-md">Save Invoice</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: NEW REQUISITION ══════════════ */}
            {showReqModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-purple-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-wider text-md">New Purchase Requisition</h3>
                            <button onClick={() => setShowReqModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Title / Purpose *</label>
                                    <input value={reqForm.title || ''} onChange={e => setReqForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="e.g. Purchase of Office Stationery Q3 2026" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                                    <select value={reqForm.priority || 'normal'} onChange={e => setReqForm((p: any) => ({ ...p, priority: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500">
                                        {['normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Est. Amount (KES)</label>
                                    <input type="number" value={reqForm.totalAmount || ''} onChange={e => setReqForm((p: any) => ({ ...p, totalAmount: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Notes / Justification</label>
                                    <textarea value={reqForm.notes || ''} onChange={e => setReqForm((p: any) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowReqModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={async () => {
                                await apiService.saveModuleRecord('requisitions', { ...reqForm, institution_id: institution.id, institutionId: institution.id, requested_by: currentUser?.name || currentUser?.id, requestedBy: currentUser?.name || currentUser?.id, requested_date: new Date().toISOString().split('T')[0], requestedDate: new Date().toISOString().split('T')[0], status: 'pending', total_amount: reqForm.totalAmount, totalAmount: reqForm.totalAmount });
                                setShowReqModal(false); setReqForm(emptyReq()); load();
                            }} className="px-8 py-2.5 bg-purple-600 text-white rounded-2xl text-[11px] font-black hover:bg-purple-700 transition-all shadow-md">Submit Requisition</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
