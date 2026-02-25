import React, { useState, useEffect, useRef } from 'react';
import type { User, Institution, CarWashPackage, CarWashCustomer, CarWashVehicle, CarWashJob, CarWashInventoryItem, CarWashFeedback, CarWashShiftLog, CarWashVehicleType, CarWashPaymentMethod } from '../types';
import { apiService } from '../services/apiService';
import { PlusIcon, XIcon, CheckCircleIcon, SparklesIcon, UserGroupIcon, ChartBarIcon, Cog8ToothIcon, ArchiveBoxIcon, StarIcon, UserIcon, ArrowPathIcon, ClockIcon, CurrencyIcon, ChartPieIcon, TrashIcon, EyeIcon, SearchIcon, EnvelopeIcon } from './icons/index';
import { CommunicationsManager } from './CommunicationsManager';

const VEHICLE_TYPES: CarWashVehicleType[] = ['Sedan', 'SUV', 'Truck', 'Matatu', 'Motorbike', 'Van', 'Bus'];
const PAYMENT_METHODS: CarWashPaymentMethod[] = ['cash', 'mpesa', 'card', 'credit'];
const ADD_ONS = ['Waxing', 'Interior Vacuum', 'Tire Dressing', 'Engine Wash', 'Seat Shampoo', 'Odor Removal'];
const PACKAGE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface CarWashViewProps {
    currentUser: User;
    currentInstitution: Institution;
    users: User[];
    onDataChange: () => void;
    onSendSms: (recipient: string, message: string, config?: any, units?: number, institutionId?: string) => Promise<any>;
    onAddTransaction?: (data: any, items: any[]) => Promise<any>;
    smsConfig?: any;
    smsBalance?: number;
    mpesaConfig?: any;
    departments?: any[];
    courses?: any[];
}

