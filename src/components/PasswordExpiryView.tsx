import React, { useState } from 'react';
import type { User, PasswordUpdateData } from '../types';

interface PasswordExpiryViewProps {
  user: User;
  onUpdate: (data: PasswordUpdateData) => { success: boolean, message: string };
  onCancel: () => void;
  logoUrl: string | null;
}

export const PasswordExpiryView: React.FC<PasswordExpiryViewProps> = ({ user, onUpdate, onCancel, logoUrl }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      setIsLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }
     if (newPassword === currentPassword) {
      setError('New password cannot be the same as the old password.');
      setIsLoading(false);
      return;
    }

    const result = onUpdate({
      currentPassword,
      newPassword,
    });

    if (result.success) {
      setSuccess(result.message + ' You will be logged in shortly...');
      // The App component will handle the actual login and unmount this view
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const inputClasses = "shadow-sm appearance-none border rounded w-full py-3 px-4 text-slate-700 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            {logoUrl && (
                <img src={logoUrl} alt="Application Logo" className="mx-auto h-12 w-auto mb-4" />
            )}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Password Expired
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
                For security reasons, your password has expired. Please update it to continue.
            </p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-lg px-8 pt-6 pb-8 mb-4">
            {error && <p className="text-red-500 text-sm bg-red-100 dark:bg-red-900/50 p-3 rounded-md mb-4">{error}</p>}
            {success && <p className="text-green-600 text-sm bg-green-100 dark:bg-green-900/50 p-3 rounded-md mb-4">{success}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2" htmlFor="current-password">
                        Current Password
                    </label>
                    <input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2" htmlFor="new-password">
                        New Password
                    </label>
                    <input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2" htmlFor="confirm-new-password">
                        Confirm New Password
                    </label>
                    <input
                        id="confirm-new-password"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                
                <div className="flex flex-col gap-4 pt-2">
                    <button
                        className="w-full bg-[var(--color-primary)] hover:brightness-90 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Updating...' : 'Update Password & Login'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                    >
                        Cancel & Logout
                    </button>
                </div>
            </form>
        </div>
    </div>
    </div>
  );
};
