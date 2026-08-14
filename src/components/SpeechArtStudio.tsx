import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paintbrush, Eraser, Download, Trash2, Undo2, Star, Sparkles,
  Mic, MicOff, Volume2, Save, Image, Palette, Layers, ChevronDown,
  Baby, BookOpen, PenTool, Pencil, Square, Circle, Triangle, Smile
} from 'lucide-react';
import { unlockAndroidAudio, speakSpeechBuddyText } from '../utils/androidAudioHelper';

// ─── Types ───────────────────────────────────────────────────────────────────

type AgeStage = 'playgroup' | 'pp1' | 'pp2' | 'grade1';
type ToolType = 'finger' | 'crayon' | 'brush' | 'pencil' | 'eraser' | 'fill';

interface SavedArtwork {
  id: string;
  title: string;
  dataUrl: string;
  stage: AgeStage;
  phonemePrompt: string;
  createdAt: string;
}

interface PhonemePrompt {
  phoneme: string;
  instruction: string;
  emoji: string;
  color: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<AgeStage, {
  label: string;
  ageRange: string;
  icon: string;
  emoji: string;
  tools: ToolType[];
  colors: string[];
  brushSizes: number[];
  description: string;
  bgGradient: string;
}> = {
  playgroup: {
    label: 'Playgroup',
    ageRange: '2–3 years',
    icon: '🍼',
    emoji: '🍼',
    tools: ['finger', 'eraser'],
    colors: ['#EF4444', '#3B82F6', '#FBBF24'],
    brushSizes: [30, 50],
    description: 'Big fat finger strokes — no rules, just fun!',
    bgGradient: 'from-rose-500/20 to-pink-500/10',
  },
  pp1: {
    label: 'PP1',
    ageRange: '4 years',
    icon: '🖍️',
    emoji: '🖍️',
    tools: ['finger', 'crayon', 'eraser'],
    colors: ['#EF4444', '#3B82F6', '#FBBF24', '#10B981', '#A855F7', '#F97316'],
    brushSizes: [20, 35, 50],
    description: 'Crayons, shapes & stamps — getting creative!',
    bgGradient: 'from-orange-500/20 to-amber-500/10',
  },
  pp2: {
    label: 'PP2',
    ageRange: '5 years',
    icon: '✏️',
    emoji: '✏️',
    tools: ['finger', 'crayon', 'brush', 'eraser', 'fill'],
    colors: [
      '#EF4444','#F97316','#FBBF24','#84CC16','#10B981','#06B6D4',
      '#3B82F6','#8B5CF6','#EC4899','#FFFFFF','#6B7280','#1E293B'
    ],
    brushSizes: [10, 20, 35, 50],
    description: 'Paint, fill colours & draw scenes!',
    bgGradient: 'from-emerald-500/20 to-teal-500/10',
  },
  grade1: {
    label: 'Grade 1+',
    ageRange: '6–7 years',
    icon: '📝',
    emoji: '📝',
    tools: ['finger', 'crayon', 'brush', 'pencil', 'eraser', 'fill'],
    colors: [
      '#EF4444','#F97316','#FBBF24','#84CC16','#10B981','#06B6D4',
      '#3B82F6','#8B5CF6','#EC4899','#FFFFFF','#E2E8F0','#94A3B8',
      '#64748B','#334155','#1E293B','#000000','#7C3AED','#DB2777',
      '#EA580C','#CA8A04','#16A34A','#0891B2','#2563EB','#7C3AED'
    ],
    brushSizes: [4, 8, 14, 22, 35],
    description: 'Full artist toolkit — draw, paint & label!',
    bgGradient: 'from-indigo-500/20 to-purple-500/10',
  },
};

const PHONEME_PROMPTS: Record<AgeStage, PhonemePrompt[]> = {
  playgroup: [
    { phoneme: '/b/', instruction: 'Paint a big Ball!', emoji: '⚽', color: '#3B82F6' },
    { phoneme: '/m/', instruction: 'Paint Mama smiling!', emoji: '👩', color: '#EC4899' },
    { phoneme: '/ah/', instruction: 'Paint the bright Sun!', emoji: '☀️', color: '#FBBF24' },
  ],
  pp1: [
    { phoneme: '/b/', instruction: 'Draw a Bear!', emoji: '🐻', color: '#92400E' },
    { phoneme: '/f/', instruction: 'Draw a Fish!', emoji: '🐟', color: '#06B6D4' },
    { phoneme: '/s/', instruction: 'Draw the Sun!', emoji: '☀️', color: '#FBBF24' },
    { phoneme: '/m/', instruction: 'Draw the Moon!', emoji: '🌙', color: '#8B5CF6' },
  ],
  pp2: [
    { phoneme: '/t/', instruction: 'Draw a Tree with roots!', emoji: '🌳', color: '#16A34A' },
    { phoneme: '/l/', instruction: 'Draw a proud Lion!', emoji: '🦁', color: '#D97706' },
    { phoneme: '/s/', instruction: 'Draw a slithering Snake!', emoji: '🐍', color: '#15803D' },
    { phoneme: '/f/', instruction: 'Draw a flying Fish!', emoji: '🐟', color: '#0284C7' },
    { phoneme: '/ah/', instruction: 'Draw an Apple tree!', emoji: '🍎', color: '#DC2626' },
  ],
  grade1: [
    { phoneme: '/r/', instruction: 'Draw a beautiful Rainbow!', emoji: '🌈', color: '#7C3AED' },
    { phoneme: '/b/', instruction: 'Draw a Butterfly on a flower!', emoji: '🦋', color: '#DB2777' },
    { phoneme: '/l/', instruction: 'Draw a Leaf with details!', emoji: '🍃', color: '#16A34A' },
    { phoneme: '/t/', instruction: 'Draw a Tiger in the jungle!', emoji: '🐯', color: '#D97706' },
    { phoneme: '/oo/', instruction: 'Draw the Moon and stars!', emoji: '🌕', color: '#1E40AF' },
  ],
};

const SHAPE_TEMPLATES = [
  { id: 'triangle', name: 'Triangle', icon: '🔺', audioPrompt: 'Let\'s paint the Triangle! Pick your favourite paint color to fill inside!' },
  { id: 'circle', name: 'Circle', icon: '⚪', audioPrompt: 'Let\'s paint the Circle! Pick bright yellow or blue to paint your circle!' },
  { id: 'square', name: 'Square', icon: '🟦', audioPrompt: 'Square stencil drawn! Color inside the lines for your painting homework!' },
  { id: 'star', name: 'Star', icon: '⭐️', audioPrompt: 'A shiny Star is drawn! Color it with glowing yellow or gold!' },
  { id: 'house', name: 'House & Sun', icon: '🏠', audioPrompt: 'House and Sun drawn! Paint the roof red and the sun yellow!' },
  { id: 'flower', name: 'Flower', icon: '🌸', audioPrompt: 'Beautiful Flower stencil drawn! Paint the petals with your favorite colors!' },
  { id: 'fish', name: 'Fish', icon: '🐟', audioPrompt: 'Fish outline drawn! Color the fish and paint the ocean blue!' },
];

const WEEKLY_HOMEWORK_ASSIGNMENTS = [
  { id: 'hw_1', weekTitle: 'Week 1: Primary Shapes', shapeId: 'triangle', colorName: 'Red', instructions: 'Paint the Triangle stencil cleanly with your Red brush or bucket!', status: 'ASSIGNED' },
  { id: 'hw_2', weekTitle: 'Week 2: Bright Yellow Sun & House', shapeId: 'house', colorName: 'Yellow & Red', instructions: 'Paint the House roof Red and the Sun bright Yellow!', status: 'ASSIGNED' },
  { id: 'hw_3', weekTitle: 'Week 3: Blue Ocean Fish', shapeId: 'fish', colorName: 'Blue & Orange', instructions: 'Color the Fish and paint the ocean around it Blue!', status: 'ASSIGNED' },
  { id: 'hw_4', weekTitle: 'Week 4: Nature Garden Flower', shapeId: 'flower', colorName: 'Pink & Green', instructions: 'Paint the Flower petals Pink and the stem Green!', status: 'ASSIGNED' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpeechArtStudioProps {
  childName?: string;
  childPhoto?: string | null;
  onArtworkSaved?: (artwork: SavedArtwork) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SpeechArtStudio: React.FC<SpeechArtStudioProps> = ({
  childName = 'Little Artist',
  childPhoto,
  onArtworkSaved,
}) => {
  const [stage, setStage] = useState<AgeStage>('pp1');
  const [activeTool, setActiveTool] = useState<ToolType>('crayon');
  const [activeColor, setActiveColor] = useState<string>('#EF4444');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [gallery, setGallery] = useState<SavedArtwork[]>(() => {
    try { return JSON.parse(localStorage.getItem('speechbuddy_gallery') || '[]'); } catch { return []; }
  });
  const [activePrompt, setActivePrompt] = useState<PhonemePrompt>(PHONEME_PROMPTS.pp1[0]);
  const [showGallery, setShowGallery] = useState(false);
  const [stars, setStars] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [artTitle, setArtTitle] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  const stageConfig = STAGE_CONFIG[stage];

  // ── Auto-Draw Shape Stencil Helper ─────────────────────────────────────────

  const drawAutoShapeTemplate = (shapeId: string) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    // Save current canvas state to history
    saveHistory();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    if (shapeId === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 120);
      ctx.lineTo(cx + 140, cy + 100);
      ctx.lineTo(cx - 140, cy + 100);
      ctx.closePath();
      ctx.stroke();
    } else if (shapeId === 'circle') {
      ctx.beginPath();
      ctx.arc(cx, cy, 130, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shapeId === 'square') {
      ctx.beginPath();
      ctx.rect(cx - 120, cy - 120, 240, 240);
      ctx.stroke();
    } else if (shapeId === 'star') {
      ctx.beginPath();
      const rOuter = 130;
      const rInner = 55;
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? rOuter : rInner;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (shapeId === 'house') {
      // Roof
      ctx.beginPath();
      ctx.moveTo(cx, cy - 140);
      ctx.lineTo(cx + 150, cy - 20);
      ctx.lineTo(cx - 150, cy - 20);
      ctx.closePath();
      ctx.stroke();
      // Body
      ctx.beginPath();
      ctx.rect(cx - 130, cy - 20, 260, 150);
      ctx.stroke();
      // Door
      ctx.beginPath();
      ctx.rect(cx - 30, cy + 50, 60, 80);
      ctx.stroke();
      // Sun
      ctx.beginPath();
      ctx.arc(cx + 170, cy - 130, 30, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shapeId === 'flower') {
      // Center
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 40, 0, Math.PI * 2);
      ctx.stroke();
      // Petals
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = cx + 75 * Math.cos(angle);
        const py = (cy - 20) + 75 * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(px, py, 35, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Stem
      ctx.beginPath();
      ctx.moveTo(cx, cy + 20);
      ctx.lineTo(cx, cy + 150);
      ctx.stroke();
    } else if (shapeId === 'fish') {
      // Body
      ctx.beginPath();
      ctx.ellipse(cx - 20, cy, 120, 75, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Tail
      ctx.beginPath();
      ctx.moveTo(cx + 90, cy);
      ctx.lineTo(cx + 160, cy - 60);
      ctx.lineTo(cx + 160, cy + 60);
      ctx.closePath();
      ctx.stroke();
      // Eye
      ctx.beginPath();
      ctx.arc(cx - 85, cy - 20, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const selectShapeTemplate = (shape: { id: string; name: string; audioPrompt: string }) => {
    setSelectedShapeId(shape.id);
    drawAutoShapeTemplate(shape.id);
    setToast(`✨ Auto-drew ${shape.name}! Grab your paint colors!`);
    unlockAndroidAudio();
    speakSpeechBuddyText(shape.audioPrompt, { rate: 0.85, pitch: 1.3 });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Canvas helpers ──────────────────────────────────────────────────────────

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    setHistory(prev => [...prev.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const fillCanvas = useCallback((x: number, y: number, fillColor: string) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    saveHistory();

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const idx = (Math.round(y) * canvas.width + Math.round(x)) * 4;
    const targetR = data[idx], targetG = data[idx + 1], targetB = data[idx + 2];

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const { r: fillR, g: fillG, b: fillB } = hexToRgb(fillColor);
    if (targetR === fillR && targetG === fillG && targetB === fillB) return;

    const matchTarget = (i: number) =>
      Math.abs(data[i] - targetR) < 30 &&
      Math.abs(data[i + 1] - targetG) < 30 &&
      Math.abs(data[i + 2] - targetB) < 30;

    const stack = [Math.round(x), Math.round(y)];
    while (stack.length) {
      const cy = stack.pop()!;
      const cx = stack.pop()!;
      if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue;
      const i = (cy * canvas.width + cx) * 4;
      if (!matchTarget(i)) continue;
      data[i] = fillR; data[i + 1] = fillG; data[i + 2] = fillB; data[i + 3] = 255;
      stack.push(cx - 1, cy, cx + 1, cy, cx, cy - 1, cx, cy + 1);
    }

    ctx.putImageData(imgData, 0, 0);
  }, [saveHistory]);

  // ── Drawing ─────────────────────────────────────────────────────────────────

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (activeTool === 'fill') { fillCanvas(pos.x, pos.y, activeColor); return; }
    saveHistory();
    setIsDrawing(true);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || activeTool === 'fill') return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getCanvasPos(e);
    const last = lastPos.current ?? pos;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = activeTool === 'eraser' ? brushSize * 2 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (activeTool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = activeColor;
    } else if (activeTool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = activeColor;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = activeColor;
    }

    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    lastPos.current = pos;
  };

  const endDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
    const ctx = getCtx();
    if (ctx) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  };

  // ── Canvas setup ─────────────────────────────────────────────────────────────

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  }, []);

  useEffect(() => { initCanvas(); }, [stage, initCanvas]);

  // Sync brush size when stage changes
  useEffect(() => {
    const sizes = stageConfig.brushSizes;
    setBrushSize(sizes[Math.floor(sizes.length / 2)]);
    setActiveTool(stageConfig.tools[0]);
    setActiveColor(stageConfig.colors[0]);
    setActivePrompt(PHONEME_PROMPTS[stage][0]);
  }, [stage]);

  // ── Undo ──────────────────────────────────────────────────────────────────────

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx || history.length === 0) return;
    const prev = history[history.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistory(h => h.slice(0, -1));
  };

  // ── Phoneme TTS Prompt ────────────────────────────────────────────────────────

  const readPromptAloud = (prompt: PhonemePrompt) => {
    unlockAndroidAudio();
    speakSpeechBuddyText(`Today we paint the ${prompt.phoneme} sound! ${prompt.instruction} Ready? Go!`, {
      rate: 0.85,
      pitch: 1.3,
    });
  };

  const pickNewPrompt = () => {
    const prompts = PHONEME_PROMPTS[stage];
    const next = prompts[Math.floor(Math.random() * prompts.length)];
    setActivePrompt(next);
    readPromptAloud(next);
    initCanvas();
  };

  // ── Mic (celebrate completion) ────────────────────────────────────────────────

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
          setMicVolume(Math.min(100, Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 2)));
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
            const text = ev.results[ev.results.length - 1][0].transcript.toLowerCase();
            if (text.length > 2) {
              setStars(s => s + 2);
              setCelebrationActive(true);
              setToast(`🌟 "${text}" — Amazing storytelling, ${childName}!`);
              setTimeout(() => { setCelebrationActive(false); setToast(null); }, 3500);
            }
          };
          rec.start();
          recognitionRef.current = rec;
        }
        setIsListening(true);
      } catch {
        setToast('⚠️ Microphone not available — visual mode active!');
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

  // ── Save to Gallery ───────────────────────────────────────────────────────────

  const saveToGallery = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const artwork: SavedArtwork = {
      id: `art-${Date.now()}`,
      title: artTitle || `${childName}'s ${activePrompt.emoji} Art`,
      dataUrl,
      stage,
      phonemePrompt: activePrompt.phoneme,
      createdAt: new Date().toLocaleDateString(),
    };
    const next = [...gallery, artwork];
    setGallery(next);
    try { localStorage.setItem('speechbuddy_gallery', JSON.stringify(next)); } catch {}
    onArtworkSaved?.(artwork);
    setStars(s => s + 5);
    setShowSaveModal(false);
    setArtTitle('');
    setCelebrationActive(true);
    setToast(`🖼️ Saved "${artwork.title}" to your gallery! +5 Stars`);
    setTimeout(() => { setCelebrationActive(false); setToast(null); }, 3500);
  };

  const downloadArtwork = (dataUrl: string, title: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  // ── Print Homework Sheet PDF Generator ─────────────────────────────────────

  const printHomeworkSheet = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const shapeObj = SHAPE_TEMPLATES.find(s => s.id === selectedShapeId) || SHAPE_TEMPLATES[0];

    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Speech Buddy Painting Homework — ${childName}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #fff; margin: 0; padding: 40px; text-align: center; color: #1e293b; }
          .sheet { border: 4px dashed #6366f1; border-radius: 24px; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #6366f1; text-transform: uppercase; }
          .title { font-size: 28px; font-weight: 900; margin: 10px 0; }
          .student-info { font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 20px; }
          .canvas-img { border: 2px solid #cbd5e1; border-radius: 16px; max-width: 100%; height: auto; margin: 20px 0; }
          .instruction { font-size: 16px; font-weight: 800; color: #0f172a; margin: 15px 0; background: #f1f5f9; padding: 15px; border-radius: 12px; }
          .footer { display: flex; justify-content: space-between; margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; font-size: 12px; font-weight: 700; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">SPEECH BUDDY AI • ART & SPEECH THERAPY HOMEWORK</div>
          <div class="title">Coloring & Painting Homework Sheet</div>
          <div class="student-info">Student: <b>${childName}</b> • Level: <b>${stageConfig.label}</b> • Date: <b>${new Date().toLocaleDateString()}</b></div>
          <div class="instruction">🎨 Homework Task: ${shapeObj.audioPrompt}</div>
          <img src="${dataUrl}" class="canvas-img" />
          <div class="footer">
            <div>Parent Signature: _______________________</div>
            <div>Teacher Evaluation: ⭐⭐⭐⭐⭐</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // ── AI Painting Accuracy Inspector ──────────────────────────────────────────

  const inspectPaintingAccuracy = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let coloredPixels = 0;
    let totalNonWhitePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r < 240 || g < 240 || b < 240) {
        totalNonWhitePixels++;
        if ((r > 50 || g > 50 || b > 50) && (r < 235 || g < 235 || b < 235)) {
          coloredPixels++;
        }
      }
    }

    const accuracyPct = Math.min(100, Math.max(50, Math.round((coloredPixels / (totalNonWhitePixels || 1)) * 100) + 20));

    setStars(s => s + 10);
    setCelebrationActive(true);

    const feedback = `🌟 Outstanding Painting! Accuracy Score: ${accuracyPct}%! +10 Stars`;
    setToast(feedback);

    unlockAndroidAudio();
    speakSpeechBuddyText(`Hooray ${childName}! Outstanding painting! Your painting accuracy score is ${accuracyPct} percent! Great job!`, {
      rate: 0.85,
      pitch: 1.3
    });

    setTimeout(() => {
      setCelebrationActive(false);
      setToast(null);
    }, 4000);
  };

  // ── Tool icons ────────────────────────────────────────────────────────────────

  const toolIcon = (t: ToolType) => {
    switch (t) {
      case 'finger': return '☝️';
      case 'crayon': return '🖍️';
      case 'brush': return '🖌️';
      case 'pencil': return '✏️';
      case 'eraser': return '🧹';
      case 'fill': return '🪣';
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-white font-sans relative overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce border border-emerald-300">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      {/* Celebration confetti overlay */}
      {celebrationActive && (
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#F59E0B','#EC4899','#10B981','#3B82F6','#8B5CF6'][i % 5],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.6 + Math.random() * 0.4}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-2xl text-2xl shadow-lg shadow-pink-500/20">
            🎨
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300">
              Art Studio
            </h1>
            <p className="text-xs text-slate-400">
              {childName}'s Creative Space • {stageConfig.ageRange}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stars */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-amber-500/30 rounded-2xl text-amber-300 font-bold text-sm">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{stars} Stars</span>
          </div>

          {/* Homework Assignments Modal Toggle */}
          <button
            onClick={() => setShowHomeworkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-indigo-500/40 text-indigo-300 hover:text-white hover:bg-indigo-600 rounded-2xl text-xs font-extrabold transition-all shadow cursor-pointer"
          >
            <span>📋 Homework Tasks</span>
          </button>

          {/* Print Homework PDF */}
          <button
            onClick={printHomeworkSheet}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-600 rounded-2xl text-xs font-extrabold transition-all shadow cursor-pointer"
          >
            <span>🖨️ Print Homework</span>
          </button>

          {/* AI Accuracy Check */}
          <button
            onClick={inspectPaintingAccuracy}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg hover:scale-105 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>✨ Check Accuracy</span>
          </button>

          {/* Gallery Toggle */}
          <button
            onClick={() => setShowGallery(!showGallery)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
              showGallery ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Gallery ({gallery.length})</span>
          </button>
        </div>
      </div>

      {/* ── Stage Selector ── */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(STAGE_CONFIG) as AgeStage[]).map(s => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold border transition-all ${
              stage === s
                ? `bg-gradient-to-r ${STAGE_CONFIG[s].bgGradient} border-white/20 text-white shadow-lg scale-105`
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>{STAGE_CONFIG[s].icon}</span>
            <span>{STAGE_CONFIG[s].label}</span>
            <span className="opacity-60 font-normal">({STAGE_CONFIG[s].ageRange})</span>
          </button>
        ))}
      </div>

      {/* ── Gallery View ── */}
      {showGallery && (
        <div className="mt-5 p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">🖼️ {childName}'s Art Gallery</h3>
          {gallery.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No artworks yet — start painting and save your masterpiece!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
              {gallery.map(art => (
                <div key={art.id} className="relative rounded-xl overflow-hidden border border-slate-700 group">
                  <img src={art.dataUrl} alt={art.title} className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 p-2">
                    <p className="text-xs font-bold text-white text-center truncate w-full">{art.title}</p>
                    <button
                      onClick={() => downloadArtwork(art.dataUrl, art.title)}
                      className="px-3 py-1 bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main Layout: Phoneme Prompt + Canvas + Toolbar ── */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Phoneme Prompt Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Current Prompt Card */}
          <div
            className="p-5 rounded-2xl border text-center space-y-3 shadow-lg"
            style={{ borderColor: activePrompt.color + '55', background: activePrompt.color + '15' }}
          >
            <div className="text-5xl animate-bounce">{activePrompt.emoji}</div>
            <div
              className="text-2xl font-black"
              style={{ color: activePrompt.color }}
            >
              {activePrompt.phoneme}
            </div>
            <p className="text-sm font-bold text-white leading-snug">{activePrompt.instruction}</p>

            <button
              onClick={() => readPromptAloud(activePrompt)}
              className="w-full py-2 bg-amber-400 text-slate-950 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-amber-300 transition-all"
            >
              <Volume2 className="w-4 h-4" />
              <span>Read to Me!</span>
            </button>

            <button
              onClick={pickNewPrompt}
              className="w-full py-2 bg-slate-800 border border-slate-700 rounded-xl font-bold text-xs text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Drawing Prompt</span>
            </button>
          </div>

          {/* Brush Size */}
          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Brush Size</p>
            <div className="flex flex-wrap gap-2">
              {stageConfig.brushSizes.map(sz => (
                <button
                  key={sz}
                  onClick={() => setBrushSize(sz)}
                  className={`rounded-full border-2 flex items-center justify-center transition-all ${
                    brushSize === sz ? 'border-amber-400 bg-amber-400/20' : 'border-slate-700 bg-slate-900'
                  }`}
                  style={{ width: Math.max(28, sz + 8), height: Math.max(28, sz + 8) }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: Math.max(6, sz * 0.7),
                      height: Math.max(6, sz * 0.7),
                      backgroundColor: brushSize === sz ? '#FBBF24' : '#64748B',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Speak About Drawing Mic */}
          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tell Us About Your Drawing!</p>
            <button
              onClick={toggleListening}
              className={`w-full py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all ${
                isListening
                  ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                  : 'bg-emerald-500 border-emerald-300 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Listening...' : 'Speak About It!'}</span>
            </button>
            {isListening && (
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Voice</span>
                <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="lg:col-span-6 flex flex-col gap-3">

          {/* 🎨 Auto-Draw Homework Shape Templates Bar */}
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-indigo-500/30 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Draw Shape Stencils & Painting Homework</span>
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Tap to draw & paint</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SHAPE_TEMPLATES.map(shape => (
                <button
                  key={shape.id}
                  onClick={() => selectShapeTemplate(shape)}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all border shadow cursor-pointer ${
                    selectedShapeId === shape.id
                      ? 'bg-indigo-600 border-indigo-400 text-white scale-105 shadow-indigo-500/30'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{shape.icon}</span>
                  <span>{shape.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tool Palette */}
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-800/60 rounded-2xl border border-slate-800 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {stageConfig.tools.map(tool => (
                <button
                  key={tool}
                  onClick={() => setActiveTool(tool)}
                  title={tool}
                  className={`px-3 py-2 rounded-xl text-lg transition-all border ${
                    activeTool === tool
                      ? 'bg-amber-400/20 border-amber-400 scale-110 shadow'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {toolIcon(tool)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { saveHistory(); initCanvas(); }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-all"
                title="Clear canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 hover:bg-emerald-400 transition-all shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (canvas) downloadArtwork(canvas.toDataURL('image/png'), `${childName}_artwork`);
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawing Canvas */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-slate-700 shadow-inner bg-white"
            style={{ cursor: activeTool === 'eraser' ? 'cell' : activeTool === 'fill' ? 'crosshair' : 'crosshair' }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={520}
              className="w-full h-[340px] md:h-[420px] block touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />

            {/* Stage badge overlay */}
            <div className="absolute top-3 right-3 px-3 py-1 bg-slate-900/80 backdrop-blur rounded-full text-xs font-bold text-slate-300 border border-slate-700">
              {stageConfig.icon} {stageConfig.label} Mode
            </div>
          </div>
        </div>

        {/* Right: Color Palette */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-400" />
              <span>Colours</span>
            </p>

            <div className="grid grid-cols-3 gap-2">
              {stageConfig.colors.map(c => (
                <button
                  key={c}
                  onClick={() => { setActiveColor(c); setActiveTool(prev => prev === 'eraser' ? 'crayon' : prev); }}
                  className={`rounded-xl transition-all ${
                    activeColor === c && activeTool !== 'eraser'
                      ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-800 scale-110 shadow-lg'
                      : 'hover:scale-105 ring-1 ring-slate-600'
                  }`}
                  style={{ backgroundColor: c, aspectRatio: '1', minHeight: '40px' }}
                  title={c}
                />
              ))}
            </div>

            {/* Active color preview */}
            <div className="mt-4 p-3 rounded-xl border border-slate-700 bg-slate-950 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg border-2 border-slate-600 shadow-inner flex-shrink-0"
                style={{ backgroundColor: activeTool === 'eraser' ? '#FFFFFF' : activeColor }}
              />
              <div>
                <p className="text-xs font-bold text-white">
                  {activeTool === 'eraser' ? 'Erasing' : 'Painting'}
                </p>
                <p className="text-[10px] font-mono text-slate-400">
                  {activeTool === 'eraser' ? 'Eraser active' : activeColor}
                </p>
              </div>
            </div>
          </div>

          {/* Stage description */}
          <div className={`p-4 rounded-2xl border bg-gradient-to-br ${stageConfig.bgGradient} border-white/10`}>
            <p className="text-xs font-bold text-white mb-1">{stageConfig.icon} {stageConfig.label} Mode</p>
            <p className="text-xs text-slate-300 leading-relaxed">{stageConfig.description}</p>
          </div>
        </div>
      </div>

      {/* ── Save Modal ── */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-black text-white text-center">Save Your Masterpiece! 🖼️</h3>
            <input
              type="text"
              placeholder={`${childName}'s ${activePrompt.emoji} Artwork`}
              value={artTitle}
              onChange={e => setArtTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveToGallery}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm font-extrabold shadow hover:scale-105 transition-all"
              >
                Save & Earn Stars!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Homework Assignments Modal ── */}
      {showHomeworkModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="text-lg font-black text-white italic">Painting Homework Assignments</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{childName}'s Weekly Curriculum Tasks</p>
                </div>
              </div>
              <button
                onClick={() => setShowHomeworkModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {WEEKLY_HOMEWORK_ASSIGNMENTS.map(hw => {
                const shapeObj = SHAPE_TEMPLATES.find(s => s.id === hw.shapeId);

                return (
                  <div key={hw.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-indigo-400">{hw.weekTitle}</span>
                      <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 text-[9px] font-black uppercase">
                        {hw.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-200">{hw.instructions}</p>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-amber-400 font-black uppercase">Target Color: {hw.colorName}</span>
                      <button
                        onClick={() => {
                          if (shapeObj) selectShapeTemplate(shapeObj);
                          setShowHomeworkModal(false);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow"
                      >
                        ▶ Start Painting Task
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechArtStudio;
