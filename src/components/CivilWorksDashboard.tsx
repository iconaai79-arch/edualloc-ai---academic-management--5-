import React, { useState } from 'react';
import { 
    HardHat, Hammer, PlusCircle, Activity, Clock, ShieldCheck, 
    Layers, Box, Dna, ScrollText, TrendingUp, Calendar,
    Factory, MapPin, Truck, ChevronRight, BarChart3, PackageCheck
} from 'lucide-react';
import { CivilProduct, ManufacturingBatch, CivilSale, CivilYard } from '../types';

export const CivilWorksDashboard: React.FC = () => {
    const [activeYardId, setActiveYardId] = useState('y1');
    const [yards] = useState<CivilYard[]>([
        { id: 'y1', institutionId: 'inst1', name: 'Westside Concrete Yard', location: 'Industrial Area, Block G', isActive: true },
        { id: 'y2', institutionId: 'inst1', name: 'Southern Casting Site', location: 'Mombasa Road', isActive: true }
    ]);

    const [products, setProducts] = useState<CivilProduct[]>([
        { id: 'cp1', yardId: 'y1', name: 'Solid Block 9"', productType: 'Block', unitPrice: 120, currentStock: 4500, strengthRating: '7.5N/mm2' },
        { id: 'cp2', yardId: 'y1', name: 'Standard Kerb', productType: 'Kerb', unitPrice: 850, currentStock: 300, strengthRating: 'Class 25' },
        { id: 'cp3', yardId: 'y1', name: 'Culvert 600mm', productType: 'Culvert', unitPrice: 4500, currentStock: 45, strengthRating: 'Heavy Duty' },
        { id: 'cp4', yardId: 'y1', name: 'Hollow Block 6"', productType: 'Block', unitPrice: 95, currentStock: 8200, strengthRating: '4.5N/mm2' }
    ]);

    const [batches, setBatches] = useState<ManufacturingBatch[]>([
        { id: 'b1', productId: 'cp1', batchNumber: 'BATCH-001', quantityCast: 1000, castDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), status: 'curing', releaseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString() },
        { id: 'b2', productId: 'cp2', batchNumber: 'BATCH-002', quantityCast: 200, castDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(), status: 'ready', strengthTestResult: 'Pass (27.4 MPa)' },
        { id: 'b3', productId: 'cp4', batchNumber: 'BATCH-003', quantityCast: 2500, castDate: new Date().toISOString(), status: 'curing' }
    ]);

    const [sales, setSales] = useState<CivilSale[]>([
        { id: 'cs1', yardId: 'y1', projectName: 'Highway A104 Expansion', totalAmount: 450000, deliveryStatus: 'dispatched', createdAt: new Date().toISOString() },
        { id: 'cs2', yardId: 'y1', projectName: 'Westland Villas Basement', totalAmount: 89000, deliveryStatus: 'delivered', createdAt: new Date(Date.now() - 86400000).toISOString() }
    ]);

    const activeYard = yards.find(y => y.id === activeYardId);

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 p-6 lg:p-10 font-sans selection:bg-amber-500 selection:text-white">
            <div className="max-w-[1600px] mx-auto space-y-10">
                
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 text-amber-600 font-black uppercase tracking-[0.2em] text-[10px] mb-3">
                            <Factory className="w-4 h-4" />
                            Industrial Infrastructure Hub
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                            Concrete Production Engine
                            <span className="text-sm font-bold bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full border border-amber-500/20">Live Production</span>
                        </h1>
                        <p className="mt-4 text-slate-500 font-bold flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {activeYard?.name} • {activeYard?.location}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {yards.map(yard => (
                            <button 
                                key={yard.id}
                                onClick={() => setActiveYardId(yard.id)}
                                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeYardId === yard.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'}`}
                            >
                                {yard.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Stats Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Inventory Value', value: 'KES 8.2M', sub: '+12% from last cast', icon: TrendingUp, color: 'emerald' },
                        { label: 'Batches Curing', value: '1,200 Units', sub: 'Ready in 14 days', icon: Clock, color: 'amber' },
                        { label: 'Quality Pass Rate', value: '99.4%', sub: 'Based on last 50 batches', icon: ShieldCheck, color: 'indigo' },
                        { label: 'Pending Logistics', value: '3 Trucks', sub: 'Project A104', icon: Truck, color: 'slate' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{stat.label}</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">{stat.value}</h3>
                                <p className="text-xs font-bold text-slate-500">{stat.sub}</p>
                            </div>
                            <stat.icon className={`absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-all transform group-hover:scale-110 group-hover:-rotate-12 text-${stat.color}-500`} />
                        </div>
                    ))}
                </div>

                {/* Main Production Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Catalog & Inventory */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <PackageCheck className="w-6 h-6 text-amber-500" />
                                    Product Catalog
                                </h2>
                                <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                                    <PlusCircle className="w-4 h-4" /> New Specification
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {products.map(product => (
                                    <div key={product.id} className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-amber-500 transition-all group cursor-pointer">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                                                {product.productType === 'Block' && <Layers className="w-8 h-8" />}
                                                {product.productType === 'Kerb' && <Box className="w-8 h-8" />}
                                                {product.productType === 'Culvert' && <Dna className="w-8 h-8" />}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.productType}</div>
                                                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{product.name}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900">
                                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Stock Level</div>
                                                <div className="text-xl font-black text-slate-900 dark:text-white">{product.currentStock.toLocaleString()}</div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900">
                                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Strength</div>
                                                <div className="text-xl font-black text-slate-900 dark:text-white">{product.strengthRating}</div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div className="text-lg font-black text-slate-900 dark:text-white">KES {product.unitPrice} <span className="text-[10px] text-slate-400 uppercase tracking-widest">/ unit</span></div>
                                            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Project Sales Tracker */}
                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 transform scale-150 rotate-12 opacity-5 pointer-events-none">
                                <BarChart3 className="w-64 h-64 text-white" />
                            </div>
                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <h2 className="text-2xl font-black flex items-center gap-3">
                                    <ScrollText className="w-6 h-6 text-indigo-400" />
                                    B2B Project Contracts
                                </h2>
                                <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Export Report</button>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {sales.map(sale => (
                                    <div key={sale.id} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6 group/item hover:bg-white/[0.08] transition-all">
                                        <div className="flex items-center gap-6 w-full md:w-auto">
                                            <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-500 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-indigo-500/20">
                                                {sale.projectName?.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black uppercase tracking-tight">{sale.projectName}</h4>
                                                <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" /> {new Date(sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex justify-around w-full border-y md:border-y-0 md:border-x border-white/10 py-4 md:py-0 px-8 text-center">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Contract Total</p>
                                                <p className="text-2xl font-black tracking-tighter">KES {sale.totalAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Logistics</p>
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${sale.deliveryStatus === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${sale.deliveryStatus === 'delivered' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                                    {sale.deliveryStatus}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full md:w-auto">
                                            <button className="w-full px-8 py-4 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20">Manage Contract</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quality & Batch Logic Sidebar */}
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm sticky top-10">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <HardHat className="w-6 h-6 text-amber-500" />
                                    Curing Monitor
                                </h2>
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <Hammer className="w-5 h-5 text-slate-400" />
                                </div>
                            </div>

                            <p className="text-xs font-bold text-slate-500 leading-relaxed mb-8">
                                Concrete structural integrity increases by day. Monitoring curing status is critical for safety compliance.
                            </p>

                            <div className="space-y-6">
                                {batches.map(batch => (
                                    <div key={batch.id} className="group cursor-pointer">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="text-xs font-black text-slate-900 dark:text-white mb-0.5">{batch.batchNumber}</div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{products.find(p => p.id === batch.productId)?.name}</div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${batch.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {batch.status}
                                            </span>
                                        </div>
                                        
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${batch.status === 'ready' ? 'w-full bg-emerald-500' : 'w-2/3 bg-indigo-500'}`}
                                            ></div>
                                        </div>

                                        <div className="flex justify-between items-center py-2">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cast Units</div>
                                                    <div className="text-sm font-black text-slate-700 dark:text-slate-300">{batch.quantityCast}</div>
                                                </div>
                                                <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-800"></div>
                                                <div className="text-center">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Strength</div>
                                                    <div className="text-sm font-black text-emerald-600 font-black">{batch.strengthTestResult || 'Testing...'}</div>
                                                </div>
                                            </div>
                                            {batch.status === 'curing' && (
                                                <div className="text-[9px] font-black text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
                                                    <Activity className="w-3 h-3 animate-pulse" /> +14d Left
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-10 py-5 bg-amber-500 text-slate-950 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 active:scale-95">
                                Start Production Run
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CivilWorksDashboard;
