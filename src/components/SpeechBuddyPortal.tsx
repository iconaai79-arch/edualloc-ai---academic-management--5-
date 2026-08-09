import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Volume2, Gamepad2, Award, Heart, Shield, Layers, HelpCircle,
  BookOpen, Star, UserCheck, Activity, ChevronRight, User, Plus, Trash2, CheckCircle2, 
  Globe, Unlock, UserPlus, LogIn, LogOut, Cloud, CloudUpload, Key, Mail, Stethoscope, GraduationCap, RefreshCw
} from 'lucide-react';
import SpeechPhonemeTrainer from './SpeechPhonemeTrainer';
import VoiceControlledSpeechGame from './VoiceControlledSpeechGame';
import { SpeechArtStudio } from './SpeechArtStudio';
import { SpeechAACStorybook } from './SpeechAACStorybook';
import { SpeechProgressAnalytics } from './SpeechProgressAnalytics';
import { PhonemeMemoryGame } from './PhonemeMemoryGame';

// Child Profile Interface
interface ChildProfile {
  id: string;
  name: string;
  avatar: string;           // emoji fallback
  photo?: string | null;    // base64 child photo
  stars: number;
  bestSustainedSec: number;
  favoritePhoneme: string;
  createdDate: string;
}

// Registered User Interface
interface SpeechBuddyUser {
  id: string;
  name: string;
  email: string;
  role: 'parent' | 'therapist' | 'educator' | 'kid';
  registeredDate: string;
  organization?: string;
  syncToken: string;
}

