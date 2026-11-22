import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw, Sparkles, ExternalLink, MessageCircle } from 'lucide-react';

interface EduAiPromoVideoPlayerProps {
  videoUrl?: string;
  youtubeEmbedUrl?: string;
  onRegister?: (modId: string) => void;
  onJumpToSimulator?: () => void;
}

const CHAPTERS = [
  {
    id: 'intro',
    time: 0,
    end: 9,
    label: '0:00 Intro',
    eyebrow: 'MEET EDUAI AUTOMATION',
    eyebrowColor: 'text-cyan-300',
    headline: 'The Autonomous OS\nfor Modern Institutions',
    sub: 'Unify academics, attendance, finance, SACCOs, and operations in one intelligent cloud.',
    bgImage: '/videos/eduai-promo-poster.jpg',
    align: 'left' as const,
    border: 'border-indigo-400/50',
  },
  {
    id: 'timetable',
    time: 9,
    end: 18,
    label: '0:09 Smart Timetable',
    eyebrow: 'SMART TIMETABLE ENGINE',
    eyebrowColor: 'text-purple-300',
    headline: 'Zero-Clash AI Scheduling\n& Instant Noticeboard PDFs',
    sub: 'aSc-familiar Subject Cards, multi-bell schedules, vertical breaks & 1-click PDF printouts.',
    bgImage: '/videos/scene2-smart-timetable.jpg',
    align: 'left' as const,
    border: 'border-purple-400/50',
  },
  {
    id: 'qr',
    time: 18,
    end: 27,
    label: '0:18 Lesson QR',
    eyebrow: 'PER-CLASS LESSON QR ATTENDANCE',
    eyebrowColor: 'text-emerald-300',
    headline: 'Start & End QR Scans\nwith Pre-Planned Topics',
    sub: 'Teachers plan topics in advance, scan Class QR at start & end, and confirm in 1 tap.',
    bgImage: '/videos/scene3-lesson-qr.jpg',
    align: 'left' as const,
    border: 'border-emerald-400/50',
  },
  {
    id: 'finance',
    time: 27,
    end: 36,
    label: '0:27 Finance & SACCO',
    eyebrow: 'CAMPUS FINANCE & AUTOMATION',
    eyebrowColor: 'text-emerald-300',
    headline: 'M-Pesa STK  •  Staff SACCO & Payroll\nStudent Canteen POS  •  Official Stamps',
    sub: 'Instant fee reconciliation, guarantor OTP locks, cashless tuck-shop wallets & rubber stamps.',
    bgImage: '',
    align: 'center' as const,
    border: 'border-cyan-400/50',
  },
  {
    id: 'ecosystem',
    time: 36,
    end: 45,
    label: '0:36 Cloud OS',
    eyebrow: 'ONE UNIFIED CLOUD ECOSYSTEM',
    eyebrowColor: 'text-cyan-300',
    headline: 'Schools  •  Hospitals EHR\nCloud Retail POS  •  Property & SACCOs',
    sub: 'Built for African institutions with offline-resilient dashboards and live SMS/WhatsApp alerts.',
    bgImage: '',
    align: 'center' as const,
    border: 'border-indigo-400/50',
  },
  {
    id: 'cta',
    time: 45,
    end: 54,
    label: '0:45 Contact',
    eyebrow: 'TRY THE LIVE SIMULATOR FREE TODAY',
    eyebrowColor: 'text-emerald-300',
    headline: 'EDUAI AUTOMATION\nportal.eduai.co.ke\nWhatsApp: 0723 348 912',
    sub: 'Register your school free or chat directly with our onboarding team.',
    bgImage: '/videos/eduai-promo-poster.jpg',
    align: 'center' as const,
    border: 'border-emerald-400/60',
  },
];

const TOTAL_DURATION = 54;
const INVIDEO_EXPORT_URL = 'https://invideo.io/@iconaai/eduai-official-youtube-launch-promo/notebook/seq-3.1';

