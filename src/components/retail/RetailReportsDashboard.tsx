import React, { useState, useEffect } from 'react';
import { RetailInventoryItem, RetailSale, RetailCommissionLedger, User, RetailStore, MpesaConfig, Institution } from '../../types';
import { apiService } from '../../services/apiService';
import * as pdfService from '../../services/pdfService';
import { GridIcon as LayoutDashboard } from '../icons/GridIcon';
import { ArrowTrendingUpIcon as TrendingUp } from '../icons/ArrowTrendingUpIcon';
import { DocumentMagnifyingGlassIcon as PackageSearch } from '../icons/DocumentMagnifyingGlassIcon';
import { UsersIcon as Users } from '../icons/UsersIcon';
import { CurrencyIcon as DollarSign } from '../icons/CurrencyIcon';
import { ShoppingCartIcon as ShoppingCart } from '../icons/ShoppingCartIcon';
import { ExclamationTriangleIcon as AlertTriangle } from '../icons/ExclamationTriangleIcon';
import { BarChart3Icon as BarChart3 } from '../icons/BarChart3Icon';
import { ArrowUpRightIcon as ArrowUpRight } from '../icons/ArrowUpRightIcon';
import { ArrowDownRightIcon as ArrowDownRight } from '../icons/ArrowDownRightIcon';
import { FileTextIcon as FileText } from '../icons/FileTextIcon';
import { CalendarDaysIcon as Calendar } from '../icons/CalendarDaysIcon';
import { MagnifyingGlassIcon as Search } from '../icons/MagnifyingGlassIcon';
import { EyeIcon as Eye } from '../icons/EyeIcon';
import { EnvelopeIcon as Mail } from '../icons/EnvelopeIcon';
import { FunnelIcon as Filter } from '../icons/FunnelIcon';
import { StoreIcon as StoreIcon } from '../icons/StoreIcon';
import { UserIcon } from '../icons/UserIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';

interface RetailReportsDashboardProps {
    institutionId: string;
    users: User[];
    isEducation?: boolean;
}

