
import React, { useState, useEffect } from 'react';
import type { User, ProfileUpdateData, PasswordUpdateData } from '../types';
import { apiService } from '../services/apiService';

interface ProfileModalProps {
  currentUser: User;
  currentInstitution?: Institution | null;
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

export const ProfileModal: React.FC<ProfileModalProps> = ({ currentUser, currentInstitution, onClose, onSave, onChangePassword, onManageUnavailability }) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [expertise, setExpertise] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null | undefined>(undefined);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [autoMarketPlaceUrl, setAutoMarketPlaceUrl] = useState('');

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
      setAutoMarketPlaceUrl(currentUser.autoMarketPlaceUrl || '');
    }
  }, [currentUser]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB size limit
      alert("File is too large. Please select an image under 2MB.");
      return;
    }

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `profiles/${currentUser.id}/${timestamp}.${ext}`;

      const publicUrl = await apiService.uploadFile('eduai', path, file);
      if (publicUrl) {
        setProfilePhotoUrl(publicUrl);
        
        // --- Google Drive Mirroring Strategy ---
        try {
            await apiService.uploadToGoogleDrive(file, 'Profile_Pictures');
        } catch (gdErr) {
            console.warn("GD Mirroring failed:", gdErr);
        }
      }
    } catch (err) {
      console.error("Profile photo upload error:", err);
      alert("Failed to upload profile photo.");
    }

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
        gender,
        autoMarketPlaceUrl: currentInstitution?.institutionType === 'Car Showroom' ? autoMarketPlaceUrl : undefined
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


  const [activeTab, setActiveTab] = useState<'identity' | 'security'>('identity');

  if (!currentUser) return null;

  const isCarShowroom = currentInstitution?.institutionType === 'Car Showroom';

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              User Profile
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Identity</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-8 border-b border-slate-100 dark:border-slate-800 flex gap-8">
          {(['identity', 'security'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'identity' ? 'Public Identity' : 'Account Security'}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'identity' && (
            <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  {profilePhotoUrl ? (
                    <img loading="lazy" src={profilePhotoUrl} alt="Profile" className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white dark:border-slate-800 shadow-xl" />
                  ) : (
                    <div className="w-32 h-32 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl">
                      <UserCircleIcon />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] flex items-center justify-center cursor-pointer" onClick={() => document.getElementById('photo-upload')?.click()}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <input type="file" id="photo-upload" className="hidden" accept="image/png, image/jpeg" onChange={handlePhotoChange} />
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Full Name</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Your name" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Gender Identity</label>
                      <select value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')} className="form-select">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Contact Hotline</label>
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="form-input" placeholder="e.g. 07..." required />
                  </div>
                </div>
              </div>

              {isCarShowroom && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <label className="block text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2 ml-1">Automotive Marketplace Store URL</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <input 
                      type="url" 
                      value={autoMarketPlaceUrl} 
                      onChange={(e) => setAutoMarketPlaceUrl(e.target.value)} 
                      className="form-input pl-11" 
                      placeholder="https://marketplace.example.com/your-store" 
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 ml-1">This link will be displayed on your car listings for buyers to visit your digital showroom.</p>
                </div>
              )}

              {currentUser.role !== 'student' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Expertise Context (comma separated)</label>
                  <textarea value={expertise} onChange={(e) => setExpertise(e.target.value)} rows={3} className="form-input resize-none" placeholder="e.g. Theoretical Physics, Applied Calculus" />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary h-12 shadow-lg shadow-indigo-100 dark:shadow-none">Synchronize Unit Identity</button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-inner">
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  {passwordError && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs font-bold border border-red-100 dark:border-red-800/30">{passwordError}</div>}
                  {passwordSuccess && <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-800/30">{passwordSuccess}</div>}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Current Password</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="form-input" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">New Access Keyword</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Confirm New Keyword</label>
                        <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="form-input" required />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full btn-secondary h-12 border-2 border-slate-200 dark:border-slate-700">Rotate Access Keys</button>
                </form>
              </div>

              {currentUser.role !== 'student' && (
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-indigo-900 dark:text-indigo-400 tracking-widest">Temporal Availability</h4>
                    <p className="text-[10px] text-indigo-600/70 dark:text-indigo-500/70 mt-1">Configure your unavailable slots for the scheduler.</p>
                  </div>
                  <button onClick={onManageUnavailability} className="p-3 bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold text-[10px] uppercase tracking-wider">Configure</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 flex justify-end items-center border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary h-12 px-10">Close Profile</button>
        </div>
      </div>
      <style>{`
        .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
        .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
        .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 1rem; border: none; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 1rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .dark .btn-secondary { background-color: #1e293b; color: #cbd5e1; border-color: #334155; }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

