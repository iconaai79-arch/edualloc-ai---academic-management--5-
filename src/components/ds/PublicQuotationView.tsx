import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ArrowLeft, AlertCircle, ShieldCheck, Printer, Download, Phone, Mail, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { apiService } from '../../services/apiService';
import * as pdfService from '../../services/pdfService';
import type { DSLead, DSSettings, Institution } from '../../types';

interface PublicQuotationViewProps {
    quoteId: string;
}

export const PublicQuotationView: React.FC<PublicQuotationViewProps> = ({ quoteId }) => {
    const [lead, setLead] = useState<any | null>(null);
    const [institution, setInstitution] = useState<any | null>(null);
    const [settings, setSettings] = useState<DSSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        const fetchQuotationData = async () => {
            setLoading(true);
            setError('');
            try {
                if (!quoteId) {
                    throw new Error("Missing quotation reference number or ID.");
                }

                let leadData: any = null;
                let instData: any = null;
                let settingsData: any = null;

                const db = apiService.getSupabase();
                if (db) {
                    try {
                        const { data, error: qErr } = await db
                            .from('ds_leads')
                            .select('*')
                            .eq('id', quoteId)
                            .maybeSingle();

                        if (!qErr && data) {
                            leadData = data;
                        }
                    } catch (fetchErr) {
                        console.warn("[PublicQuotationView] Supabase lead fetch warning:", fetchErr);
                    }
                }

                // Fallback to local storage if offline or not in Supabase
                if (!leadData) {
                    try {
                        const localLeads = JSON.parse(localStorage.getItem('ds_leads') || '[]');
                        leadData = localLeads.find((l: any) => 
                            l.id === quoteId || 
                            l.id === `ld_${quoteId}` || 
                            (l.id && l.id.endsWith(quoteId))
                        );
                    } catch (e) {
                        console.warn("[PublicQuotationView] LocalStorage fallback check error:", e);
                    }
                }

                if (!leadData) {
                    throw new Error("Quotation reference could not be found or has expired.");
                }

                const instId = leadData.institutionId || leadData.institution_id;

                // Fetch institution details
                if (db && instId) {
                    try {
                        const { data } = await db.from('institutions').select('*').eq('id', instId).maybeSingle();
                        if (data) instData = data;
                    } catch (_) {}
                }
                if (!instData) {
                    try {
                        const localInsts = JSON.parse(localStorage.getItem('institutions') || '[]');
                        instData = localInsts.find((i: any) => i.id === instId) || localInsts[0];
                    } catch (_) {}
                }

                // Fetch DS settings for fee structures and vote heads
                if (db && instId) {
                    try {
                        const { data } = await db.from('ds_settings').select('*').eq('institutionId', instId).maybeSingle();
                        if (data) settingsData = data;
                    } catch (_) {}
                }
                if (!settingsData) {
                    try {
                        const localSets = JSON.parse(localStorage.getItem('ds_settings') || '[]');
                        settingsData = localSets.find((s: any) => s.institutionId === instId) || localSets[0];
                    } catch (_) {}
                }

                const normalizedLead = {
                    id: leadData.id,
                    fullName: leadData.fullName || leadData.full_name || 'Prospective Student',
                    phone: leadData.phone || '',
                    email: leadData.email || '',
                    licenseTypeInterested: leadData.licenseTypeInterested || leadData.license_type_interested || 'Class B',
                    quotedAmount: leadData.quotedAmount || leadData.quoted_amount,
                    status: leadData.status || 'Quotation Sent',
                    source: leadData.source || 'Enquiry',
                    notes: leadData.notes || '',
                    createdAt: leadData.createdAt || leadData.created_at || new Date().toISOString(),
                    items: leadData.items ? (typeof leadData.items === 'string' ? JSON.parse(leadData.items) : leadData.items) : undefined
                };

                setLead(normalizedLead);
                setInstitution(instData);
                setSettings(settingsData);
            } catch (err: any) {
                console.error("[PublicQuotationView] Error loading quote:", err);
                setError(err.message || "Failed to load quotation details.");
            } finally {
                setLoading(false);
            }
        };

        fetchQuotationData();
    }, [quoteId]);

    // Derive target category
    const targetCategory = useMemo(() => {
        if (!lead || !settings) return null;
        const search = lead.licenseTypeInterested || '';
        return (settings.licenseCategories || []).find((c: any) => c.code === search || c.name === search) || null;
    }, [lead, settings]);

    // Derive all itemized vote heads
    const voteHeads = useMemo(() => {
        if (!lead) return [];

        // 1. If lead already has explicit items saved:
        if (Array.isArray(lead.items) && lead.items.length > 0) {
            return lead.items;
        }

        // 2. Find matching fee structure from settings
        const normalizeName = (name: string) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const searchVal = lead.licenseTypeInterested || '';
        if (searchVal && settings?.feeStructures?.length) {
            const matchedFS = settings.feeStructures.find((fs: any) => {
                if (!fs.className) return false;
                const normFS = normalizeName(fs.className);
                const normSub = normalizeName(searchVal);
                return normFS === normSub || normFS.includes(normSub) || normSub.includes(normFS);
            });
            if (matchedFS && Array.isArray(matchedFS.items) && matchedFS.items.length > 0) {
                return matchedFS.items.map((it: any, idx: number) => ({
                    name: it.name || `Item ${idx + 1}`,
                    amount: Number(it.amount) || 0,
                    priority: it.priority ?? idx + 1
                }));
            }
        }

        // 3. Fallback to settings.votes if configured
        const votes = (settings as any)?.votes;
        if (Array.isArray(votes) && votes.length > 0) {
            return votes.map((v: any, idx: number) => ({
                name: v.voteName || v.vote_name || `Votehead ${idx + 1}`,
                amount: Number(v.defaultAmount || v.default_amount || 0),
                priority: idx + 1
            }));
        }

        // 4. Default itemized standard breakdown
        const totalFee = Number(lead.quotedAmount || targetCategory?.baseFee || targetCategory?.price || 14500);
        const pdl = Math.min(1450, Math.floor(totalFee * 0.1));
        const testFee = Math.min(2500, Math.floor(totalFee * 0.15));
        const tuition = Math.max(0, totalFee - pdl - testFee);
        return [
            { name: 'Standard Tuition & Practical Instruction', amount: tuition, priority: 1 },
            { name: 'NTSA Provisional Driving License (PDL) Processing', amount: pdl, priority: 2 },
            { name: 'NTSA Driving Test Booking & Assessment Fee', amount: testFee, priority: 3 }
        ];
    }, [lead, settings, targetCategory]);

    const totalAmount = useMemo(() => {
        if (!lead) return 0;
        const sum = voteHeads.reduce((acc: number, it: any) => acc + (Number(it.amount) || 0), 0);
        return lead.quotedAmount || (sum > 0 ? sum : 14500);
    }, [lead, voteHeads]);

    const handleDownloadPDF = async () => {
        if (!lead) return;
        setIsGeneratingPdf(true);
        try {
            const fallbackCompany = {
                name: institution?.name || 'Driving School',
                address: institution?.location || 'Campus',
                phone: institution?.phoneNumber || '',
                email: institution?.email || '',
                pinNo: ''
            };

            const pdfDataUri = await pdfService.generateDSQuotationPdfDataUri(
                lead,
                targetCategory,
                totalAmount,
                institution || { name: 'Driving School', id: 'ds' } as any,
                fallbackCompany as any,
                institution?.logoUrl || null,
                voteHeads
            );

            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `Quotation_${(lead.fullName || 'Client').replace(/\s+/g, '_')}.pdf`;
            link.click();
        } catch (e: any) {
            console.error("[PublicQuotationView] PDF download failure:", e);
            alert("Could not generate PDF: " + (e.message || e));
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans p-6">
                <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Loading Official Quotation...</p>
                <p className="text-[10px] text-slate-500 mt-1">Retrieving itemized vote heads & fee breakdown</p>
            </div>
        );
    }

    if (error || !lead) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 font-sans">
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mb-6 shadow-xl">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Quotation Not Found</h2>
                <p className="text-sm text-slate-400 max-w-md text-center mb-8">
                    {error || "The requested quotation link may have expired or is invalid. Please contact the admissions desk."}
                </p>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                    Return to Portal
                </button>
            </div>
        );
    }

    const validUntilDate = new Date(lead.createdAt);
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    const categoryName = targetCategory ? `${targetCategory.name} (${targetCategory.code})` : (lead.licenseTypeInterested || 'Class B');

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-600 selection:text-white">
            {/* Top Bar */}
            <header className="px-6 py-4 border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {institution?.logoUrl ? (
                            <img src={institution.logoUrl} alt={institution.name} className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 border border-white/10" />
                        ) : (
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm tracking-wider shadow-md shadow-indigo-600/30">
                                DS
                            </div>
                        )}
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                                {institution?.name || "Driving School"}
                                <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Official Quotation Portal</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf}
                            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5" /> {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                        </button>
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-800"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Portal
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-grow w-full">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                    {/* Decorative Background Glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                    {/* Quotation Header Box */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest mb-3">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                Official Fee Quotation
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                                REF: #{lead.id ? lead.id.slice(-8).toUpperCase() : 'DS-QUOTE'}
                            </h2>
                            <p className="text-[11px] font-medium text-slate-400 mt-1">
                                Issued for professional driving training & licensing certification.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPdf}
                                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/25 active:scale-95"
                            >
                                <Download className="w-4 h-4" /> {isGeneratingPdf ? 'Building PDF...' : 'Download PDF'}
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border border-slate-700/60"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </button>
                        </div>
                    </div>

                    {/* Client & Institution Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8 border-b border-slate-800/80">
                        {/* Prepared For Box */}
                        <div className="bg-slate-950/60 border border-slate-800/70 rounded-2xl p-5">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                Prepared For Client
                            </p>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{lead.fullName}</h3>
                            <div className="space-y-1.5 mt-3 text-xs text-slate-300">
                                <p className="flex items-center gap-2 font-medium">
                                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {lead.phone || 'No phone recorded'}
                                </p>
                                {lead.email && (
                                    <p className="flex items-center gap-2 font-medium">
                                        <Mail className="w-3.5 h-3.5 text-slate-500" /> {lead.email}
                                    </p>
                                )}
                                <p className="flex items-center gap-2 font-medium">
                                    <span className="text-slate-500 font-bold">Course:</span> 
                                    <span className="text-indigo-300 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                                        {categoryName}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Validity & Institution Box */}
                        <div className="bg-slate-950/60 border border-slate-800/70 rounded-2xl p-5">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                Issuance & Validity
                            </p>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span className="flex items-center gap-1.5 text-slate-400">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date Issued:
                                    </span>
                                    <span className="font-bold text-white">{new Date(lead.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                    <span className="flex items-center gap-1.5 text-slate-400">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Valid Until:
                                    </span>
                                    <span className="font-bold text-amber-400">{validUntilDate.toLocaleDateString()} (30 Days)</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800/60">
                                    <span className="flex items-center gap-1.5 text-slate-400">
                                        <MapPin className="w-3.5 h-3.5 text-slate-500" /> Campus:
                                    </span>
                                    <span className="font-bold text-white truncate max-w-[200px]">{institution?.location || 'Main Campus'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vote Heads Itemized Fee Table */}
                    <div className="py-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">
                                    Itemized Fee Structure & Vote Heads
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    All official course items, tuition modules, and statutory licensing fees
                                </p>
                            </div>
                            <span className="text-[9px] font-black uppercase px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                                {voteHeads.length} Items Listed
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="py-3 px-4 w-12 text-center">#</th>
                                        <th className="py-3 px-4">Fee Item / Votehead Description</th>
                                        <th className="py-3 px-4">Category</th>
                                        <th className="py-3 px-4 text-right">Amount (KES)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-medium">
                                    {voteHeads.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3.5 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                                            <td className="py-3.5 px-4 text-slate-200 font-bold">{item.name}</td>
                                            <td className="py-3.5 px-4">
                                                <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-bold text-slate-400 uppercase">
                                                    {categoryName}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-white">
                                                KES {Number(item.amount || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-indigo-500/50 bg-indigo-950/20 text-white font-black text-sm">
                                        <td colSpan={3} className="py-4 px-4 text-right uppercase tracking-wider text-indigo-300 font-black">
                                            Total Estimated Investment:
                                        </td>
                                        <td className="py-4 px-4 text-right text-base text-emerald-400 font-black">
                                            KES {totalAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Notice & Verification */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-200">Official Verification & Curriculum Compliance</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Quotation valid for 30 calendar days. Complies with current NTSA road safety curriculum guidelines.
                                </p>
                            </div>
                        </div>

                        {institution?.phoneNumber && (
                            <a 
                                href={`tel:${institution.phoneNumber}`}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-700 flex items-center gap-1.5 shrink-0"
                            >
                                <Phone className="w-3.5 h-3.5" /> Call Admissions Desk
                            </a>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="px-6 py-6 border-t border-slate-900 bg-slate-950 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <p>{institution?.name || "Driving School"} • Powered by EduAI Academic & Management ERP</p>
            </footer>
        </div>
    );
};