export function RetailReportsDashboard({ institutionId, users, isEducation }: RetailReportsDashboardProps) {
    const [activeTab, setActiveTab] = useState<'revenue' | 'inventory' | 'agents' | 'statements' | 'inventory_reports'>('revenue');
    const [isLoading, setIsLoading] = useState(true);
    const [institution, setInstitution] = useState<Institution | null>(null);

    // Data State
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [inventory, setInventory] = useState<RetailInventoryItem[]>([]);
    const [commissions, setCommissions] = useState<RetailCommissionLedger[]>([]);
    const [stores, setStores] = useState<RetailStore[]>([]);

    useEffect(() => {
        const fetchReportData = async () => {
            setIsLoading(true);
            try {
                const [salesData, invData, commData, storesData, insts] = await Promise.all([
                    apiService.fetchModuleRecords<RetailSale>('retail_sales', institutionId),
                    apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId),
                    apiService.fetchModuleRecords<RetailCommissionLedger>('retail_commission_ledger', institutionId),
                    apiService.fetchModuleRecords<RetailStore>('retail_stores', institutionId),
                    apiService.fetchInstitutions(institutionId)
                ]);

                const instData = insts[0] || null;

                // Sort sales by newest first for better processing
                setSales(salesData.sort((a: RetailSale, b: RetailSale) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                }));
                setInventory(invData);
                setCommissions(commData);
                setStores(storesData);
                setInstitution(instData);
            } catch (error) {
                console.error("Failed to fetch retail reports data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReportData();
    }, [institutionId]);

    // --- REVENUE Calculations ---
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalSalesCount = sales.length;
    const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    // Top products
    const productSalesCount: Record<string, { name: string, qty: number, revenue: number }> = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSalesCount[item.itemId]) {
                productSalesCount[item.itemId] = { name: item.name, qty: 0, revenue: 0 };
            }
            productSalesCount[item.itemId].qty += item.quantity;
            productSalesCount[item.itemId].revenue += (item.unitPrice * item.quantity);
        });
    });

    const topProducts = Object.values(productSalesCount)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // --- INVENTORY Calculations ---
    const totalInventoryItems = inventory.length;
    const totalInventoryUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate values (Cost VS SRP)
    const totalCostValue = inventory.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalRetailValue = inventory.reduce((sum, item) => sum + (item.srpPrice * item.quantity), 0);
    const projectedProfit = totalRetailValue - totalCostValue;

    const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel);

    // --- AGENT Calculations ---
    const agentStats: Record<string, { name: string, salesCount: number, totalRevenue: number, totalCommission: number, pendingCommission: number }> = {};

    // Initialize agents
    users.filter(u => u.role === 'teacher' || u.role === 'lecturer').forEach(agent => {
        agentStats[agent.id] = {
            name: agent.name,
            salesCount: 0,
            totalRevenue: 0,
            totalCommission: 0,
            pendingCommission: 0
        };
    });

    // Add sales data
    sales.forEach(sale => {
        if (sale.agentId && agentStats[sale.agentId]) {
            agentStats[sale.agentId].salesCount += 1;
            agentStats[sale.agentId].totalRevenue += sale.totalAmount;
        }
    });

    // Add commission data
    commissions.forEach(comm => {
        if (agentStats[comm.agentId]) {
            agentStats[comm.agentId].totalCommission += comm.commissionAmount;
            if (!comm.isPaid) {
                agentStats[comm.agentId].pendingCommission += comm.commissionAmount;
            }
        }
    });

    const activeAgents = Object.values(agentStats)
        .filter(stat => stat.salesCount > 0 || stat.totalCommission > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // --- SALES STATEMENTS MANAGER COMPONENT ---
    const SalesStatementsManager = () => {
        const [targetType, setTargetType] = useState<'general' | 'store' | 'agent' | 'student' | 'teacher'>('general');
        const [targetId, setTargetId] = useState('');
        const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
        const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
        const [isProcessing, setIsProcessing] = useState(false);

        const getFilteredSales = () => {
            return sales.filter(s => {
                const date = s.createdAt.split('T')[0];
                const inRange = date >= startDate && date <= endDate;
                if (!inRange) return false;

                if (targetType === 'store' && targetId) return s.storeId === targetId;
                if (targetType === 'agent' && targetId) return s.agentId === targetId;
                if (targetType === 'student' && targetId) {
                    return (s as any).metadata?.studentId === targetId || s.customerId === targetId;
                }
                if (targetType === 'teacher' && targetId) {
                    return (s as any).metadata?.studentId === targetId || s.customerId === targetId;
                }
                return true;
            });
        };

        const filteredSales = getFilteredSales();

        const handlePreview = async () => {
            if (targetType !== 'general' && !targetId) {
                alert(`Please select a ${targetType === 'store' ? (isEducation ? 'department' : 'store') : targetType === 'student' ? 'student' : targetType === 'teacher' ? 'teacher' : 'agent'}`);
                return;
            }
            if (!institution) return;

            try {
                setIsProcessing(true);
                const targetObj = targetType === 'store' 
                    ? stores.find(s => s.id === targetId) 
                    : targetType === 'student' || targetType === 'teacher' || targetType === 'agent'
                    ? users.find(u => u.id === targetId) 
                    : null;
                
                const dataUri = await pdfService.generateRetailSalesStatementPdf(
                    targetType,
                    targetObj as any,
                    filteredSales,
                    startDate,
                    endDate,
                    institution
                );

                // More reliable preview using Blobs
                const blob = await (await fetch(dataUri)).blob();
                const previewUrl = URL.createObjectURL(blob);
                window.open(previewUrl);
            } catch (err: any) {
                alert("Failed to generate PDF: " + err.message);
            } finally {
                setIsProcessing(false);
            }
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Controls */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Report Type</label>
                            <div className="grid grid-cols-1 gap-1 bg-slate-100 dark:bg-slate-900 rounded-2xl p-1">
                                <button onClick={() => { setTargetType('general'); setTargetId(''); }} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'general' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>General</button>
                                {isEducation ? (
                                    <>
                                        <button onClick={() => { setTargetType('store'); setTargetId(''); }} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'store' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Per Department</button>
                                        <button onClick={() => { setTargetType('student'); setTargetId(''); }} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'student' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm' : 'text-slate-400'}`}>Per Student</button>
                                        <button onClick={() => { setTargetType('teacher'); setTargetId(''); }} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'teacher' ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm' : 'text-slate-400'}`}>Per Teacher</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setTargetType('store'); setTargetId(''); }} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'store' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Per Store</button>
                                        <button onClick={() => { setTargetType('agent'); setTargetId(''); }} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'agent' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm' : 'text-slate-400'}`}>Per Agent</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {targetType !== 'general' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                                    Select {targetType === 'store' ? (isEducation ? 'Department' : 'Store') : targetType === 'student' ? 'Student' : targetType === 'teacher' ? 'Teacher' : 'Agent'}
                                </label>
                                <select 
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold outline-none transition-all text-sm appearance-none"
                                >
                                    <option value="">--- Select {targetType === 'store' ? (isEducation ? 'Department' : 'Store') : targetType === 'student' ? 'Student' : targetType === 'teacher' ? 'Teacher' : 'Agent'} ---</option>
                                    {targetType === 'store' ? (
                                        stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                    ) : targetType === 'student' ? (
                                        users.filter(u => u.role === 'student').map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} {u.admissionNumber ? `(${u.admissionNumber})` : (u as any).admission_number ? `(${(u as any).admission_number})` : ''}
                                            </option>
                                        ))
                                    ) : targetType === 'teacher' ? (
                                        users.filter(u => u.role === 'teacher').map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.name}
                                            </option>
                                        ))
                                    ) : (
                                        Object.values(agentStats).map(a => {
                                            const u = users.find(user => user.name === a.name);
                                            return <option key={u?.id} value={u?.id}>{a.name}</option>
                                        })
                                    )}
                                </select>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold outline-none transition-all text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold outline-none transition-all text-sm" />
                            </div>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button 
                                onClick={handlePreview}
                                disabled={isProcessing}
                                className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                                Preview Statement
                            </button>
                            <button 
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <Mail className="w-4 h-4" /> Email Statement
                            </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Transaction Preview</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                                    {startDate} to {endDate} • {filteredSales.length} Transactions
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">
                                    {isEducation ? 'Total Issued Value' : 'Total Revenue'}
                                </p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white italic">KES {filteredSales.reduce((acc, s) => acc + s.totalAmount, 0)?.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto max-h-[600px]">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 z-10">
                                    <tr>
                                        <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                        <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                                        <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount (Credit)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filteredSales.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="p-6 text-[10px] font-bold text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td className="p-6">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic">
                                                    {isEducation ? 'Issuance' : 'Sale'} - {t.customerName || 'Walk-in Customer'}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{t.items.length} items • {stores.find(s => s.id === t.storeId)?.name || 'N/A'}</p>
                                            </td>
                                            <td className="p-6">
                                                <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest">{t.paymentMethod}</span>
                                            </td>
                                            <td className="p-6 text-right text-sm font-black text-emerald-600 italic">
                                                KES {t.totalAmount?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredSales.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No transactions found for this period</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const InventoryReportsManager = () => {
        const [filterStoreId, setFilterStoreId] = useState('');
        const [isFiltering, setIsFiltering] = useState(false);
        
        const filteredInventory = filterStoreId 
            ? inventory.filter(item => {
                // Simplified: In a real scenario we'd check shop_id or mapping
                return true; 
              })
            : inventory;

        const handleDownloadReport = async () => {
            if (!institution) return;
            try {
                setIsFiltering(true);
                const dataUri = await pdfService.generateRetailInventoryReportPdf(
                    filteredInventory,
                    stores,
                    institution
                );
                
                // More reliable preview using Blobs
                const blob = await (await fetch(dataUri)).blob();
                const previewUrl = URL.createObjectURL(blob);
                window.open(previewUrl);
            } catch (err: any) {
                alert("Failed to generate report: " + err.message);
            } finally {
                setIsFiltering(false);
            }
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Total Inventory Value (SRP)</p>
                        <h3 className="text-3xl font-black italic">KES {totalRetailValue?.toLocaleString()}</h3>
                        <p className="text-[10px] font-bold text-indigo-100 uppercase mt-4">Across {totalInventoryUnits} units</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Asset Cost</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white italic">KES {totalCostValue?.toLocaleString()}</h3>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-4">Margin: {((projectedProfit/totalRetailValue)*100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Critical Stock Alerts</p>
                        <h3 className="text-3xl font-black text-rose-600 italic">{lowStockItems.length}</h3>
                        <p className="text-[10px] font-bold text-rose-400 uppercase mt-4">Items below reorder level</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Inventory Valuation Report</h3>
                        <div className="flex gap-4">
                            <select 
                                value={filterStoreId}
                                onChange={(e) => setFilterStoreId(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none"
                            >
                                <option value="">All Stores</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button 
                                onClick={handleDownloadReport}
                                disabled={isFiltering}
                                className="p-3 bg-slate-900 text-white rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                            >
                                {isFiltering ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <FileText className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item / SKU</th>
                                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Unit Cost</th>
                                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Unit SRP</th>
                                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {filteredInventory.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="p-6">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{item.sku}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[8px] font-black uppercase tracking-widest">{item.category}</span>
                                        </td>
                                        <td className="p-6 font-bold">
                                            <span className={`px-2 py-1 rounded-lg text-xs ${item.quantity <= item.reorderLevel ? 'bg-rose-50 text-rose-600' : 'text-slate-600'}`}>
                                                {item.quantity} {item.unit}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right text-xs font-bold text-slate-400 italic">KES {item.costPrice?.toLocaleString()}</td>
                                        <td className="p-6 text-right text-xs font-bold text-indigo-600 italic">KES {item.srpPrice?.toLocaleString()}</td>
                                        <td className="p-6 text-right text-sm font-black text-slate-900 dark:text-white italic">KES {(item.srpPrice * item.quantity)?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-indigo-600" />
                    {isEducation ? 'Store & Issuance Reports' : 'Business Analytics'}
                </h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {isEducation ? 'School Store Insights & Transaction Statements' : 'Real-time Retail Insights'}
                </p>
            </div>

            {/* Navigation */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                <button
                    onClick={() => setActiveTab('revenue')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'revenue' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <TrendingUp className="w-4 h-4" /> Overview
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <PackageSearch className="w-4 h-4" /> Stock Alerts
                </button>
                {!isEducation && (
                    <button
                        onClick={() => setActiveTab('agents')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'agents' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-indigo-500'}`}
                    >
                        <Users className="w-4 h-4" /> Agent Ranking
                    </button>
                )}
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-2"></div>
                <button
                    onClick={() => setActiveTab('statements')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'statements' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <FileText className="w-4 h-4" /> {isEducation ? 'Student/Teacher Statements' : 'Sales Statements'}
                </button>
                <button
                    onClick={() => setActiveTab('inventory_reports')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'inventory_reports' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <BarChart3 className="w-4 h-4" /> Full Inventory Report
                </button>
            </div>

            {/* Content Area */}
            <div className="animate-fade-in-up">

                {/* ----------------- REVENUE TAB ----------------- */}
                {activeTab === 'revenue' && (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Gross Revenue</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">KES {totalRevenue?.toLocaleString()}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        <ArrowUpRight className="w-3 h-3" /> +12.5% this week
                                    </div>
                                </div>
                                <DollarSign className="w-32 h-32 absolute -right-6 -bottom-6 text-slate-50 opacity-50 group-hover:scale-110 transition-transform" />
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Orders</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalSalesCount}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        <ShoppingCart className="w-3 h-3" /> completed transactions
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Average Order Value (AOV)</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">KES {averageOrderValue.toFixed(2)}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        <ArrowDownRight className="w-3 h-3" /> -2.1% this week
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Top Performing Products</h3>

                            {topProducts.length === 0 ? (
                                <p className="text-sm font-bold text-slate-400 text-center py-10">No sales data available yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {topProducts.map((prod, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{prod.name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{prod.qty} units sold</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 dark:text-white">KES {prod.revenue?.toLocaleString()}</p>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Revenue</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ----------------- INVENTORY TAB ----------------- */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-6 rounded-3xl shadow-xl relative overflow-hidden group text-white">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Total Retail Value</p>
                                    <h3 className="text-3xl font-black">KES {totalRetailValue?.toLocaleString()}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-indigo-900 bg-white w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        Projected Profit: KES {projectedProfit?.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Cost Basis</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">KES {totalCostValue?.toLocaleString()}</h3>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Stock Holding</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalInventoryUnits}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">across {totalInventoryItems} distinct items</p>
                            </div>
                        </div>

                        {/* Low Stock Alerts */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-rose-100 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Requires Immediate Reorder</h3>
                            </div>

                            {lowStockItems.length === 0 ? (
                                <p className="text-sm font-bold text-emerald-600 bg-emerald-50 p-4 rounded-xl text-center">All inventory stock levels are healthy.</p>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Product SKU</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Qty</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Reorder Threshold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {lowStockItems.map(item => (
                                            <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4">
                                                    <p className="font-bold text-slate-900">{item.name}</p>
                                                    <p className="text-xs font-mono text-slate-500">{item.sku}</p>
                                                </td>
                                                <td className="py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                                                        {item.quantity} {item.unit}
                                                    </span>
                                                </td>
                                                <td className="py-4 font-medium text-slate-500">
                                                    {item.reorderLevel} {item.unit}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ----------------- AGENT PERFORMANCE TAB ----------------- */}
                {activeTab === 'agents' && (
                    <div className="space-y-6">

                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8 overflow-hidden">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Agent Sales Leaderboard</h3>

                            {activeAgents.length === 0 ? (
                                <p className="text-sm font-bold text-slate-400 text-center py-10">No agent sales activity found.</p>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Agent Name</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Sales Closed</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Attributed Revenue</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Commissions Unpaid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {activeAgents.map((agent, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4 flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-900">{agent.name}</span>
                                                </td>
                                                <td className="py-4 font-medium text-slate-600">
                                                    {agent.salesCount} Deals
                                                </td>
                                                <td className="py-4 font-black text-teal-600 text-right">
                                                    KES {agent.totalRevenue?.toLocaleString()}
                                                </td>
                                                <td className="py-4 text-right">
                                                    {agent.pendingCommission > 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-600">
                                                            KES {agent.pendingCommission?.toLocaleString()} Pend.
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm font-medium">KES 0.00</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                    </div>
                )}

                {/* ----------------- STATEMENTS TAB ----------------- */}
                {activeTab === 'statements' && <SalesStatementsManager />}

                {/* ----------------- INVENTORY REPORTS TAB ----------------- */}
                {activeTab === 'inventory_reports' && <InventoryReportsManager />}
            </div>
        </div>
    );
}

