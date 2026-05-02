import React, { useState, useEffect, useMemo } from 'react';
import type { User, TimetableEntry, Subject, ObservationNote } from '../types';

interface JoinedLessonsManagerProps {
    user: User;
    joinedLessons: TimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    observationNotes: ObservationNote[];
    onSaveObservationNote: (noteData: Omit<ObservationNote, 'id' | 'timestamp' | 'institutionId'>) => void;
}

const LessonNoteCard: React.FC<{
    lesson: TimetableEntry;
    subject?: Subject;
    lecturer?: User;
    note?: ObservationNote;
    onSave: (notes: string) => void;
}> = ({ lesson, subject, lecturer, note, onSave }) => {
    const [notes, setNotes] = useState(note?.notes || '');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Debounced save
    useEffect(() => {
        if (notes === (note?.notes || '')) {
            return; // No change, don't trigger save
        }
        setSaveStatus('saving');
        const handler = setTimeout(() => {
            onSave(notes);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 1500); // Save after 1.5s of inactivity

        return () => {
            clearTimeout(handler);
        };
    }, [notes, onSave, note?.notes]);

    return (
        <li className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-4">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{subject?.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {lesson.day}, {lesson.startTime} - {lesson.endTime} with {lecturer?.name}
                    </p>
                </div>
                <div className="text-xs font-semibold">
                    {saveStatus === 'saving' && <span className="text-yellow-500">Saving...</span>}
                    {saveStatus === 'saved' && <span className="text-green-500">Saved!</span>}
                </div>
            </div>
            <div className="mt-4">
                <label htmlFor={`notes-${lesson.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Observation Notes
                </label>
                <textarea
                    id={`notes-${lesson.id}`}
                    rows={4}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="mt-1 shadow-sm block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    placeholder="Enter your notes for this lesson..."
                />
            </div>
        </li>
    );
};

export const JoinedLessonsManager: React.FC<JoinedLessonsManagerProps> = ({ user, joinedLessons, getSubjectById, getLecturerById, observationNotes, onSaveObservationNote }) => {
    const sortedLessons = useMemo(() => {
        return [...joinedLessons].sort((a, b) => {
            const dateA = new Date(`1970/01/01 ${a.startTime}`);
            const dateB = new Date(`1970/01/01 ${b.startTime}`);
            const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            if (dayOrder.indexOf(a.day) !== dayOrder.indexOf(b.day)) {
                return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            }
            return dateA.getTime() - dateB.getTime();
        });
    }, [joinedLessons]);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">Joined Lessons Manager</h3>
            <p className="text-slate-500 dark:text-slate-400">
                Here you can view all lessons shared with you and add your observation notes. Notes are saved automatically as you type.
            </p>
            {sortedLessons.length > 0 ? (
                <ul className="space-y-4">
                    {sortedLessons.map(lesson => (
                        <LessonNoteCard
                            key={lesson.id}
                            lesson={lesson}
                            subject={getSubjectById(lesson.subjectId)}
                            lecturer={getLecturerById(lesson.lecturerId)}
                            note={observationNotes.find(n => n.timetableEntryId === lesson.id && n.practiceTeacherId === user.id)}
                            onSave={(notes) => onSaveObservationNote({
                                timetableEntryId: lesson.id,
                                practiceTeacherId: user.id,
                                notes,
                            })}
                        />
                    ))}
                </ul>
            ) : (
                 <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400">No lessons have been shared with you yet.</p>
                </div>
            )}
        </div>
    );
};

