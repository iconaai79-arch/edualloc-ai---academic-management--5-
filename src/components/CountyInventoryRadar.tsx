import React, { useState, useMemo } from 'react';
import { CountyStore, Institution, CountyInventoryItem } from '../types';
import { 
    MapPin, Building2, Truck, Navigation, ExternalLink, Compass, 
    Layers, Search, ArrowUpRight, CheckCircle2, AlertTriangle, ShieldCheck, Box
} from 'lucide-react';

interface CountyInventoryRadarProps {
    stores: CountyStore[];
    institutions: Institution[];
    inventoryItems: CountyInventoryItem[];
    countyName?: string;
    onSelectStore?: (store: CountyStore) => void;
    onSelectInstitution?: (institution: Institution) => void;
}

export const CountyInventoryRadar: React.FC<CountyInventoryRadarProps> = ({
    stores = [],
    institutions = [],
    inventoryItems = [],
    countyName = 'County',
    onSelectStore,
    onSelectInstitution
}) => {
    const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterZone, setFilterZone] = useState<'all' | 'depot' | 'school'>('all');

    const selectedStore = useMemo(() => {
        return stores.find(s => s.id === selectedStoreId) || stores[0];
    }, [stores, selectedStoreId]);

    // Haversine formula to compute distance in KM between 2 lat/lng pairs
    const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // Radius of earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1));
    };

    // Calculate proximity between the selected store and institutions
    const storeDestinations = useMemo(() => {
        if (!selectedStore) return [];
        const baseLat = selectedStore.latitude || -1.286389;
        const baseLng = selectedStore.longitude || 36.817223;

        return institutions.map((inst, index) => {
            // If institution has lat/lng, use it; otherwise compute realistic zonal offset
            const instLat = (inst as any).latitude || (baseLat + (((index * 13) % 20) - 10) * 0.015);
            const instLng = (inst as any).longitude || (baseLng + (((index * 17) % 20) - 10) * 0.015);
            const distKm = calculateDistanceKm(baseLat, baseLng, instLat, instLng);
            const estMinutes = Math.round(distKm * 2.2 + 10);

            // Active dispatches to this institution from inventory
            const activeDispatches = inventoryItems.filter(i => 
                (i.targetInstitutionId === inst.id || (i as any).target_institution_id === inst.id) &&
                (i.status === 'in_transit' || i.status === 'at_hq')
            );
            const deliveredCount = inventoryItems.filter(i => 
                (i.targetInstitutionId === inst.id || (i as any).target_institution_id === inst.id) &&
                i.status === 'received'
            ).length;

            return {
                institution: inst,
                lat: instLat,
                lng: instLng,
                distanceKm: distKm,
                estimatedTransitMins: estMinutes,
                activeDispatchesCount: activeDispatches.length,
                deliveredCount
            };
        }).sort((a, b) => a.distanceKm - b.distanceKm);
    }, [selectedStore, institutions, inventoryItems]);

    const activeTransitItems = useMemo(() => {
        return inventoryItems.filter(i => i.status === 'in_transit');
    }, [inventoryItems]);

    return (
        <div className="space-y-6">
            {/* Top Stat Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{stores.length}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stores & Depots</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Navigation className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{institutions.length}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination Facilities</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{activeTransitItems.length}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active In-Transit Routes</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">
                            {inventoryItems.filter(i => i.status === 'received').length}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed Dispatches</div>
                    </div>
                </div>
            </div>

            {/* Main Radar and Store Browser Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Store Selector & Facility Proximity Leaderboard */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Store Picker */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Compass className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Select County Depot</h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {stores.length} Depots
                            </span>
                        </div>

                        <div className="space-y-2">
                            {stores.map(store => {
                                const isSelected = (selectedStore?.id === store.id);
                                const itemsAtStore = inventoryItems.filter(i => i.status === 'at_hq').length;
                                return (
                                    <div 
                                        key={store.id}
                                        onClick={() => {
                                            setSelectedStoreId(store.id);
                                            onSelectStore?.(store);
                                        }}
                                        className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                                            isSelected 
                                                ? 'bg-indigo-50/70 border-indigo-200 shadow-sm' 
                                                : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-900">{store.name}</h4>
                                                    <p className="text-[11px] text-slate-500 font-medium">{store.locationName || 'County Logistics Center'}</p>
                                                </div>
                                            </div>
                                            {store.latitude && store.longitude && (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-lg border border-slate-100 shadow-xs"
                                                    title="Open in Google Maps"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                {store.latitude ? `${store.latitude.toFixed(4)}, ${store.longitude.toFixed(4)}` : 'GPS Unset'}
                                            </span>
                                            <span className="font-bold text-indigo-600">
                                                {itemsAtStore} items ready
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Proximity & Logistics Matrix */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Facility Proximity Matrix</h3>
                            <span className="text-[10px] font-mono text-slate-400">from {selectedStore?.name || 'HQ'}</span>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                            {storeDestinations.length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400">No institutions registered in this county.</div>
                            ) : (
                                storeDestinations.map(item => (
                                    <div key={item.institution.id} className="py-3 flex items-center justify-between group hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
                                        <div>
                                            <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.institution.name}</div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                <span>{item.distanceKm} km away</span>
                                                <span>•</span>
                                                <span>~{item.estimatedTransitMins} mins transit</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {item.activeDispatchesCount > 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 flex items-center gap-1">
                                                    <Truck className="w-3 h-3" />
                                                    {item.activeDispatchesCount} en route
                                                </span>
                                            )}
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.institution.name + ', ' + countyName)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-white rounded-lg border border-slate-100"
                                                title="Directions"
                                            >
                                                <Navigation className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Interactive Geospatial Visualizer & Route Board */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Simulated Geospatial Canvas */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden min-h-[460px] flex flex-col justify-between border border-slate-800">
                        {/* Map Background Grid Simulation */}
                        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                            backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
                            backgroundSize: '24px 24px'
                        }}></div>

                        {/* Top Canvas Controls */}
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Live County Logistics Radar</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">Geospatial Distribution Grid • {countyName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/50 text-xs">
                                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                <span className="font-mono text-[10px] text-slate-300">Depot: {selectedStore?.name || 'HQ'}</span>
                            </div>
                        </div>

                        {/* Visual Radar Nodes Simulation */}
                        <div className="relative z-10 my-8 py-4 flex flex-col items-center justify-center">
                            {/* Central Depot Node */}
                            <div className="relative flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-indigo-600/30 border-2 border-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
                                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                </div>
                                <span className="mt-2 text-xs font-black uppercase tracking-tight bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700 text-indigo-200">
                                    {selectedStore?.name || 'County Depot'}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                                    {selectedStore?.locationName || 'Distribution Hub'}
                                </span>
                            </div>

                            {/* Radiating Destination Nodes */}
                            <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80">
                                {storeDestinations.slice(0, 6).map((dest, idx) => (
                                    <div 
                                        key={dest.institution.id}
                                        className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-2xl border border-slate-700/60 hover:border-indigo-400 transition-all cursor-pointer group"
                                        onClick={() => onSelectInstitution?.(dest.institution)}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-black">
                                                {idx + 1}
                                            </div>
                                            <span className="text-[10px] font-mono text-indigo-300 font-bold">
                                                {dest.distanceKm} km
                                            </span>
                                        </div>
                                        <h5 className="text-xs font-black uppercase tracking-tight text-white group-hover:text-indigo-300 truncate">
                                            {dest.institution.name}
                                        </h5>
                                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 pt-1 border-t border-slate-700/50">
                                            <span>~{dest.estimatedTransitMins} mins</span>
                                            {dest.activeDispatchesCount > 0 ? (
                                                <span className="text-amber-300 font-bold flex items-center gap-1">
                                                    <Truck className="w-2.5 h-2.5" /> En Route
                                                </span>
                                            ) : (
                                                <span className="text-emerald-400">Ready</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Navigation Quick Actions */}
                        <div className="relative z-10 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Real-time GIS Topology Active</span>
                            </div>

                            {selectedStore?.latitude && selectedStore?.longitude && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedStore.latitude},${selectedStore.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-colors"
                                >
                                    Launch Navigation <ArrowUpRight className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Active Transit Log Card */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Fleet In-Transit Log</h4>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                                {activeTransitItems.length} En Route
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {activeTransitItems.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    All dispatched inventory items have arrived at destination.
                                </div>
                            ) : (
                                activeTransitItems.map(item => (
                                    <div key={item.id} className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                                                <Box className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.name}</div>
                                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                                                    <span>{item.quantity} {item.unit}</span>
                                                    <span>•</span>
                                                    <span>Driver: {item.driverName || 'Courier'}</span>
                                                    {item.trackingNumber && <span>({item.trackingNumber})</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-800">
                                                {institutions.find(i => i.id === item.targetInstitutionId)?.name || 'Destination School'}
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                In Transit
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
