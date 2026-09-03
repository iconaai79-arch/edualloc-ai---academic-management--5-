import React, { useState, useEffect, useMemo } from 'react';
import { RetailInventoryItem, StockReceipt, StockIssue } from '../../types';
import { apiService } from '../../services/apiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    History, 
    ArrowDownLeft, 
    ArrowUpRight, 
    Package, 
    X, 
    Printer, 
    Calendar, 
    Tag, 
    Building2, 
    CheckCircle,
    Layers,
    Clock
} from 'lucide-react';

interface ItemActionHistoryModalProps {
    item: RetailInventoryItem;
    institutionId: string;
    onClose: () => void;
    onItemUpdated?: () => void;
}

export function ItemActionHistoryModal({
    item,
    institutionId,
    onClose,
    onItemUpdated
}: ItemActionHistoryModalProps) {
    const [receipts, setReceipts] = useState<StockReceipt[]>([]);
    const [issues, setIssues] = useState<StockIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Quick action states
    const [quickMode, setQuickMode] = useState<'view' | 'receive' | 'issue'>('view');
    const [quickQty, setQuickQty] = useState(1);
    const [quickParty, setQuickParty] = useState('');
    const [quickRef, setQuickRef] = useState('');
    const [quickCost, setQuickCost] = useState(item.costPrice || 0);
    const [quickNotes, setQuickNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch receipts
            let recs: StockReceipt[] = [];
            try {
                const res = await apiService.fetchModuleRecords<StockReceipt>('retail_stock_receipts', institutionId);
                if (res) recs = res;
            } catch (e) {}
            try {
                const localRec = JSON.parse(localStorage.getItem('eduai_fallback_stock_receipts') || '[]');
                const seen = new Set(recs.map(r => r.id));
                localRec.forEach((r: any) => {
                    if (r && !seen.has(r.id) && (r.institutionId === institutionId || !r.institutionId)) recs.push(r);
                });
            } catch (e) {}

            // Fetch issues
            let isss: StockIssue[] = [];
            try {
                const resIss = await apiService.fetchModuleRecords<StockIssue>('retail_stock_issues', institutionId);
                if (resIss) isss = resIss;
            } catch (e) {}
            try {
                const localIss = JSON.parse(localStorage.getItem('eduai_fallback_stock_issues') || '[]');
                const seenIss = new Set(isss.map(i => i.id));
                localIss.forEach((i: any) => {
                    if (i && !seenIss.has(i.id) && (i.institutionId === institutionId || !i.institutionId)) isss.push(i);
                });
            } catch (e) {}

            setReceipts(recs);
            setIssues(isss);
        } catch (error) {
            console.error('Error fetching item history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [item.id, institutionId]);

    // Filtered actions specifically for THIS item
    const itemMovements = useMemo(() => {
        const moves: Array<{
            id: string;
            type: 'receipt' | 'issue';
            date: string;
            reference: string;
            party: string;
            quantity: number;
            unitCost?: number;
            notes?: string;
        }> = [];

        receipts.forEach(rcpt => {
            (rcpt.items || []).forEach((it, idx) => {
                if (it.itemId === item.id || it.itemName.toLowerCase() === item.name.toLowerCase()) {
                    moves.push({
                        id: `rcpt-${rcpt.id}-${idx}`,
                        type: 'receipt',
                        date: rcpt.receiptDate || rcpt.createdAt,
                        reference: rcpt.referenceNumber || rcpt.id,
                        party: rcpt.supplierName || 'Supplier',
                        quantity: Number(it.quantity || 0),
                        unitCost: Number(it.unitCost || item.costPrice || 0),
                        notes: rcpt.notes
                    });
                }
            });
        });

        issues.forEach(iss => {
            (iss.items || []).forEach((it, idx) => {
                if (it.itemId === item.id || it.itemName.toLowerCase() === item.name.toLowerCase()) {
                    moves.push({
                        id: `iss-${iss.id}-${idx}`,
                        type: 'issue',
                        date: iss.issuedDate || iss.createdAt,
                        reference: iss.voucherNumber || iss.id,
                        party: iss.issuedTo || 'Staff Member',
                        quantity: Number(it.quantity || 0),
                        unitCost: Number(it.unitCost || item.costPrice || 0),
                        notes: iss.purpose || iss.notes
                    });
                }
            });
        });

        return moves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [receipts, issues, item]);

    const totalReceived = itemMovements.filter(m => m.type === 'receipt').reduce((acc, m) => acc + m.quantity, 0);
    const totalIssued = itemMovements.filter(m => m.type === 'issue').reduce((acc, m) => acc + m.quantity, 0);

    // Quick Action Handler
    const handleQuickAction = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = Number(quickQty);
        if (qty <= 0) {
            alert('Quantity must be greater than 0');
            return;
        }

        setIsSaving(true);
        try {
            const currentQty = Number(item.quantity || 0);

            if (quickMode === 'receive') {
                const newQty = currentQty + qty;
                const updated: RetailInventoryItem = {
                    ...item,
                    quantity: newQty,
                    costPrice: quickCost > 0 ? quickCost : item.costPrice,
                    lastUpdated: new Date().toISOString()
                };
                await apiService.saveModuleRecord('retail_inventory_items', updated);

                const newRec: StockReceipt = {
                    id: `SR-${Date.now()}`,
                    institutionId,
                    supplierId: `sup-${Date.now().toString().slice(-4)}`,
                    supplierName: quickParty || 'Supplier',
                    referenceNumber: quickRef || `GRN-${Date.now().toString().slice(-6)}`,
                    receiptDate: new Date().toISOString(),
                    totalAmount: qty * (quickCost || item.costPrice || 0),
                    items: [{
                        itemId: item.id,
                        itemName: item.name,
                        sku: item.sku,
                        quantity: qty,
                        unitCost: quickCost || item.costPrice || 0
                    }],
                    recordedBy: 'Store Officer',
                    status: 'completed',
                    notes: quickNotes,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('retail_stock_receipts', newRec).catch(() => {});
                try {
                    const localRec = JSON.parse(localStorage.getItem('eduai_fallback_stock_receipts') || '[]');
                    localRec.unshift(newRec);
                    localStorage.setItem('eduai_fallback_stock_receipts', JSON.stringify(localRec));
                } catch (e) {}

                item.quantity = newQty;

                // Update local storage fallback
                try {
                    const localInv = JSON.parse(localStorage.getItem('eduai_fallback_retail_inventory') || '[]');
                    const idx = localInv.findIndex((i: any) => i.id === item.id);
                    if (idx >= 0) { localInv[idx] = updated; } else { localInv.push(updated); }
                    localStorage.setItem('eduai_fallback_retail_inventory', JSON.stringify(localInv));
                } catch (e) {}

                alert(`✅ Received ${qty} ${item.unit || 'pcs'}. New balance: ${newQty}`);
            } else if (quickMode === 'issue') {
                if (qty > currentQty) {
                    alert(`⚠️ Only ${currentQty} ${item.unit || 'pcs'} available.`);
                    setIsSaving(false);
                    return;
                }
                const newQty = currentQty - qty;
                const updated: RetailInventoryItem = {
                    ...item,
                    quantity: newQty,
                    lastUpdated: new Date().toISOString()
                };
                await apiService.saveModuleRecord('retail_inventory_items', updated);

                // Update local storage fallback
                try {
                    const localInv = JSON.parse(localStorage.getItem('eduai_fallback_retail_inventory') || '[]');
                    const idx = localInv.findIndex((i: any) => i.id === item.id);
                    if (idx >= 0) { localInv[idx] = updated; } else { localInv.push(updated); }
                    localStorage.setItem('eduai_fallback_retail_inventory', JSON.stringify(localInv));
                } catch (e) {}

                const newIss: StockIssue = {
                    id: `SI-${Date.now()}`,
                    institutionId,
                    voucherNumber: quickRef || `SIV-${Date.now().toString().slice(-6)}`,
                    issuedDate: new Date().toISOString(),
                    issuedTo: quickParty || 'Staff',
                    department: 'General',
                    purpose: quickNotes || 'Stock Issue',
                    items: [{
                        itemId: item.id,
                        itemName: item.name,
                        sku: item.sku,
                        quantity: qty,
                        unit: item.unit || 'pcs',
                        unitCost: item.costPrice || 0,
                        totalCost: qty * (item.costPrice || 0),
                        balanceBefore: currentQty,
                        balanceAfter: newQty,
                        storeId: item.storeId,
                        storeName: item.storeName
                    }],
                    totalQuantity: qty,
                    totalValue: qty * (item.costPrice || 0),
                    status: 'completed',
                    notes: quickNotes,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('retail_stock_issues', newIss).catch(() => {});
                try {
                    const localIss = JSON.parse(localStorage.getItem('eduai_fallback_stock_issues') || '[]');
                    localIss.unshift(newIss);
                    localStorage.setItem('eduai_fallback_stock_issues', JSON.stringify(localIss));
                } catch (e) {}

                item.quantity = newQty;
                alert(`✅ Issued ${qty} ${item.unit || 'pcs'} to ${quickParty}. Remaining balance: ${newQty}`);
            }

            setQuickMode('view');
            setQuickQty(1);
            setQuickParty('');
            setQuickRef('');
            setQuickNotes('');
            await fetchData();
            if (onItemUpdated) onItemUpdated();
            window.dispatchEvent(new CustomEvent('inventory_updated'));
        } catch (err) {
            console.error('Quick action failed:', err);
            alert('Failed to update stock. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Print Bin Card PDF
    const handlePrintBinCard = () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59);
            doc.text('STOCK BIN CARD / MOVEMENT CARD', 14, 18);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Item: ${item.name} | SKU: ${item.sku || 'N/A'} | Current Stock: ${item.quantity} ${item.unit || 'pcs'}`, 14, 25);
            doc.text(`Location: ${item.storeName || 'Main Store'} | Category: ${item.category}`, 14, 31);

            const tableData = itemMovements.map((m, idx) => [
                idx + 1,
                new Date(m.date).toLocaleDateString(),
                m.type === 'receipt' ? '+ RECEIPT (IN)' : '- ISSUE (OUT)',
                m.reference,
                m.party,
                m.type === 'receipt' ? `+${m.quantity}` : `-${m.quantity}`,
                m.notes || '-'
            ]);

            autoTable(doc, {
                startY: 36,
                head: [['#', 'Date', 'Action', 'Voucher/Ref', 'Party / Recipient', 'Qty', 'Notes']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' }
            });

            doc.save(`Bin_Card_${item.name.replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    {item.name}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    Action History
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-2">
                                <span>SKU: {item.sku || 'N/A'}</span>
                                <span>•</span>
                                <span>Category: {item.category}</span>
                                {item.storeName && (
                                    <>
                                        <span>•</span>
                                        <span>{item.storeName}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrintBinCard}
                            title="Print Bin Card"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-all"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Stock Summary Bar */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Current Stock</span>
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                            {item.quantity} <span className="text-xs font-bold text-slate-400">{item.unit || 'pcs'}</span>
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Total Received</span>
                        <span className="text-xl font-black text-emerald-600">
                            +{totalReceived} <span className="text-xs font-bold text-slate-400">{item.unit || 'pcs'}</span>
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">Total Issued</span>
                        <span className="text-xl font-black text-rose-600">
                            -{totalIssued} <span className="text-xs font-bold text-slate-400">{item.unit || 'pcs'}</span>
                        </span>
                    </div>
                </div>

                {/* Quick Action Toggle Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Item Action Log ({itemMovements.length})
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setQuickMode(quickMode === 'receive' ? 'view' : 'receive')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                                quickMode === 'receive' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                        >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            + Quick Receive
                        </button>
                        <button
                            onClick={() => setQuickMode(quickMode === 'issue' ? 'view' : 'issue')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                                quickMode === 'issue' 
                                    ? 'bg-rose-600 text-white shadow-sm' 
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                        >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            - Quick Issue
                        </button>
                    </div>
                </div>

                {/* Quick Action Form (if opened) */}
                {quickMode !== 'view' && (
                    <form onSubmit={handleQuickAction} className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                {quickMode === 'receive' ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-rose-600" />}
                                {quickMode === 'receive' ? `Receive Stock for "${item.name}"` : `Issue Stock from "${item.name}"`}
                            </span>
                            <button type="button" onClick={() => setQuickMode('view')} className="text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Quantity *</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={quickMode === 'issue' ? item.quantity : undefined}
                                    value={quickQty}
                                    onChange={e => setQuickQty(Math.max(1, Number(e.target.value)))}
                                    required
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    {quickMode === 'receive' ? 'Supplier' : 'Issued To *'}
                                </label>
                                <input
                                    type="text"
                                    value={quickParty}
                                    onChange={e => setQuickParty(e.target.value)}
                                    placeholder={quickMode === 'receive' ? 'e.g. Acme Supplier' : 'e.g. Mr. David / Form 3'}
                                    required={quickMode === 'issue'}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Voucher / Ref</label>
                                <input
                                    type="text"
                                    value={quickRef}
                                    onChange={e => setQuickRef(e.target.value)}
                                    placeholder="Optional"
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setQuickMode('view')}
                                className="px-3 py-1.5 text-xs font-bold text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase text-white shadow-sm disabled:opacity-50 ${
                                    quickMode === 'receive' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {isSaving ? 'Saving...' : quickMode === 'receive' ? 'Confirm Receipt' : 'Confirm Issue'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Movements Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {itemMovements.map(m => {
                        const isRec = m.type === 'receipt';
                        return (
                            <div
                                key={m.id}
                                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl text-white ${isRec ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                        {isRec ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                {isRec ? 'Stock Receipt' : 'Stock Issue'}
                                            </span>
                                            <span className="font-mono text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                {m.reference}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                            {isRec ? `From: ${m.party}` : `Issued to: ${m.party}`}
                                            {m.notes && <span className="text-slate-400 ml-1.5 italic">("{m.notes}")</span>}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right whitespace-nowrap">
                                    <span className={`text-sm font-black ${isRec ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isRec ? `+${m.quantity}` : `-${m.quantity}`} {item.unit || 'pcs'}
                                    </span>
                                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                        {new Date(m.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {itemMovements.length === 0 && (
                        <div className="py-12 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mx-auto mb-2">
                                <History className="w-6 h-6" />
                            </div>
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                No Recorded History for this Item
                            </h5>
                            <p className="text-[11px] text-slate-400 mt-1">
                                Click "+ Quick Receive" above to record initial intake or "- Quick Issue" to record dispatch.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
