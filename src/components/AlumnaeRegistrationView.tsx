
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
    Star
} from 'lucide-react';
import type { SchoolRegistry } from '../types';

interface AlumnaeRegistrationViewProps {
    registry: SchoolRegistry[];
    initialSchool?: SchoolRegistry | null;
    onComplete: (data: any) => void;
    onBackToPortal: () => void;
}

export const AlumnaeRegistrationView: React.FC<AlumnaeRegistrationViewProps> = ({ registry, initialSchool, onComplete, onBackToPortal }) => {
    const [step, setStep] = useState(initialSchool ? 2 : 1);
    const [searchTerm, setSearchTerm] = useState(initialSchool?.name || '');
    const [selectedSchool, setSelectedSchool] = useState<SchoolRegistry | null>(initialSchool || null);

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
        graduationYear: new Date().getFullYear().toString(),
        department: '',
        currentJob: '',
        currentCompany: '',
        linkedinUrl: '',
        twitterUrl: '',
        bio: '',
        isAnonymous: false
    });

    const filteredSchools = useMemo(() => {
        if (!searchTerm) return [];
        return registry.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.knecCode?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);
    }, [registry, searchTerm]);

    const handleNext = () => setStep(step + 1);
    const handlePrev = () => setStep(step - 1);

    const isStep1Valid = !!selectedSchool;
    const isStep2Valid = formData.fullName && formData.email && formData.phoneNumber;
    const isStep3Valid = formData.graduationYear && formData.currentJob;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-20 px-4">
            {/* Branding */}
            <div className="flex items-center gap-3 mb-12 animate-fade-in">
                <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-100">
                    <GraduationCap className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Alumnae <span className="text-indigo-600 italic">Network</span></h1>
            </div>

            {/* Stepper Progress */}
            <div className="w-full max-w-2xl mb-12 px-10">
                <div className="relative flex justify-between items-center">
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10"></div>
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                    
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${
                            step >= s ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}>
                            {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Institution</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>Identity</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>Career</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 4 ? 'text-indigo-600' : 'text-slate-400'}`}>Verify</span>
                </div>
            </div>

            {/* Form Card */}
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 relative overflow-hidden">
                
                {/* Step 1: School Selection */}
                {step === 1 && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="text-center">
                            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-none">Find Your <br /><span className="text-indigo-600 italic">Alma Mater</span></h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4 italic">Select your school from our national registry</p>
                        </div>

                        <div className="relative group">
                            <input 
                                type="text"
                                placeholder="Start typing school name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-20 pl-16 pr-8 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-lg font-bold border-none focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                            />
                            <Search className="w-7 h-7 absolute left-6 top-6.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            
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

                        <div className="grid grid-cols-2 gap-6">
                            <div className="relative col-span-1">
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 ml-4">Graduation Year</label>
                                <input 
                                    type="number" 
                                    placeholder="e.g. 2018"
                                    value={formData.graduationYear}
                                    onChange={(e) => setFormData({...formData, graduationYear: e.target.value})}
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600" 
                                />
                                <Calendar className="w-5 h-5 absolute left-5 top-11 text-slate-400" />
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
                                <Briefcase className="w-5 h-5 absolute left-5 top-11 text-slate-400" />
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

                {/* Step 4: Verification & Complete */}
                {step === 4 && (
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
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Institution</span>
                                <span className="text-sm font-black text-indigo-600 uppercase italic">{selectedSchool?.name.slice(0, 20)}...</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Legacy Year</span>
                                <span className="text-sm font-black text-slate-800 dark:text-white">{formData.graduationYear}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={() => onComplete(formData)}
                                className="w-full h-20 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95 group"
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

            {/* Bottom Decor */}
            <div className="mt-12 opacity-5 pointer-events-none select-none overflow-hidden h-20 flex items-center justify-center">
                <h1 className="text-9xl font-black uppercase tracking-tighter whitespace-nowrap">ALUMNAE REGISTRY SYSTEM 2026 INTERNAL VERSION</h1>
            </div>
        </div>
    );
};
