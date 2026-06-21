import React, { useState, useEffect } from 'react';
import { 
    Sparkles, 
    ShieldCheck, 
    ArrowRight,
    MapPin,
    Phone,
    User,
    Mail,
    CheckCircle2,
    BookOpen,
    HelpCircle,
    Building2
} from 'lucide-react';
import { apiService } from '../../services/apiService';

interface DSInterestPageProps {
    institutionId: string;
    broadcastId?: string;
    onBack?: () => void;
}

export const DSInterestPage: React.FC<DSInterestPageProps> = ({ institutionId, broadcastId, onBack }) => {
    const [institution, setInstitution] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            if (!institutionId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // Fetch institution details
                const insts = await apiService.fetchModuleRecords<any>('institutions', undefined, undefined, { filter: { id: institutionId } });
                if (insts && insts.length > 0) {
                    setInstitution(insts[0]);
                }

                // Fetch dynamic license categories if defined
                const cats = await apiService.fetchModuleRecords<any>('ds_license_categories', undefined, undefined, { filter: { institution_id: institutionId } });
                if (cats && cats.length > 0) {
                    setCategories(cats);
                    setSelectedCategory(cats[0].code || cats[0].className || '');
                } else {
                    // Default fallback classes
                    const defaultCats = [
                        { code: 'Class A', name: 'Motorcycle (Class A)' },
                        { code: 'Class B', name: 'Light Vehicle (Class B)' },
                        { code: 'Class C1', name: 'Light Truck (Class C1)' },
                        { code: 'Class D', name: 'Professional (Class D)' }
                    ];
                    setCategories(defaultCats);
                    setSelectedCategory('Class B');
                }
            } catch (e) {
                console.error("Error loading onboarding details:", e);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [institutionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim() || !institutionId) {
            setErrorMessage("Please enter both your name and phone number.");
            return;
        }

        setSubmitting(true);
        setErrorMessage('');

        try {
            const leadId = `dsl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const notesTag = `Self-onboarded via public interest landing page.${broadcastId ? ` [Campaign Ref: ${broadcastId}]` : ''}${notes ? ` Notes: ${notes}` : ''}`;
            
            const payload = {
                id: leadId,
                institutionId: institutionId,
                fullName: name.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
                licenseTypeInterested: selectedCategory,
                source: 'Online',
                status: 'New Enquiry',
                notes: notesTag,
                broadcastId: broadcastId || undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ds_leads', payload);
            setSubmitted(true);
        } catch (e: any) {
            console.error("Failed to submit interest:", e);
            setErrorMessage(e.message || "Something went wrong while submitting your request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
            <Sparkles className="w-12 h-12 text-indigo-500 animate-pulse" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Initializing Portal Gateway...</p>
        </div>
    );

    if (!institutionId) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <HelpCircle className="w-20 h-20 text-slate-800 mb-6" />
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Invalid Portal Link</h1>
            <p className="text-slate-400 mb-8 max-w-md">The driving school registration link you followed is invalid or has expired.</p>
            {onBack && (
                <button onClick={onBack} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors">
                    Return Home
                </button>
            )}
        </div>
    );

    const institutionName = institution?.name || "Driving School Portal";
    const coverUrl = institution?.logoUrl || institution?.metadata?.coverImage || "";

    return (
        <div className="min-h-screen bg-slate-950 font-sans relative overflow-hidden flex flex-col justify-center">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] -ml-24 -mb-24 pointer-events-none"></div>

            <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10 w-full max-w-7xl mx-auto">
                <div className="w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                    
                    {/* Left: Branding Content */}
                    <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-6 backdrop-blur-md animate-fade-in">
                            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Fast-track Self Onboarding</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-6 leading-[0.95]">
                            Accelerate Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Driving Journey</span>
                        </h1>
                        
                        <p className="text-slate-400 font-medium text-base mb-8 max-w-lg leading-relaxed">
                            Onboard yourself directly into our professional training programs. Fill out your details in under a minute, choose your desired category, and get matched with certified instructors instantly.
                        </p>

                        {/* Interactive Features Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                            {[
                                { title: "NTSA Compliance", desc: "Automated booking integration", icon: ShieldCheck },
                                { title: "Flexible Calendars", desc: "Select custom slot intervals", icon: BookOpen }
                            ].map((f, i) => (
                                <div key={i} className="flex gap-4 p-5 bg-white/5 dark:bg-slate-900/40 rounded-2xl border border-white/10 backdrop-blur-md shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                        <f.icon className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-xs font-black uppercase text-white tracking-wide">{f.title}</h4>
                                        <p className="text-[10px] text-slate-400 font-medium mt-1">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Lead Submission Form */}
                    <div className="w-full lg:w-1/2 max-w-xl">
                        <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10 relative">
                            
                            {/* Form Header */}
                            <div className="p-8 md:p-12 border-b border-white/5 flex items-center gap-5">
                                {coverUrl ? (
                                    <img src={coverUrl} alt="Logo" className="w-14 h-14 rounded-2xl border border-white/10 object-cover shrink-0" />
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 border border-white/10 shadow-lg">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-400">{institutionName}</p>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight mt-1">Register Interest</h2>
                                </div>
                            </div>

                            {/* Form Body */}
                            <div className="p-8 md:p-12">
                                {submitted ? (
                                    <div className="text-center py-10 animate-fade-in">
                                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-500/20">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Registration Completed!</h2>
                                        <p className="text-slate-400 font-medium mb-8 leading-relaxed max-w-xs mx-auto text-sm">
                                            Your interest has been recorded. Our admissions counselor will contact you shortly with fee breakdown details.
                                        </p>
                                        {onBack && (
                                            <button 
                                                onClick={onBack}
                                                className="bg-white hover:bg-slate-100 text-slate-900 px-8 py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                                            >
                                                Return Home
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {errorMessage && (
                                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 font-bold text-xs">
                                                {errorMessage}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Full Name *</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                    <User className="w-4.5 h-4.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                                </div>
                                                <input 
                                                    required
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    placeholder="Enter your full name"
                                                    className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Phone Number *</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                        <Phone className="w-4.5 h-4.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                                    </div>
                                                    <input 
                                                        required
                                                        type="tel"
                                                        value={phone}
                                                        onChange={e => setPhone(e.target.value)}
                                                        placeholder="e.g. 0712345678"
                                                        className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Email Address</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                        <Mail className="w-4.5 h-4.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                                    </div>
                                                    <input 
                                                        type="email"
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        placeholder="student@example.com"
                                                        className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">License Class Category *</label>
                                            <select 
                                                value={selectedCategory} 
                                                onChange={e => setSelectedCategory(e.target.value)}
                                                className="w-full px-5 py-4.5 bg-slate-900 border border-white/10 rounded-2xl font-bold text-xs text-white outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                            >
                                                {categories.map((c, i) => (
                                                    <option key={i} value={c.code || c.className || ''}>
                                                        {c.code || c.className} - {c.name || c.description || 'Standard Course'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Additional Remarks (Optional)</label>
                                            <textarea 
                                                rows={3}
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                placeholder="Any questions or special scheduling preferences?"
                                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner"
                                            />
                                        </div>

                                        <button 
                                            disabled={submitting}
                                            type="submit"
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black uppercase text-xs tracking-[0.2em] py-4.5 rounded-2xl shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-3 transition-all disabled:opacity-50 mt-4"
                                        >
                                            {submitting ? (
                                                <Sparkles className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Submit Response</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
