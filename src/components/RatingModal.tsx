
import React, { useState } from 'react';
import type { TimetableEntry, Subject, User } from '../types';
import { StarIcon } from './icons';

interface RatingModalProps {
  lesson: TimetableEntry;
  subject?: Subject;
  lecturer?: User;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ lesson, subject, lecturer, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a star rating.');
      return;
    }
    onSubmit(rating, comment);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Rate Lesson</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Provide feedback for <span className="font-semibold">{subject?.name}</span> with <span className="font-semibold">{lecturer?.name}</span>.
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Rating</label>
              <div className="mt-1 flex items-center" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="p-1"
                  >
                    <StarIcon
                      className={`w-8 h-8 transition-colors ${(hoverRating || rating) >= star
                          ? 'text-yellow-400'
                          : 'text-slate-300 dark:text-slate-600'
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="rating-comment" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Additional Comments <span className="text-xs text-slate-400">(Optional, Anonymous)</span>
              </label>
              <div className="mt-1">
                <textarea
                  id="rating-comment"
                  rows={4}
                  className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you like or think could be improved?"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={rating === 0}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Submit Rating
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
