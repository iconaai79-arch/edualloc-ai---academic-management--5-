import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Course, Room, Subject, TimetableEntry, TimetableSettings, User } from '../types';
import { apiService } from '../services/apiService';

export interface LessonAttendanceRecord {
  id: string;
  institutionId: string;
  date: string; // YYYY-MM-DD
  day: string; // Monday..Friday
  period: number; // 1-based
  timetableSlotId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  scheduledTeacherId: string;
  scheduledTeacherName: string;
  actualTeacherId: string;
  actualTeacherName: string;
  isSubstitute?: boolean;
  scheduledStart: string; // HH:mm
  scheduledEnd: string;   // HH:mm
  checkInAt?: string;     // ISO timestamp
  checkOutAt?: string;    // ISO timestamp
  minutesLate?: number;
  actualMinutes?: number;
  topicCovered?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'LATE' | 'LEFT_EARLY' | 'MISSED' | 'UNCLOSED';
  qrToken: string;
}

export interface PlannedLessonTopic {
  id: string;
  institutionId: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  day: string;
  period: number;
  topic: string;
  notes?: string;
  updatedAt: string;
}

interface AscTimetableLessonAttendanceManagerProps {
  institutionId: string;
  institutionName?: string;
  currentUser?: User;
  mode?: 'admin' | 'teacher';
  entries: TimetableEntry[];
  courses: Course[];
  subjects: Subject[];
  lecturers: User[];
  rooms: Room[];
  timetableSettings?: TimetableSettings;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const toMinutes = (hhmm: string): number => {
  const [h, m] = (hhmm || '08:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime = (iso?: string): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const getDayNameForDate = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const idx = dt.getDay(); // 0=Sun..6=Sat
    if (idx >= 1 && idx <= 5) return DAYS[idx - 1];
    return 'Monday';
  } catch {
    return 'Monday';
  }
};

const buildClassQrToken = (institutionId: string, classId: string) =>
  `tt_class_qr:${institutionId || 'school'}:${classId}`;

const parseClassQrToken = (raw: string): { institutionId?: string; classId?: string } | null => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('tt_class_qr:')) {
    const parts = trimmed.split(':');
    if (parts.length >= 3) {
      return { institutionId: parts[1], classId: parts.slice(2).join(':') };
    }
  }
  return null;
};

