import React, { useState, useEffect } from 'react';
import { SportEvent, EventCategory, EventParticipant, EventPledge } from '../../types';
import { apiService } from '../../services/apiService';
import { 
    CalendarDaysIcon, MapPinIcon, UserGroupIcon, BanknotesIcon, 
    CheckCircleIcon, PhoneIcon, UserIcon, EnvelopeIcon, QrCodeIcon, 
    MpesaIcon, SparklesIcon, ClockIcon, AlertTriangleIcon 
} from '../icons';

export const PublicEventRegistration: React.FC = () => {
    const [eventId, setEventId] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || params.get('eventId');
    });

    const [event, setEvent] = useState<SportEvent | null>(null);
    const [categories, setCategories] = useState<EventCategory[]>([]);
    const [activeEvents, setActiveEvents] = useState<SportEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Wizard Steps: 1: Event Details & Choose Category, 2: Runner Details & Waiver, 3: M-PESA Simulation, 4: Success Ticket
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Form States
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: 'male' as 'male' | 'female',
        age: '',
        tShirtSize: 'M' as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL',
        emergencyContactName: '',
        emergencyContactPhone: '',
        waiverSigned: false,
        initialPledge: '0',
        sponsorName: ''
    });

    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'sending' | 'pending' | 'success' | 'failed' | 'prompt_sent' | 'completed'>('idle');
    const [mpesaRef, setMpesaRef] = useState('');
    const [registeredParticipant, setRegisteredParticipant] = useState<EventParticipant | null>(null);
    const [ncbaConfig, setNcbaConfig] = useState<any>(null);
    const [kcbConfig, setKcbConfig] = useState<any>(null);
    const [checkoutRequestId, setCheckoutRequestId] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [useManualPayment, setUseManualPayment] = useState(true);
    
    // Guard against multiple submissions or polling double-triggers
    const isRegisteringRef = React.useRef(false);

    // Watch URL query parameters for changes
    useEffect(() => {
        const handleLocationChange = () => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id') || params.get('eventId');
            setEventId(id);
        };
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    // Load data based on eventId state
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setErrorMsg('');
            try {
                let targetEventId = eventId;
                let fetchedAllEvents: SportEvent[] | null = null;
                
                // If eventId is not set, try to find the event by custom subdomain
                if (!targetEventId) {
                    const host = window.location.hostname.toLowerCase();
                    const parts = host.split('.');
                    if (parts.length >= 2) {
                        const sub = parts[0];
                        fetchedAllEvents = await apiService.fetchModuleRecords<SportEvent>('events');
                        const found = fetchedAllEvents.find(e => {
                            if (!e.customSubdomain) return false;
                            const normalized = e.customSubdomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
                            return normalized === host || normalized === sub || normalized.includes(host);
                        });
                        if (found) {
                            targetEventId = found.id;
                            setEventId(found.id);
                        }
                    }
                }

                if (targetEventId) {
                    // Fetch specific event
                    const events = await apiService.fetchModuleRecords<SportEvent>('events', undefined, undefined, {
                        filter: { id: targetEventId }
                    });
                    
                    if (events && events.length > 0) {
                        setEvent(events[0]);
                        // Fetch categories for this event
                        const cats = await apiService.fetchModuleRecords<EventCategory>('event_categories', undefined, undefined, {
                            filter: { event_id: targetEventId }
                        });
                        // Deduplicate categories by ID
                        const uniqueCats = Array.from(new Map(cats.map(c => [c.id, c])).values());
                        setCategories(uniqueCats);
                        if (uniqueCats.length > 0) {
                            setSelectedCategoryId(uniqueCats[0].id);
                        }
                    } else {
                        setErrorMsg('Selected athletic event could not be found.');
                        setEvent(null);
                    }
                } else {
                    // Load all active events for selection
                    const allEvents = fetchedAllEvents || await apiService.fetchModuleRecords<SportEvent>('events');
                    // Filter events that are active or planning and deduplicate by ID
                    const filtered = allEvents.filter(e => e.status === 'active' || e.status === 'planning');
                    const uniqueEvents = Array.from(new Map(filtered.map(e => [e.id, e])).values());
                    setActiveEvents(uniqueEvents);
                }
            } catch (err: any) {
                console.error('[PublicEventRegistration] load error:', err);
                setErrorMsg('Unable to retrieve event information. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [eventId]);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const settings = await apiService.fetchCompanySettings();
                if (settings) {
                    if (settings.ncbaConfig) setNcbaConfig(settings.ncbaConfig);
                    if (settings.kcbConfig) setKcbConfig(settings.kcbConfig);
                }
            } catch (e) {
                console.error("Failed to load company details", e);
            }
        };
        loadConfig();
    }, []);

    const activeCategory = categories.find(c => c.id === selectedCategoryId);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!selectedCategoryId) {
            setErrorMsg('Please select a race category');
            return;
        }

        if (!formData.waiverSigned) {
            setErrorMsg('You must agree to the participant liability waiver to register');
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

        setPaymentPhone(formData.phone || '');
        setUseManualPayment(!event?.bankIntegrationEnabled);
        setStep(3);
    };

    const handleCompleteRegistration = async (reference: string) => {
        if (isRegisteringRef.current) return;
        isRegisteringRef.current = true;
        try {
            // Determine next BIB number
            const allParticipants = await apiService.fetchModuleRecords<EventParticipant>('event_participants');

            // Prevent duplicate registration check
            const eventCategoryIds = categories.map(c => c.id);
            const emailLower = formData.email.trim().toLowerCase();
            const phoneTrim = formData.phone.trim();
            const duplicate = allParticipants.find(p => 
                eventCategoryIds.includes(p.categoryId) && 
                ((emailLower && p.email?.toLowerCase() === emailLower) || (phoneTrim && p.phone === phoneTrim))
            );
            if (duplicate) {
                throw new Error(`A runner with this email or phone number is already registered for this event (BIB: ${duplicate.bibNumber}).`);
            }

            const existingBibs = allParticipants
                .map(p => parseInt(p.bibNumber || '0'))
                .filter(b => !isNaN(b));
            const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 1000;
            const newBib = String(maxBib + 1);

            const fee = activeCategory ? Number(activeCategory.registrationFee) : 0;

            const newParticipant: EventParticipant = {
                id: 'part_' + Date.now(),
                categoryId: selectedCategoryId,
                bibNumber: newBib,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                gender: formData.gender,
                age: parseInt(formData.age),
                tShirtSize: formData.tShirtSize,
                waiverSigned: true,
                paymentStatus: fee > 0 ? 'paid' : 'pending',
                mpesaReference: fee > 0 ? reference : undefined,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: formData.emergencyContactPhone,
                status: 'registered',
                createdAt: new Date().toISOString()
            };

            const savedParticipant = await apiService.saveModuleRecord<EventParticipant>('event_participants', newParticipant);
            if (!savedParticipant) {
                throw new Error('Registration record could not be saved.');
            }

            // Save fundraising pledge if present
            const pledgeAmount = parseFloat(formData.initialPledge);
            if (pledgeAmount > 0) {
                const pledge: EventPledge = {
                    id: 'pledge_' + Date.now(),
                    participantId: savedParticipant.id,
                    sponsorName: formData.sponsorName.trim() || `${formData.firstName} ${formData.lastName}`,
                    amount: pledgeAmount,
                    paymentStatus: 'paid',
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('event_pledges', pledge);
            }

            // Auto-log M-PESA Transaction for Bank Feeds
            if (fee > 0 || pledgeAmount > 0) {
                const mpesaTx = {
                    id: 'tx_' + Date.now(),
                    transactionId: reference,
                    checkoutRequestId: reference,
                    institutionId: event?.institutionId || 'GLOBAL',
                    amount: fee + pledgeAmount,
                    phoneNumber: formData.phone,
                    payerName: `${formData.firstName} ${formData.lastName}`,
                    status: 'completed',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'event_registration',
                        eventId: eventId,
                        categoryId: selectedCategoryId,
                        reference: reference
                    }
                };
                await apiService.saveModuleRecord('mpesa_transactions', mpesaTx).catch(e => console.error("Failed to auto-record mpesa_transaction", e));
            }

            setRegisteredParticipant(savedParticipant);
            setPaymentStatus('success');
            setStep(4);
        } finally {
            isRegisteringRef.current = false;
        }
    };

    // Poll payment status
    useEffect(() => {
        if (!checkoutRequestId || paymentStatus !== 'prompt_sent') return;

        let attempts = 0;
        const maxAttempts = 24; // 120s
        const interval = setInterval(async () => {
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setPaymentStatus('failed');
                setStatusMessage("Verification timed out. If you already completed the payment, it will reflect within 24 hours.");
                return;
            }

            try {
                const statusRes = await apiService.post('/api/payments/kcb-query', {
                    checkoutRequestId,
                    config: kcbConfig || {}
                });
                if (statusRes.success && (statusRes.status === 'COMPLETED' || statusRes.status === 'Success' || statusRes.resultCode === '0')) {
                    clearInterval(interval);
                    setPaymentStatus('completed');
                    setStatusMessage(`Payment confirmed! KES ${totalFee?.toLocaleString()} received successfully.`);
                    
                    // Complete registration with the real M-Pesa Receipt Number!
                    const receiptNumber = statusRes.mpesaReceiptNumber || checkoutRequestId;
                    handleCompleteRegistration(receiptNumber);
                } else if (statusRes.status === 'Failed' || statusRes.resultCode === '1') {
                    clearInterval(interval);
                    setPaymentStatus('failed');
                    setStatusMessage(statusRes.message || "Payment request was cancelled or failed on your mobile phone.");
                }
            } catch (err) {
                console.warn("Status check warning, retrying...", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [checkoutRequestId, paymentStatus, totalFee, kcbConfig]);

    const handleSendStkPush = async () => {
        if (!paymentPhone.trim()) {
            setErrorMsg('Please enter a valid M-Pesa phone number.');
            return;
        }

        let formattedPhone = paymentPhone.trim().replace(/\+/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        }
        if (!/^(254)(7|1)\d{8}$/.test(formattedPhone)) {
            setErrorMsg('Please enter a valid Kenyan phone number starting with 2547..., 2541..., 07... or 01...');
            return;
        }

        // Check for duplicate registration before initiating payment
        try {
            const allParticipants = await apiService.fetchModuleRecords<EventParticipant>('event_participants');
            const eventCategoryIds = categories.map(c => c.id);
            const emailLower = formData.email.trim().toLowerCase();
            const phoneTrim = formData.phone.trim();
            const duplicate = allParticipants.find(p => 
                eventCategoryIds.includes(p.categoryId) && 
                ((emailLower && p.email?.toLowerCase() === emailLower) || (phoneTrim && p.phone === phoneTrim))
            );
            if (duplicate) {
                setErrorMsg(`A runner with this email or phone number is already registered for this event (BIB: ${duplicate.bibNumber}).`);
                return;
            }
        } catch (e) {
            console.error('Error checking duplicate registration:', e);
        }

        setPaymentStatus('sending');
        setStatusMessage("Initiating payment prompt...");
        setErrorMsg('');

        try {
            const response = await apiService.post('/api/payments/kcb-stk-push', {
                customerMobileNumber: formattedPhone,
                transactionAmount: totalFee,
                customerReference: `EVT_${eventId?.substring(0, 8).toUpperCase()}_${Date.now().toString().slice(-4)}`,
                customerName: `${formData.firstName} ${formData.lastName}`.trim(),
                narration: `Registration for ${event.name}`,
                creditAccountIdentifier: event.institutionId,
                config: kcbConfig || {}
            });

            if (response.success || response.ResponseCode === '0') {
                const reqId = response.CheckoutRequestID || response.checkoutRequestID || `KCB_CO_${Date.now()}`;
                setCheckoutRequestId(reqId);
                setPaymentStatus('prompt_sent');
                setStatusMessage("Prompt dispatched! Check your phone to enter your M-Pesa PIN.");

                // Save a pending transaction record so webhook or query status reconciles correctly
                await apiService.saveModuleRecord('mpesa_transactions', {
                    id: `txn_${Date.now()}`,
                    transactionId: reqId,
                    checkoutRequestId: reqId,
                    institutionId: event.institutionId || 'GLOBAL',
                    amount: totalFee,
                    phoneNumber: formattedPhone,
                    payerName: `${formData.firstName} ${formData.lastName}`.trim(),
                    status: 'pending',
                    provider: 'kcb',
                    customer_reference: `EVT_${eventId?.substring(0, 8).toUpperCase()}_${Date.now().toString().slice(-4)}`,
                    customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
                    customer_mobile_number: formattedPhone,
                    balance: totalFee,
                    narration: `Registration for ${event.name}`,
                    credit_account_identifier: event.institutionId,
                    metadata: { 
                        type: 'event_registration', 
                        eventId: eventId,
                        categoryId: selectedCategoryId
                    },
                    timestamp: new Date().toISOString()
                }).catch(err => console.error("Failed to record pending transaction:", err));

            } else {
                setPaymentStatus('failed');
                const detailsMsg = response.details ? ` (${typeof response.details === 'object' ? JSON.stringify(response.details) : response.details})` : '';
                setStatusMessage((response.message || "Failed to trigger payment prompt. Try again or contact support.") + detailsMsg);
            }
        } catch (err: any) {
            setPaymentStatus('failed');
            setStatusMessage("Gateway connectivity failed: " + (err.message || err));
        }
    };

    const handleInitiatePayment = async () => {
        if (!mpesaRef.trim()) {
            setErrorMsg('Please enter a valid payment transaction reference or bank code.');
            return;
        }
        setPaymentStatus('sending');
        setErrorMsg('');

        // Check for duplicate registration before initiating payment
        try {
            const allParticipants = await apiService.fetchModuleRecords<EventParticipant>('event_participants');
            const eventCategoryIds = categories.map(c => c.id);
            const emailLower = formData.email.trim().toLowerCase();
            const phoneTrim = formData.phone.trim();
            const duplicate = allParticipants.find(p => 
                eventCategoryIds.includes(p.categoryId) && 
                ((emailLower && p.email?.toLowerCase() === emailLower) || (phoneTrim && p.phone === phoneTrim))
            );
            if (duplicate) {
                setErrorMsg(`A runner with this email or phone number is already registered for this event (BIB: ${duplicate.bibNumber}).`);
                setPaymentStatus('failed');
                return;
            }
        } catch (e) {
            console.error('Error checking duplicate registration:', e);
        }

        try {
            await handleCompleteRegistration(mpesaRef.trim().toUpperCase());
        } catch (err: any) {
            setErrorMsg(err.message || 'Registration failed');
            setPaymentStatus('failed');
        }
    };

    const totalFee = (activeCategory ? Number(activeCategory.registrationFee) : 0) + Number(formData.initialPledge || 0);

    const handleSelectEvent = (id: string) => {
        // Update URL query parameters cleanly
        const url = new URL(window.location.href);
        url.searchParams.set('id', id);
        window.history.pushState({}, '', url.toString());
        setEventId(id);
    };

    // Rendering spinner loader
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
                <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-bold text-slate-400">Loading race configuration...</p>
            </div>
        );
    }

    // Listing active events when no event is selected
    if (!eventId) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
                {/* Sticky Header for Events List */}
                <div className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-6 py-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                EP
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Academic Portal</span>
                                <span className="text-xs font-bold text-slate-400">Events Registry</span>
                            </div>
                        </div>
                        <button
                            onClick={() => { window.location.href = '/'; }}
                            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-all border border-slate-850"
                        >
                            Portal Login
                        </button>
                    </div>
                </div>

                {/* Hero Panel */}
                <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 py-16 px-4 sm:px-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_45%)]"></div>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 mb-4">
                            <SparklesIcon className="w-3.5 h-3.5" /> Self Service Portal
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
                            Public Registration &amp; Pledges
                        </h1>
                        <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                            Welcome to the school &amp; community athletic events board. Choose an upcoming marathon, charity walk, or track meet below to register and start fundraising.
                        </p>
                    </div>
                </div>

                {/* Events list */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                        <CalendarDaysIcon className="w-5 h-5 text-indigo-400" /> Upcoming Sports Events
                    </h2>

                    {errorMsg && (
                        <div className="p-4 bg-red-950/20 border border-red-800/40 rounded-2xl text-xs font-bold text-red-400 mb-6">
                            {errorMsg}
                        </div>
                    )}

                    {activeEvents.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-3xl">
                            <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="text-base font-bold text-slate-400">No events currently scheduled</h3>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                                Check back later or contact the institutional organizers for sign-up details.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeEvents.map(evt => (
                                <div 
                                    key={evt.id} 
                                    className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-[1.5rem] p-4 sm:p-6 shadow-lg transition-all duration-300 flex flex-col"
                                >
                                    {evt.bannerUrl && (
                                        <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 bg-slate-800">
                                            <img src={evt.bannerUrl} alt={evt.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-extrabold uppercase rounded-full tracking-wider">
                                                {evt.status}
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                                                <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-500" /> {evt.date}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{evt.name}</h3>
                                        <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                                            {evt.description || 'Join this exciting community athletic event! Share with family and friends to raise pledges.'}
                                        </p>
                                        {evt.location && (
                                            <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 font-medium">
                                                <MapPinIcon className="w-4 h-4 text-slate-600" /> {evt.location}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleSelectEvent(evt.id)}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        Register Now
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Guard if event details loading fails
    if (!event) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangleIcon className="w-12 h-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold text-white">Event Configuration Missing</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
                    {errorMsg || 'We were unable to load the registration page for this event.'}
                </p>
                <button
                    onClick={() => setEventId(null)}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                    Back to All Events
                </button>
            </div>
        );
    }

    // Step-by-step registration wizard
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
            
            {/* Header branding */}
            <div className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {event.logoUrl ? (
                            <img src={event.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded-lg" />
                        ) : (
                            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                EP
                            </div>
                        )}
                        <div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Race Registration</span>
                            <span className="text-xs font-bold text-slate-400 line-clamp-1 max-w-[200px] md:max-w-xs">{event.name}</span>
                        </div>
                    </div>
                    {step < 4 && (
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to exit registration?')) {
                                    setEventId(null);
                                    setStep(1);
                                }
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-all border border-slate-850"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Banner Section */}
            {event.bannerUrl && step === 1 && (
                <div className="w-full h-48 md:h-64 overflow-hidden relative border-b border-slate-900 bg-slate-900">
                    <img src={event.bannerUrl} alt="Event Banner" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                </div>
            )}

            {/* Main view container */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-8">
                
                {/* Step indicator */}
                <div className="mb-8 flex items-center justify-between text-[10px] sm:text-xs font-extrabold text-slate-500 border-b border-slate-900 pb-4 overflow-x-auto hide-scrollbar gap-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-400' : step > 1 ? 'text-green-500' : ''}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${step === 1 ? 'border-indigo-400 bg-indigo-500/10' : step > 1 ? 'border-green-500 bg-green-500/10' : 'border-slate-800'}`}>1</span>
                        <span>Selection</span>
                    </div>
                    <div className="h-px bg-slate-800 flex-1 mx-1 sm:mx-4"></div>
                    <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-400' : step > 2 ? 'text-green-500' : ''}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${step === 2 ? 'border-indigo-400 bg-indigo-500/10' : step > 2 ? 'border-green-500 bg-green-500/10' : 'border-slate-800'}`}>2</span>
                        <span>Profile</span>
                    </div>
                    <div className="h-px bg-slate-800 flex-1 mx-1 sm:mx-4"></div>
                    <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-indigo-400' : step > 3 ? 'text-green-500' : ''}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${step === 3 ? 'border-indigo-400 bg-indigo-500/10' : step > 3 ? 'border-green-500 bg-green-500/10' : 'border-slate-800'}`}>3</span>
                        <span>Payment</span>
                    </div>
                    <div className="h-px bg-slate-800 flex-1 mx-1 sm:mx-4"></div>
                    <div className={`flex items-center gap-1.5 ${step === 4 ? 'text-green-500' : ''}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${step === 4 ? 'border-green-500 bg-green-500/10' : 'border-slate-800'}`}>4</span>
                        <span>Ticket</span>
                    </div>
                </div>

                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-950/20 border border-red-800/40 rounded-2xl text-xs font-bold text-red-400">
                        {errorMsg}
                    </div>
                )}

                {/* Step 1: Category & Info */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Event Details Card */}
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-[1.5rem] p-4 sm:p-6 space-y-4">
                            <h2 className="text-2xl md:text-3xl font-black text-white">{event.name}</h2>
                            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">{event.description || 'Welcome! Set your records in this sports event.'}</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4 text-xs">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <CalendarDaysIcon className="w-4.5 h-4.5 text-indigo-400" />
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Date</span>
                                        <span className="font-bold text-slate-300">{event.date}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <MapPinIcon className="w-4.5 h-4.5 text-indigo-400" />
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Location</span>
                                        <span className="font-bold text-slate-300 truncate max-w-[150px] block">{event.location || 'Athletic Field'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Category selection */}
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3">Select Race Distance</h3>
                            {categories.length === 0 ? (
                                <div className="p-5 sm:p-8 text-center bg-slate-900/40 border border-slate-800/60 rounded-[1.5rem]">
                                    <p className="text-xs text-slate-500 font-bold">No race categories configured for this event.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            onClick={() => setSelectedCategoryId(cat.id)}
                                            className={`relative bg-slate-900/60 border rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between ${selectedCategoryId === cat.id ? 'border-indigo-500 bg-indigo-500/[0.03] shadow-md shadow-indigo-500/5' : 'border-slate-800 hover:border-slate-700/80'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${selectedCategoryId === cat.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                    {cat.distanceKm}K
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">{cat.name}</h4>
                                                    <span className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1.5 mt-0.5">
                                                        <ClockIcon className="w-3.5 h-3.5 text-slate-600" /> Starts {cat.startTime || '06:00 AM'} 
                                                        {cat.genderRestriction !== 'any' && ` • ${cat.genderRestriction} only`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-indigo-400">
                                                    {Number(cat.registrationFee) === 0 ? 'FREE' : `KES ${Number(cat.registrationFee)?.toLocaleString()}`}
                                                </div>
                                                {cat.capacity && (
                                                    <span className="text-[10px] text-slate-500">Cap: {cat.capacity} runners</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <button
                                disabled={!selectedCategoryId}
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                            >
                                Continue Registration
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Form Details & Waiver */}
                {step === 2 && (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        {/* Runner profile */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <UserIcon className="w-5 h-5 text-indigo-400" /> Runner Profile Info
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="runner@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="0712345678"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Gender *</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Age *</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="28"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Shirt Size *</label>
                                    <select
                                        value={formData.tShirtSize}
                                        onChange={e => setFormData({ ...formData, tShirtSize: e.target.value as any })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
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
                        </div>

                        {/* Optional Fundraising pledge */}
                        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                    <BanknotesIcon className="w-4 h-4" /> Sponsor Charity Pledge (Optional)
                                </h4>
                                <span className="text-[10px] text-slate-500">Pledged to the School Charity Drive</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                You can choose to add an additional fundraising pledge as a contribution. Sponsoring organizations or friends can also pledge to sponsor your run.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Pledge Amount (KES)</label>
                                    <input
                                        type="number"
                                        value={formData.initialPledge}
                                        onChange={e => setFormData({ ...formData, initialPledge: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-650"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Sponsor/Donor Name</label>
                                    <input
                                        type="text"
                                        value={formData.sponsorName}
                                        onChange={e => setFormData({ ...formData, sponsorName: e.target.value })}
                                        disabled={Number(formData.initialPledge) === 0}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white disabled:opacity-40"
                                        placeholder="e.g., Safaricom Foundation"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Emergency contact */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1">
                                <PhoneIcon className="w-4.5 h-4.5 text-indigo-400" /> Emergency Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Emergency Contact Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.emergencyContactName}
                                        onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                                        placeholder="Emergency Contact Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Emergency Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.emergencyContactPhone}
                                        onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                                        placeholder="0711000000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Digital waiver */}
                        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-850 text-xs text-slate-400 space-y-3 leading-relaxed">
                            <span className="font-bold text-slate-300 block">Athletic Run Liability Release Waiver</span>
                            <p>
                                I hereby declare that I am physically fit and sufficiently trained to participate in this athletic competition. I release the organizers, institutional hosts, sponsors, and tracking officials of any liability for accidents, injuries, loss, or death arising during or in relation to this event.
                            </p>
                            <label className="flex items-center gap-2 font-bold text-slate-200 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={formData.waiverSigned}
                                    required
                                    onChange={e => setFormData({ ...formData, waiverSigned: e.target.checked })}
                                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500/50"
                                />
                                I accept the terms and sign the waiver digitally *
                            </label>
                        </div>

                        {/* Back / Register */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full sm:w-1/3 py-3 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className="w-full sm:w-2/3 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                            >
                                Continue (KES {totalFee?.toLocaleString()})
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: Payment */}
                {step === 3 && (
                    <div className="py-6 flex flex-col items-center max-w-md mx-auto text-center">
                        {!useManualPayment && event.bankIntegrationEnabled ? (
                            // Automated Collection UI
                            <div className="w-full">
                                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mb-6 mx-auto">
                                    <MpesaIcon className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">M-Pesa STK Prompt Settlement</h4>
                                <p className="text-xs text-slate-400 mb-6 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-left">
                                    Enter your M-Pesa phone number and confirm payment. You will receive an instant STK Push prompt on your mobile screen to enter your PIN and authorize the payment of <span className="text-white font-bold">KES {totalFee?.toLocaleString()}</span>.
                                </p>

                                <div className="w-full space-y-4 text-left">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5">M-Pesa Mobile Number</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={paymentPhone}
                                                onChange={(e) => setPaymentPhone(e.target.value)}
                                                placeholder="e.g. 254712345678"
                                                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white font-bold tracking-wide focus:ring-2 focus:ring-indigo-500/50"
                                                disabled={paymentStatus === 'sending' || paymentStatus === 'prompt_sent'}
                                            />
                                            <span className="absolute left-3.5 top-3.5 text-slate-500">
                                                <PhoneIcon className="w-4.5 h-4.5" />
                                            </span>
                                        </div>
                                    </div>

                                    {paymentStatus !== 'idle' && (
                                        <div className={`p-4 rounded-xl text-xs font-bold border flex items-start gap-3 ${
                                            paymentStatus === 'prompt_sent' || paymentStatus === 'sending' ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10' :
                                            paymentStatus === 'completed' || paymentStatus === 'success' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' :
                                            'bg-rose-500/5 text-rose-400 border-rose-500/10'
                                        }`}>
                                            {paymentStatus === 'prompt_sent' || paymentStatus === 'sending' ? (
                                                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
                                            ) : paymentStatus === 'completed' || paymentStatus === 'success' ? (
                                                <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                            ) : (
                                                <AlertTriangleIcon className="w-5 h-5 text-rose-400 flex-shrink-0" />
                                            )}
                                            <span className="flex-1">{statusMessage || (paymentStatus === 'sending' ? 'Sending prompt request...' : 'Verification in progress...')}</span>
                                        </div>
                                    )}

                                    {paymentStatus === 'idle' && (
                                        <button
                                            onClick={handleSendStkPush}
                                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            <SparklesIcon className="w-4 h-4" /> Send STK Prompt
                                        </button>
                                    )}

                                    {paymentStatus === 'failed' && (
                                        <button
                                            onClick={handleSendStkPush}
                                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            Retry STK Prompt
                                        </button>
                                    )}

                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setPaymentStatus('idle');
                                                setUseManualPayment(true);
                                                setErrorMsg('');
                                            }}
                                            disabled={paymentStatus === 'sending' || paymentStatus === 'prompt_sent'}
                                            className="w-full py-2.5 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all text-center"
                                        >
                                            Use Manual Verification / Cash / Bank
                                        </button>

                                        <button
                                            onClick={() => {
                                                setPaymentStatus('idle');
                                                setStep(2);
                                            }}
                                            disabled={paymentStatus === 'sending' || paymentStatus === 'prompt_sent'}
                                            className="w-full py-2.5 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-500 hover:text-white transition-all text-center"
                                        >
                                            Change Runner Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Manual Payment UI
                            <div className="w-full">
                                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mb-6 mx-auto">
                                    <QrCodeIcon className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">Manual Payment Verification</h4>
                                <div className="text-xs text-slate-400 mb-6 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-left">
                                    {event.paymentInstructions ? (
                                        <div className="whitespace-pre-wrap font-medium text-slate-300">
                                            {event.paymentInstructions}
                                            <div className="mt-4 pt-4 border-t border-slate-800 text-slate-400">
                                                Total Amount Due: <span className="text-white font-bold">KES {totalFee?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        `Please make payment of KES ${totalFee?.toLocaleString()} to the institution's bank account or M-PESA Till/Paybill, then enter the Transaction Reference Code or Bank Code below to complete your registration.`
                                    )}
                                </div>

                                <div className="w-full space-y-4">
                                    <div>
                                        <label className="block text-left text-xs font-bold text-slate-400 mb-1.5">Transaction Reference / Bank Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={mpesaRef}
                                            onChange={e => setMpesaRef(e.target.value.toUpperCase())}
                                            disabled={paymentStatus === 'sending'}
                                            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white text-center font-bold tracking-wide font-mono focus:ring-2 focus:ring-indigo-500/50"
                                            placeholder="e.g. AP38DE932"
                                        />
                                    </div>

                                    {paymentStatus === 'idle' && (
                                        <button
                                            onClick={handleInitiatePayment}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md"
                                        >
                                            Complete Registration
                                        </button>
                                    )}

                                    {paymentStatus === 'sending' && (
                                        <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-450 font-bold">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            Recording registration and verifying...
                                        </div>
                                    )}

                                    {paymentStatus === 'failed' && (
                                        <div className="py-2.5 px-4 bg-red-950/20 border border-red-800/40 rounded-xl text-center">
                                            <div className="text-xs font-bold text-red-400">Registration failed. Please try again.</div>
                                        </div>
                                    )}

                                    {event.bankIntegrationEnabled && (
                                        <button
                                            onClick={() => {
                                                setPaymentStatus('idle');
                                                setUseManualPayment(false);
                                                setErrorMsg('');
                                            }}
                                            disabled={paymentStatus === 'sending'}
                                            className="w-full py-2.5 border border-slate-850 hover:bg-slate-900 rounded-xl text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all"
                                        >
                                            Switch to Automated M-Pesa Payment
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setPaymentStatus('idle');
                                            setStep(2);
                                        }}
                                        disabled={paymentStatus === 'sending'}
                                        className="w-full py-2.5 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
                                    >
                                        Change Runner Details
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Success Ticket */}
                {step === 4 && registeredParticipant && (
                    <div className="py-4 flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-4 text-green-400">
                            <CheckCircleIcon className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-black text-white">Registration Complete!</h4>
                        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-8">
                            Your payment has been received and race registry entry has been successfully logged.
                        </p>

                        {/* Entry Ticket Card */}
                        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 rounded-[1.5rem] p-4 sm:p-6 relative overflow-hidden flex flex-col items-center">
                            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                            
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Entry Ticket Pass</span>
                            <h5 className="text-lg font-bold text-white max-w-xs truncate">{event.name}</h5>
                            <span className="text-xs text-slate-400 block mb-6">{activeCategory?.name} ({activeCategory?.distanceKm}K)</span>

                            {/* BIB number badge */}
                            <div className="px-8 py-3 bg-slate-950/60 border border-slate-850 rounded-2xl text-center shadow-md mb-6">
                                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">BIB NUMBER</span>
                                <span className="text-4xl font-black text-indigo-400 font-mono tracking-widest block mt-0.5">
                                    {registeredParticipant.bibNumber || 'TBD'}
                                </span>
                            </div>

                            {/* Runner card details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left border-t border-b border-slate-850 py-4 text-xs">
                                <div>
                                    <span className="block text-slate-500 font-medium mb-0.5">Runner Name</span>
                                    <span className="font-bold text-slate-200">{registeredParticipant.firstName} {registeredParticipant.lastName}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500 font-medium mb-0.5">T-Shirt Size</span>
                                    <span className="font-bold text-slate-200">{registeredParticipant.tShirtSize || 'M'}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500 font-medium mb-0.5">Receipt Ref</span>
                                    <span className="font-bold text-slate-200 font-mono text-[11px]">{registeredParticipant.mpesaReference || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500 font-medium mb-0.5">Payment Status</span>
                                    <span className="font-bold text-green-400 uppercase">Confirmed Paid</span>
                                </div>
                            </div>

                            {/* QR code scanner symbol */}
                            <div className="mt-6 flex flex-col items-center">
                                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                                    <QrCodeIcon className="w-24 h-24 text-slate-900" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 mt-2.5 uppercase tracking-widest">Present at Kit Collection Desk</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full justify-center">
                            <button
                                onClick={() => window.print()}
                                className="w-full sm:w-auto px-6 py-2.5 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Print Pass
                            </button>
                            <button
                                onClick={() => {
                                    setStep(1);
                                    setRegisteredParticipant(null);
                                    setMpesaRef('');
                                    setPaymentStatus('idle');
                                    setEventId(null);
                                }}
                                className="w-full sm:w-auto px-8 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                            >
                                Return to Events Board
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
