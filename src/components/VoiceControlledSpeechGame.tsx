import React, { useState, useEffect, useRef } from 'react';
import { 
  Rocket, Flame, Star, Trophy, Mic, MicOff, Volume2, Sparkles, RefreshCw, 
  Settings, Award, Heart, Play, Pause, Compass, Feather, Zap, Smile, ChevronRight,
  Flower2, Wind
} from 'lucide-react';

export const VoiceControlledSpeechGame: React.FC = () => {
  const [gameMode, setGameMode] = useState<'rocket' | 'balloon' | 'flower'>('rocket');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [sensitivity, setSensitivity] = useState<'gentle' | 'normal' | 'strong'>('normal');
  const [targetSound, setTargetSound] = useState<string>('/ah/');
  
  // Game State
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(120);
  const [starsCollected, setStarsCollected] = useState<number>(0);
  const [sustainedSeconds, setSustainedSeconds] = useState<number>(0);
  const [bestSustained, setBestSustained] = useState<number>(3.4);
  const [gameMessage, setGameMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Game Physics State (in Ref for fast 60fps loop)
  const gameStateRef = useRef({
    rocketY: 350,
    rocketVY: 0,
    balloonY: 300,
    balloonVY: 0,
    flowerScale: 0.2,
    stars: [] as { x: number; y: number; size: number; collected: boolean }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number }[],
    clouds: [] as { x: number; y: number; speed: number; size: number }[],
    soundDurationStart: null as number | null,
    volumeHistory: [] as number[],
  });

  // Sensitivity Multipliers
  const getSensitivityMultiplier = () => {
    switch (sensitivity) {
      case 'gentle': return 3.5;  // For soft/low-volume voices
      case 'normal': return 2.0;
      case 'strong': return 1.2;  // For louder voices
    }
  };

  // Initialize Game Canvas Objects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Generate random floating stars
    const newStars = [];
    for (let i = 0; i < 15; i++) {
      newStars.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: Math.random() * (canvas.height - 150) + 50,
        size: Math.random() * 8 + 12,
        collected: false,
      });
    }

    // Generate background clouds
    const newClouds = [];
    for (let i = 0; i < 5; i++) {
      newClouds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * 200 + 40,
        speed: Math.random() * 0.8 + 0.3,
        size: Math.random() * 30 + 40,
      });
    }

    gameStateRef.current.stars = newStars;
    gameStateRef.current.clouds = newClouds;
  }, [gameMode]);

  // Main 60FPS Game Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const state = gameStateRef.current;
      const mult = getSensitivityMultiplier();
      const effectiveVol = Math.min(100, micVolume * mult);

      // Track Sustained Vocalization Timer
      if (effectiveVol > 15) {
        if (!state.soundDurationStart) {
          state.soundDurationStart = currentTime;
        } else {
          let duration = (currentTime - state.soundDurationStart) / 1000;
          setSustainedSeconds(parseFloat(duration.toFixed(1)));
          if (duration > bestSustained) {
            setBestSustained(parseFloat(duration.toFixed(1)));
          }
        }
      } else {
        state.soundDurationStart = null;
        setSustainedSeconds(0);
      }

      // --- GAME MODE 1: ROCKET LAUNCH ---
      if (gameMode === 'rocket') {
        // Draw Space Sky Background Gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, '#0F172A');
        skyGrad.addColorStop(0.6, '#1E1B4B');
        skyGrad.addColorStop(1, '#311B92');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Rocket Thrust Physics: Volume pushes rocket UP
        const thrustForce = (effectiveVol / 100) * 850;
        const gravity = 400;

        state.rocketVY += (gravity - thrustForce) * dt;
        state.rocketVY *= 0.92; // Damping
        state.rocketY += state.rocketVY * dt;

        // Boundaries
        if (state.rocketY > canvas.height - 70) {
          state.rocketY = canvas.height - 70;
          state.rocketVY = 0;
        }
        if (state.rocketY < 60) {
          state.rocketY = 60;
          state.rocketVY = 0;
        }

        const rocketX = canvas.width / 2;

        // Thrust Flame Effect when vocalizing
        if (effectiveVol > 15) {
          const flameLength = (effectiveVol / 100) * 45 + Math.random() * 10;
          ctx.save();
          ctx.fillStyle = effectiveVol > 60 ? '#EF4444' : '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(rocketX - 12, state.rocketY + 30);
          ctx.lineTo(rocketX + 12, state.rocketY + 30);
          ctx.lineTo(rocketX, state.rocketY + 30 + flameLength);
          ctx.closePath();
          ctx.fill();

          // Flame Spark Particles
          for (let p = 0; p < 2; p++) {
            state.particles.push({
              x: rocketX + (Math.random() - 0.5) * 16,
              y: state.rocketY + 32,
              vx: (Math.random() - 0.5) * 30,
              vy: Math.random() * 100 + 100,
              color: '#FBBF24',
              size: Math.random() * 4 + 2,
              alpha: 1,
            });
          }
          ctx.restore();
        }

        // Draw Rocket Graphic
        ctx.save();
        ctx.translate(rocketX, state.rocketY);
        // Rocket Nose
        ctx.fillStyle = '#EC4899';
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(-18, 0);
        ctx.lineTo(18, 0);
        ctx.fill();
        // Rocket Body
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(-18, 0, 36, 30);
        // Window
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(0, 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Fins
        ctx.fillStyle = '#8B5CF6';
        ctx.beginPath();
        ctx.moveTo(-18, 15);
        ctx.lineTo(-28, 30);
        ctx.lineTo(-18, 30);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, 15);
        ctx.lineTo(28, 30);
        ctx.lineTo(18, 30);
        ctx.fill();
        ctx.restore();

        // Draw Stars & Check Collision
        state.stars.forEach(star => {
          if (!star.collected) {
            ctx.save();
            ctx.fillStyle = '#FBBF24';
            ctx.shadowColor = '#F59E0B';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Collision check with rocket
            const dist = Math.hypot(rocketX - star.x, state.rocketY - star.y);
            if (dist < star.size + 25) {
              star.collected = true;
              setScore(s => s + 50);
              setStarsCollected(c => c + 1);

              // Particle explosion
              for (let k = 0; k < 15; k++) {
                state.particles.push({
                  x: star.x,
                  y: star.y,
                  vx: (Math.random() - 0.5) * 150,
                  vy: (Math.random() - 0.5) * 150,
                  color: '#F59E0B',
                  size: Math.random() * 5 + 3,
                  alpha: 1,
                });
              }
            }
          }
        });
      }

      // --- GAME MODE 2: HOT AIR BALLOON VOYAGE ---
      else if (gameMode === 'balloon') {
        // Sky Background
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, '#38BDF8');
        skyGrad.addColorStop(0.7, '#BAE6FD');
        skyGrad.addColorStop(1, '#F0F9FF');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Move background clouds
        state.clouds.forEach(c => {
          c.x -= c.speed;
          if (c.x < -100) c.x = canvas.width + 100;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
          ctx.arc(c.x + c.size * 0.5, c.y - c.size * 0.2, c.size * 0.7, 0, Math.PI * 2);
          ctx.arc(c.x + c.size * 0.9, c.y, c.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Balloon Physics
        const lift = (effectiveVol / 100) * 600;
        state.balloonVY += (250 - lift) * dt;
        state.balloonVY *= 0.92;
        state.balloonY += state.balloonVY * dt;

        if (state.balloonY > canvas.height - 90) state.balloonY = canvas.height - 90;
        if (state.balloonY < 60) state.balloonY = 60;

        const balloonX = canvas.width / 2;

        // Draw Hot Air Balloon
        ctx.save();
        ctx.translate(balloonX, state.balloonY);
        // Envelope Balloon Stripes
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(0, -20, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.ellipse(0, -20, 18, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.ellipse(0, -20, 8, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Basket Ropes
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.lineTo(-10, 25);
        ctx.moveTo(15, 10);
        ctx.lineTo(10, 25);
        ctx.stroke();
        // Basket
        ctx.fillStyle = '#92400E';
        ctx.fillRect(-12, 25, 24, 18);
        ctx.restore();
      }

      // --- GAME MODE 3: MAGIC FLOWER BLOOMER ---
      else if (gameMode === 'flower') {
        ctx.fillStyle = '#0F766E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sound intensity scales flower bloom size
        const targetScale = 0.2 + (effectiveVol / 100) * 1.3;
        state.flowerScale += (targetScale - state.flowerScale) * 0.1;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + 50;

        // Draw Stem
        ctx.strokeStyle = '#15803D';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.quadraticCurveTo(centerX - 20, centerY + 100, centerX, canvas.height);
        ctx.stroke();

        // Draw Blooming Flower Petals
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(state.flowerScale, state.flowerScale);

        const petalCount = 8;
        for (let p = 0; p < petalCount; p++) {
          ctx.rotate((Math.PI * 2) / petalCount);
          ctx.fillStyle = p % 2 === 0 ? '#F43F5E' : '#FB7185';
          ctx.beginPath();
          ctx.ellipse(0, -60, 25, 55, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Flower Center
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Floating Particles Across All Modes
      state.particles.forEach((p, idx) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 1.2;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          state.particles.splice(idx, 1);
        }
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameMode, micVolume, sensitivity, bestSustained]);

  // Toggle Microphone Stream & Analyser
  const toggleListening = async () => {
    if (isListening) {
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      setIsListening(false);
      setMicVolume(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

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
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          let avg = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round(avg * 2.2)));
          requestAnimationFrame(updateVol);
        };
        updateVol();

        setIsListening(true);
      } catch (err) {
        console.error('Mic error:', err);
        setGameMessage('⚠️ Please allow microphone access to play!');
        setTimeout(() => setGameMessage(null), 3000);
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-2xl shadow-lg text-white">
            <Rocket className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300">
              VoiceQuest Games
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-medium">
              Vocalization & Sustained Sound Interactive Playground
            </p>
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setGameMode('rocket')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              gameMode === 'rocket' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Rocket Launch</span>
          </button>

          <button
            onClick={() => setGameMode('balloon')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              gameMode === 'balloon' ? 'bg-sky-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wind className="w-4 h-4" />
            <span>Hot Air Balloon</span>
          </button>

          <button
            onClick={() => setGameMode('flower')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              gameMode === 'flower' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flower2 className="w-4 h-4" />
            <span>Magic Flower</span>
          </button>
        </div>
      </div>

      {/* Main Game Screen Canvas & Overlay */}
      <div className="relative mt-6 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
        
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          className="w-full h-[380px] md:h-[450px] block"
        />

        {/* Real-time Game HUD Overlays */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          {/* Score & Stars HUD */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl flex items-center gap-2 shadow-lg">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">Score:</span>
              <span className="text-sm font-black text-amber-300">{score}</span>
            </div>

            <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl flex items-center gap-2 shadow-lg">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">Stars:</span>
              <span className="text-sm font-black text-amber-300">{starsCollected}</span>
            </div>
          </div>

          {/* Sustained Sound Timer HUD */}
          <div className="px-4 py-2 bg-indigo-950/80 backdrop-blur-md border border-indigo-700/60 rounded-2xl flex items-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs font-bold text-indigo-300">Sustained Sound:</span>
            <span className="text-sm font-mono font-black text-pink-300">{sustainedSeconds}s</span>
          </div>
        </div>

        {/* Overlay Toast Message */}
        {gameMessage && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-30">
            <div className="bg-slate-900 border border-slate-700 px-6 py-4 rounded-3xl text-center shadow-2xl">
              <p className="text-sm font-bold text-amber-300">{gameMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel: Mic Input, Target Sound, & Voice Sensitivity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        
        {/* Mic Activation Button */}
        <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Microphone Control</span>
            {isListening && <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />}
          </div>

          <button
            onClick={toggleListening}
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg border ${
              isListening
                ? 'bg-rose-600 border-rose-400 text-white shadow-rose-600/30'
                : 'bg-emerald-500 border-emerald-300 text-slate-950 hover:bg-emerald-400'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stop Mic Listener</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Playing with Voice!</span>
              </>
            )}
          </button>
        </div>

        {/* Target Sound Selector */}
        <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Vocal Sound</span>
          <div className="flex items-center gap-2">
            {['/ah/', '/oo/', '/ee/', '/mm/'].map(sound => (
              <button
                key={sound}
                onClick={() => setTargetSound(sound)}
                className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                  targetSound === sound
                    ? 'bg-purple-600 border-purple-400 text-white shadow'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {sound}
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivity Adjustment */}
        <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mic Sensitivity</span>
          <div className="flex items-center gap-2">
            {(['gentle', 'normal', 'strong'] as const).map(sens => (
              <button
                key={sens}
                onClick={() => setSensitivity(sens)}
                className={`flex-1 py-2 capitalize rounded-xl text-xs font-bold border transition-all ${
                  sensitivity === sens
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {sens}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControlledSpeechGame;
