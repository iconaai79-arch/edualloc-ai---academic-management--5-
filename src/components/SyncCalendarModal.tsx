
import React, { useState } from 'react';
import type { TimetableEntry, User, Semester, Subject, Room, Building } from '../types';
import { XIcon } from './icons/XIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';

import { generateIcsContent } from '../utils/calendarUtils';

interface SyncCalendarModalProps {
    onClose: () => void;
    timetableEntries: TimetableEntry[];
    user: User;
    activeSemester: Semester;
    getSubjectById: (id: string) => Subject | undefined;
    getRoomById: (id: string) => Room | undefined;
    buildings: Building[];
}

export const SyncCalendarModal: React.FC<SyncCalendarModalProps> = ({ onClose, timetableEntries, user, activeSemester, getSubjectById, getRoomById, buildings }) => {
    const [activeTab, setActiveTab] = useState('google');

    const handleDownload = () => {
        const icsContent = generateIcsContent(timetableEntries, user, activeSemester, getSubjectById, getRoomById, buildings);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'My_Timetable.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sync Timetable to External Calendar</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6"/></button>
                </div>
                
                <div className="p-6 flex-grow overflow-y-auto">
                    <div className="bg-sky-50 dark:bg-sky-900/50 p-4 rounded-lg">
                        <p className="text-sm text-sky-800 dark:text-sky-200">
                            This will download an <strong>.ics file</strong> containing your scheduled classes for the current semester ({activeSemester.name}). You can then import this file into your preferred calendar application.
                        </p>
                        <button onClick={handleDownload} className="mt-4 btn-primary inline-flex items-center gap-2">
                            <DocumentArrowDownIcon className="w-5 h-5"/>
                            Download .ics File
                        </button>
                    </div>

                    <div className="mt-6">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">How to Import</h4>
                        <div className="mt-2 border-b border-slate-200 dark:border-slate-700">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveTab('google')} className={`${activeTab === 'google' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Google Calendar</button>
                                <button onClick={() => setActiveTab('outlook')} className={`${activeTab === 'outlook' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Outlook Calendar</button>
                            </nav>
                        </div>

                        <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
                            {activeTab === 'google' && (
                                <ol>
                                    <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">Google Calendar</a> on your computer.</li>
                                    <li>In the top right, click <strong>Settings (&#9881;)</strong>.</li>
                                    <li>In the menu on the left, click <strong>Import & export</strong>.</li>
                                    <li>Click <strong>Select file from your computer</strong> and select the downloaded <strong>My_Timetable.ics</strong> file.</li>
                                    <li>Choose which calendar to add the events to. By default, events are imported into your primary calendar.</li>
                                    <li>Click <strong>Import</strong>.</li>
                                </ol>
                            )}
                            {activeTab === 'outlook' && (
                                <ol>
                                    <li>Open <a href="https://outlook.live.com/calendar/" target="_blank" rel="noopener noreferrer">Outlook Calendar</a> on the web.</li>
                                    <li>At the bottom of the navigation pane, select <strong>Calendar</strong>.</li>
                                    <li>In the navigation pane, select <strong>Add calendar</strong>.</li>
                                    <li>Select <strong>Upload from file</strong>.</li>
                                    <li>Select <strong>Browse</strong>, choose the downloaded <strong>My_Timetable.ics</strong> file, and then select <strong>Open</strong>.</li>
                                    <li>Select a calendar from the dropdown list to import to.</li>
                                    <li>Select <strong>Import</strong>.</li>
                                </ol>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 flex justify-end">
                    <button onClick={onClose} className="btn-secondary">Close</button>
                </div>
            </div>
             <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; } .btn-primary:hover { filter: brightness(0.9); }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; } .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                .prose ol { list-style-type: decimal; padding-left: 1.5rem; }
                .prose li { margin-top: 0.5em; }
                .prose a { color: #0284c7; text-decoration: underline; } .dark .prose a { color: #38bdf8; }
            `}</style>
        </div>
    );
};

