import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Volume2, Play, RefreshCw, Star, Sparkles, Plus, Trash2, 
  Mic, MicOff, CheckCircle2, ChevronRight, Heart, Smile
} from 'lucide-react';
import { unlockAndroidAudio, speakSpeechBuddyText } from '../utils/androidAudioHelper';

// AAC Symbol Interface
interface AACCard {
  id: string;
  word: string;
  emoji: string;
  category: 'subject' | 'action' | 'descriptor' | 'object';
  phoneme: string;
  color: string;
}

// Pre-built Story Interface
interface Story {
  id: string;
  title: string;
  phonemeFocus: string;
  icon: string;
  bgGradient: string;
  cards: AACCard[];
  storyText: string;
}

// Available AAC Cards Library
const AAC_LIBRARY: AACCard[] = [
  // Subjects
  { id: 'i', word: 'I', emoji: '👦', category: 'subject', phoneme: '/ai/', color: 'bg-blue-500/20 border-blue-400 text-blue-300' },
  { id: 'mama', word: 'Mama', emoji: '👩', category: 'subject', phoneme: '/m/', color: 'bg-blue-500/20 border-blue-400 text-blue-300' },
  { id: 'bear', word: 'Bear', emoji: '🐻', category: 'subject', phoneme: '/b/', color: 'bg-blue-500/20 border-blue-400 text-blue-300' },
  { id: 'fish', word: 'Fish', emoji: '🐟', category: 'subject', phoneme: '/f/', color: 'bg-blue-500/20 border-blue-400 text-blue-300' },

  // Actions
  { id: 'see', word: 'See', emoji: '👀', category: 'action', phoneme: '/s/', color: 'bg-emerald-500/20 border-emerald-400 text-emerald-300' },
  { id: 'want', word: 'Want', emoji: '🖐️', category: 'action', phoneme: '/w/', color: 'bg-emerald-500/20 border-emerald-400 text-emerald-300' },
  { id: 'fly', word: 'Fly', emoji: '🕊️', category: 'action', phoneme: '/f/', color: 'bg-emerald-500/20 border-emerald-400 text-emerald-300' },
  { id: 'bounce', word: 'Bounce', emoji: '⚽', category: 'action', phoneme: '/b/', color: 'bg-emerald-500/20 border-emerald-400 text-emerald-300' },

  // Descriptors
  { id: 'big', word: 'Big', emoji: '🐘', category: 'descriptor', phoneme: '/b/', color: 'bg-amber-500/20 border-amber-400 text-amber-300' },
  { id: 'blue', word: 'Blue', emoji: '🔷', category: 'descriptor', phoneme: '/b/', color: 'bg-amber-500/20 border-amber-400 text-amber-300' },
  { id: 'happy', word: 'Happy', emoji: '😊', category: 'descriptor', phoneme: '/h/', color: 'bg-amber-500/20 border-amber-400 text-amber-300' },
  { id: 'fast', word: 'Fast', emoji: '⚡', category: 'descriptor', phoneme: '/f/', color: 'bg-amber-500/20 border-amber-400 text-amber-300' },

  // Objects
  { id: 'balloon', word: 'Balloon', emoji: '🎈', category: 'object', phoneme: '/b/', color: 'bg-purple-500/20 border-purple-400 text-purple-300' },
  { id: 'moon', word: 'Moon', emoji: '🌙', category: 'object', phoneme: '/m/', color: 'bg-purple-500/20 border-purple-400 text-purple-300' },
  { id: 'sun', word: 'Sun', emoji: '☀️', category: 'object', phoneme: '/s/', color: 'bg-purple-500/20 border-purple-400 text-purple-300' },
  { id: 'star', word: 'Star', emoji: '⭐', category: 'object', phoneme: '/s/', color: 'bg-purple-500/20 border-purple-400 text-purple-300' },
];

// Pre-built Stories
const PREBUILT_STORIES: Story[] = [
  {
    id: 'balloon-story',
    title: 'The Big Blue Balloon',
    phonemeFocus: '/b/ Sound',
    icon: '🎈',
    bgGradient: 'from-blue-600/30 to-purple-600/20 border-blue-500/40',
    cards: [
      AAC_LIBRARY.find(c => c.id === 'i')!,
      AAC_LIBRARY.find(c => c.id === 'see')!,
      AAC_LIBRARY.find(c => c.id === 'big')!,
      AAC_LIBRARY.find(c => c.id === 'blue')!,
      AAC_LIBRARY.find(c => c.id === 'balloon')!,
    ],
    storyText: "I see a big blue balloon bouncing high in the sky!",
  },
  {
    id: 'moon-story',
    title: 'Mama & The Moon',
    phonemeFocus: '/m/ Sound',
    icon: '🌙',
    bgGradient: 'from-amber-600/30 to-rose-600/20 border-amber-500/40',
    cards: [
      AAC_LIBRARY.find(c => c.id === 'mama')!,
      AAC_LIBRARY.find(c => c.id === 'see')!,
      AAC_LIBRARY.find(c => c.id === 'moon')!,
      AAC_LIBRARY.find(c => c.id === 'star')!,
    ],
    storyText: "Mama and I see the bright moon and shiny stars!",
  },
  {
    id: 'fish-story',
    title: 'The Fast Flying Fish',
    phonemeFocus: '/f/ Sound',
    icon: '🐟',
    bgGradient: 'from-emerald-600/30 to-teal-600/20 border-emerald-500/40',
    cards: [
      AAC_LIBRARY.find(c => c.id === 'fish')!,
      AAC_LIBRARY.find(c => c.id === 'fly')!,
      AAC_LIBRARY.find(c => c.id === 'fast')!,
    ],
    storyText: "The happy little fish can fly so fast over the water!",
  }
];

