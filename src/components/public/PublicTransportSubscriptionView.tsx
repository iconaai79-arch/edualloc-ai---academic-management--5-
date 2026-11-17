import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Bus, User, Phone, MapPin, ArrowRight, ArrowLeft,
    CheckCircle, Clock, CreditCard, Banknote, Loader2,
    AlertTriangle, Info, ChevronRight, Sparkles,
    Calendar, RefreshCw, Share2, Building2, X
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import type { CompanyDetails, Institution } from '../../types';
import type {
    RouteFeeSetting, TripPreference, BillingCycle, BillStatus
} from '../TransportBillingManager';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubscriptionRequest {
    id?: string;
    institutionId: string;
    studentName: string;
    admissionNumber: string;
    parentPhone: string;
    routeId: string;
    routeName: string;
    tripPreference: TripPreference;
    billingCycle: BillingCycle;
    baseAmount: number;
    finalAmount: number;
    paymentMethod: 'mpesa_now' | 'pay_later';
    status: BillStatus;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    approvedAt?: string;
    approvedBy?: string;
    submittedAt: string;
    period: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PublicTransportSubscriptionViewProps {
    companyDetails?: CompanyDetails;
    institutions?: Institution[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PREFERENCE_INFO: Record<TripPreference, { label: string; desc: string; multiplier: number; icon: string }> = {
    round_trip:    { label: 'Round Trip',     desc: 'Morning pickup + Evening drop-off', multiplier: 1.0,  icon: '🔄' },
    one_way_pickup:{ label: 'Morning Only',   desc: 'Morning pickup to school only',     multiplier: 0.6,  icon: '🌅' },
    one_way_drop:  { label: 'Evening Only',   desc: 'Evening drop-off from school only', multiplier: 0.6,  icon: '🌆' },
    none:          { label: 'None',           desc: 'No transport required',             multiplier: 0.0,  icon: '❌' },
};

const STEPS = ['Institution', 'Student', 'Route', 'Preference', 'Summary', 'Payment', 'Done'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatKES(amount: number): string {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCurrentPeriod(cycle: BillingCycle): string {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    if (cycle === 'monthly') return `${month} ${year}`;
    const monthNum = now.getMonth() + 1;
    const term = monthNum <= 4 ? 1 : monthNum <= 8 ? 2 : 3;
    return `Term ${term} · ${year}`;
}

// ─── Step components ──────────────────────────────────────────────────────────

const StepDot: React.FC<{ label: string; active: boolean; done: boolean; index: number }> = ({ label, active, done, index }) => (
    <div className="flex flex-col items-center gap-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
            ${done ? 'bg-emerald-500 text-white' : active ? 'bg-sky-600 text-white ring-4 ring-sky-100' : 'bg-slate-200 text-slate-500'}`}>
            {done ? <CheckCircle className="w-5 h-5" /> : index + 1}
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-sky-700' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
            {label}
        </span>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const PublicTransportSubscriptionView: React.FC<PublicTransportSubscriptionViewProps> = ({
    companyDetails,
    institutions = [],
}) => {
    const params = new URLSearchParams(window.location.search);
    const instId = params.get('inst') || params.get('institutionId') || '';

    // Matched institution
    const institution = institutions.find(i => i.id === instId);
    const businessName = institution?.name || companyDetails?.companyName || 'EduAI School';
    const mpesaConfig = (institution as any)?.mpesaConfig || (companyDetails as any)?.mpesaConfig || { paybillNumber: '4086655', environment: 'sandbox' };

    // Wizard state
    const [step, setStep] = useState<number>(0);
    const [routes, setRoutes] = useState<RouteFeeSetting[]>([]);
    const [loadingRoutes, setLoadingRoutes] = useState<boolean>(false);
    const [routeError, setRouteError] = useState<string>('');

    // Form fields
    const [studentName, setStudentName] = useState<string>('');
    const [admissionNo, setAdmissionNo] = useState<string>('');
    const [parentPhone, setParentPhone] = useState<string>('');
    const [selectedRoute, setSelectedRoute] = useState<RouteFeeSetting | null>(null);
    const [tripPref, setTripPref] = useState<TripPreference>('round_trip');
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('term');

    // Payment state
    const [payMethod, setPayMethod] = useState<'mpesa_now' | 'pay_later' | null>(null);
    const [mpesaPhone, setMpesaPhone] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [stkStatus, setStkStatus] = useState<'idle' | 'sent' | 'polling' | 'paid' | 'failed'>('idle');
    const [stkMessage, setStkMessage] = useState<string>('');
    const [checkoutId, setCheckoutId] = useState<string>('');
    const [countdown, setCountdown] = useState<number>(60);
    const [payLaterDone, setPayLaterDone] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string>('');

    // Computed fare
    const baseAmount = useMemo(() => {
        if (!selectedRoute) return 0;
        return billingCycle === 'term' ? selectedRoute.termFee : selectedRoute.monthlyFee;
    }, [selectedRoute, billingCycle]);

    const multiplier = PREFERENCE_INFO[tripPref]?.multiplier ?? 1.0;
    const oneWayPct = selectedRoute?.oneWayPercentage ?? 60;
    const effectiveMultiplier = (tripPref === 'one_way_pickup' || tripPref === 'one_way_drop') ? (oneWayPct / 100) : multiplier;
    const finalAmount = Math.round(baseAmount * effectiveMultiplier);

    // Load routes when reaching step 2
    useEffect(() => {
        if (step === 2 && routes.length === 0 && instId) {
            setLoadingRoutes(true);
            setRouteError('');
            apiService.fetchModuleRecords('transport_route_fee_settings', instId)
                .then((data: RouteFeeSetting[]) => {
                    if (Array.isArray(data) && data.length > 0) {
                        setRoutes(data);
                    } else {
                        setRouteError('No routes configured yet. Contact the school administrator.');
                    }
                })
                .catch(() => setRouteError('Could not load routes. Please try again.'))
                .finally(() => setLoadingRoutes(false));
        }
    }, [step, instId]);

    // STK Push countdown
    useEffect(() => {
        if (stkStatus !== 'sent' && stkStatus !== 'polling') return;
        if (countdown <= 0) { setStkStatus('failed'); setStkMessage('Payment timed out. Try again.'); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [stkStatus, countdown]);

    // Poll STK status
    useEffect(() => {
        if (stkStatus !== 'polling' || !checkoutId) return;
        const interval = setInterval(async () => {
            try {
                const result = await apiService.checkMpesaStkStatus(checkoutId, mpesaConfig);
                if (result?.status === 'completed' || result?.ResultCode === '0') {
                    clearInterval(interval);
                    setStkStatus('paid');
                    setStkMessage('Payment confirmed! ✅');
                    setStep(6);
                } else if (result?.status === 'failed' || (result?.ResultCode && result.ResultCode !== '0')) {
                    clearInterval(interval);
                    setStkStatus('failed');
                    setStkMessage(result?.ResultDesc || 'Payment failed or cancelled.');
                }
            } catch {}
        }, 3000);
        return () => clearInterval(interval);
    }, [stkStatus, checkoutId]);

    // ── Validation ─────────────────────────────────────────────────────────────

    const canProceed = useMemo(() => {
        if (step === 0) return Boolean(instId && institution);
        if (step === 1) return studentName.trim().length >= 2 && admissionNo.trim().length >= 2 && parentPhone.trim().length >= 9;
        if (step === 2) return Boolean(selectedRoute);
        if (step === 3) return tripPref !== 'none';
        if (step === 4) return true;
        if (step === 5) return Boolean(payMethod);
        return false;
    }, [step, instId, institution, studentName, admissionNo, parentPhone, selectedRoute, tripPref, payMethod]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    const saveSubscription = useCallback(async (method: 'mpesa_now' | 'pay_later', invoiceStatus: BillStatus) => {
        const period = getCurrentPeriod(billingCycle);
        const subId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const payload: SubscriptionRequest = {
            id: subId,
            institutionId: instId,
            studentName: studentName.trim(),
            admissionNumber: admissionNo.trim(),
            parentPhone: parentPhone.trim(),
            routeId: selectedRoute!.routeId,
            routeName: selectedRoute!.routeName,
            tripPreference: tripPref,
            billingCycle,
            baseAmount,
            finalAmount,
            paymentMethod: method,
            status: invoiceStatus,
            approvalStatus: 'pending',
            submittedAt: new Date().toISOString(),
            period,
        };

        try {
            await apiService.saveModuleRecord('transport_subscription_requests', payload, instId);
        } catch (e) {
            console.warn('Subscription record save failed (non-fatal):', e);
        }

        // Also save as transport invoice
        try {
            const invoice = {
                studentName: studentName.trim(),
                admissionNumber: admissionNo.trim(),
                routeId: selectedRoute!.routeId,
                routeName: selectedRoute!.routeName,
                preference: tripPref,
                billingCycle,
                period,
                baseAmount,
                discountAmount: 0,
                finalAmount,
                status: invoiceStatus,
                issuedDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                parentPhone: parentPhone.trim(),
                institutionId: instId,
            };
            await apiService.saveModuleRecord('transport_fee_invoices', invoice, instId);
        } catch (e) {
            console.warn('Invoice record save failed (non-fatal):', e);
        }

        // Send SMS confirmation
        try {
            const smsText = method === 'pay_later'
                ? `Dear Parent, ${studentName.trim()}'s transport subscription for ${selectedRoute!.routeName} (${PREFERENCE_INFO[tripPref].label}) has been received. Invoice of ${formatKES(finalAmount)} added to fee bill. Contact ${businessName} for payment. - EduAI`
                : `Dear Parent, payment of ${formatKES(finalAmount)} for ${studentName.trim()}'s transport (${selectedRoute!.routeName}) confirmed. Have a safe term! - ${businessName}`;
            await apiService.sendSms(parentPhone.trim(), smsText, instId);
        } catch (e) {
            console.warn('SMS send failed (non-fatal):', e);
        }
    }, [instId, studentName, admissionNo, parentPhone, selectedRoute, tripPref, billingCycle, baseAmount, finalAmount, businessName]);

    const handlePayLater = async () => {
        setIsSubmitting(true);
        setSubmitError('');
        try {
            await saveSubscription('pay_later', 'pending');
            setPayLaterDone(true);
            setStep(6);
        } catch (e: any) {
            setSubmitError(e?.message || 'Submission failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStkPush = async () => {
        const phone = (mpesaPhone || parentPhone).trim();
        if (!phone) { setStkMessage('Enter your M-Pesa phone number.'); return; }
        setIsSubmitting(true);
        setStkStatus('sent');
        setStkMessage('STK Push sent to your phone. Enter your M-Pesa PIN...');
        setCountdown(60);
        setSubmitError('');
        try {
            const res = await apiService.initiateMpesaStkPush({
                phoneNumber: phone,
                amount: Math.max(1, finalAmount),
                accountReference: `TRANSPORT-${admissionNo.trim()}`,
                transactionDesc: `${selectedRoute!.routeName} Transport Fee`,
                institutionId: instId,
                config: mpesaConfig,
            });
            if (res?.CheckoutRequestID || res?.checkoutRequestId) {
                const cid = res.CheckoutRequestID || res.checkoutRequestId;
                setCheckoutId(cid);
                setStkStatus('polling');
                await saveSubscription('mpesa_now', 'pending');
            } else {
                throw new Error(res?.CustomerMessage || res?.message || 'STK Push failed');
            }
        } catch (e: any) {
            setStkStatus('failed');
            setStkMessage(e?.message || 'M-Pesa request failed. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render helpers ─────────────────────────────────────────────────────────

    const renderStep0 = () => (
        <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-sky-100 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-sky-600" />
            </div>
            <div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-slate-800">{businessName}</h2>
                <p className="text-slate-500 mt-1 text-sm">Transport Subscription Portal</p>
            </div>
            {!institution && instId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Institution not found for this link. Contact the school for a valid link.</span>
                </div>
            )}
            {!instId && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Invalid link — missing institution ID. Please use the link provided by your school.</span>
                </div>
            )}
            {institution && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm flex gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>You're enrolling for transport services at <strong>{businessName}</strong>. Click <strong>Next</strong> to continue.</span>
                </div>
            )}
        </div>
    );

    const renderStep1 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-800 mb-1">Student Details</h2>
                <p className="text-slate-500 text-sm">Enter the student's information to link this subscription.</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Student Full Name *</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={studentName}
                            onChange={e => setStudentName(e.target.value)}
                            placeholder="e.g. John Kamau Mwangi"
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Admission Number *</label>
                    <div className="relative">
                        <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={admissionNo}
                            onChange={e => setAdmissionNo(e.target.value)}
                            placeholder="e.g. ADM/2024/001"
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Parent / Guardian Phone *</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="tel"
                            value={parentPhone}
                            onChange={e => setParentPhone(e.target.value)}
                            placeholder="e.g. 0712345678"
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 placeholder:text-slate-400"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">An SMS confirmation will be sent to this number.</p>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-800 mb-1">Select Route</h2>
                <p className="text-slate-500 text-sm">Choose the transport route closest to your location.</p>
            </div>
            {loadingRoutes && (
                <div className="flex items-center justify-center py-8 gap-3 text-sky-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-sm font-semibold">Loading available routes...</span>
                </div>
            )}
            {routeError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{routeError}</span>
                </div>
            )}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {routes.map(route => (
                    <button
                        key={route.routeId}
                        onClick={() => setSelectedRoute(route)}
                        className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200
                            ${selectedRoute?.routeId === route.routeId
                                ? 'border-sky-500 bg-sky-50 shadow-md'
                                : 'border-slate-200 bg-white hover:border-sky-200'}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <MapPin className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedRoute?.routeId === route.routeId ? 'text-sky-600' : 'text-slate-400'}`} />
                                <div>
                                    <p className={`font-bold text-sm ${selectedRoute?.routeId === route.routeId ? 'text-sky-800' : 'text-slate-700'}`}>
                                        {route.routeName}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Term fee: <strong>{formatKES(route.termFee)}</strong> &nbsp;·&nbsp; Monthly: <strong>{formatKES(route.monthlyFee)}</strong>
                                    </p>
                                </div>
                            </div>
                            {selectedRoute?.routeId === route.routeId && (
                                <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0" />
                            )}
                        </div>
                    </button>
                ))}
            </div>
            {/* Billing Cycle toggle */}
            {selectedRoute && (
                <div className="pt-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">Billing Cycle</label>
                    <div className="flex gap-3">
                        {(['term', 'monthly'] as BillingCycle[]).map(cycle => (
                            <button
                                key={cycle}
                                onClick={() => setBillingCycle(cycle)}
                                className={`flex-1 py-2.5 rounded-lg border-2 font-bold text-sm transition-all
                                    ${billingCycle === cycle ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-200 text-slate-600 hover:border-sky-200'}`}
                            >
                                {cycle === 'term' ? 'Per Term' : 'Monthly'}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-800 mb-1">Trip Preference</h2>
                <p className="text-slate-500 text-sm">How will the student use the school bus?</p>
            </div>
            <div className="space-y-3">
                {(Object.entries(PREFERENCE_INFO) as [TripPreference, typeof PREFERENCE_INFO[TripPreference]][])
                    .filter(([key]) => key !== 'none')
                    .map(([key, info]) => {
                        const cost = key === 'round_trip'
                            ? baseAmount
                            : Math.round(baseAmount * (selectedRoute?.oneWayPercentage ?? 60) / 100);
                        return (
                            <button
                                key={key}
                                onClick={() => setTripPref(key)}
                                className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200
                                    ${tripPref === key
                                        ? 'border-sky-500 bg-sky-50 shadow-md'
                                        : 'border-slate-200 bg-white hover:border-sky-200'}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{info.icon}</span>
                                        <div>
                                            <p className={`font-bold text-sm ${tripPref === key ? 'text-sky-800' : 'text-slate-700'}`}>
                                                {info.label}
                                            </p>
                                            <p className="text-xs text-slate-500">{info.desc}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-base ${tripPref === key ? 'text-sky-700' : 'text-slate-600'}`}>
                                            {formatKES(cost)}
                                        </p>
                                        <p className="text-xs text-slate-400">{billingCycle === 'term' ? '/term' : '/month'}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-800 mb-1">Summary</h2>
                <p className="text-slate-500 text-sm">Review your subscription before proceeding to payment.</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-slate-50 border border-sky-200 rounded-2xl p-5 space-y-3">
                {[
                    ['Student', studentName],
                    ['Admission No.', admissionNo],
                    ['Parent Phone', parentPhone],
                    ['Route', selectedRoute?.routeName ?? '—'],
                    ['Trip Preference', PREFERENCE_INFO[tripPref].label],
                    ['Billing Cycle', billingCycle === 'term' ? 'Per Term' : 'Monthly'],
                    ['Period', getCurrentPeriod(billingCycle)],
                ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                        <span className="text-slate-500 font-semibold">{label}</span>
                        <span className="text-slate-800 font-bold text-right max-w-[55%]">{value}</span>
                    </div>
                ))}
                <div className="border-t border-sky-200 pt-3 mt-3 flex justify-between">
                    <span className="text-slate-700 font-black uppercase tracking-wide">Total Amount</span>
                    <span className="text-sky-700 font-black text-lg">{formatKES(finalAmount)}</span>
                </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800 text-xs flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>You can pay now via M-Pesa or skip and have the invoice added to the school fee bill.</span>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-800 mb-1">Payment</h2>
                <p className="text-slate-500 text-sm">Choose how you'd like to settle the transport fee.</p>
            </div>

            {/* Amount badge */}
            <div className="bg-sky-600 text-white rounded-xl p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Amount Due</p>
                <p className="text-3xl font-black mt-1">{formatKES(finalAmount)}</p>
                <p className="text-xs opacity-70 mt-0.5">{PREFERENCE_INFO[tripPref].label} · {billingCycle === 'term' ? 'Per Term' : 'Monthly'}</p>
            </div>

            {/* Pay Now card */}
            <button
                onClick={() => setPayMethod('mpesa_now')}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200
                    ${payMethod === 'mpesa_now' ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-200 bg-white hover:border-green-200'}`}
            >
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${payMethod === 'mpesa_now' ? 'bg-green-600' : 'bg-green-100'}`}>
                        <Banknote className={`w-5 h-5 ${payMethod === 'mpesa_now' ? 'text-white' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className={`font-black text-sm uppercase tracking-wide ${payMethod === 'mpesa_now' ? 'text-green-800' : 'text-slate-700'}`}>
                                Pay Now via M-Pesa
                            </p>
                            {payMethod === 'mpesa_now' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">STK Push will be sent to your M-Pesa number. Instant confirmation.</p>
                    </div>
                </div>

                {payMethod === 'mpesa_now' && (
                    <div className="mt-4 space-y-3" onClick={e => e.stopPropagation()}>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">M-Pesa Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="tel"
                                    value={mpesaPhone || parentPhone}
                                    onChange={e => setMpesaPhone(e.target.value)}
                                    placeholder="e.g. 0712345678"
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-slate-800"
                                />
                            </div>
                        </div>

                        {/* STK Status feedback */}
                        {stkStatus === 'sent' || stkStatus === 'polling' ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
                                <div>
                                    <p className="text-amber-800 font-semibold text-sm">{stkMessage}</p>
                                    <p className="text-amber-600 text-xs mt-0.5">Waiting for confirmation... {countdown}s</p>
                                </div>
                            </div>
                        ) : stkStatus === 'failed' ? (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-red-700 text-sm">{stkMessage}</p>
                            </div>
                        ) : null}

                        <button
                            onClick={handleStkPush}
                            disabled={isSubmitting || stkStatus === 'sent' || stkStatus === 'polling'}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                            {isSubmitting ? 'Sending STK Push...' : stkStatus === 'polling' ? 'Waiting for Payment...' : 'Send M-Pesa STK Push'}
                        </button>
                    </div>
                )}
            </button>

            {/* Pay Later card */}
            <button
                onClick={() => setPayMethod('pay_later')}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200
                    ${payMethod === 'pay_later' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-200'}`}
            >
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${payMethod === 'pay_later' ? 'bg-blue-600' : 'bg-blue-100'}`}>
                        <Clock className={`w-5 h-5 ${payMethod === 'pay_later' ? 'text-white' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className={`font-black text-sm uppercase tracking-wide ${payMethod === 'pay_later' ? 'text-blue-800' : 'text-slate-700'}`}>
                                Skip & Pay Later
                            </p>
                            {payMethod === 'pay_later' && <CheckCircle className="w-5 h-5 text-blue-500" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Invoice of <strong>{formatKES(finalAmount)}</strong> will be added to the school fee bill. Pay at the bursar.</p>
                    </div>
                </div>

                {payMethod === 'pay_later' && (
                    <div className="mt-4 space-y-2" onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-100 rounded-lg p-3 text-blue-800 text-xs">
                            <p className="font-bold">📋 What happens next:</p>
                            <ul className="mt-1 space-y-1 list-disc list-inside">
                                <li>Your subscription is registered immediately</li>
                                <li>Invoice appears on the school fee statement</li>
                                <li>Pay at the bursar office or via school portal</li>
                                <li>SMS confirmation sent to {parentPhone}</li>
                            </ul>
                        </div>
                        {submitError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-red-700 text-sm">{submitError}</p>
                            </div>
                        )}
                        <button
                            onClick={handlePayLater}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                            {isSubmitting ? 'Submitting...' : 'Confirm & Pay Later'}
                        </button>
                    </div>
                )}
            </button>
        </div>
    );

    const renderStep6 = () => (
        <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-700">Subscription Confirmed!</h2>
                <p className="text-slate-500 mt-2 text-sm">
                    {stkStatus === 'paid'
                        ? 'Your M-Pesa payment was confirmed successfully.'
                        : 'Your transport subscription has been registered. Invoice added to fee bill.'}
                </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2 text-left">
                {[
                    ['Student', studentName],
                    ['Route', selectedRoute?.routeName ?? '—'],
                    ['Preference', PREFERENCE_INFO[tripPref].label],
                    ['Amount', formatKES(finalAmount)],
                    ['Payment', stkStatus === 'paid' ? 'Paid via M-Pesa ✅' : 'Pending — Added to fee bill 📋'],
                ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                        <span className="text-slate-500 font-semibold">{label}</span>
                        <span className="text-slate-800 font-bold">{value}</span>
                    </div>
                ))}
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-700 text-xs flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>An SMS confirmation has been sent to <strong>{parentPhone}</strong>. Please save this for your records.</span>
            </div>
            <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 border-2 border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
            >
                Return to Home
            </button>
        </div>
    );

    const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];
    const isLastContentStep = step === 5;
    const isFirstStep = step === 0;
    const isDone = step === 6;

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-blue-50 flex flex-col items-center justify-start py-8 px-4">
            {/* Header */}
            <div className="w-full max-w-lg mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center">
                        <Bus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-sky-600">EduAI Transport</p>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-wide">{businessName}</p>
                    </div>
                </div>
            </div>

            {/* Step dots */}
            {!isDone && (
                <div className="w-full max-w-lg mb-6 overflow-x-auto">
                    <div className="flex gap-3 items-start justify-between min-w-max mx-auto px-2">
                        {STEPS.slice(0, 6).map((label, i) => (
                            <React.Fragment key={label}>
                                <StepDot label={label} index={i} active={step === i} done={step > i} />
                                {i < 5 && (
                                    <div className={`flex-1 h-0.5 mt-4 min-w-[20px] transition-all ${step > i ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            {/* Card */}
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8">
                {stepContent[step]?.()}

                {/* Navigation */}
                {!isDone && (
                    <div className={`mt-8 flex ${isFirstStep ? 'justify-end' : 'justify-between'} gap-3`}>
                        {!isFirstStep && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                        {/* Only show Next on non-payment steps */}
                        {step < 5 && (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canProceed}
                                className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl transition-all"
                            >
                                {step === 4 ? 'Go to Payment' : 'Next'} <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <p className="mt-6 text-xs text-slate-400 text-center">
                Powered by <strong className="text-sky-600">EduAI Automation Systems</strong> · Secure Transport Enrollment
            </p>
        </div>
    );
};

export default PublicTransportSubscriptionView;
