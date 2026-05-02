import React, { useState, useMemo } from 'react';
import type { PracticeTeacherAssignment, User } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';


interface TeachingPracticeManagerProps {
    assignments: PracticeTeacherAssignment[];
    users: User[];
    currentUser: User;
    onAdd: (data: Omit<PracticeTeacherAssignment, 'id' | 'institutionId' | 'status'>) => void;
    onDelete: (assignmentId: string) => void;
}

export const TeachingPracticeManager: React.FC<TeachingPracticeManagerProps> = ({
    assignments,
    users,
    currentUser,
    onAdd,
    onDelete,
}) => {
    const [lecturerId, setLecturerId] = useState('');
    const [practiceTeacherId, setPracticeTeacherId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { visibleLecturers, practiceTeachers } = useMemo(() => {
        const allLecturers = users.filter(u => u.role === 'lecturer');
        const filteredPracticeTeachers = users.filter(u => u.role === 'practice_teacher');

        if (currentUser.role === 'hod' && currentUser.departmentId) {
            return {
                visibleLecturers: allLecturers.filter(l => l.departmentId === currentUser.departmentId),
                practiceTeachers: filteredPracticeTeachers
            };
        }
        return { visibleLecturers: allLecturers, practiceTeachers: filteredPracticeTeachers };
    }, [users, currentUser]);

    const assignmentsForView = useMemo(() => {
        if (currentUser.role === 'hod' && currentUser.departmentId) {
            const lecturerIdsInDept = new Set(visibleLecturers.map(l => l.id));
            return assignments.filter(a => lecturerIdsInDept.has(a.lecturerId));
        }
        return assignments;
    }, [assignments, currentUser, visibleLecturers]);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lecturerId || !practiceTeacherId || !startDate || !endDate) {
            alert('Please fill all fields.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date cannot be after end date.');
            return;
        }
        onAdd({ lecturerId, practiceTeacherId, startDate, endDate });
        // Reset form
        setLecturerId('');
        setPracticeTeacherId('');
        setStartDate('');
        setEndDate('');
    };
    
    return (
        <div className="space-y-6">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-danger { padding: 0.25rem 0.5rem; background-color: #ef4444; color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
            `}</style>
            <section>
                <h3 className="text-xl font-semibold mb-4">Assign a Practice Teacher</h3>
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Lecturer</label>
                            <select value={lecturerId} onChange={e => setLecturerId(e.target.value)} required className="mt-1 form-select">
                                <option value="" disabled>Select Lecturer</option>
                                {visibleLecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Practice Teacher</label>
                            <select value={practiceTeacherId} onChange={e => setPracticeTeacherId(e.target.value)} required className="mt-1 form-select">
                                <option value="" disabled>Select Practice Teacher</option>
                                {practiceTeachers.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 form-input"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="mt-1 form-input"/>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="btn-primary inline-flex items-center gap-2">
                            <PlusIcon className="w-5 h-5"/> Assign
                        </button>
                    </div>
                </form>
            </section>
            <section>
                <h3 className="text-xl font-semibold mb-4">Current & Past Assignments</h3>
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Lecturer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Practice Teacher</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {assignmentsForView.map(assignment => (
                                <tr key={assignment.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{userMap.get(assignment.lecturerId) || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{userMap.get(assignment.practiceTeacherId) || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{assignment.startDate} to {assignment.endDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${assignment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                            {assignment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => onDelete(assignment.id)} className="btn-danger"><XIcon className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

