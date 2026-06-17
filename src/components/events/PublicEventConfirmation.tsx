import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { 
    Calendar, 
    MapPin, 
    Clock, 
    User, 
    Plus, 
    Trash2, 
    CheckCircle, 
    XCircle, 
    Ticket, 
    AlertCircle,
    ArrowLeft,
    ShieldCheck
} from 'lucide-react';

export const PublicEventConfirmation: React.FC = () => {
    const [pinId, setPinId] = useState<string | null>(null);
    const [pinRecord, setPinRecord] = useState<any | null>(null);
    const [eventRecord, setEventRecord] = useState<any | null>(null);
    const [userRecord, setUserRecord] = useState<any | null>(null);
    const [institution, setInstitution] = useState<any | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'idle' | 'success' | 'error'; text: string }>({ type: 'idle', text: '' });
    
    // Form States
    const [rsvpStatus, setRsvpStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
    const [guests, setGuests] = useState<string[]>([]);
    const [guestInput, setGuestInput] = useState('');
    const [useVehicle, setUseVehicle] = useState(false);
    const [vehicleRegistration, setVehicleRegistration] = useState('');
    const [verificationPhone, setVerificationPhone] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [verificationError, setVerificationError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('pinId');
            if (id) {
                setPinId(id);
            } else {
                setErrorMsg('Missing Invitation ID. Please check the RSVP link sent to you.');
                setIsLoading(false);
            }
        } catch (e) {
            setErrorMsg('Failed to parse invitation details.');
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!pinId) return;

        const loadRsvpData = async () => {
            setIsLoading(true);
            setErrorMsg('');
            try {
                const params = new URLSearchParams(window.location.search);
                const dataParam = params.get('data');
                let urlPayload: any = null;
                if (dataParam) {
                    try {
                        urlPayload = JSON.parse(decodeURIComponent(escape(atob(dataParam))));
                    } catch (e) {
                        console.error("Failed to parse fallback URL data payload:", e);
                    }
                }

                // Fetch the event pin details
                let pin = null;
                try {
                    const pins = await apiService.fetchModuleRecords('event_pins', undefined, undefined, {
                        filter: { id: pinId }
                    });
                    if (pins && pins.length > 0) {
                        pin = pins[0];
                    }
                } catch (e) {
                    console.error("Failed to fetch pin from DB, trying payload fallback:", e);
                }

                // Fallback to URL payload if not found in database (array-based payload)
                if (!pin && urlPayload && Array.isArray(urlPayload)) {
                    pin = {
                        id: pinId,
                        pin: urlPayload[0],
                        status: urlPayload[12] || 'pending',
                        eventId: urlPayload[11],
                        userId: urlPayload[10],
                        institutionId: urlPayload[8],
                        guests: urlPayload[13] ? JSON.stringify(urlPayload[13]) : null,
                        vehicleRegistration: urlPayload[14] || null
                    };
                }

                if (!pin) {
                    setErrorMsg('Invitation not found or invalid.');
                    setIsLoading(false);
                    return;
                }

                setPinRecord(pin);
                setRsvpStatus(pin.status);

                if (pin.guests) {
                    try {
                        const parsed = JSON.parse(pin.guests);
                        if (Array.isArray(parsed)) {
                            setGuests(parsed);
                        }
                    } catch (e) {
                        if (pin.guests.trim()) {
                            setGuests([pin.guests]);
                        }
                    }
                }

                if (pin.vehicleRegistration || pin.vehicle_registration) {
                    setUseVehicle(true);
                    setVehicleRegistration(pin.vehicleRegistration || pin.vehicle_registration);
                }

                // Fetch event details
                let event = null;
                try {
                    const events = await apiService.fetchModuleRecords('institution_events', undefined, undefined, {
                        filter: { id: pin.eventId }
                    });
                    if (events && events.length > 0) {
                        event = events[0];
                    }
                } catch (e) {
                    console.error("Failed to fetch event from DB:", e);
                }

                if (!event && urlPayload && Array.isArray(urlPayload)) {
                    event = {
                        id: urlPayload[11],
                        title: urlPayload[1],
                        description: urlPayload[9],
                        eventDate: urlPayload[2],
                        eventTime: urlPayload[3],
                        venue: urlPayload[4]
                    };
                }
                if (event) {
                    setEventRecord(event);
                }

                // Fetch user details
                let userRec = null;
                try {
                    const usersList = await apiService.fetchModuleRecords('users', undefined, undefined, {
                        filter: { id: pin.userId }
                    });
                    if (usersList && usersList.length > 0) {
                        userRec = usersList[0];
                    }
                } catch (e) {
                    console.error("Failed to fetch user from DB:", e);
                }

                if (!userRec && urlPayload && Array.isArray(urlPayload)) {
                    userRec = {
                        id: urlPayload[10],
                        name: urlPayload[5],
                        phoneNumber: urlPayload[6]
                    };
                }
                if (userRec) {
                    setUserRecord(userRec);
                }

                // Fetch institution details
                let inst = null;
                if (pin.institutionId) {
                    try {
                        const insts = await apiService.fetchModuleRecords('institutions', pin.institutionId);
                        if (insts && insts.length > 0) {
                            inst = insts[0];
                        }
                    } catch (e) {
                        console.error("Failed to fetch institution from DB:", e);
                    }
                }

                if (!inst && urlPayload && Array.isArray(urlPayload)) {
                    inst = {
                        id: urlPayload[8],
                        name: urlPayload[7]
                    };
                }
                if (inst) {
                    setInstitution(inst);
                }

            } catch (err: any) {
                console.error("Failed to load RSVP details:", err);
                setErrorMsg('Failed to retrieve invitation details. Please reload.');
            } finally {
                setIsLoading(false);
            }
        };

        loadRsvpData();
    }, [pinId]);

    // Render QR Code on Canvas when status is accepted
    useEffect(() => {
        if (rsvpStatus === 'accepted' && pinRecord) {
            setTimeout(() => {
                const canvas = document.getElementById('pass-qr') as HTMLCanvasElement;
                if (canvas) {
                    const QRCodeLib = (window as any).QRCode;
                    if (QRCodeLib) {
                        const payload = JSON.stringify({
                            type: 'event_attendance',
                            pinId: pinRecord.id,
                            pin: pinRecord.pin,
                            guests: guests,
                            vehicleRegistration: pinRecord.vehicleRegistration || pinRecord.vehicle_registration
                        });

                        QRCodeLib.toCanvas(canvas, payload, {
                            width: 220,
                            margin: 2,
                            color: {
                                dark: '#030617', // slate-950
                                light: '#ffffff'
                            }
                        }, (err: any) => {
                            if (err) console.error("QR Code rendering failed:", err);
                        });
                    }
                }
            }, 100);
        }
    }, [rsvpStatus, pinRecord, guests]);

    const handleAddGuest = (e: React.FormEvent) => {
        e.preventDefault();
        const name = guestInput.trim();
        if (name && !guests.includes(name)) {
            setGuests([...guests, name]);
            setGuestInput('');
        }
    };

    const handleRemoveGuest = (index: number) => {
        setGuests(guests.filter((_, i) => i !== index));
    };

    const handleVerifyPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerificationError('');
        setIsVerifying(true);
        
        try {
            const enteredDigits = verificationPhone.replace(/[^\d]/g, '');
            const rawDbPhone = userRecord?.phoneNumber || userRecord?.phone_number || '';
            const dbPhone = rawDbPhone.replace(/[^\d]/g, '');
            
            if (!enteredDigits) {
                setVerificationError('Please enter your phone number.');
                setIsVerifying(false);
                return;
            }
            if (!dbPhone) {
                setVerificationError('No contact number on record. Please contact the administrator.');
                setIsVerifying(false);
                return;
            }
            
            const cleanPhone = (p: string) => {
                const digits = p.replace(/[^\d]/g, '');
                if (digits.startsWith('254') && digits.length > 9) {
                    return digits.substring(3);
                }
                if (digits.startsWith('0') && digits.length > 8) {
                    return digits.substring(1);
                }
                return digits;
            };

            const cleanEntered = cleanPhone(verificationPhone);
            const cleanDb = cleanPhone(rawDbPhone);

            const match = cleanEntered && cleanDb && (
                cleanEntered === cleanDb || 
                (cleanEntered.length >= 7 && cleanDb.endsWith(cleanEntered)) || 
                (cleanDb.length >= 7 && cleanEntered.endsWith(cleanDb))
            );

            if (match) {
                setIsVerified(true);
                
                // Pre-populate children as accompanying guests by default if guests array is empty
                try {
                    const enrollments = await apiService.fetchModuleRecords('student_enrollments', pinRecord?.institutionId);
                    const students = await apiService.fetchModuleRecords('users', pinRecord?.institutionId, undefined, {
                        filter: { role: 'student' }
                    });

                    const dbParentPhone = dbPhone.slice(-9);
                    
                    const matchedStudents = students.filter((stu: any) => {
                        const studentParentIds = stu.parentIds || stu.parent_ids || [];
                        const isIdMatch = Array.isArray(studentParentIds) 
                            ? studentParentIds.includes(userRecord.id)
                            : typeof studentParentIds === 'string' && studentParentIds.includes(userRecord.id);

                        const sParentPhone = (stu.parentPhone || stu.parent_phone || stu.phoneNumber || stu.phone_number || '').replace(/[^\d]/g, '').slice(-9);
                        const isPhoneMatch = sParentPhone && dbParentPhone && (sParentPhone === dbParentPhone);

                        return isIdMatch || isPhoneMatch;
                    });

                    const matchedEnrollments = enrollments.filter((enr: any) => {
                        const eParentPhone = (enr.metadata?.parentPhone || enr.metadata?.parent_phone || '').replace(/[^\d]/g, '').slice(-9);
                        return eParentPhone && dbParentPhone && (eParentPhone === dbParentPhone);
                    });

                    const childrenGuests: string[] = [];

                    matchedStudents.forEach((stu: any) => {
                        const enr = enrollments.find((e: any) => e.userId === stu.id);
                        const adm = stu.admissionNumber || stu.admission_number || enr?.admissionNumber || enr?.admission_number || 'N/A';
                        const name = stu.name;
                        const grade = enr?.metadata?.gradeLevel || enr?.metadata?.grade_level || stu.gradeLevel || stu.grade_level || '';
                        const stream = enr?.metadata?.stream || '';
                        const className = [grade, stream].filter(Boolean).join(' ') || 'N/A';
                        
                        const guestStr = `${adm} - ${name} (${className})`;
                        if (!childrenGuests.includes(guestStr)) {
                            childrenGuests.push(guestStr);
                        }
                    });

                    matchedEnrollments.forEach((enr: any) => {
                        const stu = students.find((s: any) => s.id === enr.userId);
                        if (!stu) return;
                        
                        const adm = stu.admissionNumber || stu.admission_number || enr.admissionNumber || enr.admission_number || 'N/A';
                        const name = stu.name;
                        const grade = enr.metadata?.gradeLevel || enr.metadata?.grade_level || stu.gradeLevel || stu.grade_level || '';
                        const stream = enr.metadata?.stream || '';
                        const className = [grade, stream].filter(Boolean).join(' ') || 'N/A';
                        
                        const guestStr = `${adm} - ${name} (${className})`;
                        if (!childrenGuests.includes(guestStr)) {
                            childrenGuests.push(guestStr);
                        }
                    });

                    if (childrenGuests.length > 0 && guests.length === 0) {
                        setGuests(childrenGuests);
                    }
                } catch (err) {
                    console.error("Failed to pre-populate children guests:", err);
                }
            } else {
                setVerificationError('Verification failed. The phone number does not match our records.');
            }
        } catch (error: any) {
            console.error("Verification processing error:", error);
            setVerificationError('An error occurred during verification. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRsvpSubmit = async (status: 'accepted' | 'rejected') => {
        if (!pinRecord) return;
        setIsLoading(true);
        setStatusMsg({ type: 'idle', text: '' });

        try {
            const updatedRecord = {
                ...pinRecord,
                status: status,
                guests: status === 'accepted' ? JSON.stringify(guests) : null,
                vehicleRegistration: status === 'accepted' && useVehicle ? vehicleRegistration.trim() : null
            };

            await apiService.saveModuleRecord('event_pins', updatedRecord);
            setPinRecord(updatedRecord);
            setRsvpStatus(status);
            
            // Trigger Stage 2 notification only when Accepted
            if (status === 'accepted') {
                const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                    ? 'https://portal.eduai.co.ke'
                    : window.location.origin;
                
                const updatedPayload = [
                    pinRecord.pin,                                        // 0
                    eventRecord.title,                                    // 1
                    eventRecord.eventDate,                                // 2
                    eventRecord.eventTime,                                // 3
                    eventRecord.venue,                                    // 4
                    userRecord.name,                                      // 5
                    userRecord.phoneNumber || userRecord.phone_number || '', // 6
                    institution.name,                                     // 7
                    institution.id,                                       // 8
                    eventRecord.description || '',                        // 9
                    pinRecord.userId,                                     // 10
                    pinRecord.eventId,                                    // 11
                    status,                                               // 12 (status)
                    guests,                                               // 13 (guests array)
                    updatedRecord.vehicleRegistration                     // 14 (vehicle registration)
                ];
                const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(updatedPayload))));
                const passUrl = `${origin}/?view=event-confirm&pinId=${pinRecord.id}&data=${base64Data}`;
                const shortenedPassUrl = passUrl;
                
                const eventTitle = eventRecord ? eventRecord.title : 'the event';
                const message = `Your attendance to "${eventTitle}" is confirmed. Show this PIN: ${pinRecord.pin} or check-in pass: ${shortenedPassUrl} at the gate for scan.`;

                if (userRecord?.phoneNumber) {
                    try {
                        const smsConfig = institution?.smsConfig || institution?.sms_config;
                        await apiService.sendSms(userRecord.phoneNumber, message, smsConfig, 1, pinRecord.institutionId);
                    } catch (e) {
                        console.error("Stage 2 SMS dispatch failed:", e);
                    }
                }
                if (userRecord?.email) {
                    try {
                        const emailConfig = institution?.emailConfig || institution?.email_config;
                        await apiService.sendEmail(userRecord.email, `RSVP Confirmed - ${eventTitle}`, message, emailConfig);
                    } catch (e) {
                        console.error("Stage 2 Email dispatch failed:", e);
                    }
                }
            }

            setStatusMsg({ 
                type: 'success', 
                text: status === 'accepted' 
                    ? 'RSVP Confirmed! Your attendance pass has been generated.' 
                    : 'Response recorded. You have declined the invitation.' 
            });
        } catch (err: any) {
            console.error("Failed to submit RSVP:", err);
            setStatusMsg({ type: 'error', text: `Failed to submit RSVP: ${err.message || 'Error occurred'}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading && !pinRecord) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
                <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-bold text-slate-400">Loading your invitation details...</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-6">
                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Invitation Error</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{errorMsg}</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 bg-slate-850 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                    >
                        Go to Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col pb-16">
            {/* Header / Brand */}
            <div className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-900 px-4 sm:px-6 py-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                            E
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                                {institution?.name || 'Academic Portal'}
                            </span>
                            <span className="text-xs font-bold text-slate-400">Event RSVP Gate</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow flex items-center justify-center px-4 pt-8 sm:pt-12">
                <div className="max-w-xl w-full">
                    {/* Status Alert */}
                    {statusMsg.type !== 'idle' && (
                        <div className={`mb-6 p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center border ${
                            statusMsg.type === 'success' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                            {statusMsg.text}
                        </div>
                    )}

                    {/* PHASE 1: Pending Invitation Form */}
                    {rsvpStatus === 'pending' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8">
                            <div className="text-center space-y-2">
                                <span className="px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5 mb-2">
                                    Invitation Pending
                                </span>
                                <h2 className="text-3xl font-black tracking-tight text-white uppercase">You're Invited!</h2>
                                <p className="text-slate-400 text-xs sm:text-sm">
                                    Hello <strong className="text-white">{userRecord?.name || 'Parent'}</strong>, please confirm if you will attend the scheduled event below.
                                </p>
                            </div>

                            {/* Event Details Card */}
                            <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-5 space-y-4">
                                <h3 className="text-lg font-black text-white">{eventRecord?.title || 'Institution Event'}</h3>
                                {eventRecord?.description && (
                                    <p className="text-xs text-slate-400 leading-relaxed">{eventRecord.description}</p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 pt-2 border-t border-slate-900">
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-indigo-400" />
                                        {eventRecord?.eventDate || 'Date TBD'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-indigo-400" />
                                        {eventRecord?.eventTime || 'Time TBD'}
                                    </span>
                                    <span className="flex items-center gap-2 sm:col-span-2">
                                        <MapPin className="w-4 h-4 text-indigo-400" />
                                        {eventRecord?.venue || 'Venue TBD'}
                                    </span>
                                </div>
                            </div>

                            {!isVerified ? (
                                <div className="space-y-6 pt-4 border-t border-slate-850 animate-fade-in">
                                    <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase text-white tracking-wider">Verification Required</h4>
                                                <p className="text-[10px] text-slate-400">Verify your phone number to access RSVP options.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleVerifyPhone} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">
                                                Phone Number
                                            </label>
                                            <input 
                                                type="tel" 
                                                placeholder="Enter registered phone number" 
                                                value={verificationPhone}
                                                onChange={e => {
                                                    setVerificationPhone(e.target.value);
                                                    if (verificationError) setVerificationError('');
                                                }}
                                                className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-4 py-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-650"
                                            />
                                            {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (userRecord?.phoneNumber || userRecord?.phone_number) && (
                                                <p className="text-[10px] text-indigo-400 font-bold mt-1">
                                                    [Development Mode] Expected: {userRecord.phoneNumber || userRecord.phone_number}
                                                </p>
                                            )}
                                        </div>

                                        {verificationError && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] font-bold text-rose-400 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                <span>{verificationError}</span>
                                            </div>
                                        )}

                                        <button 
                                            type="submit"
                                            disabled={isVerifying}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
                                        >
                                            {isVerifying ? 'Verifying...' : 'Verify Identity'}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <>
                                    {/* Guests Input Form */}
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                            Accompanying Guests
                                        </label>
                                        <form onSubmit={handleAddGuest} className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Enter guest name" 
                                                value={guestInput}
                                                onChange={e => setGuestInput(e.target.value)}
                                                className="flex-grow bg-slate-950 border border-slate-850 rounded-2xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                            <button 
                                                type="submit"
                                                className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center transition-colors"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </form>

                                        {guests.length > 0 && (
                                            <div className="space-y-2 pt-2">
                                                {guests.map((g, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-slate-950/60 border border-slate-900 rounded-xl px-4 py-2 text-xs">
                                                        <span className="text-slate-300 font-bold flex items-center gap-2">
                                                            <User className="w-3.5 h-3.5 text-slate-500" />
                                                            {g}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleRemoveGuest(i)}
                                                            className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Vehicle Input Fields */}
                                    <div className="space-y-4 pt-4 border-t border-slate-850">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                id="use-vehicle"
                                                checked={useVehicle}
                                                onChange={e => {
                                                    setUseVehicle(e.target.checked);
                                                    if (!e.target.checked) setVehicleRegistration('');
                                                }}
                                                className="w-4 h-4 rounded border-slate-800 text-indigo-650 bg-slate-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                            />
                                            <label htmlFor="use-vehicle" className="text-xs font-black uppercase text-slate-400 cursor-pointer select-none">
                                                I will be using a vehicle
                                            </label>
                                        </div>

                                        {useVehicle && (
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                                    Vehicle Registration Number
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. KAA 123A" 
                                                    value={vehicleRegistration}
                                                    onChange={e => setVehicleRegistration(e.target.value.toUpperCase())}
                                                    className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* RSVP Actions */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                        <button
                                            onClick={() => handleRsvpSubmit('accepted')}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Accept Invite
                                        </button>
                                        <button
                                            onClick={() => handleRsvpSubmit('rejected')}
                                            className="w-full py-4 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest border border-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4 text-rose-400" />
                                            Decline Invite
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* PHASE 2: Confirmed Pass Card */}
                    {rsvpStatus === 'accepted' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8 text-center print:border-none print:shadow-none print:bg-white print:text-black">
                            {/* Prominent PIN Display for Security Gate */}
                            <div className="bg-indigo-600/90 border border-indigo-500/30 rounded-[2rem] p-6 text-center shadow-lg print:hidden animate-pulse">
                                <span className="text-[10px] font-black uppercase text-indigo-200 tracking-widest block mb-1">
                                    Gate Access PIN Code
                                </span>
                                <div className="text-4xl font-mono font-black text-white tracking-widest my-2">
                                    {pinRecord?.pin}
                                </div>
                                <p className="text-indigo-100 text-[11px] leading-relaxed max-w-xs mx-auto">
                                    Present this PIN at the security gate check-in to verify entry and print your gatepass.
                                </p>
                            </div>

                            <div className="space-y-2 print:hidden">
                                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-2">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Attendance Confirmed</h2>
                                <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                                    Your response has been saved. Please show the QR pass or PIN details at the gate check-in.
                                </p>
                            </div>

                            {/* Ticket Card */}
                            <div className="bg-slate-950 border border-slate-850 rounded-[2rem] p-6 space-y-6 relative overflow-hidden print:bg-white print:border-2 print:border-black">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 print:hidden"></div>
                                
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block print:text-indigo-600">
                                        Check-In Gate Pass
                                    </span>
                                    <h3 className="text-xl font-black text-white print:text-black">{eventRecord?.title || 'Institution Event'}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        For: {userRecord?.name || 'Invited Parent'}
                                    </p>
                                </div>

                                {/* QR Canvas */}
                                <div className="inline-block bg-white p-3 rounded-2xl shadow-xl mx-auto">
                                    <canvas id="pass-qr" className="w-48 h-48 mx-auto" />
                                </div>

                                {/* backup PIN */}
                                <div className="bg-slate-900/60 border border-slate-850 rounded-2xl py-3 px-4 max-w-xs mx-auto print:border-black">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Backup Entry PIN</span>
                                    <span className="text-2xl font-mono font-black text-indigo-400 tracking-wider print:text-indigo-600">
                                        {pinRecord?.pin}
                                    </span>
                                </div>

                                {/* Event Info Details */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-450 pt-4 border-t border-slate-900 print:border-black">
                                    <span className="flex items-center gap-1.5 justify-center">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                        {eventRecord?.eventDate}
                                    </span>
                                    <span className="flex items-center gap-1.5 justify-center">
                                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                        {eventRecord?.eventTime}
                                    </span>
                                    <span className="flex items-center gap-1.5 justify-center col-span-2">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                        {eventRecord?.venue}
                                    </span>
                                </div>

                                {/* Accompanying Guests / Vehicle Info */}
                                {(guests.length > 0 || pinRecord?.vehicleRegistration) && (
                                    <div className="pt-4 border-t border-slate-900 text-left space-y-3 print:border-black">
                                        {guests.length > 0 && (
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block text-center">
                                                    Accompanying Guests ({guests.length})
                                                </span>
                                                <div className="flex flex-wrap gap-1.5 justify-center">
                                                    {guests.map((g, i) => (
                                                        <span key={i} className="px-2.5 py-1 bg-slate-900 border border-slate-850 text-slate-350 rounded-lg text-[10px] font-bold print:border-black print:text-black">
                                                            {g}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {pinRecord?.vehicleRegistration && (
                                            <div className="space-y-1.5 pt-1">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block text-center">
                                                    Vehicle Access Cleared
                                                </span>
                                                <div className="text-center">
                                                    <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest inline-block print:border-black print:text-black">
                                                        {pinRecord.vehicleRegistration}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Pass Actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 print:hidden">
                                <button
                                    onClick={handlePrint}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                                >
                                    <Ticket className="w-4 h-4" />
                                    Print Pass
                                </button>
                                <button
                                    onClick={() => handleRsvpSubmit('rejected')}
                                    className="w-full py-4 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-2xl font-black uppercase text-xs tracking-widest border border-slate-800 transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-4 h-4 text-rose-400" />
                                    Decline Invitation
                                </button>
                            </div>
                            <div className="pt-2 print:hidden">
                                <button 
                                    onClick={() => setRsvpStatus('pending')}
                                    className="text-[10px] font-black uppercase text-indigo-400 hover:underline inline-flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Modify RSVP / Guests
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PHASE 3: Declined/Rejected Confirmation Card */}
                    {rsvpStatus === 'rejected' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8 text-center">
                            <div className="space-y-2">
                                <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-400 mx-auto mb-2">
                                    <XCircle className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Invitation Declined</h2>
                                <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                                    You have declined the invitation to this event. We have updated our records accordingly.
                                </p>
                            </div>

                            <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-5 space-y-4">
                                <h3 className="text-base font-black text-slate-350">{eventRecord?.title}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    Declined by: {userRecord?.name || 'Parent'}
                                </p>
                            </div>

                            <div className="pt-4">
                                <button 
                                    onClick={() => setRsvpStatus('pending')}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/10 transition-all"
                                >
                                    Change RSVP / Accept
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
