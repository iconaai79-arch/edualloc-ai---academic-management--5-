import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Mic, MicOff, Play, RefreshCw, Award, Star, Eye, Shield, Sparkles, 
  HelpCircle, VolumeX, FastForward, CheckCircle2, Heart, Smile, Info, ChevronRight,
  Zap, Flame, Settings, Layers, Music, ArrowRight
} from 'lucide-react';
import { unlockAndroidAudio, speakSpeechBuddyText } from '../utils/androidAudioHelper';

// Phoneme Definition Interface
interface PhonemeData {
  id: string;
  symbol: string;
  name: string;
  category: 'Bilabial' | 'Labiodental' | 'Alveolar' | 'Fricative' | 'Liquid' | 'Vowel';
  description: string;
  tipForParents: string;
  mouthShape: {
    lipHeight: number;      // 0 (closed) to 100 (wide open)
    lipWidth: number;       // 0 (narrow/puckered) to 100 (wide smile)
    lipRounding: number;    // 0 (flat) to 100 (O shape)
    teethVisibleTop: number; // 0 to 100
    teethVisibleBottom: number; // 0 to 100
    tongueVisible: boolean;
    tongueHeight: number;   // 0 (floor) to 100 (roof)
    tongueForward: number;  // 0 (back) to 100 (sticking out/front)
  };
  sampleWords: { word: string; icon: string; highlight: string }[];
}

