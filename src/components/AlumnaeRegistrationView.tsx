
import React, { useState, useMemo } from 'react';
import { 
    GraduationCap, 
    Search, 
    User, 
    Mail, 
    Briefcase, 
    Calendar, 
    ChevronRight, 
    ChevronLeft, 
    CheckCircle2, 
    Building2,
    Globe,
    Linkedin,
    Twitter,
    ShieldCheck,
    ArrowRight,
    MapPin,
    Star,
    Camera,
    Hash,
    Loader2,
    AlertCircle
} from 'lucide-react';
import type { SchoolRegistry } from '../types';
import { apiService } from '../services/apiService';

interface AlumnaeRegistrationViewProps {
    registry: SchoolRegistry[];
    initialSchool?: SchoolRegistry | null;
    onComplete: (data: any) => void;
    onBackToPortal: () => void;
    onCheckAdmission?: (admNo: string, schoolId: string) => Promise<{ exists: boolean; message?: string }>;
    onInitiatePayment?: (amount: number, phone: string, reference: string, schoolId?: string) => Promise<{ success: boolean; transactionId?: string; checkoutRequestId?: string; message?: string }>;
    onCheckPaymentStatus?: (checkoutRequestId: string) => Promise<any>;
    joiningFee?: number;
    feeEnabled?: boolean;
}

