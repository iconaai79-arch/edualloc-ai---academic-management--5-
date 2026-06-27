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

import { 
    HISPharmacyInventory, 
    HISPharmacyBatch, 
    HISPharmacyInteraction, 
    HISPharmacyNarcoticsLedger, 
    HISPharmacyAdherenceAlert,
    HISPrescription,
    HISPrescriptionItem
} from '../../types';

export const PharmacyView: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
    const [activeTab, setActiveTab] = useState<'dispensing' | 'inventory' | 'history'>('dispensing');
    const [inventory, setInventory] = useState<HISPharmacyInventory[]>([]);
    const [batches, setBatches] = useState<HISPharmacyBatch[]>([]);
    const [interactions, setInteractions] = useState<HISPharmacyInteraction[]>([]);
    const [prescriptions, setPrescriptions] = useState<HISPrescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDrugOpen, setIsAddDrugOpen] = useState(false);
    const [showBatchRegistry, setShowBatchRegistry] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState<HISPrescription | null>(null);
    const [linkingDrug, setLinkingDrug] = useState<HISPharmacyInventory | null>(null);

    const loadData = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const [inv, batchRecords, intercs, prescs, patients] = await Promise.all([
                apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_batches', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_interactions', institutionId),
                apiService.fetchModuleRecords('his_prescriptions', institutionId, undefined, { order: 'created_at.desc' }),
                apiService.fetchModuleRecords('his_patients', institutionId)
            ]);

            setInventory(inv || []);
            setBatches(batchRecords || []);
            setInteractions(intercs || []);
            
            // Link prescription to patient name and items
            const enhancedPrescs = await Promise.all((prescs || []).map(async (p: any) => {
                const patient = (patients || []).find((pat: any) => pat.id === p.patientId);
                const items = await apiService.fetchModuleRecords('his_prescription_items', undefined, undefined, { filter: { prescription_id: p.id } });
                return { ...p, patientName: patient?.fullName || 'Unknown Patient', items };
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

    const filteredInventory = inventory.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const pendingPrescs = prescriptions.filter(p => p.status === 'pending');
    const historyPrescs = prescriptions.filter(p => p.status === 'dispensed');

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Ocular <span className="text-emerald-400">Pharmacy</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified Inventory, Prescription Controls & Billing Integration</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button onClick={() => setActiveTab('dispensing')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dispensing' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>Pending Rx</button>
                    <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>Drug Stock</button>
                    <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}>Logs</button>
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
                                {showBatchRegistry && (
                                    <button 
                                        onClick={() => setIsAddDrugOpen(true)} // Reusing or could add dedicated
                                        className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Batch
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
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Health Signal</th>
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
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                                        >
                                                            <CheckCircleIcon className="w-3 h-3" /> Linked
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setLinkingDrug(item)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                                        >
                                                            🔗 Link Store
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        item.stockQuantity <= item.reorderLevel ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                                                    }`}>
                                                        {item.stockQuantity <= item.reorderLevel ? 'CRITICAL LOW' : 'OPTIMAL'}
                                                    </span>
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
                                        <div key={idx} className="p-6 bg-black/40 rounded-2xl border border-white/5 flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-black uppercase italic tracking-tighter">{item.drugName}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.dosage} • {item.frequency} • {item.duration}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-emerald-400">x{item.quantity}</p>
                                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">KES {item.totalPrice?.toLocaleString()}</p>
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

                                <div className="p-6 bg-white/5 rounded-2xl mb-8 flex justify-between items-center border border-white/5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Billing Impact</p>
                                    <p className="text-lg font-black text-indigo-400 italic">KES {selectedPrescription.items?.reduce((s, i) => s + i.totalPrice, 0)?.toLocaleString()}</p>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => handleDispense(selectedPrescription)}
                                        className="flex-1 bg-emerald-500 text-slate-950 py-5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" /> Dispense Entry
                                    </button>
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

            {/* Link Drug to School Inventory Modal */}
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
        </div>
    );
};
