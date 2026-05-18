
import React, { useState, useEffect, useRef } from 'react';
import type { InventoryItem, User, StockTransaction, Department } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/UserIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { EyeIcon } from './icons/EyeIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { apiService } from '../services/apiService';

interface StoreIssuanceManagerProps {
    institutionId: string;
    currentUserId: string;
    inventory: InventoryItem[];
    users: User[];
    departments?: Department[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const StoreIssuanceManager: React.FC<StoreIssuanceManagerProps> = ({
    institutionId,
    currentUserId,
    inventory,
    users,
    departments = [],
    onLogAction,
    onDataChange
}) => {
    const [isIssuing, setIsIssuing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recipientType, setRecipientType] = useState<'person' | 'department'>('person');
    const [memberSearch, setMemberSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    
    const [newIssuance, setNewIssuance] = useState({
        userId: '',
        itemId: '',
        quantity: 1,
        notes: ''
    });

    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const fetchTransactions = async () => {
        setLoadingTransactions(true);
        try {
            const data = await apiService.fetchModuleRecords<StockTransaction>('stock_transactions', institutionId);
            const issues = (data || [])
                .filter(t => t.type === 'Issue')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(issues);
        } catch (error) {
            console.error('Failed to fetch store transactions:', error);
        } finally {
            setLoadingTransactions(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [institutionId]);

    // Signature Pad Logic
    useEffect(() => {
        if (!isIssuing || !signatureCanvasRef.current) return;
        const canvas = signatureCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        const getCoords = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect();
            if (e instanceof MouseEvent) return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            return { x: (e as TouchEvent).touches[0].clientX - rect.left, y: (e as TouchEvent).touches[0].clientY - rect.top };
        };

        const start = (e: MouseEvent | TouchEvent) => {
            const { x, y } = getCoords(e);
            ctx?.beginPath();
            ctx?.moveTo(x, y);
            setIsDrawing(true);
            setHasSigned(true);
        };

        const move = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing) return;
            const { x, y } = getCoords(e);
            ctx?.lineTo(x, y);
            ctx?.stroke();
        };

        const stop = () => setIsDrawing(false);

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', stop);

        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', move);
            canvas.removeEventListener('mouseup', stop);
            canvas.removeEventListener('mouseleave', stop);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', move);
            canvas.removeEventListener('touchend', stop);
        };
    }, [isIssuing, isDrawing]);

    const handleIssueItem = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newIssuance.userId || !newIssuance.itemId || newIssuance.quantity < 1) {
            alert('Please select a recipient, an item, and a valid quantity.');
            return;
        }

        const item = inventory.find(i => i.id === newIssuance.itemId);
        if (!item) {
            alert('Selected item not found.');
            return;
        }

        if (item.quantity < newIssuance.quantity) {
            alert(`Insufficient stock. Available: ${item.quantity} ${item.unit}`);
            return;
        }

        if (!hasSigned) {
            alert('Recipient signature is required for issuance.');
            return;
        }

