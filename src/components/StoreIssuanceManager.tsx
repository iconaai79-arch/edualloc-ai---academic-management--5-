
import React, { useState, useEffect, useRef } from 'react';
import type { InventoryItem, User, StockTransaction, Department } from '../types';
import {
    PlusIcon, SearchIcon, CheckCircleIcon, XIcon, UserIcon,
    ArchiveBoxIcon, ClockIcon, ArrowPathIcon, EyeIcon, BuildingOfficeIcon
} from './icons/index';
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

    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const [hasSigned, setHasSigned] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

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

            await onLogAction(`Issued ${newIssuance.quantity} ${item.unit} of "${item.name}" to ${user?.name}`);

            alert('Issuance successful!');
            setIsIssuing(false);
            setHasSigned(false);
            setNewIssuance({ userId: '', itemId: '', quantity: 1, notes: '' });
            setMemberSearch('');
            setItemSearch('');
            onDataChange();
        } catch (error: any) {
            console.error('Issuance Error:', error);
            alert(`Failed to complete issuance: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const recipientOptions = users.filter(u => 
        u.role === 'student' || u.role === 'teacher' || u.role === 'lecturer'
    ).filter(u => {
        const search = memberSearch.toLowerCase();
        return u.name.toLowerCase().includes(search) || (u.staffId || '').toLowerCase().includes(search);
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

            {/* Recent Issuance Logs could go here */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[200px] flex items-center justify-center">
                <div className="text-center py-10">
                    <ArchiveBoxIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Select an action above to proceed</p>
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
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Search staff or student..."
                                                    value={memberSearch}
                                                    onChange={(e) => setMemberSearch(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                                />
                                                <div className="absolute right-4 top-4 text-slate-400">
                                                    <SearchIcon className="w-5 h-5" />
                                                </div>
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
                                                {recipientOptions.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                                                ))}
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
                                        <p className="text-[9px] font-bold text-rose-400 uppercase">Recipent must sign to confirm receipt</p>
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
