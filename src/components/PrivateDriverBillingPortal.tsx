
import React, { useState, useEffect } from 'react';
import { TruckIcon } from './icons/TruckIcon';
import { UserIcon } from './icons/UserIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { PlusIcon } from './icons/PlusIcon';
import { FileTextIcon } from './icons/FileTextIcon';

import type { TransportVehicle, TransportOnboarding, User, Institution, TransportBill } from '../types';
import { TransportOnboardingView } from './TransportOnboardingView';
import { apiService } from '../services/apiService';

interface PrivateDriverBillingPortalProps {
    user: User;
    users: User[];
    vehicles: TransportVehicle[];
    transportOnboarding: TransportOnboarding[];
    currentInstitution: Institution;
    onOnboardStudent: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent: (recordId: string, lat?: number, lng?: number) => Promise<void>;
}

export const PrivateDriverBillingPortal: React.FC<PrivateDriverBillingPortalProps> = ({
    user, users, vehicles, transportOnboarding, currentInstitution,
    onOnboardStudent, onOffboardStudent
}) => {
    const [activeTab, setActiveTab] = useState<'manifest' | 'billing' | 'sms' | 'subscription'>('manifest');
    const [bills, setBills] = useState<TransportBill[]>([]);
    const [isGeneratingBill, setIsGeneratingBill] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [selectedStudentForSms, setSelectedStudentForSms] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadBills();
    }, [user.id]);

    const loadBills = async () => {
        try {
            const data = await apiService.fetchTransportBills(user.id);
            setBills(data);
        } catch (e) {
            console.error("Failed to load bills", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivate = async (months: number) => {
        try {
            await apiService.activateDriverSubscription(user, months);
            alert(`Service activated for ${months} months!`);
            window.location.reload(); // Refresh to update user state in App.tsx
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleTopUpSms = async (amount: number, units: number) => {
        try {
            await apiService.topUpDriverSms(user, amount, units);
            alert(`Topped up ${units} SMS units!`);
            window.location.reload();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleCreateBill = async (studentId: string, amount: number) => {
        const student = users.find(u => u.id === studentId);
        if (!student) return;

        const newBill: TransportBill = {
            id: `bill_${Date.now()}`,
            institutionId: currentInstitution.id,
            driverId: user.id,
            vehicleId: user.vehicleId || '',
            billDate: new Date().toISOString(),
            totalAmount: amount,
            status: 'pending',
            items: [{ description: 'Monthly Transport Fee', amount }],
            generatedBy: user.id,
            notes: `Transport bill for ${student.name}`
        };

        try {
            await apiService.saveTransportBill(newBill);
            alert("Bill generated and sent to parent!");
            loadBills();
            setIsGeneratingBill(false);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleSendSms = async () => {
        if (!selectedStudentForSms || !smsMessage) return;
        const student = users.find(u => u.id === selectedStudentForSms);
        // In a real scenario, we'd find the parent's phone. For now, assume we notify the student/parent.
        // Let's look for parents linked to this student
        const parents = users.filter(u => u.role === 'parent' && (u as any).studentIds?.includes(student?.id));
        const recipient = parents[0]?.phoneNumber || student?.phoneNumber;

        if (!recipient) return alert("Recipient phone number not found.");

        try {
            await apiService.sendPrivateDriverSms(user, recipient, smsMessage);
            alert("Notification sent!");
            setSmsMessage('');
        } catch (e: any) {
            alert(e.message);
        }
    };

    const isSubscribed = user.subscriptionStatus === 'active';

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
            {/* Header / Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <TruckIcon className="w-6 h-6" />
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${isSubscribed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {isSubscribed ? 'Service Active' : 'Service Inactive'}
                        </span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subscription Expiry</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">
                        {user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : 'No Active Plan'}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                            <ChatBubbleLeftRightIcon className="w-6 h-6" />
                        </div>
                        <button
                            onClick={() => setActiveTab('sms')}
                            className="bg-orange-500 hover:bg-orange-600 text-white p-1.5 rounded-lg active:scale-95 transition-all"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Available SMS units</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{user.smsBalance || 0} Units</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                            <FileTextIcon className="w-6 h-6" />
                        </div>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-lg active:scale-95 transition-all"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Billings</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{bills.length} Records</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1.5 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
                {[
                    { id: 'manifest', label: 'Manifest', icon: TruckIcon },
                    { id: 'billing', label: 'Billing & Payments', icon: CurrencyIcon },
                    { id: 'sms', label: 'SMS Hub', icon: ChatBubbleLeftRightIcon },
                    { id: 'subscription', label: 'Subscription', icon: CreditCardIcon }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="space-y-6">
                {activeTab === 'manifest' && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                        <TransportOnboardingView
                            currentUser={user}
                            currentInstitution={currentInstitution}
                            vehicles={vehicles}
                            users={users}
                            onboardingRecords={transportOnboarding}
                            onOnboardStudent={onOnboardStudent}
                            onOffboardStudent={onOffboardStudent}
                        />
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Billing Center</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage parent invoices</p>
                                </div>
                                <button
                                    onClick={() => setIsGeneratingBill(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                                >
                                    New Bill
                                </button>
                            </div>

                            <div className="space-y-4">
                                {bills.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <FileTextIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase text-xs">No bills generated yet</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                                    <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</th>
                                                    <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Student</th>
                                                    <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount</th>
                                                    <th className="text-left py-4 text-[10px) font-black uppercase text-slate-400 tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bills.map(bill => {
                                                    const student = users.find(u => u.id === bill.items[0]?.description.split('for ')[1]); // Very rough hack
                                                    return (
                                                        <tr key={bill.id} className="border-b border-slate-50 dark:border-slate-800 last:border-none">
                                                            <td className="py-4 font-bold text-xs">{new Date(bill.billDate).toLocaleDateString()}</td>
                                                            <td className="py-4 font-black text-sm">{bill.notes?.split('for ')[1] || 'Unknown'}</td>
                                                            <td className="py-4 font-bold text-blue-600">KES {bill.totalAmount}</td>
                                                            <td className="py-4">
                                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${bill.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                                    {bill.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sms' && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="mb-8">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Communication Hub</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Send instant notifications to parents</p>
                        </div>

                        {!isSubscribed ? (
                            <div className="text-center py-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
                                <XCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
                                <h4 className="font-black text-red-600 uppercase mb-2">Service Inactive</h4>
                                <p className="text-xs text-red-400 mb-6">You must have an active subscription to send SMS notifications.</p>
                                <button
                                    onClick={() => setActiveTab('subscription')}
                                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs"
                                >
                                    Activate Now
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Select Student/Parent</label>
                                    <select
                                        value={selectedStudentForSms}
                                        onChange={e => setSelectedStudentForSms(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all"
                                    >
                                        <option value="">Choose a student...</option>
                                        {users.filter(u => u.role === 'student').map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.staffId})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Message Content</label>
                                    <textarea
                                        value={smsMessage}
                                        onChange={e => setSmsMessage(e.target.value)}
                                        rows={4}
                                        placeholder="Type your message here (e.g., Bus is 5 minutes away...)"
                                        className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 font-bold outline-none transition-all resize-none"
                                    />
                                    <div className="flex justify-between mt-2 px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{smsMessage.length} characters</span>
                                        <span className="text-[10px] font-bold text-blue-500 uppercase">{user.smsBalance} units left</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSendSms}
                                    disabled={!selectedStudentForSms || !smsMessage || (user.smsBalance || 0) <= 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-5 rounded-3xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                                >
                                    Dispatch Notification
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'subscription' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
                            <h4 className="text-xl font-black uppercase tracking-tighter mb-1 mt-2">Service Portal</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Monthly Service Activation</p>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between border border-transparent hover:border-blue-500/30 transition-all cursor-pointer group"
                                    onClick={() => handleActivate(1)}>
                                    <div>
                                        <p className="font-black uppercase text-xs">Starter Plan</p>
                                        <p className="text-[10px] text-slate-400">1 Month Access</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-blue-600">KES 1,000</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Per Driver</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between border border-transparent hover:border-blue-500/30 transition-all cursor-pointer group"
                                    onClick={() => handleActivate(3)}>
                                    <div>
                                        <p className="font-black uppercase text-xs">Standard Plan</p>
                                        <p className="text-[10px] text-slate-400">3 Months Access</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-blue-600">KES 2,700</p>
                                        <p className="text-[8px] font-bold text-green-500 uppercase">Save 10%</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between border-2 border-blue-500/50 shadow-inner"
                                    onClick={() => handleActivate(6)}>
                                    <div>
                                        <p className="font-black uppercase text-xs text-blue-600">Premium Plan</p>
                                        <p className="text-[10px] text-slate-400">6 Months Access</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-blue-600">KES 5,000</p>
                                        <p className="text-[8px] font-bold text-green-500 uppercase">Best Value</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
                            <h4 className="text-xl font-black uppercase tracking-tighter mb-1 mt-2">SMS Credits</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Purchase SMS Units</p>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => handleTopUpSms(100, 100)}>
                                    <div>
                                        <p className="font-black uppercase text-xs">Small Bundle</p>
                                        <p className="text-[10px] text-slate-400">100 SMS Units</p>
                                    </div>
                                    <p className="font-black text-orange-600">KES 100</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => handleTopUpSms(500, 600)}>
                                    <div>
                                        <p className="font-black uppercase text-xs">Bonus Bundle</p>
                                        <p className="text-[10px] text-slate-400">600 SMS Units</p>
                                    </div>
                                    <p className="font-black text-orange-600">KES 500</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => handleTopUpSms(1000, 1500)}>
                                    <div>
                                        <p className="font-black uppercase text-xs">Mega Bundle</p>
                                        <p className="text-[10px] text-slate-400">1,500 SMS Units</p>
                                    </div>
                                    <p className="font-black text-orange-600">KES 1,000</p>
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-800">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">Note</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    SMS units never expire and can be used as long as your portal subscription is active. Payments are processed via M-Pesa.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bill Generator Modal */}
            {isGeneratingBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-white/10">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Generate Transport Bill</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select student and set monthly amount</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Student</label>
                                <select id="student_select" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 font-bold outline-none">
                                    <option value="">Choose student...</option>
                                    {users.filter(u => u.role === 'student').map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Monthly Fee (KES)</label>
                                <input id="bill_amount" type="number" defaultValue={2500} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 font-bold outline-none" />
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                            <button
                                onClick={() => setIsGeneratingBill(false)}
                                className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const sid = (document.getElementById('student_select') as HTMLSelectElement).value;
                                    const amt = (document.getElementById('bill_amount') as HTMLInputElement).value;
                                    if (sid && amt) handleCreateBill(sid, parseInt(amt));
                                }}
                                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                Dispatch Bill
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

