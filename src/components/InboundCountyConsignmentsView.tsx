import React, { useState, useEffect, useMemo } from 'react';
import { Truck, CheckCircle, Clock, Package, MapPin, Phone, User as UserIcon, Calendar, FileText, ArrowRight, ShieldCheck, Printer, RefreshCw, AlertTriangle, Building, Search, Filter, Check, Eye, Plus, Send, X } from 'lucide-react';
import { CountyDispatchManifest, CountyDispatchDropItem, RetailStore, Institution, User, RetailInventoryItem, CountySchoolRequisition } from '../types';
import { apiService } from '../services/apiService';

interface InboundCountyConsignmentsViewProps {
    institutionId: string;
    currentInstitution?: Institution;
    stores?: RetailStore[];
    currentUser?: User;
    onRefreshStock?: () => void;
}

export const InboundCountyConsignmentsView: React.FC<InboundCountyConsignmentsViewProps> = ({
    institutionId,
    currentInstitution,
    stores = [],
    currentUser,
    onRefreshStock
}) => {
    const [viewSubTab, setViewSubTab] = useState<'deliveries' | 'requisitions'>('deliveries');
    const [manifests, setManifests] = useState<CountyDispatchManifest[]>([]);
    const [schoolRequisitions, setSchoolRequisitions] = useState<CountySchoolRequisition[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'received'>('all');
    
    // Modal states
    const [verifyingManifest, setVerifyingManifest] = useState<CountyDispatchManifest | null>(null);
    const [verifyingDropItem, setVerifyingDropItem] = useState<CountyDispatchDropItem | null>(null);
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [receivedQty, setReceivedQty] = useState<number>(0);
    const [receiverName, setReceiverName] = useState<string>(currentUser?.name || 'Stores Master');
    const [receiverPhone, setReceiverPhone] = useState<string>(currentUser?.phoneNumber || '');
    const [receiverNotes, setReceiverNotes] = useState<string>('Goods verified and accepted in good order.');
    const [isStockingIn, setIsStockingIn] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // New Requisition Modal State
    const [showRequisitionModal, setShowRequisitionModal] = useState<boolean>(false);
    const [reqCategory, setReqCategory] = useState<string>('CBC & Lab Equipment');
    const [reqPriority, setReqPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
    const [reqUrgencyReason, setReqUrgencyReason] = useState<string>('');
    const [reqItems, setReqItems] = useState<{ name: string; quantity: number; unit: string; notes: string }[]>([
        { name: '', quantity: 10, unit: 'Kits', notes: '' }
    ]);
    const [isSubmittingReq, setIsSubmittingReq] = useState<boolean>(false);

    // Certificate / Handover Print Modal
    const [certificateData, setCertificateData] = useState<{
        manifest: CountyDispatchManifest;
        drop: CountyDispatchDropItem;
        receivedDate: string;
        receiver: string;
        storeName: string;
    } | null>(null);

    // Load and filter manifests & requisitions for this institution
    const loadData = async () => {
        setIsLoading(true);
        try {
            // 1. Load Manifests
            let loadedManifests: CountyDispatchManifest[] = [];
            const remoteRecords = await apiService.fetchModuleRecords<CountyDispatchManifest>('county_dispatch_manifests')
                .catch(() => null);
            
            if (remoteRecords && Array.isArray(remoteRecords) && remoteRecords.length > 0) {
                loadedManifests = remoteRecords;
            } else {
                const localStr = localStorage.getItem('county_dispatch_manifests_v1');
                if (localStr) {
                    try {
                        loadedManifests = JSON.parse(localStr);
                    } catch (e) {
                        console.warn("Could not parse local manifests:", e);
                    }
                }
            }

            if (!loadedManifests || loadedManifests.length === 0) {
                loadedManifests = [
                    {
                        id: 'MNF-001',
                        countyId: '047',
                        manifestNumber: 'MNF-047-TRK01',
                        dispatchDate: new Date(Date.now() - 3600000 * 3).toISOString(),
                        vehicleReg: '47 CG 018 B',
                        vehicleType: 'Isuzu FRR 10-Tonne Logistics Truck',
                        driverName: 'Corporal David Ochieng',
                        driverPhone: '+254711889900',
                        departureDepot: 'Central County HQ Logistics Warehouse',
                        routeDescription: 'Central Depot → Sub-County Logistics Corridor',
                        deliveryMethod: 'driver',
                        status: 'in_transit',
                        totalUnits: 450,
                        totalDrops: 3,
                        notes: 'CBC Term 2 Science lab equipment, student textbooks, and ECDE nutritional porridge flour',
                        items: [
                            {
                                id: 'drop-1',
                                name: 'Grade 7 CBC Integrated Science Lab Kits',
                                category: 'Education & CBC',
                                quantity: 120,
                                unit: 'Kits',
                                targetInstitutionId: institutionId,
                                targetInstitutionName: currentInstitution?.name || 'Institutional Store',
                                recipientName: 'Head of Science Dept',
                                recipientPhone: '+254722114455',
                                notes: 'Handover directly to school stores master or science lab technician',
                                status: 'in_transit'
                            },
                            {
                                id: 'drop-2',
                                name: 'ECDE Nutritional Fortified Porridge Flour',
                                category: 'ECDE & Nutrition',
                                quantity: 250,
                                unit: 'Bags (25kg)',
                                targetInstitutionId: institutionId,
                                targetInstitutionName: currentInstitution?.name || 'Institutional Store',
                                recipientName: 'ECDE Coordinator',
                                recipientPhone: '+254733221100',
                                notes: 'Store in dry moisture-free food storage granary',
                                status: 'in_transit'
                            }
                        ]
                    },
                    {
                        id: 'MNF-002',
                        manifestNumber: 'MNF-047-VAN04',
                        countyId: '047',
                        dispatchDate: new Date(Date.now() - 86400000 * 2).toISOString(),
                        vehicleReg: '47 CG 005 D',
                        vehicleType: 'Toyota Land Cruiser Logistics Carrier',
                        driverName: 'Senior Driver Samuel Mwangi',
                        driverPhone: '+254720998877',
                        departureDepot: 'Regional Supply Depot A',
                        routeDescription: 'Supply Depot → Primary Schools Circuit',
                        deliveryMethod: 'driver',
                        status: 'completed',
                        totalUnits: 80,
                        totalDrops: 1,
                        notes: 'Ministry approved CBC Grade 8 Atlas and Supplementary Mathematics Manuals',
                        items: [
                            {
                                id: 'drop-3',
                                name: 'Grade 8 Social Studies Atlases & CBC Manuals',
                                category: 'Textbooks & Stationery',
                                quantity: 80,
                                unit: 'Cartons',
                                targetInstitutionId: institutionId,
                                targetInstitutionName: currentInstitution?.name || 'Institutional Store',
                                recipientName: 'School Librarian',
                                recipientPhone: '+254711223344',
                                status: 'received',
                                receivedDate: new Date(Date.now() - 86400000).toISOString(),
                                receivedBy: 'Grace Muthoni (Head Teacher)'
                            }
                        ]
                    }
                ];
                localStorage.setItem('county_dispatch_manifests_v1', JSON.stringify(loadedManifests));
            }
            setManifests(loadedManifests);

            // 2. Load School Requisitions
            let loadedReqs: CountySchoolRequisition[] = [];
            const remoteReqs = await apiService.fetchModuleRecords<CountySchoolRequisition>('county_school_requisitions', institutionId)
                .catch(() => null);
            if (remoteReqs && Array.isArray(remoteReqs) && remoteReqs.length > 0) {
                loadedReqs = remoteReqs;
            } else {
                const localReqStr = localStorage.getItem('county_school_requisitions_v1');
                if (localReqStr) {
                    try {
                        const allReqs = JSON.parse(localReqStr);
                        loadedReqs = allReqs.filter((r: any) => r.institutionId === institutionId || r.institution_id === institutionId);
                    } catch (e) {
                        console.warn("Could not parse local requisitions:", e);
                    }
                }
            }

            if (!loadedReqs || loadedReqs.length === 0) {
                loadedReqs = [
                    {
                        id: 'REQ-SCH-001',
                        countyId: '047',
                        institutionId,
                        institutionName: currentInstitution?.name || 'My School',
                        requisitionNumber: 'REQ-2026-089',
                        requestedDate: new Date(Date.now() - 86400000 * 4).toISOString(),
                        requestedBy: currentUser?.name || 'Principal',
                        requestedByRole: 'Head of Institution',
                        requestedByPhone: currentUser?.phoneNumber || '+254711002233',
                        priority: 'urgent',
                        category: 'ECDE & Nutrition',
                        urgencyReason: 'Term 2 ECDE learner population increased by 65 students. Current porridge flour stock depleting next week.',
                        status: 'approved',
                        approvedBy: 'County Director of Early Childhood Education',
                        approvedDate: new Date(Date.now() - 86400000 * 2).toISOString(),
                        allocatedManifestNumber: 'MNF-047-TRK01',
                        items: [
                            { id: 'item-1', name: 'Fortified Nutritional Porridge Flour', quantity: 250, unit: 'Bags (25kg)', notes: 'Fortified with Vitamin A & Iron' },
                            { id: 'item-2', name: 'Sugar Granules (50kg)', quantity: 15, unit: 'Bags', notes: 'For student feeding' }
                        ]
                    }
                ];
                localStorage.setItem('county_school_requisitions_v1', JSON.stringify(loadedReqs));
            }
            setSchoolRequisitions(loadedReqs);

        } catch (err) {
            console.error("Error loading county pipeline data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [institutionId]);

    // Set default store when modal opens
    useEffect(() => {
        if (stores && stores.length > 0 && !selectedStoreId) {
            setSelectedStoreId(stores[0].id);
        }
    }, [stores, selectedStoreId]);

    // Filter relevant drops for this institution
    const relevantConsignments = useMemo(() => {
        const instNameLower = (currentInstitution?.name || '').toLowerCase();
        
        return manifests.filter(m => {
            if (!m.items || !Array.isArray(m.items)) return false;
            return m.items.some(item => {
                const matchId = item.targetInstitutionId === institutionId || item.targetInstitutionId === 'all';
                const matchName = instNameLower && item.targetInstitutionName?.toLowerCase().includes(instNameLower);
                return matchId || matchName;
            });
        }).map(m => {
            const relevantItems = m.items.filter(item => {
                const matchId = item.targetInstitutionId === institutionId || item.targetInstitutionId === 'all';
                const matchName = instNameLower && item.targetInstitutionName?.toLowerCase().includes(instNameLower);
                return matchId || matchName;
            });
            return {
                ...m,
                schoolDrops: relevantItems
            };
        });
    }, [manifests, institutionId, currentInstitution]);

    // Apply search and status filters
    const filteredConsignments = useMemo(() => {
        return relevantConsignments.filter(c => {
            if (statusFilter === 'in_transit') {
                const hasPending = c.schoolDrops.some(d => d.status !== 'received');
                if (!hasPending) return false;
            } else if (statusFilter === 'received') {
                const allReceived = c.schoolDrops.every(d => d.status === 'received');
                if (!allReceived) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchManifest = c.manifestNumber.toLowerCase().includes(q) ||
                    c.vehicleReg.toLowerCase().includes(q) ||
                    c.driverName.toLowerCase().includes(q) ||
                    c.departureDepot?.toLowerCase().includes(q);
                const matchItem = c.schoolDrops.some(d => 
                    d.name.toLowerCase().includes(q) || 
                    d.category?.toLowerCase().includes(q)
                );
                if (!matchManifest && !matchItem) return false;
            }

            return true;
        });
    }, [relevantConsignments, statusFilter, searchQuery]);

    // Statistics
    const stats = useMemo(() => {
        let pendingDropsCount = 0;
        let pendingUnitsCount = 0;
        let receivedDropsCount = 0;
        let activeTrucks = new Set<string>();

        relevantConsignments.forEach(c => {
            c.schoolDrops.forEach(d => {
                if (d.status === 'received') {
                    receivedDropsCount++;
                } else {
                    pendingDropsCount++;
                    pendingUnitsCount += Number(d.quantity || 0);
                    if (c.vehicleReg) activeTrucks.add(c.vehicleReg);
                }
            });
        });

        return {
            pendingDrops: pendingDropsCount,
            pendingUnits: pendingUnitsCount,
            receivedDrops: receivedDropsCount,
            activeTrucksCount: activeTrucks.size,
            totalReqs: schoolRequisitions.length,
            pendingReqs: schoolRequisitions.filter(r => r.status === 'pending').length
        };
    }, [relevantConsignments, schoolRequisitions]);

    // Open Verification Modal
    const handleOpenVerification = (manifest: CountyDispatchManifest, drop: CountyDispatchDropItem) => {
        setVerifyingManifest(manifest);
        setVerifyingDropItem(drop);
        setReceivedQty(drop.quantity);
        setReceiverName(currentUser?.name || 'Stores Master');
        setReceiverPhone(currentUser?.phoneNumber || '');
        setReceiverNotes(`Received in good order from Driver ${manifest.driverName} (${manifest.vehicleReg}).`);
        if (stores.length > 0) {
            setSelectedStoreId(stores[0].id);
        }
    };

    // Confirm Receipt and Perform 1-Click Auto Stock-In
    const handleConfirmStockIn = async () => {
        if (!verifyingManifest || !verifyingDropItem) return;
        if (receivedQty <= 0) {
            alert('Please enter a valid quantity received.');
            return;
        }

        setIsStockingIn(true);
        try {
            const nowIso = new Date().toISOString();
            const targetStore = stores.find(s => s.id === selectedStoreId) || stores[0];

            // 1. Create or Increment local retail inventory item in this institution
            const autoSku = `CTY-${verifyingDropItem.category ? verifyingDropItem.category.substring(0, 3).toUpperCase() : 'GEN'}-${Math.floor(1000 + Math.random() * 9000)}`;
            const localInventoryPayload: Partial<RetailInventoryItem> = {
                id: `rinv_cty_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                institutionId,
                name: verifyingDropItem.name,
                category: verifyingDropItem.category || 'County Supplied',
                quantity: receivedQty,
                unit: verifyingDropItem.unit || 'pcs',
                costPrice: 0,
                srpPrice: 0,
                basePrice: 0,
                storeId: targetStore?.id || undefined,
                storeName: targetStore?.name || 'Main School Store',
                description: `County Allocated Goods from Manifest ${verifyingManifest.manifestNumber}. Driver: ${verifyingManifest.driverName} (${verifyingManifest.vehicleReg}). Notes: ${receiverNotes}`,
                sku: autoSku,
                barcode: `CTY-${verifyingManifest.manifestNumber.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-4)}`
            };

            await apiService.saveModuleRecord('retail_inventory_items', localInventoryPayload)
                .catch(err => console.warn("Local inventory save note:", err));

            // 2. Update the Manifest drop item status to 'received'
            const updatedManifests = manifests.map(m => {
                if (m.id === verifyingManifest.id || m.manifestNumber === verifyingManifest.manifestNumber) {
                    const updatedItems = m.items.map(item => {
                        if (item.id === verifyingDropItem.id || (item.name === verifyingDropItem.name && item.targetInstitutionId === verifyingDropItem.targetInstitutionId)) {
                            return {
                                ...item,
                                status: 'received' as const,
                                receivedDate: nowIso,
                                receivedBy: receiverName,
                                notes: `${item.notes || ''} | Received by ${receiverName} into ${targetStore?.name || 'Stores'}: ${receiverNotes}`
                            };
                        }
                        return item;
                    });

                    const allDone = updatedItems.every(i => i.status === 'received');
                    return {
                        ...m,
                        items: updatedItems,
                        status: allDone ? ('completed' as const) : ('in_transit' as const),
                        updatedAt: nowIso
                    };
                }
                return m;
            });

            setManifests(updatedManifests);
            localStorage.setItem('county_dispatch_manifests_v1', JSON.stringify(updatedManifests));

            const updatedTargetManifest = updatedManifests.find(m => m.id === verifyingManifest.id || m.manifestNumber === verifyingManifest.manifestNumber);
            if (updatedTargetManifest) {
                await apiService.saveModuleRecord('county_dispatch_manifests', updatedTargetManifest)
                    .catch(e => console.warn("Remote manifest sync note:", e));
            }

            // 3. Fire custom event so parent inventory tables and radar refresh immediately
            window.dispatchEvent(new Event('inventory_updated'));
            if (onRefreshStock) onRefreshStock();

            setSuccessMessage(`Successfully verified and stocked in ${receivedQty} ${verifyingDropItem.unit} of "${verifyingDropItem.name}" into ${targetStore?.name || 'Stores'}!`);

            setCertificateData({
                manifest: verifyingManifest,
                drop: {
                    ...verifyingDropItem,
                    quantity: receivedQty,
                    status: 'received',
                    receivedDate: nowIso,
                    receivedBy: receiverName
                },
                receivedDate: nowIso,
                receiver: receiverName,
                storeName: targetStore?.name || 'Main Institutional Store'
            });

            setVerifyingManifest(null);
            setVerifyingDropItem(null);
        } catch (err: any) {
            console.error("Stock-in error:", err);
            alert("Failed to complete stock-in: " + (err?.message || 'Unknown error'));
        } finally {
            setIsStockingIn(false);
        }
    };

    // Submit New County Material Requisition
    const handleSubmitRequisition = async () => {
        const validItems = reqItems.filter(i => i.name.trim() && i.quantity > 0);
        if (validItems.length === 0) {
            alert('Please add at least one valid item to request.');
            return;
        }

        setIsSubmittingReq(true);
        try {
            const newReq: CountySchoolRequisition = {
                id: `REQ-${Date.now().toString().slice(-6)}`,
                countyId: '047',
                institutionId,
                institutionName: currentInstitution?.name || 'Institutional Store',
                requisitionNumber: `REQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                requestedDate: new Date().toISOString(),
                requestedBy: currentUser?.name || 'School Administrator',
                requestedByRole: currentUser?.role || 'Stores Master',
                requestedByPhone: currentUser?.phoneNumber || '',
                priority: reqPriority,
                category: reqCategory,
                urgencyReason: reqUrgencyReason,
                status: 'pending',
                items: validItems.map((item, idx) => ({
                    id: `req-item-${idx + 1}`,
                    name: item.name.trim(),
                    quantity: Number(item.quantity),
                    unit: item.unit.trim() || 'Units',
                    notes: item.notes.trim()
                }))
            };

            const updatedReqs = [newReq, ...schoolRequisitions];
            setSchoolRequisitions(updatedReqs);

            let existingAllReqs: any[] = [];
            const localStr = localStorage.getItem('county_school_requisitions_v1');
            if (localStr) {
                try { existingAllReqs = JSON.parse(localStr); } catch (_) {}
            }
            localStorage.setItem('county_school_requisitions_v1', JSON.stringify([newReq, ...existingAllReqs]));

            await apiService.saveModuleRecord('county_school_requisitions', newReq)
                .catch(e => console.warn("Requisition remote save note:", e));

            setShowRequisitionModal(false);
            setReqItems([{ name: '', quantity: 10, unit: 'Kits', notes: '' }]);
            setReqUrgencyReason('');
            setSuccessMessage(`County Material Requisition #${newReq.requisitionNumber} submitted to County Logistics HQ.`);
            setViewSubTab('requisitions');
        } catch (err: any) {
            console.error("Requisition submit error:", err);
            alert("Failed to submit requisition: " + (err?.message || 'Unknown error'));
        } finally {
            setIsSubmittingReq(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-500/30 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5" />
                                County Central Supply Pipeline
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                {currentInstitution?.name || 'This School'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            County Supply Pipeline & Institutional Dispatches
                        </h2>
                        <p className="text-sm text-emerald-200/80 max-w-2xl">
                            Track county logistics trucks, verify goods upon arrival with 1-click digital handover, and submit direct material requisitions to County Logistics HQ.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowRequisitionModal(true)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            + Request County Supplies
                        </button>
                        <button
                            onClick={loadData}
                            disabled={isLoading}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 transition-all flex items-center gap-2 backdrop-blur-md shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Sync Pipeline
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-500/20">
                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 backdrop-blur-sm">
                        <p className="text-xs text-emerald-200/70 font-medium">Pending Inbound Drops</p>
                        <div className="text-2xl font-extrabold text-white mt-1 flex items-center gap-2">
                            {stats.pendingDrops}
                            {stats.pendingDrops > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/30 text-amber-200 border border-amber-400/30 animate-pulse">
                                    En Route
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 backdrop-blur-sm">
                        <p className="text-xs text-emerald-200/70 font-medium">Expected Allocated Units</p>
                        <p className="text-2xl font-extrabold text-emerald-300 mt-1">
                            {stats.pendingUnits.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 backdrop-blur-sm">
                        <p className="text-xs text-emerald-200/70 font-medium">Active Trucks on Corridor</p>
                        <p className="text-2xl font-extrabold text-blue-300 mt-1 flex items-center gap-1.5">
                            <Truck className="w-5 h-5 text-blue-400" />
                            {stats.activeTrucksCount}
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 backdrop-blur-sm">
                        <p className="text-xs text-emerald-200/70 font-medium">School Requisitions</p>
                        <p className="text-2xl font-extrabold text-amber-300 mt-1 flex items-center gap-1.5">
                            <FileText className="w-5 h-5 text-amber-400" />
                            {stats.totalReqs}
                        </p>
                    </div>
                </div>
            </div>

            {/* Subtab Toggle Buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 gap-1 text-xs font-bold">
                <button
                    onClick={() => setViewSubTab('deliveries')}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                        viewSubTab === 'deliveries'
                            ? 'bg-white text-emerald-800 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Inbound Delivery Trucks & Consignments ({relevantConsignments.length})
                </button>
                <button
                    onClick={() => setViewSubTab('requisitions')}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                        viewSubTab === 'requisitions'
                            ? 'bg-white text-indigo-800 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    My County Material Requests ({schoolRequisitions.length})
                </button>
            </div>

            {/* Success Feedback Alert */}
            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Action Confirmed</p>
                            <p className="text-xs text-emerald-600 mt-0.5">{successMessage}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100/50 hover:bg-emerald-100"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* TAB 1: INBOUND CONSIGNMENTS & TRUCKS */}
            {viewSubTab === 'deliveries' && (
                <>
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search manifest, vehicle, item..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5" /> Filter Status:
                            </span>
                            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-medium">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    All Deliveries ({relevantConsignments.length})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('in_transit')}
                                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${statusFilter === 'in_transit' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                    In Transit ({stats.pendingDrops})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('received')}
                                    className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'received' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Stocked In ({stats.receivedDrops})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Consignments List */}
                    {filteredConsignments.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                                <Package className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">No Inbound County Consignments Found</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                                    {statusFilter === 'in_transit' 
                                        ? "There are currently no delivery trucks on route destined for this school."
                                        : "No county dispatches match the current search or filters."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredConsignments.map((manifest) => (
                                <div
                                    key={manifest.id || manifest.manifestNumber}
                                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden"
                                >
                                    {/* Trip Manifest Banner */}
                                    <div className="p-5 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 tracking-wider shadow-sm">
                                                    {manifest.manifestNumber}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <Truck className="w-3.5 h-3.5" />
                                                    {manifest.vehicleReg}
                                                </span>
                                                {manifest.vehicleType && (
                                                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                                                        ({manifest.vehicleType})
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    manifest.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-amber-100 text-amber-800 animate-pulse'
                                                }`}>
                                                    {manifest.status === 'completed' ? '✓ Fully Delivered' : '🚚 En Route'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-3 pt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    Driver: <strong>{manifest.driverName}</strong>
                                                </span>
                                                {manifest.driverPhone && (
                                                    <a
                                                        href={`tel:${manifest.driverPhone}`}
                                                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        {manifest.driverPhone}
                                                    </a>
                                                )}
                                                {manifest.departureDepot && (
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                        Origin: {manifest.departureDepot}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(manifest.dispatchDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right flex items-center gap-2 self-start md:self-auto">
                                            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                {manifest.schoolDrops.length} item{manifest.schoolDrops.length > 1 ? 's' : ''} for this School
                                            </span>
                                        </div>
                                    </div>

                                    {/* Drop Items Table */}
                                    <div className="p-5 space-y-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Allocated Items in this Consignment:
                                        </h4>
                                        
                                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                                            {manifest.schoolDrops.map((drop) => {
                                                const isReceived = drop.status === 'received';

                                                return (
                                                    <div
                                                        key={drop.id || drop.name}
                                                        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                                                            isReceived ? 'bg-emerald-50/20' : 'bg-white hover:bg-slate-50/70'
                                                        }`}
                                                    >
                                                        <div className="space-y-1 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-slate-900 text-sm">
                                                                    {drop.name}
                                                                </span>
                                                                {drop.category && (
                                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                                        {drop.category}
                                                                    </span>
                                                                )}
                                                                {isReceived ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                                        Stocked In
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                                        <Clock className="w-3 h-3 text-amber-600" />
                                                                        Awaiting Handover
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                                                <span className="text-slate-700 font-medium">
                                                                    Quantity: <strong className="text-emerald-700 text-sm font-extrabold">{drop.quantity} {drop.unit}</strong>
                                                                </span>
                                                                {drop.recipientName && (
                                                                    <span>Target Dept: {drop.recipientName}</span>
                                                                )}
                                                                {drop.notes && (
                                                                    <span className="text-slate-400 italic">“{drop.notes}”</span>
                                                                )}
                                                            </div>

                                                            {isReceived && drop.receivedBy && (
                                                                <p className="text-[11px] text-emerald-700 font-medium pt-0.5">
                                                                    ✓ Verified by {drop.receivedBy} on {drop.receivedDate ? new Date(drop.receivedDate).toLocaleString() : 'recently'}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 self-end md:self-center">
                                                            {isReceived ? (
                                                                <button
                                                                    onClick={() => setCertificateData({
                                                                        manifest,
                                                                        drop,
                                                                        receivedDate: drop.receivedDate || new Date().toISOString(),
                                                                        receiver: drop.receivedBy || 'Stores Master',
                                                                        storeName: 'Main School Stores'
                                                                    })}
                                                                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                                                                >
                                                                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                                                                    Handover Receipt
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenVerification(manifest, drop)}
                                                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    Verify & Auto-Stock In
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* TAB 2: MY SCHOOL MATERIAL REQUISITIONS */}
            {viewSubTab === 'requisitions' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <h3 className="font-bold text-sm text-slate-800">School Material Requests to County HQ</h3>
                            <p className="text-xs text-slate-500">Track approvals and dispatch assignments for county-allocated school supplies.</p>
                        </div>
                        <button
                            onClick={() => setShowRequisitionModal(true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                        >
                            <Plus className="w-4 h-4" />
                            + New Material Request
                        </button>
                    </div>

                    {schoolRequisitions.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                                <FileText className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">No Material Requisitions Raised Yet</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                                    Click "New Material Request" to request CBC kits, feeding flour, or workshop tools directly from County Logistics.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {schoolRequisitions.map((req) => (
                                <div key={req.id || req.requisitionNumber} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                                                {req.requisitionNumber}
                                            </span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                                                {req.category}
                                            </span>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                                                req.priority === 'urgent' ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' :
                                                req.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {req.priority} Priority
                                            </span>
                                        </div>

                                        <div>
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                                req.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                req.status === 'dispatched' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                req.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {req.status === 'approved' && '✓ Approved at HQ'}
                                                {req.status === 'dispatched' && '🚚 Loaded on Truck'}
                                                {req.status === 'pending' && '⏳ Pending Review'}
                                                {req.status === 'rejected' && '✕ Not Approved'}
                                            </span>
                                        </div>
                                    </div>

                                    {req.urgencyReason && (
                                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <strong className="text-slate-700 font-semibold">Justification:</strong> {req.urgencyReason}
                                        </p>
                                    )}

                                    {/* Items List */}
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Requested Line Items:</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {req.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                                    <span className="font-bold text-slate-800">{item.name}</span>
                                                    <span className="font-mono font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        {item.quantity} {item.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex-wrap gap-2">
                                        <span>Requested by <strong>{req.requestedBy}</strong> on {new Date(req.requestedDate).toLocaleDateString()}</span>
                                        {req.allocatedManifestNumber && (
                                            <span className="text-emerald-700 font-bold">
                                                Assigned Truck Manifest: {req.allocatedManifestNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Raise County Material Requisition Modal */}
            {showRequisitionModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
                        <div className="p-6 bg-gradient-to-r from-emerald-800 to-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-white/10">
                                    <Send className="w-5 h-5 text-emerald-300" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold">Raise County Material Requisition</h3>
                                    <p className="text-xs text-emerald-200/80">Submit request directly to County Logistics HQ</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowRequisitionModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-sm max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Supply Category:
                                    </label>
                                    <select
                                        value={reqCategory}
                                        onChange={(e) => setReqCategory(e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
                                    >
                                        <option value="CBC & Lab Equipment">CBC & Lab Science Equipment</option>
                                        <option value="ECDE & Nutrition">ECDE Fortified Porridge Flour & Feeding</option>
                                        <option value="Textbooks & Stationery">Textbooks & CBC Supplementary Manuals</option>
                                        <option value="Vocational Workshop Tools">VTC Workshop & Technical Tools</option>
                                        <option value="Sanitary & Health Packs">Sanitary Towels & Sickbay Medical Kits</option>
                                        <option value="Sports & Co-curricular">Sports & Athletics Gear</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Priority / Urgency:
                                    </label>
                                    <select
                                        value={reqPriority}
                                        onChange={(e) => setReqPriority(e.target.value as any)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold"
                                    >
                                        <option value="urgent">Urgent / Critical Out-of-Stock</option>
                                        <option value="high">High Priority</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Standard Termly Allocation</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Justification / Urgency Reason:
                                </label>
                                <textarea
                                    value={reqUrgencyReason}
                                    onChange={(e) => setReqUrgencyReason(e.target.value)}
                                    rows={2}
                                    placeholder="Explain why these supplies are needed and current stock state..."
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Line Items Builder */}
                            <div className="space-y-3 pt-2 border-t border-slate-200">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Items to Request:
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setReqItems([...reqItems, { name: '', quantity: 10, unit: 'pcs', notes: '' }])}
                                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Another Item
                                    </button>
                                </div>

                                {reqItems.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-slate-600">Item #{idx + 1}</span>
                                            {reqItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setReqItems(reqItems.filter((_, i) => i !== idx))}
                                                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => {
                                                        const copy = [...reqItems];
                                                        copy[idx].name = e.target.value;
                                                        setReqItems(copy);
                                                    }}
                                                    placeholder="Item name (e.g. Grade 8 CBC Microscope Kits)"
                                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-semibold"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const copy = [...reqItems];
                                                        copy[idx].quantity = Number(e.target.value);
                                                        setReqItems(copy);
                                                    }}
                                                    placeholder="Qty"
                                                    className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-bold"
                                                />
                                                <input
                                                    type="text"
                                                    value={item.unit}
                                                    onChange={(e) => {
                                                        const copy = [...reqItems];
                                                        copy[idx].unit = e.target.value;
                                                        setReqItems(copy);
                                                    }}
                                                    placeholder="Unit (e.g. Bags, Kits)"
                                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowRequisitionModal(false)}
                                disabled={isSubmittingReq}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitRequisition}
                                disabled={isSubmittingReq}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmittingReq ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Requisition to County HQ
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1-Click Verification & Stock-In Modal */}
            {verifyingManifest && verifyingDropItem && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
                        <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-800 text-white relative">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                    <ShieldCheck className="w-6 h-6 text-emerald-300" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">1-Click Goods Acceptance & Stock In</h3>
                                    <p className="text-xs text-emerald-200/80">
                                        Verify physical goods from County Manifest #{verifyingManifest.manifestNumber}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 text-sm">
                            {/* Summary Box */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-semibold uppercase">Item Name</p>
                                        <p className="font-bold text-slate-900 text-base">{verifyingDropItem.name}</p>
                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 mt-1">
                                            {verifyingDropItem.category || 'County Allocated'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 font-semibold uppercase">Dispatched Qty</p>
                                        <p className="font-mono font-extrabold text-emerald-700 text-lg">
                                            {verifyingDropItem.quantity} {verifyingDropItem.unit}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                                    <span>Truck: <strong>{verifyingManifest.vehicleReg}</strong></span>
                                    <span>Driver: <strong>{verifyingManifest.driverName}</strong></span>
                                </div>
                            </div>

                            {/* Verification Form Controls */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Verified Quantity Received:
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max={verifyingDropItem.quantity * 2}
                                            value={receivedQty}
                                            onChange={(e) => setReceivedQty(Number(e.target.value))}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                            {verifyingDropItem.unit}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Deposit Into Store / Depot:
                                    </label>
                                    <select
                                        value={selectedStoreId}
                                        onChange={(e) => setSelectedStoreId(e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
                                    >
                                        {stores && stores.length > 0 ? (
                                            stores.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))
                                        ) : (
                                            <option value="main">Main Institutional Store</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Receiving Officer Name:
                                    </label>
                                    <input
                                        type="text"
                                        value={receiverName}
                                        onChange={(e) => setReceiverName(e.target.value)}
                                        placeholder="e.g. John Doe (Stores Master)"
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Officer Phone / Contact:
                                    </label>
                                    <input
                                        type="text"
                                        value={receiverPhone}
                                        onChange={(e) => setReceiverPhone(e.target.value)}
                                        placeholder="+254..."
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Condition & Verification Notes:
                                </label>
                                <textarea
                                    value={receiverNotes}
                                    onChange={(e) => setReceiverNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Enter seal verification notes, package condition remarks..."
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    Automated Actions upon Confirmation:
                                </p>
                                <ul className="list-disc list-inside space-y-0.5 text-emerald-700">
                                    <li>Adds <strong>{receivedQty} {verifyingDropItem.unit}</strong> to your local store stock ledger</li>
                                    <li>Marks the County Manifest drop as <strong>Received</strong> with timestamp</li>
                                    <li>Generates official Handover & Delivery Acceptance Certificate</li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setVerifyingManifest(null);
                                    setVerifyingDropItem(null);
                                }}
                                disabled={isStockingIn}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmStockIn}
                                disabled={isStockingIn}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isStockingIn ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Stocking In...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Confirm Receipt & Auto-Stock In
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Handover Acceptance Certificate Print Modal */}
            {certificateData && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
                        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-base font-bold">Official County-to-School Handover Certificate</h3>
                            </div>
                            <button
                                onClick={() => setCertificateData(null)}
                                className="text-slate-400 hover:text-white text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Printable Area */}
                        <div id="printable-handover-certificate" className="p-8 space-y-6 text-slate-800 bg-white">
                            {/* Certificate Header */}
                            <div className="border-b-2 border-emerald-700 pb-4 text-center space-y-1">
                                <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                                    Republic of Kenya • County Government Logistics
                                </h2>
                                <h3 className="text-sm font-bold text-emerald-800 uppercase">
                                    Institutional Goods Delivery & Handover Acceptance Certificate
                                </h3>
                                <p className="text-xs text-slate-500 font-mono">
                                    Manifest Ref: {certificateData.manifest.manifestNumber} • Issued: {new Date(certificateData.receivedDate).toLocaleString()}
                                </p>
                            </div>

                            {/* Two Column Summary */}
                            <div className="grid grid-cols-2 gap-6 text-xs">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                                    <p className="font-bold text-slate-900 uppercase text-[11px] border-b pb-1">1. County Logistics HQ (Carrier)</p>
                                    <p>Vehicle Plate: <strong>{certificateData.manifest.vehicleReg}</strong></p>
                                    <p>Driver: <strong>{certificateData.manifest.driverName}</strong></p>
                                    <p>Contact: <strong>{certificateData.manifest.driverPhone || 'N/A'}</strong></p>
                                    <p>Departure Depot: <strong>{certificateData.manifest.departureDepot || 'Central Warehouse'}</strong></p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                                    <p className="font-bold text-slate-900 uppercase text-[11px] border-b pb-1">2. Receiving Institution (Recipient)</p>
                                    <p>School: <strong>{currentInstitution?.name || 'Destination School'}</strong></p>
                                    <p>Receiver: <strong>{certificateData.receiver}</strong></p>
                                    <p>Store Location: <strong>{certificateData.storeName}</strong></p>
                                    <p>Handover Status: <strong className="text-emerald-700">Verified & Stocked In</strong></p>
                                </div>
                            </div>

                            {/* Goods Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 font-bold text-slate-700">
                                        <tr>
                                            <th className="p-2.5">Item Description</th>
                                            <th className="p-2.5">Category</th>
                                            <th className="p-2.5 text-right">Quantity Received</th>
                                            <th className="p-2.5">Verification Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="p-2.5 font-bold">{certificateData.drop.name}</td>
                                            <td className="p-2.5 text-slate-600">{certificateData.drop.category || 'Education Supplies'}</td>
                                            <td className="p-2.5 font-mono font-extrabold text-right text-emerald-800">
                                                {certificateData.drop.quantity} {certificateData.drop.unit}
                                            </td>
                                            <td className="p-2.5 font-bold text-emerald-700">✓ Accepted in Good Condition</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
                                <div className="space-y-4">
                                    <p className="font-bold text-slate-700">Delivered by (County Driver):</p>
                                    <div className="border-b border-slate-400 h-8"></div>
                                    <p className="text-slate-500 font-mono">{certificateData.manifest.driverName}</p>
                                </div>
                                <div className="space-y-4">
                                    <p className="font-bold text-slate-700">Received by (School Stores Officer):</p>
                                    <div className="border-b border-slate-400 h-8"></div>
                                    <p className="text-slate-500 font-mono">{certificateData.receiver}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setCertificateData(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow transition-all flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4 text-emerald-400" />
                                Print Official Certificate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
