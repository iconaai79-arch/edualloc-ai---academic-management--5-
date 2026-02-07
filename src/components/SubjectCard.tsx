import React from 'react';
import type { Subject } from '../types';
import { CheckIcon } from './icons';
import { generatePastelColor } from '../utils/colorUtils';

interface SubjectCardProps {
  subject: Subject;
  onSelect: () => void;
  isRequested?: boolean;
  isAllocated?: boolean;
  isSelected: boolean;
  isEnrolled?: boolean;
  isEnrollmentPending?: boolean;
  actionLabel?: string;
  isActionDisabled?: boolean;
  searchQuery?: string;
}

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightMatch = (text: string, query?: string) => {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }
  try {
    const escapedQuery = escapeRegExp(query.trim());
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, index) =>
          index % 2 === 1 ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-700/50 px-0 py-0 rounded">{part}</mark>
          ) : (
            <>{part}</>
          ))}
      </>
    );
  } catch (e) {
    return <>{text}</>;
  }
};

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onSelect, isRequested, isAllocated, isSelected, isEnrolled, isEnrollmentPending, actionLabel = 'Select', isActionDisabled = false, searchQuery }) => {
  const isPreDisabled = isRequested || isAllocated || isEnrolled || isEnrollmentPending;
  const isDisabled = isPreDisabled || isActionDisabled || subject.isComplete;

  const bgColor = generatePastelColor(subject.id);

  const interactionClasses = isDisabled
    ? 'cursor-not-allowed opacity-70'
    : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer';

  let statusIndicatorClasses = 'border-transparent';
  if (isAllocated) {
    // A solid green ring for allocated subjects
    statusIndicatorClasses = 'border-transparent ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 ring-green-500';
  } else if (isRequested) {
    // A pulsing yellow ring for requested subjects
    statusIndicatorClasses = 'border-transparent ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 ring-yellow-400 animate-pulse';
  } else if (isSelected) {
    // The original primary color border and ring for selected subjects
    statusIndicatorClasses = 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]';
  }

  let statusBadge = null;
  if (subject.isComplete) {
    statusBadge = <span className="absolute top-2 right-2 text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Completed</span>;
  } else if (isAllocated) {
    statusBadge = <span className="absolute top-2 right-2 text-xs font-bold bg-green-200 text-green-900 px-2 py-1 rounded-full">Allocated</span>;
  } else if (isEnrolled) {
    statusBadge = <span className="absolute top-2 right-2 text-xs font-bold bg-green-200 text-green-900 px-2 py-1 rounded-full">Enrolled</span>;
  } else if (isRequested) {
    statusBadge = <span className="absolute top-2 right-2 text-xs font-bold bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full">Requested</span>;
  } else if (isEnrollmentPending) {
    statusBadge = <span className="absolute top-2 right-2 text-xs font-bold bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full">Pending</span>;
  } else if (isSelected) {
    statusBadge = (
      <div className="absolute top-2 right-2 h-6 w-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white">
        <CheckIcon className="w-4 h-4" />
      </div>
    );
  }

  const getDisabledLabel = () => {
    if (subject.isComplete) return 'Completed';
    if (isActionDisabled) return 'Requests Disabled';
    if (isAllocated) return 'Allocated';
    if (isEnrolled) return 'Enrolled';
    if (isRequested) return 'Requested';
    if (isEnrollmentPending) return 'Pending';
    return 'Unavailable';
  }

  const getLessonStructureText = () => {
    if (!subject.lessonStructure || subject.lessonStructure.length === 0) {
      return 'No lessons /wk';
    }
    return subject.lessonStructure.map(s => {
      let typeText = 'period';
      if (s.periods === 1) typeText = 'Single';
      if (s.periods === 2) typeText = 'Double';
      if (s.periods === 3) typeText = 'Triple';
      return `${s.count}x ${typeText}`;
    }).join(', ') + ' /wk';
  };

  return (
    <div
      className={`relative rounded-lg shadow-md border overflow-hidden flex flex-col transition-all text-slate-800 ${interactionClasses} ${statusIndicatorClasses}`}
      style={{ backgroundColor: bgColor }}
      onClick={isDisabled ? undefined : onSelect}
      aria-disabled={isDisabled}
    >
      {statusBadge}
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start text-sm">
          <span className={`font-semibold ${subject.isComplete ? 'text-slate-500' : 'text-[var(--color-primary)]'}`}>{highlightMatch(subject.code, searchQuery)}</span>
          <span className={`text-slate-600 bg-black/5 px-2 py-0.5 rounded-full font-medium ${subject.isComplete ? 'opacity-60' : ''}`}>{getLessonStructureText()}</span>
        </div>
        <h3 className={`mt-2 text-lg font-bold ${subject.isComplete ? 'line-through text-slate-500' : 'text-slate-900'}`}>{highlightMatch(subject.name, searchQuery)}</h3>
        <p className={`mt-2 text-sm ${subject.isComplete ? 'line-through text-slate-500' : 'text-slate-700'}`}>{highlightMatch(subject.description || '', searchQuery)}</p>
      </div>
      <div className={`bg-black/5 px-6 py-3 border-t ${isSelected ? 'border-[var(--color-primary)]' : 'border-black/10'}`}>
        <p className={`text-center text-sm font-semibold transition-colors ${isDisabled
            ? 'text-slate-600'
            : isSelected
              ? 'text-[var(--color-primary)]'
              : 'text-slate-700'
          }`}>
          {isDisabled ? getDisabledLabel() : (isSelected ? 'Selected' : `Click to ${actionLabel}`)}
        </p>
      </div>
    </div>
  );
};