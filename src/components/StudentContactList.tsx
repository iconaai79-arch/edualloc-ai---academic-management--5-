import React, { useState, useMemo } from 'react';
import type { User, Course, Department, LetterheadConfig, Institution } from '../types';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';

import { generateStudentContactListPdf } from '../services/pdfService';
import { isSchoolInstitution } from '../utils/roleUtils';

interface StudentContactListProps {
    currentUser: User;
    allUsers: User[];
    allCourses: Course[];
    allDepartments: Department[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    currentInstitution?: Institution | null;
}

export const StudentContactList: React.FC<StudentContactListProps> = ({
    currentUser,
    allUsers,
    allCourses,
    allDepartments,
    letterheadConfig,
    logoUrl,
    footerImageUrl,
    currentInstitution,
}) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const isSchool = isSchoolInstitution(currentInstitution);
    const courseLabel = isSchool ? 'Grade' : 'Course';

    // Filter courses based on HOD's department if applicable
    const visibleCourses = useMemo(() => {
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            return allCourses.filter(c => c.departmentId === currentUser.departmentId);
        }
        return allCourses;
    }, [currentUser, allCourses]);

    const [selectedCourseId, setSelectedCourseId] = useState<string>(visibleCourses[0]?.id || 'all');

    const { filteredStudents, courseName, departmentName } = useMemo(() => {
        const students = allUsers.filter(u => u.role === 'student');
        if (selectedCourseId === 'all') {
            // For HOD, show all students in their department's courses
            if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
                 const coursesInDept = new Set(visibleCourses.map(c => c.id));
                 return {
                     filteredStudents: students.filter(s => s.courseId && coursesInDept.has(s.courseId)),
                     courseName: `All ${courseLabel}s`,
                     departmentName: allDepartments.find(d => d.id === currentUser.departmentId)?.name || ''
                 };
            }
            // For lecturer, show all students
            return {
                filteredStudents: students,
                courseName: `All ${courseLabel}s`,
                departmentName: "All Departments"
            };
        }
        
        const course = allCourses.find(c => c.id === selectedCourseId);
        const department = allDepartments.find(d => d.id === course?.departmentId);

        return {
            filteredStudents: students.filter(s => s.courseId === selectedCourseId),
            courseName: course?.name || '',
            departmentName: department?.name || ''
        };
    }, [selectedCourseId, allUsers, allCourses, allDepartments, currentUser, visibleCourses, courseLabel]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const pdfDataUri = await generateStudentContactListPdf(
                filteredStudents,
                courseName,
                departmentName,
                letterheadConfig,
                logoUrl,
                footerImageUrl
            );
            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `Student_Contacts_${courseName.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('An error occurred while generating the PDF report.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    return (
        <div className="space-y-6">
             <style>{`
                @media print {
                    body > div > header,
                    main > div > div:not(.printable-container),
                    .no-print {
                        display: none !important;
                    }
                    html, body, #root, main {
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
                    .dark { display: none !important; }
                }
            `}</style>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm no-print">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                     <div className="w-full sm:w-80">
                        <label htmlFor="course-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Filter by {courseLabel}
                        </label>
                        <select
                            id="course-filter"
                            value={selectedCourseId}
                            onChange={e => setSelectedCourseId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600"
                        >
                            <option value="all">All {courseLabel}s</option>
                            {visibleCourses.map(course => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 self-end">
                        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-500 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                            <PrinterIcon className="w-5 h-5" /> Print
                        </button>
                        <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--color-primary)] hover:brightness-90 disabled:opacity-50">
                            <DocumentArrowDownIcon className="w-5 h-5" />
                            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="printable-container">
                 <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden printable-area">
                    <div className="p-4 sm:p-6">
                         <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Student Contacts</h3>
                         <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Showing {filteredStudents.length} students from <span className="font-medium">{courseName}</span>
                         </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">#</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Student ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Email</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Phone Number</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student, index) => (
                                        <tr key={student.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{student.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.staffId}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{student.phoneNumber}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                            No students found for the selected {courseLabel.toLowerCase()}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};