import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    FileText, Clock, Search, Eye, Download, ChevronRight, BookOpen, User, 
    TrendingUp, Calendar, CheckCircle, HelpCircle
} from 'lucide-react';
import { PdfViewer } from '../PdfViewer';
import { generateStudentStatement, generatePracticalHoursLog } from '../../utils/bcReportGenerator';
import { apiService } from '../../services/apiService';

interface BCReportsViewProps {
    currentUser: any;
    currentInstitution: any;
}

export const BCReportsView: React.FC<BCReportsViewProps> = ({
    currentUser,
    currentInstitution
}) => {
    const [reportMode, setReportMode] = useState<'statements' | 'practicals'>('statements');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [studentSearch, setStudentSearch] = useState<string>('');
    
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    // Module Data States
    const [students, setStudents] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [practicals, setPracticals] = useState<any[]>([]);
    const [trainers, setTrainers] = useState<any[]>([]);

    const instId = currentInstitution?.id || 'GLOBAL';

    // Fetch data on mount
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [st, inv, pay, prac, trn] = await Promise.all([
                apiService.fetchModuleRecords('bc_students', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_invoices', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_payments', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_practicals', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_trainers', instId).catch(() => [])
            ]);
            setStudents(st || []);
            setInvoices(inv || []);
            setPayments(pay || []);
            setPracticals(prac || []);
            setTrainers(trn || []);
        } catch (err) {
            console.error('[BCReportsView] Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, [instId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter students based on search string
    const filteredStudents = useMemo(() => {
        if (!studentSearch) return students;
        const q = studentSearch.toLowerCase();
        return students.filter(s => 
            (s.fullName || '').toLowerCase().includes(q) || 
            (s.email || '').toLowerCase().includes(q) || 
            (s.phone || '').toLowerCase().includes(q)
        );
    }, [students, studentSearch]);

    // Automatically pick first student if available and none selected
    useEffect(() => {
        if (!selectedStudentId && filteredStudents.length > 0) {
            setSelectedStudentId(filteredStudents[0].id);
        }
    }, [filteredStudents, selectedStudentId]);

    // Reset preview when switching student or tab
    useEffect(() => {
        setPreviewUrl(null);
    }, [selectedStudentId, reportMode]);

    const handleGenerate = async (preview: boolean) => {
        if (!selectedStudentId) return;
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;

        setIsGenerating(true);
        try {
            let doc;
            if (reportMode === 'statements') {
                const sInvoices = invoices.filter(inv => inv.studentId === selectedStudentId);
                const sPayments = payments.filter(pay => pay.studentId === selectedStudentId);
                doc = await generateStudentStatement(student, sInvoices, sPayments, currentInstitution);
            } else {
                doc = await generatePracticalHoursLog(student, practicals, trainers, currentInstitution);
            }

            if (preview) {
                const dataUrl = doc.output('datauristring');
                setPreviewUrl(dataUrl);
            } else {
                const filename = reportMode === 'statements' 
                    ? `${student.fullName.replace(/\s+/g, '_')}_Financial_Statement.pdf`
                    : `${student.fullName.replace(/\s+/g, '_')}_Practical_Hours_Log.pdf`;
                doc.save(filename);
            }
        } catch (err) {
            console.error('Failed to generate report:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <span className="w-10 h-10 border-4 border-slate-350 border-t-indigo-650 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Loading Analytics Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header Cards / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-[2rem] text-white shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Total Billed</span>
                    <h3 className="text-3xl font-black mt-2">KES {invoices.reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0).toLocaleString()}</h3>
                    <p className="text-[9px] mt-1 text-indigo-100 uppercase tracking-wide font-medium">From all students</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Collected</span>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">KES {payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}</h3>
                    <p className="text-[9px] mt-1 text-emerald-500 uppercase tracking-wide font-black">Tuition payments received</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outstanding</span>
                    <h3 className="text-3xl font-black mt-2 text-rose-500">KES {(invoices.reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0) - payments.reduce((sum, p) => sum + (p.amount || 0), 0)).toLocaleString()}</h3>
                    <p className="text-[9px] mt-1 text-slate-450 uppercase tracking-wide font-medium">Unpaid balance remaining</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Practicals Logged</span>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">{practicals.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)} hrs</h3>
                    <p className="text-[9px] mt-1 text-indigo-500 uppercase tracking-wide font-black">All student logged hours</p>
                </div>
            </div>

            {/* Selection bar */}
            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap gap-2 items-center">
                <button
                    onClick={() => setReportMode('statements')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        reportMode === 'statements'
                            ? 'bg-slate-900 text-white dark:bg-slate-800'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                >
                    <FileText className="w-3.5 h-3.5" /> Financial Statements
                </button>
                <button
                    onClick={() => setReportMode('practicals')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        reportMode === 'practicals'
                            ? 'bg-slate-900 text-white dark:bg-slate-800'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                >
                    <Clock className="w-3.5 h-3.5" /> Practical Logbooks
                </button>
            </div>

            {/* Report Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Side Controls */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {reportMode === 'statements' ? 'Tuition Statements' : 'Logbook Ledger'}
                        </h3>
                        <p className="text-xs font-medium text-slate-400 mt-1">
                            {reportMode === 'statements' 
                                ? 'Export individual financial account ledger statements.'
                                : 'Summarize practical work hours logged per course requirement.'}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Student</label>
                                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                    <Search className="w-3.5 h-3.5" />
                                    <input
                                        type="text"
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                        placeholder="Search name..."
                                        className="bg-transparent border-none focus:ring-0 p-0 text-[10px] w-28 text-right placeholder-slate-350 dark:placeholder-slate-700"
                                    />
                                </div>
                            </div>
                            <select
                                value={selectedStudentId}
                                onChange={e => setSelectedStudentId(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100"
                            >
                                <option value="">-- Select Student --</option>
                                {filteredStudents.map(s => (
                                    <option key={s.id} value={s.id}>{s.fullName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                        <button
                            type="button"
                            disabled={isGenerating || !selectedStudentId}
                            onClick={() => handleGenerate(true)}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Eye className="w-4 h-4" />
                            {isGenerating ? 'Generating...' : 'Generate & Preview'}
                        </button>
                        <button
                            type="button"
                            disabled={isGenerating || !selectedStudentId}
                            onClick={() => handleGenerate(false)}
                            className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF Report
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Block */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[70vh] flex flex-col">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">On-Screen PDF Viewer</h4>
                    {previewUrl ? (
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                            <PdfViewer
                                src={previewUrl}
                                title={reportMode === 'statements' ? "Financial Statement" : "Practical Hours Log"}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6">
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                            <h5 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">No Report Generated</h5>
                            <p className="text-xs text-slate-400 max-w-xs mt-1">Select a student and click "Generate & Preview" to inspect the PDF statement live before downloading.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
