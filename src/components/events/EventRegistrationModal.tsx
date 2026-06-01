import React, { useState } from 'react';
import { EventCategory, EventParticipant } from '../../types';
import { XIcon, MpesaIcon, PhoneIcon, UserIcon, EnvelopeIcon, CheckCircleIcon, QrCodeIcon } from '../icons';
import { apiService } from '../../services/apiService';

interface EventRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: EventCategory[];
    eventName: string;
    onRegister: (data: Partial<EventParticipant>) => Promise<EventParticipant>;
    editingParticipant?: EventParticipant | null;
}

export const EventRegistrationModal: React.FC<EventRegistrationModalProps> = ({
    isOpen,
    onClose,
    categories,
    eventName,
    onRegister,
    editingParticipant
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Form, 2: Payment, 3: Success
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: 'male' as 'male' | 'female',
        age: '',
        tShirtSize: 'M' as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL',
        categoryId: categories[0]?.id || '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        waiverSigned: false,
        initialPledge: '0'
    });

    React.useEffect(() => {
        if (editingParticipant) {
            setFormData({
                firstName: editingParticipant.firstName || '',
                lastName: editingParticipant.lastName || '',
                email: editingParticipant.email || '',
                phone: editingParticipant.phone || '',
                gender: (editingParticipant.gender as any) || 'male',
                age: editingParticipant.age ? String(editingParticipant.age) : '',
                tShirtSize: editingParticipant.tShirtSize || 'M',
                categoryId: editingParticipant.categoryId || '',
                emergencyContactName: editingParticipant.emergencyContactName || '',
                emergencyContactPhone: editingParticipant.emergencyContactPhone || '',
                waiverSigned: editingParticipant.waiverSigned || false,
                initialPledge: '0'
            });
            setStep(1);
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                gender: 'male',
                age: '',
                tShirtSize: 'M',
                categoryId: categories[0]?.id || '',
                emergencyContactName: '',
                emergencyContactPhone: '',
                waiverSigned: false,
                initialPledge: '0'
            });
            setStep(1);
        }
    }, [editingParticipant, isOpen, categories]);

    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'sending' | 'pending' | 'success' | 'failed'>('idle');
    const [mpesaRef, setMpesaRef] = useState('');
    const [registeredParticipant, setRegisteredParticipant] = useState<EventParticipant | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const activeCategory = categories.find(c => c.id === formData.categoryId);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!formData.categoryId) {
            setErrorMsg('Please select a race category');
            return;
        }

        if (!formData.waiverSigned) {
            setErrorMsg('You must sign the waiver to participate');
            return;
        }

        const ageNum = parseInt(formData.age);
        if (isNaN(ageNum) || ageNum <= 0) {
            setErrorMsg('Please enter a valid age');
            return;
        }

        if (activeCategory) {
            if (activeCategory.ageLimitMin && ageNum < activeCategory.ageLimitMin) {
                setErrorMsg(`Minimum age for this category is ${activeCategory.ageLimitMin}`);
                return;
            }
            if (activeCategory.ageLimitMax && ageNum > activeCategory.ageLimitMax) {
                setErrorMsg(`Maximum age for this category is ${activeCategory.ageLimitMax}`);
                return;
            }
        }

        // Check for duplicate registration before going to payment
        try {
            const allParticipants = await apiService.fetchModuleRecords<EventParticipant>('event_participants');
            const eventCategoryIds = categories.map(c => c.id);
            const emailLower = formData.email.trim().toLowerCase();
            const phoneTrim = formData.phone.trim();
            const duplicate = allParticipants.find(p => 
                p.id !== editingParticipant?.id && 
                eventCategoryIds.includes(p.categoryId) && 
                ((emailLower && p.email?.toLowerCase() === emailLower) || (phoneTrim && p.phone === phoneTrim))
            );
            if (duplicate) {
                setErrorMsg(`A runner with this email or phone number is already registered for this event (BIB: ${duplicate.bibNumber}).`);
                return;
            }
        } catch (err) {
            console.error('Error checking duplicate registration:', err);
        }

        if (editingParticipant) {
            setPaymentStatus('sending');
            try {
                const updated = await onRegister({
                    ...editingParticipant,
                    categoryId: formData.categoryId,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    gender: formData.gender,
                    age: parseInt(formData.age),
                    tShirtSize: formData.tShirtSize,
                    emergencyContactName: formData.emergencyContactName,
                    emergencyContactPhone: formData.emergencyContactPhone,
                });
                setRegisteredParticipant(updated);
                setPaymentStatus('success');
                setStep(3);
            } catch (err: any) {
                setErrorMsg(err.message || 'Failed to update runner');
                setPaymentStatus('failed');
            }
            return;
        }

        setPaymentPhone(formData.phone);
        setStep(2);
    };

    const handleManualPayment = async () => {
        if (!mpesaRef.trim()) {
            setErrorMsg('Please enter a valid transaction reference code.');
            return;
        }
        setPaymentStatus('sending');
        setErrorMsg('');

        try {
            const participant = await onRegister({
                categoryId: formData.categoryId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                gender: formData.gender,
                age: parseInt(formData.age),
                tShirtSize: formData.tShirtSize,
                waiverSigned: true,
                paymentStatus: activeCategory && activeCategory.registrationFee > 0 ? 'paid' : 'pending',
                mpesaReference: activeCategory && activeCategory.registrationFee > 0 ? mpesaRef.trim() : undefined,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: formData.emergencyContactPhone,
                status: 'registered'
            });

            setRegisteredParticipant(participant);
            setPaymentStatus('success');
            setStep(3);
        } catch (err: any) {
            setErrorMsg(err.message || 'Registration failed');
            setPaymentStatus('failed');
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Race Registration</span>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate max-w-[450px]">{eventName}</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {errorMsg && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                            {errorMsg}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {/* Personal Details */}
                            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Runner Profile</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">First Name *</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.firstName}
                                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder="John"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Email Address *</label>
                                    <div className="relative">
                                        <EnvelopeIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder="john.doe@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number *</label>
                                    <div className="relative">
                                        <PhoneIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0712345678"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Gender *</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Age *</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="25"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">T-Shirt Size *</label>
                                    <select
                                        value={formData.tShirtSize}
                                        onChange={e => setFormData({ ...formData, tShirtSize: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="XS">XS</option>
                                        <option value="S">S</option>
                                        <option value="M">M</option>
                                        <option value="L">L</option>
                                        <option value="XL">XL</option>
                                        <option value="XXL">XXL</option>
                                    </select>
                                </div>
                            </div>

                            {/* Category and Pledge */}
                            <hr className="border-slate-100 dark:border-slate-700" />
                            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Race Selection</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Select Race Category *</label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name} ({cat.distanceKm}K) - KES {Number(cat.registrationFee)?.toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Optional Charity Pledge (KES)</label>
                                    <input
                                        type="number"
                                        value={formData.initialPledge}
                                        onChange={e => setFormData({ ...formData, initialPledge: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <hr className="border-slate-100 dark:border-slate-700" />
                            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Emergency Contact</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Emergency Contact Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.emergencyContactName}
                                        onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Emergency Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.emergencyContactPhone}
                                        onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0722000000"
                                    />
                                </div>
                            </div>

                            {/* Liability Waiver */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Participant Liability Waiver:</p>
                                I hereby declare that I am physically fit and sufficiently trained to participate in this event. I waive any claims against the organizing institution and its sponsors for any injuries or health issues occurred during or as a consequence of the event.
                                <label className="flex items-center gap-2 mt-3 font-bold text-slate-800 dark:text-white cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={formData.waiverSigned}
                                        onChange={e => setFormData({ ...formData, waiverSigned: e.target.checked })}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    I accept and sign the waiver digitally *
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                Proceed to Payment (KES { (Number(activeCategory?.registrationFee || 0) + Number(formData.initialPledge || 0))?.toLocaleString() })
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="py-8 flex flex-col items-center max-w-sm mx-auto text-center">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950/30 rounded-full flex items-center justify-center mb-6">
                                <QrCodeIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-450" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Record Payment Reference</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                                Please enter the Bank Code or M-PESA Transaction Reference Code for KES {(Number(activeCategory?.registrationFee || 0) + Number(formData.initialPledge || 0))?.toLocaleString()} below to complete registration.
                            </p>

                            <div className="w-full space-y-4">
                                <div>
                                    <label className="block text-left text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Transaction Reference / Bank Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={mpesaRef}
                                        onChange={e => setMpesaRef(e.target.value.toUpperCase())}
                                        disabled={paymentStatus === 'sending'}
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                                        placeholder="e.g. AP38DE932"
                                    />
                                </div>

                                {paymentStatus === 'idle' && (
                                    <button
                                        onClick={handleManualPayment}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md"
                                    >
                                        Complete Registration
                                    </button>
                                )}

                                {paymentStatus === 'sending' && (
                                    <div className="py-3 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-bold">
                                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        Recording registration...
                                    </div>
                                )}

                                <button
                                    onClick={() => setStep(1)}
                                    disabled={paymentStatus === 'sending'}
                                    className="w-full py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 transition-all"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && registeredParticipant && (
                        <div className="py-6 flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center mb-4 text-green-500">
                                <CheckCircleIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{editingParticipant ? 'Runner Updated!' : 'Registration Complete!'}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                                {editingParticipant ? "The runner's profile details have been successfully updated." : 'Welcome to the race! Your registration has been processed successfully.'}
                            </p>

                            {/* Ticket / Kit Pass Card */}
                            <div className="mt-6 w-full max-w-md bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-500"></div>
                                
                                <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">Official Entry Ticket</div>
                                <h5 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-xs">{eventName}</h5>
                                <div className="text-xs text-slate-400 mb-4">{activeCategory?.name}</div>

                                {/* BIB Number Badge */}
                                <div className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-center">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">assigned bib</div>
                                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">{registeredParticipant.bibNumber || 'TBD'}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full mt-6 text-left border-t border-b border-slate-200 dark:border-slate-800 py-4 text-xs">
                                    <div>
                                        <span className="block text-slate-400">Runner Name</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{registeredParticipant.firstName} {registeredParticipant.lastName}</span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400">Shirt Size</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{registeredParticipant.tShirtSize}</span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400">M-PESA Ref</span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">{registeredParticipant.mpesaReference || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400">Status</span>
                                        <span className="font-bold text-green-600">CONFIRMED</span>
                                    </div>
                                </div>

                                {/* QR Code Simulation */}
                                <div className="mt-6 flex flex-col items-center">
                                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                        <QrCodeIcon className="w-24 h-24 text-slate-800" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Scan at Kit Pick-up</span>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-8 px-8 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
