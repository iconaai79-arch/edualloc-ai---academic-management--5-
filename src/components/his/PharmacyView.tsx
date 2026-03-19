import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArchiveBoxIcon, 
    PlusIcon, 
    SparklesIcon, 
    SearchIcon, 
    CheckCircleIcon, 
    ClipboardListIcon,
    CurrencyIcon,
    ExclamationTriangleIcon,
    BeakerIcon,
    PencilIcon,
    DocumentTextIcon,
    ClockIcon,
    UserIcon
} from '../icons/index';
import { apiService } from '../../services/apiService';

interface DrugItem {
    id: string;
    name: string;
    category: string;
    unit: string;
    unitPrice: number;
    stockQuantity: number;
    reorderLevel: number;
}

interface PrescriptionItem {
    id: string;
    prescriptionId: string;
    drugId: string;
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface Prescription {
    id: string;
    patientId: string;
    doctorName: string;
    status: 'pending' | 'dispensed' | 'cancelled';
    notes?: string;
    createdAt: string;
    items?: PrescriptionItem[];
    patientName?: string;
}

export const PharmacyView: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
    const [activeTab, setActiveTab] = useState<'dispensing' | 'inventory' | 'history'>('dispensing');
    const [inventory, setInventory] = useState<DrugItem[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDrugOpen, setIsAddDrugOpen] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

    const loadData = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const [inv, prescs, patients] = await Promise.all([
                apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId),
                apiService.fetchModuleRecords('his_prescriptions', institutionId, undefined, { order: 'created_at.desc' }),
                apiService.fetchModuleRecords('his_patients', institutionId)
            ]);

            setInventory(inv || []);
            
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

    const handleDispense = async (presc: Prescription) => {
        if (!institutionId || !presc.items) return;
        try {
            for (const item of presc.items) {
                // 1. Reduce Inventory
                const drug = inventory.find(d => d.id === item.drugId);
                if (drug) {
                    await apiService.saveModuleRecord('his_pharmacy_inventory', {
                        id: drug.id,
                        stockQuantity: Math.max(0, drug.stockQuantity - item.quantity)
                    });
                }

                // 2. Add to Billing
                await apiService.saveModuleRecord('his_billing_items', {
                    id: `bill_${Date.now()}_${item.id}`,
                    institutionId,
                    patientId: presc.patientId,
                    sourceType: 'pharmacy',
                    sourceId: presc.id,
                    itemName: item.drugName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalAmount: item.totalPrice,
                    status: 'pending'
                });
            }

            // 3. Mark Prescription as Dispensed
            await apiService.saveModuleRecord('his_prescriptions', {
                id: presc.id,
                status: 'dispensed'
            });

            alert(`Successfully dispensed prescription for ${presc.patientName}. Items linked to billing.`);
            loadData();
            setSelectedPrescription(null);
        } catch (e) {
            alert("Dispensing failed. Check inventory levels and connection.");
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
                            <div className="flex items-center gap-4 bg-black/20 px-6 py-3 rounded-2xl border border-white/5 w-full max-w-md focus-within:border-emerald-500/50 transition-all">
                                <SearchIcon className="w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH PHARMACOPOEIA ENTRIES..." 
                                    className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-full text-white placeholder:text-slate-600"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => setIsAddDrugOpen(true)}
                                className="bg-emerald-500 text-slate-950 p-4 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Inventory
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Drug Formula</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Unit Price</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Quantum</th>
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
                                                        <p className="text-sm font-black uppercase tracking-tighter text-white">{item.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.category} • {item.unit}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <p className="text-sm font-black text-white">KES {item.unitPrice.toLocaleString()}</p>
                                            </td>
                                            <td className="px-10 py-8">
                                                <p className="text-sm font-black text-white">{item.stockQuantity} <span className="text-[10px] text-slate-500 uppercase">{item.unit}s</span></p>
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
                    </div>

                    <div className="space-y-8">
                        <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic">Pharmacy <span className="text-indigo-400">Metrics</span></h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Inventory Value</p>
                                    <p className="text-3xl font-black italic">KES {inventory.reduce((s, i) => s + (i.unitPrice * i.stockQuantity), 0).toLocaleString()}</p>
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
                                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">KES {item.totalPrice.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6 bg-white/5 rounded-2xl mb-8 flex justify-between items-center border border-white/5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Billing Impact</p>
                                    <p className="text-lg font-black text-indigo-400 italic">KES {selectedPrescription.items?.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()}</p>
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
                                        <td className="px-10 py-6 text-xs font-bold text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-6 font-black text-white">{p.patientName}</td>
                                        <td className="px-6 py-6 font-black text-indigo-400 italic">KES {p.items?.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()}</td>
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
        </div>
    );
};