export const CarWashView: React.FC<CarWashViewProps> = ({
    currentUser, currentInstitution, users, onDataChange,
    onSendSms, onAddTransaction, smsConfig, smsBalance, mpesaConfig, departments, courses
}) => {
    const institutionId = currentInstitution.id;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'customers' | 'services' | 'inventory' | 'staff' | 'reports' | 'feedback' | 'broadcast' | 'transactions'>('dashboard');

    const [packages, setPackages] = useState<CarWashPackage[]>([]);
    const [customers, setCustomers] = useState<CarWashCustomer[]>([]);
    const [vehicles, setVehicles] = useState<CarWashVehicle[]>([]);
    const [jobs, setJobs] = useState<CarWashJob[]>([]);
    const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
    const [inventory, setInventory] = useState<CarWashInventoryItem[]>([]);
    const [feedbacks, setFeedbacks] = useState<CarWashFeedback[]>([]);
    const [shifts, setShifts] = useState<CarWashShiftLog[]>([]);
    const [loading, setLoading] = useState(true);

    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
    const [showNewPackageModal, setShowNewPackageModal] = useState(false);
    const [showNewInventoryModal, setShowNewInventoryModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState<CarWashJob | null>(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState<CarWashJob | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [pkgs, custs, vehs, jobList, inv, fbs, shiftList] = await Promise.all([
                apiService.fetchModuleRecords<CarWashPackage>('carwash_packages', institutionId),
                apiService.fetchModuleRecords<CarWashCustomer>('carwash_customers', institutionId),
                apiService.fetchModuleRecords<CarWashVehicle>('carwash_vehicles', institutionId),
                apiService.fetchModuleRecords<CarWashJob>('carwash_jobs', institutionId),
                apiService.fetchModuleRecords<MpesaTransaction>('mpesa_transactions', institutionId),
                apiService.fetchModuleRecords<CarWashInventoryItem>('carwash_inventory', institutionId),
                apiService.fetchModuleRecords<CarWashFeedback>('carwash_feedback', institutionId),
                apiService.fetchModuleRecords<CarWashShiftLog>('carwash_shifts', institutionId),
            ]);
            setPackages(pkgs || []);
            setCustomers(custs || []);
            setVehicles(vehs || []);
            setJobs(jobList || []);
            setTransactions(trans || []);
            setInventory(inv || []);
            setFeedbacks(fbs || []);
            setShifts(shiftList || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [institutionId]);

    const todayJobs = jobs.filter(j => j.createdAt?.startsWith(new Date().toISOString().split('T')[0]));
    const todayRevenue = todayJobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.amountPaid || 0), 0);
    const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'in_progress');
    const lowStock = inventory.filter(i => i.currentStock <= i.reorderLevel);
    const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '—';

    const attendants = users.filter(u => u.role === 'admin' || u.role === 'lecturer' || u.role === 'head_teacher');

    // ── New Job Modal State ──
    const [jobForm, setJobForm] = useState({ vehiclePlate: '', vehicleType: 'Sedan' as CarWashVehicleType, packageId: '', addOns: [] as string[], attendantId: '', bayNumber: 1, paymentMethod: 'cash' as CarWashPaymentMethod, customerId: '' });
    const handleCreateJob = async () => {
        if (!jobForm.packageId) return alert('Select a package');
        const pkg = packages.find(p => p.id === jobForm.packageId);
        if (!pkg) return;
        const price = pkg.pricing[jobForm.vehicleType] || 0;
        const job: CarWashJob = {
            id: `cwj_${Date.now()}`, institutionId, vehiclePlate: jobForm.vehiclePlate.toUpperCase(), vehicleType: jobForm.vehicleType,
            packageId: jobForm.packageId, packageName: pkg.name, addOns: jobForm.addOns,
            attendantId: jobForm.attendantId, attendantName: attendants.find(a => a.id === jobForm.attendantId)?.name,
            bayNumber: jobForm.bayNumber, status: 'queued', paymentMethod: jobForm.paymentMethod,
            amountCharged: price, amountPaid: 0, isLoyaltyRedemption: false, createdAt: new Date().toISOString(),
            customerId: jobForm.customerId || undefined,
        };
        await apiService.saveModuleRecord('carwash_jobs', job);
        setShowNewJobModal(false); setJobForm({ vehiclePlate: '', vehicleType: 'Sedan', packageId: '', addOns: [], attendantId: '', bayNumber: 1, paymentMethod: 'cash', customerId: '' });
        loadData();
    };

    const updateJobStatus = async (job: CarWashJob, status: CarWashJob['status']) => {
        if (status === 'completed') {
            setShowCheckoutModal(job);
            return;
        }

        const updated: CarWashJob = { ...job, status, ...(status === 'in_progress' ? { startedAt: new Date().toISOString() } : {}) };
        await apiService.saveModuleRecord('carwash_jobs', updated);
        loadData();
    };

    const handleCheckout = async (job: CarWashJob, method: CarWashPaymentMethod) => {
        setIsProcessingPayment(true);
        try {
            const customer = customers.find(c => c.id === job.customerId);

            if (method === 'mpesa' && onAddTransaction) {
                // Initiate STK Push
                await onAddTransaction({
                    amount: job.amountCharged,
                    phoneNumber: customer?.phoneNumber || '',
                    description: `Car Wash: ${job.packageName} - ${job.vehiclePlate}`,
                    institutionId,
                    userId: currentUser.id
                }, [
                    { name: job.packageName, quantity: 1, unitPrice: job.amountCharged, total: job.amountCharged }
                ]);
            }

            const updated: CarWashJob = {
                ...job,
                status: 'completed',
                paymentMethod: method,
                completedAt: new Date().toISOString(),
                amountPaid: job.amountCharged
            };

            await apiService.saveModuleRecord('carwash_jobs', updated);
            setShowCheckoutModal(null);
            setShowFeedbackModal(updated);

            // Automated SMS Notification
            if (customer && customer.phoneNumber) {
                const message = `Hello ${customer.name}, your ${job.packageName} for vehicle ${job.vehiclePlate} is ready! Amount: KES ${job.amountCharged.toLocaleString()}. Thank you for choosing ${currentInstitution.name}.`;
                try {
                    await onSendSms(customer.phoneNumber, message, smsConfig, 1, institutionId);
                } catch (e) {
                    console.error('Failed to send automated car wash SMS', e);
                }
            }
            loadData();
        } catch (e: any) {
            alert(e.message || 'Checkout failed');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // ── Customer Form ──
    const [custForm, setCustForm] = useState({ name: '', phoneNumber: '', email: '', plateNumber: '', make: '', model: '', color: '', vehicleType: 'Sedan' as CarWashVehicleType });
    const handleCreateCustomer = async () => {
        const cust: CarWashCustomer = { id: `cwc_${Date.now()}`, institutionId, name: custForm.name, phoneNumber: custForm.phoneNumber, email: custForm.email, loyaltyStamps: 0, stampsForFreeWash: 10, createdAt: new Date().toISOString() };
        await apiService.saveModuleRecord('carwash_customers', cust);
        if (custForm.plateNumber) {
            const veh: CarWashVehicle = { id: `cwv_${Date.now()}`, institutionId, customerId: cust.id, plateNumber: custForm.plateNumber.toUpperCase(), make: custForm.make, model: custForm.model, color: custForm.color, vehicleType: custForm.vehicleType };
            await apiService.saveModuleRecord('carwash_vehicles', veh);
        }
        setShowNewCustomerModal(false); setCustForm({ name: '', phoneNumber: '', email: '', plateNumber: '', make: '', model: '', color: '', vehicleType: 'Sedan' });
        loadData();
    };

    // ── Package Form ──
    const [pkgForm, setPkgForm] = useState({ name: '', description: '', pricing: {} as Partial<Record<CarWashVehicleType, number>>, estimatedMinutes: 30, includesInterior: false, color: PACKAGE_COLORS[0] });
    const handleCreatePackage = async () => {
        if (!pkgForm.name) return;
        const pkg: CarWashPackage = { id: `cwp_${Date.now()}`, institutionId, name: pkgForm.name, description: pkgForm.description, pricing: pkgForm.pricing, estimatedMinutes: pkgForm.estimatedMinutes, includesInterior: pkgForm.includesInterior, isActive: true, color: pkgForm.color };
        await apiService.saveModuleRecord('carwash_packages', pkg);
        setShowNewPackageModal(false); setPkgForm({ name: '', description: '', pricing: {}, estimatedMinutes: 30, includesInterior: false, color: PACKAGE_COLORS[0] });
        loadData();
    };

    // ── Inventory Form ──
    const [invForm, setInvForm] = useState({ name: '', unit: 'litres', currentStock: 0, reorderLevel: 5, costPerUnit: 0, category: 'chemical' as CarWashInventoryItem['category'] });
    const handleCreateInventory = async () => {
        if (!invForm.name) return;
        const item: CarWashInventoryItem = { id: `cwi_${Date.now()}`, institutionId, ...invForm };
        await apiService.saveModuleRecord('carwash_inventory', item);
        setShowNewInventoryModal(false); setInvForm({ name: '', unit: 'litres', currentStock: 0, reorderLevel: 5, costPerUnit: 0, category: 'chemical' });
        loadData();
    };

    // ── Feedback Form ──
    const [fbRating, setFbRating] = useState(5); const [fbComment, setFbComment] = useState('');
    const handleSubmitFeedback = async () => {
        if (!showFeedbackModal) return;
        const fb: CarWashFeedback = { id: `cwf_${Date.now()}`, institutionId, jobId: showFeedbackModal.id, customerId: showFeedbackModal.customerId, rating: fbRating, comment: fbComment, submittedAt: new Date().toISOString() };
        await apiService.saveModuleRecord('carwash_feedback', fb);
        setShowFeedbackModal(null); setFbRating(5); setFbComment('');
        loadData();
    };

    const inputCls = 'w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-semibold outline-none transition-all';
    const labelCls = 'block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1 tracking-widest';

    const statusColor: Record<CarWashJob['status'], string> = { queued: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon className="w-4 h-4" /> },
        { id: 'queue', label: 'Queue & Bays', icon: <ClockIcon className="w-4 h-4" /> },
        { id: 'customers', label: 'Customers', icon: <UserGroupIcon className="w-4 h-4" /> },
        { id: 'services', label: 'Services', icon: <SparklesIcon className="w-4 h-4" /> },
        { id: 'inventory', label: 'Inventory', icon: <ArchiveBoxIcon className="w-4 h-4" /> },
        { id: 'staff', label: 'Staff', icon: <UserIcon className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-4 h-4" /> },
        { id: 'feedback', label: 'Feedback', icon: <StarIcon className="w-4 h-4" /> },
        { id: 'broadcast', label: 'Broadcast', icon: <EnvelopeIcon className="w-4 h-4" /> },
        { id: 'transactions', label: 'Bills & Payments', icon: <CurrencyIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 px-8 py-6 flex items-center justify-between shadow-xl">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">🚗 {currentInstitution.name}</h1>
                    <p className="text-xs font-bold text-cyan-200 uppercase tracking-widest mt-0.5">Car Wash Management System</p>
                </div>
                <div className="flex items-center gap-3">
                    {lowStock.length > 0 && <span className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase rounded-full animate-pulse">{lowStock.length} Low Stock</span>}
                    <span className="px-3 py-1.5 bg-white/20 text-white text-[10px] font-black uppercase rounded-full">{activeJobs.length} Active Jobs</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 flex overflow-x-auto gap-1 scrollbar-hide">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-4 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeTab === t.id ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
                {loading && <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>}

                {/* DASHBOARD */}
                {!loading && activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "Today's Revenue", value: `KES ${todayRevenue.toLocaleString()}`, sub: `${todayJobs.filter(j => j.status === 'completed').length} washes`, color: 'from-emerald-500 to-teal-600' },
                                { label: 'Active Queue', value: activeJobs.length, sub: `${jobs.filter(j => j.status === 'in_progress').length} in bays`, color: 'from-blue-500 to-cyan-600' },
                                { label: 'Total Customers', value: customers.length, sub: `${vehicles.length} vehicles registered`, color: 'from-violet-500 to-purple-600' },
                                { label: 'Avg Rating', value: `${avgRating} ★`, sub: `${feedbacks.length} reviews`, color: 'from-amber-500 to-orange-600' },
                            ].map(card => (
                                <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-3xl p-6 text-white shadow-lg`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{card.label}</p>
                                    <p className="text-3xl font-black mt-1">{card.value}</p>
                                    <p className="text-xs font-bold opacity-70 mt-1">{card.sub}</p>
                                </div>
                            ))}
                        </div>
                        {lowStock.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                                <h3 className="text-sm font-black uppercase text-red-700 mb-3">⚠️ Low Stock Alerts</h3>
                                <div className="flex flex-wrap gap-2">{lowStock.map(i => <span key={i.id} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg">{i.name} — {i.currentStock} {i.unit} left</span>)}</div>
                            </div>
                        )}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-black uppercase text-slate-700 dark:text-white mb-4">Recent Jobs</h3>
                            <div className="space-y-2">
                                {jobs.slice(0, 8).map(job => (
                                    <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">🚗</span>
                                            <div>
                                                <p className="text-sm font-black">{job.vehiclePlate}</p>
                                                <p className="text-[10px] text-slate-400">{job.packageName} · {job.vehicleType}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusColor[job.status]}`}>{job.status.replace('_', ' ')}</span>
                                            <span className="text-sm font-black text-emerald-600">KES {job.amountCharged}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* QUEUE & BAYS */}
                {!loading && activeTab === 'queue' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Live Queue</h2>
                            <button onClick={() => setShowNewJobModal(true)} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all">
                                <PlusIcon className="w-4 h-4" /> New Job
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(['queued', 'in_progress', 'completed'] as const).map(status => (
                                <div key={status} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                    <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${status === 'queued' ? 'text-amber-600' : status === 'in_progress' ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        {status === 'queued' ? '🕐 Queue' : status === 'in_progress' ? '🔄 In Bays' : '✅ Done'} ({jobs.filter(j => j.status === status && j.createdAt?.startsWith(new Date().toISOString().split('T')[0])).length})
                                    </h3>
                                    <div className="space-y-2">
                                        {jobs.filter(j => j.status === status).map(job => (
                                            <div key={job.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-black text-sm">{job.vehiclePlate}</p>
                                                        <p className="text-[10px] text-slate-400">{job.packageName} · Bay {job.bayNumber}</p>
                                                        <p className="text-[10px] text-slate-400">{job.attendantName || 'Unassigned'}</p>
                                                    </div>
                                                    <p className="font-black text-emerald-600 text-sm">KES {job.amountCharged}</p>
                                                </div>
                                                <div className="flex gap-1 mt-2">
                                                    {status === 'queued' && <button onClick={() => updateJobStatus(job, 'in_progress')} className="flex-1 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">Start</button>}
                                                    {status === 'in_progress' && <button onClick={() => updateJobStatus(job, 'completed')} className="flex-1 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">Complete</button>}
                                                    {status === 'queued' && <button onClick={() => updateJobStatus(job, 'cancelled')} className="py-1.5 px-2 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase">✕</button>}
                                                </div>
                                            </div>
                                        ))}
                                        {jobs.filter(j => j.status === status).length === 0 && <p className="text-xs text-slate-400 text-center py-4">No jobs</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CUSTOMERS */}
                {!loading && activeTab === 'customers' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Customer Registry</h2>
                            <button onClick={() => setShowNewCustomerModal(true)} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all"><PlusIcon className="w-4 h-4" /> Add Customer</button>
                        </div>
                        <div className="relative"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers or plate..." className={inputCls + ' pl-10'} /><SearchIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search)).map(cust => {
                                const custVehicles = vehicles.filter(v => v.customerId === cust.id);
                                const custJobs = jobs.filter(j => j.customerId === cust.id);
                                return (
                                    <div key={cust.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white text-xl font-black">{cust.name.charAt(0)}</div>
                                            <div>
                                                <p className="font-black text-sm">{cust.name}</p>
                                                <p className="text-xs text-slate-400">{cust.phoneNumber}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2">
                                            <span>{custVehicles.length} vehicle{custVehicles.length !== 1 ? 's' : ''}</span>
                                            <span>{custJobs.length} washes</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {Array.from({ length: 10 }).map((_, i) => <span key={i} className={`w-5 h-5 rounded-full text-center text-[10px] leading-5 font-black ${i < cust.loyaltyStamps ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-300'}`}>★</span>)}
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1">{cust.loyaltyStamps}/10 stamps for free wash</p>
                                        {custVehicles.map(v => <p key={v.id} className="text-[10px] font-mono mt-1 bg-slate-50 dark:bg-slate-900 rounded px-2 py-0.5">{v.plateNumber} · {v.make} {v.model}</p>)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SERVICES */}
                {!loading && activeTab === 'services' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Service Packages</h2>
                            <button onClick={() => setShowNewPackageModal(true)} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all"><PlusIcon className="w-4 h-4" /> New Package</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {packages.map(pkg => (
                                <div key={pkg.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="h-2" style={{ background: pkg.color || '#6366f1' }} />
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-black text-base">{pkg.name}</h3>
                                            <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{pkg.estimatedMinutes} min</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-3">{pkg.description}</p>
                                        <div className="space-y-1">
                                            {Object.entries(pkg.pricing).map(([type, price]) => (
                                                <div key={type} className="flex justify-between text-xs"><span className="font-semibold">{type}</span><span className="font-black text-emerald-600">KES {price}</span></div>
                                            ))}
                                        </div>
                                        {pkg.includesInterior && <p className="text-[9px] font-black text-cyan-600 mt-2 uppercase">✓ Includes Interior Cleaning</p>}
                                    </div>
                                </div>
                            ))}
                            {packages.length === 0 && <div className="col-span-3 text-center py-20 text-slate-400"><SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-bold">No packages yet. Add your first service.</p></div>}
                        </div>
                    </div>
                )}

                {/* INVENTORY */}
                {!loading && activeTab === 'inventory' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Consumables & Stock</h2>
                            <button onClick={() => setShowNewInventoryModal(true)} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all"><PlusIcon className="w-4 h-4" /> Add Item</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"><th className="px-5 py-4 text-left text-[10px] font-black uppercase text-slate-400">Item</th><th className="px-5 py-4 text-left text-[10px] font-black uppercase text-slate-400">Category</th><th className="px-5 py-4 text-right text-[10px] font-black uppercase text-slate-400">In Stock</th><th className="px-5 py-4 text-right text-[10px] font-black uppercase text-slate-400">Reorder At</th><th className="px-5 py-4 text-right text-[10px] font-black uppercase text-slate-400">Status</th></tr></thead>
                                <tbody>{inventory.map(item => (
                                    <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-5 py-4 font-bold">{item.name}</td>
                                        <td className="px-5 py-4 text-slate-500 capitalize">{item.category}</td>
                                        <td className="px-5 py-4 text-right font-black">{item.currentStock} {item.unit}</td>
                                        <td className="px-5 py-4 text-right text-slate-400">{item.reorderLevel} {item.unit}</td>
                                        <td className="px-5 py-4 text-right"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.currentStock <= item.reorderLevel ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.currentStock <= item.reorderLevel ? 'Low' : 'OK'}</span></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                            {inventory.length === 0 && <p className="text-center py-16 text-slate-400 font-bold">No inventory items tracked yet.</p>}
                        </div>
                    </div>
                )}

                {/* STAFF */}
                {!loading && activeTab === 'staff' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase">Attendant Performance</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attendants.map(att => {
                                const attJobs = jobs.filter(j => j.attendantId === att.id && j.status === 'completed');
                                const revenue = attJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);
                                return (
                                    <div key={att.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                        <div className="flex items-center gap-3 mb-4">
                                            {att.profilePhotoUrl ? <img src={att.profilePhotoUrl} className="w-12 h-12 rounded-2xl object-cover" alt={att.name} /> : <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white text-lg font-black">{att.name.charAt(0)}</div>}
                                            <div><p className="font-black">{att.name}</p><p className="text-xs text-slate-400 capitalize">{att.role.replace(/_/g, ' ')}</p></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center"><p className="text-2xl font-black text-cyan-600">{attJobs.length}</p><p className="text-[9px] font-black text-slate-400 uppercase">Jobs Done</p></div>
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-600">KES{(revenue / 1000).toFixed(1)}K</p><p className="text-[9px] font-black text-slate-400 uppercase">Revenue</p></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* REPORTS */}
                {!loading && activeTab === 'reports' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-black uppercase">Revenue Reports</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {[
                                { label: "Today", jobs: jobs.filter(j => j.status === 'completed' && j.createdAt?.startsWith(new Date().toISOString().split('T')[0])) },
                                { label: "This Week", jobs: jobs.filter(j => j.status === 'completed' && new Date(j.createdAt) > new Date(Date.now() - 7 * 864e5)) },
                                { label: "This Month", jobs: jobs.filter(j => j.status === 'completed' && new Date(j.createdAt).getMonth() === new Date().getMonth()) },
                            ].map(period => (
                                <div key={period.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                                    <p className="text-[10px] font-black uppercase text-slate-400">{period.label}</p>
                                    <p className="text-3xl font-black text-emerald-600 mt-1">KES {period.jobs.reduce((s, j) => s + j.amountPaid, 0).toLocaleString()}</p>
                                    <p className="text-xs font-bold text-slate-400 mt-1">{period.jobs.length} washes completed</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                            <h3 className="font-black uppercase text-sm mb-4">Revenue by Package</h3>
                            {packages.map(pkg => {
                                const pkgJobs = jobs.filter(j => j.packageId === pkg.id && j.status === 'completed');
                                const rev = pkgJobs.reduce((s, j) => s + j.amountPaid, 0);
                                const maxRev = Math.max(...packages.map(p => jobs.filter(j => j.packageId === p.id && j.status === 'completed').reduce((s, j) => s + j.amountPaid, 0)), 1);
                                return (
                                    <div key={pkg.id} className="mb-3">
                                        <div className="flex justify-between text-xs font-bold mb-1"><span>{pkg.name}</span><span className="text-emerald-600">KES {rev.toLocaleString()}</span></div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(rev / maxRev) * 100}%`, background: pkg.color || '#06b6d4' }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* FEEDBACK */}
                {!loading && activeTab === 'feedback' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black uppercase">Customer Feedback</h2>
                            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl"><span className="text-2xl font-black text-amber-600">{avgRating}</span><span className="text-xs font-bold text-amber-500 ml-1">/ 5</span></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedbacks.map(fb => (
                                <div key={fb.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                    <div className="flex items-center gap-1 mb-2">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={`text-lg ${i < fb.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>)}</div>
                                    {fb.comment && <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{fb.comment}"</p>}
                                    <p className="text-[10px] text-slate-400 mt-2">{new Date(fb.submittedAt).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {feedbacks.length === 0 && <div className="col-span-2 text-center py-16 text-slate-400"><StarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-bold">No feedback collected yet.</p></div>}
                        </div>
                    </div>
                )}

                {/* BROADCAST */}
                {!loading && activeTab === 'broadcast' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <CommunicationsManager
                            users={users}
                            departments={departments || []}
                            courses={courses || []}
                            smsConfig={smsConfig}
                            smsBalance={smsBalance}
                            onSendSms={onSendSms}
                            currentInstitution={currentInstitution}
                            currentUser={currentUser}
                        />
                    </div>
                )}

                {/* TRANSACTIONS */}
                {!loading && activeTab === 'transactions' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Financial History</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Audit log of all car wash payments</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Collected</p>
                                    <p className="text-2xl font-black text-emerald-600">KES {transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                                </div>
                                <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
                                    <p className="text-2xl font-black text-amber-500">KES {transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Transaction ID</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Details</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Date/Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                            <td className="px-8 py-5 font-mono text-xs font-bold text-slate-500 uppercase tracking-tighter">{t.transactionId || t.id.split('_').pop()}</td>
                                            <td className="px-8 py-5">
                                                <p className="font-black text-slate-700 dark:text-slate-200">{t.phoneNumber}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.description}</p>
                                            </td>
                                            <td className="px-8 py-5 font-black text-emerald-600">KES {t.amount.toLocaleString()}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-xs font-bold text-slate-400">{new Date(t.timestamp).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">No payment records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* CHECKOUT MODAL */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-700">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-8 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
                                <CurrencyIcon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Process Checkout</h3>
                            <p className="text-emerald-50 text-xs font-bold uppercase tracking-[0.2em] mt-2 opacity-80">Job ID: {showCheckoutModal.id.split('_').pop()}</p>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vehicle Summary</p>
                                    <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[10px] font-black text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700">{showCheckoutModal.vehiclePlate}</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="text-slate-500">{showCheckoutModal.packageName} ({showCheckoutModal.vehicleType})</span>
                                        <span className="text-slate-700 dark:text-white">KES {showCheckoutModal.amountCharged.toLocaleString()}</span>
                                    </div>
                                    {showCheckoutModal.addOns.map(ao => (
                                        <div key={ao} className="flex justify-between text-xs font-bold text-slate-400">
                                            <span>+ {ao}</span>
                                            <span>Included</span>
                                        </div>
                                    ))}
                                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Total Payable</span>
                                        <span className="text-2xl font-black text-emerald-600">KES {showCheckoutModal.amountCharged.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Choose Payment Method</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleCheckout(showCheckoutModal, 'cash')}
                                        disabled={isProcessingPayment}
                                        className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            <CurrencyIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">Cash</span>
                                    </button>
                                    <button
                                        onClick={() => handleCheckout(showCheckoutModal, 'mpesa')}
                                        disabled={isProcessingPayment}
                                        className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            <SparklesIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">M-Pesa</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-8 flex gap-4">
                            <button
                                onClick={() => setShowCheckoutModal(null)}
                                disabled={isProcessingPayment}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW JOB MODAL */}
            {showNewJobModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">New Wash Job</h3><button onClick={() => setShowNewJobModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div><label className={labelCls}>Vehicle Plate</label><input className={inputCls} value={jobForm.vehiclePlate} onChange={e => setJobForm({ ...jobForm, vehiclePlate: e.target.value })} placeholder="e.g. KCA 123A" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Vehicle Type</label><select className={inputCls} value={jobForm.vehicleType} onChange={e => setJobForm({ ...jobForm, vehicleType: e.target.value as CarWashVehicleType })}>{VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className={labelCls}>Bay #</label><input type="number" className={inputCls} value={jobForm.bayNumber} onChange={e => setJobForm({ ...jobForm, bayNumber: +e.target.value })} min={1} max={20} /></div>
                            </div>
                            <div><label className={labelCls}>Package</label><select className={inputCls} value={jobForm.packageId} onChange={e => setJobForm({ ...jobForm, packageId: e.target.value })}><option value="">-- Select --</option>{packages.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} — KES {p.pricing[jobForm.vehicleType] || 'N/A'}</option>)}</select></div>
                            <div><label className={labelCls}>Customer (optional)</label><select className={inputCls} value={jobForm.customerId} onChange={e => setJobForm({ ...jobForm, customerId: e.target.value })}><option value="">-- Walk-in --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phoneNumber})</option>)}</select></div>
                            <div><label className={labelCls}>Attendant</label><select className={inputCls} value={jobForm.attendantId} onChange={e => setJobForm({ ...jobForm, attendantId: e.target.value })}><option value="">-- Unassigned --</option>{attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                            <div><label className={labelCls}>Payment Method</label><select className={inputCls} value={jobForm.paymentMethod} onChange={e => setJobForm({ ...jobForm, paymentMethod: e.target.value as CarWashPaymentMethod })}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
                            <div><label className={labelCls}>Add-ons</label><div className="flex flex-wrap gap-2">{ADD_ONS.map(ao => <button key={ao} type="button" onClick={() => setJobForm(prev => ({ ...prev, addOns: prev.addOns.includes(ao) ? prev.addOns.filter(x => x !== ao) : [...prev.addOns, ao] }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${jobForm.addOns.includes(ao) ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{ao}</button>)}</div></div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewJobModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreateJob} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">Add to Queue</button></div>
                    </div>
                </div>
            )}

            {/* NEW CUSTOMER MODAL */}
            {showNewCustomerModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">New Customer</h3><button onClick={() => setShowNewCustomerModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div><label className={labelCls}>Full Name</label><input className={inputCls} value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} placeholder="John Doe" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Phone</label><input className={inputCls} value={custForm.phoneNumber} onChange={e => setCustForm({ ...custForm, phoneNumber: e.target.value })} placeholder="07xx..." /></div>
                                <div><label className={labelCls}>Email</label><input className={inputCls} value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })} placeholder="optional" /></div>
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-t pt-3">Vehicle (optional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Plate</label><input className={inputCls} value={custForm.plateNumber} onChange={e => setCustForm({ ...custForm, plateNumber: e.target.value })} placeholder="KCA 123A" /></div>
                                <div><label className={labelCls}>Type</label><select className={inputCls} value={custForm.vehicleType} onChange={e => setCustForm({ ...custForm, vehicleType: e.target.value as CarWashVehicleType })}>{VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className={labelCls}>Make</label><input className={inputCls} value={custForm.make} onChange={e => setCustForm({ ...custForm, make: e.target.value })} placeholder="Toyota" /></div>
                                <div><label className={labelCls}>Model</label><input className={inputCls} value={custForm.model} onChange={e => setCustForm({ ...custForm, model: e.target.value })} placeholder="Vitz" /></div>
                                <div><label className={labelCls}>Color</label><input className={inputCls} value={custForm.color} onChange={e => setCustForm({ ...custForm, color: e.target.value })} placeholder="White" /></div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewCustomerModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreateCustomer} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">Save Customer</button></div>
                    </div>
                </div>
            )}

            {/* NEW PACKAGE MODAL */}
            {showNewPackageModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">New Package</h3><button onClick={() => setShowNewPackageModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div><label className={labelCls}>Package Name</label><input className={inputCls} value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="e.g. Premium Wash" /></div>
                            <div><label className={labelCls}>Description</label><input className={inputCls} value={pkgForm.description} onChange={e => setPkgForm({ ...pkgForm, description: e.target.value })} placeholder="What's included..." /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Est. Minutes</label><input type="number" className={inputCls} value={pkgForm.estimatedMinutes} onChange={e => setPkgForm({ ...pkgForm, estimatedMinutes: +e.target.value })} /></div>
                                <div className="flex items-center gap-3 pt-5"><input type="checkbox" id="interior" checked={pkgForm.includesInterior} onChange={e => setPkgForm({ ...pkgForm, includesInterior: e.target.checked })} className="w-5 h-5" /><label htmlFor="interior" className="text-xs font-bold">Includes Interior</label></div>
                            </div>
                            <div><label className={labelCls}>Pricing by Vehicle Type (KES)</label><div className="space-y-2">{VEHICLE_TYPES.map(vt => <div key={vt} className="flex items-center gap-3"><span className="text-xs font-bold w-20">{vt}</span><input type="number" className={inputCls} placeholder="0" value={pkgForm.pricing[vt] || ''} onChange={e => setPkgForm(prev => ({ ...prev, pricing: { ...prev.pricing, [vt]: +e.target.value } }))} /></div>)}</div></div>
                            <div><label className={labelCls}>Accent Color</label><div className="flex gap-2">{PACKAGE_COLORS.map(c => <button key={c} type="button" onClick={() => setPkgForm({ ...pkgForm, color: c })} className={`w-8 h-8 rounded-full border-2 transition-all ${pkgForm.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ background: c }} />)}</div></div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewPackageModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreatePackage} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">Save Package</button></div>
                    </div>
                </div>
            )}

            {/* INVENTORY MODAL */}
            {showNewInventoryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">Add Inventory</h3><button onClick={() => setShowNewInventoryModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Item Name</label><input className={inputCls} value={invForm.name} onChange={e => setInvForm({ ...invForm, name: e.target.value })} placeholder="e.g. Car Shampoo" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Category</label><select className={inputCls} value={invForm.category} onChange={e => setInvForm({ ...invForm, category: e.target.value as any })}><option value="chemical">Chemical</option><option value="equipment">Equipment</option><option value="consumable">Consumable</option><option value="other">Other</option></select></div>
                                <div><label className={labelCls}>Unit</label><input className={inputCls} value={invForm.unit} onChange={e => setInvForm({ ...invForm, unit: e.target.value })} placeholder="litres / pcs" /></div>
                                <div><label className={labelCls}>Current Stock</label><input type="number" className={inputCls} value={invForm.currentStock} onChange={e => setInvForm({ ...invForm, currentStock: +e.target.value })} /></div>
                                <div><label className={labelCls}>Reorder Level</label><input type="number" className={inputCls} value={invForm.reorderLevel} onChange={e => setInvForm({ ...invForm, reorderLevel: +e.target.value })} /></div>
                                <div><label className={labelCls}>Cost/Unit (KES)</label><input type="number" className={inputCls} value={invForm.costPerUnit} onChange={e => setInvForm({ ...invForm, costPerUnit: +e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewInventoryModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreateInventory} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">Save Item</button></div>
                    </div>
                </div>
            )}

            {/* FEEDBACK MODAL */}
            {showFeedbackModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="bg-amber-500 px-6 py-5 text-center"><h3 className="text-lg font-black text-white uppercase">Rate Your Experience</h3><p className="text-xs text-amber-100 mt-1">{showFeedbackModal.vehiclePlate} · {showFeedbackModal.packageName}</p></div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-center gap-2">{Array.from({ length: 5 }).map((_, i) => <button key={i} onClick={() => setFbRating(i + 1)} className={`text-4xl transition-transform hover:scale-110 ${i < fbRating ? 'text-amber-400' : 'text-slate-200'}`}>★</button>)}</div>
                            <textarea className={inputCls + ' h-24 resize-none'} placeholder="Any comments? (optional)" value={fbComment} onChange={e => setFbComment(e.target.value)} />
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowFeedbackModal(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Skip</button><button onClick={handleSubmitFeedback} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-black text-sm uppercase shadow">Submit ★</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};