interface SpeechAACStorybookProps {
  childName?: string;
  childPhoto?: string | null;
}

export const SpeechAACStorybook: React.FC<SpeechAACStorybookProps> = ({ childName = 'Child', childPhoto }) => {
  const [selectedStory, setSelectedStory] = useState<Story>(PREBUILT_STORIES[0]);
  const [sentenceStrip, setSentenceStrip] = useState<AACCard[]>(PREBUILT_STORIES[0].cards);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stars, setStars] = useState<number>(15);
  const [toast, setToast] = useState<string | null>(null);
  
  // Microphone Practice State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [spokenText, setSpokenText] = useState<string>('');
  
  // Dynamic mouth shape parameters for synced avatar animation
  const [mouthWidth, setMouthWidth] = useState<number>(45);
  const [mouthHeight, setMouthHeight] = useState<number>(10);
  const [currentWordSpoken, setCurrentWordSpoken] = useState<string>('');

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load selected story cards into strip
  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
    setSentenceStrip(story.cards);
    setActiveCardIndex(null);
  };

  // Add card to sentence strip
  const handleAddCard = (card: AACCard) => {
    if (sentenceStrip.length < 8) {
      setSentenceStrip(prev => [...prev, card]);
    }
  };

  // Remove card from sentence strip
  const handleRemoveCard = (index: number) => {
    setSentenceStrip(prev => prev.filter((_, i) => i !== index));
  };

  // Clear sentence strip
  const handleClearStrip = () => {
    setSentenceStrip([]);
    setActiveCardIndex(null);
  };

  // Play Sentence with Speech Synthesis and Mouth Animation Sync
  const handlePlaySentence = () => {
    if (sentenceStrip.length === 0) return;
    unlockAndroidAudio();
    setIsPlaying(true);
    const fullSentence = sentenceStrip.map(c => c.word).join(' ');

    speakSpeechBuddyText(fullSentence, {
      rate: 0.75,
      pitch: 1.2,
      onBoundary: (event) => {
        if (event.name === 'word') {
          const charIdx = event.charIndex;
          let runningLength = 0;
          for (let i = 0; i < sentenceStrip.length; i++) {
            const w = sentenceStrip[i].word;
            if (charIdx >= runningLength && charIdx < runningLength + w.length + 1) {
              setActiveCardIndex(i);
              setCurrentWordSpoken(w);
              
              // Dynamic mouth morphing based on phoneme focus
              const phon = sentenceStrip[i].phoneme;
              if (phon.includes('b') || phon.includes('m')) {
                setMouthWidth(30);
                setMouthHeight(5);
              } else if (phon.includes('s')) {
                setMouthWidth(55);
                setMouthHeight(8);
              } else if (phon.includes('f')) {
                setMouthWidth(40);
                setMouthHeight(18);
              } else {
                setMouthWidth(50);
                setMouthHeight(25);
              }
              break;
            }
            runningLength += w.length + 1;
          }
        }
      },
      onEnd: () => {
        setIsPlaying(false);
        setActiveCardIndex(null);
        setMouthWidth(45);
        setMouthHeight(10);
        setCurrentWordSpoken('');
        setStars(prev => prev + 1);
        setToast('🌟 Story spoken! +1 Star');
        setTimeout(() => setToast(null), 3000);
      }
    });
  };

  // Toggle Microphone for "Repeat After Me" Practice
  const toggleListening = async () => {
    if (isListening) {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      recognitionRef.current?.stop();
      setIsListening(false);
      setMicVolume(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        analyser.fftSize = 64;
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!micStreamRef.current) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicVolume(Math.min(100, Math.round(avg * 2)));
          requestAnimationFrame(tick);
        };
        tick();

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          const rec = new SR();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';
          rec.onresult = (ev: any) => {
            const transcript = ev.results[ev.results.length - 1][0].transcript;
            setSpokenText(transcript);
            if (transcript.length > 2) {
              setStars(prev => prev + 3);
              setToast(`🌟 Great job speaking! "${transcript}" +3 Stars`);
              setTimeout(() => setToast(null), 3500);
            }
          };
          rec.start();
          recognitionRef.current = rec;
        }
        setIsListening(true);
      } catch (err) {
        setToast('⚠️ Microphone error. Visual story mode remains active!');
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-white font-sans relative overflow-hidden">
      
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
          <div className="p-3 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl text-2xl shadow-lg shadow-blue-500/20">
            📚
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300">
              AAC Storybook
            </h1>
            <p className="text-xs text-slate-400">
              Build picture stories, hear spoken words & watch mouth shapes!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-amber-500/30 rounded-2xl text-amber-300 font-bold text-sm">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
          <span>{stars} Stars</span>
        </div>
      </div>

      {/* Story Selector Cards */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {PREBUILT_STORIES.map(s => (
          <button
            key={s.id}
            onClick={() => handleSelectStory(s)}
            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
              selectedStory.id === s.id
                ? `bg-gradient-to-br ${s.bgGradient} shadow-lg scale-102 border-amber-400`
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl group-hover:scale-110 transition-transform">{s.icon}</span>
              <div>
                <h3 className="font-bold text-sm text-white">{s.title}</h3>
                <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700">
                  {s.phonemeFocus}
                </span>
              </div>
            </div>
            {selectedStory.id === s.id && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
          </button>
        ))}
      </div>

      {/* Interactive Main Display Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Avatar Mouth Articulation View */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-3xl border border-slate-800 relative">
          <span className="absolute top-3 left-3 text-[10px] uppercase font-bold text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {childPhoto ? `${childName}'s Avatar` : 'Mouth Articulation'}
          </span>

          {/* SVG Avatar with Dynamic Mouth Morphing */}
          <svg className="w-48 h-48 drop-shadow-2xl" viewBox="0 0 200 200">
            <defs>
              <clipPath id="aac-face-clip">
                <circle cx="100" cy="90" r="65" />
              </clipPath>
            </defs>

            <circle cx="100" cy="90" r="75" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.3" className="animate-pulse" />

            {childPhoto ? (
              <>
                <image href={childPhoto} x="35" y="25" width="130" height="130" clipPath="url(#aac-face-clip)" preserveAspectRatio="xMidYMid slice" />
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

          {currentWordSpoken && (
            <div className="mt-2 px-3 py-1 bg-amber-400 text-slate-950 font-black text-sm rounded-full animate-bounce">
              "{currentWordSpoken}"
            </div>
          )}

          {/* Repeat After Me Mic Button */}
          <div className="mt-4 w-full">
            <button
              onClick={toggleListening}
              className={`w-full py-2.5 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all ${
                isListening
                  ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                  : 'bg-emerald-500 border-emerald-300 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Listening...' : 'Repeat Story Aloud!'}</span>
            </button>
            {isListening && spokenText && (
              <p className="mt-2 text-center text-xs text-amber-300 font-mono italic">
                "{spokenText}"
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Sentence Builder Strip & Card Deck */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Sentence Builder Strip */}
          <div className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sentence Builder Strip ({sentenceStrip.length}/8)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearStrip}
                  className="px-3 py-1 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold hover:text-white"
                >
                  Clear
                </button>
                <button
                  onClick={handlePlaySentence}
                  disabled={isPlaying || sentenceStrip.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-40 hover:scale-105 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Read Sentence</span>
                </button>
              </div>
            </div>

            {/* Selected Cards Strip Container */}
            <div className="min-h-[90px] p-3 bg-slate-900 rounded-2xl border border-slate-800 flex flex-wrap gap-2.5 items-center">
              {sentenceStrip.length === 0 ? (
                <p className="text-xs text-slate-500 italic mx-auto">Tap picture cards below to build a story sentence!</p>
              ) : (
                sentenceStrip.map((card, idx) => (
                  <div
                    key={`${card.id}-${idx}`}
                    onClick={() => handleRemoveCard(idx)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${card.color} ${
                      activeCardIndex === idx ? 'scale-110 ring-2 ring-amber-400 shadow-xl' : 'hover:scale-105'
                    }`}
                  >
                    <span className="text-2xl">{card.emoji}</span>
                    <span className="text-xs font-bold mt-1 text-white">{card.word}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AAC Picture Card Library Deck */}
          <div className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              AAC Picture Cards (Tap to Add)
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {AAC_LIBRARY.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleAddCard(card)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${card.color} hover:scale-105 hover:border-amber-400`}
                >
                  <span className="text-2xl">{card.emoji}</span>
                  <span className="text-[11px] font-bold mt-1 text-white truncate w-full text-center">
                    {card.word}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SpeechAACStorybook;
