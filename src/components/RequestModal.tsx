
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Subject, User, Priority, TimetableSettings, AllocationRequestPreferences, Course } from '../types';
import { generateBulkJustification } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface RequestModalProps {
  subjects: Subject[];
  user: User;
  courses: Course[];
  timetableSettings: TimetableSettings;
  onClose: () => void;
  onSubmit: (justification: string, signatureUrl: string | null, priority: Priority, preferences: AllocationRequestPreferences, courseLevelSelections: Record<string, string[]>) => Promise<any> | void;
}

export const RequestModal: React.FC<RequestModalProps> = ({ subjects = [], user, courses = [], timetableSettings, onClose, onSubmit }) => {
  const [justification, setJustification] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priority, setPriority] = useState<Priority>('Medium');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [preferences, setPreferences] = useState<AllocationRequestPreferences>({
    preferredDays: [],
    preferredTimeSlots: [],
  });
  const [courseLevelSelections, setCourseLevelSelections] = useState<Record<string, string[]>>({});
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const subjectCourseLevels = useMemo(() => {
    const map = new Map<string, { courseName: string, levelId: string, levelName: string }[]>();
    (subjects || []).forEach(subject => {
      const associated: { courseName: string, levelId: string, levelName: string }[] = [];
      (courses || []).forEach(course => {
        if (course.departmentId === subject.departmentId) {
          (course.levels || []).forEach(level => {
            if (level.subjectIds?.includes(subject.id)) {
              associated.push({ courseName: course.name, levelId: level.id, levelName: level.name });
            }
          });
        }
      });
      map.set(subject.id, associated);
    });
    return map;
  }, [subjects, courses]);
  
  const handleLevelSelectionChange = (subjectId: string, levelId: string) => {
    setCourseLevelSelections(prev => {
        const currentSelection = prev[subjectId] || [];
        const newSelection = currentSelection.includes(levelId)
            ? currentSelection.filter(id => id !== levelId)
            : [...currentSelection, levelId];
        return { ...prev, [subjectId]: newSelection };
    });
  };

  const totalSelectedPeriods = useMemo(() => {
    const calculateTotalPeriods = (subject: Subject): number => {
      if (!subject.lessonStructure) return 0;
      return subject.lessonStructure.reduce((sum, s) => sum + (s.periods * s.count), 0);
    };

    return (subjects || []).reduce((total, subject) => total + calculateTotalPeriods(subject), 0);
  }, [subjects]);

  const minWeeklyPeriods = timetableSettings?.minWeeklyPeriods || 0;
  const isBelowMinimum = totalSelectedPeriods < minWeeklyPeriods;

  const getCanvasContext = () => canvasRef.current?.getContext('2d');

  const handleDayChange = (day: string) => {
    setPreferences(prev => {
        const currentDays = prev.preferredDays || [];
        const newDays = currentDays.includes(day as any)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day as any];
        return { ...prev, preferredDays: newDays };
    });
  };

  const handleTimeSlotChange = (slot: 'Morning' | 'Afternoon') => {
    setPreferences(prev => {
        const currentSlots = prev.preferredTimeSlots || [];
        const newSlots = currentSlots.includes(slot)
            ? currentSlots.filter(s => s !== slot)
            : [...currentSlots, slot];
        return { ...prev, preferredTimeSlots: newSlots };
    });
  };

  const getCoordinates = (event: MouseEvent | TouchEvent): { x: number, y: number } | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    if (event.touches && event.touches.length > 0) {
        const touch = event.touches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return null;
  };

  const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;
    
    const ctx = getCanvasContext();
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        setIsDrawing(true);
        if (!hasSigned) setHasSigned(true);
    }
  }, [hasSigned]);

  const draw = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;
    
    const ctx = getCanvasContext();
    if (ctx) {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseleave', stopDrawing);
        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  const handleGenerate = useCallback(async () => {
    if ((subjects || []).length === 0) return;
    setIsGenerating(true);
    const generatedText = await generateBulkJustification(user, subjects);
    setJustification(generatedText);
    setIsGenerating(false);
  }, [user, subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const signatureUrl = hasSigned && canvasRef.current
      ? canvasRef.current.toDataURL('image/png')
      : null;
    try {
        await onSubmit(justification, signatureUrl, priority, preferences, courseLevelSelections);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Bulk Unit Application</h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applying for {(subjects || []).length} units</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <XIcon className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-8 overflow-y-auto space-y-6">
            <div className="space-y-2 bg-slate-100 dark:bg-slate-950 p-4 rounded-3xl border shadow-inner">
                {(subjects || []).map(s => {
                    const levels = subjectCourseLevels.get(s.id) || [];
                    const isExpanded = expandedSubjectId === s.id;
                    const selectedCount = (courseLevelSelections[s.id] || []).length;
                    return (
                        <div key={s.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:border-indigo-200">
                            <button type="button" onClick={() => setExpandedSubjectId(isExpanded ? null : s.id)} className="w-full text-left flex justify-between items-center">
                                <div className="min-w-0">
                                    <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase font-mono">{s.code}</span>
                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate uppercase tracking-tight">{s.name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedCount > 0 && <span className="text-[10px] font-black text-white bg-indigo-600 rounded-lg px-2 py-0.5 shadow-sm">{selectedCount} Selected</span>}
                                    <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-fade-in">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                        <p className="text-[9px] font-black uppercase text-indigo-600 tracking-widest mb-1.5">Target Registry Context</p>
                                        {levels.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {levels.map(level => (
                                                    <label key={level.levelId} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${courseLevelSelections[s.id]?.includes(level.levelId) ? 'border-indigo-600 bg-white' : 'border-transparent hover:bg-white/50'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={courseLevelSelections[s.id]?.includes(level.levelId) || false}
                                                            onChange={() => handleLevelSelectionChange(s.id, level.levelId)}
                                                            className="h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                                                        />
                                                        <div className="min-w-0">
                                                            <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase truncate block leading-none">{level.courseName}</span>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{level.levelName}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 opacity-50">
                                                <InformationCircleIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                                                <p className="text-[10px] font-bold uppercase text-slate-500">No stream links detected</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="mt-4 p-3 rounded-md bg-slate-100 dark:bg-slate-700">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Workload Summary</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Total weekly periods for selected subjects: <span className="font-bold">{totalSelectedPeriods}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    (Minimum required by institution: {minWeeklyPeriods} periods)
                </p>
                {isBelowMinimum && (
                    <div className="mt-2 p-2 text-center text-sm font-semibold bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-md">
                        Warning: Your selected workload is below the minimum requirement.
                    </div>
                )}
            </div>

            <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Scheduling Preferences <span className="text-xs text-slate-400">(Optional)</span>
                </label>
                <div className="mt-2 space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                <div>
                    <p className="text-xs font-semibold">Preferred Day(s)</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                    {timetableSettings.operatingDays.map(day => (
                        <label key={day} className="flex items-center space-x-2 text-sm">
                        <input
                            type="checkbox"
                            checked={preferences.preferredDays?.includes(day)}
                            onChange={() => handleDayChange(day)}
                            className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <span>{day.substring(0,3)}</span>
                        </label>
                    ))}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-semibold">Preferred Time Slot(s)</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                    {(['Morning', 'Afternoon'] as const).map(slot => (
                        <label key={slot} className="flex items-center space-x-2 text-sm">
                            <input
                                type="checkbox"
                                checked={preferences.preferredTimeSlots?.includes(slot)}
                                onChange={() => handleTimeSlotChange(slot)}
                                className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            />
                            <span>{slot}</span>
                        </label>
                    ))}
                    </div>
                </div>
                </div>
            </div>
            
            <div className="mt-4">
              <label htmlFor="priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="mt-4">
              <label htmlFor="justification" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Justification <span className="text-xs text-slate-400">(Optional - will be applied to all requests)</span>
              </label>
              <div className="mt-1">
                <textarea
                  id="justification"
                  name="justification"
                  rows={4}
                  className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why you are a good fit for these subjects..."
                ></textarea>
              </div>
            </div>

            <div className="mt-4">
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                >
                    <SparklesIcon className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Generating...' : 'Generate with AI'}
                </button>
            </div>

             <div className="mt-4">
              <label htmlFor="signature" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Signature <span className="text-xs text-slate-400">(Optional)</span>
              </label>
              <div className="mt-1 relative">
                <canvas
                    ref={canvasRef}
                    width="450"
                    height="150"
                    className="w-full h-auto bg-slate-100 dark:bg-slate-700 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-crosshair touch-none"
                ></canvas>
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:brightness-125"
              >
                Clear Signature
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : `Submit ${subjects.length} Request(s)`}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .form-input, .form-select { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
        .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
        .form-input:focus, .form-select:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
      `}</style>
    </div>
  );
};