const PHONEME_DATASET: PhonemeData[] = [
  {
    id: 'b-sound',
    symbol: '/b/',
    name: 'Bouncing "B" Sound',
    category: 'Bilabial',
    description: 'Press lips softly together, then gently pop them open with air!',
    tipForParents: 'Ask your child to pretend popping tiny bubbles with their lips.',
    mouthShape: {
      lipHeight: 15,
      lipWidth: 50,
      lipRounding: 10,
      teethVisibleTop: 10,
      teethVisibleBottom: 0,
      tongueVisible: false,
      tongueHeight: 10,
      tongueForward: 30,
    },
    sampleWords: [
      { word: 'Ball', icon: '⚽', highlight: 'B' },
      { word: 'Bear', icon: '🐻', highlight: 'B' },
      { word: 'Baby', icon: '👶', highlight: 'B' },
    ]
  },
  {
    id: 'm-sound',
    symbol: '/m/',
    name: 'Humming "M" Sound',
    category: 'Bilabial',
    description: 'Keep lips gently closed and make a warm humming sound like yummy food!',
    tipForParents: 'Say "Mmmmm! Delicious!" together while touching lips to feel the vibration.',
    mouthShape: {
      lipHeight: 2,
      lipWidth: 55,
      lipRounding: 0,
      teethVisibleTop: 0,
      teethVisibleBottom: 0,
      tongueVisible: false,
      tongueHeight: 20,
      tongueForward: 40,
    },
    sampleWords: [
      { word: 'Mama', icon: '👩', highlight: 'M' },
      { word: 'Moon', icon: '🌙', highlight: 'M' },
      { word: 'Milk', icon: '🥛', highlight: 'M' },
    ]
  },
  {
    id: 'f-sound',
    symbol: '/f/',
    name: 'Breezy "F" Sound',
    category: 'Labiodental',
    description: 'Rest upper teeth gently on your bottom lip and blow soft wind!',
    tipForParents: 'Call it the "Bunny Teeth" sound. Put a feather near the mouth to watch it move.',
    mouthShape: {
      lipHeight: 25,
      lipWidth: 45,
      lipRounding: 5,
      teethVisibleTop: 65,
      teethVisibleBottom: 0,
      tongueVisible: false,
      tongueHeight: 15,
      tongueForward: 30,
    },
    sampleWords: [
      { word: 'Fish', icon: '🐟', highlight: 'F' },
      { word: 'Fox', icon: '🦊', highlight: 'F' },
      { word: 'Feather', icon: '🪶', highlight: 'F' },
    ]
  },
  {
    id: 't-sound',
    symbol: '/t/',
    name: 'Tapping "T" Sound',
    category: 'Alveolar',
    description: 'Tap the tip of your tongue behind your top front teeth and pop!',
    tipForParents: 'Pretend the tongue is a clock ticking: "T-T-T-Tock!"',
    mouthShape: {
      lipHeight: 35,
      lipWidth: 60,
      lipRounding: 0,
      teethVisibleTop: 50,
      teethVisibleBottom: 30,
      tongueVisible: true,
      tongueHeight: 85,
      tongueForward: 70,
    },
    sampleWords: [
      { word: 'Tiger', icon: '🐯', highlight: 'T' },
      { word: 'Tree', icon: '🌳', highlight: 'T' },
      { word: 'Turtle', icon: '🐢', highlight: 'T' },
    ]
  },
  {
    id: 's-sound',
    symbol: '/s/',
    name: 'Snake "S" Sound',
    category: 'Fricative',
    description: 'Bring teeth close together, smile, and stream air like a friendly snake!',
    tipForParents: 'Draw a squiggly snake in the air while sustaining the "Sssss" sound.',
    mouthShape: {
      lipHeight: 20,
      lipWidth: 75,
      lipRounding: 0,
      teethVisibleTop: 70,
      teethVisibleBottom: 60,
      tongueVisible: true,
      tongueHeight: 65,
      tongueForward: 60,
    },
    sampleWords: [
      { word: 'Sun', icon: '☀️', highlight: 'S' },
      { word: 'Star', icon: '⭐', highlight: 'S' },
      { word: 'Snake', icon: '🐍', highlight: 'S' },
    ]
  },
  {
    id: 'l-sound',
    symbol: '/l/',
    name: 'Lifting "L" Sound',
    category: 'Liquid',
    description: 'Open your mouth and lift the tip of your tongue high to the roof of your mouth!',
    tipForParents: 'Sing "La-La-La" together while watching tongue placement in a mirror.',
    mouthShape: {
      lipHeight: 55,
      lipWidth: 65,
      lipRounding: 0,
      teethVisibleTop: 60,
      teethVisibleBottom: 40,
      tongueVisible: true,
      tongueHeight: 90,
      tongueForward: 75,
    },
    sampleWords: [
      { word: 'Lion', icon: '🦁', highlight: 'L' },
      { word: 'Lemon', icon: '🍋', highlight: 'L' },
      { word: 'Leaf', icon: '🍃', highlight: 'L' },
    ]
  },
  {
    id: 'ah-sound',
    symbol: '/ah/',
    name: 'Open "AH" Vowel',
    category: 'Vowel',
    description: 'Open your mouth wide like you are getting checked by a friendly doctor!',
    tipForParents: 'Great for practicing vocal resonance and breath support.',
    mouthShape: {
      lipHeight: 85,
      lipWidth: 50,
      lipRounding: 20,
      teethVisibleTop: 40,
      teethVisibleBottom: 40,
      tongueVisible: true,
      tongueHeight: 10,
      tongueForward: 30,
    },
    sampleWords: [
      { word: 'Apple', icon: '🍎', highlight: 'A' },
      { word: 'Ahoy', icon: '⚓', highlight: 'A' },
      { word: 'Alligator', icon: '🐊', highlight: 'A' },
    ]
  },
  {
    id: 'oo-sound',
    symbol: '/oo/',
    name: 'Puckered "OO" Vowel',
    category: 'Vowel',
    description: 'Pucker your lips tightly into a tiny circle like an owl hooting!',
    tipForParents: 'Pretend to blow a kiss or blow bubbles to strengthen lip rounding muscles.',
    mouthShape: {
      lipHeight: 30,
      lipWidth: 20,
      lipRounding: 90,
      teethVisibleTop: 10,
      teethVisibleBottom: 10,
      tongueVisible: false,
      tongueHeight: 40,
      tongueForward: 20,
    },
    sampleWords: [
      { word: 'Moon', icon: '🌕', highlight: 'OO' },
      { word: 'Boot', icon: '👢', highlight: 'OO' },
      { word: 'Balloon', icon: '🎈', highlight: 'OO' },
    ]
  }
];

interface SpeechPhonemeTrainerProps {
  childPhoto?: string | null;    // base64 data URL of child's photo
  childName?: string;             // child's name to display
  language?: 'en' | 'sw';        // 'en' for English, 'sw' for Kiswahili
  onPhotoChange?: (dataUrl: string) => void; // callback when photo is uploaded
}

