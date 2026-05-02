import React, { useState, useMemo } from 'react';
import { 
    Building2, 
    Search, 
    ShieldCheck, 
    ArrowRight, 
    ChevronLeft, 
    CheckCircle2, 
    MapPin, 
    Globe, 
    Loader2, 
    AlertCircle,
    Building
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { SchoolRegistry } from '../types';

interface InstitutionClaimViewProps {
    registry: SchoolRegistry[];
    onBack: () => void;
    onClaimSuccess: (data: any) => void;
}

export const InstitutionClaimView: React.FC<InstitutionClaimViewProps> = ({ registry, onBack, onClaimSuccess }) => {
    const [step, setStep] = useState(1); // 1: Search, 2: Claim/Register
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchool, setSelectedSchool] = useState<SchoolRegistry | null>(null);
    const [isRegisteringNew, setIsRegisteringNew] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [claimData, setClaimData] = useState({
        schoolName: '',
        county: '',
        category: 'Private' as 'Public' | 'Private',
        uicCode: '',
        knecCode: '',
        contactEmail: '',
        contactPhone: '',
        adminName: ''
    });

    const filteredSchools = useMemo(() => {
        if (!searchTerm || selectedSchool) return [];
        const lower = searchTerm.toLowerCase().trim();
        const searchTerms = lower.split(/\s+/).filter(t => t.length > 0);
        
        if (searchTerms.length === 0) return [];

        const matches = registry.filter(s => {
            const name = s.name.toLowerCase();
            const uic = (s.uic || '').toLowerCase();
            const knec = (s.knecCode || '').toLowerCase();
            
            return name.includes(lower) || uic.includes(lower) || knec.includes(lower) || 
                   searchTerms.every(t => name.includes(t));
        });

        return matches.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            
            if (aName === lower) return -1;
            if (bName === lower) return 1;
            
            const aStarts = aName.startsWith(lower);
            const bStarts = bName.startsWith(lower);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;

            return aName.localeCompare(bName);
        }).slice(0, 10);
    }, [registry, searchTerm, selectedSchool]);

    const handleClaim = async () => {
        if (claimData.category === 'Public' && (!claimData.uicCode || !claimData.knecCode)) {
            setError('UIC Code and KNEC Index Number are required for Public Institutions.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            // If registering new, first add to registry (or send request)
            let schoolId = selectedSchool?.id;
            if (isRegisteringNew) {
                const newSchool = {
                    id: `reg_${Date.now()}`,
                    name: claimData.schoolName,
                    county: claimData.county || 'Unspecified',
                    uic: claimData.uicCode,
                    knec_code: claimData.knecCode,
                    category: claimData.category,
                    status: 'pending_verification',
                    created_at: new Date().toISOString()
                };
                await apiService.saveModuleRecord('school_registry', newSchool);
                schoolId = newSchool.id;
            }

            // Create claim request
            const claimRequest = {
                id: `claim_${Date.now()}`,
                school_id: schoolId,
                school_name: claimData.schoolName || selectedSchool?.name,
                admin_name: claimData.adminName,
                email: claimData.contactEmail,
                phone: claimData.contactPhone,
                uic_code: claimData.uicCode,
                knec_code: claimData.knecCode,
                category: claimData.category,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            
            await apiService.saveModuleRecord('institution_claims', claimRequest);
            onClaimSuccess(claimRequest);
        } catch (err: any) {
            setError(err.message || 'Failed to submit claim request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] p-6 flex flex-col items-center justify-center font-sans relative overflow-hidden">
             {/* Decorative Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>

            {/* Header */}
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between relative z-10">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Back to Login</span>
                </button>
                <div className="text-right">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1">Institution <span className="text-indigo-500">Ownership</span></h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Verify & Claim Your School Portal</p>
                </div>
            </div>

            <div className="w-full max-w-2xl bg-white/5 backdrop-blur-3xl p-10 sm:p-14 rounded-[4rem] border border-white/10 shadow-2xl relative z-10 overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24 transition-all duration-700 group-hover:scale-150"></div>
                
                {step === 1 ? (
                    <div className="space-y-10">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-inner">
                                <Search className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-3">Identify Your <span className="text-indigo-400">School</span></h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Search the national academic registry</p>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setSelectedSchool(null);
                                    setIsRegisteringNew(false);
                                }}
                                placeholder="School Name, UIC Code or KNEC Index..."
                                className="w-full h-20 pl-16 pr-6 bg-white/5 border border-white/10 rounded-[2rem] text-white font-black uppercase text-sm tracking-tight outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700"
                            />
                        </div>
                        {searchTerm && registry.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 text-center animate-pulse">
                                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Synchronizing National Registry...</p>
                            </div>
                        )}

                        {filteredSchools.length > 0 && (
                            <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredSchools.map(school => (
                                    <button
                                        key={school.id}
                                        onClick={() => {
                                            setSelectedSchool(school);
                                            setClaimData({
                                                ...claimData,
                                                schoolName: school.name,
                                                county: school.county || '',
                                                uicCode: school.uic || '',
                                                knecCode: school.knecCode || ''
                                            });
                                            setStep(2);
                                        }}
                                        className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 rounded-[2.5rem] flex items-center justify-between transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="flex items-center gap-5 relative z-10">
                                            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Building2 className="w-7 h-7 text-indigo-400" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-black text-white uppercase text-sm tracking-tight group-hover:text-indigo-300 transition-colors">{school.name}</h4>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                                    <MapPin className="w-3 h-3 inline mr-1" /> {school.county || 'Unknown County'} • UIC: {school.uic || 'PENDING'}
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-2 transition-all" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {searchTerm.length > 3 && !selectedSchool && filteredSchools.length === 0 && (
                            <div className="p-12 border-2 border-dashed border-white/10 rounded-[3rem] text-center bg-white/5 backdrop-blur-sm">
                                <Building className="w-12 h-12 text-slate-800 mx-auto mb-6" />
                                <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-2">School not in registry?</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8 italic">You can manually add your institution to the national directory</p>
                                <button 
                                    onClick={() => {
                                        setIsRegisteringNew(true);
                                        setClaimData({ ...claimData, schoolName: searchTerm });
                                        setStep(2);
                                    }}
                                    className="px-10 h-14 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-400 hover:text-white transition-all shadow-2xl active:scale-95"
                                >
                                    Register School Manually
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-6 mb-10 pb-8 border-b border-white/5">
                            <div className="w-16 h-16 bg-indigo-500/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                                <ShieldCheck className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">{isRegisteringNew ? 'New Registration' : 'Verify Ownership'}</h3>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">{claimData.schoolName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="sm:col-span-2 space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Institution Category</label>
                                <div className="flex gap-4">
                                    {(['Public', 'Private'] as const).map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setClaimData({ ...claimData, category: cat })}
                                            className={`flex-1 h-16 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all border ${claimData.category === cat ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)]' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                                        >
                                            {cat} School
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">
                                    UIC Code {claimData.category === 'Private' && '(Optional)'}
                                </label>
                                <input 
                                    type="text"
                                    value={claimData.uicCode}
                                    onChange={(e) => setClaimData({ ...claimData, uicCode: e.target.value })}
                                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="e.g. 12345678"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">
                                    KNEC Index {claimData.category === 'Private' && '(Optional)'}
                                </label>
                                <input 
                                    type="text"
                                    value={claimData.knecCode}
                                    onChange={(e) => setClaimData({ ...claimData, knecCode: e.target.value })}
                                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="e.g. 40100001"
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Admin/Principal Full Name</label>
                                <input 
                                    type="text"
                                    value={claimData.adminName}
                                    onChange={(e) => setClaimData({ ...claimData, adminName: e.target.value })}
                                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="Full name for verification..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Official Email</label>
                                <input 
                                    type="email"
                                    value={claimData.contactEmail}
                                    onChange={(e) => setClaimData({ ...claimData, contactEmail: e.target.value })}
                                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="principal@school.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Contact Phone</label>
                                <input 
                                    type="text"
                                    value={claimData.contactPhone}
                                    onChange={(e) => setClaimData({ ...claimData, contactPhone: e.target.value })}
                                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="07XXXXXXXX"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-[1.5rem] text-red-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-4 animate-in shake duration-300">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4 pt-8">
                            <button 
                                onClick={() => setStep(1)}
                                className="flex-1 h-16 bg-white/5 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleClaim}
                                disabled={isLoading}
                                className="flex-[2] h-16 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 group/btn"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />}
                                Submit Claim Request
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(79, 70, 229, 0.3);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(79, 70, 229, 0.5);
                }
            `}</style>
        </div>
    );
};

