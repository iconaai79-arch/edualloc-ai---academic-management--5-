import React, { useState, useEffect, useMemo } from 'react';
import { RetailInventoryItem, RetailStore, StockReceipt, StockIssue, StockReceiptItem, StockIssueItem, User } from '../../types';
import { apiService } from '../../services/apiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    History, 
    ArrowDownLeft, 
    ArrowUpRight, 
    Plus, 
    Search, 
    Filter, 
    Calendar, 
    Printer, 
    Download, 
    Layers, 
    CheckCircle, 
    X, 
    FileText, 
    RefreshCw, 
    AlertCircle, 
    Package,
    Building2,
    UserCheck,
    Truck,
    Clock,
    Tag,
    ChevronRight,
    Eye
} from 'lucide-react';

export interface UnifiedStockMovement {
    id: string;
    type: 'receipt' | 'issue';
    date: string;
    referenceNumber: string;
    itemId: string;
    itemName: string;
    sku?: string;
    quantity: number;
    unit: string;
    unitCost?: number;
    totalCost?: number;
    partyName: string; // Supplier name or Recipient
    partyRole?: string; // 'Supplier' or 'Department' / 'Staff' / 'Student'
    storeId?: string;
    storeName?: string;
    recordedBy?: string;
    status: string;
    notes?: string;
    parentRecordId: string;
    rawItem?: StockReceiptItem | StockIssueItem;
}

interface RetailStockActionHistoryProps {
    institutionId: string;
    inventoryItems: RetailInventoryItem[];
    stores?: RetailStore[];
    currentUser?: any;
    selectedItemId?: string | null;
    onClearSelectedItem?: () => void;
    onInventoryUpdated?: () => void;
}

