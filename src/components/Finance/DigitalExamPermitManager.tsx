import React, { useState, useMemo } from 'react';
import { QrCodeIcon } from '../icons/QrCodeIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { BuildingLibraryIcon } from '../icons/BuildingLibraryIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { FilterIcon } from '../icons/FilterIcon';
import { PdfViewer } from '../PdfViewer';

interface DigitalExamPermitManagerProps {
    institution: any;
    students: any[];
    invoices: any[];
    receipts: any[];
    courses?: any[];
    userName?: string;
}

export function DigitalExamPermitManager({
    institution,
    students,
    invoices,
    receipts,
    courses = [],
    userName
}: DigitalExamPermitManagerProps) {
    const [thresholdPercent, setThresholdPercent] = useState<number>(75);
    const [selectedExamSeries, setSelectedExamSeries] = useState<string>('End of Term / Semester Examinations 2026');
    const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedStudentCard, setSelectedStudentCard] = useState<any | null>(null);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfPreviewUri, setPdfPreviewUri] = useState<string | null>(null);

    // Filter students for Tertiary / Higher Ed / TVET / Colleges
    const tertiaryStudents = useMemo(() => {
        return students.map(s => {
            const studentInvoices = invoices.filter(inv => inv.studentId === s.id || inv.student_id === s.id);
            const totalInvoiced = studentInvoices.reduce((acc, inv) => acc + (inv.totalAmount || inv.total_amount || inv.amount || 0), 0) || (s.totalBilled || 50000);
            
            const studentReceipts = receipts.filter(r => r.studentId === s.id || r.student_id === s.id);
            const totalPaid = studentReceipts.reduce((acc, r) => acc + (r.amount || 0), 0) || (s.amountPaid || s.totalPaid || 0);

            const percentage = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 100;
            const balance = Math.max(0, totalInvoiced - totalPaid);

            let status: 'CLEARED' | 'CONDITIONAL' | 'BLOCKED' = 'BLOCKED';
            if (percentage >= thresholdPercent) {
                status = 'CLEARED';
            } else if (s.hasFeeWaiver || s.promissoryAgreementActive || percentage >= thresholdPercent - 15) {
                status = 'CONDITIONAL';
            }

            return {
                ...s,
                totalInvoiced,
                totalPaid,
                balance,
                percentage,
                clearanceStatus: status,
                permitNumber: `PERMIT-${(s.admissionNumber || s.id).replace(/[^a-zA-Z0-9]/g, '')}-${new Date().getFullYear()}`
            };
        });
    }, [students, invoices, receipts, thresholdPercent]);

    const filteredStudents = useMemo(() => {
        return tertiaryStudents.filter(s => {
            const matchSearch = (s.fullName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.admissionNumber || s.admission_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.permitNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchCourse = selectedCourseFilter === 'All' || 
                (s.course || s.courseName || s.department || '').toLowerCase().includes(selectedCourseFilter.toLowerCase());

            return matchSearch && matchCourse;
        });
    }, [tertiaryStudents, searchQuery, selectedCourseFilter]);

    // Statistics
    const clearedCount = tertiaryStudents.filter(s => s.clearanceStatus === 'CLEARED').length;
    const conditionalCount = tertiaryStudents.filter(s => s.clearanceStatus === 'CONDITIONAL').length;
    const blockedCount = tertiaryStudents.filter(s => s.clearanceStatus === 'BLOCKED').length;

    const handlePrintSinglePermit = (student: any) => {
        setSelectedStudentCard(student);
        const windowContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Exam Permit - ${student.fullName || student.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; bg-color: #f8fafc; }
                    .card { border: 3px solid #1e293b; border-radius: 20px; padding: 25px; background: white; max-width: 650px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .header { text-align: center; border-bottom: 2px border #e2e8f0; pb: 15px; margin-bottom: 20px; }
                    .inst-name { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
                    .subtitle { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 4px; }
                    .title-badge { background: #0284c7; color: white; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 800; text-transform: uppercase; display: inline-block; margin-top: 10px; }
                    .grid { display: grid; grid-template-columns: 1fr 140px; gap: 20px; margin-top: 15px; }
                    .field { margin-bottom: 10px; }
                    .label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; }
                    .value { font-size: 13px; font-weight: 800; color: #0f172a; }
                    .status-cleared { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 10px; border-radius: 12px; text-align: center; font-weight: 900; font-size: 14px; text-transform: uppercase; }
                    .status-blocked { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; padding: 10px; border-radius: 12px; text-align: center; font-weight: 900; font-size: 14px; text-transform: uppercase; }
                    .qr-box { border: 2px dashed #94a3b8; border-radius: 12px; padding: 10px; text-align: center; }
                    .qr-img { width: 110px; height: 110px; }
                    .footer { font-size: 8px; color: #94a3b8; text-align: center; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px; text-transform: uppercase; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <div class="inst-name">${institution?.name || 'Tertiary Institute / Polytechnic'}</div>
                        <div class="subtitle">Official Examination Permit &amp; Digital Gate Pass</div>
                        <div class="title-badge">${selectedExamSeries}</div>
                    </div>
                    <div class="grid">
                        <div>
                            <div class="field">
                                <div class="label">Student Name:</div>
                                <div class="value">${student.fullName || student.name}</div>
                            </div>
                            <div class="field">
                                <div class="label">Registration / Admission No:</div>
                                <div class="value">${student.admissionNumber || student.admission_number || student.id}</div>
                            </div>
                            <div class="field">
                                <div class="label">Course / Program of Study:</div>
                                <div class="value">${student.course || student.courseName || student.department || 'Diploma / Certificate Program'}</div>
                            </div>
                            <div class="field">
                                <div class="label">Fee Clearance Status:</div>
                                <div class="value" style="color: ${student.percentage >= thresholdPercent ? '#16a34a' : '#dc2626'}">
                                    ${student.percentage}% Paid (Threshold: ${thresholdPercent}%)
                                </div>
                            </div>
                            <div class="${student.clearanceStatus === 'CLEARED' ? 'status-cleared' : 'status-blocked'}">
                                ${student.clearanceStatus === 'CLEARED' ? '✓ EXAM PERMIT CLEARED' : '⚠️ CLEARANCE CONDITIONAL / BLOCKED'}
                            </div>
                        </div>
                        <div class="qr-box">
                            <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`VERIFIED_PERMIT|${student.permitNumber}|${student.admissionNumber}|${student.clearanceStatus}`)}" alt="QR Code" />
                            <div style="font-size: 8px; font-weight: 800; color: #475569; margin-top: 5px;">SCAN TO VERIFY</div>
                        </div>
                    </div>
                    <div class="footer">
                        Permit No: ${student.permitNumber} • Issued by Registrar / Finance Office • Quantum Digital Security System
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(windowContent);
            printWindow.document.close();
        }
    };

    return (
        <div className="space-y-8 text-slate-900 dark:text-white animate-fade-in">
            {/* Header Banner */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 border border-sky-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                            <QrCodeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">Higher Ed &amp; TVET Automation</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight text-white italic">
                                Digital Fee Clearance <span className="text-sky-300">&amp; Exam Permit Generator</span>
                            </h2>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 font-bold max-w-2xl mt-1 leading-relaxed">
                        Automated QR-coded Gate Passes and Exam Admission Permits for Colleges, Polytechnics, Technical Institutes, and Universities based on configurable fee clearance thresholds.
                    </p>
                </div>

                {/* Threshold Configuration Dial */}
                <div className="relative z-10 bg-white/10 dark:bg-black/40 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-4 shrink-0">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-sky-300">Clearance Threshold %</p>
                        <p className="text-2xl font-black text-white">{thresholdPercent}% Paid</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {[50, 75, 90, 100].map(pct => (
                            <button
                                key={pct}
                                onClick={() => setThresholdPercent(pct)}
                                className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                                    thresholdPercent === pct
                                        ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30 scale-105'
                                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                                }`}
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stat KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-6 bg-slate-900/60 border border-white/10 rounded-[2rem] space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Enrolled Students</p>
                    <p className="text-3xl font-black text-white">{tertiaryStudents.length}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Colleges &amp; TVET Students</p>
                </div>

                <div className="p-6 bg-emerald-950/40 border border-emerald-500/30 rounded-[2rem] space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Cleared for Exams ({thresholdPercent}%+)</p>
                    <p className="text-3xl font-black text-emerald-300">{clearedCount}</p>
                    <p className="text-[10px] text-emerald-400 font-bold">
                        {tertiaryStudents.length > 0 ? Math.round((clearedCount / tertiaryStudents.length) * 100) : 0}% of Total Class
                    </p>
                </div>

                <div className="p-6 bg-amber-950/40 border border-amber-500/30 rounded-[2rem] space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Conditional Permits</p>
                    <p className="text-3xl font-black text-amber-300">{conditionalCount}</p>
                    <p className="text-[10px] text-amber-400 font-bold">Waivers &amp; Promissory Plans</p>
                </div>

                <div className="p-6 bg-rose-950/40 border border-rose-500/30 rounded-[2rem] space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">Blocked / Overdue</p>
                    <p className="text-3xl font-black text-rose-300">{blockedCount}</p>
                    <p className="text-[10px] text-rose-400 font-bold">Permit Withheld (&lt; {thresholdPercent}%)</p>
                </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search Student, Reg #, Permit #..."
                            className="w-full bg-black/40 border border-white/10 focus:border-sky-500 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white outline-none uppercase"
                        />
                    </div>

                    {/* Examination Series Title */}
                    <input
                        type="text"
                        value={selectedExamSeries}
                        onChange={e => setSelectedExamSeries(e.target.value)}
                        placeholder="Exam Series Title..."
                        className="w-full sm:w-80 bg-black/40 border border-white/10 focus:border-sky-500 rounded-2xl px-4 py-3 text-xs font-bold text-sky-300 outline-none uppercase"
                    />
                </div>

                {/* Course / Program Filter */}
                <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                    <FilterIcon className="w-4 h-4 text-slate-400" />
                    <select
                        value={selectedCourseFilter}
                        onChange={e => setSelectedCourseFilter(e.target.value)}
                        className="bg-black/40 border border-white/10 text-white font-bold rounded-2xl px-4 py-3 text-xs uppercase outline-none focus:border-sky-500"
                    >
                        <option value="All">All Department Courses</option>
                        <option value="Diploma in Information Technology">Diploma in IT</option>
                        <option value="Certificate in Business Management">Cert Business Mgmt</option>
                        <option value="Diploma in Automotive Engineering">Automotive Engineering</option>
                        <option value="Higher National Diploma in Electrical">Electrical Engineering</option>
                    </select>
                </div>
            </div>

            {/* Students Clearance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map(student => (
                    <div
                        key={student.id}
                        className={`p-6 rounded-[2.5rem] border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                            student.clearanceStatus === 'CLEARED'
                                ? 'bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/60 shadow-xl shadow-emerald-950/20'
                                : student.clearanceStatus === 'CONDITIONAL'
                                ? 'bg-slate-900/80 border-amber-500/30 hover:border-amber-500/60'
                                : 'bg-slate-900/80 border-rose-500/30 hover:border-rose-500/60'
                        }`}
                    >
                        {/* Student Card Top */}
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                                        student.clearanceStatus === 'CLEARED'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                            : student.clearanceStatus === 'CONDITIONAL'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                                    }`}>
                                        {(student.fullName || student.name || 'S')[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base uppercase tracking-tight text-white line-clamp-1">
                                            {student.fullName || student.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                                            Reg: <span className="text-white font-mono">{student.admissionNumber || student.admission_number || student.id?.substring(0, 8)}</span>
                                        </p>
                                    </div>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    student.clearanceStatus === 'CLEARED'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : student.clearanceStatus === 'CONDITIONAL'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                }`}>
                                    {student.clearanceStatus}
                                </span>
                            </div>

                            <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mb-3">
                                🎓 {student.course || student.courseName || student.department || 'Tertiary Diploma Program'}
                            </p>

                            {/* Progress bar */}
                            <div className="space-y-1.5 p-3 bg-black/40 rounded-2xl border border-white/5">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-400">Fee Paid: KES {student.totalPaid.toLocaleString()}</span>
                                    <span className={student.percentage >= thresholdPercent ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                                        {student.percentage}%
                                    </span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                            student.percentage >= thresholdPercent ? 'bg-emerald-400' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${student.percentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold pt-1">
                                    <span>Total Invoice: KES {student.totalInvoiced.toLocaleString()}</span>
                                    <span>Balance: KES {student.balance.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                            <span className="text-[9px] font-mono text-slate-400 font-bold">
                                {student.permitNumber}
                            </span>
                            <button
                                type="button"
                                onClick={() => handlePrintSinglePermit(student)}
                                className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center space-x-1.5 shadow-lg italic ${
                                    student.clearanceStatus === 'CLEARED'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/40'
                                        : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                                }`}
                            >
                                <PrinterIcon className="w-3.5 h-3.5" />
                                <span>{student.clearanceStatus === 'CLEARED' ? 'Print Exam Permit' : 'Print Permit Slip'}</span>
                            </button>
                        </div>
                    </div>
                ))}

                {filteredStudents.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-slate-900/40 rounded-[2.5rem] border border-white/10">
                        <QrCodeIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No tertiary students match filter</p>
                    </div>
                )}
            </div>
        </div>
    );
}
