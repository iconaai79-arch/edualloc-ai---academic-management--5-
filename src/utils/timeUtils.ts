import type { TimetableSettings, TimetablePeriod } from '../types';

export const timeToMinutes = (time: string): number => {
  if (!time || typeof time !== 'string' || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(Math.max(0, minutes) / 60);
  const m = Math.max(0, minutes) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const GRID_TIME_STEP_MINUTES = 15;

const filterOutBreaks = (slots: { start: string; end: string }[], breaks: TimetableSettings['breaks']) => {
  if (!slots || !Array.isArray(slots)) return [];
  if (!breaks || !Array.isArray(breaks) || breaks.length === 0) return slots;

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

export const generateTimeSlots = (settings: TimetableSettings): { start: string; end: string }[] => {
  if (!settings) return [];
  const { startTime = '08:00', endTime = '17:00', breaks = [] } = settings;
  const slots: { start: string; end: string }[] = [];

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

  return filterOutBreaks(slots, breaks);
};

export const generateDisplaySlots = (settings: TimetableSettings): { start: string; end: string }[] => {
  if (!settings) return [];
  const periods = settings.periods || [];
  if (Array.isArray(periods) && periods.length > 0) {
    return [...periods]
      .filter(p => p && p.startTime && p.endTime)
      .map(p => ({ start: p.startTime, end: p.endTime }))
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }

  const { startTime = '08:00', endTime = '17:00', cellSpanMinutes = 60, breaks = [] } = settings;
  const slots: { start: string; end: string }[] = [];

  const step = cellSpanMinutes || 60;
  let currentMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  while (currentMinutes < endMinutes) {
    const slotEndMinutes = currentMinutes + step;
    if (slotEndMinutes > endMinutes) break;

    slots.push({
      start: minutesToTime(currentMinutes),
      end: minutesToTime(slotEndMinutes),
    });
    currentMinutes += step;
  }

  return filterOutBreaks(slots, breaks);
};

export const generatePeriodLabels = (settings: TimetableSettings): { label: string; colSpan: number; startTime: string; endTime: string }[] => {
  if (!settings) return [];
  const periods = settings.periods || [];
  const breaks = settings.breaks || [];
  const cellSpan = settings.cellSpanMinutes || 60;

  if (!Array.isArray(periods) || periods.length === 0) {
    const headers: { label: string; colSpan: number; startTime: string; endTime: string }[] = [];
    const displaySlots = generateDisplaySlots(settings);

    displaySlots.forEach((slot, index) => {
      headers.push({
        label: `Period ${index + 1}`,
        colSpan: 1,
        startTime: slot.start,
        endTime: slot.end,
      });
    });
    return headers;
  }

  return periods
    .filter(p => {
      if (!p || !p.startTime || !p.endTime) return false;
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
        colSpan: 1, // Enforce 1 column per period
        startTime: p.startTime,
        endTime: p.endTime,
      };
    });
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
