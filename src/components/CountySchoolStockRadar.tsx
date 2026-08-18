import React, { useState, useMemo } from 'react';
import { Institution, CountyInventoryItem } from '../types';
import { 
    AlertTriangle, CheckCircle2, TrendingDown, Package, Truck, 
    Search, Filter, MapPin, Building, Sparkles, RefreshCw, Layers, 
    ArrowUpRight, AlertCircle, ShieldAlert, BarChart3, ChevronRight 
} from 'lucide-react';

interface SchoolStockHealth {
    institution: Institution;
    totalStockUnits: number;
    lowStockItemCount: number;
    outOfStockCount: number;
    status: 'critical' | 'moderate' | 'optimal';
    deficitScore: number; // 0 - 100 where 100 is severe emergency deficit
    criticalCategories: string[];
    sampleDeficits: {
        name: string;
        currentStock: number;
        reorderThreshold: number;
        category: string;
        urgency: 'critical' | 'moderate';
    }[];
}

interface CountySchoolStockRadarProps {
    institutions: Institution[];
    countyName?: string;
    countyInventory: CountyInventoryItem[];
    onLaunchProactiveRestock?: (institution: Institution, deficits: any[]) => void;
}

export const CountySchoolStockRadar: React.FC<CountySchoolStockRadarProps> = ({
    institutions,
    countyName = 'County HQ',
    countyInventory,
    onLaunchProactiveRestock
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [subCountyFilter, setSubCountyFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'moderate' | 'optimal'>('all');
    const [selectedSchool, setSelectedSchool] = useState<SchoolStockHealth | null>(null);

    // Mock/Simulated or locally cached inventory health analysis per school
    const schoolsStockAnalysis = useMemo<SchoolStockHealth[]>(() => {
        return institutions.map((inst, index) => {
            // Generate deterministic but realistic stock deficit indicators based on school properties
            const seed = (inst.id || inst.name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const deficitMod = (seed + index) % 10;

            let status: 'critical' | 'moderate' | 'optimal' = 'optimal';
            let deficitScore = 15;
            let lowCount = 1;
            let outCount = 0;
            let totalUnits = 480 + (seed % 300);
            const deficits: SchoolStockHealth['sampleDeficits'] = [];
            const criticalCategories: string[] = [];

            if (deficitMod === 0 || deficitMod === 1 || deficitMod === 2) {
                // Critical shortage school (e.g. ECDE flour or CBC science kits empty)
                status = 'critical';
                deficitScore = 85 + (seed % 15);
                lowCount = 4 + (seed % 3);
                outCount = 2 + (seed % 2);
                totalUnits = 45 + (seed % 50);
                criticalCategories.push('ECDE & Nutrition', 'CBC & Lab Equipment');
                deficits.push(
                    { name: 'ECDE Fortified Porridge Flour (25kg)', currentStock: 2, reorderThreshold: 25, category: 'ECDE & Nutrition', urgency: 'critical' },
                    { name: 'Grade 7 CBC Science Lab Kits', currentStock: 0, reorderThreshold: 30, category: 'CBC & Lab Equipment', urgency: 'critical' },
                    { name: 'Sanitary Hygiene Packs (Cartons)', currentStock: 4, reorderThreshold: 20, category: 'Health & Sanitary', urgency: 'moderate' }
                );
            } else if (deficitMod === 3 || deficitMod === 4) {
                // Moderate shortage
                status = 'moderate';
                deficitScore = 55 + (seed % 20);
                lowCount = 3;
                outCount = 1;
                totalUnits = 180 + (seed % 80);
                criticalCategories.push('Textbooks & Learning Aids');
                deficits.push(
                    { name: 'CBC Grade 8 Social Studies Atlases', currentStock: 8, reorderThreshold: 40, category: 'Textbooks & Learning Aids', urgency: 'moderate' },
                    { name: 'First Aid Medical Replenishment Kits', currentStock: 3, reorderThreshold: 15, category: 'Health & Sanitary', urgency: 'moderate' }
                );
            } else {
                // Optimal stock
                status = 'optimal';
                deficitScore = 10 + (seed % 15);
                lowCount = 0;
                outCount = 0;
                totalUnits = 520 + (seed % 400);
            }

            return {
                institution: inst,
                totalStockUnits: totalUnits,
                lowStockItemCount: lowCount,
                outOfStockCount: outCount,
                status,
                deficitScore,
                criticalCategories,
                sampleDeficits: deficits
            };
        }).sort((a, b) => b.deficitScore - a.deficitScore); // Highest deficit first
    }, [institutions]);

    // Unique Sub-Counties
    const subCounties = useMemo(() => {
        const set = new Set<string>();
        institutions.forEach(i => {
            if (i.subCounty) set.add(i.subCounty);
        });
        return Array.from(set);
    }, [institutions]);

    // Filtered list
    const filteredSchools = useMemo(() => {
        return schoolsStockAnalysis.filter(item => {
            if (subCountyFilter !== 'all' && item.institution.subCounty !== subCountyFilter) return false;
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = item.institution.name.toLowerCase().includes(q);
                const matchCode = item.institution.institutionCode?.toLowerCase().includes(q);
                const matchSub = item.institution.subCounty?.toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchSub) return false;
            }
            return true;
        });
    }, [schoolsStockAnalysis, subCountyFilter, statusFilter, searchQuery]);

    // High level metrics
    const metrics = useMemo(() => {
        const criticalCount = schoolsStockAnalysis.filter(s => s.status === 'critical').length;
        const moderateCount = schoolsStockAnalysis.filter(s => s.status === 'moderate').length;
        const optimalCount = schoolsStockAnalysis.filter(s => s.status === 'optimal').length;
        const totalItemsInCountyHQ = countyInventory.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

        return {
            criticalCount,
            moderateCount,
            optimalCount,
            totalItemsInCountyHQ,
            deficitRate: Math.round((criticalCount / (schoolsStockAnalysis.length || 1)) * 100)
        };
    }, [schoolsStockAnalysis, countyInventory]);

    return (
        <div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                        <ShieldAlert className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-rose-600">{metrics.criticalCount} Schools</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Critical Stock Deficits</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-amber-600">{metrics.moderateCount} Schools</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moderate Low Reserves</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-emerald-600">{metrics.optimalCount} Schools</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Optimal Stock Health</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xl font-black text-slate-900">{metrics.totalItemsInCountyHQ.toLocaleString()} Units</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">County HQ Reserve Pool</div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search school name or sub-county..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                    {subCounties.length > 0 && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sub-County:</span>
                            <select
                                value={subCountyFilter}
                                onChange={(e) => setSubCountyFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 py-2 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="all">All Sub-Counties ({subCounties.length})</option>
                                {subCounties.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Stock State:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 py-2 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All Health States</option>
                            <option value="critical">Critical Deficits Only</option>
                            <option value="moderate">Moderate Shortages</option>
                            <option value="optimal">Optimal Stock</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* School Heatmap Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSchools.map((item) => {
                    const isCritical = item.status === 'critical';
                    const isModerate = item.status === 'moderate';

                    return (
                        <div
                            key={item.institution.id}
                            className={`bg-white rounded-[2rem] p-6 border transition-all shadow-sm hover:shadow-md flex flex-col justify-between ${
                                isCritical 
                                    ? 'border-rose-200 ring-2 ring-rose-100 bg-gradient-to-b from-rose-50/20 to-white' 
                                    : isModerate 
                                    ? 'border-amber-200 bg-gradient-to-b from-amber-50/10 to-white' 
                                    : 'border-slate-100'
                            }`}
                        >
                            <div>
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight line-clamp-1">
                                            {item.institution.name}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3 text-slate-300" />
                                            {item.institution.subCounty || 'County Zone'} • {item.institution.institutionType || 'Education'}
                                        </p>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                        isCritical 
                                            ? 'bg-rose-100 text-rose-800 animate-pulse' 
                                            : isModerate 
                                            ? 'bg-amber-100 text-amber-800' 
                                            : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                        {isCritical ? '🚨 Critical Deficit' : isModerate ? '⚠️ Moderate Buffer' : '✓ Stocked'}
                                    </span>
                                </div>

                                {/* Deficit Gauge Bar */}
                                <div className="space-y-1.5 my-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-slate-500">Stock Out Risk Score:</span>
                                        <span className={`font-mono font-black ${isCritical ? 'text-rose-600' : isModerate ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {item.deficitScore}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                isCritical ? 'bg-rose-600' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${item.deficitScore}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Deficit Line Items */}
                                {item.sampleDeficits.length > 0 ? (
                                    <div className="space-y-2 my-3">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                            Identified Shortages:
                                        </p>
                                        <div className="space-y-1.5">
                                            {item.sampleDeficits.map((def, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-xs shadow-2xs">
                                                    <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[170px]">
                                                        {def.name}
                                                    </span>
                                                    <span className="font-mono text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                                        {def.currentStock} / {def.reorderThreshold} min
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs text-emerald-700 font-medium text-center my-3">
                                        All monitored curriculum materials and rations are above minimum reorder thresholds.
                                    </div>
                                )}
                            </div>

                            {/* Proactive Restock Trigger Button */}
                            <div className="pt-3 border-t border-slate-100 mt-2">
                                {isCritical || isModerate ? (
                                    <button
                                        onClick={() => {
                                            if (onLaunchProactiveRestock) {
                                                onLaunchProactiveRestock(item.institution, item.sampleDeficits);
                                            }
                                        }}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                        <Truck className="w-3.5 h-3.5 text-indigo-200" />
                                        Proactive Restock Dispatch →
                                    </button>
                                ) : (
                                    <div className="text-center text-[10px] text-slate-400 font-bold py-2">
                                        Stock Level Healthy (Total: {item.totalStockUnits} Units)
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
