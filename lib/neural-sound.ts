"use client";

let audioContext: AudioContext | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;

  const browserWindow = window as AudioWindow;
  const AudioContextCtor = window.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;

  audioContext = new AudioContextCtor();
  return audioContext;
}

export async function playAlienCue(kind: "activate" | "select" | "success" = "select") {
  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state === "suspended") await context.resume();
  } catch {
    return;
  }

  const now = context.currentTime;
  const duration = kind === "success" ? 0.5 : kind === "activate" ? 0.58 : 0.34;
  const peak = kind === "success" ? 0.055 : 0.04;

  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(peak, now + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2600, now);
  filter.frequency.exponentialRampToValueAtTime(1300, now + duration);
  filter.connect(master);

  const lead = context.createOscillator();
  lead.type = "sine";
  lead.frequency.setValueAtTime(kind === "activate" ? 190 : 240, now);
  lead.frequency.exponentialRampToValueAtTime(kind === "success" ? 780 : 620, now + duration * 0.62);
  lead.frequency.exponentialRampToValueAtTime(kind === "success" ? 540 : 410, now + duration);
  lead.connect(filter);

  const shimmer = context.createOscillator();
  shimmer.type = "triangle";
  shimmer.detune.setValueAtTime(-18, now);
  shimmer.frequency.setValueAtTime(kind === "activate" ? 380 : 470, now);
  shimmer.frequency.exponentialRampToValueAtTime(kind === "success" ? 1180 : 920, now + duration * 0.72);
  shimmer.frequency.exponentialRampToValueAtTime(kind === "success" ? 820 : 680, now + duration);
  shimmer.connect(filter);

  lead.start(now);
  shimmer.start(now);
  lead.stop(now + duration + 0.02);
  shimmer.stop(now + duration + 0.02);
}

export function hasNeuralAudioSupport() {
  if (typeof window === "undefined") return false;
  const browserWindow = window as AudioWindow;
  return Boolean(window.AudioContext ?? browserWindow.webkitAudioContext);
}
