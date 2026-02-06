
import React, { useState, useMemo } from 'react';
import type { User, Subject, Department, Course, TimetableEntry, LetterheadConfig, StudentAttendance, Institution } from '../types';
import { CheckIcon, XIcon, ClockIcon, PrinterIcon, DocumentArrowDownIcon } from './icons';

// Let TypeScript know that these are global variables from the script tags
declare var jspdf: any;

interface AttendanceReportsProps {
    currentUser: User;
    users: User[];
    subjects: Subject[];
    departments: Department[];
    courses: Course[];
    generatedTimetable: TimetableEntry[];
    studentAttendances: StudentAttendance[];
    studentCheckIns: Record<string, string>;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    currentInstitution?: Institution | null;
}

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(100, Math.max(0, value));
    let colorClass = 'bg-sky-500';
    if (percentage < 40) colorClass = 'bg-red-500';
    else if (percentage < 70) colorClass = 'bg-yellow-500';
    else colorClass = 'bg-green-500';

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};


export const AttendanceReports: React.FC<AttendanceReportsProps> = ({
    currentUser, users, subjects, departments, courses, generatedTimetable, studentAttendances, studentCheckIns, letterheadConfig, logoUrl, footerImageUrl, currentInstitution
}) => {
    const [tab, setTab] = useState<'lecturer' | 'student'>('lecturer');
    const [searchInputValue, setSearchInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleSearch = () => {
        setSearchTerm(searchInputValue.toLowerCase().trim());
    };

    const handleClear = () => {
        setSearchInputValue('');
        setSearchTerm('');
    };

    const { visibleLecturers, visibleStudents, departmentMap, courseMap } = useMemo(() => {
        const allLecturers = users.filter(u => u.role === 'lecturer' || u.role === 'hod');
        const allStudents = users.filter(u => u.role === 'student');
        const depMap = new Map(departments.map(d => [d.id, d.name]));
        const cMap = new Map(courses.map(c => [c.id, c.name]));

        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            const hodDeptId = currentUser.departmentId;
            const coursesInDept = new Set(courses.filter(c => c.departmentId === hodDeptId).map(c => c.id));
            return {
                visibleLecturers: allLecturers.filter(l => l.departmentId === hodDeptId),
                visibleStudents: allStudents.filter(s => s.courseId && coursesInDept.has(s.courseId)),
                departmentMap: depMap,
                courseMap: cMap,
            };
        }

        return {
            visibleLecturers: allLecturers,
            visibleStudents: allStudents,
            departmentMap: depMap,
            courseMap: cMap,
        };
    }, [users, departments, courses, currentUser]);

    const lecturerReportData = useMemo(() => {
        let data = visibleLecturers.map(lecturer => {
            const scheduledLessons = generatedTimetable.filter(e => e.lecturerId === lecturer.id);
            const total = scheduledLessons.length;
            /* FIXED: Changed attendanceStatus to attendance_status to match type definition */
            const attended = scheduledLessons.filter(e => e.attendance_status === 'present').length;
            /* FIXED: Changed attendanceStatus to attendance_status to match type definition */
            const absenceRequested = scheduledLessons.filter(e => e.attendance_status === 'pending_absence_request' || e.attendance_status === 'approved_absence').length;
            const notMarked = total - attended - absenceRequested;
            const rate = total > 0 ? (attended / total) * 100 : 0;
            return {
                id: lecturer.id,
                name: lecturer.name,
                department: departmentMap.get(lecturer.departmentId || '') || 'N/A',
                total,
                attended,
                absenceRequested,
                notMarked,
                rate
            };
        });

        if (searchTerm) {
            data = data.filter(lecturer =>
                lecturer.name.toLowerCase().includes(searchTerm) ||
                lecturer.department.toLowerCase().includes(searchTerm)
            );
        }

        return data.sort((a, b) => a.name.localeCompare(b.name));
    }, [visibleLecturers, generatedTimetable, departmentMap, searchTerm]);

    const studentReportData = useMemo(() => {
        let data = visibleStudents.map(student => {
            const studentEnrolledIds = new Set(student.enrolledSubjectIds || []);
            const scheduledLessons = generatedTimetable.filter(e => studentEnrolledIds.has(e.subjectId));
            const total = scheduledLessons.length;
            
            const attendedCount = scheduledLessons.filter(lesson => {
                // Lecturer's mark is definitive
                const lecturerRecord = studentAttendances.find(att => att.timetableEntryId === lesson.id && att.studentId === student.id);
                if (lecturerRecord) {
                    if (lecturerRecord.status === 'present' || lecturerRecord.status === 'late') {
                        return true;
                    }
                    if (lecturerRecord.status === 'absent') {
                        return false; // Override
                    }
                }
                // If no definitive lecturer mark, check student self-check-in
                const selfCheckInRecord = studentCheckIns[`${student.id}-${lesson.id}`];
                return !!selfCheckInRecord;
            }).length;

            const rate = total > 0 ? (attendedCount / total) * 100 : 0;
            return {
                id: student.id,
                name: student.name,
                course: courseMap.get(student.courseId || '') || 'N/A',
                total,
                attended: attendedCount,
                rate
            };
        });

        if (searchTerm) {
            data = data.filter(student =>
                student.name.toLowerCase().includes(searchTerm) ||
                student.course.toLowerCase().includes(searchTerm)
            );
        }
        
        return data.sort((a, b) => a.name.localeCompare(b.name));
    }, [visibleStudents, generatedTimetable, studentAttendances, studentCheckIns, courseMap, searchTerm]);
    
    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jspdf.jsPDF({ orientation: 'landscape' });
            
            const loadImage = (url: string | null): Promise<HTMLImageElement | null> => {
                return new Promise((resolve) => {
                    if (!url) return resolve(null);
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = url;
                    img.onload = () => resolve(img);
                    img.onerror = () => { console.error("Failed to load image for PDF."); resolve(null); };
                });
            };
    
            const setupHeader = (doc: any, logoImg: HTMLImageElement | null, title: string) => {
                const margin = 14;
                const pageWidth = doc.internal.pageSize.getWidth();
                let headerStartY = 15;
    
                if (logoImg) {
                    const logoWidth = 20;
                    const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
                    doc.addImage(logoImg, 'PNG', margin, headerStartY, logoWidth, logoHeight);
                }
    
                const textX = margin + (logoImg ? 25 : 0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.text(currentInstitution?.name || 'Institution Report', textX, headerStartY + 5);
    
                const lineY = headerStartY + 25;
                doc.setDrawColor(180, 180, 180);
                doc.line(margin, lineY, pageWidth - margin, lineY);
    
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0);
                doc.text(title, margin, lineY + 10);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80);
                doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, lineY + 15);
    
                return lineY + 25;
            };
            
            const setupFooter = (doc: any, footerImg: HTMLImageElement | null) => {
                 if (footerImg) {
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const footerMargin = 10;
                    const availableWidth = pageWidth - (footerMargin * 2);
                    const aspectRatio = footerImg.width / footerImg.height;
                    let finalWidth = availableWidth;
                    let finalHeight = finalWidth / aspectRatio;
                    const maxHeight = 30; 
                    if (finalHeight > maxHeight) {
                        finalHeight = maxHeight;
                        finalWidth = finalHeight * aspectRatio;
                    }
                    const xPos = (pageWidth - finalWidth) / 2;
                    const yPos = pageHeight - finalHeight - footerMargin;
                    doc.addImage(footerImg, 'PNG', xPos, yPos, finalWidth, finalHeight);
                }
                 const pageCount = doc.internal.getNumberOfPages();
                 for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
                 }
            };
            
            const [logoImg, footerImg] = await Promise.all([
                loadImage(logoUrl),
                loadImage(footerImageUrl)
            ]);
            
            const reportTitle = tab === 'lecturer' ? "Lecturer Attendance Report" : "Student Attendance Report";
            const tableStartY = setupHeader(doc, logoImg, reportTitle);
    
            let head: string[][] = [];
            let body: (string | number)[][] = [];
    
            if (tab === 'lecturer') {
                head = [['Lecturer', 'Department', 'Scheduled', 'Attended', 'Absence', 'Not Marked', 'Rate']];
                body = lecturerReportData.map(d => [d.name, d.department, d.total, d.attended, d.absenceRequested, d.notMarked, `${d.rate.toFixed(0)}%`]);
            } else {
                head = [['Student', 'Course', 'Total Classes', 'Attended', 'Rate']];
                body = studentReportData.map(d => [d.name, d.course, d.total, d.attended, `${d.rate.toFixed(0)}%`]);
            }
            
            doc.autoTable({
                head: head,
                body: body,
                startY: tableStartY,
                theme: 'grid',
                headStyles: { fillColor: [45, 55, 72], textColor: 255 },
                didDrawPage: (data: any) => {
                    setupFooter(doc, footerImg);
                }
            });
            
            doc.save(`${reportTitle.replace(/\s/g, '_')}.pdf`);
    
        } catch (e) {
            console.error("Failed to generate PDF", e);
            alert("An error occurred while generating the PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };


    const renderLecturerReport = () => (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Lecturer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Scheduled (wk)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Attended</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Absence/Pending</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Not Marked</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Attendance Rate</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {lecturerReportData.map(data => (
                        <tr key={data.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{data.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{data.department}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{data.total}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">{data.attended}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400">{data.absenceRequested}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{data.notMarked}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <ProgressBar value={data.rate} />
                                    <span>{data.rate.toFixed(0)}%</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    const renderStudentReport = () => (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Total Classes (wk)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Attended</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Attendance Rate</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                     {studentReportData.map(data => (
                        <tr key={data.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{data.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{data.course}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{data.total}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">{data.attended}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <ProgressBar value={data.rate} />
                                    <span>{data.rate.toFixed(0)}%</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6">
            <style>{`
                @media print {
                    body > div > *:not(main),
                    main > div > *:not(.printable-area),
                    .no-print {
                        display: none !important;
                    }
                    main, body {
                        background-color: white !important;
                        color: black !important;
                        padding: 0;
                        margin: 0;
                    }
                     main {
                        max-width: 100% !important;
                     }
                    .printable-container, .printable-area, .printable-area > div {
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                    }
                    .printable-area table {
                        font-size: 10px;
                        width: 100%;
                    }
                    .printable-area h3 {
                        color: black !important;
                    }
                    .dark {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="flex flex-wrap gap-4 justify-between items-center no-print">
                <h3 className="text-xl font-semibold">Attendance Reports</h3>
                 <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex gap-2 items-center w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder={`Search ${tab === 'lecturer' ? 'by name/dept...' : 'by name/course...'}`}
                            value={searchInputValue}
                            onChange={(e) => setSearchInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="block w-full sm:w-52 pl-3 pr-4 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--color-primary)] hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
                        >
                            Search
                        </button>
                        {searchTerm && (
                            <button
                                onClick={handleClear}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-500 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-500 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                            <PrinterIcon className="w-5 h-5" />
                            Print
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--color-primary)] hover:brightness-90 disabled:opacity-50"
                        >
                            <DocumentArrowDownIcon className="w-5 h-5" />
                            {isGeneratingPdf ? 'Generating...' : 'Download'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 no-print">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setTab('lecturer')}
                        className={`${ tab === 'lecturer' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:border-slate-300' } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Lecturer Attendance
                    </button>
                    <button
                        onClick={() => setTab('student')}
                        className={`${ tab === 'student' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:border-slate-300' } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Student Attendance
                    </button>
                </nav>
            </div>
            
            <div className="printable-area">
                <h3 className="text-xl font-semibold mb-4 hidden print:block dark:text-white">
                    {tab === 'lecturer' ? 'Lecturer Attendance Report' : 'Student Attendance Report'}
                </h3>
                {tab === 'lecturer' && renderLecturerReport()}
                {tab === 'student' && renderStudentReport()}
            </div>
        </div>
    );
};
