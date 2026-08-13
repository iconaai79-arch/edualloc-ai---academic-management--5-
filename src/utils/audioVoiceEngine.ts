/**
 * AudioVoiceEngine.ts
 * Provides Web Speech API Text-to-Speech (TTS) voice narration for young learners
 * and Web Audio API synthesized sound effects (Block Snap, Motor Hum, Sonar Beep, Victory Fanfare, Collision Bump).
 */

class AudioVoiceEngine {
    private synth: SpeechSynthesis | null = null;
    private audioCtx: AudioContext | null = null;
    private isMuted: boolean = false;

    constructor() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
        }
    }

    private getAudioContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.audioCtx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.audioCtx = new AudioCtx();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.synth) {
            this.synth.cancel();
        }
        return this.isMuted;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    // ── Text-to-Speech Narration ───────────────────────────────────────────

    public speak(text: string, onEnd?: () => void) {
        if (this.isMuted || !this.synth) {
            if (onEnd) onEnd();
            return;
        }

        // Cancel previous speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // Slightly slower for kids clarity
        utterance.pitch = 1.1; // Friendly tone

        const voices = this.synth.getVoices();
        // Prefer English kid-friendly/female voice if available
        const preferredVoice = voices.find(v => 
            v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Zira'))
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        if (onEnd) {
            utterance.onend = onEnd;
            utterance.onerror = onEnd;
        }

        this.synth.speak(utterance);
    }

    public stopSpeech() {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    // ── Web Audio API Synthesized Sound Effects ─────────────────────────────

    /**
     * Plays a crisp block snap click sound
     */
    public playSnapSound() {
        if (this.isMuted) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {
            console.error('Audio play error:', e);
        }
    }

    /**
     * Plays a short motor hum sound for robot movement
     */
    public playMotorSound(durationMs: number = 400) {
        if (this.isMuted) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + durationMs / 1000);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + durationMs / 1000);
        } catch (e) {
            console.error('Audio play error:', e);
        }
    }

    /**
     * Plays a sonar ping sound for ultrasonic distance sensors
     */
    public playSonarPing() {
        if (this.isMuted) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.error('Audio play error:', e);
        }
    }

    /**
     * Plays a victory fanfare tune on completing a mission
     */
    public playVictoryFanfare() {
        if (this.isMuted) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        try {
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            const times = [0, 0.12, 0.24, 0.4];

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + times[idx]);

                gain.gain.setValueAtTime(0.25, ctx.currentTime + times[idx]);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + times[idx] + 0.3);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + times[idx]);
                osc.stop(ctx.currentTime + times[idx] + 0.3);
            });
        } catch (e) {
            console.error('Audio play error:', e);
        }
    }

    /**
     * Plays a soft bump collision sound if robot hits a wall
     */
    public playBumpSound() {
        if (this.isMuted) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(90, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.error('Audio play error:', e);
        }
    }
}

export const audioVoiceEngine = new AudioVoiceEngine();
