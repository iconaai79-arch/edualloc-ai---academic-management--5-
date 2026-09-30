import type { TimetableSettings, TimetablePeriod } from '../types';

export const timeToMinutes = (time: string): number => {
  if (!time || typeof time !== 'string') return 0;
  
  // Clean string and handle AM/PM
  const cleanTime = time.trim().toUpperCase();
  const isPM = cleanTime.includes('PM');
  const isAM = cleanTime.includes('AM');
  
  // Extract numbers only
  const timePart = cleanTime.replace(/[APM\s]/g, '');
  if (!timePart.includes(':')) {
    const hours = parseInt(timePart);
    if (isNaN(hours)) return 0;
    let finalHours = hours;
    if (isPM && hours < 12) finalHours += 12;
    if (isAM && hours === 12) finalHours = 0;
    return finalHours * 60;
  }

  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr);
  let minutes = parseInt(minutesStr);
  
  if (isNaN(hours) || isNaN(minutes)) return 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(Math.max(0, minutes) / 60);
  const m = Math.max(0, minutes) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const GRID_TIME_STEP_MINUTES = 15;

const filterOutBreaks = (slots: { start: string; end: string; label?: string; isBreak?: boolean }[], breaks: TimetableSettings['breaks'], includeBreaks: boolean = false) => {
  if (!slots || !Array.isArray(slots)) return [];
  if (includeBreaks || !breaks || !Array.isArray(breaks) || breaks.length === 0) return slots;

  const breakIntervals = breaks
    .filter(b => b && b.status !== 'inactive' && b.startTime && b.endTime)
    .map(b => ({
      start: timeToMinutes(b.startTime),
      end: timeToMinutes(b.endTime),
    }));

  return slots.filter(slot => {
    const slotStartMinutes = timeToMinutes(slot.start);
    const slotEndMinutes = timeToMinutes(slot.end);

    for (const breakInterval of breakIntervals) {
      if (slotStartMinutes < breakInterval.end && slotEndMinutes > breakInterval.start) {
        return false;
      }
    }
    return true;
  });
};

export const generateTimeSlots = (settings: TimetableSettings, includeBreaks: boolean = false): { start: string; end: string; label?: string; isBreak?: boolean }[] => {
  if (!settings) return [];
  const { startTime = '08:00', endTime = '17:00', breaks = [] } = settings;
  const slots: { start: string; end: string; label?: string; isBreak?: boolean }[] = [];

  let currentMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  while (currentMinutes < endMinutes) {
    const slotEndMinutes = currentMinutes + GRID_TIME_STEP_MINUTES;
    if (slotEndMinutes > endMinutes) break;

    slots.push({
      start: minutesToTime(currentMinutes),
      end: minutesToTime(slotEndMinutes),
    });
    currentMinutes += GRID_TIME_STEP_MINUTES;
  }

  return filterOutBreaks(slots, breaks, includeBreaks);
};

export const generateDisplaySlots = (settings: TimetableSettings, includeBreaks: boolean = false): { start: string; end: string; isBreak?: boolean; label?: string }[] => {
  if (!settings) return [];
  const periods = settings.periods || [];
  const breaks = settings.breaks || [];

  if (Array.isArray(periods) && periods.length > 0) {
    const all: { start: string; end: string; isBreak?: boolean; label?: string }[] = [...periods]
      .filter(p => p && p.startTime && p.endTime)
      .map(p => ({ start: p.startTime, end: p.endTime, label: p.name }));

    if (includeBreaks && breaks) {
      breaks.filter(b => b.status !== 'inactive').forEach(b => {
        all.push({ start: b.startTime, end: b.endTime, isBreak: true, label: b.name });
      });
    }

    return all.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }

  const { startTime = '08:00', endTime = '17:00', cellSpanMinutes = 60 } = settings;
  const slots: { start: string; end: string; label?: string; isBreak?: boolean }[] = [];

  const step = cellSpanMinutes || 60;
  let currentMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  while (currentMinutes < endMinutes) {
    const slotEndMinutes = currentMinutes + step;
    if (slotEndMinutes > endMinutes) break;

    slots.push({
      start: minutesToTime(currentMinutes),
      end: minutesToTime(slotEndMinutes),
      label: `Period ${slots.length + 1}`
    });
    currentMinutes += step;
  }

  const result = filterOutBreaks(slots, breaks, includeBreaks);
  
  if (includeBreaks) {
    breaks.filter(b => b.status !== 'inactive').forEach(b => {
      // Add breaks but they will be sorted
      result.push({
        start: b.startTime,
        end: b.endTime,
        isBreak: true,
        label: b.name
      });
    });
    return result.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }

  return result;
};

