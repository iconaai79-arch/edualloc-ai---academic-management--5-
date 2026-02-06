
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Subject, User, Priority, TimetableSettings, AllocationRequestPreferences, Course } from '../types';
import { generateBulkJustification } from '../services/geminiService';
import { SparklesIcon, XIcon, CheckCircleIcon, PlusIcon, ChevronDownIcon, InformationCircleIcon, ArrowPathIcon } from './icons/index.ts';

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
        const hasUnit = (course.levels || []).some(l => (l.subjectIds || []).includes(subject.id));
        if (hasUnit) {
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
    const touch = event instanceof MouseEvent ? event : event.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
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

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

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
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Bulk Unit Application</h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applying for {(subjects || []).length} items in registry</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <XIcon className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
            {/* Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="p-5 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800">
                        <div className="flex justify-between items-end mb-2">
                            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">Workload Profile</h4>
                            <span className={`px-3 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${isBelowMinimum ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {totalSelectedPeriods} / {minWeeklyPeriods} Periods
                            </span>
                        </div>
                        {isBelowMinimum && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-100">
                                <InformationCircleIcon className="w-4 h-4 text-red-600" />
                                <p className="text-[10px] font-bold text-red-700 uppercase tracking-tighter leading-tight">Below institutional minimum requirement.</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Priority Weight</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="form-select-clean">
                            <option value="Low">Low - Desired</option>
                            <option value="Medium">Medium - Standard</option>
                            <option value="High">High - Critical</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Scheduling Preferences</label>
                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Preferred Days</p>
                            <div className="flex flex-wrap gap-1.5">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => {
                                    const fullDay = day === 'Mon' ? 'Monday' : day === 'Tue' ? 'Tuesday' : day === 'Wed' ? 'Wednesday' : day === 'Thu' ? 'Thursday' : 'Friday';
                                    const isSelected = preferences.preferredDays?.includes(fullDay as any);
                                    return (
                                        <button key={day} type="button" onClick={() => handleDayChange(fullDay)} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-slate-600'}`}>
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Time Preference</p>
                            <div className="flex gap-2">
                                {(['Morning', 'Afternoon'] as const).map(slot => (
                                    <button key={slot} type="button" onClick={() => handleTimeSlotChange(slot)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${preferences.preferredTimeSlots?.includes(slot) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-slate-600'}`}>
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Context Selection ({subjects.length} Units)</label>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-[2.5rem] border shadow-inner max-h-64 overflow-y-auto no-scrollbar">
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
                                        {selectedCount > 0 && <span className="text-[10px] font-black text-white bg-indigo-600 rounded-lg px-2 py-0.5 shadow-sm">{selectedCount} Streams</span>}
                                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-fade-in">
                                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl">
                                            <p className="text-[9px] font-black uppercase text-indigo-600 tracking-widest mb-2">Target Registry Context</p>
                                            {levels.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {levels.map(level => (
                                                        <label key={level.levelId} className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${courseLevelSelections[s.id]?.includes(level.levelId) ? 'border-indigo-500 bg-white' : 'border-transparent hover:bg-white/50'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={courseLevelSelections[s.id]?.includes(level.levelId) || false}
                                                                onChange={() => handleLevelSelectionChange(s.id, level.levelId)}
                                                                className="h-4 w-4 rounded border-slate-200 text-indigo-600"
                                                            />
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-[10px] text-slate-700 dark:text-slate-200 uppercase truncate block leading-none">{level.courseName}</span>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{level.levelName}</span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 opacity-40">
                                                    <p className="text-[10px] font-bold uppercase">No specific stream links found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* AI & Justification */}
            <div className="space-y-4">
                <div className="flex justify-between items-end mb-1 ml-1">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Registry Justification</label>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline disabled:opacity-50"
                    >
                        <SparklesIcon className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Drafting...' : 'AI Assistant'}
                    </button>
                </div>
                <textarea
                    rows={3}
                    className="form-input-clean p-4 resize-none"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Briefly describe your competency for these units..."
                ></textarea>
            </div>

            {/* Signature */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Electronic Signature</label>
              <div className="relative group">
                <canvas
                    ref={canvasRef}
                    width="450"
                    height="150"
                    className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 cursor-crosshair touch-none transition-all group-hover:border-indigo-400"
                ></canvas>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="absolute top-3 right-3 p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary h-12 uppercase text-[10px] font-black tracking-widest bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] btn-primary h-12 uppercase text-[10px] font-black tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? 'Syncing...' : 'Commit Applications'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .form-select-clean { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #f8fafc; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 1rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
        .dark .form-select-clean { border-color: #334155; background-color: #0f172a; color: #fff; }
        
        .form-input-clean { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #f8fafc; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
        .dark .form-input-clean { border-color: #334155; background-color: #0f172a; color: white; }
        .form-input-clean:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
      `}</style>
    </div>
  );
};