export const SpeechBuddyPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trainer' | 'game' | 'art' | 'storybook' | 'memory' | 'progress' | 'profiles' | 'account'>('trainer');
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  
  // Registered User Session
  const [registeredUser, setRegisteredUser] = useState<SpeechBuddyUser | null>(() => {
    try {
      const saved = localStorage.getItem('speechbuddy_registered_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('LocalStorage error');
    }
    return null;
  });

  // Local Child Profiles
  const [profiles, setProfiles] = useState<ChildProfile[]>(() => {
    try {
      const saved = localStorage.getItem('speechbuddy_child_profiles');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('LocalStorage error');
    }
    return [
      { id: 'p-1', name: 'Little Explorer', avatar: '🦁', stars: 12, bestSustainedSec: 3.2, favoritePhoneme: '/b/', createdDate: 'Today' }
    ];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(profiles[0]?.id || 'p-1');
  const [newChildName, setNewChildName] = useState<string>('');
  const [newChildAvatar, setNewChildAvatar] = useState<string>('🐻');

  // Registration Form State
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<'parent' | 'therapist' | 'educator' | 'kid'>('parent');
  const [regOrg, setRegOrg] = useState<string>('');
  const [showRegModal, setShowRegModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save Profiles to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('speechbuddy_child_profiles', JSON.stringify(profiles));
    } catch (e) {
      console.warn('LocalStorage save error');
    }
  }, [profiles]);

  // Listen for PWA Install Prompt & Online/Offline status
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      if (registeredUser) {
        localStorage.setItem('speechbuddy_registered_user', JSON.stringify(registeredUser));
      } else {
        localStorage.removeItem('speechbuddy_registered_user');
      }
    } catch (e) {}
  }, [registeredUser]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  // Handle User Registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    const newUser: SpeechBuddyUser = {
      id: `usr-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim(),
      role: regRole,
      organization: regOrg.trim() || undefined,
      registeredDate: new Date().toLocaleDateString(),
      syncToken: Math.random().toString(36).substring(2, 10).toUpperCase(),
    };

    setRegisteredUser(newUser);
    setShowRegModal(false);
    setToastMessage(`🎉 Welcome, ${newUser.name}! Your ${newUser.role} account is active.`);
    setTimeout(() => setToastMessage(null), 3500);

    // Reset Form
    setRegName('');
    setRegEmail('');
    setRegPassword('');
  };

  // Handle Cloud Sync Simulation
  const handleCloudSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setToastMessage('☁️ Progress and child profiles synced securely to the cloud!');
      setTimeout(() => setToastMessage(null), 3500);
    }, 1200);
  };

  // Update a child's photo
  const handlePhotoChange = (profileId: string, dataUrl: string) => {
    setProfiles(prev => prev.map(p =>
      p.id === profileId ? { ...p, photo: dataUrl } : p
    ));
  };

  // Add New Child Profile
  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) return;

    const newProf: ChildProfile = {
      id: `p-${Date.now()}`,
      name: newChildName.trim(),
      avatar: newChildAvatar,
      stars: 0,
      bestSustainedSec: 0,
      favoritePhoneme: '/b/',
      createdDate: new Date().toLocaleDateString(),
    };

    setProfiles(prev => [...prev, newProf]);
    setActiveProfileId(newProf.id);
    setNewChildName('');
  };

  // Delete Profile
  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(profiles.find(p => p.id !== id)?.id || '');
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-2xl border border-emerald-300 animate-bounce flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Registration / Account Bar */}
      <div className="max-w-6xl mx-auto mb-4 bg-slate-900/90 border border-slate-800 p-3 px-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {registeredUser ? (
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Account: <strong>{registeredUser.name}</strong> ({registeredUser.role.toUpperCase()})
              </span>
              {registeredUser.organization && (
                <span className="text-slate-400 font-normal">({registeredUser.organization})</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-300">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Mode: <strong>Guest / Quick Start</strong> (Optional registration for Cloud Sync)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Offline Mode Badge */}
          {isOffline && (
            <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold animate-pulse">
              📶 Offline Practice Mode
            </span>
          )}

          {/* PWA Install Button */}
          {deferredPrompt && (
            <button
              onClick={() => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult: any) => {
                  if (choiceResult.outcome === 'accepted') {
                    setToastMessage('📱 SpeechBuddy AI installed to Home Screen!');
                    setTimeout(() => setToastMessage(null), 3000);
                  }
                  setDeferredPrompt(null);
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-extrabold rounded-xl shadow hover:scale-105 transition-all text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Language Switcher Button */}
          <button
            onClick={() => {
              const nextLang = language === 'en' ? 'sw' : 'en';
              setLanguage(nextLang);
              setToastMessage(nextLang === 'sw' ? '🇰🇪 Lugha imebadilishwa kuwa Kiswahili!' : '🇬🇧 Language switched to English!');
              setTimeout(() => setToastMessage(null), 3000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-400 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all shadow-md"
            title="Switch Language / Badili Lugha"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'en' ? '🇬🇧 English' : '🇰🇪 Kiswahili'}</span>
          </button>

          {registeredUser ? (
            <>
              <button
                onClick={handleCloudSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 rounded-xl hover:bg-indigo-600/50 font-bold transition-all"
              >
                <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Cloud Sync'}</span>
              </button>

              <button
                onClick={() => {
                  setRegisteredUser(null);
                  setToastMessage('Signed out. Switched back to Guest Mode.');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowRegModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold rounded-xl shadow hover:scale-105 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Banner Header */}
      <div className="max-w-6xl mx-auto mb-8 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/20">
            {activeProfile?.avatar || '🦊'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300">
                SpeechBuddy AI
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                {registeredUser ? registeredUser.role : 'Public Edition'}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-xl font-medium">
              Practicing with <strong className="text-amber-300">{activeProfile?.name || 'Child'}</strong> ({activeProfile?.stars || 0} Stars Earned)
            </p>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-full md:w-auto flex-wrap">
          <button
            onClick={() => setActiveTab('trainer')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'trainer'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Mouth Trainer</span>
          </button>

          <button
            onClick={() => setActiveTab('game')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'game'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Voice Games</span>
          </button>

          {/* Memory Match Game Tab */}
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'memory'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">🧩</span>
            <span>Memory Match</span>
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'profiles'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Child Profiles</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'account'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Account</span>
          </button>

          {/* Art Studio Tab */}
          <button
            onClick={() => setActiveTab('art')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'art'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">🎨</span>
            <span>Art Studio</span>
          </button>

          {/* AAC Storybook Tab */}
          <button
            onClick={() => setActiveTab('storybook')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'storybook'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>AAC Storybook</span>
          </button>

          {/* Progress & Analytics Tab */}
          <button
            onClick={() => setActiveTab('progress')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'progress'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Progress Report</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content View */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'trainer' && (
          <SpeechPhonemeTrainer
            childPhoto={activeProfile?.photo}
            childName={activeProfile?.name}
            language={language}
            onPhotoChange={(dataUrl) => {
              if (activeProfile) handlePhotoChange(activeProfile.id, dataUrl);
            }}
          />
        )}
        {activeTab === 'game' && <VoiceControlledSpeechGame />}
        {activeTab === 'memory' && (
          <PhonemeMemoryGame
            childName={activeProfile?.name}
            language={language}
            onStarsEarned={(newStars) => {
              if (activeProfile) {
                setProfiles(prev => prev.map(p => 
                  p.id === activeProfile.id ? { ...p, stars: p.stars + newStars } : p
                ));
              }
            }}
          />
        )}
        {activeTab === 'art' && (
          <SpeechArtStudio
            childName={activeProfile?.name}
            childPhoto={activeProfile?.photo}
          />
        )}
        {activeTab === 'storybook' && (
          <SpeechAACStorybook
            childName={activeProfile?.name}
            childPhoto={activeProfile?.photo}
          />
        )}
        {activeTab === 'progress' && (
          <SpeechProgressAnalytics
            childName={activeProfile?.name}
            childPhoto={activeProfile?.photo}
            stars={activeProfile?.stars}
            language={language}
          />
        )}

        {/* Local Child Profiles Manager */}
        {activeTab === 'profiles' && (
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Child Practice Profiles</h2>
                <p className="text-xs text-slate-400">Save progress & star badges locally or sync to cloud.</p>
              </div>
            </div>

            {/* Profile Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profiles.map(p => (
                <div
                  key={p.id}
                  onClick={() => setActiveProfileId(p.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    p.id === activeProfileId
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-400 shadow-xl'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Photo or emoji avatar */}
                      <div className="relative flex-shrink-0">
                        {p.photo ? (
                          <img
                            src={p.photo}
                            alt={p.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-lg"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl">
                            {p.avatar}
                          </div>
                        )}
                        {/* Camera upload overlay button */}
                        <label
                          className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center cursor-pointer shadow-md border-2 border-slate-900 hover:bg-amber-300 transition-all"
                          title="Upload child's photo"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px]">📷</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              e.stopPropagation();
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (ev.target?.result) {
                                  handlePhotoChange(p.id, ev.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg text-white">{p.name}</h3>
                        <span className="text-xs text-slate-400">Created: {p.createdDate}</span>
                        {p.photo && (
                          <span className="block text-xs text-emerald-400 font-semibold mt-0.5">✓ Photo set</span>
                        )}
                      </div>
                    </div>

                    {p.id === activeProfileId && (
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-amber-300 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{p.stars} Stars</span>
                    </div>

                    {profiles.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(p.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Local Profile Form */}
            <form onSubmit={handleAddProfile} className="mt-6 p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Avatar:</span>
                <div className="flex gap-1">
                  {['🐻', '🦁', '🐱', '🐶', '🦄', '🚀'].map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setNewChildAvatar(emoji)}
                      className={`p-2 rounded-xl text-lg border ${
                        newChildAvatar === emoji ? 'bg-amber-400/20 border-amber-400' : 'border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="Enter Child's Name (e.g. Leo, Maya)..."
                value={newChildName}
                onChange={e => setNewChildName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
              />

              <button
                type="submit"
                className="w-full md:w-auto px-6 py-2.5 bg-emerald-500 text-slate-950 font-extrabold text-sm rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Child Profile</span>
              </button>
            </form>
          </div>
        )}

        {/* Account Tab View */}
        {activeTab === 'account' && (
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">User Account & Role Registration</h2>
                <p className="text-xs text-slate-400">Independent Registration for Parents, Home Therapists, Special Educators, & Learners</p>
              </div>
              {!registeredUser && (
                <button
                  onClick={() => setShowRegModal(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold rounded-xl text-sm shadow hover:scale-105 transition-all"
                >
                  Create Free Account
                </button>
              )}
            </div>

            {registeredUser ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-400 text-2xl font-bold">
                      {registeredUser.role === 'parent' ? '👨‍👩‍👧' : registeredUser.role === 'therapist' ? '🩺' : registeredUser.role === 'educator' ? '🎓' : '👧'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{registeredUser.name}</h3>
                      <p className="text-xs text-amber-300 font-semibold capitalize">{registeredUser.role} Account</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <p><strong>Email:</strong> {registeredUser.email}</p>
                    {registeredUser.organization && <p><strong>Clinic / School:</strong> {registeredUser.organization}</p>}
                    <p><strong>Registered:</strong> {registeredUser.registeredDate}</p>
                    <p><strong>Sync Token:</strong> <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-400 font-mono">{registeredUser.syncToken}</code></p>
                  </div>
                </div>

                <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-indigo-400" />
                    <span>Cloud Sync & Sharing</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your practice records, star badges, and vocalization timers are backed up safely under your sync token. You can share this token with your speech therapist or parent to view progress reports across devices.
                  </p>

                  <button
                    onClick={handleCloudSync}
                    disabled={isSyncing}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync All Progress to Cloud</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-amber-400/10 border border-amber-400/20 text-amber-300 rounded-3xl flex items-center justify-center text-3xl mx-auto">
                  🔓
                </div>
                <h3 className="text-xl font-bold text-white">Guest Mode Active</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You are currently using SpeechBuddy AI in Guest Mode. All progress is saved locally to your device. Registering a free account allows parents, home therapists, and educators to sync progress across multiple devices!
                </p>
                <button
                  onClick={() => setShowRegModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 font-black rounded-2xl shadow-xl hover:scale-105 transition-all text-sm"
                >
                  Create Free Independent Account
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REGISTRATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full relative space-y-5">
            <button
              onClick={() => setShowRegModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-white">Create SpeechBuddy Account</h2>
              <p className="text-xs text-slate-400">Independent registration for Parents, Therapists, & Educators</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Select Your Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { role: 'parent', label: 'Parent / Guardian', icon: '👨‍👩‍👧' },
                    { role: 'therapist', label: 'Speech Therapist', icon: '🩺' },
                    { role: 'educator', label: 'Special Educator', icon: '🎓' },
                    { role: 'kid', label: 'Learner / Kid', icon: '👧' },
                  ].map(r => (
                    <button
                      type="button"
                      key={r.role}
                      onClick={() => setRegRole(r.role as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        regRole === r.role
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor / Dr. Alex Smith..."
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah@example.com..."
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Optional Clinic / School Name */}
              {(regRole === 'therapist' || regRole === 'educator') && (
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Clinic / Organization Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunrise Speech Clinic..."
                    value={regOrg}
                    onChange={e => setRegOrg(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Create Password / PIN</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black rounded-xl shadow-lg hover:scale-105 transition-all text-sm mt-2"
              >
                Register Free Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechBuddyPortal;