export const generatePeriodLabels = (
  settings: TimetableSettings,
  includeBreaks: boolean = false
): { label: string; colSpan: number; startTime: string; endTime: string; isBreak?: boolean }[] => {
  if (!settings) return [];
  const periods = settings.periods || [];
  const breaks = settings.breaks || [];
  const cellSpan = settings.cellSpanMinutes || 60;

  if (!Array.isArray(periods) || periods.length === 0) {
    const headers: { label: string; colSpan: number; startTime: string; endTime: string; isBreak?: boolean }[] = [];
    const displaySlots = generateDisplaySlots(settings, includeBreaks);

    displaySlots.forEach((slot, index) => {
      const isBreak = breaks.some(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
      const breakObj = breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);

      headers.push({
        label: isBreak ? (breakObj?.name || 'Break') : `Period ${index + 1}`,
        colSpan: 1,
        startTime: slot.start,
        endTime: slot.end,
        isBreak
      });
    });
    return headers;
  }

  const labels: { label: string; colSpan: number; startTime: string; endTime: string; isBreak?: boolean }[] = periods
    .filter(p => {
      if (!p || !p.startTime || !p.endTime) return false;
      if (includeBreaks) return true;
      for (const b of (breaks || [])) {
        if (b && b.status !== 'inactive' && b.startTime && b.endTime) {
          if (timeToMinutes(p.startTime) >= timeToMinutes(b.startTime) && timeToMinutes(p.endTime) <= timeToMinutes(b.endTime)) {
            return false;
          }
        }
      }
      return true;
    })
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    .map((p, index) => {
      const label = (p.name === p.startTime) ? `Period ${index + 1}` : p.name;
      return {
        label: label,
        colSpan: 1,
        startTime: p.startTime,
        endTime: p.endTime,
      };
    });

  if (includeBreaks) {
    breaks.filter(b => b.status !== 'inactive').forEach(b => {
      labels.push({
        label: b.name,
        colSpan: 1,
        startTime: b.startTime,
        endTime: b.endTime,
        isBreak: true
      });
    });
    labels.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  return labels;
};

export const formatEta = (ms: number | null): string => {
  if (ms === null || ms < 1000) return '';
  const seconds = Math.ceil(ms / 1000);
  if (seconds <= 1) return 'about 1 second remaining...';
  if (seconds < 60) return `about ${seconds} seconds remaining...`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `about ${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} remaining...`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `about ${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} remaining...`;
};

export interface RemedialDurationCalculation {
  hours: number;                  // e.g. 1.0 or 0.7 or 0.83 (rounded to 2 decimal places)
  durationMinutes: number;        // Effective minutes taught
  scheduledMinutes: number;       // Timetable scheduled minutes
  earlyMinutesOmitted: number;    // Minutes between early login and scheduled start
  isEarlyLogin: boolean;          // Teacher logged in before scheduled start
  isCappedAtTimetable: boolean;   // Logged out after required minutes, rounded to timetable
  isLoggedOutEarly: boolean;      // Logged out earlier than required minutes
  effectiveStart: string;         // ISO string of effective calculation start
  effectiveEnd: string;           // ISO string of effective calculation end
}

/**
 * Calculates remedial lesson verified duration according to timetable rules:
 * 1. If teacher logs in before the lesson's scheduled time, omit the early minutes when calculating time.
 * 2. If user logs out after the required minutes, round off to the timetable minutes.
 * 3. If user logs out earlier, calculate using the exact minutes.
 */
export const calculateRemedialSessionDuration = (
  actualStartTime: string | Date,
  actualEndTime?: string | Date | null,
  scheduledTime?: {
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
  } | null
): RemedialDurationCalculation => {
  const actualStart = new Date(actualStartTime);
  const actualEnd = actualEndTime ? new Date(actualEndTime) : new Date();

  if (isNaN(actualStart.getTime())) {
    return {
      hours: 1,
      durationMinutes: 60,
      scheduledMinutes: 60,
      earlyMinutesOmitted: 0,
      isEarlyLogin: false,
      isCappedAtTimetable: true,
      isLoggedOutEarly: false,
      effectiveStart: new Date().toISOString(),
      effectiveEnd: new Date().toISOString()
    };
  }

  let schedStartMinutes: number | null = null;
  let schedEndMinutes: number | null = null;
  let scheduledDurationMins = 60;

  if (scheduledTime?.startTime && scheduledTime?.endTime) {
    schedStartMinutes = timeToMinutes(scheduledTime.startTime);
    schedEndMinutes = timeToMinutes(scheduledTime.endTime);
    if (schedEndMinutes > schedStartMinutes) {
      scheduledDurationMins = schedEndMinutes - schedStartMinutes;
    }
  } else if (scheduledTime?.durationMinutes && scheduledTime.durationMinutes > 0) {
    scheduledDurationMins = scheduledTime.durationMinutes;
  }

  const actualStartDayMinutes = actualStart.getHours() * 60 + actualStart.getMinutes();
  let effectiveStartDate = new Date(actualStart);
  let earlyMinutesOmitted = 0;
  let isEarlyLogin = false;

  // 1. If the teacher logs in before the lesson's scheduled time, omit the minutes when calculating time
  if (schedStartMinutes !== null && actualStartDayMinutes < schedStartMinutes) {
    isEarlyLogin = true;
    earlyMinutesOmitted = schedStartMinutes - actualStartDayMinutes;
    effectiveStartDate = new Date(actualStart);
    effectiveStartDate.setHours(Math.floor(schedStartMinutes / 60), schedStartMinutes % 60, 0, 0);
  }

  // Elapsed minutes from effective start time
  const elapsedMs = Math.max(0, actualEnd.getTime() - effectiveStartDate.getTime());
  const elapsedMinutes = Math.round(elapsedMs / 60000);

  let finalMinutes = elapsedMinutes;
  let isCappedAtTimetable = false;
  let isLoggedOutEarly = false;

  // 2. If user logs out after required minutes, just round off to the timetable minutes
  if (elapsedMinutes >= scheduledDurationMins) {
    finalMinutes = scheduledDurationMins;
    isCappedAtTimetable = true;
  } else {
    // 3. But if user logs out earlier, calculate using exact minutes
    finalMinutes = elapsedMinutes;
    isLoggedOutEarly = true;
  }

  // Floor to 0 if negative, minimum 1 min if some time elapsed (> 15 seconds)
  if (finalMinutes === 0 && elapsedMs >= 15000) {
    finalMinutes = 1;
  }

  const exactHours = finalMinutes / 60;
  const hours = Math.round(exactHours * 100) / 100;

  return {
    hours,
    durationMinutes: finalMinutes,
    scheduledMinutes: scheduledDurationMins,
    earlyMinutesOmitted,
    isEarlyLogin,
    isCappedAtTimetable,
    isLoggedOutEarly,
    effectiveStart: effectiveStartDate.toISOString(),
    effectiveEnd: actualEnd.toISOString()
  };
};