export const AscTimetableLessonAttendanceManager: React.FC<AscTimetableLessonAttendanceManagerProps> = ({
  institutionId,
  institutionName = 'SCHOOL',
  currentUser,
  mode = 'admin',
  entries,
  courses,
  subjects,
  lecturers,
  rooms,
  timetableSettings,
}) => {
  const instKey = institutionId || 'default';
  const attendanceStorageKey = `eduai_tt_lesson_attendance_${instKey}`;
  const topicsStorageKey = `eduai_tt_planned_topics_${instKey}`;

  const [activeSubTab, setActiveSubTab] = useState<'live' | 'scanner' | 'topics' | 'qr_posters' | 'reports'>(
    mode === 'teacher' ? 'scanner' : 'live'
  );

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const selectedDay = useMemo(() => getDayNameForDate(selectedDate), [selectedDate]);

  // Load bell times from localStorage (configured in School tab) or fallback
  const periodBells = useMemo(() => {
    try {
      const raw = localStorage.getItem(`eduai_asc_school_settings_${instKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.bellTimes)) {
          const teachingBells = parsed.bellTimes.filter((b: any) => !b.isBreak);
          if (teachingBells.length > 0) {
            return teachingBells.map((b: any, idx: number) => ({
              period: idx + 1,
              name: b.name || `Period ${idx + 1}`,
              start: b.start || '08:00',
              end: b.end || '08:40',
            }));
          }
        }
      }
    } catch (_) {}
    const slots = timetableSettings?.timeSlots || [
      '08:00 - 08:40', '08:40 - 09:20', '09:30 - 10:10', '10:10 - 10:50',
      '11:20 - 12:00', '12:00 - 12:40', '14:00 - 14:40', '14:40 - 15:20',
    ];
    return slots.map((slot, idx) => {
      const [s, e] = slot.split('-').map(p => p.trim());
      return { period: idx + 1, name: `Period ${idx + 1}`, start: s || '08:00', end: e || '08:40' };
    });
  }, [instKey, timetableSettings]);

  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (mode === 'teacher' && currentUser?.id) return currentUser.id;
    return lecturers[0]?.id || currentUser?.id || '';
  });

  // Persistent state: Attendance Records
  const [records, setRecords] = useState<LessonAttendanceRecord[]>(() => {
    try {
      const raw = localStorage.getItem(attendanceStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persistent state: Advance Planned Topics
  const [plannedTopics, setPlannedTopics] = useState<PlannedLessonTopic[]>(() => {
    try {
      const raw = localStorage.getItem(topicsStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persistRecords = (next: LessonAttendanceRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(attendanceStorageKey, JSON.stringify(next));
    } catch (_) {}
  };

  const persistTopics = (next: PlannedLessonTopic[]) => {
    setPlannedTopics(next);
    try {
      localStorage.setItem(topicsStorageKey, JSON.stringify(next));
    } catch (_) {}
  };

  // Lookups
  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => new Map(lecturers.map(l => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);

  // Normalize entries with 1-based period number
  const normalizedEntries = useMemo(() => {
    return (entries || []).map((e, idx) => {
      const periodNum = (() => {
        if (typeof (e as any).period === 'number') return (e as any).period;
        const tsIdx = (timetableSettings?.timeSlots || []).indexOf(e.timeSlot);
        if (tsIdx >= 0) return tsIdx + 1;
        const startStr = (e.timeSlot || '').split('-')[0]?.trim();
        const bellIdx = periodBells.findIndex(b => b.start === startStr);
        return bellIdx >= 0 ? bellIdx + 1 : (idx % periodBells.length) + 1;
      })();
      return {
        ...e,
        _period: periodNum,
        _slotId: e.id || `${e.day}_${periodNum}_${e.courseId}_${e.subjectId}`,
      };
    });
  }, [entries, periodBells, timetableSettings]);

  // Helper: Find pre-planned topic for a slot
  const getPlannedTopic = (teacherId: string, classId: string, subjectId: string, day: string, period: number) =>
    plannedTopics.find(
      t =>
        t.classId === classId &&
        t.subjectId === subjectId &&
        t.day === day &&
        t.period === period &&
        (!teacherId || t.teacherId === teacherId)
    ) ||
    plannedTopics.find(t => t.classId === classId && t.subjectId === subjectId && t.day === day);

  // ── QR SCANNER & CHECK-IN / CHECK-OUT STATE ──
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualQrInput, setManualQrInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isSubstituteMode, setIsSubstituteMode] = useState(false);

  // Check-Out Modal (Optional Topic Covered — pre-filled from Advance Topic Planner!)
  const [pendingCheckOut, setPendingCheckOut] = useState<{
    record: LessonAttendanceRecord;
    topicDraft: string;
    suggestedTopics: string[];
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (scanLoopRef.current) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  // Core Check-In / Check-Out processor for a scanned Class QR token
  const processClassQrScan = (rawToken: string, overridePeriod?: number, overrideTeacherId?: string) => {
    const parsed = parseClassQrToken(rawToken);
    let matchedClass = parsed?.classId ? courseMap.get(parsed.classId) : undefined;
    if (!matchedClass) {
      // Allow matching by raw classId or class name for convenience
      const lower = rawToken.trim().toLowerCase();
      matchedClass = courses.find(c => c.id.toLowerCase() === lower || (c.name || '').toLowerCase() === lower);
    }

    if (!matchedClass) {
      setScanFeedback({ type: 'error', text: `Unrecognized Class QR code: "${rawToken}". Please scan an official EduAI Class QR poster.` });
      return;
    }

    const activeTeacherId = overrideTeacherId || (mode === 'teacher' ? currentUser?.id : selectedTeacherId) || currentUser?.id || '';
    const activeTeacher = teacherMap.get(activeTeacherId) || currentUser;
    const periodToUse = overridePeriod || selectedPeriod;
    const bell = periodBells.find(b => b.period === periodToUse) || periodBells[0] || { period: periodToUse, start: '08:00', end: '08:40' };

    // 1. Check if this teacher already has an active IN_PROGRESS lesson in this class today -> Trigger CHECK-OUT!
    const activeSession = records.find(
      r =>
        r.date === selectedDate &&
        r.classId === matchedClass!.id &&
        r.actualTeacherId === activeTeacherId &&
        r.status === 'IN_PROGRESS'
    );

    if (activeSession) {
      const planned = getPlannedTopic(
        activeTeacherId,
        activeSession.classId,
        activeSession.subjectId,
        activeSession.day,
        activeSession.period
      );
      const relatedPlannedTopics = plannedTopics
        .filter(t => t.classId === activeSession.classId && t.subjectId === activeSession.subjectId && t.topic.trim())
        .map(t => t.topic.trim());

      setPendingCheckOut({
        record: activeSession,
        topicDraft: planned?.topic || activeSession.topicCovered || '',
        suggestedTopics: Array.from(new Set(relatedPlannedTopics)).slice(0, 5),
      });
      setScanFeedback({
        type: 'info',
        text: `End-of-lesson scan detected for ${matchedClass.name} (${activeSession.subjectCode}). Confirm Check-Out below.`,
      });
      return;
    }

    // 2. Otherwise -> Trigger CHECK-IN (Lesson Start)!
    // Find scheduled slot for this class + day + period (prefer matching teacher)
    const daySlots = normalizedEntries.filter(
      e => e.courseId === matchedClass!.id && e.day === selectedDay && e._period === periodToUse
    );
    const matchedSlot =
      daySlots.find(e => e.lecturerId === activeTeacherId) ||
      daySlots[0] ||
      normalizedEntries.find(e => e.courseId === matchedClass!.id && e.day === selectedDay);

    const subj = matchedSlot ? subjectMap.get(matchedSlot.subjectId) : subjects[0];
    const schedTeacher = matchedSlot ? teacherMap.get(matchedSlot.lecturerId) : activeTeacher;
    const isSub = isSubstituteMode || (!!matchedSlot && matchedSlot.lecturerId !== activeTeacherId);

    // Calculate lateness vs bell start time (if checking in on today's date)
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const schedStartMins = toMinutes(bell.start);
    const diffMins = selectedDate === todayIso ? Math.max(0, nowMins - schedStartMins) : 0;
    const minutesLate = diffMins > 5 && diffMins < 180 ? diffMins : 0;

    const planned = getPlannedTopic(
      activeTeacherId,
      matchedClass.id,
      subj?.id || '',
      selectedDay,
      periodToUse
    );

    const newRecord: LessonAttendanceRecord = {
      id: `tt_att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      institutionId: instKey,
      date: selectedDate,
      day: selectedDay,
      period: periodToUse,
      timetableSlotId: matchedSlot?._slotId || `${selectedDay}_P${periodToUse}_${matchedClass.id}`,
      classId: matchedClass.id,
      className: matchedClass.name,
      subjectId: subj?.id || 'general',
      subjectName: subj?.name || 'Scheduled Lesson',
      subjectCode: subj?.code || (subj?.name || 'LES').slice(0, 4).toUpperCase(),
      scheduledTeacherId: schedTeacher?.id || activeTeacherId,
      scheduledTeacherName: schedTeacher?.name || activeTeacher?.name || 'Teacher',
      actualTeacherId: activeTeacherId,
      actualTeacherName: activeTeacher?.name || 'Teacher',
      isSubstitute: isSub,
      scheduledStart: bell.start,
      scheduledEnd: bell.end,
      checkInAt: now.toISOString(),
      minutesLate,
      topicCovered: planned?.topic || '',
      status: 'IN_PROGRESS',
      qrToken: buildClassQrToken(instKey, matchedClass.id),
    };

    const next = [newRecord, ...records];
    persistRecords(next);
    apiService.saveModuleRecord('timetable_lesson_attendance', newRecord).catch(() => {});

    setScanFeedback({
      type: 'success',
      text: `✅ Checked IN to ${matchedClass.name} • ${newRecord.subjectCode} (Period ${periodToUse})${
        minutesLate > 0 ? ` — ${minutesLate}m late` : ' — On Time'
      }${planned?.topic ? ` • Planned topic ready: "${planned.topic}"` : ''}`,
    });
  };

  // Finalize Check-Out (with optional topic covered)
  const confirmCheckOut = (skipTopic = false) => {
    if (!pendingCheckOut) return;
    const now = new Date();
    const rec = pendingCheckOut.record;
    const startMs = rec.checkInAt ? new Date(rec.checkInAt).getTime() : now.getTime();
    const actualMinutes = Math.max(1, Math.round((now.getTime() - startMs) / 60000));
    const schedDuration = Math.max(20, toMinutes(rec.scheduledEnd) - toMinutes(rec.scheduledStart));
    const leftEarly = actualMinutes < schedDuration - 8 && selectedDate === todayIso && actualMinutes >= 2;

    const updated: LessonAttendanceRecord = {
      ...rec,
      checkOutAt: now.toISOString(),
      actualMinutes,
      topicCovered: skipTopic ? '' : pendingCheckOut.topicDraft.trim(),
      status: leftEarly ? 'LEFT_EARLY' : rec.minutesLate && rec.minutesLate > 5 ? 'LATE' : 'COMPLETED',
    };

    const next = records.map(r => (r.id === rec.id ? updated : r));
    persistRecords(next);
    apiService.saveModuleRecord('timetable_lesson_attendance', updated).catch(() => {});

    setPendingCheckOut(null);
    setScanFeedback({
      type: 'success',
      text: `🏁 Checked OUT of ${updated.className} (${updated.subjectCode}) • ${actualMinutes} mins logged${
        updated.topicCovered ? ` • Topic: "${updated.topicCovered}"` : ' (no topic added)'
      }`,
    });
  };

  // Start Live Camera QR Scanner
  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        if (BarcodeDetectorCtor) {
          const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          const scanFrame = async () => {
            if (!videoRef.current || !streamRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                stopCamera();
                processClassQrScan(codes[0].rawValue);
                return;
              }
            } catch (_) {}
            scanLoopRef.current = window.requestAnimationFrame(scanFrame);
          };
          scanLoopRef.current = window.requestAnimationFrame(scanFrame);
        } else {
          setCameraError('Live camera preview is active, but this browser does not support built-in QR decoding. Use Quick Scan below or Chrome/Edge mobile.');
        }
      }, 120);
    } catch (err: any) {
      setCameraError(err?.message || 'Camera permission denied. You can still paste a QR token or tap a class below.');
    }
  };

  // ── ADVANCE TOPIC PLANNER STATE ──
  const [topicDayFilter, setTopicDayFilter] = useState<string>(selectedDay);
  const [topicDrafts, setTopicDrafts] = useState<Record<string, { topic: string; notes: string }>>({});
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const plannerSlots = useMemo(() => {
    const teacherFilterId = mode === 'teacher' ? currentUser?.id : selectedTeacherId;
    return normalizedEntries
      .filter(e => e.day === topicDayFilter && (!teacherFilterId || e.lecturerId === teacherFilterId))
      .sort((a, b) => a._period - b._period);
  }, [normalizedEntries, topicDayFilter, selectedTeacherId, mode, currentUser?.id]);

  const handleSavePlannedTopic = (slot: typeof normalizedEntries[number]) => {
    const key = slot._slotId;
    const draft = topicDrafts[key];
    const existing = getPlannedTopic(slot.lecturerId, slot.courseId, slot.subjectId, slot.day, slot._period);
    const topicText = (draft?.topic ?? existing?.topic ?? '').trim();
    const notesText = (draft?.notes ?? existing?.notes ?? '').trim();

    if (!topicText) return;

    const record: PlannedLessonTopic = {
      id: existing?.id || `tt_topic_${slot.courseId}_${slot.subjectId}_${slot.day}_P${slot._period}`,
      institutionId: instKey,
      teacherId: slot.lecturerId || selectedTeacherId || currentUser?.id || '',
      classId: slot.courseId,
      subjectId: slot.subjectId,
      day: slot.day,
      period: slot._period,
      topic: topicText,
      notes: notesText,
      updatedAt: new Date().toISOString(),
    };

    const next = [record, ...plannedTopics.filter(t => t.id !== record.id)];
    persistTopics(next);
    apiService.saveModuleRecord('timetable_planned_topics', record).catch(() => {});
    setSavedToast(`Saved planned topic for P${slot._period} (${courseMap.get(slot.courseId)?.name || 'Class'})`);
    setTimeout(() => setSavedToast(null), 2600);
  };

  // ── BULK PRINT CLASS QR POSTERS ──
  const handlePrintClassQrPosters = (targetCourses: Course[]) => {
    const printWin = window.open('', '_blank', 'width=900,height=950');
    if (!printWin) {
      alert('Please allow popups to print Class QR Posters.');
      return;
    }

    const cardsHtml = targetCourses
      .map(c => {
        const token = buildClassQrToken(instKey, c.id);
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(token)}`;
        return `
          <div class="poster-page">
            <div class="poster-card">
              <div class="school">${institutionName}</div>
              <div class="badge">SMART TIMETABLE • LESSON ATTENDANCE QR</div>
              <h1 class="class-name">${c.name}</h1>
              <div class="qr-box">
                <img src="${qrSrc}" width="240" height="240" alt="QR for ${c.name}" />
              </div>
              <div class="steps">
                <div><strong>1. START OF LESSON:</strong> Teacher scans QR to Check-In.</div>
                <div><strong>2. END OF LESSON:</strong> Teacher scans QR again to Check-Out (pre-planned topic auto-loads!).</div>
              </div>
              <div class="token">${token}</div>
            </div>
          </div>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${institutionName} — Class Lesson QR Posters</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #fff; color: #0f172a; }
          .poster-page { page-break-after: always; min-height: 92vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
          .poster-page:last-child { page-break-after: auto; }
          .poster-card { border: 4px solid #312e81; border-radius: 26px; padding: 36px 32px; text-align: center; width: 100%; max-width: 520px; }
          .school { font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #64748b; }
          .badge { display: inline-block; margin: 12px 0 6px; padding: 6px 14px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 900; letter-spacing: 1px; }
          .class-name { font-size: 34px; font-weight: 900; margin: 6px 0 20px; color: #0f172a; text-transform: uppercase; }
          .qr-box { display: inline-block; padding: 16px; border: 3px solid #cbd5e1; border-radius: 20px; background: #fff; margin-bottom: 20px; }
          .steps { text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; font-size: 13px; line-height: 1.7; margin-bottom: 16px; }
          .token { font-family: monospace; font-size: 10px; color: #64748b; background: #f1f5f9; padding: 5px 10px; border-radius: 8px; display: inline-block; }
        </style>
      </head>
      <body>
        ${cardsHtml}
        <script>window.onload = () => setTimeout(() => window.print(), 450);</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // ── LIVE MATRIX & REPORT METRICS ──
  const todayRecords = useMemo(() => {
    const list = records.filter(r => r.date === selectedDate);
    return mode === 'teacher' && currentUser?.id ? list.filter(r => r.actualTeacherId === currentUser.id) : list;
  }, [records, selectedDate, mode, currentUser?.id]);

  const livePeriodCards = useMemo(() => {
    return courses.map(c => {
      const slot = normalizedEntries.find(e => e.courseId === c.id && e.day === selectedDay && e._period === selectedPeriod);
      const rec = records.find(r => r.date === selectedDate && r.classId === c.id && r.period === selectedPeriod);
      const subj = slot ? subjectMap.get(slot.subjectId) : undefined;
      const teacher = slot ? teacherMap.get(slot.lecturerId) : undefined;
      const planned = slot ? getPlannedTopic(slot.lecturerId, c.id, slot.subjectId, selectedDay, selectedPeriod) : undefined;
      return { course: c, slot, record: rec, subject: subj, teacher, planned };
    });
  }, [courses, normalizedEntries, selectedDay, selectedPeriod, records, selectedDate, subjectMap, teacherMap, plannedTopics]);

  const reportStats = useMemo(() => {
    const total = todayRecords.length;
    const inProgress = todayRecords.filter(r => r.status === 'IN_PROGRESS').length;
    const completed = todayRecords.filter(r => r.status === 'COMPLETED' || r.status === 'LATE' || r.status === 'LEFT_EARLY').length;
    const late = todayRecords.filter(r => (r.minutesLate || 0) > 5).length;
    const withTopics = todayRecords.filter(r => !!r.topicCovered?.trim()).length;
    const totalScheduledForDay = normalizedEntries.filter(
      e => e.day === selectedDay && (mode !== 'teacher' || !currentUser?.id || e.lecturerId === currentUser.id)
    ).length;
    const coveragePct = totalScheduledForDay > 0 ? Math.min(100, Math.round(((completed + inProgress) / totalScheduledForDay) * 100)) : 0;
    return { total, inProgress, completed, late, withTopics, totalScheduledForDay, coveragePct };
  }, [todayRecords, normalizedEntries, selectedDay, mode, currentUser?.id]);

  // Export Attendance & Topics Audit PDF
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${institutionName.toUpperCase()} — LESSON QR ATTENDANCE & TOPICS REPORT`, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Date: ${selectedDate} (${selectedDay})   |   Completed: ${reportStats.completed}   |   In Progress: ${reportStats.inProgress}   |   Coverage: ${reportStats.coveragePct}%   |   Topics Logged: ${reportStats.withTopics}`,
      14,
      21
    );

    autoTable(doc, {
      startY: 26,
      head: [['Period', 'Class', 'Subject', 'Teacher', 'Check-In', 'Check-Out', 'Duration', 'Status', 'Topic Covered']],
      body: todayRecords.length
        ? todayRecords.map(r => [
            `P${r.period} (${r.scheduledStart}-${r.scheduledEnd})`,
            r.className,
            `${r.subjectCode} - ${r.subjectName}`,
            `${r.actualTeacherName}${r.isSubstitute ? ' (Cover)' : ''}`,
            formatTime(r.checkInAt),
            formatTime(r.checkOutAt),
            r.actualMinutes ? `${r.actualMinutes}m` : 'Live',
            r.status.replace('_', ' '),
            r.topicCovered || '—',
          ])
        : [['—', 'No QR lesson scans recorded for this date yet.', '', '', '', '', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [49, 46, 129], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`Lesson_QR_Attendance_${selectedDate}.pdf`);
  };

  const tabs = mode === 'teacher'
    ? [
        { id: 'scanner', label: '📱 Scan Class QR', badge: records.filter(r => r.date === selectedDate && r.actualTeacherId === currentUser?.id && r.status === 'IN_PROGRESS').length },
        { id: 'topics', label: '📝 Plan My Topics', badge: plannedTopics.filter(t => !currentUser?.id || t.teacherId === currentUser.id).length },
        { id: 'reports', label: '📊 My Coverage Log', badge: todayRecords.length },
      ]
    : [
        { id: 'live', label: '📡 Live Class Status', badge: reportStats.inProgress },
        { id: 'scanner', label: '📱 QR Check-In / Out', badge: 0 },
        { id: 'topics', label: '📝 Advance Topic Planner', badge: plannedTopics.length },
        { id: 'qr_posters', label: '🏷️ Class QR Posters', badge: courses.length },
        { id: 'reports', label: '📊 Attendance Reports', badge: todayRecords.length },
      ];

  return (
    <div className="space-y-5">
      {/* Top Header Strip */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 border border-indigo-500/30 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              QR Lesson Tracking • Start &amp; End Scan
            </span>
            <span className="text-[11px] font-bold text-slate-300">{selectedDay} • {selectedDate}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight mt-1">
            {mode === 'teacher' ? 'My Lesson QR Check-In & Advance Topic Planner' : 'Smart Timetable Lesson Attendance & QR Control'}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Teachers scan the Class QR at lesson start and end. Pre-planned topics auto-load during Check-Out for 1-tap syllabus tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
          />
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
          >
            {periodBells.map(b => (
              <option key={b.period} value={b.period}>
                Period {b.period} ({b.start}–{b.end})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => { stopCamera(); setActiveSubTab(t.id as any); }}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === t.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <span>{t.label}</span>
            {t.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                activeSubTab === t.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Global Scan Feedback Banner */}
      {scanFeedback && (
        <div className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
          scanFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-200'
            : scanFeedback.type === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/50 dark:border-rose-700 dark:text-rose-200'
            : 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/50 dark:border-indigo-700 dark:text-indigo-200'
        }`}>
          <span>{scanFeedback.text}</span>
          <button type="button" onClick={() => setScanFeedback(null)} className="text-[11px] font-black opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* ── CHECK-OUT MODAL / CARD (OPTIONAL TOPIC COVERED — AUTO-FILLED FROM ADVANCE PLANNER) ── */}
      {pendingCheckOut && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-slate-900 border-2 border-emerald-400 p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                🏁 End-of-Lesson QR Scanned — Confirm Check-Out
              </span>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                {pendingCheckOut.record.className} • {pendingCheckOut.record.subjectCode} ({pendingCheckOut.record.subjectName})
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Checked in at <strong>{formatTime(pendingCheckOut.record.checkInAt)}</strong> by <strong>{pendingCheckOut.record.actualTeacherName}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPendingCheckOut(null)}
              className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span>📝 Topic Covered (Optional)</span>
              {pendingCheckOut.topicDraft && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black">
                  Auto-Loaded from Planned Topics ✓
                </span>
              )}
            </label>
            <input
              type="text"
              value={pendingCheckOut.topicDraft}
              onChange={e => setPendingCheckOut(prev => prev ? { ...prev, topicDraft: e.target.value } : null)}
              placeholder="e.g. Quadratic Equations — Factorisation (leave blank to skip)"
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {pendingCheckOut.suggestedTopics.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-black uppercase text-slate-500">Quick-Pick Planned Topics:</span>
                {pendingCheckOut.suggestedTopics.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPendingCheckOut(prev => prev ? { ...prev, topicDraft: t } : null)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => confirmCheckOut(true)}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Skip Topic &amp; Check Out
            </button>
            <button
              type="button"
              onClick={() => confirmCheckOut(false)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
            >
              ✅ Confirm &amp; Complete Lesson
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 1: LIVE CLASS STATUS MATRIX (ADMIN/DOS) ── */}
      {activeSubTab === 'live' && (
        <div className="space-y-4">
          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Scheduled Today', value: reportStats.totalScheduledForDay, color: 'text-slate-900 dark:text-white' },
              { label: 'In Class Now', value: reportStats.inProgress, color: 'text-emerald-600' },
              { label: 'Completed', value: reportStats.completed, color: 'text-indigo-600' },
              { label: 'Topics Logged', value: reportStats.withTopics, color: 'text-cyan-600' },
              { label: 'Coverage Rate', value: `${reportStats.coveragePct}%`, color: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k.label}</div>
                <div className={`text-2xl font-black mt-0.5 ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {livePeriodCards.map(({ course, slot, record, subject, teacher, planned }) => {
              const status = record?.status || (slot ? 'UPCOMING' : 'FREE');
              const badgeCls =
                status === 'IN_PROGRESS'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : status === 'COMPLETED'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  : status === 'LATE' || status === 'LEFT_EARLY'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : status === 'UPCOMING'
                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200';

              return (
                <div key={course.id} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase">{course.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${badgeCls}`}>
                        {status === 'IN_PROGRESS' ? '🟢 In Class' : status === 'COMPLETED' ? '✅ Done' : status.replace('_', ' ')}
                      </span>
                    </div>

                    {slot ? (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="font-black text-indigo-700 dark:text-indigo-300">
                          {subject?.code || 'SUB'} — {subject?.name || 'Lesson'}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          🎓 {teacher?.name || 'Assigned Teacher'}
                        </div>
                        {planned?.topic && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
                            📝 Planned: <strong>{planned.topic}</strong>
                          </div>
                        )}
                        {record && (
                          <div className="text-[11px] text-slate-500 pt-1">
                            In: <strong>{formatTime(record.checkInAt)}</strong>
                            {record.checkOutAt && <> • Out: <strong>{formatTime(record.checkOutAt)}</strong> ({record.actualMinutes}m)</>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-400 italic">No lesson scheduled for Period {selectedPeriod}</div>
                    )}
                  </div>

                  {slot && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          processClassQrScan(
                            buildClassQrToken(instKey, course.id),
                            selectedPeriod,
                            slot.lecturerId || selectedTeacherId
                          )
                        }
                        className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
                          status === 'IN_PROGRESS'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                        }`}
                      >
                        {status === 'IN_PROGRESS' ? '🏁 Simulate End QR Scan' : '📱 Simulate Start QR Scan'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: QR CHECK-IN / CHECK-OUT SCANNER ── */}
      {activeSubTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Live Camera / Manual QR Scan */}
          <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">📷 Scan Class QR Poster</h4>
              {mode === 'admin' && (
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                >
                  {lecturers.map(l => (
                    <option key={l.id} value={l.id}>Teacher: {l.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden min-h-[220px] flex flex-col items-center justify-center p-4 text-center">
              {cameraActive ? (
                <div className="w-full space-y-2">
                  <video ref={videoRef} className="w-full max-h-64 rounded-xl object-cover" playsInline muted />
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-black uppercase cursor-pointer"
                  >
                    Stop Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-4xl">📱</div>
                  <p className="text-xs text-slate-300 max-w-xs">
                    Point your camera at the <strong>Class QR Poster</strong> at the start of the lesson to Check-In, and scan again at the end to Check-Out.
                  </p>
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                  >
                    📷 Open Camera QR Scanner
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                ⚠️ {cameraError}
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isSubstituteMode}
                onChange={e => setIsSubstituteMode(e.target.checked)}
                className="rounded"
              />
              <span>Covering / Substituting for another teacher</span>
            </label>

            {/* Manual QR Token Input Fallback */}
            <form
              onSubmit={e => {
                e.preventDefault();
                if (manualQrInput.trim()) {
                  processClassQrScan(manualQrInput.trim());
                  setManualQrInput('');
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualQrInput}
                onChange={e => setManualQrInput(e.target.value)}
                placeholder="Paste Class QR token or class name..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-black uppercase cursor-pointer"
              >
                Verify QR
              </button>
            </form>
          </div>

          {/* Right: 1-Tap Class QR Quick-Scan & Active Sessions */}
          <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
              ⚡ Quick Class QR Check-In / Check-Out (Period {selectedPeriod})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {courses.map(c => {
                const activeTeacherId = (mode === 'teacher' ? currentUser?.id : selectedTeacherId) || '';
                const activeRec = records.find(
                  r => r.date === selectedDate && r.classId === c.id && r.actualTeacherId === activeTeacherId && r.status === 'IN_PROGRESS'
                );
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => processClassQrScan(buildClassQrToken(instKey, c.id))}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeRec
                        ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-950/40'
                        : 'bg-slate-50 hover:bg-indigo-50 border-slate-200 dark:bg-slate-900/60 dark:border-slate-700'
                    }`}
                  >
                    <div className="font-black text-xs text-slate-900 dark:text-white uppercase">{c.name}</div>
                    <div className={`text-[10px] font-bold mt-1 ${activeRec ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {activeRec ? `🟢 Active since ${formatTime(activeRec.checkInAt)} — Tap to Check Out` : '📱 Tap to Scan Check-In'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ADVANCE TOPIC PLANNER (TEACHERS PRE-PLAN TOPICS ON THEIR TIMETABLE!) ── */}
      {activeSubTab === 'topics' && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                📝 Advance Lesson Topic Planner
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add your lesson topics in advance on your timetable — they will auto-fill during QR Check-Out so you finish in 1 tap!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'admin' && (
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="">All Teachers</option>
                  {lecturers.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-1">
                {DAYS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTopicDayFilter(d)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                      topicDayFilter === d ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {savedToast && (
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
              ✅ {savedToast}
            </div>
          )}

          {plannerSlots.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl">
              No timetable lessons found for {topicDayFilter}. Select another day or teacher above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {plannerSlots.map(slot => {
                const course = courseMap.get(slot.courseId);
                const subject = subjectMap.get(slot.subjectId);
                const teacher = teacherMap.get(slot.lecturerId);
                const existing = getPlannedTopic(slot.lecturerId, slot.courseId, slot.subjectId, slot.day, slot._period);
                const draft = topicDrafts[slot._slotId] || {
                  topic: existing?.topic || '',
                  notes: existing?.notes || '',
                };

                return (
                  <div
                    key={slot._slotId}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                  >
                    <div className="lg:col-span-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black">
                          P{slot._period}
                        </span>
                        <span className="font-black text-xs text-slate-900 dark:text-white uppercase">
                          {course?.name || 'Class'}
                        </span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {subject?.code || subject?.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {slot.timeSlot} • {teacher?.name || 'Teacher'}
                        {existing?.topic && <span className="ml-2 text-emerald-600 font-bold">✓ Planned</span>}
                      </div>
                    </div>

                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={draft.topic}
                        onChange={e =>
                          setTopicDrafts(prev => ({
                            ...prev,
                            [slot._slotId]: { ...draft, topic: e.target.value },
                          }))
                        }
                        placeholder="Planned topic (e.g. Organic Chemistry — Alkanes)"
                        className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={draft.notes}
                        onChange={e =>
                          setTopicDrafts(prev => ({
                            ...prev,
                            [slot._slotId]: { ...draft, notes: e.target.value },
                          }))
                        }
                        placeholder="Optional sub-topic / textbook page..."
                        className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div className="lg:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSavePlannedTopic(slot)}
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        💾 Save Topic
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: CLASS QR POSTERS (PER CLASS) ── */}
      {activeSubTab === 'qr_posters' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">🏷️ Per-Class Lesson Attendance QR Posters</h4>
              <p className="text-xs text-slate-500">Print and mount one QR poster inside each classroom (or hand to the Class Prefect).</p>
            </div>
            <button
              type="button"
              onClick={() => handlePrintClassQrPosters(courses)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
            >
              🖨️ Bulk Print All {courses.length} Class QR Posters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courses.map(c => {
              const token = buildClassQrToken(instKey, c.id);
              const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(token)}`;
              return (
                <div key={c.id} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm space-y-3">
                  <div className="font-black text-sm uppercase text-slate-900 dark:text-white">{c.name}</div>
                  <div className="inline-block p-2.5 bg-white rounded-xl border border-slate-200">
                    <img src={qrSrc} alt={`QR for ${c.name}`} className="w-36 h-36 mx-auto" />
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 truncate">{token}</div>
                  <button
                    type="button"
                    onClick={() => handlePrintClassQrPosters([c])}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    🖨️ Print A4 Poster
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 5: ATTENDANCE & TOPICS AUDIT REPORTS ── */}
      {activeSubTab === 'reports' && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                📊 Lesson QR Attendance &amp; Syllabus Topics Log ({selectedDate})
              </h4>
              <p className="text-xs text-slate-500">
                Completed: {reportStats.completed} • In Progress: {reportStats.inProgress} • Late: {reportStats.late} • Topics Logged: {reportStats.withTopics}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer"
            >
              📄 Download Attendance PDF
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-2.5">Period</th>
                  <th className="p-2.5">Class</th>
                  <th className="p-2.5">Subject</th>
                  <th className="p-2.5">Teacher</th>
                  <th className="p-2.5">Start Scan</th>
                  <th className="p-2.5">End Scan</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Topic Covered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {todayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      No QR scans recorded for {selectedDate} yet. Use the Live Class Status or QR Scanner tab to record a Check-In &amp; Check-Out.
                    </td>
                  </tr>
                ) : (
                  todayRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="p-2.5 font-bold">P{r.period}</td>
                      <td className="p-2.5 font-black uppercase">{r.className}</td>
                      <td className="p-2.5 font-bold text-indigo-700 dark:text-indigo-300">{r.subjectCode}</td>
                      <td className="p-2.5">
                        {r.actualTeacherName}
                        {r.isSubstitute && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-black">COVER</span>}
                      </td>
                      <td className="p-2.5 font-mono">{formatTime(r.checkInAt)}</td>
                      <td className="p-2.5 font-mono">{formatTime(r.checkOutAt)}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'IN_PROGRESS'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-200">{r.topicCovered || <span className="text-slate-400 italic">Skipped</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
