
import React, { useState } from 'react';
import type { User, TimetableEntry, Subject, StudentAttendance, StudentAbsenceRequest } from '../types';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/index';

interface AttendanceTakerModalProps {
  lesson: TimetableEntry;
  subject?: Subject;
  students: User[];
  initialAttendance: StudentAttendance[];
  onClose: () => void;
  onSave: (timetableEntryId: string, attendanceData: { studentId: string; status: 'present' | 'absent' | 'late' }[]) => void;
  currentUser: User;
  studentAbsences: StudentAbsenceRequest[];
}

export const AttendanceTakerModal: React.FC<AttendanceTakerModalProps> = ({ onClose, lesson, subject, students, initialAttendance, onSave }) => {
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>(() => {
    const initial: Record<string, 'present' | 'absent' | 'late'> = {};
    students.forEach(s => {
      const existing = initialAttendance.find(a => a.studentId === s.id);
      initial[s.id] = existing ? existing.status : 'present';
    });
    return initial;
  });

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = () => {
    const data = Object.entries(attendance).map(([studentId, status]) => ({
      studentId,
      status
    }));
    onSave(lesson.id, data);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Take Attendance</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {subject?.name} • {lesson.startTime} - {lesson.endTime}
            </p>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-3">
            {students.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No students enrolled</p>
              </div>
            ) : (
              students.map(student => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:border-indigo-200">
                      <UserIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{student.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.email}</p>
                    </div>
                  </div>

                  <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    {(['present', 'absent', 'late'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(student.id, status)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${attendance[student.id] === status
                            ? status === 'present' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' :
                              status === 'absent' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' :
                                'bg-amber-500 text-white shadow-lg shadow-amber-100'
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={students.length === 0}
            className="flex-1 h-12 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            Confirm & Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
};
