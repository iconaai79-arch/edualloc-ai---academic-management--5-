import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/apiService';
import type { HISPatient, HISPharmacyInventory, PharmacySale, User } from '../../types';
import {
    PlusIcon,
    SearchIcon,
    PencilIcon,
    TrashIcon,
    UsersIcon,
    ArchiveBoxIcon,
    DocumentTextIcon,
    CreditCardIcon,
    CheckCircleIcon,
    PhoneIcon,
    EnvelopeIcon,
} from '../icons';

export interface PharmacyProductCategory {
    id: string;
    institutionId: string;
    name: string;
    code?: string;
    description?: string;
    color?: string;
    requiresPrescription?: boolean;
    status?: 'active' | 'inactive';
    createdAt?: string;
    updatedAt?: string;
}

export const DEFAULT_PHARMACY_CATEGORIES: Array<Pick<PharmacyProductCategory, 'name' | 'code' | 'description' | 'color' | 'requiresPrescription'>> = [
    { name: 'General', code: 'GEN', description: 'General over-the-counter pharmacy products', color: 'slate', requiresPrescription: false },
    { name: 'Antibiotics', code: 'ABX', description: 'Antibacterial & antimicrobial medications', color: 'emerald', requiresPrescription: true },
    { name: 'Analgesics', code: 'ANL', description: 'Pain relievers & anti-inflammatory drugs', color: 'sky', requiresPrescription: false },
    { name: 'Antipyretics', code: 'APY', description: 'Fever-reducing medications', color: 'amber', requiresPrescription: false },
    { name: 'Antimalarials', code: 'AML', description: 'Malaria prophylaxis & treatment', color: 'teal', requiresPrescription: true },
    { name: 'Vitamins & Supplements', code: 'VIT', description: 'Multivitamins, minerals & immunity boosters', color: 'indigo', requiresPrescription: false },
    { name: 'Pediatrics', code: 'PED', description: 'Infant & children syrups, drops and suspensions', color: 'violet', requiresPrescription: false },
    { name: 'Chronic Care', code: 'CHR', description: 'Hypertension, diabetes & asthma maintenance', color: 'blue', requiresPrescription: true },
    { name: 'Narcotics', code: 'NAR', description: 'Controlled substances requiring dual-witness log', color: 'rose', requiresPrescription: true },
    { name: 'Consumables', code: 'CON', description: 'Syringes, bandages, gloves & medical supplies', color: 'slate', requiresPrescription: false },
    { name: 'Cosmetics & Personal Care', code: 'COS', description: 'Skincare, hygiene & dermatological products', color: 'fuchsia', requiresPrescription: false },
];

const CLIENT_TYPES = [
    'Walk-in Regular',
    'Corporate / Insurance',
    'Wholesale / Clinic',
    'Credit Account',
] as const;

const COLOR_BADGES: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

interface Props {
    mode: 'clients' | 'categories';
    institutionId: string;
    pharmacyName: string;
    currentUser: User;
    patients: HISPatient[];
    inventory: HISPharmacyInventory[];
    sales: PharmacySale[];
    categories: PharmacyProductCategory[];
    onCategoriesChange: (cats: PharmacyProductCategory[]) => void;
    onRefreshData: () => Promise<void> | void;
    onSelectClientForPos?: (patient: HISPatient) => void;
}

