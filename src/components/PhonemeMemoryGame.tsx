import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, Star, Trophy, Award, Volume2, CheckCircle2, 
  HelpCircle, Zap, Smile, Heart, Play
} from 'lucide-react';
import { unlockAndroidAudio, speakSpeechBuddyText } from '../utils/androidAudioHelper';

interface CardItem {
  id: string;
  pairId: string;
  phoneme: string;
  labelEn: string;
  labelSw: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface PhonemeMemoryGameProps {
  childName?: string;
  language?: 'en' | 'sw';
  onStarsEarned?: (stars: number) => void;
}

const RAW_PAIRS = [
  { pairId: 'b-bear', phoneme: '/b/', labelEn: 'Bear', labelSw: 'Dubu', emoji: '🐻' },
  { pairId: 'b-balloon', phoneme: '/b/', labelEn: 'Balloon', labelSw: 'Boflo/Kipulizo', emoji: '🎈' },
  { pairId: 'm-moon', phoneme: '/m/', labelEn: 'Moon', labelSw: 'Mwezi', emoji: '🌙' },
  { pairId: 'm-milk', phoneme: '/m/', labelEn: 'Milk', labelSw: 'Maziwa', emoji: '🥛' },
  { pairId: 'f-fish', phoneme: '/f/', labelEn: 'Fish', labelSw: 'Samaki', emoji: '🐟' },
  { pairId: 's-sun', phoneme: '/s/', labelEn: 'Sun', labelSw: 'Jua', emoji: '☀️' },
];

export const PhonemeMemoryGame: React.FC<PhonemeMemoryGameProps> = ({
  childName = 'Child',
  language = 'en',
  onStarsEarned,
}) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [matchesCount, setMatchesCount] = useState<number>(0);
  const [stars, setStars] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  // Initialize and shuffle deck
  const initDeck = () => {
    const deck: CardItem[] = [];
    RAW_PAIRS.forEach((item, idx) => {
      // Card 1: Symbol Card
      deck.push({
        id: `card-${idx}-a`,
        pairId: item.pairId,
        phoneme: item.phoneme,
        labelEn: `${item.phoneme} Sound`,
        labelSw: `Sauti ya ${item.phoneme}`,
        emoji: item.emoji,
        isFlipped: false,
        isMatched: false,
      });

      // Card 2: Word Card
      deck.push({
        id: `card-${idx}-b`,
        pairId: item.pairId,
        phoneme: item.phoneme,
        labelEn: item.labelEn,
        labelSw: item.labelSw,
        emoji: item.emoji,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setMatchesCount(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    initDeck();
  }, []);

  // Text-To-Speech Card Flip Sound (Android robust support)
  const speakText = (text: string) => {
    unlockAndroidAudio();
    speakSpeechBuddyText(text, {
      lang: language,
      rate: 0.85,
      pitch: 1.2,
    });
  };

  // Card Click Handler
  const handleCardClick = (index: number) => {
    if (cards[index].isFlipped || cards[index].isMatched || flippedIndices.length >= 2) return;

    const clickedCard = cards[index];
    const textToSpeak = language === 'sw' ? clickedCard.labelSw : clickedCard.labelEn;
    speakText(textToSpeak);

    const nextFlipped = [...flippedIndices, index];
    setCards(prev => prev.map((c, i) => (i === index ? { ...c, isFlipped: true } : c)));
    setFlippedIndices(nextFlipped);

    // If two cards flipped, check match
    if (nextFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = cards[firstIdx];

      if (firstCard.pairId === clickedCard.pairId) {
        // MATCH!
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === firstIdx || i === index ? { ...c, isMatched: true } : c
          ));
          setFlippedIndices([]);
          setMatchesCount(m => {
            const next = m + 1;
            if (next === RAW_PAIRS.length) {
              setIsGameOver(true);
              setStars(s => s + 5);
              onStarsEarned?.(5);
              speakText(language === 'sw' ? 'Hongera! Umemaliza mchezo!' : 'Congratulations! You matched all phoneme cards!');
            }
            return next;
          });
        }, 600);
      } else {
        // NO MATCH — flip back
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === firstIdx || i === index ? { ...c, isFlipped: false } : c
          ));
          setFlippedIndices([]);
        }, 1200);
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-white font-sans space-y-6 relative overflow-hidden">
      
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
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl text-2xl shadow-lg shadow-amber-500/20">
            🧩
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300">
              {language === 'sw' ? 'Mchezo wa Kumbukumbu ya Sauti' : 'Phoneme Memory Match'}
            </h1>
            <p className="text-xs text-slate-400">
              {language === 'sw' ? 'Geuza kadi upatanishe sauti na picha!' : 'Flip cards to match phonemes & practice words!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300">
            <span>Moves: {moves}</span>
          </div>
          <button
            onClick={initDeck}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 border border-slate-700 hover:border-amber-400 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Game Complete Overlay Banner */}
      {isGameOver && (
        <div className="p-6 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-pink-500/20 rounded-3xl border border-amber-400/50 text-center space-y-3 animate-pulse">
          <div className="text-5xl">🎉 🌟 🐻</div>
          <h2 className="text-2xl font-black text-amber-300">
            {language === 'sw' ? `Hongera Sana, ${childName}!` : `Super Job, ${childName}!`}
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            {language === 'sw' ? `Umekamilisha kadi zote kwa hatua ${moves}!` : `You matched all phoneme pairs in ${moves} moves! +5 Stars Earned!`}
          </p>
          <button
            onClick={initDeck}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            Play Again!
          </button>
        </div>
      )}

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(idx)}
            disabled={card.isMatched}
            className={`h-32 md:h-40 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center p-2 relative shadow-lg ${
              card.isMatched
                ? 'bg-emerald-500/10 border-emerald-400/50 opacity-60 scale-95'
                : card.isFlipped
                ? 'bg-slate-950 border-amber-400 shadow-amber-500/10 scale-105'
                : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-slate-500 hover:scale-102'
            }`}
          >
            {card.isFlipped || card.isMatched ? (
              <>
                <span className="text-3xl md:text-4xl animate-bounce">{card.emoji}</span>
                <span className="text-xs font-black text-amber-300 mt-2 font-mono">
                  {card.phoneme}
                </span>
                <span className="text-[11px] font-bold text-white text-center truncate w-full px-1">
                  {language === 'sw' ? card.labelSw : card.labelEn}
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-40">
                <span className="text-3xl">❓</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tap</span>
              </div>
            )}

            {card.isMatched && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute top-2 right-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PhonemeMemoryGame;
