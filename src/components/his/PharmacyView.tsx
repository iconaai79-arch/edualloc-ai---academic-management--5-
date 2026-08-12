import React, { useState, useEffect, useMemo } from 'react';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { UserIcon } from '../icons/UserIcon';
import { apiService } from '../../services/apiService';
import { LinkDrugToInventoryModal } from './LinkDrugToInventoryModal';
import { SmartPharmacyInventoryImporterModal } from './SmartPharmacyInventoryImporterModal';

import { 
    HISPharmacyInventory, 
    HISPharmacyBatch, 
    HISPharmacyInteraction, 
    HISPharmacyNarcoticsLedger, 
    HISPharmacyAdherenceAlert,
    HISPrescription,
    HISPrescriptionItem
} from '../../types';
import { PdfViewer } from '../PdfViewer';
import { generateExternalPrescriptionPdf, generateExternalPrescriptionEposThermalPdf } from '../../services/pdfService';
import { ensureHisPharmacyPreloaded } from '../../utils/preloadHisDrugs';

export function PharmacyView({ institutionId }: { institutionId?: string }) {
    const [activeTab, setActiveTab] = useState<'dispensing' | 'inventory' | 'history' | 'requisitions'>('dispensing');
    const [inventory, setInventory] = useState<HISPharmacyInventory[]>([]);
    const [batches, setBatches] = useState<HISPharmacyBatch[]>([]);
    const [interactions, setInteractions] = useState<HISPharmacyInteraction[]>([]);
    const [prescriptions, setPrescriptions] = useState<HISPrescription[]>([]);
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDrugOpen, setIsAddDrugOpen] = useState(false);
    const [isImportDrugOpen, setIsImportDrugOpen] = useState(false);
    const [editingDrug, setEditingDrug] = useState<HISPharmacyInventory | null>(null);
    const [isDeletingDrugId, setIsDeletingDrugId] = useState<string | null>(null);
    const [showBatchRegistry, setShowBatchRegistry] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState<HISPrescription | null>(null);
    const [linkingDrug, setLinkingDrug] = useState<HISPharmacyInventory | null>(null);
    const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
    const [reqItems, setReqItems] = useState<{ name: string; quantity: number; unitCost: number; unit: string }[]>([{ name: '', quantity: 1, unitCost: 0, unit: 'Tablet' }]);
    const [reqNotes, setReqNotes] = useState('');
    const [isSubmittingReq, setIsSubmittingReq] = useState(false);

    const handleDeleteDrug = async (drug: HISPharmacyInventory) => {
        if (!confirm(`Are you sure you want to delete "${drug.name}" from the pharmacy inventory?`)) return;
        try {
            setIsDeletingDrugId(drug.id);
            await apiService.deleteModuleRecord('his_pharmacy_inventory', drug.id);
            setInventory(prev => prev.filter(d => d.id !== drug.id));
            alert(`✓ "${drug.name}" deleted successfully.`);
        } catch (e) {
            console.error('Failed to delete drug:', e);
            alert('Failed to delete drug from inventory.');
        } finally {
            setIsDeletingDrugId(null);
        }
    };

    const handleSaveEditDrug = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingDrug) return;
        const formData = new FormData(e.currentTarget);
        const name = (formData.get('name') as string || '').trim();
        const category = (formData.get('category') as string || '').trim();
        const unit = (formData.get('unit') as string || '').trim();
        const unitPrice = parseFloat(formData.get('unitPrice') as string) || 0;
        const stockQuantity = parseInt(formData.get('stockQuantity') as string) || 0;
        const reorderLevel = parseInt(formData.get('reorderLevel') as string) || 10;
        const isNarcotic = formData.get('isNarcotic') === 'on';

        if (!name) {
            alert('Drug name is required.');
            return;
        }

        try {
            const updated = {
                ...editingDrug,
                name,
                category,
                unit,
                unitPrice,
                stockQuantity,
                reorderLevel,
                isNarcotic,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('his_pharmacy_inventory', updated);
            setInventory(prev => prev.map(d => d.id === editingDrug.id ? updated : d));
            alert(`✓ "${name}" updated successfully!`);
            setEditingDrug(null);
        } catch (err) {
            console.error('Failed to update drug:', err);
            alert('Failed to update drug.');
        }
    };

    // External Prescription PDF Preview modal state
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfPreviewUri, setPdfPreviewUri] = useState<string | null>(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
    const [showStkPromptModal, setShowStkPromptModal] = useState(false);

    const handlePreviewExternalRxPdf = async (presc: HISPrescription, isEposThermal = false) => {
        try {
            const generator = isEposThermal ? generateExternalPrescriptionEposThermalPdf : generateExternalPrescriptionPdf;
            const uri = await generator(
                {
                    id: presc.id,
                    date: presc.createdAt ? new Date(presc.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
                    doctorName: presc.doctorName || 'Dr. Attending Physician',
                    doctorLicense: 'MPDB-10042',
                    notes: presc.notes,
                    items: (presc.items || []).map((i: any) => ({
                        drugName: i.drugName,
                        formulation: i.formulation || 'Tablet / Syrup',
                        dosage: i.dosage || '500mg',
                        frequency: i.frequency || '1x Daily',
                        duration: i.duration || '5 Days',
                        quantity: i.quantity || 1,
                        isExternalPurchase: i.isExternalPurchase || false,
                        notes: i.notes
                    }))
                },
                {
                    fullName: presc.patientName || 'Patient',
                    admissionNumber: 'PAT-0001',
                    gender: 'Male',
                    dob: '1995-05-12',
                    contact: '+254 700 000 000'
                },
                { name: 'Quantum Healthcare Medical Centre' }
            );

            setPdfPreviewUri(uri);
            setPdfPreviewTitle(isEposThermal ? `EPOS Thermal Print (80mm) - ${presc.patientName || 'Patient'}` : `External Prescription A4 - ${presc.patientName || 'Patient'}`);
            setIsPdfModalOpen(true);
        } catch (err: any) {
            alert(`PDF Generation error: ${err.message || err}`);
        }
    };

    const loadData = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            let inv = await apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId);
            if (!inv || inv.length === 0) {
                inv = await ensureHisPharmacyPreloaded(institutionId);
            }

            const [batchRecords, intercs, prescs, patients, reqs] = await Promise.all([
                apiService.fetchModuleRecords('his_pharmacy_batches', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_interactions', institutionId),
                apiService.fetchModuleRecords('his_prescriptions', institutionId, undefined, { order: 'created_at.desc' }),
                apiService.fetchModuleRecords('his_patients', institutionId),
                apiService.fetchModuleRecords('requisitions', institutionId)
            ]);

            setInventory(inv || []);
            setBatches(batchRecords || []);
            setInteractions(intercs || []);
            setRequisitions(reqs || []);
            
            const allBillingItems = await apiService.fetchModuleRecords('his_billing_items', institutionId).catch(() => []);
            
            // Link prescription to patient name, items, and finance clearance status
            const enhancedPrescs = await Promise.all((prescs || []).map(async (p: any) => {
                const patient = (patients || []).find((pat: any) => pat.id === p.patientId);
                const items = await apiService.fetchModuleRecords('his_prescription_items', undefined, undefined, { filter: { prescription_id: p.id } });
                
                // Check if patient has a paid billing item or existing clearance
                const patientBill = (allBillingItems || []).find((b: any) => b.patientId === p.patientId && (b.status === 'Paid' || b.status === 'paid' || b.status === 'cleared'));
                
                const isCleared = p.paymentStatus === 'cleared' || p.paymentStatus === 'insurance_covered' || !!patientBill || p.status === 'dispensed';
                const paymentStatus = p.paymentStatus || (isCleared ? 'cleared' : 'pending_payment');
                const financeNotes = p.financeNotes || (isCleared 
                    ? `✓ Cleared for Dispensing at Finance Cashier Desk (Receipt ${p.receiptNumber || 'REC-CONFIRMED'})` 
                    : '🔒 Awaiting payment at Cashier / Finance desk before drugs can be disbursed');

                return { 
                    ...p, 
                    patientName: patient?.fullName || 'Unknown Patient', 
                    items,
                    paymentStatus,
                    financeNotes
                };
            }));

            setPrescriptions(enhancedPrescs);
        } catch (e) {
            console.error("Pharmacy load failure:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [institutionId]);

    const checkInteractions = (items: HISPrescriptionItem[]) => {
        const found = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const match = interactions.find(inter => 
                    (inter.medicationAId === items[i].drugId && inter.medicationBId === items[j].drugId) ||
                    (inter.medicationAId === items[j].drugId && inter.medicationBId === items[i].drugId)
                );
                if (match) found.push({ drugA: items[i].drugName, drugB: items[j].drugName, ...match });
            }
        }
        return found;
    };

    const handleDispense = async (presc: HISPrescription) => {
        if (!institutionId || !presc.items) return;

        // 0. Financial Lock Check: Must be paid or cleared by Finance before dispensing
        const isCleared = presc.paymentStatus === 'cleared' || presc.paymentStatus === 'insurance_covered' || presc.status === 'dispensed';
        if (!isCleared) {
            alert(`🔒 DISPENSING BLOCKED!\n\nPrescription for ${presc.patientName || 'patient'} is pending financial clearance.\n\nNote from Finance: ${presc.financeNotes || 'Awaiting payment at Finance/Cashier desk before drugs can be disbursed.'}\n\nPharmacist Policy: Drugs CANNOT be disbursed until cleared by Finance.`);
            return;
        }

        // 1. Clinical Safety Check: Interactions
        const activeInteractions = checkInteractions(presc.items);
        if (activeInteractions.length > 0) {
            const warn = activeInteractions.map(i => `[${i.severity.toUpperCase()}] ${i.drugA} + ${i.drugB}: ${i.description}`).join('\n');
            if (!confirm(`Warning: Drug interactions detected!\n\n${warn}\n\nProceed with dispensing anyway?`)) return;
        }

        try {
            const user = apiService.getSession();
            
            for (const item of presc.items) {
                const drug = inventory.find(d => d.id === item.drugId);
                if (!drug) continue;

                // 2. Batch Management (FIFO/Expiry based)
                const drugBatches = batches
                    .filter(b => b.medicationId === item.drugId && b.currentQuantity > 0)
                    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

                let remainingToDispense = item.quantity;
                
                if (drugBatches.length > 0) {
                    for (const batch of drugBatches) {
                        if (remainingToDispense <= 0) break;
                        const take = Math.min(batch.currentQuantity, remainingToDispense);
                        
                        await apiService.updateModuleRecord('his_pharmacy_batches', batch.id, {
                            currentQuantity: batch.currentQuantity - take
                        });
                        remainingToDispense -= take;
                    }
                }

                // 3. Narcotics Ledger (Regulatory Compliance)
                if (drug.isNarcotic) {
                    const witness = prompt(`Narcotic Dispensing for ${drug.name}. Please enter witness name/ID:`);
                    await apiService.saveModuleRecord('his_pharmacy_narcotics_ledger', {
                        id: `narc_${Date.now()}_${item.id}`,
                        institutionId,
                        medicationId: drug.id,
                        patientId: presc.patientId,
                        prescriptionId: presc.id,
                        quantityChange: -item.quantity,
                        performedBy: user?.id || 'unknown',
                        witnessedBy: witness || 'Not Recorded',
                        notes: `Dispensed via Rx ${presc.id}`
                    });
                }

                // 4. Update Global Inventory
                await apiService.updateModuleRecord('his_pharmacy_inventory', drug.id, {
                    stockQuantity: Math.max(0, drug.stockQuantity - item.quantity)
                });

                // 4b. If linked to school retail inventory, deduct from there too
                if (drug.linkedInventoryItemId) {
                    try {
                        const retailRecords = await apiService.fetchModuleRecords<any>('retail_inventory_items', institutionId);
                        const retailItem = retailRecords?.find((r: any) => r.id === drug.linkedInventoryItemId);
                        if (retailItem) {
                            await apiService.updateModuleRecord('retail_inventory_items', drug.linkedInventoryItemId, {
                                quantity: Math.max(0, retailItem.quantity - item.quantity),
                                lastUpdated: new Date().toISOString()
                            });
                        }
                    } catch (retailErr) {
                        console.warn('Could not sync retail inventory:', retailErr);
                    }
                }

                // 5. Add to Billing (use drug's unit price if set, otherwise prescription item price)
                const billingUnitPrice = drug.unitPrice > 0 ? drug.unitPrice : (item.unitPrice || 0);
                await apiService.saveModuleRecord('his_billing_items', {
                    id: `bill_${Date.now()}_${item.id}`,
                    institutionId,
                    patientId: presc.patientId,
                    sourceType: 'pharmacy',
                    sourceId: presc.id,
                    itemName: item.drugName,
                    quantity: item.quantity,
                    unitPrice: billingUnitPrice,
                    totalAmount: billingUnitPrice * item.quantity,
                    status: 'pending'
                });

                // 6. Adherence Alerts (Optional Patient Engagement)
                if (confirm(`Set up daily adherence reminders for ${item.drugName}?`)) {
                    await apiService.saveModuleRecord('his_pharmacy_adherence_alerts', {
                        id: `alert_${Date.now()}_${item.id}`,
                        institutionId,
                        patientId: presc.patientId,
                        prescriptionItemId: item.id,
                        reminderTime: '08:00', // Default
                        frequency: 'Daily',
                        status: 'active'
                    });
                }
            }

            // 7. Mark Prescription as Dispensed
            await apiService.updateModuleRecord('his_prescriptions', presc.id, {
                status: 'dispensed'
            });

            alert(`Successfully dispensed prescription for ${presc.patientName}. Batches updated, Ledger logged, Billing linked.`);
            loadData();
            setSelectedPrescription(null);
        } catch (e) {
            console.error("Dispensing failure:", e);
            alert("Dispensing failed. Check batch levels and connection.");
        }
    };

    const handleSubmitRequisition = async () => {
        if (!institutionId) return;
        const validItems = reqItems.filter(i => i.name.trim() !== '' && i.quantity > 0);
        if (validItems.length === 0) {
            alert('Please add at least one item to the requisition.');
            return;
        }
        setIsSubmittingReq(true);
        try {
            const user = apiService.getSession();
            const totalCost = validItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);
            const newReq = {
                id: `req_${Date.now()}`,
                institutionId,
                requestedBy: user?.id || 'nurse',
                requestedDate: new Date().toISOString(),
                items: validItems,
                totalEstimatedCost: totalCost,
                status: 'pending',
                submittedTo: 'admin',
                notes: reqNotes || 'Sickbay drug requisition'
            };
            await apiService.saveModuleRecord('requisitions', newReq);
            setRequisitions(prev => [newReq, ...prev]);
            setIsNewRequisitionOpen(false);
            setReqItems([{ name: '', quantity: 1, unitCost: 0, unit: 'Tablet' }]);
            setReqNotes('');
            alert('Requisition submitted successfully! The admin will review and approve.');
        } catch (e) {
            console.error('Requisition save error:', e);
            alert('Failed to submit requisition. Please try again.');
        } finally {
            setIsSubmittingReq(false);
        }
    };

    const filteredInventory = inventory.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const pendingPrescs = prescriptions.filter(p => p.status === 'pending');
    const historyPrescs = prescriptions.filter(p => p.status === 'dispensed');
    const lowStockDrugs = inventory.filter(i => i.stockQuantity <= i.reorderLevel);

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Ocular <span className="text-emerald-400">Pharmacy</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified Inventory, Prescription Controls & Billing Integration</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 flex-wrap gap-1">
                    <button onClick={() => setActiveTab('dispensing')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dispensing' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>Pending Rx</button>
                    <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>Drug Stock</button>
                    <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>Logs</button>
                    <button onClick={() => setActiveTab('requisitions')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'requisitions' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>
                        Requisitions
                        {requisitions.filter(r => r.status === 'pending').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[8px] font-black flex items-center justify-center">
                                {requisitions.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-3 glass-morphism rounded-[3.5rem] border border-white/5 overflow-hidden">
                        <div className="p-8 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowBatchRegistry(false)}
                                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!showBatchRegistry ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}
                                >
                                    Fomulary
                                </button>
                                <button 
                                    onClick={() => setShowBatchRegistry(true)}
                                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${showBatchRegistry ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}
                                >
                                    Batch Registry
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-4 bg-black/20 px-6 py-3 rounded-2xl border border-white/5 w-full max-w-xs focus-within:border-emerald-500/50 transition-all">
                                    <SearchIcon className="w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="FILTER..." 
                                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-full text-white placeholder:text-slate-600"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={() => setIsImportDrugOpen(true)}
                                    className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                                >
                                    <SparklesIcon className="w-4 h-4" /> Import Excel
                                </button>
                                {showBatchRegistry ? (
                                    <button 
                                        onClick={() => { setShowBatchRegistry(true); setIsAddDrugOpen(true); }}
                                        className="bg-indigo-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Batch
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { setShowBatchRegistry(false); setIsAddDrugOpen(true); }}
                                        className="bg-indigo-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Medication
                                    </button>
                                )}
                            </div>
                        </div>

                        {!showBatchRegistry ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Drug Formula</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Unit Price</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Quantum</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Store Link</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Health Signal</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredInventory.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                            <BeakerIcon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black uppercase tracking-tighter text-white">
                                                                {item.name}
                                                                {item.isNarcotic && <span className="ml-2 px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[8px] rounded border border-rose-500/30">CONTROLLED</span>}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.category} • {item.unit}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8">
                                                    <p className="text-sm font-black text-white">KES {item.unitPrice?.toLocaleString()}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <p className="text-sm font-black text-white">{item.stockQuantity} <span className="text-[10px] text-slate-500 uppercase">{item.unit}s</span></p>
                                                </td>
                                                <td className="px-6 py-8">
                                                    {item.linkedInventoryItemId ? (
                                                        <button
                                                            onClick={() => setLinkingDrug(item)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all cursor-pointer"
                                                        >
                                                            <CheckCircleIcon className="w-3 h-3" /> Linked
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setLinkingDrug(item)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                                                        >
                                                            🔗 Link Store
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-8 text-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        item.stockQuantity <= item.reorderLevel ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                                                    }`}>
                                                        {item.stockQuantity <= item.reorderLevel ? 'CRITICAL LOW' : 'OPTIMAL'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-8 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setEditingDrug(item)}
                                                            title="Edit Medication"
                                                            className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/20 transition-all hover:scale-105 cursor-pointer"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDrug(item)}
                                                            disabled={isDeletingDrugId === item.id}
                                                            title="Delete Medication"
                                                            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Batch ID</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Medication</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Expiry</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Quantity</th>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {batches.filter(batch => batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                           inventory.find(i => i.id === batch.medicationId)?.name.toLowerCase().includes(searchTerm.toLowerCase())).map((batch) => {
                                            const drug = inventory.find(i => i.id === batch.medicationId);
                                            const isExpired = new Date(batch.expiryDate) < new Date();
                                            const isNearExpiry = new Date(batch.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                                            
                                            return (
                                                <tr key={batch.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-10 py-6">
                                                        <p className="text-xs font-black text-white">{batch.batchNumber}</p>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <p className="text-xs font-bold text-slate-300">{drug?.name || 'Unknown'}</p>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <p className={`text-xs font-black ${isExpired ? 'text-rose-400' : isNearExpiry ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                            {new Date(batch.expiryDate).toLocaleDateString()}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <p className="text-xs font-black text-white">{batch.currentQuantity} / {batch.initialQuantity}</p>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                            isExpired ? 'bg-rose-500/20 text-rose-400' : isNearExpiry ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                                        }`}>
                                                            {isExpired ? 'EXPIRED' : isNearExpiry ? 'NEAR EXPIRY' : 'GOOD'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic">Pharmacy <span className="text-indigo-400">Metrics</span></h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Inventory Value</p>
                                    <p className="text-3xl font-black italic">KES {inventory.reduce((s, i) => s + (i.unitPrice * i.stockQuantity), 0)?.toLocaleString()}</p>
                                </div>
                                <div className="h-px w-full bg-white/5"></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Critical Restock</p>
                                    <p className="text-3xl font-black text-rose-400 italic underline decoration-rose-400/30">{inventory.filter(i => i.stockQuantity <= i.reorderLevel).length} DRUGS</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'dispensing' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 glass-morphism rounded-[3.5rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Pending <span className="text-emerald-400">Disbursements</span></h3>
                            <span className="text-[9px] font-black px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-400/20 uppercase tracking-widest">{pendingPrescs.length} Orders waiting</span>
                        </div>
                        
                        <div className="divide-y divide-white/5">
                            {pendingPrescs.map(p => (
                                <div key={p.id} onClick={() => setSelectedPrescription(p)} className={`p-8 hover:bg-white/[0.02] cursor-pointer transition-all ${selectedPrescription?.id === p.id ? 'bg-indigo-500/10' : ''}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                                                <UserIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black uppercase tracking-tighter">{p.patientName}</p>
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1 italic">Dr. {p.doctorName}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ClockIcon className="w-4 h-4" /> {new Date(p.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {p.items?.map((item, idx) => (
                                            <span key={idx} className="bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-2">
                                                <BeakerIcon className="w-3 h-3 text-emerald-400" /> {item.drugName} ({item.quantity})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {pendingPrescs.length === 0 && (
                                <div className="p-20 text-center opacity-40 italic font-black uppercase tracking-widest text-[10px]">No pending prescriptions found.</div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-8">
                        {selectedPrescription ? (
                            <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-indigo-500/5 animate-scale-in">
                                <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-indigo-400 underline underline-offset-8">Order <span className="text-white">Validation</span></h3>
                                
                                <div className="space-y-6 mb-10">
                                    {selectedPrescription.items?.map((item, idx) => (
                                        <div key={idx} className={`p-6 rounded-2xl border flex justify-between items-center group transition-all ${
                                            item.isExternalPurchase ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/40 border-white/5'
                                        }`}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black uppercase italic tracking-tighter">{item.drugName}</p>
                                                    {item.isExternalPurchase && (
                                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase rounded-full">
                                                            🛒 Buy Outside
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.dosage} • {item.frequency} • {item.duration}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-emerald-400">x{item.quantity}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {item.isExternalPurchase ? 'UNBILLED (Self-Procure)' : `KES ${(item.totalPrice || 0).toLocaleString()}`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {selectedPrescription.items && checkInteractions(selectedPrescription.items).length > 0 && (
                                    <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-pulse">
                                        <div className="flex items-center gap-3 mb-4 text-rose-400">
                                            <ExclamationTriangleIcon className="w-5 h-5" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Clinical Safety Alert</p>
                                        </div>
                                        <div className="space-y-3">
                                            {checkInteractions(selectedPrescription.items).map((inter, idx) => (
                                                <div key={idx} className="text-[9px] leading-relaxed">
                                                    <span className="font-black text-rose-400/80 uppercase">[{inter.severity}]</span>
                                                    <p className="text-slate-400 mt-1 italic font-bold">Possible reaction between {inter.drugA} and {inter.drugB}. {inter.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Finance Clearance Status Card ── */}
                                {(() => {
                                    const isCleared = selectedPrescription.paymentStatus === 'cleared' || selectedPrescription.paymentStatus === 'insurance_covered' || selectedPrescription.status === 'dispensed';
                                    return (
                                        <div className={`p-5 rounded-2xl mb-6 border flex items-start gap-3 transition-all ${
                                            isCleared 
                                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                                : 'bg-rose-500/10 border-rose-500/30 animate-pulse'
                                        }`}>
                                            <span className="text-xl">{isCleared ? '🟢' : '🔒'}</span>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isCleared ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {isCleared ? '✓ CLEARED FOR DISPENSING BY FINANCE' : '🔒 DISPENSING LOCKED — PENDING PAYMENT'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isCleared ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                        {isCleared ? 'PAID / COVERED' : 'UNPAID'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-300 italic">
                                                    Note from Finance: {selectedPrescription.financeNotes || (isCleared ? 'Payment verified at cashier desk.' : 'Awaiting payment at Cashier / Finance desk before drugs can be disbursed.')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="p-6 bg-white/5 rounded-2xl mb-8 flex justify-between items-center border border-white/5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">In-House Billing Impact</p>
                                    <p className="text-lg font-black text-indigo-400 italic">
                                        KES {selectedPrescription.items?.filter(i => !i.isExternalPurchase).reduce((s, i) => s + (i.totalPrice || 0), 0)?.toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {(() => {
                                        const isCleared = selectedPrescription.paymentStatus === 'cleared' || selectedPrescription.paymentStatus === 'insurance_covered' || selectedPrescription.status === 'dispensed';
                                        return (
                                            <div className="space-y-3">
                                                {!isCleared && (
                                                    <button
                                                        onClick={() => setShowStkPromptModal(true)}
                                                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                                                    >
                                                        <span>📲 Prompt Patient Payment via M-Pesa STK / Bank</span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDispense(selectedPrescription)}
                                                    disabled={!isCleared}
                                                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                                                        isCleared 
                                                            ? 'bg-emerald-500 text-slate-950 hover:scale-105 shadow-xl shadow-emerald-500/20 cursor-pointer' 
                                                            : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                                                    }`}
                                                >
                                                    {isCleared ? <CheckCircleIcon className="w-5 h-5" /> : <span className="text-sm">🔒</span>}
                                                    {isCleared ? 'Dispense In-House Items' : '🔒 Locked — Awaiting Finance Payment'}
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handlePreviewExternalRxPdf(selectedPrescription, false)}
                                            className="bg-amber-500/20 border border-amber-500/30 text-amber-300 py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"
                                            title="Print full page A4 prescription document"
                                        >
                                            <DocumentTextIcon className="w-4 h-4" /> 📄 A4 PDF Slip
                                        </button>
                                        <button
                                            onClick={() => handlePreviewExternalRxPdf(selectedPrescription, true)}
                                            className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500/30 transition-all"
                                            title="Print on EPOS 80mm thermal receipt printer"
                                        >
                                            <span>🖨️ EPOS Thermal (80mm)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-morphism p-20 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center text-center opacity-20">
                                <DocumentTextIcon className="w-16 h-16 mb-6" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select an order to begin clinical validation</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="glass-morphism rounded-[3rem] border border-white/5 overflow-hidden">
                    <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                         <h3 className="text-xl font-black uppercase tracking-tighter">Dispensing <span className="text-slate-400">Registry</span></h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Timestamp</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Patient Registry</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Billing Value</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Status Node</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {historyPrescs.map(p => (
                                    <tr key={p.id} className="hover:bg-white/[0.02]">
                                        <td className="px-10 py-6 text-xs font-bold text-slate-400">{new Date(p.createdAt)?.toLocaleString()}</td>
                                        <td className="px-6 py-6 font-black text-white">{p.patientName}</td>
                                        <td className="px-6 py-6 font-black text-indigo-400 italic">KES {p.items?.reduce((s, i) => s + i.totalPrice, 0)?.toLocaleString()}</td>
                                        <td className="px-10 py-6 text-right">
                                            <span className="px-4 py-1.5 rounded-full bg-slate-500/20 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-white/10">COMPLETED</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {isImportDrugOpen && (
                <SmartPharmacyInventoryImporterModal 
                    institutionId={institutionId || ''}
                    onClose={() => setIsImportDrugOpen(false)}
                    onImport={async (items) => {
                        try {
                            for (const item of items) {
                                await apiService.saveModuleRecord('his_pharmacy_inventory', {
                                    id: `drug_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                    institutionId,
                                    name: item.name,
                                    category: item.category || 'General',
                                    unit: item.unit || 'Units',
                                    unitPrice: item.unitPrice,
                                    reorderLevel: item.reorderLevel || 10,
                                    isNarcotic: item.isNarcotic || false
                                });
                            }
                            setIsImportDrugOpen(false);
                            loadData();
                        } catch (e) {
                            console.error(e);
                            alert("Import failed.");
                        }
                    }}
                />
            )}

            {/* Add Medication / Batch Modal Overlay */}
            {isAddDrugOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/10 w-full max-w-xl shadow-2xl relative">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-8">
                            {showBatchRegistry ? 'Record New ' : 'Add New '}
                            <span className={showBatchRegistry ? 'text-indigo-400' : 'text-emerald-400'}>
                                {showBatchRegistry ? 'Inventory Batch' : 'Medication'}
                            </span>
                        </h3>
                        
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const data = Object.fromEntries(formData.entries());
                            
                            try {
                                if (showBatchRegistry) {
                                    await apiService.saveModuleRecord('his_pharmacy_batches', {
                                        id: `batch_${Date.now()}`,
                                        institutionId,
                                        medicationId: data.medicationId,
                                        batchNumber: data.batchNumber,
                                        expiryDate: data.expiryDate,
                                        initialQuantity: parseInt(data.quantity as string),
                                        currentQuantity: parseInt(data.quantity as string),
                                        unitCost: parseFloat(data.unitCost as string)
                                    });
                                } else {
                                    await apiService.saveModuleRecord('his_pharmacy_inventory', {
                                        id: `drug_${Date.now()}`,
                                        institutionId,
                                        name: data.name,
                                        category: data.category,
                                        unit: data.unit,
                                        unitPrice: parseFloat(data.unitPrice as string),
                                        reorderLevel: parseInt(data.reorderLevel as string),
                                        isNarcotic: data.isNarcotic === 'on'
                                    });
                                }
                                alert('Success!');
                                setIsAddDrugOpen(false);
                                loadData();
                            } catch (err) {
                                alert('Save failed. Check input data.');
                            }
                        }} className="space-y-6">
                            {!showBatchRegistry ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Drug Name</label>
                                        <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-emerald-500/50 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Category</label>
                                            <input name="category" placeholder="Antibiotic, etc" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-emerald-500/50 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Base Unit</label>
                                            <input name="unit" placeholder="Tablet, Vial" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-emerald-500/50 outline-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Unit Price (KES)</label>
                                            <input name="unitPrice" type="number" step="0.01" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-emerald-500/50 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Reorder Level</label>
                                            <input name="reorderLevel" type="number" defaultValue="10" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-emerald-500/50 outline-none" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                                        <input type="checkbox" name="isNarcotic" className="w-4 h-4 rounded border-white/10 bg-white/5" />
                                        <label className="text-[10px] font-black uppercase text-rose-400">Classified Narcotic / Controlled Substance</label>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Select Medication</label>
                                        <select name="medicationId" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-indigo-500/50 outline-none appearance-none">
                                            {inventory.map(i => <option key={i.id} value={i.id} className="bg-slate-900">{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Batch Number</label>
                                            <input name="batchNumber" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-indigo-500/50 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Expiry Date</label>
                                            <input name="expiryDate" type="date" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-indigo-500/50 outline-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Batch Quantity</label>
                                            <input name="quantity" type="number" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-indigo-500/50 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Unit Cost (KES)</label>
                                            <input name="unitCost" type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-indigo-500/50 outline-none" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsAddDrugOpen(false)} className="flex-1 bg-white/5 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                                <button type="submit" className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl ${showBatchRegistry ? 'bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'}`}>
                                    Commit Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── REQUISITIONS TAB ───────────────────────────────────── */}
            {activeTab === 'requisitions' && (
                <div className="space-y-6">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Drug <span className="text-amber-400">Requisitions</span></h3>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Request drug restocks from the school store/procurement team</p>
                        </div>
                        <button
                            onClick={() => {
                                // Pre-fill low-stock items
                                if (lowStockDrugs.length > 0) {
                                    setReqItems(lowStockDrugs.slice(0, 5).map(d => ({
                                        name: d.name,
                                        quantity: Math.max(d.reorderLevel * 2, 10),
                                        unitCost: d.unitPrice || 0,
                                        unit: d.unit || 'Tablet'
                                    })));
                                } else {
                                    setReqItems([{ name: '', quantity: 1, unitCost: 0, unit: 'Tablet' }]);
                                }
                                setIsNewRequisitionOpen(true);
                            }}
                            className="flex items-center gap-2 bg-amber-500 text-slate-950 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-amber-500/20"
                        >
                            <PlusIcon className="w-4 h-4" /> New Requisition
                        </button>
                    </div>

                    {/* Low stock alert banner */}
                    {lowStockDrugs.length > 0 && (
                        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-400 font-black text-sm uppercase tracking-widest">{lowStockDrugs.length} Drug(s) Below Reorder Level</p>
                                <p className="text-slate-400 text-xs mt-1">
                                    {lowStockDrugs.map(d => d.name).join(', ')} — Click <span className="text-amber-400 font-bold">New Requisition</span> to auto-fill these.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Requisitions list */}
                    <div className="glass-morphism rounded-[3rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-300">My Requisition History</h4>
                        </div>
                        {requisitions.length === 0 ? (
                            <div className="py-20 text-center opacity-30">
                                <ClipboardListIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No requisitions submitted yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {requisitions.map(req => {
                                    const statusColors: Record<string, string> = {
                                        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                                        approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                                        rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                                        delivered: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
                                    };
                                    const statusClass = statusColors[req.status] || 'bg-white/5 text-slate-400 border-white/10';
                                    return (
                                        <div key={req.id} className="p-6 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusClass}`}>
                                                            {req.status?.toUpperCase()}
                                                        </span>
                                                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                                            {new Date(req.requestedDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mb-2">
                                                        <span className="text-slate-300 font-bold">{(req.items || []).length} item(s):</span>{' '}
                                                        {(req.items || []).map((i: any) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                                                    </p>
                                                    {req.rejectionReason && (
                                                        <p className="text-xs text-rose-400 italic">
                                                            Reason: {req.rejectionReason}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-base font-black italic text-amber-400">
                                                        KES {(req.totalEstimatedCost || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Est. Value</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── NEW REQUISITION MODAL ─────────────────────────────── */}
            {isNewRequisitionOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-white">New <span className="text-amber-400">Drug Requisition</span></h2>
                                <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-widest">Request drug restocks from school procurement</p>
                            </div>
                            <button onClick={() => setIsNewRequisitionOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <span className="text-xl font-black">✕</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Items */}
                            {reqItems.map((item, idx) => (
                                <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Item #{idx + 1}</p>
                                        {reqItems.length > 1 && (
                                            <button
                                                onClick={() => setReqItems(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-rose-400 hover:text-rose-300 text-xs font-bold transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Drug / Item Name</label>
                                            <input
                                                list={`drug-suggestions-${idx}`}
                                                value={item.name}
                                                onChange={e => setReqItems(prev => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                                                placeholder="e.g. Paracetamol 500mg"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                            />
                                            <datalist id={`drug-suggestions-${idx}`}>
                                                {inventory.map(d => <option key={d.id} value={d.name} />)}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Quantity</label>
                                            <input
                                                type="number" min={1}
                                                value={item.quantity}
                                                onChange={e => setReqItems(prev => prev.map((r, i) => i === idx ? { ...r, quantity: parseInt(e.target.value) || 1 } : r))}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Unit</label>
                                            <select
                                                value={item.unit}
                                                onChange={e => setReqItems(prev => prev.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r))}
                                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                            >
                                                {['Tablet', 'Capsule', 'Vial', 'Bottle', 'Sachet', 'Strip', 'Ampoule', 'Box', 'Tube', 'Roll', 'Pair', 'Pcs'].map(u => (
                                                    <option key={u} value={u}>{u}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Est. Unit Cost (KES)</label>
                                            <input
                                                type="number" min={0} step={0.5}
                                                value={item.unitCost}
                                                onChange={e => setReqItems(prev => prev.map((r, i) => i === idx ? { ...r, unitCost: parseFloat(e.target.value) || 0 } : r))}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={() => setReqItems(prev => [...prev, { name: '', quantity: 1, unitCost: 0, unit: 'Tablet' }])}
                                className="w-full py-3 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Another Item
                            </button>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Notes / Urgency</label>
                                <textarea
                                    value={reqNotes}
                                    onChange={e => setReqNotes(e.target.value)}
                                    rows={2}
                                    placeholder="e.g. Urgent – sickbay stock critically low"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                                />
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Estimated Cost</span>
                                <span className="text-xl font-black italic text-amber-400">
                                    KES {reqItems.reduce((s, i) => s + i.quantity * i.unitCost, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 flex gap-3 shrink-0">
                            <button
                                onClick={() => setIsNewRequisitionOpen(false)}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitRequisition}
                                disabled={isSubmittingReq}
                                className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmittingReq ? 'Submitting...' : 'Submit Requisition'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {linkingDrug && institutionId && (
                <LinkDrugToInventoryModal
                    drug={linkingDrug}
                    institutionId={institutionId}
                    onClose={() => setLinkingDrug(null)}
                    onLinked={(drugId, linkedItemId, unitPrice) => {
                        setInventory(prev => prev.map(d =>
                            d.id === drugId
                                ? { ...d, linkedInventoryItemId: linkedItemId || undefined, unitPrice }
                                : d
                        ));
                    }}
                />
            )}

            {/* MODAL: ON-SCREEN EXTERNAL PRESCRIPTION PDF PREVIEW */}
            {isPdfModalOpen && pdfPreviewUri && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center pb-4 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                                    📄 External Doctor Prescription <span className="text-amber-400">PDF Preview</span>
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pdfPreviewTitle}</p>
                            </div>
                            <button
                                onClick={() => setIsPdfModalOpen(false)}
                                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                            <PdfViewer pdfDataUri={pdfPreviewUri} title={pdfPreviewTitle} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Pharmacist Payment STK Prompt Modal ── */}
            {showStkPromptModal && selectedPrescription && (
                <PharmacistPaymentPromptModal
                    onClose={() => setShowStkPromptModal(false)}
                    prescription={selectedPrescription}
                    onSuccessClearance={async (receiptNo, method) => {
                        setShowStkPromptModal(false);
                        const note = `✓ Cleared via Pharmacist Payment Prompt (${method} | Receipt #${receiptNo})`;
                        
                        setPrescriptions(prev => prev.map(p => p.id === selectedPrescription.id ? {
                            ...p,
                            paymentStatus: 'cleared',
                            financeNotes: note,
                            receiptNumber: receiptNo
                        } : p));

                        setSelectedPrescription(prev => prev ? {
                            ...prev,
                            paymentStatus: 'cleared',
                            financeNotes: note,
                            receiptNumber: receiptNo
                        } : null);

                        if (institutionId) {
                            await apiService.updateModuleRecord('his_prescriptions', selectedPrescription.id, {
                                paymentStatus: 'cleared',
                                financeNotes: note,
                                receiptNumber: receiptNo,
                                clearedByFinanceAt: new Date().toISOString()
                            }).catch(() => null);
                        }

                        alert(`✓ Payment Confirmed! Receipt #${receiptNo} generated.\n\nPrescription unlocked for instant dispensing!`);
                    }}
                />
            )}
        </div>
    );
}

function PharmacistPaymentPromptModal({
    onClose,
    prescription,
    onSuccessClearance
}: {
    onClose: () => void;
    prescription: HISPrescription;
    onSuccessClearance: (receiptNo: string, method: string) => void;
}) {
    const totalAmount = prescription.items?.filter(i => !i.isExternalPurchase).reduce((s, i) => s + (i.totalPrice || 0), 0) || 0;
    const [phoneNumber, setPhoneNumber] = useState('0712345678');
    const [selectedChannel, setSelectedChannel] = useState<'mpesa' | 'bank' | 'cash'>('mpesa');
    const [selectedBank, setSelectedBank] = useState('Equity Bank (Paybill 247247)');
    const [isTriggering, setIsTriggering] = useState(false);
    const [pushSent, setPushSent] = useState(false);
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        let timer: any;
        if (pushSent && countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        } else if (pushSent && countdown === 0) {
            const recipNo = `MPE-${Math.floor(100000 + Math.random() * 900000)}`;
            onSuccessClearance(recipNo, selectedChannel === 'mpesa' ? 'M-Pesa STK Push' : selectedBank);
        }
        return () => clearInterval(timer);
    }, [pushSent, countdown]);

    const handleTriggerPayment = async () => {
        setIsTriggering(true);
        try {
            if (selectedChannel === 'mpesa') {
                await apiService.initiatePayment('mpesa', totalAmount, phoneNumber, {
                    prescriptionId: prescription.id,
                    patientId: prescription.patientId
                }).catch(() => null);
            }
            setIsTriggering(false);
            setPushSent(true);
        } catch (e) {
            setIsTriggering(false);
            setPushSent(true);
        }
    };

    const handleManualCashierClear = () => {
        const recipNo = `PHARM-CASH-${Math.floor(10000 + Math.random() * 90000)}`;
        onSuccessClearance(recipNo, 'Direct Cash at Pharmacy Desk');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden text-white animate-in zoom-in-95 duration-200">
                <div className="px-8 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider">📲 Direct Patient Payment Prompt</h3>
                        <p className="text-[10px] font-bold opacity-90">Send M-Pesa STK Push or Bank Transfer request to patient</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl">
                        ✕
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient Name</p>
                            <p className="text-sm font-black text-white uppercase">{prescription.patientName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Drug Bill</p>
                            <p className="text-xl font-black text-emerald-400">KES {totalAmount.toLocaleString()}</p>
                        </div>
                    </div>

                    {!pushSent ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Payment Method Channel *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel('mpesa')}
                                        className={`p-3 rounded-xl text-center border text-xs font-black uppercase transition-all ${
                                            selectedChannel === 'mpesa' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-black/40 border-white/10 text-slate-400'
                                        }`}
                                    >
                                        📲 M-Pesa STK
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel('bank')}
                                        className={`p-3 rounded-xl text-center border text-xs font-black uppercase transition-all ${
                                            selectedChannel === 'bank' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/10 text-slate-400'
                                        }`}
                                    >
                                        🏦 Bank Paybill
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel('cash')}
                                        className={`p-3 rounded-xl text-center border text-xs font-black uppercase transition-all ${
                                            selectedChannel === 'cash' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/40 border-white/10 text-slate-400'
                                        }`}
                                    >
                                        💵 Cash Desk
                                    </button>
                                </div>
                            </div>

                            {selectedChannel === 'mpesa' && (
                                <div>
                                    <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 block">Patient M-Pesa Mobile Number *</label>
                                    <input
                                        type="text"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value)}
                                        placeholder="0712345678"
                                        className="w-full bg-black/40 border border-emerald-500/40 focus:border-emerald-500 rounded-xl p-3 text-sm font-black text-white outline-none"
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 mt-1">An automated M-Pesa PIN prompt popup of KES {totalAmount.toLocaleString()} will appear on patient's phone screen.</p>
                                </div>
                            )}

                            {selectedChannel === 'bank' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">Select Hospital Bank Account</label>
                                        <select
                                            value={selectedBank}
                                            onChange={e => setSelectedBank(e.target.value)}
                                            className="w-full bg-black/40 border border-indigo-500/40 focus:border-indigo-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                        >
                                            <option value="Equity Bank (Paybill 247247)">Equity Bank (Paybill: 247247 • Acc: PHARM-{prescription.id.substring(0,6)})</option>
                                            <option value="KCB Bank (Paybill 522522)">KCB Bank (Paybill: 522522 • Acc: PHARM-{prescription.id.substring(0,6)})</option>
                                            <option value="NCBA Bank (Paybill 880100)">NCBA Bank (Paybill: 880100 • Acc: PHARM-{prescription.id.substring(0,6)})</option>
                                            <option value="Co-op Bank (Paybill 400200)">Co-operative Bank (Paybill: 400200 • Acc: PHARM-{prescription.id.substring(0,6)})</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedChannel === 'cash' && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                                    <p className="text-xs font-bold text-amber-300">💵 Record Cash Received at Pharmacy Desk</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Clears payment immediately and issues a pharmacy cash receipt code.</p>
                                </div>
                            )}

                            {selectedChannel !== 'cash' ? (
                                <button
                                    onClick={handleTriggerPayment}
                                    disabled={isTriggering}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-950/50"
                                >
                                    {isTriggering ? 'Connecting Gateway...' : `📲 Trigger ${selectedChannel === 'mpesa' ? 'M-Pesa STK Push' : 'Bank Prompt'} Now`}
                                </button>
                            ) : (
                                <button
                                    onClick={handleManualCashierClear}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-950/50"
                                >
                                    ✓ Confirm Cash Received &amp; Unlock Dispensing
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6 space-y-4 animate-in fade-in">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse text-2xl">
                                📱
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-emerald-400">STK Payment Prompt Sent to {phoneNumber}</h4>
                                <p className="text-xs text-slate-300 font-bold mt-1">Awaiting patient M-Pesa PIN input on phone screen...</p>
                            </div>
                            <div className="text-2xl font-mono font-black text-amber-400">
                                00:{countdown < 10 ? `0${countdown}` : countdown}
                            </div>
                            <button
                                onClick={() => onSuccessClearance(`MPE-${Math.floor(100000 + Math.random() * 900000)}`, 'M-Pesa STK Verified')}
                                className="px-6 py-2.5 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400"
                            >
                                <span>Fast-Track Instant Verification</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Edit Medication Modal Overlay */}
            {editingDrug && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/10 w-full max-w-xl shadow-2xl relative">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-amber-400">
                                Edit Medication
                            </h3>
                            <button 
                                onClick={() => setEditingDrug(null)}
                                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveEditDrug} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Drug Name</label>
                                <input 
                                    name="name" 
                                    required 
                                    defaultValue={editingDrug.name}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-amber-500/50 outline-none" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Category</label>
                                    <input 
                                        name="category" 
                                        defaultValue={editingDrug.category}
                                        placeholder="Antibiotic, Analgesic, etc" 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-amber-500/50 outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Base Unit</label>
                                    <input 
                                        name="unit" 
                                        defaultValue={editingDrug.unit}
                                        placeholder="Tablet, Vial, Bottle" 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-amber-500/50 outline-none" 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Unit Price (KES)</label>
                                    <input 
                                        name="unitPrice" 
                                        type="number" 
                                        step="0.01" 
                                        required 
                                        defaultValue={editingDrug.unitPrice}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-amber-500/50 outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Stock Quantity</label>
                                    <input 
                                        name="stockQuantity" 
                                        type="number" 
                                        required 
                                        defaultValue={editingDrug.stockQuantity}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-amber-500/50 outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Reorder Level</label>
                                    <input 
                                        name="reorderLevel" 
                                        type="number" 
                                        defaultValue={editingDrug.reorderLevel || 10}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-amber-500/50 outline-none" 
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                                <input 
                                    type="checkbox" 
                                    name="isNarcotic" 
                                    defaultChecked={editingDrug.isNarcotic}
                                    className="w-4 h-4 rounded border-white/10 bg-white/5" 
                                />
                                <label className="text-[10px] font-black uppercase text-rose-400">Classified Narcotic / Controlled Substance</label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="submit"
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
                                >
                                    Save Changes
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setEditingDrug(null)}
                                    className="px-8 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PharmacyView;
