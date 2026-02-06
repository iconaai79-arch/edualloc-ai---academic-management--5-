import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Subject, User, Priority, TimetableSettings, AllocationRequestPreferences, Course } from './types';
import { generateBulkJustification } from './services/geminiService';
import { SparklesIcon } from './components/icons/SparklesIcon';

interface RequestModalProps {
  subjects: Subject[];
  user: User;
  courses: Course[];
  timetableSettings: TimetableSettings;
  onClose: () => void;
  onSubmit: (justification: string, signatureUrl: string | null, priority: Priority, preferences: AllocationRequestPreferences, courseLevelSelections: Record<string, string[]>) => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({ subjects, user, courses, timetableSettings, onClose, onSubmit }) => {
  const [justification, setJustification] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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
    subjects.forEach(subject => {
      const associated: { courseName: string, levelId: string, levelName: string }[] = [];
      courses.forEach(course => {
        if (course.departmentId === subject.departmentId) {
          course.levels.forEach(level => {
            if (level.subjectIds.includes(subject.id)) {
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

    return subjects.reduce((total, subject) => total + calculateTotalPeriods(subject), 0);
  }, [subjects]);

  const minWeeklyPeriods = timetableSettings.minWeeklyPeriods || 0;
  const isBelowMinimum = totalSelectedPeriods < minWeeklyPeriods;

  const getCanvasContext = () => canvasRef.current?.getContext('2d');

  const handleDayChange = (day: string) => {
    setPreferences(prev => {
        const newDays = prev.preferredDays?.includes(day as any)
            ? prev.preferredDays.filter(d => d !== day)
            : [...(prev.preferredDays || []), day as any];
        return { ...prev, preferredDays: newDays };
    });
  };

  const handleTimeSlotChange = (slot: 'Morning' | 'Afternoon') => {
    setPreferences(prev => {
        const newSlots = prev.preferredTimeSlots?.includes(slot)
            ? prev.preferredTimeSlots.filter(s => s !== slot)
            : [...(prev.preferredTimeSlots || []), slot];
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
        ctx.strokeStyle = '#334155'; // slate-700
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
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
    setIsGenerating(true);
    const generatedText = await generateBulkJustification(user, subjects);
    setJustification(generatedText);
    setIsGenerating(false);
  }, [user, subjects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const signatureUrl = hasSigned && canvasRef.current
      ? canvasRef.current.toDataURL('image/png')
      : null;
    onSubmit(justification, signatureUrl, priority, preferences, courseLevelSelections);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Request Multiple Subjects</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            You are requesting to be allocated the following {subjects.length} subject(s):
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 overflow-y-auto">
            <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                {subjects.map(s => {
                    const levels = subjectCourseLevels.get(s.id) || [];
                    const isExpanded = expandedSubjectId === s.id;
                    const selectedCount = (courseLevelSelections[s.id] || []).length;
                    return (
                        <div key={s.id} className="bg-white dark:bg-slate-700 p-2 rounded">
                            <button type="button" onClick={() => setExpandedSubjectId(isExpanded ? null : s.id)} className="w-full text-left flex justify-between items-center">
                                <div>
                                    <span className="font-semibold">{s.code}</span> - {s.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedCount > 0 && <span className="text-xs font-bold text-white bg-indigo-500 rounded-full px-2 py-0.5">{selectedCount} selected</span>}
                                    <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                                    <p className="text-xs font-semibold mb-1">Select classes to request:</p>
                                    {levels.length > 0 ? (
                                        <div className="space-y-1">
                                            {levels.map(level => (
                                                <label key={level.levelId} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={courseLevelSelections[s.id]?.includes(level.levelId) || false}
                                                        onChange={() => handleLevelSelectionChange(s.id, level.levelId)}
                                                        className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                                    />
                                                    {level.courseName} - {level.levelName}
                                                </label>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-slate-500 italic">No specific classes found for this subject.</p>}
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
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Submit {subjects.length} Request(s)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};