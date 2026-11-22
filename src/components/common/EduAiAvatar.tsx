import React, { useEffect, useId, useRef, useState } from 'react';

export type EduAiAvatarMood = 'idle' | 'waving' | 'thinking' | 'speaking' | 'celebrating';

export interface EduAiAvatarProps {
  mood?: EduAiAvatarMood;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  interactive?: boolean;
  showOrbit?: boolean;
  showStatusDot?: boolean;
  speechBubble?: string;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP: Record<Exclude<EduAiAvatarProps['size'], number | undefined>, number> = {
  xs: 36,
  sm: 48,
  md: 72,
  lg: 112,
  xl: 148,
};

export const EduAiAvatar: React.FC<EduAiAvatarProps> = ({
  mood = 'idle',
  size = 'md',
  interactive = true,
  showOrbit = true,
  showStatusDot = false,
  speechBubble,
  className = '',
  onClick,
}) => {
  const uid = useId().replace(/:/g, '');
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  const containerRef = useRef<HTMLDivElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  const activeMood: EduAiAvatarMood = isHovered && mood === 'idle' ? 'waving' : mood;

  // Natural blinking loop
  useEffect(() => {
    let timeoutId: number;
    const scheduleBlink = () => {
      const delay = 2600 + Math.random() * 2600;
      timeoutId = window.setTimeout(() => {
        setIsBlinking(true);
        window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };
    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Subtle mouse-tracking pupils
  useEffect(() => {
    if (!interactive) return;
    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const maxShift = 2.6;
      const ratio = Math.min(dist / 220, 1);
      setEyeOffset({
        x: (dx / dist) * maxShift * ratio,
        y: (dy / dist) * maxShift * ratio,
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const accentColor =
    activeMood === 'celebrating'
      ? '#34D399'
      : activeMood === 'thinking'
      ? '#FBBF24'
      : activeMood === 'speaking'
      ? '#38BDF8'
      : '#22D3EE';

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={`EduAI Animated Avatar (${activeMood})`}
    >
      <style>{`
        @keyframes eduai-float-${uid} {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4.5px); }
        }
        @keyframes eduai-wave-${uid} {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-22deg); }
          50% { transform: rotate(10deg); }
          75% { transform: rotate(-18deg); }
        }
        @keyframes eduai-tassel-${uid} {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(7deg); }
        }
        @keyframes eduai-orbit-${uid} {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes eduai-eq-${uid} {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        @keyframes eduai-sparkle-${uid} {
          0%, 100% { opacity: 0.25; transform: scale(0.75); }
          50% { opacity: 1; transform: scale(1.18); }
        }
      `}</style>

      {/* Optional Speech Bubble */}
      {speechBubble && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-slate-900/95 border border-indigo-400/40 text-white text-[10px] font-black tracking-wide shadow-xl pointer-events-none z-20">
          {speechBubble}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-indigo-400/40 rotate-45" />
        </div>
      )}

      {/* Ambient Glow */}
      <div
        className="absolute inset-1 rounded-full blur-xl opacity-45 pointer-events-none transition-colors duration-500"
        style={{
          background:
            activeMood === 'celebrating'
              ? 'radial-gradient(circle, rgba(52,211,153,0.75), rgba(99,102,241,0.35), transparent 72%)'
              : activeMood === 'thinking'
              ? 'radial-gradient(circle, rgba(251,191,36,0.65), rgba(99,102,241,0.4), transparent 72%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.75), rgba(34,211,238,0.4), transparent 72%)',
        }}
      />

      <svg
        viewBox="0 0 120 120"
        width={px}
        height={px}
        className="relative z-10 overflow-visible drop-shadow-[0_10px_18px_rgba(79,70,229,0.35)]"
      >
        <defs>
          <linearGradient id={`bodyGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E0E7FF" />
            <stop offset="100%" stopColor="#A5B4FC" />
          </linearGradient>
          <linearGradient id={`visorGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="60%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#090D1F" />
          </linearGradient>
          <linearGradient id={`capGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
          <linearGradient id={`ringGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#818CF8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0.95" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Holographic Orbit Ring */}
        {showOrbit && (
          <g
            style={{
              transformOrigin: '60px 64px',
              animation: `eduai-orbit-${uid} ${activeMood === 'thinking' ? '4.5s' : '11s'} linear infinite`,
            }}
          >
            <ellipse
              cx="60"
              cy="64"
              rx="50"
              ry="17"
              fill="none"
              stroke={`url(#ringGrad-${uid})`}
              strokeWidth="2"
              strokeDasharray="16 8 4 8"
              transform="rotate(-14 60 64)"
            />
            <circle cx="108" cy="54" r="3.2" fill={accentColor} filter={`url(#glow-${uid})`} />
            <circle cx="13" cy="74" r="2.2" fill="#A78BFA" />
          </g>
        )}

        {/* Main Floating Character Group */}
        <g
          style={{
            animation: `eduai-float-${uid} ${activeMood === 'celebrating' ? '1.6s' : '3.2s'} ease-in-out infinite`,
          }}
        >
          {/* Floating Ground Shadow */}
          <ellipse cx="60" cy="109" rx="22" ry="4.5" fill="rgba(15,23,42,0.28)" />

          {/* Torso / Collar */}
          <path
            d="M41 88 C41 81, 79 81, 79 88 L83 98 C83 102, 74 105, 60 105 C46 105, 37 102, 37 98 Z"
            fill={`url(#capGrad-${uid})`}
            stroke="#818CF8"
            strokeWidth="1.2"
          />
          {/* Glowing EduAI Chest Core */}
          <circle cx="60" cy="94.5" r="4.2" fill="#0F172A" stroke={accentColor} strokeWidth="1.4" />
          <circle cx="60" cy="94.5" r="1.9" fill={accentColor} filter={`url(#glow-${uid})`} />

          {/* Left Arm (resting) */}
          <ellipse cx="33" cy="91" rx="5.5" ry="9" transform="rotate(18 33 91)" fill={`url(#bodyGrad-${uid})`} stroke="#818CF8" strokeWidth="1.2" />

          {/* Right Arm (waves when waving or celebrating!) */}
          <g
            style={{
              transformOrigin: '84px 89px',
              animation:
                activeMood === 'waving' || activeMood === 'celebrating'
                  ? `eduai-wave-${uid} 0.9s ease-in-out infinite`
                  : undefined,
            }}
          >
            <ellipse
              cx="89"
              cy={activeMood === 'waving' || activeMood === 'celebrating' ? '82' : '91'}
              rx="5.5"
              ry="9.5"
              transform={
                activeMood === 'waving' || activeMood === 'celebrating'
                  ? 'rotate(-42 89 82)'
                  : 'rotate(-18 89 91)'
              }
              fill={`url(#bodyGrad-${uid})`}
              stroke="#818CF8"
              strokeWidth="1.2"
            />
          </g>

          {/* Side Ear Pods */}
          <rect x="24" y="54" width="7" height="16" rx="3.5" fill="#4F46E5" stroke="#A5B4FC" strokeWidth="1" />
          <rect x="89" y="54" width="7" height="16" rx="3.5" fill="#4F46E5" stroke="#A5B4FC" strokeWidth="1" />
          <circle cx="27.5" cy="62" r="1.8" fill={accentColor} />
          <circle cx="92.5" cy="62" r="1.8" fill={accentColor} />

          {/* Head Shell */}
          <rect
            x="29"
            y="36"
            width="62"
            height="48"
            rx="22"
            fill={`url(#bodyGrad-${uid})`}
            stroke="#C7D2FE"
            strokeWidth="1.6"
          />

          {/* Face Visor */}
          <rect
            x="36"
            y="45"
            width="48"
            height="31"
            rx="13"
            fill={`url(#visorGrad-${uid})`}
            stroke="#6366F1"
            strokeWidth="1.4"
          />

          {/* Visor Glass Reflection */}
          <path
            d="M42 49 Q60 46 78 49"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Eyes Group (tracks cursor slightly) */}
          <g transform={`translate(${eyeOffset.x.toFixed(2)}, ${eyeOffset.y.toFixed(2)})`} filter={`url(#glow-${uid})`}>
            {activeMood === 'waving' || activeMood === 'celebrating' ? (
              <>
                {/* Happy Curved Eyes */}
                <path
                  d="M44 60 Q49.5 53 55 60"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
                <path
                  d="M65 60 Q70.5 53 76 60"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
              </>
            ) : isBlinking ? (
              <>
                <line x1="44" y1="59" x2="54" y2="59" stroke={accentColor} strokeWidth="2.8" strokeLinecap="round" />
                <line x1="66" y1="59" x2="76" y2="59" stroke={accentColor} strokeWidth="2.8" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Expressive Glowing LED Eyes */}
                <rect x="44.5" y="53.5" width="9.5" height="11" rx="4.5" fill={accentColor} />
                <rect x="66" y="53.5" width="9.5" height="11" rx="4.5" fill={accentColor} />
                {/* Eye Highlights */}
                <circle cx="47.5" cy="56.8" r="1.8" fill="#FFFFFF" />
                <circle cx="69" cy="56.8" r="1.8" fill="#FFFFFF" />
              </>
            )}
          </g>

          {/* Mouth / Voice Equalizer / Thinking Dots */}
          {activeMood === 'speaking' ? (
            <g transform="translate(50, 66)">
              {[0, 4.5, 9, 13.5, 18].map((bx, i) => (
                <rect
                  key={bx}
                  x={bx}
                  y="0"
                  width="2.6"
                  height="7"
                  rx="1.3"
                  fill={accentColor}
                  style={{
                    transformOrigin: `${bx + 1.3}px 3.5px`,
                    animation: `eduai-eq-${uid} ${0.42 + (i % 3) * 0.14}s ease-in-out ${i * 0.08}s infinite`,
                  }}
                />
              ))}
            </g>
          ) : activeMood === 'thinking' ? (
            <g>
              {[52, 60, 68].map((cx, i) => (
                <circle
                  key={cx}
                  cx={cx}
                  cy="70"
                  r="2.1"
                  fill="#FBBF24"
                  style={{
                    transformOrigin: `${cx}px 70px`,
                    animation: `eduai-sparkle-${uid} 0.9s ease-in-out ${i * 0.22}s infinite`,
                  }}
                />
              ))}
            </g>
          ) : (
            <path
              d={activeMood === 'celebrating' ? 'M52 67 Q60 75 68 67' : 'M54 68.5 Q60 73 66 68.5'}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              filter={`url(#glow-${uid})`}
            />
          )}

          {/* Iconic EduAI Graduation Mortarboard Cap */}
          <g>
            {/* Cap Base */}
            <path d="M44 36 L76 36 L73 41 C65 43.5 55 43.5 47 41 Z" fill="#312E81" />
            {/* Diamond Board */}
            <polygon
              points="60,16 93,27 60,38 27,27"
              fill={`url(#capGrad-${uid})`}
              stroke="#A5B4FC"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Cap Top Node */}
            <circle cx="60" cy="26.5" r="2.6" fill="#FBBF24" />
            {/* Animated Golden Tassel */}
            <g
              style={{
                transformOrigin: '86px 29px',
                animation: `eduai-tassel-${uid} 2.6s ease-in-out infinite`,
              }}
            >
              <path d="M60 26.5 Q75 26 86 29 L87 42" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
              <circle cx="87" cy="43.5" r="2.8" fill="#F59E0B" />
            </g>
          </g>

          {/* Celebration / AI Sparkles */}
          {(activeMood === 'celebrating' || activeMood === 'waving' || activeMood === 'thinking') && (
            <g>
              <path
                d="M21 26 L23 31 L28 33 L23 35 L21 40 L19 35 L14 33 L19 31 Z"
                fill={activeMood === 'celebrating' ? '#34D399' : '#38BDF8'}
                style={{
                  transformOrigin: '21px 33px',
                  animation: `eduai-sparkle-${uid} 1.3s ease-in-out infinite`,
                }}
              />
              <path
                d="M99 19 L100.8 23 L105 24.8 L100.8 26.6 L99 30.6 L97.2 26.6 L93 24.8 L97.2 23 Z"
                fill="#FBBF24"
                style={{
                  transformOrigin: '99px 24.8px',
                  animation: `eduai-sparkle-${uid} 1.5s ease-in-out 0.35s infinite`,
                }}
              />
            </g>
          )}
        </g>
      </svg>

      {/* Optional Online Status Dot */}
      {showStatusDot && (
        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full z-20 shadow" />
      )}
    </div>
  );
};
