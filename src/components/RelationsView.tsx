import React, { useState, useEffect } from 'react';
import type { User, Subject, Course, Department, AllocationRequest } from '../types';

interface RelationsViewProps {
    lecturers: User[];
    subjects: Subject[];
    courses: Course[];
    departments: Department[];
    allocations: AllocationRequest[];
}

type RelationMode = 'lecturer' | 'course' | 'department';

export const RelationsView: React.FC<RelationsViewProps> = ({ lecturers, subjects, courses, departments, allocations }) => {
    const [mode, setMode] = useState<RelationMode>('lecturer');
    const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

    useEffect(() => {
        if (lecturers.length > 0 && !selectedLecturerId) {
            setSelectedLecturerId(lecturers[0].id);
        }
    }, [lecturers, selectedLecturerId]);

    useEffect(() => {
        if (courses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(courses[0].id);
        }
    }, [courses, selectedCourseId]);

    useEffect(() => {
        if (departments.length > 0 && !selectedDepartmentId) {
            setSelectedDepartmentId(departments[0].id);
        }
    }, [departments, selectedDepartmentId]);

    const renderLecturerRelations = () => {
        const lecturer = lecturers.find(l => l.id === selectedLecturerId);
        if (!lecturer) return <p className="text-slate-500 dark:text-slate-400">Select a lecturer to see their relations.</p>;

        const allocatedSubjectIds = new Set(
            allocations.filter(a => a.lecturerId === lecturer.id).map(a => a.subjectId)
        );
        const allocatedSubjects = subjects.filter(s => allocatedSubjectIds.has(s.id));

        return (
            <div>
                <h4 className="text-lg font-semibold">{lecturer.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Expertise: {lecturer.expertise?.join(', ')}</p>
                <div className="mt-4">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200">Allocated Subjects ({allocatedSubjects.length})</h5>
                    {allocatedSubjects.length > 0 ? (
                        <ul className="mt-2 list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                            {allocatedSubjects.map(s => <li key={s.id}>{s.name} ({s.code})</li>)}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">No subjects allocated.</p>
                    )}
                </div>
            </div>
        );
    };

    const renderCourseRelations = () => {
        const course = courses.find(c => c.id === selectedCourseId);
        if (!course) return <p className="text-slate-500 dark:text-slate-400">Select a course to see its structure.</p>;
        
        return (
            <div>
                <h4 className="text-lg font-semibold">{course.name} ({course.code})</h4>
                <div className="mt-4 space-y-4">
                    {course.levels.length > 0 ? course.levels.map(level => (
                        <div key={level.id}>
                            <h5 className="font-semibold text-slate-800 dark:text-slate-200">{level.name}</h5>
                            {level.subjectIds.length > 0 ? (
                                <ul className="mt-2 list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                                    {level.subjectIds.map(subId => {
                                        const subject = subjects.find(s => s.id === subId);
                                        return subject ? <li key={subId}>{subject.name} ({subject.code})</li> : null;
                                    })}
                                </ul>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">No subjects assigned to this level.</p>
                            )}
                        </div>
                    )) : (
                         <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">No levels defined for this course.</p>
                    )}
                </div>
            </div>
        );
    };

    const renderDepartmentRelations = () => {
        const department = departments.find(d => d.id === selectedDepartmentId);
        if (!department) return <p className="text-slate-500 dark:text-slate-400">Select a department to see its staff and subjects.</p>;

        const departmentLecturers = lecturers.filter(l => l.departmentId === department.id);
        const departmentSubjects = subjects.filter(s => s.departmentId === department.id);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200">Staff ({departmentLecturers.length})</h5>
                     {departmentLecturers.length > 0 ? (
                        <ul className="mt-2 list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                            {departmentLecturers.map(l => <li key={l.id}>{l.name} ({l.role})</li>)}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">No staff in this department.</p>
                    )}
                </div>
                <div>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200">Subjects ({departmentSubjects.length})</h5>
                     {departmentSubjects.length > 0 ? (
                        <ul className="mt-2 list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                            {departmentSubjects.map(s => <li key={s.id}>{s.name} ({s.code})</li>)}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">No subjects in this department.</p>
                    )}
                </div>
            </div>
        );
    };

    const renderSelector = () => {
        switch (mode) {
            case 'lecturer':
                return (
                    <select
                        value={selectedLecturerId}
                        onChange={e => setSelectedLecturerId(e.target.value)}
                        className="input-field"
                        aria-label="Select Lecturer"
                    >
                        {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                );
            case 'course':
                return (
                    <select
                        value={selectedCourseId}
                        onChange={e => setSelectedCourseId(e.target.value)}
                        className="input-field"
                        aria-label="Select Course"
                    >
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                );
            case 'department':
                 return (
                    <select
                        value={selectedDepartmentId}
                        onChange={e => setSelectedDepartmentId(e.target.value)}
                        className="input-field"
                        aria-label="Select Department"
                    >
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <style>{`.input-field {
                shadow-sm appearance-none border rounded w-full py-2 px-3 text-slate-700 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600
            }`}</style>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4" role="tablist" aria-label="Relation Type">
                    <button onClick={() => setMode('lecturer')} role="tab" aria-selected={mode === 'lecturer'} className={`px-3 py-1.5 rounded-md text-sm font-medium ${mode === 'lecturer' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>By Lecturer</button>
                    <button onClick={() => setMode('course')} role="tab" aria-selected={mode === 'course'} className={`px-3 py-1.5 rounded-md text-sm font-medium ${mode === 'course' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>By Course</button>
                    <button onClick={() => setMode('department')} role="tab" aria-selected={mode === 'department'} className={`px-3 py-1.5 rounded-md text-sm font-medium ${mode === 'department' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>By Department</button>
                </div>
                <div className="w-full sm:w-72">
                    {renderSelector()}
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm min-h-[20rem]">
                {mode === 'lecturer' && renderLecturerRelations()}
                {mode === 'course' && renderCourseRelations()}
                {mode === 'department' && renderDepartmentRelations()}
            </div>
        </div>
    );
};
