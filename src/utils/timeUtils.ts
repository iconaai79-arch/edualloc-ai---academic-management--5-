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
