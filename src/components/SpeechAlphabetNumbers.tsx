import React, { useState } from 'react';
import { 
  Sparkles, Volume2, Star, Hash, Type, Play, RefreshCw, CheckCircle2, ArrowRight, Smile, Heart 
} from 'lucide-react';
import { unlockAndroidAudio, speakSpeechBuddyText } from '../utils/androidAudioHelper';

interface LetterItem {
  letter: string;
  phonemeSymbol: string;
  wordEn: string;
  wordSw: string;
  emoji: string;
  color: string;
  mouthWidth: number;
  mouthHeight: number;
}

interface NumberItem {
  num: number;
  wordEn: string;
  wordSw: string;
  emoji: string;
  countIcons: string[];
}

const ALPHABET_DATASET: LetterItem[] = [
  { letter: 'A', phonemeSymbol: '/ah/', wordEn: 'Apple', wordSw: 'Tunda', emoji: '🍎', color: 'from-red-500/20 to-pink-500/10 border-red-500/40 text-red-300', mouthWidth: 55, mouthHeight: 25 },
  { letter: 'B', phonemeSymbol: '/b/', wordEn: 'Ball', wordSw: 'Mpira', emoji: '⚽', color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40 text-blue-300', mouthWidth: 30, mouthHeight: 5 },
  { letter: 'C', phonemeSymbol: '/k/', wordEn: 'Cat', wordSw: 'Paka', emoji: '🐱', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300', mouthWidth: 45, mouthHeight: 15 },
  { letter: 'D', phonemeSymbol: '/d/', wordEn: 'Dog', wordSw: 'Mbwa', emoji: '🐶', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300', mouthWidth: 40, mouthHeight: 12 },
  { letter: 'E', phonemeSymbol: '/eh/', wordEn: 'Elephant', wordSw: 'Tembo', emoji: '🐘', color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/40 text-purple-300', mouthWidth: 50, mouthHeight: 18 },
  { letter: 'F', phonemeSymbol: '/f/', wordEn: 'Fish', wordSw: 'Samaki', emoji: '🐟', color: 'from-teal-500/20 to-cyan-500/10 border-teal-500/40 text-teal-300', mouthWidth: 38, mouthHeight: 18 },
  { letter: 'G', phonemeSymbol: '/g/', wordEn: 'Giraffe', wordSw: 'Twiga', emoji: '🦒', color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/40 text-yellow-300', mouthWidth: 42, mouthHeight: 14 },
  { letter: 'H', phonemeSymbol: '/h/', wordEn: 'House', wordSw: 'Nyumba', emoji: '🏠', color: 'from-rose-500/20 to-red-500/10 border-rose-500/40 text-rose-300', mouthWidth: 48, mouthHeight: 20 },
  { letter: 'I', phonemeSymbol: '/ee/', wordEn: 'Ice Cream', wordSw: 'Iskrimu', emoji: '🍦', color: 'from-pink-500/20 to-purple-500/10 border-pink-500/40 text-pink-300', mouthWidth: 55, mouthHeight: 10 },
  { letter: 'J', phonemeSymbol: '/j/', wordEn: 'Juice', wordSw: 'Juisi', emoji: '🧃', color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-300', mouthWidth: 40, mouthHeight: 14 },
  { letter: 'K', phonemeSymbol: '/k/', wordEn: 'Kite', wordSw: 'Kite/Kipulizo', emoji: '🪁', color: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/40 text-indigo-300', mouthWidth: 45, mouthHeight: 15 },
  { letter: 'L', phonemeSymbol: '/l/', wordEn: 'Lion', wordSw: 'Simba', emoji: '🦁', color: 'from-orange-500/20 to-amber-500/10 border-orange-500/40 text-orange-300', mouthWidth: 50, mouthHeight: 22 },
  { letter: 'M', phonemeSymbol: '/m/', wordEn: 'Moon', wordSw: 'Mwezi', emoji: '🌙', color: 'from-blue-500/20 to-purple-500/10 border-blue-500/40 text-blue-300', mouthWidth: 30, mouthHeight: 5 },
  { letter: 'N', phonemeSymbol: '/n/', wordEn: 'Nest', wordSw: 'Kiota', emoji: '🪹', color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/40 text-emerald-300', mouthWidth: 40, mouthHeight: 10 },
  { letter: 'O', phonemeSymbol: '/oh/', wordEn: 'Owl', wordSw: 'Bundi', emoji: '🦉', color: 'from-amber-500/20 to-red-500/10 border-amber-500/40 text-amber-300', mouthWidth: 35, mouthHeight: 30 },
  { letter: 'P', phonemeSymbol: '/p/', wordEn: 'Pencil', wordSw: 'Penseli', emoji: '✏️', color: 'from-pink-500/20 to-rose-500/10 border-pink-500/40 text-pink-300', mouthWidth: 28, mouthHeight: 4 },
  { letter: 'Q', phonemeSymbol: '/kw/', wordEn: 'Queen', wordSw: 'Malkia', emoji: '👑', color: 'from-purple-500/20 to-amber-500/10 border-purple-500/40 text-purple-300', mouthWidth: 38, mouthHeight: 20 },
  { letter: 'R', phonemeSymbol: '/r/', wordEn: 'Rainbow', wordSw: 'Upinde', emoji: '🌈', color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300', mouthWidth: 42, mouthHeight: 15 },
  { letter: 'S', phonemeSymbol: '/s/', wordEn: 'Sun', wordSw: 'Jua', emoji: '☀️', color: 'from-yellow-500/20 to-orange-500/10 border-yellow-500/40 text-yellow-300', mouthWidth: 55, mouthHeight: 8 },
  { letter: 'T', phonemeSymbol: '/t/', wordEn: 'Tree', wordSw: 'Mti', emoji: '🌳', color: 'from-green-500/20 to-emerald-500/10 border-green-500/40 text-green-300', mouthWidth: 45, mouthHeight: 12 },
  { letter: 'U', phonemeSymbol: '/uh/', wordEn: 'Umbrella', wordSw: 'Mwamvuli', emoji: '☂️', color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-300', mouthWidth: 45, mouthHeight: 25 },
  { letter: 'V', phonemeSymbol: '/v/', wordEn: 'Van', wordSw: 'Gari', emoji: '🚐', color: 'from-blue-500/20 to-teal-500/10 border-blue-500/40 text-blue-300', mouthWidth: 38, mouthHeight: 16 },
  { letter: 'W', phonemeSymbol: '/w/', wordEn: 'Watermelon', wordSw: 'Tikiti', emoji: '🍉', color: 'from-red-500/20 to-emerald-500/10 border-red-500/40 text-red-300', mouthWidth: 32, mouthHeight: 20 },
  { letter: 'X', phonemeSymbol: '/ks/', wordEn: 'Xylophone', wordSw: 'Xylophone', emoji: '🪘', color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-300', mouthWidth: 50, mouthHeight: 10 },
  { letter: 'Y', phonemeSymbol: '/y/', wordEn: 'Yo-Yo', wordSw: 'Yoyo', emoji: '🪀', color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-300', mouthWidth: 40, mouthHeight: 18 },
  { letter: 'Z', phonemeSymbol: '/z/', wordEn: 'Zebra', wordSw: 'Pundamilia', emoji: '🦓', color: 'from-slate-500/20 to-zinc-500/10 border-slate-500/40 text-slate-300', mouthWidth: 50, mouthHeight: 10 },
];

const NUMBER_DATASET: NumberItem[] = [
  { num: 1, wordEn: 'One', wordSw: 'Moja', emoji: '☝️', countIcons: ['⭐'] },
  { num: 2, wordEn: 'Two', wordSw: 'Mbili', emoji: '✌️', countIcons: ['⭐', '⭐'] },
  { num: 3, wordEn: 'Three', wordSw: 'Tatu', emoji: '🤟', countIcons: ['⭐', '⭐', '⭐'] },
  { num: 4, wordEn: 'Four', wordSw: 'Nne', emoji: '🍀', countIcons: ['🎈', '🎈', '🎈', '🎈'] },
  { num: 5, wordEn: 'Five', wordSw: 'Tano', emoji: '🖐️', countIcons: ['🍎', '🍎', '🍎', '🍎', '🍎'] },
  { num: 6, wordEn: 'Six', wordSw: 'Sita', emoji: '🎲', countIcons: ['⚽', '⚽', '⚽', '⚽', '⚽', '⚽'] },
  { num: 7, wordEn: 'Seven', wordSw: 'Saba', emoji: '🌈', countIcons: ['🐟', '🐟', '🐟', '🐟', '🐟', '🐟', '🐟'] },
  { num: 8, wordEn: 'Eight', wordSw: 'Wane/Nane', emoji: '🐙', countIcons: ['🐱', '🐱', '🐱', '🐱', '🐱', '🐱', '🐱', '🐱'] },
  { num: 9, wordEn: 'Nine', wordSw: 'Tisa', emoji: '🎨', countIcons: ['🌻', '🌻', '🌻', '🌻', '🌻', '🌻', '🌻', '🌻', '🌻'] },
  { num: 10, wordEn: 'Ten', wordSw: 'Kumi', emoji: '👐', countIcons: ['🚗', '🚗', '🚗', '🚗', '🚗', '🚗', '🚗', '🚗', '🚗', '🚗'] },
];

interface SpeechAlphabetNumbersProps {
  childName?: string;
  childPhoto?: string | null;
  language?: 'en' | 'sw';
  onStarsEarned?: (stars: number) => void;
}

export const SpeechAlphabetNumbers: React.FC<SpeechAlphabetNumbersProps> = ({
  childName = 'Child',
  childPhoto,
  language = 'en',
  onStarsEarned,
}) => {
  const [activeMode, setActiveMode] = useState<'abc' | 'numbers'>('abc');
  const [selectedLetter, setSelectedLetter] = useState<LetterItem>(ALPHABET_DATASET[0]);
  const [selectedNumber, setSelectedNumber] = useState<NumberItem>(NUMBER_DATASET[0]);
  const [mouthWidth, setMouthWidth] = useState<number>(55);
  const [mouthHeight, setMouthHeight] = useState<number>(25);
  const [stars, setStars] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  // Play Letter Audio & Morph Avatar Mouth
  const handleSelectLetter = (item: LetterItem) => {
    setSelectedLetter(item);
    setMouthWidth(item.mouthWidth);
    setMouthHeight(item.mouthHeight);

    unlockAndroidAudio();
    const word = language === 'sw' ? item.wordSw : item.wordEn;
    const textToSpeak = language === 'sw'
      ? `Herufi ${item.letter}. ${item.letter} kwa ajili ya ${word}. ${word}!`
      : `Letter ${item.letter}. ${item.letter} is for ${word}. ${word}!`;

    speakSpeechBuddyText(textToSpeak, {
      lang: language,
      rate: 0.8,
      pitch: 1.2,
    });

    setStars(s => s + 1);
    onStarsEarned?.(1);
  };

  // Play Number Audio & Count Out Loud
  const handleSelectNumber = (item: NumberItem) => {
    setSelectedNumber(item);
    unlockAndroidAudio();
    const word = language === 'sw' ? item.wordSw : item.wordEn;
    const textToSpeak = language === 'sw'
      ? `Namba ${item.num}. ${word}!`
      : `Number ${item.num}. ${word}!`;

    speakSpeechBuddyText(textToSpeak, {
      lang: language,
      rate: 0.8,
      pitch: 1.2,
    });

    setStars(s => s + 1);
    onStarsEarned?.(1);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-white font-sans space-y-6 relative overflow-hidden">
      
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce border border-amber-300">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-2xl text-2xl shadow-lg shadow-pink-500/20">
            🔤
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300">
              {language === 'sw' ? 'Herufi & Namba' : 'ABCs & Numbers'}
            </h1>
            <p className="text-xs text-slate-400">
              {language === 'sw' ? 'Gusa herufi au namba usikie sauti!' : 'Tap any letter or number to hear sound & mouth shapes!'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveMode('abc')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeMode === 'abc'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>{language === 'sw' ? 'Herufi (A-Z)' : 'ABCs (A-Z)'}</span>
          </button>
          <button
            onClick={() => setActiveMode('numbers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeMode === 'numbers'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>{language === 'sw' ? 'Namba (1-10)' : 'Numbers (1-10)'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Avatar & Selected Detail Card */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between p-6 bg-slate-950 rounded-3xl border border-slate-800 relative space-y-4">
          <span className="absolute top-3 left-3 text-[10px] uppercase font-bold text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {childPhoto ? `${childName}'s Practice` : 'Articulation Avatar'}
          </span>

          {/* SVG Avatar with Dynamic Mouth Morphing */}
          <svg className="w-48 h-48 drop-shadow-2xl" viewBox="0 0 200 200">
            <defs>
              <clipPath id="abc-face-clip">
                <circle cx="100" cy="90" r="65" />
              </clipPath>
            </defs>

            <circle cx="100" cy="90" r="75" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.3" className="animate-pulse" />

            {childPhoto ? (
              <>
                <image href={childPhoto} x="35" y="25" width="130" height="130" clipPath="url(#abc-face-clip)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="100" cy="90" r="65" fill="none" stroke="#F59E0B" strokeWidth="3" />
              </>
            ) : (
              <>
                <circle cx="100" cy="90" r="65" fill="#FDE68A" stroke="#F59E0B" strokeWidth="4" />
                <circle cx="68" cy="78" r="8" fill="#1E293B" />
                <circle cx="132" cy="78" r="8" fill="#1E293B" />
                <path d="M 58 65 Q 68 60 78 65" fill="none" stroke="#B45309" strokeWidth="3" />
                <path d="M 122 65 Q 132 60 142 65" fill="none" stroke="#B45309" strokeWidth="3" />
              </>
            )}

            {/* Dynamic Mouth Group */}
            <g transform="translate(100, 130)">
              <ellipse cx="0" cy="0" rx={mouthWidth * 0.4} ry={mouthHeight * 0.4} fill="#450A0A" stroke="#E11D48" strokeWidth="3" />
              <path d={`M ${-mouthWidth * 0.4} 0 Q 0 ${-mouthHeight * 0.4} ${mouthWidth * 0.4} 0`} fill="none" stroke="#E11D48" strokeWidth="4" />
              <path d={`M ${-mouthWidth * 0.4} 0 Q 0 ${mouthHeight * 0.4} ${mouthWidth * 0.4} 0`} fill="none" stroke="#E11D48" strokeWidth="4" />
            </g>
          </svg>

          {/* Active Detail Showcase */}
          {activeMode === 'abc' ? (
            <div className="w-full p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-2">
              <div className="text-5xl font-black text-amber-400 font-mono">{selectedLetter.letter}</div>
              <div className="text-3xl animate-bounce">{selectedLetter.emoji}</div>
              <h3 className="font-extrabold text-lg text-white">
                {selectedLetter.letter} is for {language === 'sw' ? selectedLetter.wordSw : selectedLetter.wordEn}
              </h3>
              <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 font-mono text-xs font-bold rounded-full border border-amber-500/30">
                Phoneme: {selectedLetter.phonemeSymbol}
              </span>
            </div>
          ) : (
            <div className="w-full p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-3">
              <div className="text-6xl font-black text-amber-400 font-mono">{selectedNumber.num}</div>
              <h3 className="font-extrabold text-xl text-white">
                {language === 'sw' ? selectedNumber.wordSw : selectedNumber.wordEn}
              </h3>
              {/* Visual Counting Objects */}
              <div className="flex flex-wrap gap-2 justify-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                {selectedNumber.countIcons.map((ic, i) => (
                  <span key={i} className="text-2xl animate-pulse">{ic}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Grid of Alphabet or Numbers */}
        <div className="lg:col-span-7">
          {activeMode === 'abc' ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-[450px] overflow-y-auto pr-1">
              {ALPHABET_DATASET.map(item => (
                <button
                  key={item.letter}
                  onClick={() => handleSelectLetter(item)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all bg-gradient-to-br ${item.color} ${
                    selectedLetter.letter === item.letter ? 'scale-110 ring-2 ring-amber-400 shadow-xl' : 'hover:scale-105'
                  }`}
                >
                  <span className="text-2xl font-black font-mono text-white">{item.letter}</span>
                  <span className="text-xl mt-1">{item.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-300 truncate w-full text-center mt-1">
                    {language === 'sw' ? item.wordSw : item.wordEn}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {NUMBER_DATASET.map(item => (
                <button
                  key={item.num}
                  onClick={() => handleSelectNumber(item)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all bg-slate-950 border-slate-800 ${
                    selectedNumber.num === item.num ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-xl' : 'hover:border-slate-700 hover:scale-102'
                  }`}
                >
                  <span className="text-4xl font-black font-mono text-amber-400">{item.num}</span>
                  <span className="text-2xl mt-1">{item.emoji}</span>
                  <span className="text-xs font-bold text-white mt-1">
                    {language === 'sw' ? item.wordSw : item.wordEn}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SpeechAlphabetNumbers;