export const SpeechPhonemeTrainer: React.FC<SpeechPhonemeTrainerProps> = ({ childPhoto, childName, language = 'en', onPhotoChange }) => {
  const [selectedPhoneme, setSelectedPhoneme] = useState<PhonemeData>(PHONEME_DATASET[0]);
  const [selectedWord, setSelectedWord] = useState<string>(PHONEME_DATASET[0].sampleWords[0].word);
  const [isSlowMo, setIsSlowMo] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'front' | 'side' | 'dual'>('dual');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [scoreStars, setScoreStars] = useState<number>(12);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const [isAnimatingMouth, setIsAnimatingMouth] = useState<boolean>(false);
  const [mouthProgress, setMouthProgress] = useState<number>(0); // 0 (rest) to 1 (full sound shape)
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Trigger mouth movement animation on demand
  const triggerMouthAnimation = () => {
    setIsAnimatingMouth(true);
    let start = performance.now();
    const duration = isSlowMo ? 2200 : 1100;

    const animate = (time: number) => {
      let elapsed = time - start;
      let progress = (elapsed % duration) / duration;
      // Smooth sinusoidal bounce
      let mouthCycle = Math.sin(progress * Math.PI);
      setMouthProgress(mouthCycle);

      if (elapsed < duration * 2.5) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setMouthProgress(0);
        setIsAnimatingMouth(false);
      }
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Unlock Android Audio on user interaction
  useEffect(() => {
    const handleTouch = () => unlockAndroidAudio();
    window.addEventListener('touchstart', handleTouch, { once: true });
    window.addEventListener('click', handleTouch, { once: true });
    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('click', handleTouch);
    };
  }, []);

  // Text-To-Speech Synthesis (Android & iOS robust support)
  const playSound = (textToSpeak?: string) => {
    unlockAndroidAudio();
    const defaultText = language === 'sw'
      ? `Sauti ya ${selectedPhoneme.symbol.replace(/\//g, '')}, ${selectedWord}`
      : selectedPhoneme.symbol.replace(/\//g, '') + ', ' + selectedWord;
    const text = textToSpeak || defaultText;

    speakSpeechBuddyText(text, {
      lang: language,
      rate: isSlowMo ? 0.6 : 0.9,
      pitch: 1.2,
      onStart: () => triggerMouthAnimation(),
    });
  };

  // Sparkle / Confetti Effect on Canvas
  const triggerParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number }[] = [];
    const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        alpha: 1
      });
    }

    const renderParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity
        p.alpha -= 0.02;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(renderParticles);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    renderParticles();
  };

  // Toggle Microphone & Speech Listener
  const toggleListening = async () => {
    if (isListening) {
      // Stop listening
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setMicVolume(0);
    } else {
      // Start listening
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        // Web Audio API volume meter
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVol = () => {
          if (!micStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          let avg = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round(avg * 1.8)));
          requestAnimationFrame(updateVol);
        };
        updateVol();

        // Web Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = language === 'sw' ? 'sw-KE' : 'en-US';

          rec.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            setRecognizedText(transcript);

            // Check if attempt contains target phoneme sound or sample word
            const targetWord = selectedWord.toLowerCase();
            const targetSymbol = selectedPhoneme.symbol.replace(/\//g, '').toLowerCase();

            if (transcript.includes(targetWord) || transcript.includes(targetSymbol)) {
              setScoreStars(prev => prev + 1);
              setCelebrationMsg(`🌟 Great Job! You pronounced "${selectedWord}"!`);
              triggerParticles();
              setTimeout(() => setCelebrationMsg(null), 3000);
            }
          };

          rec.start();
          recognitionRef.current = rec;
        }

        setIsListening(true);
      } catch (err) {
        console.error('Microphone access error:', err);
        setCelebrationMsg('⚠️ Could not access microphone. Visual trainer is active!');
        setTimeout(() => setCelebrationMsg(null), 3000);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Compute Current Animated Mouth Shape Interpolation
  const currentShape = selectedPhoneme.mouthShape;
  const currentLipHeight = 8 + (currentShape.lipHeight - 8) * mouthProgress;
  const currentLipWidth = 45 + (currentShape.lipWidth - 45) * mouthProgress;
  const currentLipRounding = currentShape.lipRounding * mouthProgress;
  const currentTeethTop = currentShape.teethVisibleTop * mouthProgress;
  const currentTongueHeight = currentShape.tongueHeight * mouthProgress;
  const currentTongueForward = currentShape.tongueForward * mouthProgress;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 font-sans relative overflow-hidden">
      
      {/* Canvas Overlay for Celebrations */}
      <canvas 
        ref={canvasRef} 
        width={1000} 
        height={600} 
        className="absolute inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Header & Accessibility Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
              🗣️
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300">
                SpeechBuddy AI
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-medium">
                Interactive Visual Phoneme & Articulation Trainer for Children
              </p>
            </div>
          </div>
        </div>

        {/* Top Badges & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Star Counter */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-amber-500/30 rounded-2xl shadow-inner text-amber-300 font-bold text-sm">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{scoreStars} Stars</span>
          </div>

          {/* Slow-Motion Toggle */}
          <button
            onClick={() => setIsSlowMo(!isSlowMo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs md:text-sm font-semibold transition-all duration-200 border ${
              isSlowMo 
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/25' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FastForward className={`w-4 h-4 ${isSlowMo ? 'animate-bounce' : ''}`} />
            <span>0.5x Slow-Motion</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
            <button
              onClick={() => setViewMode('front')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'front' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Face
            </button>
            <button
              onClick={() => setViewMode('side')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'side' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              X-Ray Side
            </button>
            <button
              onClick={() => setViewMode('dual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'dual' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual View
            </button>
          </div>
        </div>
      </div>

      {/* Celebration Notification Toast */}
      {celebrationMsg && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm md:text-base animate-bounce border border-emerald-300 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span>{celebrationMsg}</span>
        </div>
      )}

      {/* Main Grid: Sound Selection Deck (Left) & Animated Character Displays (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Left Column: Phoneme Sound Deck */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Select Target Sound</span>
          </h2>

          <div className="grid grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {PHONEME_DATASET.map(phoneme => {
              const isSelected = phoneme.id === selectedPhoneme.id;
              return (
                <button
                  key={phoneme.id}
                  onClick={() => {
                    setSelectedPhoneme(phoneme);
                    setSelectedWord(phoneme.sampleWords[0].word);
                    playSound(phoneme.symbol.replace(/\//g, ''));
                  }}
                  className={`p-3.5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border-amber-500 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800/60 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xl font-black ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                      {phoneme.symbol}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 font-mono">
                      {phoneme.category}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                      {phoneme.name}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sample Word Chips */}
          <div className="mt-2 p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Practice Words for {selectedPhoneme.symbol}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedPhoneme.sampleWords.map(sw => (
                <button
                  key={sw.word}
                  onClick={() => {
                    setSelectedWord(sw.word);
                    playSound(sw.word);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    selectedWord === sw.word
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-105'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-base">{sw.icon}</span>
                  <span>{sw.word}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Animation Canvas (Face & X-Ray Tongue) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Visual Display Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-6 rounded-3xl border border-slate-800 relative shadow-inner min-h-[360px] items-center justify-center">
            
            {/* FRONT FACE ANIMATION VIEW */}
            {(viewMode === 'front' || viewMode === 'dual') && (
              <div className="flex flex-col items-center justify-center relative w-full h-full">
                <span className="absolute top-0 left-0 text-[10px] uppercase font-bold text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  {childPhoto ? `${childName || 'Child'}'s Mouth Trainer` : 'Front Articulation Avatar'}
                </span>

                {/* Animated Face SVG — uses child's real photo when available */}
                <svg className="w-56 h-56 md:w-64 md:h-64 drop-shadow-2xl" viewBox="0 0 200 200">
                  <defs>
                    {/* Circular clip for child's photo */}
                    <clipPath id="face-circle-clip">
                      <circle cx="100" cy="88" r="70" />
                    </clipPath>
                    {/* Clip for just the lower-face area where mouth overlay goes */}
                    <clipPath id="mouth-region-clip">
                      <rect x="30" y="108" width="140" height="70" />
                    </clipPath>
                  </defs>

                  {/* Outer glow ring */}
                  <circle cx="100" cy="88" r="80" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.25" className="animate-pulse" />

                  {childPhoto ? (
                    <>
                      {/* Child's real photo clipped to a circle */}
                      <image
                        href={childPhoto}
                        x="30"
                        y="18"
                        width="140"
                        height="140"
                        clipPath="url(#face-circle-clip)"
                        preserveAspectRatio="xMidYMid slice"
                      />
                      {/* Gold border ring over photo */}
                      <circle cx="100" cy="88" r="70" fill="none" stroke="#F59E0B" strokeWidth="3.5" />
                      {/* Semi-transparent gradient fade at bottom for mouth overlay readability */}
                      <defs>
                        <linearGradient id="mouth-fade" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0F172A" stopOpacity="0" />
                          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.75" />
                        </linearGradient>
                      </defs>
                      <rect x="30" y="108" width="140" height="70" fill="url(#mouth-fade)" clipPath="url(#face-circle-clip)" />
                    </>
                  ) : (
                    <>
                      {/* Default cartoon face when no photo uploaded */}
                      <circle cx="100" cy="88" r="70" fill="#FDE68A" stroke="#F59E0B" strokeWidth="4" />
                      {/* Cheeks */}
                      <circle cx="52" cy="105" r="13" fill="#FCA5A5" opacity="0.6" />
                      <circle cx="148" cy="105" r="13" fill="#FCA5A5" opacity="0.6" />
                      {/* Eyes */}
                      <circle cx="68" cy="72" r="10" fill="#1E293B" />
                      <circle cx="71" cy="69" r="3.5" fill="#FFFFFF" />
                      <circle cx="132" cy="72" r="10" fill="#1E293B" />
                      <circle cx="135" cy="69" r="3.5" fill="#FFFFFF" />
                      {/* Eyebrows */}
                      <path d="M 55 58 Q 68 52 80 57" fill="none" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
                      <path d="M 120 57 Q 132 52 145 58" fill="none" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
                      {/* Nose */}
                      <path d="M 97 82 Q 100 88 103 82" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
                    </>
                  )}

                  {/* ── ANIMATED MOUTH OVERLAY (always shown on top) ── */}
                  <g transform="translate(100, 128)">
                    {/* Dark Mouth Cavity */}
                    <ellipse
                      cx="0"
                      cy="0"
                      rx={currentLipWidth * 0.4}
                      ry={currentLipHeight * 0.35}
                      fill="#450A0A"
                      stroke="#881337"
                      strokeWidth="2"
                    />

                    {/* Tongue inside mouth */}
                    {currentShape.tongueVisible && (
                      <path
                        d={`M ${-currentLipWidth * 0.25} ${currentLipHeight * 0.1} Q 0 ${-currentTongueHeight * 0.3} ${currentLipWidth * 0.25} ${currentLipHeight * 0.1}`}
                        fill="#EC4899"
                        stroke="#BE185D"
                        strokeWidth="2"
                      />
                    )}

                    {/* Top Teeth */}
                    {currentTeethTop > 10 && (
                      <rect
                        x={-currentLipWidth * 0.28}
                        y={-currentLipHeight * 0.3}
                        width={currentLipWidth * 0.56}
                        height={Math.min(10, currentTeethTop * 0.15)}
                        rx="2"
                        fill="#FFFFFF"
                        stroke="#E2E8F0"
                        strokeWidth="1"
                      />
                    )}

                    {/* Lips (Upper & Lower) */}
                    <path
                      d={`M ${-currentLipWidth * 0.45} 0 Q 0 ${-currentLipHeight * 0.4 - (currentLipRounding * 0.1)} ${currentLipWidth * 0.45} 0`}
                      fill="none"
                      stroke="#E11D48"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${-currentLipWidth * 0.45} 0 Q 0 ${currentLipHeight * 0.4 + (currentLipRounding * 0.1)} ${currentLipWidth * 0.45} 0`}
                      fill="none"
                      stroke="#E11D48"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>

                {childPhoto ? (
                  <p className="text-xs font-bold text-amber-300 mt-2">
                    {selectedPhoneme.symbol} — {childName || 'Child'}'s Mouth Trainer
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <p className="text-xs text-slate-400">{selectedPhoneme.symbol} Mouth Shape</p>
                    {onPhotoChange && (
                      <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all">
                        📷 <span>Add Child's Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                onPhotoChange(ev.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* X-RAY SIDE PROFILE ANATOMICAL DIAGRAM */}
            {(viewMode === 'side' || viewMode === 'dual') && (
              <div className="flex flex-col items-center justify-center relative w-full h-full border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-4">
                <span className="absolute top-0 left-0 text-[10px] uppercase font-bold text-emerald-400/80 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  X-Ray Tongue Placement
                </span>

                <svg className="w-56 h-56 md:w-64 md:h-64" viewBox="0 0 200 200">
                  {/* Head Contour outline */}
                  <path d="M 40 40 Q 120 10 160 50 Q 180 90 155 130 L 135 135 L 140 170" fill="none" stroke="#334155" strokeWidth="3" strokeDasharray="4 4" />

                  {/* Upper Jaw & Alveolar Ridge */}
                  <path d="M 80 85 Q 110 85 130 95 L 130 105" fill="none" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Top Teeth */}
                  <rect x="126" y="98" width="6" height="12" fill="#FFFFFF" stroke="#475569" strokeWidth="1" rx="1" />

                  {/* Lower Jaw */}
                  <path d="M 80 145 L 125 145 L 125 130" fill="none" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                  {/* Bottom Teeth */}
                  <rect x="122" y="120" width="6" height="10" fill="#FFFFFF" stroke="#475569" strokeWidth="1" rx="1" />

                  {/* Lips Profile */}
                  {/* Upper Lip */}
                  <path d={`M 132 95 Q ${142 + currentLipRounding * 0.1} ${98 + currentLipHeight * 0.05} 136 ${105}`} fill="none" stroke="#E11D48" strokeWidth="5" strokeLinecap="round" />
                  {/* Lower Lip */}
                  <path d={`M 132 125 Q ${142 + currentLipRounding * 0.1} ${122 - currentLipHeight * 0.05} 128 ${115}`} fill="none" stroke="#E11D48" strokeWidth="5" strokeLinecap="round" />

                  {/* Dynamic Tongue Body (Bezier morphing based on tongueHeight and tongueForward) */}
                  <path
                    d={`M 75 140 Q 90 ${135 - currentTongueHeight * 0.4} ${100 + currentTongueForward * 0.35} ${130 - currentTongueHeight * 0.45} Q ${115 + currentTongueForward * 0.2} ${125 - currentTongueHeight * 0.3} 118 138 Z`}
                    fill="#EC4899"
                    opacity="0.85"
                    stroke="#F472B6"
                    strokeWidth="3"
                  />

                  {/* Contact Arrow Indicator */}
                  {currentTongueHeight > 50 && (
                    <g className="animate-bounce">
                      <path d="M 115 75 L 115 88" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                      <polygon points="115,92 110,84 120,84" fill="#10B981" />
                    </g>
                  )}
                </svg>

                <p className="text-xs font-bold text-emerald-400 mt-2">
                  Tongue Contact Point
                </p>
              </div>
            )}
          </div>

          {/* Interactive Articulation Instructions & Parent Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Step-by-Step Guidance */}
            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>How to Make the Sound</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {selectedPhoneme.description}
              </p>
            </div>

            {/* Parent & Therapist Tip */}
            <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-900/50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                <Heart className="w-4 h-4 text-pink-400" />
                <span>Playful Tip for Parents</span>
              </div>
              <p className="text-xs text-indigo-200 leading-relaxed">
                {selectedPhoneme.tipForParents}
              </p>
            </div>
          </div>

          {/* Action Toolbar: Play Sound, AI Mic Listen, Volume Meter */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            
            {/* Play Sound Button */}
            <button
              onClick={() => playSound()}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Volume2 className="w-5 h-5 fill-slate-950" />
              <span>Demonstrate Sound ({selectedPhoneme.symbol})</span>
            </button>

            {/* AI Speech Listener Microphone Toggle */}
            <button
              onClick={toggleListening}
              className={`w-full md:w-auto px-6 py-3.5 font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm border ${
                isListening
                  ? 'bg-rose-600 border-rose-400 text-white shadow-rose-600/30 animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  <span>Listening... (Tap to Stop)</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>Practice with AI Microphone</span>
                </>
              )}
            </button>

            {/* Mic Intensity / Pitch Meter */}
            <div className="flex items-center gap-3 w-full md:w-48 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400">Mic</span>
              <div className="flex-1 bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 h-full rounded-full transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                />
              </div>
            </div>
          </div>

          {/* Real-time Recognized Speech Display */}
          {isListening && (
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-mono">
                AI Heard: <strong className="text-amber-300">{recognizedText || 'Waiting for child to speak sound or word...'}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechPhonemeTrainer;
