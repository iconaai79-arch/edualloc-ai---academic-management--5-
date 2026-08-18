import React, { useState, useEffect, useMemo } from 'react';
import { Truck, CheckCircle, Clock, Package, MapPin, Phone, User as UserIcon, Calendar, FileText, ArrowRight, ShieldCheck, Printer, RefreshCw, AlertTriangle, Building, Search, Filter, Check, Eye } from 'lucide-react';
import { CountyDispatchManifest, CountyDispatchDropItem, RetailStore, Institution, User, RetailInventoryItem } from '../types';
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
    const [manifests, setManifests] = useState<CountyDispatchManifest[]>([]);
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

    // Certificate / Handover Print Modal
    const [certificateData, setCertificateData] = useState<{
        manifest: CountyDispatchManifest;
        drop: CountyDispatchDropItem;
        receivedDate: string;
        receiver: string;
        storeName: string;
    } | null>(null);

    // Load and filter manifests for this institution
    const loadManifests = async () => {
        setIsLoading(true);
        try {
            let loaded: CountyDispatchManifest[] = [];
            // Try fetching from remote DB
            const remoteRecords = await apiService.fetchModuleRecords<CountyDispatchManifest>('county_dispatch_manifests')
                .catch(() => null);
            
            if (remoteRecords && Array.isArray(remoteRecords) && remoteRecords.length > 0) {
                loaded = remoteRecords;
            } else {
                // Check localStorage
                const localStr = localStorage.getItem('county_dispatch_manifests_v1');
                if (localStr) {
                    try {
                        loaded = JSON.parse(localStr);
                    } catch (e) {
                        console.warn("Could not parse local manifests:", e);
                    }
                }
            }

            // If empty, supply comprehensive demo inbound manifests so schools have test data out of the box
            if (!loaded || loaded.length === 0) {
                loaded = [
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
                localStorage.setItem('county_dispatch_manifests_v1', JSON.stringify(loaded));
            }

            setManifests(loaded);
        } catch (err) {
            console.error("Error loading county manifests:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadManifests();
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
            // Filter drops belonging to this school
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
            // Status match
            if (statusFilter === 'in_transit') {
                const hasPending = c.schoolDrops.some(d => d.status !== 'received');
                if (!hasPending) return false;
            } else if (statusFilter === 'received') {
                const allReceived = c.schoolDrops.every(d => d.status === 'received');
                if (!allReceived) return false;
            }

            // Search match
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
            activeTrucksCount: activeTrucks.size
        };
    }, [relevantConsignments]);

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
                costPrice: 0, // County supplied items have zero direct cost to school budget
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

                    // Check if all drops in the whole manifest are completed
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

            // Try persisting updated manifest remotely
            const updatedTargetManifest = updatedManifests.find(m => m.id === verifyingManifest.id || m.manifestNumber === verifyingManifest.manifestNumber);
            if (updatedTargetManifest) {
                await apiService.saveModuleRecord('county_dispatch_manifests', updatedTargetManifest)
                    .catch(e => console.warn("Remote manifest sync note:", e));
            }

            // 3. Fire custom event so parent inventory tables and radar refresh immediately
            window.dispatchEvent(new Event('inventory_updated'));
            if (onRefreshStock) onRefreshStock();

            setSuccessMessage(`Successfully verified and stocked in ${receivedQty} ${verifyingDropItem.unit} of "${verifyingDropItem.name}" into ${targetStore?.name || 'Stores'}!`);

            // Prepare Handover Certificate
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
                            Inbound County Consignments & Dispatches
                        </h2>
                        <p className="text-sm text-emerald-200/80 max-w-2xl">
                            Track county logistics trucks, view incoming consignments, verify delivery upon arrival, and instantly auto-stock in items into your local school store ledger with 1-click digital handover.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadManifests}
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
                        <p className="text-xs text-emerald-200/70 font-medium">Verified & Stocked In</p>
                        <p className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            {stats.receivedDrops}
                        </p>
                    </div>
                </div>
            </div>

            {/* Success Feedback Alert */}
            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Goods Successfully Stocked In</p>
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
