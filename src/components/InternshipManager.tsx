import React, { useState, useMemo } from 'react';
/* FIXED: Renamed Attachment to Internship to match the type definition. */
import type { User, Internship, Course, LetterheadConfig } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';

/* FIXED: Renamed generateAttachmentReport to generateInternshipReport. */
import { generateInternshipReport } from '../services/geminiService';
/* FIXED: Renamed generateAttachmentReportPdf to generateInternshipReportPdf. */
import { generateInternshipReportPdf } from '../services/pdfService';

/* FIXED: Renamed AttachmentManagerProps to InternshipManagerProps and updated types. */
interface InternshipManagerProps {
    currentUser: User;
    students: User[];
    courses: Course[];
    internships: Internship[];
    onAddInternship: (data: Omit<Internship, 'id' | 'institutionId' | 'lecturerId' | 'status'>) => void;
    onUpdateInternship: (internshipId: string, data: Partial<Omit<Internship, 'id' | 'institutionId'>>) => void;
    onDeleteInternship: (internshipId: string) => void;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
}

/* FIXED: Renamed component from AttachmentManager to InternshipManager and updated props. */
export const InternshipManager: React.FC<InternshipManagerProps> = ({
    currentUser, students, courses, internships, onAddInternship, onUpdateInternship, onDeleteInternship, letterheadConfig, logoUrl, footerImageUrl
}) => {
    // State for the form to add a new internship
    const [studentId, setStudentId] = useState('');
    const [industryName, setIndustryName] = useState('');
    const [industryLocation, setIndustryLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // State for managing the report generation modal
    const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
    const [reportKeywords, setReportKeywords] = useState('');
    const [generatedReport, setGeneratedReport] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isSavingReport, setIsSavingReport] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId || !industryName || !startDate || !endDate) {
            alert('Please fill all required fields.');
            return;
        }
        onAddInternship({ studentId, industryName, industryLocation, startDate, endDate });
        // Reset form
        setStudentId('');
        setIndustryName('');
        setIndustryLocation('');
        setStartDate('');
        setEndDate('');
    };

    const handleGenerateReport = async () => {
        if (!editingInternship) return;
        setIsGeneratingReport(true);
        const student = students.find(s => s.id === editingInternship.studentId);
        if (student) {
            const courseName = courseMap.get(student.courseId || '') || 'N/A';
            /* FIXED: Call generateInternshipReport instead of generateAttachmentReport. */
            const report = await generateInternshipReport(student, editingInternship, courseName, reportKeywords);
            setGeneratedReport(report);
        }
        setIsGeneratingReport(false);
    };

    const handleSaveReport = () => {
        if (!editingInternship) return;
        setIsSavingReport(true);
        onUpdateInternship(editingInternship.id, { report: generatedReport });
        setIsSavingReport(false);
        setEditingInternship(null);
        setGeneratedReport('');
        setReportKeywords('');
    };

    const handleDownloadPdf = async (internship: Internship) => {
        setIsGeneratingPdf(true);
        try {
            const student = students.find(s => s.id === internship.studentId);
            if (student && internship.report) {
                const courseName = courseMap.get(student.courseId || '') || 'N/A';
                /* FIXED: Call generateInternshipReportPdf instead of generateAttachmentReportPdf. */
                const pdfDataUri = await generateInternshipReportPdf(student, internship, courseName, internship.report, letterheadConfig, logoUrl, footerImageUrl);
                const link = document.createElement('a');
                link.href = pdfDataUri;
                link.download = `Internship_Report_${student.name.replace(/\s/g, '_')}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("Student details or report content is missing.");
            }
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("An error occurred while generating the PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const lecturerInternships = internships.filter(i => i.lecturerId === currentUser.id)
        .sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    return (
        <div className="space-y-8">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; transition: filter 0.15s; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; transition: background-color 0.15s; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
            `}</style>
            <section>
                <h3 className="text-xl font-semibold mb-4">Assign Student to Internship</h3>
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Student</label>
                            <select value={studentId} onChange={e => setStudentId(e.target.value)} required className="mt-1 form-select"><option value="" disabled>Select a student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
                            <input type="text" value={industryName} onChange={e => setIndustryName(e.target.value)} required className="mt-1 form-input" placeholder="e.g., Google Kenya" />
                        </div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company Location (Optional)</label><input type="text" value={industryLocation} onChange={e => setIndustryLocation(e.target.value)} className="mt-1 form-input" placeholder="e.g., Nairobi, Kenya" /></div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 form-input"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="mt-1 form-input"/>
                        </div>
                    </div>
                    <div className="flex justify-end"><button type="submit" className="btn-primary">Assign Internship</button></div>
                </form>
            </section>

            <section>
                <h3 className="text-xl font-semibold mb-4">My Internship Assignments</h3>
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {lecturerInternships.length > 0 ? lecturerInternships.map(internship => {
                            const student = students.find(s => s.id === internship.studentId);
                            return (
                                <li key={internship.id} className="p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{student?.name}</p>
                                            <p className="text-sm text-[var(--color-primary)] font-medium">{internship.industryName}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(internship.startDate).toLocaleDateString()} - {new Date(internship.endDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {internship.report && <button onClick={() => handleDownloadPdf(internship)} disabled={isGeneratingPdf} className="btn-secondary text-sm inline-flex items-center gap-2"><DocumentArrowDownIcon className="w-4 h-4" /> Report</button>}
                                            <button onClick={() => setEditingInternship(internship)} className="btn-primary text-sm">{internship.report ? 'Edit Report' : 'Write Report'}</button>
                                            <button onClick={() => onDeleteInternship(internship.id)} className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                                        </div>
                                    </div>
                                </li>
                            );
                        }) : <li className="px-6 py-10 text-center text-sm text-slate-500">You have not been assigned to supervise any internships.</li>}
                    </ul>
                </div>
            </section>

            {editingInternship && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-bold">Internship Report</h3>
                        </div>
                        <div className="flex-grow p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Keywords/Notes for Report</label>
                                <input type="text" value={reportKeywords} onChange={e => setReportKeywords(e.target.value)} className="mt-1 form-input" placeholder="e.g., proactive, excellent problem-solver, needs improvement in time management" />
                                <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="mt-2 btn-secondary inline-flex items-center gap-2"><SparklesIcon className={`w-5 h-5 ${isGeneratingReport ? 'animate-spin' : ''}`} />{isGeneratingReport ? 'Generating...' : 'Generate with AI'}</button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Generated Report</label>
                                <textarea value={generatedReport} onChange={e => setGeneratedReport(e.target.value)} rows={15} className="mt-1 form-input font-mono" />
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 flex flex-row-reverse">
                            <button onClick={handleSaveReport} disabled={isSavingReport} className="btn-primary">{isSavingReport ? 'Saving...' : 'Save Report'}</button>
                            <button onClick={() => setEditingInternship(null)} className="btn-secondary mr-3">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
