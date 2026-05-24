import { useRef, useCallback, useState } from "react";

export function useSound() {
  const [muted, setMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    // Resume context if suspended (browser security policy)
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playSound = useCallback((type: "connect" | "disconnect" | "message" | "click") => {
    if (muted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const primaryGain = ctx.createGain();
      primaryGain.connect(ctx.destination);

      if (type === "connect") {
        // High-low-high ascending upbeat synth chime
        primaryGain.gain.setValueAtTime(0, now);
        primaryGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        primaryGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(261.63, now); // C4
        osc2.frequency.setValueAtTime(329.63, now + 0.08); // E4
        osc2.frequency.setValueAtTime(392.00, now + 0.16); // G4

        osc1.connect(primaryGain);
        osc2.connect(primaryGain);

        osc1.start(now);
        osc1.stop(now + 0.45);
        osc2.start(now);
        osc2.stop(now + 0.45);

      } else if (type === "disconnect") {
        // Soft descending dual chime
        primaryGain.gain.setValueAtTime(0, now);
        primaryGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        primaryGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440.00, now); // A4
        osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.3); // A3

        osc.connect(primaryGain);
        osc.start(now);
        osc.stop(now + 0.35);

      } else if (type === "message") {
        // Upbeat high sweet ping
        primaryGain.gain.setValueAtTime(0, now);
        primaryGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        primaryGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880.00, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.08); // C6

        osc.connect(primaryGain);
        osc.start(now);
        osc.stop(now + 0.22);

      } else if (type === "click") {
        // Tiny structural button tap
        primaryGain.gain.setValueAtTime(0, now);
        primaryGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
        primaryGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);

        osc.connect(primaryGain);
        osc.start(now);
        osc.stop(now + 0.07);
      }
    } catch (e) {
      console.warn("Audio Context sound failed to play", e);
    }
  }, [muted]);

  return { muted, setMuted, playSound };
}
