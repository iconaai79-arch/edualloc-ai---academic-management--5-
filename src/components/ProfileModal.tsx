
import React, { useState, useEffect } from 'react';
import type { User, ProfileUpdateData, PasswordUpdateData } from '../types';

interface ProfileModalProps {
  currentUser: User;
  onClose: () => void;
  onSave: (lecturerId: string, data: ProfileUpdateData) => void;
  // FIXED: Changed from void return type to Promise to handle async results correctly.
  onChangePassword: (lecturerId: string, data: PasswordUpdateData) => Promise<{ success: boolean, message: string }>;
  onManageUnavailability: () => void;
}

const UserCircleIcon: React.FC = () => (
    <svg className="w-24 h-24 text-slate-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
    </svg>
);

export const ProfileModal: React.FC<ProfileModalProps> = ({ currentUser, onClose, onSave, onChangePassword, onManageUnavailability }) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [expertise, setExpertise] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null | undefined>(undefined);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhoneNumber(currentUser.phoneNumber);
      setExpertise(currentUser.expertise?.join(', ') || '');
      setProfilePhotoUrl(currentUser.profilePhotoUrl);
      setGender(currentUser.gender || 'Male');
    }
  }, [currentUser]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB size limit
        alert("File is too large. Please select an image under 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            setProfilePhotoUrl(reader.result);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("Failed to read the selected file.");
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expertiseArray = expertise.split(',').map(item => item.trim()).filter(Boolean);
    if (name.trim() && phoneNumber.trim()) {
      onSave(currentUser.id, {
        name,
        phoneNumber,
        expertise: expertiseArray,
        profilePhotoUrl,
        gender
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters long.');
        return;
    }
     if (newPassword === currentPassword) {
      setPasswordError('New password cannot be the same as the old password.');
      return;
    }

    /* FIXED: Awaiting the Promise from onChangePassword as updated in interface. */
    const result = await onChangePassword(currentUser.id, {
      currentPassword,
      newPassword,
    });

    if (result.success) {
      setPasswordSuccess(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } else {
      setPasswordError(result.message);
    }
  };


  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h3>
                
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                          {profilePhotoUrl ? (
                              <img
                                  src={profilePhotoUrl}
                                  alt="Profile"
                                  className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700"
                              />
                          ) : (
                              <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
                                  <UserCircleIcon />
                              </div>
                          )}
                      </div>
                      <div className="flex gap-4">
                          <label htmlFor="photo-upload" className="cursor-pointer text-sm font-medium text-[var(--color-primary)] hover:brightness-125">
                              Upload Photo
                          </label>
                          <input type="file" id="photo-upload" className="hidden" accept="image/png, image/jpeg" onChange={handlePhotoChange} />
                          {profilePhotoUrl && (
                              <button
                                  type="button"
                                  onClick={() => setProfilePhotoUrl(null)}
                                  className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                  Remove
                              </button>
                          )}
                      </div>
                  </div>

                  <div>
                    <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                      type="text"
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                      <label htmlFor="profile-gender" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                      <select
                          id="profile-gender"
                          value={gender}
                          onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                      </select>
                  </div>
                  
                  <div>
                    <label htmlFor="profile-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input
                      type="tel"
                      id="profile-phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      required
                    />
                  </div>

                  {currentUser.role !== 'student' && (
                    <div>
                        <label htmlFor="profile-expertise" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expertise (comma-separated)</label>
                        <input
                        type="text"
                        id="profile-expertise"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                  )}

                  <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:w-auto sm:text-sm"
                      >
                        Save Profile
                      </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="border-t border-slate-200 dark:border-slate-700"></div>

            <form onSubmit={handlePasswordChange}>
                 <div className="p-6">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Change Password</h3>
                    {passwordError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
                    {passwordSuccess && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>}
                    
                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="current-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                            <input
                            type="password"
                            id="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                            />
                        </div>
                         <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                            <input
                            type="password"
                            id="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                            />
                        </div>
                         <div>
                            <label htmlFor="confirm-new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
                            <input
                            type="password"
                            id="confirm-new-password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                            />
                        </div>

                         <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:w-auto sm:text-sm"
                            >
                                Update Password
                            </button>
                        </div>
                    </div>
                 </div>
            </form>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200 dark:border-slate-700">
                <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:w-auto sm:text-sm"
                >
                Close
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
