import React, { useState, useEffect, useMemo } from 'react';

import { 

    UsersIcon, 

    TruckIcon, 

    CalendarDaysIcon, 

    AcademicCapIcon, 

    PrinterIcon, 

    SparklesIcon, 

    SearchIcon, 

    XIcon, 

    DownloadIcon,

    EyeIcon

} from '../icons';

import { generateDSStudentLogbookPDF, generateDSPDF } from '../../utils/dsPdfGenerator';
import { generateStudentStatement } from '../../utils/dsReportGenerator';
import { CurrencyIcon } from '../icons';

import { useToast } from '../../services/ToastContext';
import { PdfViewer } from '../PdfViewer';



interface DSReportsViewProps {
    lessons: any[];
    instructors: any[];
    students: any[];
    vehicles: any[];
    rooms: any[];
    letterheadConfig?: any;
    currentInstitution?: any;
    invoices?: any[];
    payments?: any[];
    expenditures?: any[];
}



export const DSReportsView: React.FC<DSReportsViewProps> = ({
    lessons,
    instructors,
    students,
    vehicles,
    rooms,
    letterheadConfig,
    currentInstitution,
    invoices = [],
    payments = [],
    expenditures = []
}) => {

    const { success, error: toastError } = useToast();



    // Top-level report mode: 'timetables' | 'logbooks'

    const [reportMode, setReportMode] = useState<'timetables' | 'logbooks' | 'statements' | 'expenditure_summary'>('timetables');
    const [expRepDateFrom, setExpRepDateFrom] = useState('');
    const [expRepDateTo, setExpRepDateTo] = useState('');
    const [expRepCategory, setExpRepCategory] = useState('all');

    // State for Financial Statements
    const [selectedStatementStudentId, setSelectedStatementStudentId] = useState<string>('');
    const [statementPreviewUrl, setStatementPreviewUrl] = useState<string | null>(null);
    const [isGeneratingStatement, setIsGeneratingStatement] = useState<boolean>(false);

    // Generate Financial Statement Handler
    const handleGenerateStatement = async (preview: boolean) => {
        if (!selectedStatementStudentId) {
            toastError("Please select a student first.");
            return;
        }
        const student = (students || []).find((s: any) => s.id === selectedStatementStudentId);
        if (!student) {
            toastError("Selected student not found.");
            return;
        }

        setIsGeneratingStatement(true);
        try {
            const sInvoices = (invoices || []).filter((i: any) => i.studentId === selectedStatementStudentId);
            const sPayments = (payments || []).filter((p: any) => p.studentId === selectedStatementStudentId);
            
            const doc = await generateStudentStatement(student, sInvoices, sPayments, currentInstitution);
            if (preview) {
                const dataUrl = doc.output('datauristring');
                setStatementPreviewUrl(dataUrl);
                success("Financial statement preview updated!");
            } else {
                doc.save(`${student.fullName.replace(/\s+/g, '_')}_Statement.pdf`);
                success("Financial statement PDF downloaded successfully!");
            }
        } catch (err) {
            console.error(err);
            toastError("Failed to generate financial statement PDF.");
        } finally {
            setIsGeneratingStatement(false);
        }
    };



    // State for Instructor Timetables

    const [mode, setMode] = useState<'single' | 'bulk'>('single');

    const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');

    const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

    const [endDate, setEndDate] = useState<string>(() => {

        const d = new Date();

        d.setDate(d.getDate() + 7);

        return d.toISOString().split('T')[0];

    });

    const [generatedReport, setGeneratedReport] = useState<any | null>(null);



    // State for Student NTSA Logbooks

    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    const [studentSearch, setStudentSearch] = useState<string>('');

    const [logbookPreviewUrl, setLogbookPreviewUrl] = useState<string | null>(null);

    const [isGeneratingLogbook, setIsGeneratingLogbook] = useState<boolean>(false);



    useEffect(() => {

        if (mode === 'single' && !selectedInstructorId && (instructors || []).length > 0) {

            setSelectedInstructorId(instructors[0].id);

        }

    }, [mode, instructors, selectedInstructorId]);



    // Generate Timetable Handler

    const handleGenerateTimetable = () => {

        const targetInstructors = mode === 'bulk' 

            ? (instructors || []) 

            : (instructors || []).filter(i => i.id === selectedInstructorId);



        const validLessons = (lessons || []).filter(l => {

            if (l.lessonDate < startDate || l.lessonDate > endDate) return false;

            return true;

        });



        const reportData = targetInstructors.map(inst => {

            const instLessons = (validLessons || []).filter(l => l.instructorId === inst.id);

            instLessons.sort((a, b) => {

                if (a.lessonDate !== b.lessonDate) return a.lessonDate.localeCompare(b.lessonDate);

                return (a.startTime || '').localeCompare(b.startTime || '');

            });



            const totalSessions = instLessons.length;

            const practicalSessions = (instLessons || []).filter(l => !l.lessonType || l.lessonType === 'Practical').length;

            const theorySessions = (instLessons || []).filter(l => l.lessonType === 'Theory').length;



            return {

                instructor: inst,

                lessons: instLessons,

                stats: {

                    totalSessions,

                    practicalSessions,

                    theorySessions

                }

            };

        });



        setGeneratedReport({

            mode,

            startDate,

            endDate,

            generatedAt: new Date().toISOString(),

            data: reportData

        });

    };



    // Generate NTSA Logbook Handler

    const handleGenerateLogbook = async (preview: boolean) => {

        if (!selectedStudentId) {

            toastError("Please select a student first.");

            return;

        }



        const student = (students || []).find(s => s.id === selectedStudentId);

        if (!student) {

            toastError("Selected student not found.");

            return;

        }



        setIsGeneratingLogbook(true);

        try {

            const doc = await generateDSStudentLogbookPDF(

                student, 

                lessons || [], 

                instructors || [], 

                currentInstitution, 

                letterheadConfig

            );



            if (preview) {

                const dataUrl = doc.output('datauristring');

                setLogbookPreviewUrl(dataUrl);

                success("NTSA Logbook preview updated!");

            } else {

                doc.save(`Logbook_${student.admissionNumber || student.fullName.replace(/\s+/g, '_')}.pdf`);

                success("NTSA Logbook PDF downloaded successfully!");

            }

        } catch (err) {

            console.error(err);

            toastError("Failed to generate NTSA Training Logbook PDF.");

        } finally {

            setIsGeneratingLogbook(false);

        }

    };



    // Filter students list based on search query

    const filteredStudents = useMemo(() => {

        return (students || []).filter(s => 

            (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) || 

            (s.admissionNumber || '').toLowerCase().includes(studentSearch.toLowerCase())

        );

    }, [students, studentSearch]);



    return (

        <div className="space-y-8 animate-fade-in print:space-y-0">

            {/* Top-Level Mode Selector Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl max-w-full overflow-x-auto scrollbar-hide w-fit print:hidden">
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('timetables');
                        setLogbookPreviewUrl(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        reportMode === 'timetables' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Instructor Timetables
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('logbooks');
                        setGeneratedReport(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        reportMode === 'logbooks' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Student NTSA Logbooks
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('statements');
                        setGeneratedReport(null);
                        setLogbookPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        reportMode === 'statements' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Financial Statements
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('expenditure_summary');
                        setGeneratedReport(null);
                        setLogbookPreviewUrl(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        reportMode === 'expenditure_summary' 
                            ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Expenditure Reports
                </button>
            </div>



            {/* Mode 1: Instructor Timetables */}

            {reportMode === 'timetables' && (

                <>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm print:hidden">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">

                            <div>

                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Instructor Timetables</h3>

                                <p className="text-xs font-medium text-slate-400 mt-1">Generate dynamic timetables for individual instructors or bulk-export schedules across the entire staff.</p>

                            </div>

                            <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 w-fit">

                                <button

                                    type="button"

                                    onClick={() => setMode('single')}

                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${

                                        mode === 'single' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'

                                    }`}

                                >

                                    Single Instructor

                                </button>

                                <button

                                    type="button"

                                    onClick={() => setMode('bulk')}

                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${

                                        mode === 'bulk' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'

                                    }`}

                                >

                                    Bulk Generation

                                </button>

                            </div>

                        </div>



                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">

                            {mode === 'single' ? (

                                <div className="space-y-2">

                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Instructor</label>

                                    <select

                                        value={selectedInstructorId}

                                        onChange={e => setSelectedInstructorId(e.target.value)}

                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                    >

                                        {(instructors || []).map(i => (

                                            <option key={i.id} value={i.id}>{i.name} ({i.instructorType || 'Practical'})</option>

                                        ))}

                                    </select>

                                </div>

                            ) : (

                                <div className="space-y-2">

                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Scope</label>

                                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-indigo-600 flex items-center gap-2">

                                        <UsersIcon className="w-4 h-4" />

                                        <span>All {(instructors || []).length} Registered Instructors</span>

                                    </div>

                                </div>

                            )}



                            <div className="space-y-2">

                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>

                                <input

                                    type="date"

                                    value={startDate}

                                    onChange={e => setStartDate(e.target.value)}

                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                />

                            </div>



                            <div className="space-y-2">

                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>

                                <input

                                    type="date"

                                    value={endDate}

                                    onChange={e => setEndDate(e.target.value)}

                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                />

                            </div>

                        </div>



                        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">

                            {generatedReport && (

                                <button

                                    type="button"

                                    onClick={() => window.print()}

                                    className="px-6 py-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"

                                >

                                    <PrinterIcon className="w-4 h-4" />

                                    Print Schedules

                                </button>

                            )}

                            <button

                                type="button"

                                onClick={handleGenerateTimetable}

                                className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"

                            >

                                <SparklesIcon className="w-4 h-4" />

                                Generate Timetable

                            </button>

                        </div>

                    </div>



                    {/* Generated Timetable Output Container */}

                    {generatedReport && (

                        <div className="space-y-12 print:space-y-8">

                            {/* Printable Branded Header */}

                            <div className="hidden print:block border-b border-slate-200 pb-6 mb-6">

                                {letterheadConfig?.headerImageUrl && (

                                    <div className="w-full max-h-32 flex items-center justify-center overflow-hidden mb-4">

                                        <img src={letterheadConfig.headerImageUrl} alt="Letterhead" className="object-contain max-h-32" />

                                    </div>

                                )}

                                <div className="text-center">

                                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{currentInstitution?.name || 'Driving School'}</h2>

                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">

                                        Instructor Timetable Report ({mode === 'bulk' ? 'Bulk Export' : 'Individual'})

                                    </p>

                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">

                                        Period: {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}

                                    </p>

                                </div>

                            </div>



                            {generatedReport.data.map((reportItem: any) => (

                                <div key={reportItem.instructor.id} className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 print:mb-12 print:break-inside-avoid print:bg-transparent">

                                    {/* Instructor Card Section */}

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 print:bg-transparent print:border-b print:rounded-none print:p-0 print:pb-4">

                                        <div className="flex items-center gap-4">

                                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg print:hidden">

                                                {reportItem.instructor.name.charAt(0)}

                                            </div>

                                            <div>

                                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight print:text-black">{reportItem.instructor.name}</h4>

                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5 print:text-slate-600">

                                                    {reportItem.instructor.instructorType || 'Driving Instructor'} • {reportItem.instructor.specialization || 'General'}

                                                </p>

                                            </div>

                                        </div>

                                        <div className="flex flex-wrap gap-4">

                                            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center print:border-none print:p-0">

                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block print:inline print:mr-1">Total Sessions:</span>

                                                <span className="text-xs font-black text-slate-900 dark:text-white print:inline print:text-black">{reportItem.stats.totalSessions}</span>

                                            </div>

                                            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center print:border-none print:p-0">

                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block print:inline print:mr-1">Practical:</span>

                                                <span className="text-xs font-black text-emerald-600 print:inline">{reportItem.stats.practicalSessions}</span>

                                            </div>

                                            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center print:border-none print:p-0">

                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block print:inline print:mr-1">Theory:</span>

                                                <span className="text-xs font-black text-indigo-600 print:inline">{reportItem.stats.theorySessions}</span>

                                            </div>

                                        </div>

                                    </div>



                                    {/* Timeline/Table of Sessions */}

                                    {reportItem.lessons.length === 0 ? (

                                        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl print:hidden">

                                            <p className="text-xs text-slate-400 italic">No scheduled lessons for this instructor in the selected period.</p>

                                        </div>

                                    ) : (

                                        <div className="overflow-x-auto print:overflow-visible">

                                            <table className="w-full text-left border-collapse print:text-black">

                                                <thead>

                                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest print:border-slate-400">

                                                        <th className="py-3 px-4 print:px-2">Date</th>

                                                        <th className="py-3 px-4 print:px-2">Time Slot</th>

                                                        <th className="py-3 px-4 print:px-2">Student</th>

                                                        <th className="py-3 px-4 print:px-2">Type</th>

                                                        <th className="py-3 px-4 print:px-2">Resource/Asset</th>

                                                        <th className="py-3 px-4 print:px-2 text-right">Status</th>

                                                    </tr>

                                                </thead>

                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-xs font-bold print:divide-slate-200">

                                                    {reportItem.lessons.map((lesson: any) => {

                                                        const student = (students || []).find(s => s.id === lesson.studentId);

                                                        const vehicle = (vehicles || []).find(v => v.id === lesson.vehicleId);

                                                        const isTheory = lesson.lessonType === 'Theory';

                                                        

                                                        return (

                                                            <tr key={lesson.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors print:hover:bg-transparent print:break-inside-avoid">

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap text-slate-900 dark:text-white print:text-black print:py-2">

                                                                    {new Date(lesson.lessonDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-black print:text-black print:py-2">

                                                                    {lesson.startTime} — {lesson.endTime}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 text-slate-700 dark:text-slate-300 print:text-black print:py-2">

                                                                    {student?.fullName || lesson.studentName || 'Unknown Student'}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap print:py-2">

                                                                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider print:p-0 print:bg-transparent print:text-black ${

                                                                        isTheory ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'

                                                                    }`}>

                                                                        {lesson.lessonType || 'Practical'}

                                                                    </span>

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 text-slate-500 dark:text-slate-400 text-[11px] print:text-slate-700 print:py-2">

                                                                    {isTheory ? (

                                                                        <span className="flex items-center gap-1.5 print:gap-0">

                                                                            <AcademicCapIcon className="w-3.5 h-3.5 text-indigo-500 inline print:hidden" />

                                                                            {lesson.roomName || 'Classroom A'}

                                                                        </span>

                                                                    ) : (

                                                                        <span className="flex items-center gap-1.5 print:gap-0">

                                                                            <TruckIcon className="w-3.5 h-3.5 text-emerald-500 inline print:hidden" />

                                                                            {vehicle ? `${vehicle.make} (${vehicle.plateNumber})` : 'Assigned Fleet'}

                                                                        </span>

                                                                    )}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap text-right print:py-2">

                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest print:p-0 print:bg-transparent print:text-black ${

                                                                        lesson.status === 'Completed' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :

                                                                        lesson.status === 'Cancelled' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'

                                                                    }`}>

                                                                        {lesson.status || 'Scheduled'}

                                                                    </span>

                                                                </td>

                                                            </tr>

                                                        );

                                                    })}

                                                </tbody>

                                            </table>

                                        </div>

                                    )}

                                </div>

                            ))}

                        </div>

                    )}

                </>

            )}



            {/* Mode 2: Student NTSA Logbooks */}

            {reportMode === 'logbooks' && (

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Controls Column */}

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">

                        <div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">NTSA Training Logbooks</h3>

                            <p className="text-xs font-medium text-slate-400 mt-1">Compile comprehensive practical session records and theoretical attendance logs for NTSA inspector checkoff audits.</p>

                        </div>



                        <div className="space-y-4">

                            <div className="space-y-2">

                                <div className="flex items-center justify-between ml-1">

                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Candidate</label>

                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">

                                        <SearchIcon className="w-3.5 h-3.5" />

                                        <input

                                            type="text"

                                            value={studentSearch}

                                            onChange={e => setStudentSearch(e.target.value)}

                                            placeholder="Search name..."

                                            className="bg-transparent border-none focus:ring-0 p-0 text-[10px] w-24 text-right placeholder-slate-300 dark:placeholder-slate-600"

                                        />

                                    </div>

                                </div>

                                <select

                                    value={selectedStudentId}

                                    onChange={e => {

                                        setSelectedStudentId(e.target.value);

                                        setLogbookPreviewUrl(null);

                                    }}

                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                >

                                    <option value="">-- Select Student --</option>

                                    {filteredStudents.map(s => (

                                        <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber || 'ADM-N/A'})</option>

                                    ))}

                                </select>

                            </div>

                        </div>



                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">

                            <button

                                type="button"

                                disabled={isGeneratingLogbook || !selectedStudentId}

                                onClick={() => handleGenerateLogbook(true)}

                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"

                            >

                                <EyeIcon className="w-4 h-4" />

                                {isGeneratingLogbook ? 'Generating...' : 'Generate & Preview Logbook'}

                            </button>

                            <button

                                type="button"

                                disabled={isGeneratingLogbook || !selectedStudentId}

                                onClick={() => handleGenerateLogbook(false)}

                                className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"

                            >

                                <DownloadIcon className="w-4 h-4" />

                                Download Logbook PDF

                            </button>

                        </div>

                    </div>



                    {/* PDF Preview Frame Column */}

                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[75vh] flex flex-col">

                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">On-Screen PDF Viewer</h4>

                        {logbookPreviewUrl ? (

                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative">

                                <PdfViewer

                                    src={logbookPreviewUrl}

                                    className="w-full h-full border-none"

                                    title="Logbook PDF Preview"

                                />

                            </div>

                        ) : (

                            <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">

                                <CalendarDaysIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />

                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">No active preview loaded</h5>

                                <p className="text-xs text-slate-400 mt-1 max-w-sm">Select a student and click "Generate & Preview Logbook" to compile details dynamically into the official KES/NTSA training format.</p>

                            </div>

                        )}

                    </div>

                </div>

            )}

            {/* Mode 3: Financial Statements */}
            {reportMode === 'statements' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Controls Column */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Financial Statements</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1">Generate and preview the student financial ledger statement.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Student</label>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                        <SearchIcon className="w-3.5 h-3.5" />
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            placeholder="Search name..."
                                            className="bg-transparent border-none focus:ring-0 p-0 text-[10px] w-24 text-right placeholder-slate-300 dark:placeholder-slate-600"
                                        />
                                    </div>
                                </div>
                                <select
                                    value={selectedStatementStudentId}
                                    onChange={e => {
                                        setSelectedStatementStudentId(e.target.value);
                                        setStatementPreviewUrl(null);
                                    }}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100"
                                >
                                    <option value="">-- Select Student --</option>
                                    {filteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber || 'ADM-N/A'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                            <button
                                type="button"
                                disabled={isGeneratingStatement || !selectedStatementStudentId}
                                onClick={() => handleGenerateStatement(true)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <EyeIcon className="w-4 h-4" />
                                {isGeneratingStatement ? 'Generating...' : 'Generate & Preview Statement'}
                            </button>
                            <button
                                type="button"
                                disabled={isGeneratingStatement || !selectedStatementStudentId}
                                onClick={() => handleGenerateStatement(false)}
                                className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Download Statement PDF
                            </button>
                        </div>
                    </div>

                    {/* PDF Preview Frame Column */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[75vh] flex flex-col">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">On-Screen PDF Viewer</h4>
                        {statementPreviewUrl ? (
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                                <PdfViewer
                                    src={statementPreviewUrl}
                                    className="w-full h-full border-none"
                                    title="Financial Statement PDF Preview"
                                />
                            </div>
                        ) : (
                            <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                                <CurrencyIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">No active preview loaded</h5>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">Select a student and click "Generate &amp; Preview Statement" to compile details dynamically into the official financial ledger format.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mode 3: Financial Statements */}
            {reportMode === 'statements' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Controls Column */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Financial Statements</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1">Generate and preview the student financial ledger statement.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Student</label>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                        <SearchIcon className="w-3.5 h-3.5" />
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            placeholder="Search name..."
                                            className="bg-transparent border-none focus:ring-0 p-0 text-[10px] w-24 text-right placeholder-slate-300 dark:placeholder-slate-600"
                                        />
                                    </div>
                                </div>
                                <select
                                    value={selectedStatementStudentId}
                                    onChange={e => {
                                        setSelectedStatementStudentId(e.target.value);
                                        setStatementPreviewUrl(null);
                                    }}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100"
                                >
                                    <option value="">-- Select Student --</option>
                                    {filteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber || 'ADM-N/A'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                            <button
                                type="button"
                                disabled={isGeneratingStatement || !selectedStatementStudentId}
                                onClick={() => handleGenerateStatement(true)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <EyeIcon className="w-4 h-4" />
                                {isGeneratingStatement ? 'Generating...' : 'Generate & Preview Statement'}
                            </button>
                            <button
                                type="button"
                                disabled={isGeneratingStatement || !selectedStatementStudentId}
                                onClick={() => handleGenerateStatement(false)}
                                className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Download Statement PDF
                            </button>
                        </div>
                    </div>

                    {/* PDF Preview Frame Column */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[75vh] flex flex-col">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">On-Screen PDF Viewer</h4>
                        {statementPreviewUrl ? (
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                                <PdfViewer
                                    src={statementPreviewUrl}
                                    className="w-full h-full border-none"
                                    title="Financial Statement PDF Preview"
                                />
                            </div>
                        ) : (
                            <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                                <CurrencyIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">No active preview loaded</h5>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">Select a student and click "Generate & Preview Statement" to compile details dynamically into the official financial ledger format.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {reportMode === 'expenditure_summary' && (() => {
                const EXP_CATEGORIES = ['Fuel','Maintenance','Salaries','Rent','Utilities','Marketing','Equipment','Insurance','Other'];
                const CAT_COLORS: Record<string,string> = { Fuel:'bg-orange-100 text-orange-700', Maintenance:'bg-blue-100 text-blue-700', Salaries:'bg-violet-100 text-violet-700', Rent:'bg-amber-100 text-amber-700', Utilities:'bg-cyan-100 text-cyan-700', Marketing:'bg-pink-100 text-pink-700', Equipment:'bg-teal-100 text-teal-700', Insurance:'bg-indigo-100 text-indigo-700', Other:'bg-slate-100 text-slate-600' };
                const filtered = (expenditures || []).filter(e => {
                    const d = new Date(e.expenseDate).getTime();
                    const matchCat = expRepCategory === 'all' || e.category === expRepCategory;
                    const matchFrom = !expRepDateFrom || d >= new Date(expRepDateFrom).getTime();
                    const matchTo = !expRepDateTo || d <= new Date(expRepDateTo + 'T23:59:59').getTime();
                    return matchCat && matchFrom && matchTo;
                }).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
                const totalAmt = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                const byCat: Record<string, {count: number, total: number}> = {};
                filtered.forEach(e => {
                    if (!byCat[e.category]) byCat[e.category] = { count: 0, total: 0 };
                    byCat[e.category].count++;
                    byCat[e.category].total += Number(e.amount) || 0;
                });
                const byVehicle: Record<string, {reg: string, total: number}> = {};
                filtered.forEach(e => {
                    if (e.vehicleId) {
                        const veh = (vehicles||[]).find((v: any) => v.id === e.vehicleId);
                        if (!byVehicle[e.vehicleId]) byVehicle[e.vehicleId] = { reg: veh?.registrationNumber || e.vehicleId, total: 0 };
                        byVehicle[e.vehicleId].total += Number(e.amount) || 0;
                    }
                });
                const handleExport = () => {
                    const header = ['Date','Description','Category','Amount (KES)','Method','Paid To','Vehicle','Recorded By'];
                    const rows = filtered.map(e => { const v = (vehicles||[]).find((veh: any) => veh.id === e.vehicleId); return [e.expenseDate, e.description, e.category, e.amount, e.paymentMethod, e.paidTo||'', v?.registrationNumber||'', e.recordedBy||'']; });
                    const csv = [header,...rows].map(r => r.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href=url; a.download=`expenditure_report_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
                };
                return (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">Expenditure Report</span>
                                    <h3 className="text-2xl font-black tracking-tight mt-3">Operating Cost Summary</h3>
                                    <p className="text-xs text-rose-100 mt-1">Breakdown of all school expenditures by category and vehicle</p>
                                </div>
                                <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                                    <DownloadIcon className="w-4 h-4" /> Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-wrap items-center gap-3">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                                <select value={expRepCategory} onChange={e => setExpRepCategory(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-1 focus:ring-rose-500 text-slate-700 dark:text-slate-200 appearance-none">
                                    <option value="all">All Categories</option>
                                    {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">From Date</label>
                                <input type="date" value={expRepDateFrom} onChange={e => setExpRepDateFrom(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-1 focus:ring-rose-500 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">To Date</label>
                                <input type="date" value={expRepDateTo} onChange={e => setExpRepDateTo(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-1 focus:ring-rose-500 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Period Spend</p>
                                <p className="text-2xl font-black text-rose-600">KES {totalAmt.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Summary Cards by Category */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Object.entries(byCat).sort((a,b) => b[1].total - a[1].total).map(([cat, data]) => (
                                <div key={cat} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 ${CAT_COLORS[cat] || CAT_COLORS['Other']}`}>{cat}</span>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">KES {data.total.toLocaleString()}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">{data.count} transactions • {((data.total/Math.max(totalAmt,1))*100).toFixed(1)}% of total</p>
                                    {/* Mini progress bar */}
                                    <div className="mt-3 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500 rounded-full transition-all" style={{width:`${((data.total/Math.max(totalAmt,1))*100).toFixed(1)}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Vehicle Cost Breakdown */}
                        {Object.keys(byVehicle).length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-6">Vehicle-Linked Cost Breakdown</h4>
                                <div className="space-y-3">
                                    {Object.entries(byVehicle).sort((a,b) => b[1].total - a[1].total).map(([vid, data]) => (
                                        <div key={vid} className="flex items-center gap-4">
                                            <div className="w-24 shrink-0">
                                                <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider">{data.reg}</span>
                                            </div>
                                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-rose-500 rounded-full" style={{width:`${((data.total/Math.max(totalAmt,1))*100)}%`}}></div>
                                            </div>
                                            <p className="font-black text-sm text-rose-600 dark:text-rose-400 w-32 text-right">KES {data.total.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detailed Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Transaction Detail ({filtered.length} records)</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-50 dark:border-slate-800">
                                            {['Date','Description','Category','Amount','Method','Paid To','Vehicle'].map(h => (
                                                <th key={h} className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {filtered.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-12 text-center">
                                                <CurrencyIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No expenditures match the selected filters</p>
                                            </td></tr>
                                        ) : filtered.map(exp => {
                                            const veh = (vehicles||[]).find((v: any) => v.id === exp.vehicleId);
                                            return (
                                                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(exp.expenseDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white max-w-[200px] truncate">{exp.description}</td>
                                                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${CAT_COLORS[exp.category]||CAT_COLORS['Other']}`}>{exp.category}</span></td>
                                                    <td className="px-6 py-4 font-black text-sm text-rose-600 dark:text-rose-400">KES {(exp.amount??0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{exp.paymentMethod}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500 max-w-[120px] truncate">{exp.paidTo||'—'}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{veh?.registrationNumber||'—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {filtered.length > 0 && (
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                                                <td colSpan={3} className="px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Grand Total</td>
                                                <td className="px-6 py-4 font-black text-base text-rose-600 dark:text-rose-400">KES {totalAmt.toLocaleString()}</td>
                                                <td colSpan={3}></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>

    );

};