export const PharmacyClientsAndCategoriesPanel: React.FC<Props> = ({
    mode,
    institutionId,
    pharmacyName,
    currentUser,
    patients,
    inventory,
    sales,
    categories,
    onCategoriesChange,
    onRefreshData,
    onSelectClientForPos,
}) => {
    // ── CLIENTS STATE ──
    const [clientSearch, setClientSearch] = useState('');
    const [clientTypeFilter, setClientTypeFilter] = useState<string>('ALL');
    const [isClientFormOpen, setIsClientFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [clientSaving, setClientSaving] = useState(false);
    const [clientForm, setClientForm] = useState({
        fullName: '',
        contact: '',
        email: '',
        age: '',
        gender: 'Female',
        clientType: 'Walk-in Regular',
        insuranceProvider: '',
        insuranceNumber: '',
        creditLimit: '',
        allergies: '',
        notes: '',
        status: 'active',
    });

    // ── CATEGORIES STATE ──
    const [categorySearch, setCategorySearch] = useState('');
    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<PharmacyProductCategory | null>(null);
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        code: '',
        description: '',
        color: 'emerald',
        requiresPrescription: false,
        status: 'active' as 'active' | 'inactive',
    });

    const catStorageKey = `pharmacy_product_categories_${institutionId}`;

    // ── CLIENT METRICS FROM SALES ──
    const clientPurchaseMap = useMemo(() => {
        const map = new Map<string, { orders: number; totalSpent: number; lastDate: string }>();
        sales.forEach((s: any) => {
            const key = s.patientId || s.customerName?.trim().toLowerCase();
            if (!key) return;
            const prev = map.get(key) || { orders: 0, totalSpent: 0, lastDate: '' };
            const amt = Number(s.totalAmount) || 0;
            const d = s.createdAt || '';
            map.set(key, {
                orders: prev.orders + 1,
                totalSpent: prev.totalSpent + amt,
                lastDate: d > prev.lastDate ? d : prev.lastDate,
            });
        });
        return map;
    }, [sales]);

    const filteredClients = useMemo(() => {
        const q = clientSearch.trim().toLowerCase();
        return patients.filter((p: any) => {
            const type = p.clientType || 'Walk-in Regular';
            if (clientTypeFilter !== 'ALL' && type !== clientTypeFilter) return false;
            if (!q) return true;
            return (
                (p.fullName || '').toLowerCase().includes(q) ||
                (p.contact || p.phone || '').toLowerCase().includes(q) ||
                (p.email || '').toLowerCase().includes(q) ||
                (p.insuranceProvider || '').toLowerCase().includes(q)
            );
        });
    }, [patients, clientSearch, clientTypeFilter]);

    const clientKpis = useMemo(() => {
        const total = patients.length;
        const corporate = patients.filter((p: any) => (p.clientType || '').includes('Corporate') || (p.clientType || '').includes('Insurance') || !!p.insuranceProvider).length;
        const credit = patients.filter((p: any) => (p.clientType || '').includes('Credit') || Number(p.creditLimit || 0) > 0).length;
        let totalClientRevenue = 0;
        patients.forEach((p: any) => {
            const stats = clientPurchaseMap.get(p.id) || clientPurchaseMap.get((p.fullName || '').trim().toLowerCase());
            if (stats) totalClientRevenue += stats.totalSpent;
        });
        return { total, corporate, credit, totalClientRevenue };
    }, [patients, clientPurchaseMap]);

    // ── CATEGORY METRICS FROM INVENTORY ──
    const categoryStatsMap = useMemo(() => {
        const map = new Map<string, { itemCount: number; totalUnits: number; stockValue: number }>();
        inventory.forEach((item) => {
            const key = (item.category || 'General').trim().toLowerCase();
            const prev = map.get(key) || { itemCount: 0, totalUnits: 0, stockValue: 0 };
            const qty = Number(item.stockQuantity || 0);
            const price = Number(item.unitPrice || 0);
            map.set(key, {
                itemCount: prev.itemCount + 1,
                totalUnits: prev.totalUnits + qty,
                stockValue: prev.stockValue + qty * price,
            });
        });
        return map;
    }, [inventory]);

    const filteredCategories = useMemo(() => {
        const q = categorySearch.trim().toLowerCase();
        return categories.filter((c) => {
            if (!q) return true;
            return (
                c.name.toLowerCase().includes(q) ||
                (c.code || '').toLowerCase().includes(q) ||
                (c.description || '').toLowerCase().includes(q)
            );
        });
    }, [categories, categorySearch]);

    const categoryKpis = useMemo(() => {
        const totalCategories = categories.length;
        const rxOnly = categories.filter((c) => c.requiresPrescription).length;
        const categorizedItems = inventory.filter((i) => !!i.category).length;
        const totalStockValue = inventory.reduce((s, i) => s + Number(i.stockQuantity || 0) * Number(i.unitPrice || 0), 0);
        return { totalCategories, rxOnly, categorizedItems, totalStockValue };
    }, [categories, inventory]);

    // ── CLIENT HANDLERS ──
    const openNewClientForm = () => {
        setEditingClient(null);
        setClientForm({
            fullName: '',
            contact: '',
            email: '',
            age: '',
            gender: 'Female',
            clientType: 'Walk-in Regular',
            insuranceProvider: '',
            insuranceNumber: '',
            creditLimit: '',
            allergies: '',
            notes: '',
            status: 'active',
        });
        setIsClientFormOpen(true);
    };

    const openEditClientForm = (p: any) => {
        setEditingClient(p);
        setClientForm({
            fullName: p.fullName || '',
            contact: p.contact || p.phone || '',
            email: p.email || '',
            age: p.age ? String(p.age) : '',
            gender: p.gender || 'Female',
            clientType: p.clientType || 'Walk-in Regular',
            insuranceProvider: p.insuranceProvider || '',
            insuranceNumber: p.insuranceNumber || '',
            creditLimit: p.creditLimit ? String(p.creditLimit) : '',
            allergies: p.allergies || '',
            notes: p.notes || '',
            status: p.status || 'active',
        });
        setIsClientFormOpen(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientForm.fullName.trim()) return;
        setClientSaving(true);
        try {
            const payload = {
                ...(editingClient || {}),
                id: editingClient?.id || `pat_${Date.now()}`,
                institutionId,
                fullName: clientForm.fullName.trim(),
                contact: clientForm.contact.trim(),
                phone: clientForm.contact.trim(),
                email: clientForm.email.trim(),
                age: Number(clientForm.age) || 0,
                gender: clientForm.gender,
                clientType: clientForm.clientType,
                insuranceProvider: clientForm.insuranceProvider.trim(),
                insuranceNumber: clientForm.insuranceNumber.trim(),
                creditLimit: Number(clientForm.creditLimit) || 0,
                allergies: clientForm.allergies.trim(),
                notes: clientForm.notes.trim(),
                status: clientForm.status,
                recordedBy: currentUser.id,
                updatedAt: new Date().toISOString(),
                createdAt: editingClient?.createdAt || new Date().toISOString(),
            };
            await apiService.saveModuleRecord('his_patients', payload);
            setIsClientFormOpen(false);
            setEditingClient(null);
            await onRefreshData();
        } catch (err) {
            console.error('Failed to save client:', err);
            alert('Failed to save client record.');
        } finally {
            setClientSaving(false);
        }
    };

    const handleDeleteClient = async (client: any) => {
        if (!window.confirm(`Delete client "${client.fullName}"? This cannot be undone.`)) return;
        try {
            await apiService.deleteModuleRecord('his_patients', client.id);
            await onRefreshData();
        } catch (err) {
            console.error('Failed to delete client:', err);
            alert('Failed to delete client.');
        }
    };

    const handleExportClientsPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(pharmacyName.toUpperCase(), 14, 16);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Client Directory Report  •  Generated ${new Date().toLocaleString()}`, 14, 22);

        autoTable(doc, {
            startY: 28,
            head: [['#', 'Client Name', 'Phone', 'Type', 'Insurance', 'Orders', 'Total Spent (KES)']],
            body: filteredClients.map((p: any, idx) => {
                const stats = clientPurchaseMap.get(p.id) || clientPurchaseMap.get((p.fullName || '').trim().toLowerCase());
                return [
                    String(idx + 1),
                    p.fullName || '-',
                    p.contact || p.phone || '-',
                    p.clientType || 'Walk-in Regular',
                    p.insuranceProvider || '-',
                    String(stats?.orders || 0),
                    (stats?.totalSpent || 0).toLocaleString(),
                ];
            }),
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            headStyles: { fillColor: [5, 150, 105], textColor: 255 },
        });
        doc.save(`Pharmacy_Clients_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // ── CATEGORY HANDLERS ──
    const persistCategories = (next: PharmacyProductCategory[]) => {
        onCategoriesChange(next);
        try {
            localStorage.setItem(catStorageKey, JSON.stringify(next));
        } catch {
            // ignore storage errors
        }
    };

    const openNewCategoryForm = () => {
        setEditingCategory(null);
        setCategoryForm({
            name: '',
            code: '',
            description: '',
            color: 'emerald',
            requiresPrescription: false,
            status: 'active',
        });
        setIsCategoryFormOpen(true);
    };

    const openEditCategoryForm = (cat: PharmacyProductCategory) => {
        setEditingCategory(cat);
        setCategoryForm({
            name: cat.name,
            code: cat.code || '',
            description: cat.description || '',
            color: cat.color || 'emerald',
            requiresPrescription: !!cat.requiresPrescription,
            status: cat.status || 'active',
        });
        setIsCategoryFormOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = categoryForm.name.trim();
        if (!trimmedName) return;

        const duplicate = categories.find(
            (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCategory?.id
        );
        if (duplicate) {
            alert(`Category "${trimmedName}" already exists.`);
            return;
        }

        setCategorySaving(true);
        try {
            const oldName = editingCategory?.name;
            const record: PharmacyProductCategory = {
                id: editingCategory?.id || `pcat_${Date.now()}`,
                institutionId,
                name: trimmedName,
                code: (categoryForm.code.trim() || trimmedName.slice(0, 3)).toUpperCase(),
                description: categoryForm.description.trim(),
                color: categoryForm.color,
                requiresPrescription: categoryForm.requiresPrescription,
                status: categoryForm.status,
                createdAt: editingCategory?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            try {
                await apiService.saveModuleRecord('pharmacy_product_categories', record);
            } catch (apiErr) {
                console.warn('pharmacy_product_categories remote save fallback to local:', apiErr);
            }

            const next = editingCategory
                ? categories.map((c) => (c.id === editingCategory.id ? record : c))
                : [record, ...categories];
            persistCategories(next);

            // If renamed, propagate new category name to linked inventory items
            if (oldName && oldName !== trimmedName) {
                const affected = inventory.filter(
                    (i) => (i.category || '').trim().toLowerCase() === oldName.trim().toLowerCase()
                );
                if (affected.length > 0) {
                    await Promise.all(
                        affected.map((item) =>
                            apiService.saveModuleRecord('his_pharmacy_inventory', {
                                ...item,
                                category: trimmedName,
                                updatedAt: new Date().toISOString(),
                            })
                        )
                    );
                    await onRefreshData();
                }
            }

            setIsCategoryFormOpen(false);
            setEditingCategory(null);
        } catch (err) {
            console.error('Failed to save category:', err);
            alert('Failed to save product category.');
        } finally {
            setCategorySaving(false);
        }
    };

    const handleDeleteCategory = async (cat: PharmacyProductCategory) => {
        const stats = categoryStatsMap.get(cat.name.trim().toLowerCase());
        const warning =
            stats && stats.itemCount > 0
                ? `Category "${cat.name}" currently has ${stats.itemCount} drug(s). Delete this category anyway? (Existing drugs will keep their label until reassigned.)`
                : `Delete category "${cat.name}"?`;
        if (!window.confirm(warning)) return;

        try {
            try {
                await apiService.deleteModuleRecord('pharmacy_product_categories', cat.id);
            } catch {
                // ignore if local-only
            }
            persistCategories(categories.filter((c) => c.id !== cat.id));
        } catch (err) {
            console.error('Delete category failed:', err);
        }
    };

    const handleExportCategoriesPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(pharmacyName.toUpperCase(), 14, 16);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Product Categories Summary  •  Generated ${new Date().toLocaleString()}`, 14, 22);

        autoTable(doc, {
            startY: 28,
            head: [['Code', 'Category Name', 'Rx Only', 'Products', 'Total Units', 'Stock Value (KES)']],
            body: filteredCategories.map((c) => {
                const st = categoryStatsMap.get(c.name.trim().toLowerCase());
                return [
                    c.code || '-',
                    c.name,
                    c.requiresPrescription ? 'Yes (Rx)' : 'OTC / General',
                    String(st?.itemCount || 0),
                    String(st?.totalUnits || 0),
                    (st?.stockValue || 0).toLocaleString(),
                ];
            }),
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            headStyles: { fillColor: [5, 150, 105], textColor: 255 },
        });
        doc.save(`Pharmacy_Categories_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // ── RENDER: CLIENTS MODE ──
    if (mode === 'clients') {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Clients</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{clientKpis.total}</p>
                        <p className="text-[11px] font-semibold text-emerald-600 mt-1">Linked to POS &amp; Rx</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insurance / Corporate</p>
                        <p className="text-2xl font-black text-indigo-700 mt-1">{clientKpis.corporate}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-1">SHA, Jubilee, AAR, etc.</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Credit Accounts</p>
                        <p className="text-2xl font-black text-amber-600 mt-1">{clientKpis.credit}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-1">Approved credit limit</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Sales Volume</p>
                        <p className="text-2xl font-black text-emerald-700 mt-1">KES {clientKpis.totalClientRevenue.toLocaleString()}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-1">Recorded client orders</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex-1 min-w-[200px]">
                            <SearchIcon className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                                type="text"
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                placeholder="Search client name, phone, email, or insurance..."
                                className="bg-transparent outline-none text-xs font-semibold text-slate-900 w-full placeholder:text-slate-400"
                            />
                        </div>
                        <select
                            value={clientTypeFilter}
                            onChange={(e) => setClientTypeFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                        >
                            <option value="ALL">All Client Types</option>
                            {CLIENT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportClientsPdf}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            Export PDF
                        </button>
                        <button
                            type="button"
                            onClick={openNewClientForm}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Add Client
                        </button>
                    </div>
                </div>

                {/* Add / Edit Client Form */}
                {isClientFormOpen && (
                    <form onSubmit={handleSaveClient} className="bg-white border-2 border-emerald-200 rounded-2xl p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                    {editingClient ? `Edit Client: ${editingClient.fullName}` : 'Register New Pharmacy Client'}
                                </h3>
                                <p className="text-xs text-slate-500">Clients appear immediately in the POS Terminal &amp; Prescriptions selector.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setIsClientFormOpen(false); setEditingClient(null); }}
                                className="text-xs font-bold text-slate-400 hover:text-slate-700 px-3 py-1 rounded-lg bg-slate-100"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Full Name / Company *</label>
                                <input
                                    required
                                    type="text"
                                    value={clientForm.fullName}
                                    onChange={(e) => setClientForm({ ...clientForm, fullName: e.target.value })}
                                    placeholder="e.g. Jane Wanjiku or Rift Clinic"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={clientForm.contact}
                                    onChange={(e) => setClientForm({ ...clientForm, contact: e.target.value })}
                                    placeholder="e.g. 0712 345 678"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={clientForm.email}
                                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                                    placeholder="client@example.com"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Client Type</label>
                                <select
                                    value={clientForm.clientType}
                                    onChange={(e) => setClientForm({ ...clientForm, clientType: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                >
                                    {CLIENT_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Insurance / SHA Provider</label>
                                <input
                                    type="text"
                                    value={clientForm.insuranceProvider}
                                    onChange={(e) => setClientForm({ ...clientForm, insuranceProvider: e.target.value })}
                                    placeholder="e.g. SHA, Jubilee, Britam"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Member / Policy No.</label>
                                <input
                                    type="text"
                                    value={clientForm.insuranceNumber}
                                    onChange={(e) => setClientForm({ ...clientForm, insuranceNumber: e.target.value })}
                                    placeholder="Optional policy number"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Age (Years)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={clientForm.age}
                                    onChange={(e) => setClientForm({ ...clientForm, age: e.target.value })}
                                    placeholder="e.g. 34"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Credit Limit (KES)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={clientForm.creditLimit}
                                    onChange={(e) => setClientForm({ ...clientForm, creditLimit: e.target.value })}
                                    placeholder="0"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Allergies / Clinical Notes</label>
                                <input
                                    type="text"
                                    value={clientForm.allergies}
                                    onChange={(e) => setClientForm({ ...clientForm, allergies: e.target.value })}
                                    placeholder="e.g. Penicillin allergy, diabetic"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setIsClientFormOpen(false); setEditingClient(null); }}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={clientSaving}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                {clientSaving ? 'Saving...' : editingClient ? 'Update Client' : 'Save Client'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Clients Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-4 py-3.5">Client / Patient</th>
                                    <th className="px-4 py-3.5">Contact</th>
                                    <th className="px-4 py-3.5">Type &amp; Insurance</th>
                                    <th className="px-4 py-3.5 text-center">Orders</th>
                                    <th className="px-4 py-3.5 text-right">Total Spent</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredClients.map((p: any) => {
                                    const stats = clientPurchaseMap.get(p.id) || clientPurchaseMap.get((p.fullName || '').trim().toLowerCase());
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                                                        {(p.fullName || 'C').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-slate-900 uppercase tracking-tight">{p.fullName}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">
                                                            {p.age ? `${p.age} yrs` : 'Age N/A'}
                                                            {p.allergies ? ` • Allergy: ${p.allergies}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-700 flex items-center gap-1.5">
                                                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        {p.contact || p.phone || '—'}
                                                    </p>
                                                    {p.email && (
                                                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                            <EnvelopeIcon className="w-3 h-3" />
                                                            {p.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                                                        {p.clientType || 'Walk-in Regular'}
                                                    </span>
                                                    {p.insuranceProvider && (
                                                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                                            {p.insuranceProvider}
                                                        </span>
                                                    )}
                                                    {Number(p.creditLimit || 0) > 0 && (
                                                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                                            Credit: KES {Number(p.creditLimit).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-black text-slate-700">
                                                {stats?.orders || 0}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700">
                                                KES {(stats?.totalSpent || 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    {onSelectClientForPos && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSelectClientForPos(p)}
                                                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 transition-colors cursor-pointer"
                                                            title="Open POS Terminal with this client"
                                                        >
                                                            <CreditCardIcon className="w-3.5 h-3.5" />
                                                            Sell
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditClientForm(p)}
                                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 cursor-pointer"
                                                        title="Edit Client"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteClient(p)}
                                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white cursor-pointer"
                                                        title="Delete Client"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                                                No clients found. Click &ldquo;Add Client&rdquo; to register your first customer.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ── RENDER: PRODUCT CATEGORIES MODE ──
    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Categories</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{categoryKpis.totalCategories}</p>
                    <p className="text-[11px] font-semibold text-emerald-600 mt-1">Available in Inventory &amp; POS</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prescription-Only (Rx)</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">{categoryKpis.rxOnly}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Controlled / clinical classes</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categorized Products</p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">{categoryKpis.categorizedItems}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Out of {inventory.length} stock SKUs</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Catalog Value</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">KES {categoryKpis.totalStockValue.toLocaleString()}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Across all categories</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex-1 min-w-[220px] max-w-md">
                    <SearchIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Search category name, code, or description..."
                        className="bg-transparent outline-none text-xs font-semibold text-slate-900 w-full placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportCategoriesPdf}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                    >
                        <DocumentTextIcon className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        type="button"
                        onClick={openNewCategoryForm}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add Category
                    </button>
                </div>
            </div>

            {/* Add / Edit Category Form */}
            {isCategoryFormOpen && (
                <form onSubmit={handleSaveCategory} className="bg-white border-2 border-emerald-200 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create Product Category'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Categories sync automatically with Add/Edit Medication and POS Terminal filtering.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setIsCategoryFormOpen(false); setEditingCategory(null); }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-700 px-3 py-1 rounded-lg bg-slate-100"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Category Name *</label>
                            <input
                                required
                                type="text"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder="e.g. Antifungals, Herbal, Baby Care"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Short Code</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={categoryForm.code}
                                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. AFG"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 uppercase outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Badge Color</label>
                            <select
                                value={categoryForm.color}
                                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                            >
                                {Object.keys(COLOR_BADGES).map((c) => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Description</label>
                            <input
                                type="text"
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                placeholder="Brief note on products in this category"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex items-center gap-3 pt-4">
                            <input
                                id="cat_rx_only"
                                type="checkbox"
                                checked={categoryForm.requiresPrescription}
                                onChange={(e) => setCategoryForm({ ...categoryForm, requiresPrescription: e.target.checked })}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <label htmlFor="cat_rx_only" className="text-xs font-bold text-slate-700 cursor-pointer">
                                Prescription Required (Rx Only)
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => { setIsCategoryFormOpen(false); setEditingCategory(null); }}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={categorySaving}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            {categorySaving ? 'Saving...' : editingCategory ? 'Update Category' : 'Save Category'}
                        </button>
                    </div>
                </form>
            )}

            {/* Categories Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-4 py-3.5">Category</th>
                                <th className="px-4 py-3.5">Description</th>
                                <th className="px-4 py-3.5 text-center">Class</th>
                                <th className="px-4 py-3.5 text-center">Products</th>
                                <th className="px-4 py-3.5 text-right">Stock Value</th>
                                <th className="px-4 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredCategories.map((cat) => {
                                const stats = categoryStatsMap.get(cat.name.trim().toLowerCase());
                                const badgeClass = COLOR_BADGES[cat.color || 'slate'] || COLOR_BADGES.slate;
                                return (
                                    <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase ${badgeClass}`}>
                                                    {cat.code || cat.name.slice(0, 3).toUpperCase()}
                                                </span>
                                                <span className="font-black text-slate-900">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 font-medium">
                                            {cat.description || '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                cat.requiresPrescription
                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            }`}>
                                                {cat.requiresPrescription ? 'Rx Only' : 'OTC / General'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className="font-black text-slate-800">{stats?.itemCount || 0}</span>
                                            <span className="text-[10px] text-slate-400 ml-1">({stats?.totalUnits || 0} pcs)</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700">
                                            KES {(stats?.stockValue || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditCategoryForm(cat)}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 cursor-pointer"
                                                    title="Edit Category"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCategory(cat)}
                                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white cursor-pointer"
                                                    title="Delete Category"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCategories.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <ArchiveBoxIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                                            No product categories match your search.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