export const EduAiPromoVideoPlayer: React.FC<EduAiPromoVideoPlayerProps> = ({
  videoUrl = '/videos/eduai-official-promo.mp4',
  youtubeEmbedUrl,
  onRegister,
  onJumpToSimulator,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);

  const [useNativeVideo, setUseNativeVideo] = useState<boolean>(!youtubeEmbedUrl);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const activeChapter =
    CHAPTERS.find(c => currentTime >= c.time && currentTime < c.end) || CHAPTERS[CHAPTERS.length - 1];

  // Subtle Web Audio synth loop for the interactive fallback player when unmuted
  const stopFallbackAudio = () => {
    if (musicIntervalRef.current) {
      window.clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const startFallbackAudio = () => {
    if (isMuted || useNativeVideo || youtubeEmbedUrl) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const notes = [220, 261.63, 329.63, 392, 174.61, 220, 261.63, 329.63, 196, 246.94, 293.66, 392];
      let step = 0;
      const playNote = () => {
        if (!audioCtxRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = notes[step % notes.length];
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.48);
        step++;
      };
      playNote();
      musicIntervalRef.current = window.setInterval(playNote, 520);
    } catch (_) {}
  };

  // Interactive fallback timeline ticker (runs only when native MP4 is unavailable)
  useEffect(() => {
    if (useNativeVideo || youtubeEmbedUrl) return;
    if (!isPlaying) {
      stopFallbackAudio();
      return;
    }
    if (!isMuted) startFallbackAudio();
    const id = window.setInterval(() => {
      setCurrentTime(prev => {
        if (prev + 0.1 >= TOTAL_DURATION) {
          setIsPlaying(false);
          return TOTAL_DURATION;
        }
        return +(prev + 0.1).toFixed(1);
      });
    }, 100);
    return () => {
      window.clearInterval(id);
      stopFallbackAudio();
    };
  }, [isPlaying, isMuted, useNativeVideo, youtubeEmbedUrl]);

  useEffect(() => () => stopFallbackAudio(), []);

  const togglePlay = () => {
    if (useNativeVideo && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {
          setUseNativeVideo(false);
          setIsPlaying(true);
        });
      } else {
        videoRef.current.pause();
      }
      return;
    }
    if (currentTime >= TOTAL_DURATION) setCurrentTime(0);
    setIsPlaying(p => !p);
  };

  const seekTo = (sec: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_DURATION, sec));
    setCurrentTime(clamped);
    if (useNativeVideo && videoRef.current) {
      videoRef.current.currentTime = clamped;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    } else if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(m => {
      const next = !m;
      if (useNativeVideo && videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = Math.min(100, (currentTime / TOTAL_DURATION) * 100);

  return (
    <div id="promo-video" className="mt-14 max-w-5xl mx-auto text-left">
      <div className="rounded-[2rem] bg-slate-900/90 border border-indigo-500/35 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Top Cinema Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-cyan-300">
              Official Launch Film • 1080p HD (0:54)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://wa.me/254723348912?text=Hello%20EduAI%2C%20I%20just%20watched%20your%20launch%20video%20and%20would%20like%20a%20demo."
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp 0723 348 912</span>
            </a>
            <a
              href={INVIDEO_EXPORT_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in invideo</span>
            </a>
          </div>
        </div>

        {/* 16:9 Cinema Stage */}
        <div ref={containerRef} className="relative aspect-video w-full bg-[#090D1F] overflow-hidden select-none group">
          {youtubeEmbedUrl ? (
            <iframe
              src={youtubeEmbedUrl}
              title="EduAI Official Launch Promo"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : useNativeVideo ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster="/videos/eduai-promo-poster.jpg"
              playsInline
              muted={isMuted}
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onEnded={() => setIsPlaying(false)}
              onError={() => setUseNativeVideo(false)}
              className="w-full h-full object-cover cursor-pointer"
            />
          ) : (
            /* Animated Interactive 6-Scene Cinema Player (seamless fallback when MP4 isn't bundled locally) */
            <div onClick={togglePlay} className="relative w-full h-full cursor-pointer overflow-hidden">
              <style>{`
                @keyframes eduai-kenburns {
                  0% { transform: scale(1.0) translate(0, 0); }
                  100% { transform: scale(1.11) translate(-1.5%, -1%); }
                }
                @keyframes eduai-aurora {
                  0%, 100% { transform: translate(-8%, -5%) rotate(0deg) scale(1); }
                  50% { transform: translate(8%, 6%) rotate(12deg) scale(1.15); }
                }
              `}</style>

              {activeChapter.bgImage ? (
                <img
                  key={activeChapter.id}
                  src={activeChapter.bgImage}
                  alt={activeChapter.eyebrow}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    animation: isPlaying ? 'eduai-kenburns 9.5s ease-out forwards' : undefined,
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#090D1F] via-[#131C3F] to-[#0B1026]">
                  <div
                    className="absolute -inset-24 opacity-55 blur-3xl"
                    style={{
                      background:
                        activeChapter.id === 'finance'
                          ? 'radial-gradient(circle at 30% 40%, rgba(16,185,129,0.45), transparent 50%), radial-gradient(circle at 75% 60%, rgba(34,211,238,0.4), transparent 50%)'
                          : 'radial-gradient(circle at 35% 35%, rgba(99,102,241,0.5), transparent 50%), radial-gradient(circle at 70% 65%, rgba(168,85,247,0.4), transparent 50%)',
                      animation: isPlaying ? 'eduai-aurora 8s ease-in-out infinite' : undefined,
                    }}
                  />
                </div>
              )}

              {/* Subtle Cinematic Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/40" />

              {/* Animated Glass Content Card */}
              <div
                className={`relative z-10 h-full flex items-center p-6 sm:p-12 ${
                  activeChapter.align === 'center' ? 'justify-center text-center' : 'justify-start text-left'
                }`}
              >
                <div
                  key={activeChapter.id}
                  className={`rounded-3xl bg-slate-950/75 backdrop-blur-md border ${activeChapter.border} p-6 sm:p-8 shadow-2xl transition-all duration-500 ${
                    activeChapter.align === 'center' ? 'max-w-3xl w-full' : 'max-w-xl'
                  }`}
                >
                  <div className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] ${activeChapter.eyebrowColor}`}>
                    {activeChapter.eyebrow}
                  </div>
                  <h3 className="text-xl sm:text-3xl lg:text-4xl font-black text-white mt-2.5 leading-tight whitespace-pre-line">
                    {activeChapter.headline}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-3 font-medium leading-relaxed">
                    {activeChapter.sub}
                  </p>
                  {activeChapter.id === 'cta' && (
                    <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onRegister?.('edu'); }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                      >
                        🚀 Register School Free →
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onJumpToSimulator?.(); }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                      >
                        Try Smart Timetable Demo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Center Big Play Button Overlay when paused */}
          {!youtubeEmbedUrl && !isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Play EduAI Launch Film"
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 hover:bg-slate-950/20 transition-colors cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-indigo-600/95 hover:bg-indigo-500 text-white flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.7)] hover:scale-110 transition-transform border-2 border-white/30">
                <Play className="w-9 h-9 fill-white ml-1" />
              </div>
            </button>
          )}

          {/* Bottom Cinema Controls */}
          {!youtubeEmbedUrl && (
            <div className="absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-4 pt-8 pb-3 space-y-2">
              {/* Scrubbable Progress Bar */}
              <div
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seekTo(ratio * TOTAL_DURATION);
                }}
                className="w-full h-2 rounded-full bg-white/20 cursor-pointer overflow-hidden group/bar"
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 rounded-full transition-all duration-100"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-2.5">
                  <button type="button" onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer" title={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                  <button type="button" onClick={() => seekTo(0)} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer" title="Restart">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer" title={isMuted ? 'Unmute' : 'Mute'}>
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-[11px] font-mono text-slate-300">
                    {formatSec(currentTime)} / {formatSec(TOTAL_DURATION)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                    {activeChapter.eyebrow}
                  </span>
                  <button type="button" onClick={handleFullscreen} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer" title="Fullscreen">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Chapter Jump Bar */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0 flex items-center gap-1 pr-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Chapters:
          </span>
          {CHAPTERS.map(ch => {
            const isCurrent = activeChapter.id === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => seekTo(ch.time)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