export function RetailStockActionHistory({
    institutionId,
    inventoryItems = [],
    stores = [],
    currentUser,
    selectedItemId,
    onClearSelectedItem,
    onInventoryUpdated
}: RetailStockActionHistoryProps) {
    const [receipts, setReceipts] = useState<StockReceipt[]>([]);
    const [issues, setIssues] = useState<StockIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter states
    const [actionTypeFilter, setActionTypeFilter] = useState<'all' | 'receipt' | 'issue'>('all');
    const [itemFilter, setItemFilter] = useState<string>(selectedItemId || 'all');
    const [storeFilter, setStoreFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

    // Modals
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [selectedMovementForView, setSelectedMovementForView] = useState<UnifiedStockMovement | null>(null);

    // Receive modal form state
    const [receiveForm, setReceiveForm] = useState({
        itemId: selectedItemId || (inventoryItems[0]?.id || ''),
        quantity: 1,
        unitCost: 0,
        supplierName: '',
        referenceNumber: '',
        date: new Date().toISOString().split('T')[0],
        storeId: '',
        notes: ''
    });

    // Issue modal form state
    const [issueForm, setIssueForm] = useState({
        itemId: selectedItemId || (inventoryItems[0]?.id || ''),
        quantity: 1,
        issuedTo: '',
        department: 'General Administration',
        purpose: '',
        voucherNumber: '',
        date: new Date().toISOString().split('T')[0],
        storeId: '',
        notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync item filter if prop changes
    useEffect(() => {
        if (selectedItemId) {
            setItemFilter(selectedItemId);
            setReceiveForm(prev => ({ ...prev, itemId: selectedItemId }));
            setIssueForm(prev => ({ ...prev, itemId: selectedItemId }));
        }
    }, [selectedItemId]);

    // Ensure database table for stock issues exists on mount
    useEffect(() => {
        const initSchema = async () => {
            try {
                await apiService.runMigration(`
                    CREATE TABLE IF NOT EXISTS public.retail_stock_issues (
                        id TEXT PRIMARY KEY,
                        institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                        voucher_number TEXT NOT NULL,
                        issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        issued_to TEXT NOT NULL,
                        department TEXT,
                        purpose TEXT,
                        items JSONB NOT NULL DEFAULT '[]'::jsonb,
                        total_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
                        total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
                        recorded_by TEXT,
                        status TEXT DEFAULT 'completed',
                        notes TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    ALTER TABLE public.retail_stock_issues ENABLE ROW LEVEL SECURITY;
                    DROP POLICY IF EXISTS "Users can view institution retail_stock_issues" ON public.retail_stock_issues;
                    CREATE POLICY "Users can view institution retail_stock_issues" ON public.retail_stock_issues FOR ALL USING (true);
                    NOTIFY pgrst, 'reload schema';
                `).catch(() => {});
            } catch (e) {}
        };
        initSchema();
    }, []);

    // Load receipts and issues
    const fetchHistoryData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Receipts
            let fetchedReceipts: StockReceipt[] = [];
            try {
                const res = await apiService.fetchModuleRecords<StockReceipt>('retail_stock_receipts', institutionId);
                if (res && Array.isArray(res)) fetchedReceipts = res;
            } catch (err) {
                console.warn('Failed to fetch retail_stock_receipts from DB, checking local storage:', err);
            }

            // Fallback receipts from localStorage
            try {
                const localRec = JSON.parse(localStorage.getItem('eduai_fallback_stock_receipts') || '[]');
                const seenIds = new Set(fetchedReceipts.map(r => r.id));
                localRec.forEach((r: any) => {
                    if (r && !seenIds.has(r.id) && (r.institutionId === institutionId || !r.institutionId)) {
                        fetchedReceipts.push(r);
                    }
                });
            } catch (e) {}

            // 2. Fetch Issues
            let fetchedIssues: StockIssue[] = [];
            try {
                const resIssues = await apiService.fetchModuleRecords<StockIssue>('retail_stock_issues', institutionId);
                if (resIssues && Array.isArray(resIssues)) fetchedIssues = resIssues;
            } catch (err) {
                console.warn('Failed to fetch retail_stock_issues from DB, checking local storage:', err);
            }

            // Fallback issues from localStorage
            try {
                const localIss = JSON.parse(localStorage.getItem('eduai_fallback_stock_issues') || '[]');
                const seenIssIds = new Set(fetchedIssues.map(i => i.id));
                localIss.forEach((i: any) => {
                    if (i && !seenIssIds.has(i.id) && (i.institutionId === institutionId || !i.institutionId)) {
                        fetchedIssues.push(i);
                    }
                });
            } catch (e) {}

            setReceipts(fetchedReceipts);
            setIssues(fetchedIssues);
        } catch (error) {
            console.error('Error fetching stock action history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistoryData();
    }, [institutionId]);

    // Flatten all receipts and issues into unified chronological movements
    const unifiedMovements = useMemo(() => {
        const list: UnifiedStockMovement[] = [];

        // Add Receipt items
        receipts.forEach(rcpt => {
            const items = rcpt.items || [];
            items.forEach((it, idx) => {
                const invItem = inventoryItems.find(i => i.id === it.itemId || i.name.toLowerCase() === it.itemName.toLowerCase());
                list.push({
                    id: `${rcpt.id}-item-${idx}`,
                    type: 'receipt',
                    date: rcpt.receiptDate || rcpt.createdAt || new Date().toISOString(),
                    referenceNumber: rcpt.referenceNumber || rcpt.id,
                    itemId: it.itemId || invItem?.id || '',
                    itemName: it.itemName || invItem?.name || 'Item',
                    sku: it.sku || invItem?.sku || '',
                    quantity: Number(it.quantity || 0),
                    unit: invItem?.unit || 'pcs',
                    unitCost: Number(it.unitCost || invItem?.costPrice || 0),
                    totalCost: Number(it.quantity || 0) * Number(it.unitCost || invItem?.costPrice || 0),
                    partyName: rcpt.supplierName || 'Supplier',
                    partyRole: 'Supplier / Vendor',
                    storeId: invItem?.storeId,
                    storeName: invItem?.storeName,
                    recordedBy: rcpt.recordedBy,
                    status: rcpt.status || 'completed',
                    notes: rcpt.notes,
                    parentRecordId: rcpt.id,
                    rawItem: it
                });
            });
        });

        // Add Issue items
        issues.forEach(iss => {
            const items = iss.items || [];
            items.forEach((it, idx) => {
                const invItem = inventoryItems.find(i => i.id === it.itemId || i.name.toLowerCase() === it.itemName.toLowerCase());
                list.push({
                    id: `${iss.id}-item-${idx}`,
                    type: 'issue',
                    date: iss.issuedDate || iss.createdAt || new Date().toISOString(),
                    referenceNumber: iss.voucherNumber || iss.id,
                    itemId: it.itemId || invItem?.id || '',
                    itemName: it.itemName || invItem?.name || 'Item',
                    sku: it.sku || invItem?.sku || '',
                    quantity: Number(it.quantity || 0),
                    unit: it.unit || invItem?.unit || 'pcs',
                    unitCost: Number(it.unitCost || invItem?.costPrice || 0),
                    totalCost: Number(it.totalCost || (Number(it.quantity || 0) * Number(it.unitCost || invItem?.costPrice || 0))),
                    partyName: iss.issuedTo || 'Staff Member',
                    partyRole: iss.department || 'Department',
                    storeId: it.storeId || invItem?.storeId,
                    storeName: it.storeName || invItem?.storeName,
                    recordedBy: iss.recordedBy,
                    status: iss.status || 'completed',
                    notes: iss.purpose || iss.notes,
                    parentRecordId: iss.id,
                    rawItem: it
                });
            });
        });

        // Sort descending by date
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [receipts, issues, inventoryItems]);

    // Filtered movements
    const filteredMovements = useMemo(() => {
        return unifiedMovements.filter(m => {
            // Action Type Filter
            if (actionTypeFilter !== 'all' && m.type !== actionTypeFilter) return false;

            // Item Filter
            if (itemFilter !== 'all' && m.itemId !== itemFilter && !m.itemName.toLowerCase().includes(itemFilter.toLowerCase())) {
                return false;
            }

            // Store Filter
            if (storeFilter !== 'all' && m.storeId !== storeFilter) return false;

            // Date Range Filter
            if (dateRangeFilter !== 'all') {
                const itemDate = new Date(m.date);
                const now = new Date();
                if (dateRangeFilter === 'today') {
                    if (itemDate.toDateString() !== now.toDateString()) return false;
                } else if (dateRangeFilter === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (itemDate < weekAgo) return false;
                } else if (dateRangeFilter === 'month') {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (itemDate < monthAgo) return false;
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = m.itemName.toLowerCase().includes(q);
                const matchRef = m.referenceNumber.toLowerCase().includes(q);
                const matchParty = m.partyName.toLowerCase().includes(q);
                const matchSku = (m.sku || '').toLowerCase().includes(q);
                const matchNotes = (m.notes || '').toLowerCase().includes(q);
                if (!matchName && !matchRef && !matchParty && !matchSku && !matchNotes) return false;
            }

            return true;
        });
    }, [unifiedMovements, actionTypeFilter, itemFilter, storeFilter, dateRangeFilter, searchQuery]);

    // Summary statistics
    const stats = useMemo(() => {
        let totalReceiptUnits = 0;
        let totalReceiptValue = 0;
        let totalIssueUnits = 0;
        let totalIssueValue = 0;

        filteredMovements.forEach(m => {
            if (m.type === 'receipt') {
                totalReceiptUnits += m.quantity;
                totalReceiptValue += (m.totalCost || 0);
            } else if (m.type === 'issue') {
                totalIssueUnits += m.quantity;
                totalIssueValue += (m.totalCost || 0);
            }
        });

        const activeItemObj = inventoryItems.find(i => i.id === itemFilter);

        return {
            receiptCount: filteredMovements.filter(m => m.type === 'receipt').length,
            issueCount: filteredMovements.filter(m => m.type === 'issue').length,
            totalReceiptUnits,
            totalReceiptValue,
            totalIssueUnits,
            totalIssueValue,
            netUnits: totalReceiptUnits - totalIssueUnits,
            activeItemObj
        };
    }, [filteredMovements, itemFilter, inventoryItems]);

    // Handle Quick Stock Receive
    const handleReceiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetItem = inventoryItems.find(i => i.id === receiveForm.itemId);
        if (!targetItem) {
            alert('Please select an inventory item to receive.');
            return;
        }

        const qty = Number(receiveForm.quantity);
        if (qty <= 0) {
            alert('Quantity must be greater than 0.');
            return;
        }

        setIsSubmitting(true);
        try {
            const cost = Number(receiveForm.unitCost) || Number(targetItem.costPrice) || 0;
            const refNum = receiveForm.referenceNumber.trim() || `GRN-${Date.now().toString().slice(-6)}`;
            const supplier = receiveForm.supplierName.trim() || 'General Supplier';

            // 1. Update Inventory Item quantity
            const currentQty = Number(targetItem.quantity || 0);
            const newQty = currentQty + qty;

            const updatedItem: RetailInventoryItem = {
                ...targetItem,
                quantity: newQty,
                costPrice: cost > 0 ? cost : targetItem.costPrice,
                storeId: receiveForm.storeId || targetItem.storeId,
                lastUpdated: new Date().toISOString()
            };

            await apiService.saveModuleRecord('retail_inventory_items', updatedItem);

            // 2. Create Stock Receipt record
            const newReceipt: StockReceipt = {
                id: `SR-${Date.now()}`,
                institutionId,
                supplierId: `sup-${Date.now().toString().slice(-4)}`,
                supplierName: supplier,
                referenceNumber: refNum,
                receiptDate: receiveForm.date || new Date().toISOString(),
                totalAmount: qty * cost,
                items: [{
                    itemId: targetItem.id,
                    itemName: targetItem.name,
                    sku: targetItem.sku,
                    quantity: qty,
                    unitCost: cost
                }],
                recordedBy: currentUser?.name || currentUser?.email || 'Store Officer',
                status: 'completed',
                notes: receiveForm.notes,
                createdAt: new Date().toISOString()
            };

            try {
                await apiService.saveModuleRecord('retail_stock_receipts', newReceipt);
            } catch (err) {
                console.warn('Saving to DB failed, saving receipt to localStorage fallback:', err);
            }

            // Always update local fallback
            try {
                const localRec = JSON.parse(localStorage.getItem('eduai_fallback_stock_receipts') || '[]');
                localRec.unshift(newReceipt);
                localStorage.setItem('eduai_fallback_stock_receipts', JSON.stringify(localRec));
            } catch (e) {}

            alert(`✅ Successfully received ${qty} ${targetItem.unit || 'units'} of "${targetItem.name}". New Stock: ${newQty}.`);
            setIsReceiveModalOpen(false);
            setReceiveForm({
                itemId: targetItem.id,
                quantity: 1,
                unitCost: targetItem.costPrice || 0,
                supplierName: '',
                referenceNumber: '',
                date: new Date().toISOString().split('T')[0],
                storeId: '',
                notes: ''
            });

            await fetchHistoryData();
            if (onInventoryUpdated) onInventoryUpdated();
            window.dispatchEvent(new CustomEvent('inventory_updated'));
        } catch (error) {
            console.error('Failed to record stock receipt:', error);
            alert('Failed to record stock receipt. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Quick Stock Issue
    const handleIssueSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetItem = inventoryItems.find(i => i.id === issueForm.itemId);
        if (!targetItem) {
            alert('Please select an inventory item to issue.');
            return;
        }

        const qty = Number(issueForm.quantity);
        if (qty <= 0) {
            alert('Quantity must be greater than 0.');
            return;
        }

        const currentQty = Number(targetItem.quantity || 0);
        if (qty > currentQty) {
            alert(`⚠️ Cannot issue ${qty} units. Only ${currentQty} ${targetItem.unit || 'units'} currently available in stock.`);
            return;
        }

        if (!issueForm.issuedTo.trim()) {
            alert('Please specify who this stock is being issued to (e.g. Teacher name, Department, or Staff).');
            return;
        }

        setIsSubmitting(true);
        try {
            const voucherNum = issueForm.voucherNumber.trim() || `SIV-${Date.now().toString().slice(-6)}`;
            const cost = Number(targetItem.costPrice || 0);
            const newQty = Math.max(0, currentQty - qty);

            // 1. Update Inventory Item stock
            const updatedItem: RetailInventoryItem = {
                ...targetItem,
                quantity: newQty,
                lastUpdated: new Date().toISOString()
            };

            await apiService.saveModuleRecord('retail_inventory_items', updatedItem);

            // 2. Create Stock Issue record
            const newIssue: StockIssue = {
                id: `SI-${Date.now()}`,
                institutionId,
                voucherNumber: voucherNum,
                issuedDate: issueForm.date || new Date().toISOString(),
                issuedTo: issueForm.issuedTo.trim(),
                department: issueForm.department.trim(),
                purpose: issueForm.purpose.trim() || issueForm.notes.trim() || 'Store Requisition Issue',
                items: [{
                    itemId: targetItem.id,
                    itemName: targetItem.name,
                    sku: targetItem.sku,
                    quantity: qty,
                    unit: targetItem.unit || 'pcs',
                    unitCost: cost,
                    totalCost: qty * cost,
                    balanceBefore: currentQty,
                    balanceAfter: newQty,
                    storeId: targetItem.storeId,
                    storeName: targetItem.storeName
                }],
                totalQuantity: qty,
                totalValue: qty * cost,
                recordedBy: currentUser?.name || currentUser?.email || 'Store Officer',
                status: 'completed',
                notes: issueForm.notes,
                createdAt: new Date().toISOString()
            };

            try {
                await apiService.saveModuleRecord('retail_stock_issues', newIssue);
            } catch (err) {
                console.warn('Saving to DB failed, saving issue to localStorage fallback:', err);
            }

            // Always update local fallback
            try {
                const localIss = JSON.parse(localStorage.getItem('eduai_fallback_stock_issues') || '[]');
                localIss.unshift(newIssue);
                localStorage.setItem('eduai_fallback_stock_issues', JSON.stringify(localIss));
            } catch (e) {}

            alert(`✅ Successfully issued ${qty} ${targetItem.unit || 'units'} of "${targetItem.name}" to ${issueForm.issuedTo}. Remaining Stock: ${newQty}.`);
            setIsIssueModalOpen(false);
            setIssueForm({
                itemId: targetItem.id,
                quantity: 1,
                issuedTo: '',
                department: 'General Administration',
                purpose: '',
                voucherNumber: '',
                date: new Date().toISOString().split('T')[0],
                storeId: '',
                notes: ''
            });

            await fetchHistoryData();
            if (onInventoryUpdated) onInventoryUpdated();
            window.dispatchEvent(new CustomEvent('inventory_updated'));
        } catch (error) {
            console.error('Failed to record stock issue:', error);
            alert('Failed to record stock issue. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Export PDF Ledger
    const handleExportPdf = () => {
        try {
            const doc = new jsPDF({ orientation: 'landscape' });
            
            // Header
            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59);
            doc.text('STOCK MOVEMENT & ACTION HISTORY LEDGER', 14, 18);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Generated on: ${new Date().toLocaleString()} | Filter: ${actionTypeFilter.toUpperCase()} | Item: ${itemFilter === 'all' ? 'All Items' : (stats.activeItemObj?.name || itemFilter)}`, 14, 25);

            const tableData = filteredMovements.map((m, idx) => [
                idx + 1,
                new Date(m.date).toLocaleDateString(),
                m.type === 'receipt' ? '+ RECEIPT (IN)' : '- ISSUE (OUT)',
                m.referenceNumber,
                m.itemName,
                m.sku || '-',
                m.partyName,
                `${m.type === 'receipt' ? '+' : '-'}${m.quantity} ${m.unit}`,
                `KES ${(m.unitCost || 0).toLocaleString()}`,
                `KES ${(m.totalCost || 0).toLocaleString()}`,
                m.notes || '-'
            ]);

            autoTable(doc, {
                startY: 30,
                head: [['#', 'Date', 'Type', 'Voucher / Ref', 'Item Name', 'SKU', 'Party / Recipient', 'Qty', 'Unit Cost', 'Total Value', 'Notes']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8
                },
                bodyStyles: {
                    fontSize: 8
                },
                columnStyles: {
                    2: { fontStyle: 'bold' }
                }
            });

            doc.save(`Stock_Action_History_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert('Could not export PDF. Please check your data.');
        }
    };

    // Export CSV Ledger
    const handleExportCsv = () => {
        try {
            const headers = ['Date', 'Type', 'Reference/Voucher', 'Item Name', 'SKU', 'Party/Supplier/Recipient', 'Quantity', 'Unit', 'Unit Cost', 'Total Value', 'Notes'];
            const rows = filteredMovements.map(m => [
                new Date(m.date).toISOString().split('T')[0],
                m.type.toUpperCase(),
                `"${m.referenceNumber.replace(/"/g, '""')}"`,
                `"${m.itemName.replace(/"/g, '""')}"`,
                `"${(m.sku || '').replace(/"/g, '""')}"`,
                `"${m.partyName.replace(/"/g, '""')}"`,
                m.type === 'receipt' ? m.quantity : -m.quantity,
                m.unit,
                m.unitCost || 0,
                m.totalCost || 0,
                `"${(m.notes || '').replace(/"/g, '""')}"`
            ]);

            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `Stock_Action_History_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('CSV export failed:', e);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* ─ HEADER & PRIMARY ACTION BUTTONS ─ */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md shadow-indigo-500/20">
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Inventory Action & Movement History
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                    Audit Trail
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                Complete stock intake (Receipts) & dispatch (Issues) ledger with running balances
                            </p>
                        </div>
                    </div>

                    {selectedItemId && stats.activeItemObj && (
                        <div className="flex items-center gap-2 mt-3 pl-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filtered to:</span>
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800">
                                <Package className="w-3.5 h-3.5" />
                                {stats.activeItemObj.name} ({stats.activeItemObj.quantity} in stock)
                                {onClearSelectedItem && (
                                    <button 
                                        onClick={() => {
                                            setItemFilter('all');
                                            onClearSelectedItem();
                                        }}
                                        className="hover:text-red-500 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        </div>
                    )}
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    <button
                        onClick={() => {
                            setReceiveForm(prev => ({
                                ...prev,
                                itemId: itemFilter !== 'all' ? itemFilter : (inventoryItems[0]?.id || '')
                            }));
                            setIsReceiveModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all"
                    >
                        <ArrowDownLeft className="w-4 h-4" />
                        + Receive Stock (In)
                    </button>

                    <button
                        onClick={() => {
                            setIssueForm(prev => ({
                                ...prev,
                                itemId: itemFilter !== 'all' ? itemFilter : (inventoryItems[0]?.id || '')
                            }));
                            setIsIssueModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/20 transition-all"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        - Issue Stock (Out)
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                        <button
                            onClick={handleExportPdf}
                            title="Export PDF"
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleExportCsv}
                            title="Export CSV"
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={fetchHistoryData}
                            title="Refresh Data"
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ─ METRIC CARDS ─ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Receipts */}
                <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/40 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Total Receipts</p>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <ArrowDownLeft className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                            +{stats.totalReceiptUnits.toLocaleString()}
                        </h4>
                        <span className="text-xs font-bold text-slate-400 uppercase">units in</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        {stats.receiptCount} receipts • KES {stats.totalReceiptValue.toLocaleString()} value
                    </p>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
                </div>

                {/* Total Issues */}
                <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/40 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Total Issues</p>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                            -{stats.totalIssueUnits.toLocaleString()}
                        </h4>
                        <span className="text-xs font-bold text-slate-400 uppercase">units out</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        {stats.issueCount} issues • KES {stats.totalIssueValue.toLocaleString()} value
                    </p>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all pointer-events-none" />
                </div>

                {/* Net Stock Movement */}
                <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/40 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Net Flow</p>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <h4 className={`text-2xl font-black ${stats.netUnits >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {stats.netUnits >= 0 ? `+${stats.netUnits.toLocaleString()}` : stats.netUnits.toLocaleString()}
                        </h4>
                        <span className="text-xs font-bold text-slate-400 uppercase">balance</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        Total recorded actions: {filteredMovements.length}
                    </p>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
                </div>

                {/* Current Scope Stock */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Stock</p>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                            {itemFilter === 'all' 
                                ? inventoryItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0).toLocaleString()
                                : (stats.activeItemObj?.quantity || 0).toLocaleString()}
                        </h4>
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            {itemFilter === 'all' ? 'total pcs' : (stats.activeItemObj?.unit || 'units')}
                        </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        {itemFilter === 'all' ? `${inventoryItems.length} active inventory items` : `SKU: ${stats.activeItemObj?.sku || 'N/A'}`}
                    </p>
                </div>
            </div>

            {/* ─ COMPREHENSIVE FILTER CONTROLS ─ */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by Voucher / Ref, Item name, SKU, Supplier, or Recipient..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Action Type Toggle */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
                        <button
                            onClick={() => setActionTypeFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                actionTypeFilter === 'all'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                        >
                            All Actions
                        </button>
                        <button
                            onClick={() => setActionTypeFilter('receipt')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                actionTypeFilter === 'receipt'
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                        >
                            <ArrowDownLeft className="w-3 h-3" />
                            Receipts ({unifiedMovements.filter(m => m.type === 'receipt').length})
                        </button>
                        <button
                            onClick={() => setActionTypeFilter('issue')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                actionTypeFilter === 'issue'
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            }`}
                        >
                            <ArrowUpRight className="w-3 h-3" />
                            Issues ({unifiedMovements.filter(m => m.type === 'issue').length})
                        </button>
                    </div>
                </div>

                {/* Secondary Filters */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Item Dropdown Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Item:</span>
                        <select
                            value={itemFilter}
                            onChange={e => setItemFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[220px]"
                        >
                            <option value="all">All Inventory Items ({inventoryItems.length})</option>
                            {inventoryItems.map(it => (
                                <option key={it.id} value={it.id}>
                                    {it.name} ({it.quantity} {it.unit || 'pcs'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Store Dropdown Filter */}
                    {stores.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Store:</span>
                            <select
                                value={storeFilter}
                                onChange={e => setStoreFilter(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="all">All Stores & Locations</option>
                                {stores.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date Range Selector */}
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Period:</span>
                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            {(['all', 'today', 'week', 'month'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setDateRangeFilter(p)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all ${
                                        dateRangeFilter === p
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    {p === 'all' ? 'All' : p === 'today' ? 'Today' : p === 'week' ? '7D' : '30D'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─ ACTION HISTORY LEDGER TABLE ─ */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="py-3.5 px-4">Date & Time</th>
                                <th className="py-3.5 px-4">Type</th>
                                <th className="py-3.5 px-4">Voucher / Ref</th>
                                <th className="py-3.5 px-4">Item Details</th>
                                <th className="py-3.5 px-4 text-right">Quantity Flow</th>
                                <th className="py-3.5 px-4">Supplier / Issued To</th>
                                <th className="py-3.5 px-4 text-right">Unit & Total Cost</th>
                                <th className="py-3.5 px-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                            {filteredMovements.map(m => {
                                const isReceipt = m.type === 'receipt';
                                return (
                                    <tr 
                                        key={m.id} 
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                                    >
                                        {/* Date */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {new Date(m.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] font-semibold text-slate-400">
                                                {new Date(m.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>

                                        {/* Type Badge */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                isReceipt
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                            }`}>
                                                {isReceipt ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                {isReceipt ? 'Receipt (In)' : 'Issue (Out)'}
                                            </span>
                                        </td>

                                        {/* Voucher / Ref */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                                {m.referenceNumber}
                                            </span>
                                        </td>

                                        {/* Item Details */}
                                        <td className="py-3.5 px-4">
                                            <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                <span>{m.itemName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                                                {m.sku && <span className="font-mono">SKU: {m.sku}</span>}
                                                {m.storeName && (
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <Building2 className="w-3 h-3" /> {m.storeName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Quantity Flow */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <span className={`text-sm font-black ${
                                                isReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {isReceipt ? `+${m.quantity}` : `-${m.quantity}`}
                                            </span>
                                            <span className="ml-1 text-[11px] font-bold text-slate-400 uppercase">
                                                {m.unit}
                                            </span>
                                        </td>

                                        {/* Supplier / Issued To */}
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {m.partyName}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-semibold">
                                                {m.partyRole}
                                            </div>
                                        </td>

                                        {/* Unit & Total Cost */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="font-black text-slate-800 dark:text-slate-200">
                                                KES {(m.totalCost || 0).toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                KES {(m.unitCost || 0).toLocaleString()} / {m.unit}
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedMovementForView(m)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all"
                                                title="View Voucher Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredMovements.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mx-auto mb-3">
                                            <History className="w-7 h-7" />
                                        </div>
                                        <h5 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                            No Inventory Movements Recorded
                                        </h5>
                                        <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
                                            Use the "+ Receive Stock" button to record vendor receipts or "- Issue Stock" to record item dispatch.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─ RECEIVE STOCK (STOCK IN) MODAL ─ */}
            {isReceiveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                                    <ArrowDownLeft className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                                        Record Stock Receipt (Stock In)
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Receive items from supplier or consignment into inventory
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsReceiveModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
                            {/* Select Item */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Inventory Item *
                                </label>
                                <select
                                    value={receiveForm.itemId}
                                    onChange={e => {
                                        const itId = e.target.value;
                                        const itObj = inventoryItems.find(i => i.id === itId);
                                        setReceiveForm(prev => ({
                                            ...prev,
                                            itemId: itId,
                                            unitCost: itObj?.costPrice || prev.unitCost
                                        }));
                                    }}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                >
                                    <option value="">-- Select Inventory Item --</option>
                                    {inventoryItems.map(it => (
                                        <option key={it.id} value={it.id}>
                                            {it.name} (Current Stock: {it.quantity} {it.unit || 'pcs'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity & Unit Cost */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Quantity Received *
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={receiveForm.quantity}
                                        onChange={e => setReceiveForm(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                                        required
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Unit Cost (KES)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={receiveForm.unitCost}
                                        onChange={e => setReceiveForm(prev => ({ ...prev, unitCost: Number(e.target.value) }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                            </div>

                            {/* Supplier & Ref */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Supplier / Source
                                    </label>
                                    <input
                                        type="text"
                                        value={receiveForm.supplierName}
                                        onChange={e => setReceiveForm(prev => ({ ...prev, supplierName: e.target.value }))}
                                        placeholder="e.g. Oxford Press / MoE"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Invoice / Delivery Ref
                                    </label>
                                    <input
                                        type="text"
                                        value={receiveForm.referenceNumber}
                                        onChange={e => setReceiveForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                                        placeholder="e.g. INV-9812 / DN-402"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                            </div>

                            {/* Date & Store */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Receipt Date
                                    </label>
                                    <input
                                        type="date"
                                        value={receiveForm.date}
                                        onChange={e => setReceiveForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Target Store
                                    </label>
                                    <select
                                        value={receiveForm.storeId}
                                        onChange={e => setReceiveForm(prev => ({ ...prev, storeId: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                        <option value="">-- Default Store --</option>
                                        {stores.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Notes / Remarks
                                </label>
                                <textarea
                                    rows={2}
                                    value={receiveForm.notes}
                                    onChange={e => setReceiveForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Condition on receipt, batch numbers, or special notes..."
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsReceiveModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Recording...' : 'Confirm Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─ ISSUE STOCK (STOCK OUT) MODAL ─ */}
            {isIssueModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-rose-500 text-white rounded-xl">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                                        Issue Stock (Stock Out)
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Dispatch items to teachers, departments, staff, or classes
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsIssueModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
                            {/* Select Item */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Inventory Item to Issue *
                                </label>
                                <select
                                    value={issueForm.itemId}
                                    onChange={e => setIssueForm(prev => ({ ...prev, itemId: e.target.value }))}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                >
                                    <option value="">-- Select Inventory Item --</option>
                                    {inventoryItems.map(it => (
                                        <option key={it.id} value={it.id}>
                                            {it.name} (Available: {it.quantity} {it.unit || 'pcs'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Quantity to Issue *
                                    </label>
                                    {issueForm.itemId && (
                                        <span className="text-[11px] font-bold text-slate-400">
                                            Available:{' '}
                                            <strong className="text-slate-700 dark:text-slate-200">
                                                {inventoryItems.find(i => i.id === issueForm.itemId)?.quantity || 0}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min={1}
                                    max={inventoryItems.find(i => i.id === issueForm.itemId)?.quantity || 9999}
                                    value={issueForm.quantity}
                                    onChange={e => setIssueForm(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>

                            {/* Issued To & Department */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Issued To (Name) *
                                    </label>
                                    <input
                                        type="text"
                                        value={issueForm.issuedTo}
                                        onChange={e => setIssueForm(prev => ({ ...prev, issuedTo: e.target.value }))}
                                        placeholder="e.g. John Doe / Grade 4"
                                        required
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Department / Unit
                                    </label>
                                    <input
                                        type="text"
                                        value={issueForm.department}
                                        onChange={e => setIssueForm(prev => ({ ...prev, department: e.target.value }))}
                                        placeholder="e.g. Science / Boarding"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                            </div>

                            {/* Voucher Number & Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Issue Voucher No
                                    </label>
                                    <input
                                        type="text"
                                        value={issueForm.voucherNumber}
                                        onChange={e => setIssueForm(prev => ({ ...prev, voucherNumber: e.target.value }))}
                                        placeholder="Auto-generated if empty"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Date Issued
                                    </label>
                                    <input
                                        type="date"
                                        value={issueForm.date}
                                        onChange={e => setIssueForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                            </div>

                            {/* Purpose & Notes */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Purpose / Requisition Reason
                                </label>
                                <textarea
                                    rows={2}
                                    value={issueForm.purpose}
                                    onChange={e => setIssueForm(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="e.g. For practical science lesson / office supplies..."
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsIssueModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Issuing...' : 'Confirm Issue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─ VOUCHER DETAILS PREVIEW MODAL ─ */}
            {selectedMovementForView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className={`p-2 rounded-xl text-white ${selectedMovementForView.type === 'receipt' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                    {selectedMovementForView.type === 'receipt' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </span>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                        {selectedMovementForView.type === 'receipt' ? 'Stock Receipt Voucher' : 'Stock Issue Voucher'}
                                    </h4>
                                    <span className="font-mono text-[10px] text-slate-400 font-bold">
                                        Ref: {selectedMovementForView.referenceNumber}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMovementForView(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="font-semibold text-slate-400">Date</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(selectedMovementForView.date).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="font-semibold text-slate-400">Item</span>
                                <span className="font-black text-slate-900 dark:text-white">{selectedMovementForView.itemName}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="font-semibold text-slate-400">Quantity Flow</span>
                                <span className={`font-black ${selectedMovementForView.type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedMovementForView.type === 'receipt' ? '+' : '-'}{selectedMovementForView.quantity} {selectedMovementForView.unit}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="font-semibold text-slate-400">Party</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedMovementForView.partyName} ({selectedMovementForView.partyRole})</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="font-semibold text-slate-400">Total Valuation</span>
                                <span className="font-black text-slate-800 dark:text-slate-200">KES {(selectedMovementForView.totalCost || 0).toLocaleString()}</span>
                            </div>
                            {selectedMovementForView.notes && (
                                <div className="pt-2">
                                    <span className="font-semibold text-slate-400 block mb-1">Notes / Remarks:</span>
                                    <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 font-medium italic">
                                        "{selectedMovementForView.notes}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => setSelectedMovementForView(null)}
                                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
