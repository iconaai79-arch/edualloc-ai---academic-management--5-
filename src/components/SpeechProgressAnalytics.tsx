import React, { useState } from 'react';
import { 
  TrendingUp, Award, Calendar, Clock, Star, Activity, CheckCircle2, 
  AlertCircle, Download, Printer, User, Flame, Sparkles, BarChart2, FileText
} from 'lucide-react';

interface PhonemeProgress {
  symbol: string;
  name: string;
  attempts: number;
  accuracy: number; // 0 - 100%
  status: 'mastered' | 'developing' | 'needs_practice';
}

interface SessionLog {
  id: string;
  date: string;
  activity: string;
  targetSound: string;
  durationMinutes: number;
  accuracy: number;
  starsEarned: number;
}

interface SpeechProgressAnalyticsProps {
  childName?: string;
  childPhoto?: string | null;
  stars?: number;
  language?: 'en' | 'sw';
}

const MOCK_PHONEMES: PhonemeProgress[] = [
  { symbol: '/b/', name: 'Bouncing "B"', attempts: 42, accuracy: 88, status: 'mastered' },
  { symbol: '/m/', name: 'Humming "M"', attempts: 35, accuracy: 85, status: 'mastered' },
  { symbol: '/f/', name: 'Feather "F"', attempts: 28, accuracy: 68, status: 'developing' },
  { symbol: '/s/', name: 'Snake "S"', attempts: 31, accuracy: 62, status: 'developing' },
  { symbol: '/l/', name: 'Lifting "L"', attempts: 18, accuracy: 45, status: 'needs_practice' },
  { symbol: '/ah/', name: 'Open "AH"', attempts: 25, accuracy: 92, status: 'mastered' },
  { symbol: '/oo/', name: 'Moon "OO"', attempts: 15, accuracy: 55, status: 'developing' },
];

const MOCK_LOGS: SessionLog[] = [
  { id: '1', date: 'Today, 4:15 PM', activity: 'Mouth Trainer', targetSound: '/b/ Sound', durationMinutes: 12, accuracy: 90, starsEarned: 5 },
  { id: '2', date: 'Today, 2:30 PM', activity: 'Voice Game (Rocket)', targetSound: 'Vocal Pitch', durationMinutes: 8, accuracy: 85, starsEarned: 4 },
  { id: '3', date: 'Yesterday', activity: 'AAC Storybook', targetSound: '/m/ Sound', durationMinutes: 15, accuracy: 80, starsEarned: 6 },
  { id: '4', date: '2 days ago', activity: 'Art Studio', targetSound: '/f/ Prompt', durationMinutes: 10, accuracy: 75, starsEarned: 3 },
  { id: '5', date: '3 days ago', activity: 'Mouth Trainer', targetSound: '/s/ Sound', durationMinutes: 14, accuracy: 65, starsEarned: 4 },
];

export const SpeechProgressAnalytics: React.FC<SpeechProgressAnalyticsProps> = ({
  childName = 'Child',
  childPhoto,
  stars = 24,
  language = 'en',
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mastered' | 'developing' | 'needs_practice'>('all');

  const filteredPhonemes = MOCK_PHONEMES.filter(p => {
    if (activeFilter === 'all') return true;
    return p.status === activeFilter;
  });

  const totalMinutes = MOCK_LOGS.reduce((acc, log) => acc + log.durationMinutes, 0);
  const avgAccuracy = Math.round(MOCK_PHONEMES.reduce((acc, p) => acc + p.accuracy, 0) / MOCK_PHONEMES.length);
  const streakDays = 5;

  const statusBadge = (status: PhonemeProgress['status']) => {
    switch (status) {
      case 'mastered':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Mastered</span>;
      case 'developing':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Developing</span>;
      case 'needs_practice':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Needs Practice</span>;
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-white font-sans space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl text-2xl shadow-lg shadow-emerald-500/20">
            📊
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300">
              {language === 'sw' ? 'Ripoti ya Maendeleo' : 'Progress & Analytics'}
            </h1>
            <p className="text-xs text-slate-400">
              {language === 'sw' 
                ? `Fuatilia maendeleo ya sauti za ${childName}`
                : `Tracking speech milestones & therapy accuracy for ${childName}`}
            </p>
          </div>
        </div>

        <button
          onClick={handlePrintReport}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 hover:border-emerald-400 text-slate-200 hover:text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow transition-all"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>{language === 'sw' ? 'Chapa Ripoti (PDF)' : 'Print Report (PDF)'}</span>
        </button>
      </div>

      {/* High Level Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Stars */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{stars}</span>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === 'sw' ? 'Nyota Zilizopatikana' : 'Total Stars Earned'}
            </p>
          </div>
        </div>

        {/* Practice Streak */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
            <Flame className="w-6 h-6 fill-orange-400" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{streakDays} Days</span>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === 'sw' ? 'Siku za Mazoezi' : 'Practice Streak'}
            </p>
          </div>
        </div>

        {/* Avg Accuracy */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{avgAccuracy}%</span>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === 'sw' ? 'Wastani wa Usahihi' : 'Avg Speech Accuracy'}
            </p>
          </div>
        </div>

        {/* Practice Time */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{totalMinutes} Mins</span>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === 'sw' ? 'Muda wa Mazoezi' : 'Total Practice Time'}
            </p>
          </div>
        </div>
      </div>

      {/* Phoneme Mastery Table Panel */}
      <div className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">
              {language === 'sw' ? 'Ujuzi wa Sauti (Phoneme Mastery)' : 'Phoneme Sound Mastery Breakdown'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'sw' ? 'Hali ya utamkaji wa kila sauti' : 'Track individual speech sound accuracy & progress status'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['all', 'mastered', 'developing', 'needs_practice'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${
                  activeFilter === f
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Phonemes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPhonemes.map(p => (
            <div key={p.symbol} className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-amber-400 font-mono">{p.symbol}</span>
                  <span className="text-xs font-bold text-slate-200">{p.name}</span>
                </div>
                {statusBadge(p.status)}
              </div>

              {/* Accuracy Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Accuracy Score</span>
                  <span className="font-bold text-white">{p.accuracy}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      p.accuracy >= 80 ? 'bg-emerald-400' : p.accuracy >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${p.accuracy}%` }}
                  />
                </div>
              </div>

              <span className="text-[10px] text-slate-500 block">
                Practiced {p.attempts} times
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Session Logs Panel */}
      <div className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>{language === 'sw' ? 'Kumbukumbu za Mazoezi' : 'Recent Session Logs'}</span>
        </h3>

        <div className="space-y-2">
          {MOCK_LOGS.map(log => (
            <div key={log.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs">
                  {log.durationMinutes}m
                </div>
                <div>
                  <h4 className="font-bold text-white">{log.activity} — <span className="text-amber-300">{log.targetSound}</span></h4>
                  <span className="text-[10px] text-slate-400">{log.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-emerald-400 font-bold">{log.accuracy}% Score</span>
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  +{log.starsEarned}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpeechProgressAnalytics;