        setIsProcessing(true);
        try {
            const signatureUrl = signatureCanvasRef.current?.toDataURL('image/png');
            const user = recipientType === 'person' ? users.find(u => u.id === newIssuance.userId) : null;
            const dept = recipientType === 'department' ? departments.find(d => d.id === newIssuance.userId) : null;

            const transaction: StockTransaction = {
                id: `stx_${Date.now()}`,
                itemId: item.id,
                itemName: item.name,
                type: 'Issue',
                quantity: newIssuance.quantity,
                recipientOrSupplier: recipientType === 'person' ? (user?.name || 'Unknown Person') : (dept?.name || 'Kitchen'),
                recipientId: newIssuance.userId,
                date: new Date().toISOString(),
                recordedBy: currentUserId,
                institutionId,
                signature: signatureUrl,
                verificationMethod: 'Digital Signature'
            };

            // 1. Save Transaction
            await apiService.saveModuleRecord('stock_transactions', transaction);

            // 2. Update Inventory
            await apiService.saveModuleRecord('inventory', {
                ...item,
                quantity: item.quantity - newIssuance.quantity,
                lastUpdated: new Date().toISOString()
            });

            await onLogAction(`Issued ${newIssuance.quantity} ${item.unit} of "${item.name}" to ${user?.name || dept?.name}`);

            alert('Issuance successful!');
            setIsIssuing(false);
            setHasSigned(false);
            setNewIssuance({ userId: '', itemId: '', quantity: 1, notes: '' });
            setMemberSearch('');
            setItemSearch('');
            onDataChange();
            fetchTransactions();
        } catch (error: any) {
            console.error('Issuance Error:', error);
            alert(`Failed to complete issuance: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSimulateQRScan = () => {
        const students = users.filter(u => u.role === 'student');
        if (students.length === 0) {
            alert('No students found to scan.');
            return;
        }
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        const studentAdm = (randomStudent as any).admissionNumber || (randomStudent as any).admission_number || (randomStudent as any).admNumber || (randomStudent as any).adm_number || 'N/A';
        
        setNewIssuance({
            ...newIssuance,
            userId: randomStudent.id
        });
        setMemberSearch(randomStudent.name);
        alert(`QR Code Scanned successfully!\nStudent: ${randomStudent.name}\nAdm: ${studentAdm}`);
    };

    const recipientOptions = users.filter(u => 
        u.role === 'student' || u.role === 'teacher' || u.role === 'lecturer'
    ).filter(u => {
        const search = memberSearch.toLowerCase();
        const adm = ((u as any).admissionNumber || (u as any).admission_number || (u as any).admNumber || (u as any).adm_number || '').toLowerCase();
        return u.name.toLowerCase().includes(search) || 
               (u.staffId || '').toLowerCase().includes(search) || 
               adm.includes(search);
    });

    const itemOptions = inventory.filter(i => {
        const search = itemSearch.toLowerCase();
        return i.name.toLowerCase().includes(search) || i.category.toLowerCase().includes(search);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Issuance Registry</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Direct item distribution to staff and students</p>
                </div>
                <button
                    onClick={() => setIsIssuing(true)}
                    className="bg-indigo-600 hover:bg-slate-900 text-white px-6 h-12 rounded-2xl flex items-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Issuance Record
                </button>
            </div>

            {/* Premium Recent Issuance Logs */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tight">Recent Issuance History</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction log with digital signatures</p>
                    </div>
                    {transactions.length > 0 && (
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                            {transactions.length} Total
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date / Time</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Signature</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {loadingTransactions ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                        Fetching records...
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <ArchiveBoxIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        No recent issuance records found
                                    </td>
                                </tr>
                            ) : (
                                transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {new Date(tx.date).toLocaleDateString()}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {tx.recipientOrSupplier}
                                        </td>
                                        <td className="p-6 text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                            {tx.itemName}
                                        </td>
                                        <td className="p-6 text-xs font-black text-slate-900 dark:text-white text-center">
                                            {tx.quantity}
                                        </td>
                                        <td className="p-6">
                                            {tx.signature ? (
                                                <div className="h-10 w-24 bg-white dark:bg-slate-950 rounded-lg p-1 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner overflow-hidden">
                                                    <img loading="lazy" src={tx.signature} alt="Signature" className="h-full object-contain mix-blend-multiply dark:invert" />
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">None</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isIssuing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-indigo-600">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Issue Store Item</h3>
                                <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-1">Authorized Resource Allocation</p>
                            </div>
                            <button onClick={() => setIsIssuing(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-all">
                                <XIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        <form onSubmit={handleIssueItem} className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
                            <div className="space-y-4">
                                {/* Recipient Type Toggle */}
                                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => { setRecipientType('person'); setNewIssuance({...newIssuance, userId: ''}); setMemberSearch(''); }}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recipientType === 'person' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500'}`}
                                    >
                                        <UserIcon className="w-3 h-3 inline-block mr-2" />
                                        Individual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setRecipientType('department'); setNewIssuance({...newIssuance, userId: ''}); setMemberSearch(''); }}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recipientType === 'department' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500'}`}
                                    >
                                        <BuildingOfficeIcon className="w-3 h-3 inline-block mr-2" />
                                        Department
                                    </button>
                                </div>

                                {/* Recipient Selection */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                                        {recipientType === 'person' ? 'Target Recipient' : 'Target Department'}
                                    </label>
                                    
                                    {recipientType === 'person' ? (
                                        <>
                                            <div className="flex gap-2">
                                                <div className="relative flex-grow">
                                                    <input
                                                        type="text"
                                                        placeholder="Search staff, student, name or admission number..."
                                                        value={memberSearch}
                                                        onChange={(e) => setMemberSearch(e.target.value)}
                                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                                    />
                                                    <div className="absolute right-4 top-4 text-slate-400">
                                                        <SearchIcon className="w-5 h-5" />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleSimulateQRScan}
                                                    className="px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100"
                                                    title="Simulate QR Code Scan"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                    </svg>
                                                    <span className="sr-only">Scan QR</span>
                                                </button>
                                            </div>
                                            <select
                                                required
                                                value={newIssuance.userId}
                                                onChange={(e) => {
                                                    const user = users.find(u => u.id === e.target.value);
                                                    setNewIssuance({ ...newIssuance, userId: e.target.value });
                                                    if (user) setMemberSearch(user.name);
                                                }}
                                                className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold mt-2"
                                            >
                                                <option value="">-- Select Recipient --</option>
                                                {recipientOptions.map(u => {
                                                    const adm = (u as any).admissionNumber || (u as any).admission_number || (u as any).admNumber || (u as any).adm_number || '';
                                                    return (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name} ({u.role.replace('_', ' ')}){adm ? ` - ADM: ${adm}` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </>
                                    ) : (
                                        <select
                                            required
                                            value={newIssuance.userId}
                                            onChange={(e) => setNewIssuance({ ...newIssuance, userId: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                        >
                                            <option value="">-- Select Department --</option>
                                            <option value="dept_kitchen">Kitchen Department</option>
                                            {(departments || []).map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Item Selection */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Resource / Item</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search stock..."
                                            value={itemSearch}
                                            onChange={(e) => setItemSearch(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                        />
                                        <div className="absolute right-4 top-4 text-slate-400">
                                            <SearchIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <select
                                        required
                                        value={newIssuance.itemId}
                                        onChange={(e) => {
                                            const item = inventory.find(i => i.id === e.target.value);
                                            setNewIssuance({ ...newIssuance, itemId: e.target.value });
                                            if (item) setItemSearch(item.name);
                                        }}
                                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold mt-2"
                                    >
                                        <option value="">-- Select Item --</option>
                                        {itemOptions.map(i => (
                                            <option key={i.id} value={i.id} disabled={i.quantity < 1}>
                                                {i.name} ({i.quantity} {i.unit} available)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Issuance Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={newIssuance.quantity}
                                        onChange={(e) => setNewIssuance({ ...newIssuance, quantity: parseInt(e.target.value) })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                    />
                                </div>

                                {/* Signature Pad */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Recipient Digital Signature</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const ctx = signatureCanvasRef.current?.getContext('2d');
                                                if (ctx && signatureCanvasRef.current) {
                                                    ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
                                                    setHasSigned(false);
                                                }
                                            }}
                                            className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <canvas
                                        ref={signatureCanvasRef}
                                        width={450}
                                        height={120}
                                        className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 touch-none cursor-crosshair"
                                    />
                                    {hasSigned ? (
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3" /> Signature Captured
                                        </p>
                                    ) : (
                                        <p className="text-[9px] font-bold text-rose-400 uppercase">Recipient must sign to confirm receipt</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => setIsIssuing(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessing || !hasSigned}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg hover:translate-y-[-2px] disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {isProcessing ? 'Processing...' : 'Commit Issuance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