export const AlumnaeRegistrationView: React.FC<AlumnaeRegistrationViewProps> = ({ registry, initialSchool, onComplete, onBackToPortal, onCheckAdmission, onInitiatePayment, onCheckPaymentStatus, joiningFee = 0, feeEnabled = true }) => {
    const [step, setStep] = useState(initialSchool ? 2 : 1);
    const [searchTerm, setSearchTerm] = useState(initialSchool?.name || '');
    const [selectedSchool, setSelectedSchool] = useState<SchoolRegistry | null>(initialSchool || null);
    const [isCheckingAdm, setIsCheckingAdm] = useState(false);
    const [admError, setAdmError] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [paymentMessage, setPaymentMessage] = useState('');

    React.useEffect(() => {
        if (initialSchool) {
            setSelectedSchool(initialSchool);
            setSearchTerm(initialSchool.name);
            setStep(2);
        }
    }, [initialSchool]);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        admissionNumber: '',
        graduationYear: new Date().getFullYear().toString(),
        department: '',
        currentJob: '',
        currentCompany: '',
        linkedinUrl: '',
        twitterUrl: '',
        bio: '',
        isAnonymous: false,
        profilePictureFile: null as File | null
    });

    const filteredSchools = useMemo(() => {
        if (!searchTerm || selectedSchool) return [];
        const lower = searchTerm.toLowerCase();
        const searchTerms = lower.split(' ').filter(t => t.length > 1);
        
        return registry.filter(s => {
            const schoolData = `${s.name} ${s.knecCode} ${s.county} ${s.region} ${s.uic}`.toLowerCase();
            
            // If very short, must be start of name or code
            if (lower.length < 3) return schoolData.includes(lower);
            
            // Multi-word search
            return searchTerms.every(term => schoolData.includes(term));
        }).slice(0, 15);
    }, [registry, searchTerm, selectedSchool]);

    const handleNext = () => {
        if (step === 3 && joiningFee === 0) {
            handleFinalize();
        } else {
            setStep(step + 1);
        }
    };
    const handlePrev = () => setStep(step - 1);

    const handleFinalize = () => {
        onComplete({
            ...formData,
            schoolId: selectedSchool?.id,
            schoolName: selectedSchool?.name,
            paymentId: paymentStatus === 'success' ? 'paid_' + Date.now() : null
        });
    };

    const handlePayment = async () => {
        if (!feeEnabled || joiningFee <= 0) {
            handleFinalize();
            return;
        }
        if (!onInitiatePayment) return;
        const normalizePhone = (phone: string) => {
            let p = phone.replace(/\D/g, '');
            if (p.startsWith('0')) p = '254' + p.substring(1);
            if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
            if (p.length === 9) p = '254' + p;
            return p;
        };

        const formattedPhone = normalizePhone(formData.phoneNumber);
        setPaymentStatus('pending');
        setPaymentMessage('Preparing secure NCBA Loop link...');
        
        try {
            const res = await onInitiatePayment(joiningFee, formattedPhone, `ALUMNA_${formData.admissionNumber}`, selectedSchool?.id);
            if (res.success && res.checkoutRequestId) {
                try {
                    // Confirm saving to DB by recording pending attempt
                    await apiService.saveModuleRecord('mpesa_transactions', {
                        id: `txn_reg_${Date.now()}`,
                        institutionId: 'GLOBAL',
                        amount: joiningFee,
                        phoneNumber: formData.phoneNumber,
                        payerName: `${formData.fullName} (Registration Pending)`,
                        timestamp: new Date().toISOString(),
                        status: 'pending',
                        provider: 'ncba',
                        checkoutRequestId: res.checkoutRequestId,
                        description: `Alumnae Activation: ${selectedSchool?.name}`
                    });
                } catch (saveErr) {
                    console.warn("Failed to record pending transaction, continuing with polling:", saveErr);
                }

                setPaymentMessage('Prompt sent! Waiting for your pin... Do not close this page.');
                
                // Polling logic
                let attempts = 0;
                const maxAttempts = 40; // 2 minutes (balanced)
                const pollTimer = setInterval(async () => {
                    attempts++;
                    
                    let statusRes: any = { status: 'pending' };
                    if (onCheckPaymentStatus) {
                        statusRes = await onCheckPaymentStatus(res.checkoutRequestId);
                    } else {
                        statusRes = await apiService.checkPaymentStatus('ncba', res.checkoutRequestId, { institutionId: 'GLOBAL', phoneNumber: formData.phoneNumber });
                    }
                    
                    const statusStr = (statusRes?.status || '').toLowerCase();
                    const isCompleted = statusStr === 'completed' || statusStr === 'success' || statusStr === 'successful';
                    const isFailed = statusStr === 'failed' || statusStr === 'error' || statusStr === 'rejected';

                    if (isCompleted) {
                        clearInterval(pollTimer);
                        setPaymentStatus('success');
                        setPaymentMessage('Payment Verified! Finalizing your registration...');
                        setTimeout(() => handleFinalize(), 2000);
                    } else if (isFailed || attempts >= maxAttempts) {
                        clearInterval(pollTimer);
                        setPaymentStatus('error');
                        
                        // Detailed error resolution
                        let detailedMsg = statusRes.message || 'Payment verification failed.';
                        if (attempts >= maxAttempts) detailedMsg = 'Verification timed out. If you have paid, please contact support.';
                        if (statusRes.description) detailedMsg += ` (${statusRes.description})`;
                        
                        setPaymentMessage(detailedMsg);
                    }
                }, 3000);
            } else if (res.success) {
                // Fallback if no checkout requestId was returned
                setPaymentStatus('success');
                setPaymentMessage('Payment Verified! Finalizing your registration...');
                setTimeout(() => handleFinalize(), 2000);
            } else {
                setPaymentStatus('error');
                setPaymentMessage(res.message || 'Payment failed. Please try again.');
            }
        } catch (e) {
            setPaymentStatus('error');
            setPaymentMessage('Connection error. Please try again.');
        }
    };

    const isStep1Valid = !!selectedSchool;
    const isStep2Valid = formData.fullName && formData.email && formData.phoneNumber && formData.admissionNumber && !admError;
    const isStep3Valid = formData.graduationYear && formData.currentJob;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, profilePictureFile: file });
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const validateAdmission = async (admNo: string) => {
        if (!admNo || !selectedSchool) return;
        setIsCheckingAdm(true);
        setAdmError('');
        try {
            if (onCheckAdmission) {
                const res = await onCheckAdmission(admNo, selectedSchool.id);
                if (res.exists) {
                    setAdmError(res.message || 'This admission number is already registered.');
                }
            }
        } catch (e) {
            console.error("Validation Error:", e);
        } finally {
            setIsCheckingAdm(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-10 md:py-20 px-4">
            {/* Branding */}
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-10 md:mb-16 animate-fade-in text-center md:text-left">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 p-2 group overflow-hidden">
                    <img 
                        src="/alumnae_logo_3d.png" 
                        alt="Alumnae Logo" 
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" 
                    />
                </div>
                <div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Alumnae <br /><span className="text-indigo-600 italic">Network</span></h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2 ml-1">Official Registration Portal</p>
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="w-full max-w-2xl mb-8 md:mb-12 px-2 md:px-10">
                <div className="relative flex justify-between items-center">
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10"></div>
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / (joiningFee > 0 ? 4 : 3)) * 100}%` }}></div>
                    
                    {[1, 2, 3, 4, ...(joiningFee > 0 ? [5] : [])].map((s) => (
                        <div key={s} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs transition-all duration-500 ${
                            step >= s ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}>
                            {step > s ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : s}
                        </div>
                    ))}
                </div>
                <div className="hidden sm:flex justify-between mt-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Institution</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>Identity</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>Career</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 4 ? 'text-indigo-600' : 'text-slate-400'}`}>{joiningFee > 0 ? 'Billing' : 'Verify'}</span>
                    {joiningFee > 0 && <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 5 ? 'text-indigo-600' : 'text-slate-400'}`}>Verify</span>}
                </div>
            </div>

            {/* Form Card */}
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-12 relative overflow-hidden">
                
                {/* Step 1: School Selection */}
                {step === 1 && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="text-center">
                            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-none">Find Your <br /><span className="text-indigo-600 italic">Alma Mater</span></h2>
                            {registry.length === 0 ? (
                                <p className="text-indigo-500 text-xs font-black uppercase tracking-widest mt-4 animate-pulse flex items-center justify-center gap-2">
                                    <Globe className="w-4 h-4 animate-spin" /> Synchronizing National Registry...
                                </p>
                            ) : (
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4 italic">Select your school from our national registry</p>
                            )}
                        </div>

                        <div className="relative group">
                            <input 
                                type="text"
                                placeholder="Start typing school name or code..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (selectedSchool && e.target.value !== selectedSchool.name) {
                                        setSelectedSchool(null);
                                    }
                                }}
                                className="w-full h-16 md:h-20 pl-14 md:pl-16 pr-8 bg-slate-50 dark:bg-slate-800 rounded-2xl md:rounded-[2rem] text-sm md:text-lg font-bold border-none focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                            />
                            <Search className="w-5 h-5 md:w-7 md:h-7 absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            
                            {filteredSchools.length > 0 && !selectedSchool && (
                                <div className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
                                    {filteredSchools.map((s) => (
                                        <button 
                                            key={s.id}
                                            onClick={() => { setSelectedSchool(s); setSearchTerm(s.name); }}
                                            className="w-full text-left p-6 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-4 transition-colors group"
                                        >
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{s.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.county} • {s.region}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedSchool && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                    <Star className="absolute top-4 right-4 text-white/20 w-12 h-12 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Selected Institution</p>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight italic">{selectedSchool.name}</h3>
                                    <div className="flex gap-4 mt-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full">
                                            <MapPin className="w-3.5 h-3.5" /> {selectedSchool.county}
                                        </div>
                                        <button onClick={() => setSelectedSchool(null)} className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white underline underline-offset-4 decoration-white/20">Change School</button>
                                    </div>
                                </div>

                                {!selectedSchool.institutionId && (
                                    <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-200 dark:border-amber-900/30 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-tight text-amber-800 dark:text-amber-400">School Admin?</h4>
                                                <p className="text-[9px] font-bold text-amber-600/70 uppercase tracking-widest">Activate your official portal today</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => window.location.href = `/?view=register&claimSchoolId=${selectedSchool.id}`}
                                            className="px-6 py-3 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-amber-700 transition-all active:scale-95"
                                        >
                                            Claim Portal
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <button 
                            disabled={!isStep1Valid}
                            onClick={handleNext}
                            className="w-full h-20 bg-slate-900 disabled:opacity-30 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-100 transition-all hover:bg-indigo-600 flex items-center justify-center gap-3 active:scale-95 translate-y-4"
                        >
                            Next Module <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Step 2: Identity Profile */}
                {step === 2 && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-tight">Identity <br /> <span className="text-indigo-600 italic">Profile Verification</span></h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">How shall we identify you in the network?</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-center mb-8">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-3xl bg-slate-50 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-slate-300" />
                                        )}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                            <Camera className="w-8 h-8 text-white" />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2 text-center">Profile Picture</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Full Legal Name" 
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600" 
                                    />
                                    <User className="w-5 h-5 absolute left-5 top-5.5 text-slate-400" />
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Admission Number" 
                                        value={formData.admissionNumber}
                                        onChange={(e) => {
                                            setFormData({...formData, admissionNumber: e.target.value});
                                            if (admError) setAdmError('');
                                        }}
                                        onBlur={(e) => validateAdmission(e.target.value)}
                                        className={`w-full h-16 pl-14 pr-10 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 ${admError ? 'ring-2 ring-red-500' : 'focus:ring-indigo-600'}`} 
                                    />
                                    <Hash className="w-5 h-5 absolute left-5 top-5.5 text-slate-400" />
                                    {isCheckingAdm && <Loader2 className="w-5 h-5 absolute right-4 top-5.5 text-indigo-600 animate-spin" />}
                                    {admError && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1 ml-2">{admError}</p>}
                                </div>
                            </div>

                            <div className="relative">
                                <input 
                                    type="email" 
                                    placeholder="Personal Email Address" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600" 
                                />
                                <Mail className="w-5 h-5 absolute left-5 top-5.5 text-slate-400" />
                            </div>
                            <div className="relative">
                                <input 
                                    type="tel" 
                                    placeholder="Primary Contact Number" 
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600" 
                                />
                                <Globe className="w-5 h-5 absolute left-5 top-5.5 text-slate-400" />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                            <button onClick={handlePrev} className="h-20 w-24 bg-slate-100 text-slate-400 rounded-[1.5rem] flex items-center justify-center hover:bg-slate-200 transition-colors">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button 
                                disabled={!isStep2Valid}
                                onClick={handleNext}
                                className="flex-1 h-20 bg-indigo-600 disabled:opacity-30 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                Continue To Career <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Academic & Professional */}
                {step === 3 && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-tight">Legacy & <br /> <span className="text-indigo-600 italic">Professional Stature</span></h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Connect your history with your future</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="relative col-span-1">
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 ml-4">Graduation Year</label>
                                <input 
                                    type="number" 
                                    placeholder="e.g. 2018"
                                    value={formData.graduationYear}
                                    onChange={(e) => setFormData({...formData, graduationYear: e.target.value})}
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600" 
                                />
                                <Calendar className="w-5 h-5 absolute left-5 top-[3.25rem] text-slate-400" />
                            </div>
                            <div className="relative col-span-1">
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 ml-4">Current Profession</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Software Engineer"
                                    value={formData.currentJob}
                                    onChange={(e) => setFormData({...formData, currentJob: e.target.value})}
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600" 
                                />
                                <Briefcase className="w-5 h-5 absolute left-5 top-[3.25rem] text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="LinkedIn Profile URL"
                                    value={formData.linkedinUrl}
                                    onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})}
                                    className="w-full h-16 pl-14 pr-6 bg-slate-100/50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none" 
                                />
                                <Linkedin className="w-5 h-5 absolute left-5 top-5.5 text-[#0077B5]" />
                            </div>
                            <textarea 
                                placeholder="Short Professional Biography (Optional)"
                                value={formData.bio}
                                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                className="w-full h-32 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                            ></textarea>
                        </div>

                        <div className="flex gap-4 pt-6">
                            <button onClick={handlePrev} className="h-20 w-24 bg-slate-100 text-slate-400 rounded-[1.5rem] flex items-center justify-center hover:bg-slate-200 transition-colors">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button 
                                disabled={!isStep3Valid}
                                onClick={handleNext}
                                className="flex-1 h-20 bg-indigo-600 disabled:opacity-30 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                Review Submission <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Billing (If applicable) */}
                {step === 4 && joiningFee > 0 && (
                    <div className="space-y-8 animate-fade-in-up text-center">
                        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                             <CheckCircle2 className="w-12 h-12" />
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-tight">Activation <br /> <span className="text-indigo-600 italic">Financials</span></h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">A one-off service fee of <span className="text-slate-900 dark:text-white font-black italic">KES {joiningFee.toLocaleString()}</span> is required for platform access and networking tools.</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] p-10 text-left relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">NCBA Connected Number</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white">{formData.phoneNumber}</p>
                                </div>
                                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 ring-4 ring-white dark:ring-slate-700">
                                    <Hash className="w-6 h-6" />
                                </div>
                            </div>

                            {paymentStatus === 'idle' && (
                                <button 
                                    onClick={handlePayment}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-900 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <ArrowRight className="w-5 h-5" /> Pay KES {joiningFee.toLocaleString()} via NCBA
                                </button>
                            )}

                            {paymentStatus === 'pending' && (
                                <div className="space-y-6 text-center py-4">
                                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest animate-pulse">{paymentMessage}</p>
                                </div>
                            )}

                            {paymentStatus === 'success' && (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-black uppercase text-emerald-600 tracking-widest">{paymentMessage}</p>
                                </div>
                            )}

                            {paymentStatus === 'error' && (
                                <div className="space-y-6 text-center py-6 animate-shake">
                                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-600 shadow-lg">
                                        <AlertCircle className="w-10 h-10" />
                                    </div>
                                    <div className="px-4">
                                        <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-2">Transaction Failed</h4>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">{paymentMessage}</p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={() => setPaymentStatus('idle')} 
                                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                                        >
                                            Retry Activation
                                        </button>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verify your phone has enough balance</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-6">
                            <button onClick={handlePrev} className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 transition-all mx-auto">
                                <ChevronLeft className="w-4 h-4" /> Go Back
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4/5: Verification & Complete */}
                {((step === 4 && joiningFee === 0) || step === 5) && (
                    <div className="space-y-10 animate-fade-in-up text-center">
                        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-10 text-emerald-600">
                             <ShieldCheck className="w-12 h-12" />
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-tight">Secure <br /> <span className="text-indigo-600 italic">Validation</span></h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4 max-w-sm mx-auto">By submitting, your details will be verified against institutional records by <span className="text-indigo-600 underline decoration-indigo-200">{selectedSchool?.name}</span> staff.</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] p-8 text-left space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Alumna Name</span>
                                <span className="text-sm font-black text-slate-800 dark:text-white uppercase italic">{formData.fullName}</span>
                            </div>
                             <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Admission No</span>
                                <span className="text-sm font-black text-slate-800 dark:text-white uppercase italic">{formData.admissionNumber}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Institution</span>
                                <span className="text-sm font-black text-indigo-600 uppercase italic">{selectedSchool?.name.slice(0, 20)}...</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 pt-6">
                            <button 
                                onClick={handleFinalize}
                                className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-100 hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                            >
                                Finalize Membership <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-all" />
                            </button>
                            <button onClick={handlePrev} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Go Back and Edit</button>
                        </div>
                    </div>
                )}

                <div className="mt-12 text-center">
                     <button onClick={onBackToPortal} className="text-[10px] font-black uppercase text-slate-300 tracking-widest hover:text-indigo-600 transition-colors">Return to Landing Portal</button>
                </div>
            </div>

            {/* SEO Directory - Makes all school portals discoverable by Googlebot */}
            <div className="mt-16 w-full max-w-6xl text-center px-4">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    Official Alumnae Networks Directory
                </h3>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 opacity-60 hover:opacity-100 transition-opacity duration-500 max-h-40 overflow-y-auto custom-scrollbar">
                    {registry.map(school => (
                        <a 
                            key={school.id}
                            href={`/?alumnae=${school.slug || school.id}`}
                            className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase whitespace-nowrap"
                        >
                            {school.name}
                        </a>
                    ))}
                </div>
            </div>

            {/* Bottom Decor */}
            <div className="mt-12 opacity-5 pointer-events-none select-none overflow-hidden h-20 flex items-center justify-center">
                <h1 className="text-9xl font-black uppercase tracking-tighter whitespace-nowrap">ALUMNAE REGISTRY SYSTEM 2026 INTERNAL VERSION</h1>
            </div>
        </div>
    );
};
