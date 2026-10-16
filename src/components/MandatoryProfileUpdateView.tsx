
import React, { useState } from 'react';
import type { User } from '../types';

interface MandatoryProfileUpdateViewProps {
  user: User;
  onUpdate: (data: { gender: 'Male' | 'Female' | 'Other'; email: string }) => void;
  onLogout: () => void;
  logoUrl: string | null;
}

export const MandatoryProfileUpdateView: React.FC<MandatoryProfileUpdateViewProps> = ({ user, onUpdate, onLogout, logoUrl }) => {
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>(user.gender || '');
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!gender) {
      setError('Please select your gender.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid official email address.');
        return;
    }

    onUpdate({ gender: gender as 'Male' | 'Female' | 'Other', email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            {(() => {
              const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
              const isPortal = hostname === 'portal.eduai.co.ke' || hostname === 'eduai.co.ke' || hostname === 'www.eduai.co.ke';
              const effectiveLogo = isPortal ? '/eduai_logo_3d.png' : (logoUrl || '/eduai_logo_3d.png');
              return (
                <img 
                  loading="lazy" 
                  src={effectiveLogo} 
                  alt="Logo" 
                  className="h-12 w-auto mx-auto mb-4 object-contain" 
                  onError={(e) => { (e.target as HTMLImageElement).src = '/eduai_logo_3d.png'; }}
                />
              );
            })()}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Action Required</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              To ensure our records are accurate, please update your profile details before proceeding.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                required
              >
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Official Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"
                required
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This will be used for official notifications.</p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
              >
                Update & Proceed
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none"
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

